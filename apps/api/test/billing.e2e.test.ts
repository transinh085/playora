import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError, createApiClient } from '@playora/api-client';
import {
  adminApi,
  billingApi,
  type CreateCampaignBody,
  campaignsApi,
  ErrorCode,
  playsApi,
  vouchersApi,
} from '@playora/contracts';
import { billingMonth } from '@playora/core/billing';
import { type Database, schema } from '@playora/db';
import { and, eq } from 'drizzle-orm';
import { DB } from '../src/infra/tokens';
import { addMember, campaignBody, insertAwards, sessionUserId, setPlan } from './campaign-fixtures';
import { createOrg, createTestApp, signUp, type TestApp, uniqueEmail } from './create-test-app';

const DAY = 86_400_000;
const adminEmail = uniqueEmail();

let t: TestApp;
let db: Database;
let alice: string;
let bob: string;
let admin: string;
let aliceOrg: string;
let bobOrg: string;

beforeAll(async () => {
  // Mixed case and spaces: the env list is normalised.
  t = await createTestApp({
    PLATFORM_ADMIN_EMAILS: ` other@playora.vn, ${adminEmail.toUpperCase()} `,
  });
  db = t.app.get<Database>(DB);
  alice = await signUp(t.baseUrl, 'Alice');
  bob = await signUp(t.baseUrl, 'Bob');
  admin = await signUp(t.baseUrl, 'Playora Staff', adminEmail);
  aliceOrg = await createOrg(t.baseUrl, alice);
  bobOrg = await createOrg(t.baseUrl, bob);
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

async function newOrg(name = 'Owner') {
  const cookie = await signUp(t.baseUrl, name);
  return { cookie, orgId: await createOrg(t.baseUrl, cookie), api: t.client(cookie) };
}

async function createCampaign(
  cookie: string,
  orgId: string,
  overrides: Partial<CreateCampaignBody> = {},
) {
  return t.client(cookie).call(campaignsApi.create, {
    params: { orgId },
    body: campaignBody(overrides),
  });
}

async function createPublished(cookie: string, orgId: string) {
  const c = await createCampaign(cookie, orgId);
  await t.client(cookie).call(campaignsApi.publish, { params: { orgId, campaignId: c.id } });
  return c;
}

const publicCampaign = (slug: string) =>
  createApiClient({ baseUrl: t.baseUrl }).call(playsApi.campaign, { params: { slug } });

describe('plan quotas (BIL-02)', () => {
  test('Free runs one campaign at a time; ending or pausing frees the slot', async () => {
    const { cookie, orgId, api } = await newOrg();
    const a = await createPublished(cookie, orgId);
    const b = await createCampaign(cookie, orgId, { name: 'Thứ hai' });

    await expectApiError(
      api.call(campaignsApi.publish, { params: { orgId, campaignId: b.id } }),
      409,
      ErrorCode.PLAN_CAMPAIGN_LIMIT,
    );
    // Republishing the running campaign never counts itself.
    await api.call(campaignsApi.publish, { params: { orgId, campaignId: a.id } });

    await api.call(campaignsApi.end, { params: { orgId, campaignId: a.id } });
    const published = await api.call(campaignsApi.publish, { params: { orgId, campaignId: b.id } });
    expect(published.phase).toBe('live');

    // Pause B, run C, then B cannot resume until C stops.
    await api.call(campaignsApi.pause, { params: { orgId, campaignId: b.id } });
    const c = await createPublished(cookie, orgId);
    await expectApiError(
      api.call(campaignsApi.resume, { params: { orgId, campaignId: b.id } }),
      409,
      ErrorCode.PLAN_CAMPAIGN_LIMIT,
    );
    await api.call(campaignsApi.end, { params: { orgId, campaignId: c.id } });
    expect(
      (await api.call(campaignsApi.resume, { params: { orgId, campaignId: b.id } })).phase,
    ).toBe('live');

    // A scheduled campaign counts too.
    const later = await createCampaign(cookie, orgId, {
      rules: {
        ...campaignBody().rules,
        startsAt: new Date(Date.now() + DAY).toISOString(),
        endsAt: new Date(Date.now() + 3 * DAY).toISOString(),
      },
    });
    await expectApiError(
      api.call(campaignsApi.publish, { params: { orgId, campaignId: later.id } }),
      409,
      ErrorCode.PLAN_CAMPAIGN_LIMIT,
    );
  });

  test('Quán runs three; Chuỗi is unlimited; a lapsed subscription is Free again', async () => {
    const { cookie, orgId, api } = await newOrg();
    await setPlan(db, orgId, 'shop');
    const running = [];
    for (let i = 0; i < 3; i++) running.push(await createPublished(cookie, orgId));
    const fourth = await createCampaign(cookie, orgId);
    await expectApiError(
      api.call(campaignsApi.publish, { params: { orgId, campaignId: fourth.id } }),
      409,
      ErrorCode.PLAN_CAMPAIGN_LIMIT,
    );

    await setPlan(db, orgId, 'shop', { currentPeriodEnd: new Date(Date.now() - 1000) });
    expect((await api.call(billingApi.get, { params: { orgId } })).plan).toBe('free');
    // Over the Free limit after the lapse, running campaigns keep running and can be republished.
    await api.call(campaignsApi.publish, {
      params: { orgId, campaignId: running[0]?.id ?? '' },
    });

    await setPlan(db, orgId, 'chain');
    await api.call(campaignsApi.publish, { params: { orgId, campaignId: fourth.id } });
    const billing = await api.call(billingApi.get, { params: { orgId } });
    expect(billing.plan).toBe('chain');
    expect(billing.usage.runningCampaigns).toBe(4);
    expect(billing.limits.maxRunningCampaigns).toBeNull();
  });

  test('watermark on Free, not on Quán', async () => {
    const { cookie, orgId } = await newOrg();
    const c = await createPublished(cookie, orgId);
    expect((await publicCampaign(c.slug)).watermark).toBe(true);
    await setPlan(db, orgId, 'shop');
    expect((await publicCampaign(c.slug)).watermark).toBe(false);
  });

  test('redemptions are counted per Vietnam calendar month with a 10% grace', async () => {
    const { cookie, orgId, api } = await newOrg();
    const c = await createPublished(cookie, orgId);
    const month = billingMonth();

    // Last month's redemptions and rehearsal codes never count.
    await insertAwards(db, {
      orgId,
      campaignId: c.id,
      count: 150,
      redeemedAt: new Date(month.start.getTime() - 1000),
    });
    await insertAwards(db, {
      orgId,
      campaignId: c.id,
      count: 20,
      redeemedAt: new Date(),
      env: 'rehearsal',
    });
    await insertAwards(db, { orgId, campaignId: c.id, count: 108, redeemedAt: new Date() });

    const billing = await api.call(billingApi.get, { params: { orgId } });
    expect(billing.plan).toBe('free');
    expect(billing.limits).toEqual({
      maxRunningCampaigns: 1,
      redemptionsPerMonth: 100,
      redemptionsHardLimit: 110,
      watermark: true,
    });
    expect(billing.usage).toEqual({
      runningCampaigns: 1,
      redemptionsThisMonth: 108,
      monthStart: month.start.toISOString(),
    });

    // Over the limit but within the grace: the customer still gets the prize.
    const issued = await insertAwards(db, { orgId, campaignId: c.id, count: 3, redeemedAt: null });
    const [first, second, third] = issued as [string, string, string];
    await api.call(vouchersApi.redeem, { params: { orgId, code: first } });
    await api.call(vouchersApi.redeem, { params: { orgId, code: second } });
    await expectApiError(
      api.call(vouchersApi.redeem, { params: { orgId, code: third } }),
      409,
      ErrorCode.PLAN_REDEMPTION_LIMIT,
    );
    // The blocked code is untouched, and a used code keeps its own error.
    expect((await api.call(vouchersApi.lookup, { params: { orgId, code: third } })).status).toBe(
      'issued',
    );
    await expectApiError(
      api.call(vouchersApi.redeem, { params: { orgId, code: first } }),
      409,
      ErrorCode.VOUCHER_ALREADY_REDEEMED,
    );

    // Rehearsal codes are never limited.
    const [rehearsal] = (await insertAwards(db, {
      orgId,
      campaignId: c.id,
      count: 1,
      redeemedAt: null,
      env: 'rehearsal',
    })) as [string];
    await api.call(vouchersApi.redeem, { params: { orgId, code: rehearsal } });

    // Upgrading unblocks the counter right away.
    await setPlan(db, orgId, 'shop');
    expect((await api.call(vouchersApi.redeem, { params: { orgId, code: third } })).status).toBe(
      'redeemed',
    );
    expect((await api.call(billingApi.get, { params: { orgId } })).usage.redemptionsThisMonth).toBe(
      111,
    );
  });
});

describe('billing API', () => {
  test('members except counter staff read the plan; cross-tenant 403; 401 signed out', async () => {
    const staff = await signUp(t.baseUrl, 'Thu ngân');
    const viewer = await signUp(t.baseUrl, 'Viewer');
    await addMember(db, aliceOrg, await sessionUserId(t.baseUrl, staff), 'redeemer');
    await addMember(db, aliceOrg, await sessionUserId(t.baseUrl, viewer), 'viewer');

    const asViewer = await t.client(viewer).call(billingApi.get, { params: { orgId: aliceOrg } });
    expect(asViewer).toMatchObject({ plan: 'free', subscription: null, invoices: [] });

    await expectApiError(
      t.client(staff).call(billingApi.get, { params: { orgId: aliceOrg } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      t.client(bob).call(billingApi.get, { params: { orgId: aliceOrg } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      t.client().call(billingApi.get, { params: { orgId: aliceOrg } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
  });
});

describe('back-office (BIL-01)', () => {
  test('only verified staff emails reach /admin; everyone else gets 403 or 401', async () => {
    // Not verified yet: a sign-up with a staff address must not inherit staff rights.
    await expectApiError(t.client(admin).call(adminApi.orgs, {}), 403, ErrorCode.FORBIDDEN);
    await db
      .update(schema.user)
      .set({ emailVerified: true })
      .where(eq(schema.user.id, await sessionUserId(t.baseUrl, admin)));

    for (const cookie of [alice, bob]) {
      await expectApiError(t.client(cookie).call(adminApi.orgs, {}), 403, ErrorCode.FORBIDDEN);
      await expectApiError(
        t.client(cookie).call(adminApi.setSubscription, {
          params: { orgId: aliceOrg },
          body: { plan: 'chain', currentPeriodEnd: null },
        }),
        403,
        ErrorCode.FORBIDDEN,
      );
      await expectApiError(
        t.client(cookie).call(adminApi.recordInvoice, {
          params: { orgId: cookie === alice ? aliceOrg : bobOrg },
          body: {
            plan: 'shop',
            amountVnd: 299_000,
            periodStart: new Date().toISOString(),
            periodEnd: new Date(Date.now() + 30 * DAY).toISOString(),
            paidAt: new Date().toISOString(),
          },
        }),
        403,
        ErrorCode.FORBIDDEN,
      );
    }
    await expectApiError(t.client().call(adminApi.orgs, {}), 401, ErrorCode.UNAUTHORIZED);
  });

  test('staff search orgs, set a plan and record a manual invoice, all audited', async () => {
    await db
      .update(schema.user)
      .set({ emailVerified: true })
      .where(eq(schema.user.id, await sessionUserId(t.baseUrl, admin)));
    const staffApi = t.client(admin);
    const [org] = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, aliceOrg));
    if (!org) throw new Error('org missing');

    const found = await staffApi.call(adminApi.orgs, { query: { query: org.slug.toUpperCase() } });
    expect(found.items).toHaveLength(1);
    expect(found.items[0]).toMatchObject({ id: aliceOrg, plan: 'free', subscription: null });
    expect(found.items[0]?.ownerEmail).toMatch(/@test\.playora\.local$/);
    const byEmail = await staffApi.call(adminApi.orgs, {
      query: { query: found.items[0]?.ownerEmail ?? '' },
    });
    expect(byEmail.items.map((o) => o.id)).toContain(aliceOrg);

    const end = new Date(Date.now() + 30 * DAY).toISOString();
    const set = await staffApi.call(adminApi.setSubscription, {
      params: { orgId: aliceOrg },
      body: { plan: 'shop', currentPeriodEnd: end, note: 'Pilot Tết' },
    });
    expect(set).toMatchObject({
      plan: 'shop',
      note: 'Pilot Tết',
      subscription: { plan: 'shop', status: 'active' },
    });
    expect(Date.parse(set.subscription?.currentPeriodEnd ?? '')).toBe(Date.parse(end));

    const periodEnd = new Date(Date.now() + 365 * DAY).toISOString();
    const invoice = await staffApi.call(adminApi.recordInvoice, {
      params: { orgId: aliceOrg },
      body: {
        plan: 'chain',
        amountVnd: 7_990_000,
        periodStart: new Date().toISOString(),
        periodEnd,
        paidAt: new Date().toISOString(),
        reference: 'CK 123456',
      },
    });
    expect(invoice).toMatchObject({ plan: 'chain', amountVnd: 7_990_000, reference: 'CK 123456' });

    // The owner sees the new plan and the invoice.
    const billing = await t.client(alice).call(billingApi.get, { params: { orgId: aliceOrg } });
    expect(billing.plan).toBe('chain');
    expect(Date.parse(billing.subscription?.currentPeriodEnd ?? '')).toBe(Date.parse(periodEnd));
    expect(billing.invoices.map((i) => i.id)).toEqual([invoice.id]);

    const audit = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(eq(schema.auditLogs.organizationId, aliceOrg), eq(schema.auditLogs.actorType, 'admin')),
      );
    expect(audit.map((a) => a.action).sort()).toEqual([
      'billing.invoice.record',
      'billing.subscription.set',
    ]);

    // 404 on an unknown org, 400 on a bad body.
    await expectApiError(
      staffApi.call(adminApi.setSubscription, {
        params: { orgId: 'no-such-org' },
        body: { plan: 'shop', currentPeriodEnd: null },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      staffApi.call(adminApi.recordInvoice, {
        params: { orgId: aliceOrg },
        body: {
          plan: 'shop',
          amountVnd: -1,
          periodStart: periodEnd,
          periodEnd: new Date().toISOString(),
          paidAt: new Date().toISOString(),
        },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
  });
});
