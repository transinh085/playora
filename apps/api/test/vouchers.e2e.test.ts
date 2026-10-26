import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import { campaignsApi, ErrorCode, vouchersApi } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, eq } from 'drizzle-orm';
import { DB } from '../src/infra/tokens';
import { addMember, campaignBody, issueVoucher, sessionUserId, setPlan } from './campaign-fixtures';
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

    await expectApiError(
      asStaff.call(vouchersApi.redeem, { params: { orgId, code } }),
      409,
      ErrorCode.VOUCHER_ALREADY_REDEEMED,
    );
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
});
