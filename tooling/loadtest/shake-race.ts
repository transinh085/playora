/**
 * Load test — N simulated players in one live tap/shake race (docs/05-architecture.md §13).
 *
 *   bun run loadtest:shake --n 5000 --duration 60
 *
 * Pass criteria: p95 broadcast latency < 150 ms, ≥ 99% connected, server event-loop lag < 50 ms.
 * One process tops out around a few thousand sockets; for 5k+ run several with distinct --prefix
 * (and raise `ulimit -n` on both client and server machines).
 */
import { parseArgs } from 'node:util';
import type { EventState, LiveHandshakeAuth } from '@playora/contracts';
import { hashScreenKey, signLiveToken } from '@playora/core/live';
import { createDb, schema } from '@playora/db';
import { eq } from 'drizzle-orm';
import { io, type Socket } from 'socket.io-client';
import { uuidv7 } from 'uuidv7';

const { events, eventScreens, games, gameVersions, organization, user } = schema;

const { values: args } = parseArgs({
  options: {
    url: {
      type: 'string',
      default: process.env.NEXT_PUBLIC_REALTIME_URL ?? 'http://localhost:4001',
    },
    event: { type: 'string' },
    game: { type: 'string' },
    'screen-key': { type: 'string' },
    org: { type: 'string', default: 'org_loadtest' },
    n: { type: 'string', default: '1000' },
    duration: { type: 'string', default: '30' },
    ramp: { type: 'string', default: '10' },
    prefix: { type: 'string', default: 'bot' },
    'no-host': { type: 'boolean', default: false },
  },
});

const N = Number(args.n);
const DURATION_S = Number(args.duration);
const RAMP_S = Number(args.ramp);
const TEAMS = ['Kinh doanh', 'Marketing', 'Kỹ thuật', 'Vận hành'];
const endpoint = `${args.url}/live`;
const secret = process.env.LIVE_TOKEN_SECRET ?? '';
if (!secret) {
  throw new Error('LIVE_TOKEN_SECRET is required to sign loadtest handshake tokens');
}

