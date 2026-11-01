import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError, createApiClient } from '@playora/api-client';
import { campaignsApi, counterDevicesApi, ErrorCode, meApi, vouchersApi } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, eq } from 'drizzle-orm';
import { DB } from '../src/infra/tokens';
import { campaignBody, issueVoucher, setPlan } from './campaign-fixtures';
import { createOrg, createTestApp, signUp, type TestApp } from './create-test-app';

let t: TestApp;
let db: Database;
let owner: string;
let otherOwner: string;
let orgId: string;
let otherOrgId: string;
let campaignId: string;

beforeAll(async () => {
  t = await createTestApp();
  db = t.app.get<Database>(DB);
  owner = await signUp(t.baseUrl, 'Chủ quán');
  otherOwner = await signUp(t.baseUrl, 'Chủ quán khác');
  orgId = await createOrg(t.baseUrl, owner);
  otherOrgId = await createOrg(t.baseUrl, otherOwner);

  const api = t.client(owner);
  const created = await api.call(campaignsApi.create, {
    params: { orgId },
    body: campaignBody({ name: 'Chiến dịch Quầy' }),
  });
  campaignId = created.id;
  await api.call(campaignsApi.publish, { params: { orgId, campaignId } });
});

afterAll(() => t?.close());

async function expectApiError(promise: Promise<unknown>, status: number, code: ErrorCode) {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status, code });
}

