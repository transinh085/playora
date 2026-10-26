import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import { type Campaign, campaignsApi, ErrorCode } from '@playora/contracts';
import { localDayKey } from '@playora/core/prize';
import { type Database, schema } from '@playora/db';
import { eq } from 'drizzle-orm';
import { DB } from '../src/infra/tokens';
import { campaignBody, P1, P2, randomCode, setPlan } from './campaign-fixtures';
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
}

const DAY = 86_400_000;
const TZ = 'Asia/Ho_Chi_Minh';

type AwardState = 'redeemed' | 'issued' | 'expired' | 'void';
interface PlayFixture {
  player: 'A' | 'B' | 'C' | 'D' | 'R';
  channel: string | null;
  /** Days before now the play happened. */
  daysAgo: number;
  prize?: 'p1' | 'p2';
  award?: AwardState;
  /** Days before now the voucher was redeemed (defaults to the play day). */
  redeemedDaysAgo?: number;
}

/**
 * Known data across four local days and four channels. R is a rehearsal tester and must not count.
 *   A: redeems on two different days → the only returning visitor.
 *   B: redeems twice on the same day → visitor, not returning.
 *   C: one voucher outstanding, one expired → no visit.
 *   D: a voided win and a loss.
 */
const FIXTURE: PlayFixture[] = [
  { player: 'A', channel: 'table-qr', daysAgo: 3, prize: 'p1', award: 'redeemed' },
  {
    player: 'A',
    channel: 'table-qr',
    daysAgo: 1,
    prize: 'p1',
    award: 'redeemed',
    redeemedDaysAgo: 0,
  },
  { player: 'B', channel: 'fanpage', daysAgo: 2, prize: 'p2', award: 'redeemed' },
  { player: 'B', channel: 'fanpage', daysAgo: 2, prize: 'p1', award: 'redeemed' },
  { player: 'C', channel: null, daysAgo: 1, prize: 'p1', award: 'issued' },
  { player: 'C', channel: null, daysAgo: 0, prize: 'p2', award: 'expired' },
  { player: 'D', channel: 'table-qr', daysAgo: 0, prize: 'p1', award: 'void' },
  { player: 'D', channel: 'table-qr', daysAgo: 0 },
  { player: 'A', channel: 'zalo', daysAgo: 3 },
  { player: 'R', channel: null, daysAgo: 0, prize: 'p2', award: 'redeemed' },
];

async function seedReportData(c: Campaign, now: number) {
  const at = (daysAgo: number) => new Date(now - daysAgo * DAY - 60_000);
  const [game] = await db.select().from(schema.games).where(eq(schema.games.eventId, c.id));
  if (!game) throw new Error('game not found');
  const prizeRows = await db.select().from(schema.prizes).where(eq(schema.prizes.gameId, game.id));
  const prizeId = (key: string) => prizeRows.find((p) => p.key === key)?.id as string;

  const playerIds = new Map<string, string>();
  for (const name of ['A', 'B', 'C', 'D', 'R'] as const) {
    const [row] = await db
      .insert(schema.players)
      .values({
        organizationId: aliceOrg,
        eventId: c.id,
        env: name === 'R' ? 'rehearsal' : 'live',
        displayName: name,
        deviceId: crypto.randomUUID(),
      })
      .returning();
    playerIds.set(name, row?.id as string);
  }

  for (const f of FIXTURE) {
    const env = f.player === 'R' ? 'rehearsal' : 'live';
    const [play] = await db
      .insert(schema.plays)
      .values({
        organizationId: aliceOrg,
        eventId: c.id,
        gameId: game.id,
        gameVersionId: env === 'live' ? game.currentVersionId : null,
        playerId: playerIds.get(f.player) as string,
        env,
        requestId: crypto.randomUUID(),
        channelKey: f.channel,
        outcome: f.prize ? 'win' : 'lose',
        reason: f.prize ? 'win' : 'lose',
        prizeId: f.prize ? prizeId(f.prize) : null,
        createdAt: at(f.daysAgo),
      })
      .returning();
    if (!f.prize || !f.award) continue;
    await db.insert(schema.awards).values({
      organizationId: aliceOrg,
      eventId: c.id,
      prizeId: prizeId(f.prize),
      playerId: playerIds.get(f.player) as string,
      playId: play?.id as string,
      env,
      redeemCode: randomCode(),
      status: f.award === 'void' ? 'void' : 'issued',
      createdAt: at(f.daysAgo),
      expiresAt: f.award === 'expired' ? new Date(now - 1000) : new Date(now + 7 * DAY),
      redeemedAt: f.award === 'redeemed' ? at(f.redeemedDaysAgo ?? f.daysAgo) : null,
    });
  }
  // Live stock as the engine leaves it: every live win took one unit (the void one too).
  await db
    .update(schema.prizes)
    .set({ issued: 5, remaining: P1.quantity - 5 })
    .where(eq(schema.prizes.id, prizeId('p1')));
  await db
    .update(schema.prizes)
    .set({ issued: 2, remaining: P2.quantity - 2 })
    .where(eq(schema.prizes.id, prizeId('p2')));
  return at;
}

