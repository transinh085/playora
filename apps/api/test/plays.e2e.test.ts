import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError, createApiClient } from '@playora/api-client';
import {
  type Campaign,
  type CampaignPrize,
  type CampaignRulesInput,
  campaignsApi,
  ErrorCode,
  type PlayResult,
  playsApi,
  publicApi,
  vouchersApi,
} from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, eq } from 'drizzle-orm';
import { DB } from '../src/infra/tokens';
import { localWeekday } from '../src/modules/plays/plays.service';
import { campaignBody, P1, P2, setPlan } from './campaign-fixtures';
import { createOrg, createTestApp, signUp, type TestApp } from './create-test-app';

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

async function expectApiError(promise: Promise<unknown>, status: number, code?: ErrorCode) {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject(code ? { status, code } : { status });
  return err as ApiError;
}

const DAY = 86_400_000;

/**
 * Live rules: started yesterday, no opening hours, no pacing, anonymous (no form). Anti-fraud `low`
 * because these tests run many players from one IP; `standard` is covered in anti-fraud.e2e.
 */
function rules(overrides: Partial<CampaignRulesInput> = {}): CampaignRulesInput {
  const now = Date.now();
  return {
    mode: 'overall_win_rate',
    overallWinRate: 1,
    playsPerDay: 1,
    maxWinsPerPlayer: 1,
    startsAt: new Date(now - DAY).toISOString(),
    endsAt: new Date(now + 7 * DAY).toISOString(),
    openingHours: null,
    pacing: false,
    budgetVnd: null,
    collectForm: false,
    antiFraud: 'low',
    ...overrides,
  };
}

async function createCampaign(
  input: { prizes?: CampaignPrize[]; rules?: Partial<CampaignRulesInput> } = {},
  opts: { publish?: boolean } = {},
): Promise<Campaign> {
  const api = t.client(alice);
  const created = await api.call(campaignsApi.create, {
    params: { orgId: aliceOrg },
    body: campaignBody({ prizes: input.prizes ?? [P1, P2], rules: rules(input.rules) }),
  });
  if (opts.publish === false) return created;
  return api.call(campaignsApi.publish, {
    params: { orgId: aliceOrg, campaignId: created.id },
  });
}

const ids = (c: Campaign) => ({ orgId: aliceOrg, campaignId: c.id });