describe('counterDevices API (ADR-017, ORG-10, PRZ-17)', () => {
  test('enforces plan device limits (Free: 1, Shop: 3) and allows creating after revoking', async () => {
    await setPlan(db, orgId, 'free');
    const asOwner = t.client(owner);

    const created1 = await asOwner.call(counterDevicesApi.create, {
      params: { orgId },
      body: { label: 'Máy thu ngân 1', storeLabel: 'CN Quận 1' },
    });
    expect(created1).toMatchObject({
      organizationId: orgId,
      label: 'Máy thu ngân 1',
      storeLabel: 'CN Quận 1',
      paired: false,
      revokedAt: null,
    });
    expect(created1.pairingCode).toHaveLength(32);

    // 2nd active device on Free plan is rejected with 409 CONFLICT
    await expectApiError(
      asOwner.call(counterDevicesApi.create, {
        params: { orgId },
        body: { label: 'Máy thu ngân 2' },
      }),
      409,
      ErrorCode.CONFLICT,
    );

    // Revoking the 1st device frees up the slot on Free plan
    await asOwner.call(counterDevicesApi.revoke, {
      params: { orgId, deviceId: created1.id },
    });

    const createdAfterRevoke = await asOwner.call(counterDevicesApi.create, {
      params: { orgId },
      body: { label: 'Máy thu ngân mới', storeLabel: 'CN Quận 1' },
    });
    expect(createdAfterRevoke.label).toBe('Máy thu ngân mới');

    // Upgrading to Shop allows up to 3 active devices
    await setPlan(db, orgId, 'shop');
    const listBefore = await asOwner.call(counterDevicesApi.list, { params: { orgId } });
    expect(listBefore.maxDevices).toBe(3);

    await asOwner.call(counterDevicesApi.revoke, {
      params: { orgId, deviceId: createdAfterRevoke.id },
    });
  });

  test('pairs a counter device once, scopes token strictly to voucher read/redeem, and revokes immediately', async () => {
    await setPlan(db, orgId, 'shop');
    const asOwner = t.client(owner);

    const created = await asOwner.call(counterDevicesApi.create, {
      params: { orgId },
      body: { label: 'Quầy Thu Ngân Ca Sáng', storeLabel: 'CN Nguyễn Huệ' },
    });

    // Public client exchanges pairingCode for persistent deviceToken
    const publicClient = t.client();
    const paired = await publicClient.call(counterDevicesApi.pair, {
      body: { pairingCode: created.pairingCode },
    });
    expect(paired.deviceToken).toHaveLength(64);
    expect(paired.device).toMatchObject({
      id: created.id,
      organizationId: orgId,
      label: 'Quầy Thu Ngân Ca Sáng',
      storeLabel: 'CN Nguyễn Huệ',
    });

    // Re-using the one-time pairingCode fails with 400 VALIDATION_FAILED
    await expectApiError(
      publicClient.call(counterDevicesApi.pair, {
        body: { pairingCode: created.pairingCode },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    // Client authenticated with x-counter-device-token
    const asDevice = createApiClient({
      baseUrl: t.baseUrl,
      headers: { 'x-counter-device-token': paired.deviceToken },
    });

    const meRes = await asDevice.call(counterDevicesApi.me, { params: { orgId } });
    expect(meRes.device).toEqual({
      id: created.id,
      organizationId: orgId,
      label: 'Quầy Thu Ngân Ca Sáng',
      storeLabel: 'CN Nguyễn Huệ',
    });

    // Lookup and redeem a voucher using the counter device token
    const { code } = await issueVoucher(db, {
      orgId,
      campaignId,
      prizeKey: 'p1',
      playerName: 'Lan',
    });

    const lookedUp = await asDevice.call(vouchersApi.lookup, { params: { orgId, code } });
    expect(lookedUp.status).toBe('issued');

    const redeemed = await asDevice.call(vouchersApi.redeem, {
      params: { orgId, code },
      body: { via: 'qr' },
    });
    expect(redeemed).toMatchObject({
      code,
      status: 'redeemed',
      redeemedByName: 'Quầy Thu Ngân Ca Sáng',
      storeLabel: 'CN Nguyễn Huệ',
    });

    // Audit log records counter_device actor, deviceId, and storeLabel
    const [auditRow] = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.organizationId, orgId),
          eq(schema.auditLogs.action, 'voucher.redeem'),
          eq(schema.auditLogs.actorId, created.id),
        ),
      );
    expect(auditRow).toBeDefined();
    expect(auditRow?.actorType).toBe('counter_device');
    expect(auditRow?.actorId).toBe(created.id);
    expect(auditRow?.diff).toMatchObject({
      code,
      via: 'qr',
      deviceId: created.id,
      deviceLabel: 'Quầy Thu Ngân Ca Sáng',
      storeLabel: 'CN Nguyễn Huệ',
    });

    // Counter device CANNOT reopen a voucher (403 FORBIDDEN)
    await expectApiError(
      asDevice.call(vouchersApi.reopen, {
        params: { orgId, code },
        body: { reason: 'Thử mở lại từ máy quầy' },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );

    // Counter device CANNOT list campaigns, list counter devices, or read /me (403 FORBIDDEN)
    await expectApiError(
      asDevice.call(campaignsApi.list, { params: { orgId }, query: {} }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asDevice.call(counterDevicesApi.list, { params: { orgId } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(asDevice.call(meApi.orgs), 403, ErrorCode.FORBIDDEN);

    // Cross-tenant isolation: counter device from orgId cannot access otherOrgId
    await expectApiError(
      asDevice.call(vouchersApi.lookup, { params: { orgId: otherOrgId, code } }),
      403,
      ErrorCode.FORBIDDEN,
    );

    // Owner revokes the counter device -> subsequent requests with token fail with 401 UNAUTHORIZED
    await asOwner.call(counterDevicesApi.revoke, {
      params: { orgId, deviceId: created.id },
    });

    await expectApiError(
      asDevice.call(vouchersApi.lookup, { params: { orgId, code } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
  });

  test('rejects expired pairing codes and cross-tenant device management', async () => {
    const asOwner = t.client(owner);
    const asOther = t.client(otherOwner);

    const created = await asOwner.call(counterDevicesApi.create, {
      params: { orgId },
      body: { label: 'Máy hết hạn ghép nối' },
    });

    // Expire the pairing code in DB
    await db
      .update(schema.counterDevices)
      .set({ pairingExpiresAt: new Date(Date.now() - 60_000) })
      .where(eq(schema.counterDevices.id, created.id));

    await expectApiError(
      t.client().call(counterDevicesApi.pair, { body: { pairingCode: created.pairingCode } }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    // Cross-tenant list/revoke returns 403 FORBIDDEN
    await expectApiError(
      asOther.call(counterDevicesApi.list, { params: { orgId } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asOther.call(counterDevicesApi.revoke, { params: { orgId, deviceId: created.id } }),
      403,
      ErrorCode.FORBIDDEN,
    );
  });
});