describe('campaign outcome report (PLB-03)', () => {
  test('the four main numbers, by day, by channel and by prize match the awards exactly', async () => {
    const now = Date.now();
    const startsAt = new Date(now - 3 * DAY - 2 * 3_600_000);
    const api = t.client(alice);
    const created = await api.call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody({
        playbook: 'second_visit',
        rules: {
          ...campaignBody().rules,
          startsAt: startsAt.toISOString(),
          budgetVnd: 2_000_000,
        },
      }),
    });
    const c = await api.call(campaignsApi.publish, {
      params: { orgId: aliceOrg, campaignId: created.id },
    });
    const at = await seedReportData(c, now);

    const report = await api.call(campaignsApi.report, {
      params: { orgId: aliceOrg, campaignId: c.id },
    });

    // Four main numbers (docs/product/specs/playbooks.md §3.2).
    expect(report.visits).toBe(4);
    expect(report.uniqueVisitors).toBe(2);
    expect(report.returningVisitors).toBe(1);
    expect(report.prizeCostVnd).toBe(3 * P1.valueVnd + P2.valueVnd);
    expect(report.costPerVisitVnd).toBe((3 * P1.valueVnd + P2.valueVnd) / 4);
    expect(report).toMatchObject({
      outstandingCostVnd: P1.valueVnd,
      budgetVnd: 2_000_000,
      plays: 9,
      players: 4,
      issued: 6,
      redemptionRate: 4 / 6,
      timezone: TZ,
    });

    // Every day from the start to today, zero days included.
    const expected = new Map<string, { plays: number; wins: number; visits: number }>();
    const bucket = (day: string) => {
      const b = expected.get(day) ?? { plays: 0, wins: 0, visits: 0 };
      expected.set(day, b);
      return b;
    };
    for (const f of FIXTURE.filter((f) => f.player !== 'R')) {
      const b = bucket(localDayKey(at(f.daysAgo), TZ));
      b.plays++;
      if (f.prize) b.wins++;
      if (f.award === 'redeemed')
        bucket(localDayKey(at(f.redeemedDaysAgo ?? f.daysAgo), TZ)).visits++;
    }
    expect(report.byDay[0]?.day).toBe(localDayKey(startsAt, TZ));
    expect(report.byDay.at(-1)?.day).toBe(localDayKey(new Date(), TZ));
    for (const [i, d] of report.byDay.entries()) {
      if (i > 0) {
        expect(Date.parse(d.day) - Date.parse(report.byDay[i - 1]?.day as string)).toBe(DAY);
      }
      expect(d).toEqual({
        day: d.day,
        ...(expected.get(d.day) ?? { plays: 0, wins: 0, visits: 0 }),
      });
    }
    expect(report.byDay.reduce((s, d) => s + d.plays, 0)).toBe(9);
    expect(report.byDay.reduce((s, d) => s + d.visits, 0)).toBe(4);

    const byChannel = Object.fromEntries(
      report.byChannel.map((ch) => [
        String(ch.channel),
        { plays: ch.plays, wins: ch.wins, visits: ch.visits },
      ]),
    );
    expect(byChannel).toEqual({
      'table-qr': { plays: 4, wins: 3, visits: 2 },
      fanpage: { plays: 2, wins: 2, visits: 2 },
      null: { plays: 2, wins: 2, visits: 0 },
      zalo: { plays: 1, wins: 0, visits: 0 },
    });
    expect(report.byChannel[0]?.channel).toBe('table-qr');

    expect(report.byPrize).toEqual([
      {
        prizeId: 'p1',
        name: P1.name,
        valueVnd: P1.valueVnd,
        quantity: P1.quantity,
        issued: 4,
        redeemed: 3,
        remaining: P1.quantity - 5,
      },
      {
        prizeId: 'p2',
        name: P2.name,
        valueVnd: P2.valueVnd,
        quantity: P2.quantity,
        issued: 2,
        redeemed: 1,
        remaining: P2.quantity - 2,
      },
    ]);

    // The playbook is stored on the draft and returned.
    expect(c.playbook).toBe('second_visit');
    expect(
      (await api.call(campaignsApi.get, { params: { orgId: aliceOrg, campaignId: c.id } }))
        .playbook,
    ).toBe('second_visit');
  });

  test('a draft has an empty report with its budget and a full day series', async () => {
    const api = t.client(alice);
    const c = await api.call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody(),
    });
    expect(c.playbook).toBeNull();
    const report = await api.call(campaignsApi.report, {
      params: { orgId: aliceOrg, campaignId: c.id },
    });
    expect(report).toMatchObject({
      visits: 0,
      uniqueVisitors: 0,
      returningVisitors: 0,
      prizeCostVnd: 0,
      outstandingCostVnd: 0,
      budgetVnd: null,
      costPerVisitVnd: null,
      plays: 0,
      players: 0,
      issued: 0,
      redemptionRate: null,
      byChannel: [],
      byPrize: [],
    });
    // Started yesterday: yesterday and today.
    expect(report.byDay).toHaveLength(2);
    expect(report.byDay.every((d) => d.plays === 0 && d.wins === 0 && d.visits === 0)).toBe(true);
  });

  test('the day series is capped at 120 days', async () => {
    const api = t.client(alice);
    const now = Date.now();
    const c = await api.call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody({
        rules: {
          ...campaignBody().rules,
          startsAt: new Date(now - 200 * DAY).toISOString(),
        },
      }),
    });
    const report = await api.call(campaignsApi.report, {
      params: { orgId: aliceOrg, campaignId: c.id },
    });
    expect(report.byDay).toHaveLength(120);
    expect(report.byDay.at(-1)?.day).toBe(localDayKey(new Date(), TZ));
  });

  test('older drafts without the P1 fields still read with defaults', async () => {
    const api = t.client(alice);
    const c = await api.call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody(),
    });
    const [game] = await db.select().from(schema.games).where(eq(schema.games.eventId, c.id));
    const oldDoc = structuredClone(game?.draftConfig) as {
      playbook?: unknown;
      rules: Record<string, unknown>;
    };
    delete oldDoc.playbook;
    for (const key of ['openDays', 'requireRedeemBeforeReplay', 'antiFraud']) {
      delete oldDoc.rules[key];
    }
    await db
      .update(schema.games)
      .set({ draftConfig: oldDoc })
      .where(eq(schema.games.eventId, c.id));
    const read = await api.call(campaignsApi.get, {
      params: { orgId: aliceOrg, campaignId: c.id },
    });
    expect(read.playbook).toBeNull();
    expect(read.rules).toMatchObject({
      openDays: null,
      requireRedeemBeforeReplay: false,
      antiFraud: 'standard',
    });
    // Publishing writes the defaults into the published version and mirrors them on the event.
    await api.call(campaignsApi.publish, { params: { orgId: aliceOrg, campaignId: c.id } });
    const [event] = await db.select().from(schema.events).where(eq(schema.events.id, c.id));
    expect(event?.antiFraud).toEqual({ level: 'standard' });
    expect(event?.schedule).toBeNull();
  });

  test('publish mirrors open days, opening hours and the anti-fraud level on the event', async () => {
    const api = t.client(alice);
    const c = await api.call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody({
        rules: {
          ...campaignBody().rules,
          openDays: [2, 3, 4],
          openingHours: { start: '14:00', end: '17:00' },
          antiFraud: 'low',
        },
      }),
    });
    await api.call(campaignsApi.publish, { params: { orgId: aliceOrg, campaignId: c.id } });
    const [event] = await db.select().from(schema.events).where(eq(schema.events.id, c.id));
    expect(event?.antiFraud).toEqual({ level: 'low' });
    expect(event?.schedule).toEqual([{ days: [2, 3, 4], start: '14:00', end: '17:00' }]);
  });

  test('auth: 401 anonymous, 403 other org, 404 cross-tenant id, 400 bad id', async () => {
    const c = await t.client(alice).call(campaignsApi.create, {
      params: { orgId: aliceOrg },
      body: campaignBody(),
    });
    await expectApiError(
      t.client().call(campaignsApi.report, { params: { orgId: aliceOrg, campaignId: c.id } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
    await expectApiError(
      t.client(bob).call(campaignsApi.report, { params: { orgId: aliceOrg, campaignId: c.id } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      t.client(bob).call(campaignsApi.report, { params: { orgId: bobOrg, campaignId: c.id } }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      t
        .client(alice)
        .call(campaignsApi.report, { params: { orgId: aliceOrg, campaignId: 'not-a-uuid' } }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
  });
});