function playerClient(token?: string) {
  return createApiClient({
    baseUrl: t.baseUrl,
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

async function join(slug: string, deviceId = crypto.randomUUID()) {
  const res = await playerClient().call(publicApi.join, { params: { slug }, body: { deviceId } });
  return { token: res.playerToken, playerId: res.player.id, api: playerClient(res.playerToken) };
}

function play(api: ReturnType<typeof playerClient>, slug: string, requestId = crypto.randomUUID()) {
  return api.call(playsApi.play, { params: { slug }, body: { requestId, channel: 'table-qr' } });
}

async function prizeRows(campaignId: string) {
  return db.select().from(schema.prizes).where(eq(schema.prizes.eventId, campaignId));
}

async function playRows(campaignId: string) {
  return db.select().from(schema.plays).where(eq(schema.plays.eventId, campaignId));
}

async function awardRows(campaignId: string) {
  return db.select().from(schema.awards).where(eq(schema.awards.eventId, campaignId));
}

describe('player campaign', () => {
  test('exposes the published version without odds, stock or values', async () => {
    const c = await createCampaign({ prizes: [{ ...P1, image: 'https://cdn.test/p1.png' }, P2] });
    const res = await fetch(`${t.baseUrl}/v1/p/${c.slug}/campaign`);
    expect(res.status).toBe(200);
    const raw = await res.text();
    for (const secret of ['probability', 'quantity', 'valueVnd', 'remaining', 'overallWinRate']) {
      expect(raw).not.toContain(secret);
    }
    const body = await playerClient().call(playsApi.campaign, { params: { slug: c.slug } });
    expect(body).toMatchObject({
      id: c.id,
      slug: c.slug,
      version: 1,
      phase: 'live',
      playsPerDay: 1,
      openDays: null,
      requireRedeemBeforeReplay: false,
      captchaSiteKey: null,
      collectForm: false,
      timezone: 'Asia/Ho_Chi_Minh',
      registrationForm: { fields: [], consents: [] },
    });
    expect(body.prizes).toEqual([
      { id: 'p1', name: P1.name, image: 'https://cdn.test/p1.png' },
      { id: 'p2', name: P2.name },
    ]);

    // The draft is never shown to players.
    await t.client(alice).call(campaignsApi.update, {
      params: ids(c),
      body: { prizes: [{ ...P1, name: 'Bản nháp' }] },
    });
    const again = await playerClient().call(playsApi.campaign, { params: { slug: c.slug } });
    expect(again.prizes.map((p) => p.name)).toEqual([P1.name, P2.name]);
  });

  test('404 when never published or deleted', async () => {
    const draft = await createCampaign({}, { publish: false });
    await expectApiError(
      playerClient().call(playsApi.campaign, { params: { slug: draft.slug } }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      playerClient().call(publicApi.join, {
        params: { slug: draft.slug },
        body: { deviceId: 'd1' },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );

    const c = await createCampaign();
    await t.client(alice).call(campaignsApi.end, { params: ids(c) });
    await t.client(alice).call(campaignsApi.remove, { params: ids(c) });
    await expectApiError(
      playerClient().call(playsApi.campaign, { params: { slug: c.slug } }),
      404,
      ErrorCode.NOT_FOUND,
    );
  });
});

describe('campaign terms (CMP-04)', () => {
  test('generated from the settings until the shop writes its own, which ships on publish', async () => {
    const c = await createCampaign();
    const generated = await playerClient().call(playsApi.campaign, { params: { slug: c.slug } });
    expect(generated.terms).toContain('THỂ LỆ CHƯƠNG TRÌNH');
    expect(generated.terms).toContain('Cơ cấu giải thưởng');
    expect(generated.terms).toContain(P1.name);
    expect(c.compliance.termsText).toBeNull();

    const api = t.client(alice);
    const updated = await api.call(campaignsApi.update, {
      params: ids(c),
      body: {
        compliance: {
          promotionType: 'purchase_linked',
          termsText: 'Thể lệ riêng của quán',
          checklistAcknowledgedAt: new Date().toISOString(),
        },
      },
    });
    expect(updated.hasUnpublishedChanges).toBe(true);
    // The live version keeps its terms until the shop republishes.
    const before = await playerClient().call(playsApi.campaign, { params: { slug: c.slug } });
    expect(before.terms).toBe(generated.terms);
    await api.call(campaignsApi.publish, { params: ids(c) });
    const after = await playerClient().call(playsApi.campaign, { params: { slug: c.slug } });
    expect(after.terms).toBe('Thể lệ riêng của quán');
  });
});

describe('plays', () => {
  test('join → win issues a voucher that the counter can redeem', async () => {
    const c = await createCampaign({ prizes: [{ ...P1, quantity: 3 }] });
    const p = await join(c.slug);
    const result = await play(p.api, c.slug);
    expect(result).toMatchObject({
      outcome: 'win',
      reason: 'win',
      prize: { id: 'p1', name: P1.name },
      turnsLeftToday: 0,
    });
    expect(result.playId).toBeString();
    expect(result.voucher?.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    // Voucher valid until the end of the campaign + 7 days.
    expect(Date.parse(result.voucher?.expiresAt ?? '')).toBe(Date.parse(c.rules.endsAt) + 7 * DAY);

    const [row] = await playRows(c.id);
    expect(row).toMatchObject({
      env: 'live',
      outcome: 'win',
      reason: 'win',
      channelKey: 'table-qr',
      playerId: p.playerId,
    });
    expect(row?.gameVersionId).not.toBeNull();
    expect(row?.rngProof).toMatchObject({ turn: 1, decision: { prizeId: 'p1', reason: 'win' } });
    expect((await prizeRows(c.id))[0]).toMatchObject({ remaining: 2, issued: 1 });

    const me = await p.api.call(playsApi.me, { params: { slug: c.slug } });
    expect(me.turnsLeftToday).toBe(0);
    expect(me.nextTurnAt).not.toBeNull();
    expect(Date.parse(me.nextTurnAt ?? '')).toBeGreaterThan(Date.now());
    expect(me.vouchers).toEqual([
      {
        code: result.voucher?.code as string,
        prize: { id: 'p1', name: P1.name },
        status: 'issued',
        issuedAt: expect.any(String),
        expiresAt: result.voucher?.expiresAt ?? null,
        redeemedAt: null,
      },
    ]);

    const stats = await t.client(alice).call(campaignsApi.stats, { params: ids(c) });
    expect(stats).toMatchObject({ plays: 1, players: 1, wins: 1, budgetUsedVnd: P1.valueVnd });

    const redeemed = await t.client(alice).call(vouchersApi.redeem, {
      params: { orgId: aliceOrg, code: result.voucher?.code as string },
    });
    expect(redeemed).toMatchObject({ status: 'redeemed', rehearsal: false });
    const after = await p.api.call(playsApi.me, { params: { slug: c.slug } });
    expect(after.vouchers[0]?.status).toBe('redeemed');
  });

  test('lose records the play without a voucher', async () => {
    const c = await createCampaign({ rules: { overallWinRate: 0, playsPerDay: 2 } });
    const p = await join(c.slug);
    const result = await play(p.api, c.slug);
    expect(result).toMatchObject({
      outcome: 'lose',
      reason: 'lose',
      prize: null,
      voucher: null,
      turnsLeftToday: 1,
    });
    expect(await playRows(c.id)).toHaveLength(1);
    expect(await awardRows(c.id)).toHaveLength(0);
    const me = await p.api.call(playsApi.me, { params: { slug: c.slug } });
    expect(me).toEqual({ turnsLeftToday: 1, nextTurnAt: null, blockedReason: null, vouchers: [] });
  });

  test('no_turns once playsPerDay is used, not recorded as a play', async () => {
    const c = await createCampaign({ rules: { overallWinRate: 0, playsPerDay: 2 } });
    const p = await join(c.slug);
    expect((await play(p.api, c.slug)).turnsLeftToday).toBe(1);
    expect((await play(p.api, c.slug)).turnsLeftToday).toBe(0);
    const third = await play(p.api, c.slug);
    expect(third).toEqual({
      playId: null,
      outcome: 'no_turns',
      reason: 'no_turns',
      prize: null,
      voucher: null,
      turnsLeftToday: 0,
    });
    expect(await playRows(c.id)).toHaveLength(2);
  });

  test('paused → closed without using a turn; resume reopens', async () => {
    const c = await createCampaign();
    const p = await join(c.slug);
    await t.client(alice).call(campaignsApi.pause, { params: ids(c) });
    expect((await playerClient().call(playsApi.campaign, { params: { slug: c.slug } })).phase).toBe(
      'paused',
    );
    const closed = await play(p.api, c.slug);
    expect(closed).toMatchObject({ outcome: 'closed', reason: 'paused', turnsLeftToday: 1 });
    expect(await playRows(c.id)).toHaveLength(0);
    expect((await p.api.call(playsApi.me, { params: { slug: c.slug } })).turnsLeftToday).toBe(1);

    await t.client(alice).call(campaignsApi.resume, { params: ids(c) });
    expect((await play(p.api, c.slug)).outcome).toBe('win');
  });

  test('scheduled → closed; ended → closed and join refused', async () => {
    const later = await createCampaign({
      rules: {
        startsAt: new Date(Date.now() + DAY).toISOString(),
        endsAt: new Date(Date.now() + 3 * DAY).toISOString(),
      },
    });
    // Joining before the start is allowed (waiting room).
    const early = await join(later.slug);
    expect(await play(early.api, later.slug)).toMatchObject({
      outcome: 'closed',
      reason: 'closed',
      turnsLeftToday: 1,
    });

    const c = await createCampaign();
    const p = await join(c.slug);
    await t.client(alice).call(campaignsApi.end, { params: ids(c) });
    expect((await playerClient().call(playsApi.campaign, { params: { slug: c.slug } })).phase).toBe(
      'ended',
    );
    expect(await play(p.api, c.slug)).toMatchObject({ outcome: 'closed', reason: 'closed' });
    expect(await playRows(c.id)).toHaveLength(0);
    await expectApiError(join(c.slug), 409, ErrorCode.EVENT_NOT_LIVE);
  });

  test('idempotent on requestId: sequential and 10 concurrent retries play once', async () => {
    const c = await createCampaign({ rules: { playsPerDay: 3, maxWinsPerPlayer: 3 } });
    const p = await join(c.slug);

    const requestId = crypto.randomUUID();
    const first = await play(p.api, c.slug, requestId);
    const retry = await play(p.api, c.slug, requestId);
    expect(retry).toEqual(first);
    expect(first.outcome).toBe('win');

    const concurrentId = crypto.randomUUID();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => play(p.api, c.slug, concurrentId)),
    );
    const firstConcurrent = results[0] as PlayResult;
    for (const r of results) expect(r).toEqual(firstConcurrent);
    expect(firstConcurrent.playId).not.toBe(first.playId);

    const rows = await playRows(c.id);
    expect(rows).toHaveLength(2);
    expect(await awardRows(c.id)).toHaveLength(2);
    const [counter] = await db
      .select()
      .from(schema.playCounters)
      .where(eq(schema.playCounters.playerId, p.playerId));
    expect(counter?.n).toBe(2);
  });

  test('50 concurrent players against 5 in stock → exactly 5 awards, never negative', async () => {
    const c = await createCampaign({ prizes: [{ ...P1, quantity: 5 }] });
    const players = await Promise.all(Array.from({ length: 50 }, () => join(c.slug)));
    const results = await Promise.all(players.map((p) => play(p.api, c.slug)));

    expect(results.filter((r) => r.outcome === 'win')).toHaveLength(5);
    const losses = results.filter((r) => r.outcome === 'lose');
    expect(losses).toHaveLength(45);
    for (const r of losses) expect(r.reason).toBe('out_of_stock');
    expect(await awardRows(c.id)).toHaveLength(5);
    expect(await playRows(c.id)).toHaveLength(50);
    expect((await prizeRows(c.id))[0]).toMatchObject({ quantity: 5, remaining: 0, issued: 5 });
    const codes = new Set(results.map((r) => r.voucher?.code).filter(Boolean));
    expect(codes.size).toBe(5);
  });

  test('budget cap holds under concurrency', async () => {
    // Plenty of stock; the budget only covers 5 × 10.000đ across two prizes.
    const c = await createCampaign({
      prizes: [
        { id: 'a', name: 'Bánh', quantity: 100, valueVnd: 10_000 },
        { id: 'b', name: 'Nước', quantity: 100, valueVnd: 10_000 },
      ],
      rules: { mode: 'guaranteed', budgetVnd: 50_000 },
    });
    const players = await Promise.all(Array.from({ length: 30 }, () => join(c.slug)));
    const results = await Promise.all(players.map((p) => play(p.api, c.slug)));
    expect(results.filter((r) => r.outcome === 'win')).toHaveLength(5);
    for (const r of results.filter((r) => r.outcome === 'lose')) expect(r.reason).toBe('budget');
    const rows = await prizeRows(c.id);
    expect(rows.reduce((s, p) => s + p.issued * (p.valueVnd ?? 0), 0)).toBe(50_000);
    const stats = await t.client(alice).call(campaignsApi.stats, { params: ids(c) });
    expect(stats.budgetUsedVnd).toBe(50_000);
  });

  test('maxWinsPerPlayer holds under concurrent plays of one player', async () => {
    const c = await createCampaign({
      prizes: [{ ...P1, quantity: 100 }],
      rules: { mode: 'guaranteed', playsPerDay: 5, maxWinsPerPlayer: 2 },
    });
    const p = await join(c.slug);
    const results = await Promise.all(Array.from({ length: 5 }, () => play(p.api, c.slug)));
    expect(results.filter((r) => r.outcome === 'win')).toHaveLength(2);
    for (const r of results.filter((r) => r.outcome === 'lose')) expect(r.reason).toBe('limit');
    expect(results.map((r) => r.turnsLeftToday).sort()).toEqual([0, 1, 2, 3, 4]);
    expect(await awardRows(c.id)).toHaveLength(2);
    // A 6th play has no turn left.
    expect((await play(p.api, c.slug)).outcome).toBe('no_turns');
  });

  test('auth: 401 without or with a bad token, 403 with another campaign’s token, 400 on bad body', async () => {
    const c = await createCampaign();
    const other = await createCampaign();
    const p = await join(other.slug);

    await expectApiError(play(playerClient(), c.slug), 401, ErrorCode.UNAUTHORIZED);
    await expectApiError(play(playerClient('nope.nope'), c.slug), 401, ErrorCode.UNAUTHORIZED);
    await expectApiError(
      playerClient().call(playsApi.me, { params: { slug: c.slug } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
    await expectApiError(play(p.api, c.slug), 403, ErrorCode.FORBIDDEN);
    await expectApiError(
      p.api.call(playsApi.me, { params: { slug: c.slug } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    // An organizer session is not a player session.
    await expectApiError(play(t.client(alice), c.slug), 401, ErrorCode.UNAUTHORIZED);

    const res = await fetch(`${t.baseUrl}/v1/p/${other.slug}/plays`, {
      method: 'POST',
      headers: { authorization: `Bearer ${p.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ requestId: 'not-a-uuid', channel: 'Bad Channel!' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      ErrorCode.VALIDATION_FAILED,
    );
    expect(await playRows(other.id)).toHaveLength(0);
  });
});

describe('open days, redeem first and session version', () => {
  test('a closed weekday answers closed without using a turn', async () => {
    const today = localWeekday(new Date(), 'Asia/Ho_Chi_Minh');
    const openDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== today);
    const c = await createCampaign({ rules: { openDays } });
    const pub = await playerClient().call(playsApi.campaign, { params: { slug: c.slug } });
    expect(pub).toMatchObject({ phase: 'live', openDays });

    const p = await join(c.slug);
    expect(await play(p.api, c.slug)).toEqual({
      playId: null,
      outcome: 'closed',
      reason: 'closed',
      prize: null,
      voucher: null,
      turnsLeftToday: 1,
    });
    expect(await playRows(c.id)).toHaveLength(0);
    const [counter] = await db
      .select()
      .from(schema.playCounters)
      .where(eq(schema.playCounters.playerId, p.playerId));
    expect(counter?.n ?? 0).toBe(0);
    expect((await p.api.call(playsApi.me, { params: { slug: c.slug } })).turnsLeftToday).toBe(1);

    // Open today again: the same player plays.
    await t.client(alice).call(campaignsApi.update, {
      params: ids(c),
      body: { rules: { ...c.rules, openDays: null } },
    });
    await t.client(alice).call(campaignsApi.publish, { params: ids(c) });
    expect((await play(p.api, c.slug)).outcome).toBe('win');
  });

  test('redeem first: an unused voucher blocks the next turn until it is redeemed', async () => {
    const c = await createCampaign({
      prizes: [{ ...P1, quantity: 100 }],
      rules: {
        mode: 'guaranteed',
        playsPerDay: 3,
        maxWinsPerPlayer: 3,
        requireRedeemBeforeReplay: true,
      },
    });
    expect(
      (await playerClient().call(playsApi.campaign, { params: { slug: c.slug } }))
        .requireRedeemBeforeReplay,
    ).toBe(true);
    const p = await join(c.slug);
    const meBefore = await p.api.call(playsApi.me, { params: { slug: c.slug } });
    expect(meBefore.blockedReason).toBeNull();

    const first = await play(p.api, c.slug);
    expect(first).toMatchObject({ outcome: 'win', turnsLeftToday: 2 });
    const me = await p.api.call(playsApi.me, { params: { slug: c.slug } });
    expect(me).toMatchObject({ turnsLeftToday: 2, blockedReason: 'redeem_first' });

    expect(await play(p.api, c.slug)).toEqual({
      playId: null,
      outcome: 'no_turns',
      reason: 'redeem_first',
      prize: null,
      voucher: null,
      turnsLeftToday: 2,
    });
    expect(await playRows(c.id)).toHaveLength(1);

    await t.client(alice).call(vouchersApi.redeem, {
      params: { orgId: aliceOrg, code: first.voucher?.code as string },
    });
    expect((await p.api.call(playsApi.me, { params: { slug: c.slug } })).blockedReason).toBeNull();
    expect(await play(p.api, c.slug)).toMatchObject({ outcome: 'win', turnsLeftToday: 1 });
  });

  test('redeem first ignores void and expired vouchers', async () => {
    const c = await createCampaign({
      prizes: [{ ...P1, quantity: 100 }],
      rules: {
        mode: 'guaranteed',
        playsPerDay: 3,
        maxWinsPerPlayer: 3,
        requireRedeemBeforeReplay: true,
      },
    });
    const p = await join(c.slug);
    expect((await play(p.api, c.slug)).outcome).toBe('win');
    await db
      .update(schema.awards)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.awards.playerId, p.playerId));
    expect((await play(p.api, c.slug)).outcome).toBe('win');
    await db
      .update(schema.awards)
      .set({ status: 'void' })
      .where(eq(schema.awards.playerId, p.playerId));
    expect((await p.api.call(playsApi.me, { params: { slug: c.slug } })).blockedReason).toBeNull();
    expect((await play(p.api, c.slug)).outcome).toBe('win');
  });

  test('tokens are signed with players.session_ver; bumping it revokes them', async () => {
    const c = await createCampaign({ rules: { playsPerDay: 2, overallWinRate: 0 } });
    const deviceId = crypto.randomUUID();
    const p = await join(c.slug, deviceId);
    expect((await play(p.api, c.slug)).outcome).toBe('lose');

    await db.update(schema.players).set({ sessionVer: 1 }).where(eq(schema.players.id, p.playerId));
    await expectApiError(play(p.api, c.slug), 401, ErrorCode.UNAUTHORIZED);
    await expectApiError(
      p.api.call(playsApi.me, { params: { slug: c.slug } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );

    // Joining again from the same device returns the same player with a fresh token.
    const again = await join(c.slug, deviceId);
    expect(again.playerId).toBe(p.playerId);
    expect((await play(again.api, c.slug)).outcome).toBe('lose');
  });

  // One device is one player, also under concurrent joins
  test('one device is one player, also under concurrent joins', async () => {
    const c = await createCampaign();
    const deviceId = crypto.randomUUID();
    const joins = await Promise.all(Array.from({ length: 8 }, () => join(c.slug, deviceId)));
    expect(new Set(joins.map((j) => j.playerId)).size).toBe(1);
    const rows = await db
      .select()
      .from(schema.players)
      .where(and(eq(schema.players.eventId, c.id), eq(schema.players.deviceId, deviceId)));
    expect(rows).toHaveLength(1);
  });

  test('restorePrizes: restores playerToken and vouchers on another browser via phone + last 4 chars of code, and rate-limits after 5 failures (PRZ-16, EVT-02)', async () => {
    const c = await createCampaign({
      prizes: [{ ...P1, quantity: 10 }],
      rules: { mode: 'guaranteed', collectForm: true, playsPerDay: 2, maxWinsPerPlayer: 2 },
    });
    const zaloClient = playerClient();
    const joined = await zaloClient.call(publicApi.join, {
      params: { slug: c.slug },
      body: {
        deviceId: crypto.randomUUID(),
        fields: { name: 'Nguyễn Thu Hà', phone: '0908 111 222' },
        consents: { participation: true, marketing: true },
      },
    });
    const zaloPlayerApi = playerClient(joined.playerToken);
    const won = await play(zaloPlayerApi, c.slug);
    expect(won.outcome).toBe('win');
    const code = won.voucher?.code as string;
    expect(code).toHaveLength(6);

    // Switching browser (Zalo → Safari) and trying to join with the same phone returns 409 PHONE_ALREADY_REGISTERED.
    const safariClient = playerClient();
    await expectApiError(
      safariClient.call(publicApi.join, {
        params: { slug: c.slug },
        body: {
          deviceId: crypto.randomUUID(),
          fields: { name: 'Hà Safari', phone: '+84 908-111-222' },
          consents: { participation: true },
        },
      }),
      409,
      ErrorCode.PHONE_ALREADY_REGISTERED,
    );

    // Wrong codeSuffix fails with 400 VOUCHER_NOT_FOUND.
    const safariDevice = crypto.randomUUID();
    await expectApiError(
      safariClient.call(playsApi.restorePrizes, {
        params: { slug: c.slug },
        body: { phone: '0908111222', codeSuffix: 'ZZZZ', deviceId: safariDevice },
      }),
      400,
      ErrorCode.VOUCHER_NOT_FOUND,
    );

    // Correct phone + last 4 chars of voucher code restores playerToken and vouchers without revoking Zalo session.
    const restored = await safariClient.call(playsApi.restorePrizes, {
      params: { slug: c.slug },
      body: {
        phone: '+84 908 111 222',
        codeSuffix: code.slice(-4).toLowerCase(),
        deviceId: safariDevice,
      },
    });
    expect(restored.player).toMatchObject({ id: joined.player.id, displayName: 'Nguyễn Thu Hà' });
    expect(restored.vouchers).toHaveLength(1);
    expect(restored.vouchers[0]?.code).toBe(code);

    // Both Safari and Zalo tokens remain valid!
    const safariPlayerApi = playerClient(restored.playerToken);
    expect(
      (await safariPlayerApi.call(playsApi.me, { params: { slug: c.slug } })).vouchers,
    ).toHaveLength(1);
    expect(
      (await zaloPlayerApi.call(playsApi.me, { params: { slug: c.slug } })).vouchers,
    ).toHaveLength(1);

    // Exceeding 5 failed attempts on a deviceId triggers 429 RATE_LIMITED.
    const attackerDevice = crypto.randomUUID();
    for (let i = 0; i < 5; i++) {
      await expectApiError(
        safariClient.call(playsApi.restorePrizes, {
          params: { slug: c.slug },
          body: { phone: '0908111222', codeSuffix: 'ZZZZ', deviceId: attackerDevice },
        }),
        400,
        ErrorCode.VOUCHER_NOT_FOUND,
      );
    }
    await expectApiError(
      safariClient.call(playsApi.restorePrizes, {
        params: { slug: c.slug },
        body: { phone: '0908111222', codeSuffix: code.slice(-4), deviceId: attackerDevice },
      }),
      429,
      ErrorCode.RATE_LIMITED,
    );
  });
});

describe('rehearsal plays', () => {
  test('play the draft with rehearsal stock; live numbers never move', async () => {
    const c = await createCampaign({ prizes: [{ ...P1, quantity: 5 }] });
    // Draft adds a prize that was never published and switches to guaranteed.
    await t.client(alice).call(campaignsApi.update, {
      params: ids(c),
      body: {
        prizes: [{ id: 'new', name: 'Quà thử', quantity: 1, valueVnd: 1_000 }],
        rules: { ...c.rules, mode: 'guaranteed', playsPerDay: 3, maxWinsPerPlayer: 3 },
      },
    });
    const before = await t.client(alice).call(campaignsApi.stats, { params: ids(c) });

    const api = t.client(alice);
    const rehearse = (testerKey: string, requestId = crypto.randomUUID()) =>
      api.call(campaignsApi.rehearsalPlay, { params: ids(c), body: { testerKey, requestId } });
    const requestId = crypto.randomUUID();
    const first = await rehearse('tester-1', requestId);
    expect(first).toMatchObject({
      outcome: 'win',
      prize: { id: 'new', name: 'Quà thử' },
      turnsLeftToday: 2,
    });
    expect(await rehearse('tester-1', requestId)).toEqual(first);
    // Rehearsal stock of 'new' is 1: the next tester finds it gone.
    expect(await rehearse('tester-2')).toMatchObject({ outcome: 'lose', reason: 'out_of_stock' });

    const after = await t.client(alice).call(campaignsApi.stats, { params: ids(c) });
    // Only difference: the rehearsal-only prize shows up with no live stock.
    expect(after).toEqual({
      ...before,
      remainingByPrize: { ...before.remainingByPrize, new: 0 },
      issuedByPrize: { ...before.issuedByPrize, new: 0 },
    });
    expect(after).toMatchObject({ plays: 0, wins: 0, budgetUsedVnd: 0 });
    const rows = await prizeRows(c.id);
    expect(rows.find((p) => p.key === 'p1')).toMatchObject({
      quantity: 5,
      remaining: 5,
      issued: 0,
    });
    // The rehearsal-only prize got a row with no live stock.
    expect(rows.find((p) => p.key === 'new')).toMatchObject({
      quantity: 0,
      remaining: 0,
      issued: 0,
    });

    const awards = await awardRows(c.id);
    expect(awards).toHaveLength(1);
    expect(awards[0]?.env).toBe('rehearsal');
    const plays = await playRows(c.id);
    expect(plays.every((p) => p.env === 'rehearsal' && p.gameVersionId === null)).toBe(true);
    const testers = await db
      .select()
      .from(schema.players)
      .where(and(eq(schema.players.eventId, c.id), eq(schema.players.env, 'rehearsal')));
    expect(testers.map((p) => p.deviceId).sort()).toEqual(['tester-1', 'tester-2']);

    const lookup = await api.call(vouchersApi.lookup, {
      params: { orgId: aliceOrg, code: first.voucher?.code as string },
    });
    expect(lookup.rehearsal).toBe(true);

    // Publishing afterwards gives the new prize its live stock, untouched by rehearsal.
    await api.call(campaignsApi.publish, { params: ids(c) });
    const published = await prizeRows(c.id);
    expect(published.find((p) => p.key === 'new')).toMatchObject({
      quantity: 1,
      remaining: 1,
      issued: 0,
    });
    const live = await join(c.slug);
    expect(await play(live.api, c.slug)).toMatchObject({ outcome: 'win', prize: { id: 'new' } });
  });

  test('works on a never-published draft and ignores pause and schedule unless enforceSchedule is true', async () => {
    const c = await createCampaign(
      {
        rules: {
          mode: 'guaranteed',
          playsPerDay: 3,
          startsAt: new Date(Date.now() + 10 * DAY).toISOString(),
          endsAt: new Date(Date.now() + 20 * DAY).toISOString(),
        },
      },
      { publish: false },
    );
    const result = await t.client(alice).call(campaignsApi.rehearsalPlay, {
      params: ids(c),
      body: {
        testerKey: 'studio',
        requestId: crypto.randomUUID(),
        playerName: 'Chị Thảo',
      },
    });
    expect(result.outcome).toBe('win');
    const lookup = await t.client(alice).call(vouchersApi.lookup, {
      params: { orgId: aliceOrg, code: result.voucher?.code as string },
    });
    expect(lookup.playerName).toBe('Chị Thảo');

    const enforced = await t.client(alice).call(campaignsApi.rehearsalPlay, {
      params: ids(c),
      body: {
        testerKey: 'studio',
        requestId: crypto.randomUUID(),
        enforceSchedule: true,
      },
    });
    expect(enforced).toMatchObject({ outcome: 'closed', reason: 'closed' });
  });

  test('public draft rehearsal link caps at 20 testers and rotates cleanly without dirtying published state (BLD-23)', async () => {
    const c = await createCampaign({
      rules: { mode: 'guaranteed', playsPerDay: 3, maxWinsPerPlayer: 3 },
    });
    const api = t.client(alice);
    const link1 = await api.call(campaignsApi.rehearsalLink, { params: ids(c) });
    expect(link1.token).toHaveLength(24);
    expect(link1.testerCount).toBe(0);
    expect(link1.maxTesters).toBe(20);

    // Generating a share link does not dirty hasUnpublishedChanges.
    const fetched = await api.call(campaignsApi.get, { params: ids(c) });
    expect(fetched.hasUnpublishedChanges).toBe(false);

    const draft = await playerClient().call(playsApi.draftCampaign, {
      params: { token: link1.token },
    });
    expect(draft.id).toBe(c.id);
    expect(draft.testerCount).toBe(0);

    for (let i = 1; i <= 20; i++) {
      const res = await playerClient().call(playsApi.draftPlay, {
        params: { token: link1.token },
        body: {
          testerKey: `tester-${i}`,
          requestId: crypto.randomUUID(),
          playerName: `Tester ${i}`,
        },
      });
      expect(res.outcome).toBe('win');
    }

    // Existing tester #1 can still play their remaining turns.
    const existingAgain = await playerClient().call(playsApi.draftPlay, {
      params: { token: link1.token },
      body: { testerKey: 'tester-1', requestId: crypto.randomUUID() },
    });
    expect(existingAgain.outcome).toBe('win');

    // A 21st distinct tester is rejected with 403 DRAFT_TESTER_LIMIT_REACHED.
    await expectApiError(
      playerClient().call(playsApi.draftPlay, {
        params: { token: link1.token },
        body: { testerKey: 'tester-21', requestId: crypto.randomUUID() },
      }),
      403,
      ErrorCode.DRAFT_TESTER_LIMIT_REACHED,
    );

    // Rotating the link produces a new token with testerCount = 0.
    const rotated = await api.call(campaignsApi.rehearsalLink, {
      params: ids(c),
      body: { rotate: true },
    });
    expect(rotated.token).not.toBe(link1.token);
    expect(rotated.testerCount).toBe(0);

    await expectApiError(
      playerClient().call(playsApi.draftCampaign, { params: { token: link1.token } }),
      404,
      ErrorCode.NOT_FOUND,
    );
  });

  test('permission, cross-tenant 403/404, 400 and 401', async () => {
    const c = await createCampaign();
    const body = { testerKey: 'k', requestId: crypto.randomUUID() };
    await expectApiError(
      t.client(bob).call(campaignsApi.rehearsalPlay, { params: ids(c), body }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      t.client(bob).call(campaignsApi.rehearsalPlay, {
        params: { orgId: bobOrg, campaignId: c.id },
        body,
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      t.client().call(campaignsApi.rehearsalPlay, { params: ids(c), body }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
    await expectApiError(
      t.client(alice).call(campaignsApi.rehearsalPlay, {
        params: ids(c),
        body: { testerKey: '', requestId: 'x' },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
    expect(await playRows(c.id)).toHaveLength(0);
  });
});
