import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import { campaignsApi, ErrorCode } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, eq } from 'drizzle-orm';
import { DB } from '../src/infra/tokens';
import {
  addMember,
  campaignBody,
  issueVoucher,
  P1,
  P2,
  sessionUserId,
  setPlan,
} from './campaign-fixtures';
import { createOrg, createTestApp, signUp, type TestApp, uniqueSlug } from './create-test-app';

let t: TestApp;
let db: Database;
let alice: string;
let bob: string;
let aliceOrg: string;
let bobOrg: string;

beforeAll(async () => {
  t = await createTestApp();
  db = t.app.get<Database>(DB);
  alice = await signUp(t.baseUrl, 'Alice');
  bob = await signUp(t.baseUrl, 'Bob');
  aliceOrg = await createOrg(t.baseUrl, alice);
  await setPlan(db, aliceOrg, 'chain');
  bobOrg = await createOrg(t.baseUrl, bob);
  await setPlan(db, bobOrg, 'chain');
});

afterAll(() => t?.close());

async function expectApiError(promise: Promise<unknown>, status: number, code: ErrorCode) {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status, code });
  return err as ApiError;
}

const DAY = 86_400_000;

describe('campaigns API', () => {
  test('create → save draft → publish → edit draft keeps the published version', async () => {
    const api = t.client(alice);
    const params = { orgId: aliceOrg };

    const created = await api.call(campaignsApi.create, { params, body: campaignBody() });
    expect(created).toMatchObject({
      organizationId: aliceOrg,
      name: 'Khai trương Quán Đức',
      templateKey: 'spin-wheel',
      skinKey: 'grand-opening',
      status: 'draft',
      phase: 'draft',
      paused: false,
      version: 0,
      publishedAt: null,
      hasUnpublishedChanges: false,
    });
    // Slug generated from the name, Vietnamese diacritics stripped.
    expect(created.slug).toMatch(/^khai-truong-quan-duc-[a-z0-9]{6}$/);

    const id = { ...params, campaignId: created.id };
    const [event] = await db.select().from(schema.events).where(eq(schema.events.id, created.id));
    expect(event).toMatchObject({
      status: 'draft',
      identity: 'form_only',
      timezone: 'Asia/Ho_Chi_Minh',
      paused: false,
    });
    expect(event?.registrationForm).toMatchObject({
      fields: [{ key: 'name' }, { key: 'phone' }],
      consents: [
        { purpose: 'participation', required: true },
        { purpose: 'marketing', required: false },
      ],
    });

    const saved = await api.call(campaignsApi.update, {
      params: id,
      body: { name: 'Khai trương chi nhánh 2', rules: { ...created.rules, collectForm: false } },
    });
    expect(saved.name).toBe('Khai trương chi nhánh 2');
    expect(saved.rules.collectForm).toBe(false);
    const [anonEvent] = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, created.id));
    expect(anonEvent).toMatchObject({ identity: 'anonymous', registrationForm: null });

    const published = await api.call(campaignsApi.publish, { params: id });
    expect(published).toMatchObject({
      status: 'published',
      phase: 'live',
      version: 1,
      hasUnpublishedChanges: false,
    });
    expect(published.publishedAt).not.toBeNull();

    const prizes = await db
      .select()
      .from(schema.prizes)
      .where(eq(schema.prizes.eventId, created.id));
    expect(prizes.map((p) => [p.key, p.quantity, p.remaining, p.valueVnd]).sort()).toEqual([
      ['p1', 50, 50, 30_000],
      ['p2', 10, 10, 50_000],
    ]);

    // Editing the draft does not touch the published, immutable version.
    const edited = await api.call(campaignsApi.update, {
      params: id,
      body: {
        prizes: [{ ...P1, name: 'Ly trà sữa size L' }, P2],
      },
    });
    expect(edited).toMatchObject({ version: 1, hasUnpublishedChanges: true, phase: 'live' });
    const versions = await db
      .select()
      .from(schema.gameVersions)
      .innerJoin(schema.games, eq(schema.games.id, schema.gameVersions.gameId))
      .where(eq(schema.games.eventId, created.id));
    expect(versions).toHaveLength(1);
    const v1Config = versions[0]?.game_versions.config as { prizes: Array<{ name: string }> };
    expect(v1Config.prizes[0]?.name).toBe('Ly trà sữa');

    const republished = await api.call(campaignsApi.publish, { params: id });
    expect(republished).toMatchObject({ version: 2, hasUnpublishedChanges: false });
    const [p1] = await db
      .select()
      .from(schema.prizes)
      .where(and(eq(schema.prizes.eventId, created.id), eq(schema.prizes.key, 'p1')));
    expect(p1?.name).toBe('Ly trà sữa size L');

    const list = await api.call(campaignsApi.list, { params, query: { limit: 50 } });
    const item = list.items.find((c) => c.id === created.id);
    expect(item).toMatchObject({ version: 2, phase: 'live' });
    expect(item && 'screens' in item).toBe(false);

    await expect(api.call(campaignsApi.get, { params: id })).resolves.toMatchObject({
      id: created.id,
      screens: { cover: { height: 800 } },
    });
  });

  test('pause, resume, end and delete follow the lifecycle', async () => {
    const api = t.client(alice);
    const created = await api.call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody({ name: 'Lifecycle' }),
    });
    const id = { orgId: aliceOrg, campaignId: created.id };

    // Lifecycle actions need a published campaign.
    await expectApiError(
      api.call(campaignsApi.pause, { params: id }),
      409,
      ErrorCode.CAMPAIGN_NOT_PUBLISHED,
    );

    await api.call(campaignsApi.publish, { params: id });
    await expectApiError(
      api.call(campaignsApi.remove, { params: id }),
      409,
      ErrorCode.CAMPAIGN_RUNNING,
    );

    const paused = await api.call(campaignsApi.pause, { params: id });
    expect(paused).toMatchObject({ paused: true, phase: 'paused' });
    const resumed = await api.call(campaignsApi.resume, { params: id });
    expect(resumed).toMatchObject({ paused: false, phase: 'live' });

    const before = Date.now();
    const ended = await api.call(campaignsApi.end, { params: id });
    expect(ended).toMatchObject({ phase: 'ended', paused: false, hasUnpublishedChanges: false });
    expect(new Date(ended.rules.endsAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    const [event] = await db.select().from(schema.events).where(eq(schema.events.id, created.id));
    expect(event?.endsAt?.getTime()).toBe(new Date(ended.rules.endsAt).getTime());

    const audit = await db
      .select({ action: schema.auditLogs.action })
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.targetId, created.id));
    expect(audit.map((a) => a.action).sort()).toEqual(
      ['campaign.end', 'campaign.pause', 'campaign.publish', 'campaign.resume'].sort(),
    );

    await api.call(campaignsApi.remove, { params: id });
    await expectApiError(api.call(campaignsApi.get, { params: id }), 404, ErrorCode.NOT_FOUND);
  });

  test('a scheduled campaign cannot be deleted; a draft can', async () => {
    const api = t.client(alice);
    const base = campaignBody();
    const scheduled = await api.call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody({
        rules: {
          ...base.rules,
          startsAt: new Date(Date.now() + DAY).toISOString(),
          endsAt: new Date(Date.now() + 3 * DAY).toISOString(),
        },
      }),
    });
    const id = { orgId: aliceOrg, campaignId: scheduled.id };
    const published = await api.call(campaignsApi.publish, { params: id });
    expect(published.phase).toBe('scheduled');
    await expectApiError(
      api.call(campaignsApi.remove, { params: id }),
      409,
      ErrorCode.CAMPAIGN_RUNNING,
    );

    // Ending a scheduled campaign moves both dates so the schedule stays valid.
    const ended = await api.call(campaignsApi.end, { params: id });
    expect(ended.phase).toBe('ended');
    expect(ended.rules.startsAt < ended.rules.endsAt).toBe(true);

    const draft = await api.call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody(),
    });
    await expect(
      api.call(campaignsApi.remove, { params: { orgId: aliceOrg, campaignId: draft.id } }),
    ).resolves.toEqual({ ok: true });
  });

  test('publish rejects invalid prize rules with INVALID_PRIZE_RULES', async () => {
    const api = t.client(alice);
    const created = await api.call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody({
        prizes: [
          { ...P1, probability: 0.7 },
          { ...P2, probability: 0.6 },
        ],
      }),
    });
    const id = { orgId: aliceOrg, campaignId: created.id };
    await expectApiError(
      api.call(campaignsApi.publish, { params: id }),
      400,
      ErrorCode.INVALID_PRIZE_RULES,
    );
    await expect(api.call(campaignsApi.get, { params: id })).resolves.toMatchObject({
      version: 0,
      status: 'draft',
    });
  });

  test('republishing below the issued quantity is a 409; removed prizes stop issuing', async () => {
    const api = t.client(alice);
    const created = await api.call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody(),
    });
    const id = { orgId: aliceOrg, campaignId: created.id };
    await api.call(campaignsApi.publish, { params: id });
    await issueVoucher(db, { orgId: aliceOrg, campaignId: created.id, prizeKey: 'p2' });
    await issueVoucher(db, { orgId: aliceOrg, campaignId: created.id, prizeKey: 'p2' });

    await api.call(campaignsApi.update, {
      params: id,
      body: { prizes: [P1, { ...P2, quantity: 1 }] },
    });
    await expectApiError(
      api.call(campaignsApi.publish, { params: id }),
      409,
      ErrorCode.PRIZE_QUANTITY_BELOW_ISSUED,
    );

    // Lower to exactly the issued count, then drop the prize entirely.
    await api.call(campaignsApi.update, {
      params: id,
      body: { prizes: [P1, { ...P2, quantity: 5 }] },
    });
    await api.call(campaignsApi.publish, { params: id });
    let stats = await api.call(campaignsApi.stats, { params: id });
    expect(stats.remainingByPrize).toMatchObject({ p1: 50, p2: 3 });
    expect(stats.issuedByPrize).toMatchObject({ p1: 0, p2: 2 });

    await api.call(campaignsApi.update, { params: id, body: { prizes: [P1] } });
    await api.call(campaignsApi.publish, { params: id });
    stats = await api.call(campaignsApi.stats, { params: id });
    expect(stats.remainingByPrize.p2).toBe(0);
    expect(stats.issuedByPrize.p2).toBe(2);
  });

  test('plays, vouchers and stats report live data', async () => {
    const api = t.client(alice);
    const created = await api.call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody(),
    });
    const id = { orgId: aliceOrg, campaignId: created.id };
    await api.call(campaignsApi.publish, { params: id });

    const v1 = await issueVoucher(db, {
      orgId: aliceOrg,
      campaignId: created.id,
      prizeKey: 'p1',
      playerName: 'Lan',
    });
    const v2 = await issueVoucher(db, { orgId: aliceOrg, campaignId: created.id, prizeKey: 'p2' });
    const v3 = await issueVoucher(db, {
      orgId: aliceOrg,
      campaignId: created.id,
      prizeKey: 'p1',
      expiresAt: new Date(Date.now() - 1000),
    });
    await db
      .update(schema.awards)
      .set({ status: 'redeemed', redeemedAt: new Date() })
      .where(eq(schema.awards.redeemCode, v2.code));

    const plays = await api.call(campaignsApi.plays, { params: id, query: { limit: 2 } });
    expect(plays.items).toHaveLength(2);
    expect(plays.nextCursor).not.toBeNull();
    expect(plays.items[0]).toMatchObject({
      playerId: v3.playerId,
      outcome: 'win',
      prizeId: 'p1',
      voucherCode: v3.code,
      channel: 'table-qr',
      rehearsal: false,
    });
    const rest = await api.call(campaignsApi.plays, {
      params: id,
      query: { limit: 2, cursor: plays.nextCursor ?? undefined },
    });
    expect(rest.items.map((p) => p.playerName)).toEqual(['Lan']);

    const vouchers = await api.call(campaignsApi.vouchers, { params: id });
    expect(vouchers.items.map((v) => [v.code, v.status])).toEqual([
      [v3.code, 'expired'],
      [v2.code, 'redeemed'],
      [v1.code, 'issued'],
    ]);
    const redeemedOnly = await api.call(campaignsApi.vouchers, {
      params: id,
      query: { status: 'redeemed' },
    });
    expect(redeemedOnly.items.map((v) => v.code)).toEqual([v2.code]);
    const issuedOnly = await api.call(campaignsApi.vouchers, {
      params: id,
      query: { status: 'issued' },
    });
    expect(issuedOnly.items.map((v) => v.code)).toEqual([v1.code]);

    const stats = await api.call(campaignsApi.stats, { params: id });
    expect(stats).toEqual({
      plays: 3,
      players: 3,
      wins: 3,
      redeemed: 1,
      budgetUsedVnd: 2 * 30_000 + 50_000,
      redeemedValueVnd: 50_000,
      remainingByPrize: { p1: 48, p2: 9 },
      issuedByPrize: { p1: 2, p2: 1 },
    });
  });

  test('cursor pagination walks every campaign exactly once', async () => {
    const owner = await signUp(t.baseUrl, 'Pager');
    const orgId = await createOrg(t.baseUrl, owner);
    const api = t.client(owner);
    for (let i = 0; i < 5; i++) {
      await api.call(campaignsApi.create, {
        params: { orgId },
        body: campaignBody({ name: `C${i}` }),
      });
    }
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await api.call(campaignsApi.list, {
        params: { orgId },
        query: { limit: 2, cursor },
      });
      seen.push(...page.items.map((c) => c.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
  });

  test('a duplicate client slug is a 409 SLUG_TAKEN', async () => {
    const api = t.client(alice);
    const slug = uniqueSlug('ct');
    await api.call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody({ slug }),
    });
    await expectApiError(
      api.call(campaignsApi.create, { params: { orgId: aliceOrg }, body: campaignBody({ slug }) }),
      409,
      ErrorCode.SLUG_TAKEN,
    );
  });

  test('invalid bodies are 400 VALIDATION_FAILED', async () => {
    const api = t.client(alice);
    const base = campaignBody();
    await expectApiError(
      api.call(campaignsApi.create, {
        params: { orgId: aliceOrg },
        body: { ...base, name: '' },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
    await expectApiError(
      api.call(campaignsApi.create, {
        params: { orgId: aliceOrg },
        body: { ...base, rules: { ...base.rules, endsAt: base.rules.startsAt } },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
    await expectApiError(
      api.call(campaignsApi.create, {
        params: { orgId: aliceOrg },
        body: campaignBody({
          prizes: [{ ...P1, image: 'data:image/png;base64,AAAA' }],
        }),
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
  });

  test('anonymous requests are rejected with 401', async () => {
    await expectApiError(
      t.client().call(campaignsApi.list, { params: { orgId: aliceOrg } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
    await expectApiError(
      t.client().call(campaignsApi.create, { params: { orgId: aliceOrg }, body: campaignBody() }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
  });

  test('tenant isolation: another org gets 403 on every route and 404 through its own org', async () => {
    const created = await t.client(alice).call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody({ name: 'Secret' }),
    });
    const asBob = t.client(bob);
    const params = { orgId: aliceOrg, campaignId: created.id };
    const forbidden = (p: Promise<unknown>) => expectApiError(p, 403, ErrorCode.FORBIDDEN);

    await forbidden(asBob.call(campaignsApi.list, { params: { orgId: aliceOrg } }));
    await forbidden(
      asBob.call(campaignsApi.create, { params: { orgId: aliceOrg }, body: campaignBody() }),
    );
    await forbidden(asBob.call(campaignsApi.get, { params }));
    await forbidden(asBob.call(campaignsApi.update, { params, body: { name: 'x' } }));
    await forbidden(asBob.call(campaignsApi.remove, { params }));
    await forbidden(asBob.call(campaignsApi.publish, { params }));
    await forbidden(asBob.call(campaignsApi.pause, { params }));
    await forbidden(asBob.call(campaignsApi.resume, { params }));
    await forbidden(asBob.call(campaignsApi.end, { params }));
    await forbidden(asBob.call(campaignsApi.plays, { params }));
    await forbidden(asBob.call(campaignsApi.vouchers, { params }));
    await forbidden(asBob.call(campaignsApi.stats, { params }));

    // Bob's own org cannot reach Alice's campaign either (repository scoping).
    const own = { orgId: bobOrg, campaignId: created.id };
    const notFound = (p: Promise<unknown>) => expectApiError(p, 404, ErrorCode.NOT_FOUND);
    await notFound(asBob.call(campaignsApi.get, { params: own }));
    await notFound(asBob.call(campaignsApi.update, { params: own, body: { name: 'x' } }));
    await notFound(asBob.call(campaignsApi.remove, { params: own }));
    await notFound(asBob.call(campaignsApi.publish, { params: own }));
    await notFound(asBob.call(campaignsApi.pause, { params: own }));
    await notFound(asBob.call(campaignsApi.resume, { params: own }));
    await notFound(asBob.call(campaignsApi.end, { params: own }));
    await notFound(asBob.call(campaignsApi.plays, { params: own }));
    await notFound(asBob.call(campaignsApi.vouchers, { params: own }));
    await notFound(asBob.call(campaignsApi.stats, { params: own }));
    const bobList = await asBob.call(campaignsApi.list, { params: { orgId: bobOrg } });
    expect(bobList.items.map((c) => c.id)).not.toContain(created.id);

    // Alice's campaign is unchanged.
    await expect(t.client(alice).call(campaignsApi.get, { params })).resolves.toMatchObject({
      name: 'Secret',
      version: 0,
    });
  });

  test('a redeemer cannot read or change campaigns', async () => {
    const created = await t.client(alice).call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody(),
    });
    const staff = await signUp(t.baseUrl, 'Counter staff');
    await addMember(db, aliceOrg, await sessionUserId(t.baseUrl, staff), 'redeemer');
    const asStaff = t.client(staff);
    const params = { orgId: aliceOrg, campaignId: created.id };
    await expectApiError(
      asStaff.call(campaignsApi.list, { params: { orgId: aliceOrg } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(asStaff.call(campaignsApi.get, { params }), 403, ErrorCode.FORBIDDEN);
    await expectApiError(asStaff.call(campaignsApi.publish, { params }), 403, ErrorCode.FORBIDDEN);
    await expectApiError(asStaff.call(campaignsApi.stats, { params }), 403, ErrorCode.FORBIDDEN);
  });
});
