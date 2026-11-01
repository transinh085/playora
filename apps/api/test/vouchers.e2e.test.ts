import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import { campaignsApi, ErrorCode, vouchersApi } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, eq } from 'drizzle-orm';
import { PiiService } from '../src/common/pii/pii.service';
import { DB } from '../src/infra/tokens';
import {
  addMember,
  campaignBody,
  insertAwards,
  issueVoucher,
  sessionUserId,
  setPlan,
} from './campaign-fixtures';
import { createOrg, createTestApp, signUp, type TestApp } from './create-test-app';

let t: TestApp;
let db: Database;
let owner: string;
let staff: string;
let stranger: string;
let orgId: string;
let otherOrg: string;
let campaignId: string;

beforeAll(async () => {
  t = await createTestApp();
  db = t.app.get<Database>(DB);
  owner = await signUp(t.baseUrl, 'Chủ quán');
  staff = await signUp(t.baseUrl, 'Thu ngân');
  stranger = await signUp(t.baseUrl, 'Stranger');
  orgId = await createOrg(t.baseUrl, owner);
  await setPlan(db, orgId, 'chain');
  otherOrg = await createOrg(t.baseUrl, stranger);
  await setPlan(db, otherOrg, 'chain');
  await addMember(db, orgId, await sessionUserId(t.baseUrl, staff), 'redeemer');

  const api = t.client(owner);
  const created = await api.call(campaignsApi.create, {
    params: { orgId },
    body: campaignBody({ name: 'Quầy đổi quà' }),
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

const issue = (opts: { expiresAt?: Date | null; playerName?: string } = {}) =>
  issueVoucher(db, { orgId, campaignId, prizeKey: 'p1', ...opts });

describe('vouchers API', () => {
  test('a redeemer looks up and redeems a code once', async () => {
    const { code } = await issue({ playerName: 'Minh' });
    const asStaff = t.client(staff);

    // Codes are normalised: lower case, spaces and dashes are accepted.
    const typed = `${code.slice(0, 4).toLowerCase()}-${code.slice(4)}`;
    const found = await asStaff.call(vouchersApi.lookup, { params: { orgId, code: typed } });
    expect(found).toMatchObject({
      code,
      status: 'issued',
      rehearsal: false,
      campaign: { id: campaignId, name: 'Quầy đổi quà' },
      prize: { id: 'p1', name: 'Ly trà sữa' },
      playerName: 'Minh',
      redeemedAt: null,
      redeemedByName: null,
    });

    const redeemed = await asStaff.call(vouchersApi.redeem, { params: { orgId, code } });
    expect(redeemed).toMatchObject({ status: 'redeemed', redeemedByName: 'Thu ngân' });
    expect(redeemed.redeemedAt).not.toBeNull();

    const [auditEntry] = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.organizationId, orgId),
          eq(schema.auditLogs.action, 'voucher.redeem'),
        ),
      );
    expect(auditEntry?.diff).toMatchObject({ code, campaignId, via: 'code' });

    await expectApiError(
      asStaff.call(vouchersApi.redeem, { params: { orgId, code } }),
      409,
      ErrorCode.VOUCHER_ALREADY_REDEEMED,
    );
  });

  test('rehearsal vouchers run in repeatable training mode without locking in DB (PRZ-19)', async () => {
    const [rehearsalCode] = (await insertAwards(db, {
      orgId,
      campaignId,
      count: 1,
      redeemedAt: null,
      env: 'rehearsal',
    })) as [string];
    const asStaff = t.client(staff);

    // First training redeem returns simulated redeemed status.
    const first = await asStaff.call(vouchersApi.redeem, {
      params: { orgId, code: rehearsalCode },
    });
    expect(first).toMatchObject({
      code: rehearsalCode,
      status: 'redeemed',
      rehearsal: true,
    });
    expect(first.redeemedAt).not.toBeNull();

    // Lookup shows the rehearsal code is still issued in DB so other staff can practice.
    const lookedUp = await asStaff.call(vouchersApi.lookup, {
      params: { orgId, code: rehearsalCode },
    });
    expect(lookedUp).toMatchObject({
      code: rehearsalCode,
      status: 'issued',
      rehearsal: true,
      redeemedAt: null,
    });

    // Second training redeem also succeeds.
    const second = await asStaff.call(vouchersApi.redeem, {
      params: { orgId, code: rehearsalCode },
    });
    expect(second).toMatchObject({
      code: rehearsalCode,
      status: 'redeemed',
      rehearsal: true,
    });

    const trainingAudits = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.organizationId, orgId),
          eq(schema.auditLogs.action, 'voucher.training_redeem'),
        ),
      );
    expect(trainingAudits.length).toBeGreaterThanOrEqual(2);
    expect(trainingAudits[0]?.diff).toMatchObject({ code: rehearsalCode, campaignId });
  });

  test('20 concurrent redeems of one code: exactly one succeeds', async () => {
    const { code } = await issue();
    const asStaff = t.client(staff);
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        asStaff.call(vouchersApi.redeem, { params: { orgId, code } }),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(19);
    for (const f of failed) {
      expect(f.reason).toMatchObject({ status: 409, code: ErrorCode.VOUCHER_ALREADY_REDEEMED });
    }
  });

  test('expired, void and unknown codes are rejected clearly', async () => {
    const asStaff = t.client(staff);
    const expired = await issue({ expiresAt: new Date(Date.now() - 60_000) });
    await expect(
      asStaff.call(vouchersApi.lookup, { params: { orgId, code: expired.code } }),
    ).resolves.toMatchObject({ status: 'expired' });
    await expectApiError(
      asStaff.call(vouchersApi.redeem, { params: { orgId, code: expired.code } }),
      409,
      ErrorCode.VOUCHER_EXPIRED,
    );

    const voided = await issue();
    await db
      .update(schema.awards)
      .set({ status: 'void', voidReason: 'test' })
      .where(
        and(eq(schema.awards.organizationId, orgId), eq(schema.awards.redeemCode, voided.code)),
      );
    await expectApiError(
      asStaff.call(vouchersApi.redeem, { params: { orgId, code: voided.code } }),
      409,
      ErrorCode.VOUCHER_VOID,
    );

    await expectApiError(
      asStaff.call(vouchersApi.lookup, { params: { orgId, code: 'NOPE2345' } }),
      404,
      ErrorCode.VOUCHER_NOT_FOUND,
    );
    await expectApiError(
      asStaff.call(vouchersApi.redeem, { params: { orgId, code: 'NOPE2345' } }),
      404,
      ErrorCode.VOUCHER_NOT_FOUND,
    );
  });

  test('only the owner reopens a redemption, with a reason that is audited', async () => {
    const { code } = await issue();
    await t.client(staff).call(vouchersApi.redeem, { params: { orgId, code } });

    await expectApiError(
      t.client(staff).call(vouchersApi.reopen, {
        params: { orgId, code },
        body: { reason: 'Nhầm khách' },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      t.client(owner).call(vouchersApi.reopen, { params: { orgId, code }, body: { reason: 'x' } }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    const reopened = await t.client(owner).call(vouchersApi.reopen, {
      params: { orgId, code },
      body: { reason: 'Thu ngân bấm nhầm mã' },
    });
    expect(reopened).toMatchObject({ status: 'issued', redeemedAt: null, redeemedByName: null });

    const [entry] = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.organizationId, orgId),
          eq(schema.auditLogs.action, 'voucher.reopen'),
        ),
      );
    expect(entry?.diff).toMatchObject({ code, reason: 'Thu ngân bấm nhầm mã' });

    // Not redeemed any more: reopening again is a conflict; redeeming works again.
    await expectApiError(
      t.client(owner).call(vouchersApi.reopen, {
        params: { orgId, code },
        body: { reason: 'Lần hai' },
      }),
      409,
      ErrorCode.CONFLICT,
    );
    await expect(
      t.client(staff).call(vouchersApi.redeem, { params: { orgId, code } }),
    ).resolves.toMatchObject({ status: 'redeemed' });
  });

  test('a redeemer has no access to campaigns', async () => {
    const asStaff = t.client(staff);
    await expectApiError(
      asStaff.call(campaignsApi.list, { params: { orgId } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asStaff.call(campaignsApi.get, { params: { orgId, campaignId } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asStaff.call(campaignsApi.vouchers, { params: { orgId, campaignId } }),
      403,
      ErrorCode.FORBIDDEN,
    );
  });

  test('anonymous requests are rejected with 401', async () => {
    await expectApiError(
      t.client().call(vouchersApi.lookup, { params: { orgId, code: 'ABCD2345' } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
    await expectApiError(
      t.client().call(vouchersApi.redeem, { params: { orgId, code: 'ABCD2345' } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
  });

  test('invalid code is a 400', async () => {
    await expectApiError(
      t.client(staff).call(vouchersApi.lookup, { params: { orgId, code: 'ab' } }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
  });

  test('tenant isolation: codes are invisible across organizations', async () => {
    const { code } = await issue();
    const asStranger = t.client(stranger);
    // Another org's member calling this org's routes: 403.
    await expectApiError(
      asStranger.call(vouchersApi.lookup, { params: { orgId, code } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asStranger.call(vouchersApi.redeem, { params: { orgId, code } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asStranger.call(vouchersApi.reopen, { params: { orgId, code }, body: { reason: 'abc' } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    // Through their own org the code does not exist.
    await expectApiError(
      asStranger.call(vouchersApi.lookup, { params: { orgId: otherOrg, code } }),
      404,
      ErrorCode.VOUCHER_NOT_FOUND,
    );
    await expectApiError(
      asStranger.call(vouchersApi.redeem, { params: { orgId: otherOrg, code } }),
      404,
      ErrorCode.VOUCHER_NOT_FOUND,
    );
    await expectApiError(
      asStranger.call(vouchersApi.reopen, {
        params: { orgId: otherOrg, code },
        body: { reason: 'abc' },
      }),
      404,
      ErrorCode.VOUCHER_NOT_FOUND,
    );
    // Still redeemable in its own org.
    await expect(
      t.client(owner).call(vouchersApi.lookup, { params: { orgId, code } }),
    ).resolves.toMatchObject({ status: 'issued' });
  });

  test('searchByPhone returns only active issued live vouchers for orgId, audits lookup_phone and rate-limits at 20/h (PRZ-15)', async () => {
    const pii = t.app.get(PiiService);
    const phoneProtected = pii.protectPhone('0901234567');
    expect(phoneProtected).not.toBeNull();

    const active = await issue({ playerName: 'Lan Hương' });
    const redeemed = await issue({ playerName: 'Lan Hương' });
    const expired = await issue({
      playerName: 'Lan Hương',
      expiresAt: new Date(Date.now() - 60_000),
    });
    await db
      .update(schema.players)
      .set({
        phoneEnc: phoneProtected?.phoneEnc ?? null,
        phoneHash: phoneProtected?.phoneHash ?? null,
      })
      .where(eq(schema.players.id, active.playerId));
    // Attach the redeemed and expired awards to the same player (one phone = one player per event).
    await db
      .update(schema.awards)
      .set({ playerId: active.playerId })
      .where(
        and(eq(schema.awards.organizationId, orgId), eq(schema.awards.redeemCode, redeemed.code)),
      );
    await db
      .update(schema.awards)
      .set({ playerId: active.playerId })
      .where(
        and(eq(schema.awards.organizationId, orgId), eq(schema.awards.redeemCode, expired.code)),
      );

    // Redeem one of the three vouchers.
    await t.client(staff).call(vouchersApi.redeem, {
      params: { orgId, code: redeemed.code },
      body: { via: 'phone' },
    });

    // Another org's voucher with the same phoneHash must never leak.
    const otherCreated = await t.client(stranger).call(campaignsApi.create, {
      params: { orgId: otherOrg },
      body: campaignBody({ name: 'Quán khác' }),
    });
    await t.client(stranger).call(campaignsApi.publish, {
      params: { orgId: otherOrg, campaignId: otherCreated.id },
    });
    const otherVoucher = await issueVoucher(db, {
      orgId: otherOrg,
      campaignId: otherCreated.id,
      prizeKey: 'p1',
      playerName: 'Lan Hương',
    });
    await db
      .update(schema.players)
      .set({
        phoneEnc: phoneProtected?.phoneEnc ?? null,
        phoneHash: phoneProtected?.phoneHash ?? null,
      })
      .where(eq(schema.players.id, otherVoucher.playerId));

    const asStaff = t.client(staff);
    const res = await asStaff.call(vouchersApi.searchByPhone, {
      params: { orgId },
      query: { phone: '+84 901-234-567' },
    });
    expect(res.items.map((v) => v.code)).toEqual([active.code]);
    expect(res.items[0]).toMatchObject({
      code: active.code,
      status: 'issued',
      playerName: 'Lan Hương',
    });

    // Cross-tenant 403 when stranger queries orgId.
    await expectApiError(
      t.client(stranger).call(vouchersApi.searchByPhone, {
        params: { orgId },
        query: { phone: '0901234567' },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );

    // Invalid phone number returns 400 VALIDATION_FAILED.
    await expectApiError(
      asStaff.call(vouchersApi.searchByPhone, {
        params: { orgId },
        query: { phone: 'not-a-phone' },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    // Audit log recorded for voucher.lookup_phone and voucher.redeem via phone.
    const lookupAudits = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.organizationId, orgId),
          eq(schema.auditLogs.action, 'voucher.lookup_phone'),
        ),
      );
    expect(lookupAudits.length).toBeGreaterThanOrEqual(1);
    expect(lookupAudits[0]?.diff).toMatchObject({ matchCount: 1 });

    // Rate-limit: 20 lookups/hour per actor; 2 already used above (valid + invalid), so 18 more succeed and the 21st gets 429.
    for (let i = 0; i < 18; i++) {
      await asStaff.call(vouchersApi.searchByPhone, {
        params: { orgId },
        query: { phone: '0901234567' },
      });
    }
    await expectApiError(
      asStaff.call(vouchersApi.searchByPhone, {
        params: { orgId },
        query: { phone: '0901234567' },
      }),
      429,
      ErrorCode.RATE_LIMITED,
    );
  });
});