async function ensureLoadtestFixtures() {
  if (args.event && args.game && args['screen-key']) {
    return {
      organizationId: args.org,
      eventId: args.event,
      gameId: args.game,
      screenKey: args['screen-key'],
    };
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is required when --event/--game/--screen-key are not all passed');
  }

  const { db, sql } = createDb(dbUrl, { max: 1 });
  try {
    const orgId = args.org;
    const operatorId = 'usr_loadtest_operator';
    const now = new Date();

    await db
      .insert(organization)
      .values({ id: orgId, name: 'Loadtest Org', slug: 'loadtest-org', createdAt: now })
      .onConflictDoNothing();

    await db
      .insert(user)
      .values({
        id: operatorId,
        name: 'Loadtest Operator',
        email: 'loadtest@playora.local',
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    const slug = 'loadtest-shake';
    const [existingEvent] = await db.select().from(events).where(eq(events.slug, slug));
    const eventId = existingEvent?.id ?? uuidv7();
    const limit = Math.max(10_000, N + 500);

    if (existingEvent) {
      await db
        .update(events)
        .set({ status: 'live', playerLimit: limit })
        .where(eq(events.id, eventId));
    } else {
      await db.insert(events).values({
        id: eventId,
        organizationId: orgId,
        slug,
        name: 'Loadtest Shake Race',
        status: 'live',
        playerLimit: limit,
      });
    }

    const screenKey = args['screen-key'] ?? 'scr_loadtest_default_screen_key_012345';
    const keyHash = hashScreenKey(screenKey);
    await db
      .insert(eventScreens)
      .values({
        organizationId: orgId,
        eventId,
        name: 'Loadtest LED',
        screenKeyHash: keyHash,
      })
      .onConflictDoNothing();

    const gameId = args.game ?? uuidv7();
    const versionId = uuidv7();
    await db
      .insert(games)
      .values({
        id: gameId,
        organizationId: orgId,
        eventId,
        templateKey: 'tap-race',
        templateVersion: '1.0.0',
        name: 'Loadtest Tap Race',
        draftConfig: { durationSec: DURATION_S + 30 },
        status: 'published',
        currentVersionId: versionId,
      })
      .onConflictDoNothing();

    await db
      .insert(gameVersions)
      .values({
        id: versionId,
        organizationId: orgId,
        gameId,
        version: 1,
        templateKey: 'tap-race',
        templateVersion: '1.0.0',
        config: { durationSec: DURATION_S + 30 },
        configHash: 'loadtest',
        publishedBy: operatorId,
      })
      .onConflictDoNothing();

    return { organizationId: orgId, eventId, gameId, screenKey };
  } finally {
    await sql.end();
  }
}

const fixtures = await ensureLoadtestFixtures();

const latencies: number[] = [];
let connected = 0;
let failed = 0;
let disconnected = 0;
let closing = false;
let activeRoundId = fixtures.eventId;
const sockets: Socket[] = [];

function connect(role: 'player' | 'screen' | 'host', auth: LiveHandshakeAuth) {
  return io(endpoint, {
    query: { event: fixtures.eventId, role },
    auth,
    transports: ['websocket'],
    reconnection: true,
    timeout: 20_000,
  });
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return Number.NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] as number;
}

function onView(payload: { roundId?: string; view?: { serverTs?: number } }) {
  if (payload.roundId) activeRoundId = payload.roundId;
  const ts = payload.view?.serverTs;
  if (typeof ts === 'number') latencies.push(Date.now() - ts);
}

async function serverHealth() {
  try {
    const res = await fetch(`${args.url}/health`);
    return (await res.json()) as Record<string, number>;
  } catch {
    return undefined;
  }
}

const exp = Math.floor(Date.now() / 1000) + 3600;

// Screen client: measures what the LED would see.
const screen = connect('screen', { screenKey: fixtures.screenKey });
screen.on('round.view', onView);

console.log(`→ ramping ${N} players over ${RAMP_S}s to ${endpoint} (event "${fixtures.eventId}")`);
const perTick = Math.max(1, Math.ceil(N / (RAMP_S * 10)));
for (let i = 0; i < N; i += perTick) {
  for (let j = i; j < Math.min(N, i + perTick); j++) {
    const token = signLiveToken(
      {
        kind: 'player',
        organizationId: fixtures.organizationId,
        eventId: fixtures.eventId,
        sub: uuidv7(),
        displayName: `${args.prefix} ${j}`,
        team: TEAMS[j % TEAMS.length] ?? 'Chung',
        env: 'live',
        exp,
      },
      secret,
    );
    const s = connect('player', { token });
    s.on('connect', () => connected++);
    s.on('connect_error', () => failed++);
    s.on('disconnect', () => {
      if (!closing) disconnected++;
    });
    s.on('round.view', onView);
    sockets.push(s);
  }
  await Bun.sleep(100);
}
await Bun.sleep(2_000);
console.log(`✓ connected ${connected}/${N} (connect errors: ${failed})`);
if (connected === 0) {
  console.error('✗ 0 players connected — is the realtime server running at --url?');
  process.exit(1);
}

if (!args['no-host']) {
  const hostToken = signLiveToken(
    {
      kind: 'host',
      organizationId: fixtures.organizationId,
      eventId: fixtures.eventId,
      sub: 'usr_loadtest_operator',
      exp,
    },
    secret,
  );
  const host = connect('host', { token: hostToken });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout connecting host socket')), 10_000);
    host.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    host.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  const playingPromise = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for playing state')), 10_000);
    host.on('event.state', (state: EventState) => {
      if (state.round?.id) activeRoundId = state.round.id;
      if (state.round?.status === 'playing') {
        clearTimeout(timer);
        resolve(state.round.id);
      }
    });
  });

  await host.emitWithAck('host.command', { cmd: 'round.open', gameId: fixtures.gameId });
  const ack = await host.emitWithAck('host.command', { cmd: 'round.start' });
  console.log(`✓ round.start ack: ${JSON.stringify(ack)} (waiting 3s countdown...)`);
  activeRoundId = await playingPromise;
  console.log(`✓ round "${activeRoundId}" is now playing`);
}

// Every player shakes: one input per 250 ms, like the real client.
let seq = 0;
const shaking = setInterval(() => {
  seq++;
  for (const s of sockets) {
    if (s.connected) {
      s.emit('input', {
        roundId: activeRoundId,
        seq,
        data: { d: 1 + Math.floor(Math.random() * 6) },
      });
    }
  }
}, 250);

const startedAt = Date.now();
while (Date.now() - startedAt < DURATION_S * 1000) {
  await Bun.sleep(5_000);
  const window = latencies.splice(0).sort((a, b) => a - b);
  const health = await serverHealth();
  console.log(
    `[${Math.round((Date.now() - startedAt) / 1000)}s] online=${sockets.filter((s) => s.connected).length}` +
      ` views=${window.length} p50=${percentile(window, 50)}ms p95=${percentile(window, 95)}ms` +
      ` p99=${percentile(window, 99)}ms | server lag=${health?.eventLoopLagMs}ms rss=${health?.rssMb}MB` +
      ` inputs/5s=${health?.inputs}`,
  );
}

clearInterval(shaking);
closing = true;
for (const s of sockets) s.close();
screen.close();
console.log(`done — disconnects during run: ${disconnected}`);
process.exit(0);
