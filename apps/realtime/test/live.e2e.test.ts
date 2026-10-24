import 'reflect-metadata';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { NestFactory } from '@nestjs/core';
import {
  type CommandAck,
  ErrorCode,
  type EventState,
  type LiveConnectError,
  type LiveSnapshot,
  type RoundResultPayload,
  type RoundView,
} from '@playora/contracts';
import { hashScreenKey, signLiveToken } from '@playora/core/live';
import { createDb, schema } from '@playora/db';
import { prepareTestDatabase } from '@playora/db/testing';
import { parseEnv, realtimeEnvSchema } from '@playora/env';
import type { TapRacePlayerView, TapRaceScreenView } from '@playora/game-sdk/examples/tap-race';
import { connectLive, type LiveSocket } from '@playora/realtime-client';
import { eq } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { io, type Socket } from 'socket.io-client';
import { uuidv7 } from 'uuidv7';
import { AuditService } from '../../api/src/common/audit/audit.service';
import { ScreensRepository } from '../../api/src/modules/screens/screens.repository';
import { ScreensService } from '../../api/src/modules/screens/screens.service';
import { ConfiguredIoAdapter } from '../src/adapter';
import { AppModule } from '../src/app.module';
import { ownerKey, snapKey } from '../src/live/live.gateway';
import { LiveRepository, SCORE_INSERT_CHUNK_SIZE } from '../src/live/live.repository';

const {
  events,
  eventScreens,
  games,
  gameVersions,
  liveRounds,
  organization,
  players,
  roundScores,
  user,
} = schema;

const TEST_SECRET = process.env.LIVE_TOKEN_SECRET ?? 'dev-only-live-token-secret-0123456789abcdef';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:63799';

let databaseUrl: string;
let dbClient: ReturnType<typeof createDb>;
let redis: Redis;
let orgId: string;
let operatorId: string;

const activeSockets: Array<Socket | LiveSocket> = [];

function trackSocket<T extends Socket | LiveSocket>(s: T): T {
  activeSockets.push(s);
  return s;
}

async function bootRealtimeApp(nodeId = uuidv7()) {
  const env = parseEnv(realtimeEnvSchema, {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl,
    REDIS_URL,
    LIVE_TOKEN_SECRET: TEST_SECRET,
  });

  const app = await NestFactory.create(AppModule.forRoot(env, { nodeId }), {
    logger: false,
    abortOnError: false,
  });
  const origins = env.REALTIME_CORS_ORIGINS.split(',');
  app.useWebSocketAdapter(new ConfiguredIoAdapter(app, origins));
  app.enableShutdownHooks();
  await app.listen(0);
  const url = (await app.getUrl()).replace('[::1]', 'localhost');

  return {
    app,
    url,
    nodeId,
    close: () => app.close(),
  };
}

type RealtimeTestApp = Awaited<ReturnType<typeof bootRealtimeApp>>;

function uniqueSlug(prefix = 'rt') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function createSeededEvent(
  opts: { status?: 'draft' | 'live' | 'ended'; playerLimit?: number; org?: string } = {},
) {
  const eventId = uuidv7();
  const targetOrg = opts.org ?? orgId;
  await dbClient.db.insert(events).values({
    id: eventId,
    organizationId: targetOrg,
    slug: uniqueSlug('evt'),
    name: 'Realtime Test Event',
    status: opts.status ?? 'live',
    playerLimit: opts.playerLimit ?? 100,
  });

  const screenKey = `scr_${uuidv7().replace(/-/g, '')}`;
  const [screenRow] = await dbClient.db
    .insert(eventScreens)
    .values({
      organizationId: targetOrg,
      eventId,
      name: 'Main LED',
      screenKeyHash: hashScreenKey(screenKey),
    })
    .returning();

  const gameId = uuidv7();
  const versionId = uuidv7();

  await dbClient.db.insert(games).values({
    id: gameId,
    organizationId: targetOrg,
    eventId,
    templateKey: 'tap-race',
    templateVersion: '1.0.0',
    name: 'Tap Race Live',
    draftConfig: { durationSec: 30 },
    hotConfig: { 'copy.title': { vi: 'Đua Nước Rút', en: 'Sprint Race' } },
    status: 'published',
    currentVersionId: versionId,
  });

  await dbClient.db.insert(gameVersions).values({
    id: versionId,
    organizationId: targetOrg,
    gameId,
    version: 1,
    templateKey: 'tap-race',
    templateVersion: '1.0.0',
    config: { durationSec: 30, minInputIntervalMs: 50 },
    configHash: 'hash_v1',
    publishedBy: operatorId,
  });

  const draftGameId = uuidv7();
  await dbClient.db.insert(games).values({
    id: draftGameId,
    organizationId: targetOrg,
    eventId,
    templateKey: 'tap-race',
    templateVersion: '1.0.0',
    name: 'Draft Game',
    draftConfig: { durationSec: 30 },
    status: 'draft',
    currentVersionId: null,
  });

  if (!screenRow) throw new Error('Expected screenRow');
  return {
    eventId,
    screenId: screenRow.id,
    screenKey,
    gameId,
    versionId,
    draftGameId,
  };
}

function makePlayerToken(params: {
  eventId: string;
  playerId?: string;
  displayName?: string;
  team?: string | null;
  env?: 'live' | 'rehearsal';
  expOffsetSec?: number;
  org?: string;
  secret?: string;
}) {
  const playerId = params.playerId ?? uuidv7();
  return {
    playerId,
    token: signLiveToken(
      {
        kind: 'player',
        organizationId: params.org ?? orgId,
        eventId: params.eventId,
        sub: playerId,
        displayName: params.displayName ?? 'Player',
        team: params.team ?? 'Red',
        env: params.env ?? 'live',
        exp: Math.floor(Date.now() / 1000) + (params.expOffsetSec ?? 3600),
      },
      params.secret ?? TEST_SECRET,
    ),
  };
}

function makeHostToken(params: {
  eventId: string;
  expOffsetSec?: number;
  org?: string;
  secret?: string;
}) {
  return signLiveToken(
    {
      kind: 'host',
      organizationId: params.org ?? orgId,
      eventId: params.eventId,
      sub: operatorId,
      exp: Math.floor(Date.now() / 1000) + (params.expOffsetSec ?? 300),
    },
    params.secret ?? TEST_SECRET,
  );
}

function waitForConnect(socket: Socket | LiveSocket, timeoutMs = 4_000): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for connect')), timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function waitForConnectError(
  socket: Socket | LiveSocket,
  timeoutMs = 4_000,
): Promise<LiveConnectError | string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timeout waiting for connect_error')),
      timeoutMs,
    );
    socket.once('connect', () => {
      clearTimeout(timer);
      reject(new Error('Expected connect_error, but socket connected'));
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      resolve(err.message);
    });
  });
}

function waitForEvent<T>(
  socket: Socket | LiveSocket,
  eventName: string,
  predicate: (payload: T) => boolean = () => true,
  timeoutMs = 6_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName as never, handler as never);
      reject(new Error(`Timeout waiting for event "${eventName}"`));
    }, timeoutMs);
    const handler = (payload: T) => {
      if (predicate(payload)) {
        clearTimeout(timer);
        socket.off(eventName as never, handler as never);
        resolve(payload);
      }
    };
    socket.on(eventName as never, handler as never);
  });
}

let rt: RealtimeTestApp;

beforeAll(async () => {
  databaseUrl = await prepareTestDatabase(process.env.DATABASE_URL ?? '');
  dbClient = createDb(databaseUrl, { max: 4 });
  redis = new Redis(REDIS_URL);

  orgId = `org_rt_${uuidv7()}`;
  operatorId = `usr_rt_${uuidv7()}`;
  const now = new Date();

  await dbClient.db.insert(organization).values({
    id: orgId,
    name: 'Realtime Test Org',
    slug: uniqueSlug('org'),
    createdAt: now,
  });

  await dbClient.db.insert(user).values({
    id: operatorId,
    name: 'Realtime Operator',
    email: `${uniqueSlug('op')}@test.playora.local`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  rt = await bootRealtimeApp('primary-node');
});

afterEach(() => {
  while (activeSockets.length > 0) {
    const s = activeSockets.pop();
    s?.close();
  }
});

afterAll(async () => {
  await rt?.close();
  await Promise.allSettled([dbClient?.sql.end({ timeout: 5 }), redis?.quit()]);
});

describe('apps/realtime M1 integration (handshake, rooms, RoundRunner, Redis snapshot, ownership lock)', () => {
  test('handshake accepts valid player/host/screen and refuses invalid auth, wrong event, revoked screen, non-live event, and playerLimit', async () => {
    const { eventId, screenId, screenKey } = await createSeededEvent({
      status: 'live',
      playerLimit: 2,
    });
    const otherEvent = await createSeededEvent({ status: 'live' });
    const draftEvent = await createSeededEvent({ status: 'draft' });

    // 1. Missing/invalid query -> BAD_REQUEST
    const badQuery = trackSocket(
      io(`${rt.url}/live`, {
        query: { event: 'not-a-uuid', role: 'player' },
        auth: { token: 'abc' },
        transports: ['websocket'],
        reconnection: false,
      }),
    );
    expect(await waitForConnectError(badQuery)).toBe('BAD_REQUEST');

    // 2. Bad token signature / expired token -> UNAUTHORIZED
    const badSecretPlayer = makePlayerToken({
      eventId,
      secret: 'wrong-secret-0123456789abcdef012345',
    });
    const sBadToken = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'player',
        auth: { token: badSecretPlayer.token },
      }),
    );
    expect(await waitForConnectError(sBadToken)).toBe('UNAUTHORIZED');

    const expiredPlayer = makePlayerToken({ eventId, expOffsetSec: -10 });
    const sExpired = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'player',
        auth: { token: expiredPlayer.token },
      }),
    );
    expect(await waitForConnectError(sExpired)).toBe('UNAUTHORIZED');

    // 3. Token eventId mismatch -> UNAUTHORIZED
    const wrongEventToken = makePlayerToken({ eventId: otherEvent.eventId });
    const sWrongEvent = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'player',
        auth: { token: wrongEventToken.token },
      }),
    );
    expect(await waitForConnectError(sWrongEvent)).toBe('UNAUTHORIZED');

    // 4. Role mismatch (player token used for host role, host token used for player role) -> UNAUTHORIZED
    const validPlayer1 = makePlayerToken({ eventId, displayName: 'Player 1', team: 'Alpha' });
    const sPlayerAsHost = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'host',
        auth: { token: validPlayer1.token },
      }),
    );
    expect(await waitForConnectError(sPlayerAsHost)).toBe('UNAUTHORIZED');

    const hostToken = makeHostToken({ eventId });
    const sHostAsPlayer = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'player',
        auth: { token: hostToken },
      }),
    );
    expect(await waitForConnectError(sHostAsPlayer)).toBe('UNAUTHORIZED');

    // 5. Screen key: wrong key, wrong event, and revoked screen -> UNAUTHORIZED
    const sWrongScreen = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'screen',
        auth: { screenKey: 'scr_invalid_key_that_does_not_exist' },
      }),
    );
    expect(await waitForConnectError(sWrongScreen)).toBe('UNAUTHORIZED');

    const sCrossEventScreen = trackSocket(
      connectLive({
        url: rt.url,
        eventId: otherEvent.eventId,
        role: 'screen',
        auth: { screenKey },
      }),
    );
    expect(await waitForConnectError(sCrossEventScreen)).toBe('UNAUTHORIZED');

    // Valid screen connects before revocation
    const sValidScreen = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'screen',
        auth: { screenKey },
      }),
    );
    await waitForConnect(sValidScreen);
    sValidScreen.close();

    // Revoke the screen key -> refused with UNAUTHORIZED
    await dbClient.db
      .update(eventScreens)
      .set({ revokedAt: new Date() })
      .where(eq(eventScreens.id, screenId));

    const sRevokedScreen = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'screen',
        auth: { screenKey },
      }),
    );
    expect(await waitForConnectError(sRevokedScreen)).toBe('UNAUTHORIZED');

    // 6. Non-live event refuses live player/host/screen with EVENT_NOT_LIVE, but accepts rehearsal claim
    const draftLivePlayer = makePlayerToken({ eventId: draftEvent.eventId, env: 'live' });
    const sDraftLive = trackSocket(
      connectLive({
        url: rt.url,
        eventId: draftEvent.eventId,
        role: 'player',
        auth: { token: draftLivePlayer.token },
      }),
    );
    expect(await waitForConnectError(sDraftLive)).toBe('EVENT_NOT_LIVE');

    const draftRehearsalPlayer = makePlayerToken({ eventId: draftEvent.eventId, env: 'rehearsal' });
    const sDraftRehearsal = trackSocket(
      connectLive({
        url: rt.url,
        eventId: draftEvent.eventId,
        role: 'player',
        auth: { token: draftRehearsalPlayer.token },
      }),
    );
    await waitForConnect(sDraftRehearsal);
    sDraftRehearsal.close();

    // 7. playerLimit = 2 and multi-tab per-player connection tracking
    const sP1Tab1 = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'player',
        auth: { token: validPlayer1.token },
      }),
    );
    await waitForConnect(sP1Tab1);

    // Second tab for Player 1 counts as the same player -> allowed and onlineCount remains 1
    const sP1Tab2 = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'player',
        auth: { token: validPlayer1.token },
      }),
    );
    await waitForConnect(sP1Tab2);

    const validPlayer2 = makePlayerToken({ eventId, displayName: 'Player 2', team: 'Beta' });
    const sP2 = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'player',
        auth: { token: validPlayer2.token },
      }),
    );
    await waitForConnect(sP2);

    // Player 3 exceeds playerLimit (2) -> refused with PLAYER_LIMIT_REACHED
    const validPlayer3 = makePlayerToken({ eventId, displayName: 'Player 3', team: 'Alpha' });
    const sP3Blocked = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'player',
        auth: { token: validPlayer3.token },
      }),
    );
    expect(await waitForConnectError(sP3Blocked)).toBe('PLAYER_LIMIT_REACHED');

    // Closing only Tab 1 of Player 1 keeps Player 1 online; Player 3 is still blocked
    sP1Tab1.close();
    await Bun.sleep(50);
    const sP3StillBlocked = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'player',
        auth: { token: validPlayer3.token },
      }),
    );
    expect(await waitForConnectError(sP3StillBlocked)).toBe('PLAYER_LIMIT_REACHED');

    // Closing Tab 2 of Player 1 frees a slot; Player 3 can now connect
    sP1Tab2.close();
    await Bun.sleep(50);
    const sP3Allowed = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'player',
        auth: { token: validPlayer3.token },
      }),
    );
    await waitForConnect(sP3Allowed);
  });

  test('full round lifecycle: open -> countdown -> playing -> pause/resume -> input -> end -> result -> next with round_scores written', async () => {
    const { eventId, screenKey, gameId, draftGameId } = await createSeededEvent({ status: 'live' });

    const hostToken = makeHostToken({ eventId });
    const p1 = makePlayerToken({ eventId, displayName: 'Lan', team: 'Kinh doanh' });
    const p2 = makePlayerToken({ eventId, displayName: 'Minh', team: 'Kỹ thuật' });

    // Seed real player rows (players only come from POST /p/:slug/join; realtime never creates them)
    await dbClient.db.insert(players).values([
      {
        id: p1.playerId,
        organizationId: orgId,
        eventId,
        env: 'live',
        displayName: 'Lan',
        team: 'Kinh doanh',
      },
      {
        id: p2.playerId,
        organizationId: orgId,
        eventId,
        env: 'live',
        displayName: 'Minh',
        team: 'Kỹ thuật',
      },
    ]);

    const host = trackSocket(
      connectLive({ url: rt.url, eventId, role: 'host', auth: { token: hostToken } }),
    );
    const screen = trackSocket(
      connectLive({ url: rt.url, eventId, role: 'screen', auth: { screenKey } }),
    );
    const player1 = trackSocket(
      connectLive({ url: rt.url, eventId, role: 'player', auth: { token: p1.token } }),
    );
    const player2 = trackSocket(
      connectLive({ url: rt.url, eventId, role: 'player', auth: { token: p2.token } }),
    );

    await Promise.all([
      waitForConnect(host),
      waitForConnect(screen),
      waitForConnect(player1),
      waitForConnect(player2),
    ]);

    // Check health endpoint reports active room and sockets per role
    const healthRes = await fetch(`${rt.url}/health`);
    const health = (await healthRes.json()) as {
      status: string;
      rooms: number;
      socketsByRole: { player: number; screen: number; host: number };
    };
    expect(health.status).toBe('ok');
    expect(health.rooms).toBeGreaterThanOrEqual(1);
    expect(health.socketsByRole.player).toBe(2);
    expect(health.socketsByRole.screen).toBe(1);
    expect(health.socketsByRole.host).toBe(1);

    // Non-host cannot execute host.command
    const forbiddenAck: CommandAck = await player1.emitWithAck('host.command', {
      cmd: 'round.start',
    });
    expect(forbiddenAck).toEqual({ ok: false, error: ErrorCode.FORBIDDEN });

    // Illegal transition from idle (round.start before round.open) -> CONFLICT
    const illegalIdleAck: CommandAck = await host.emitWithAck('host.command', {
      cmd: 'round.start',
    });
    expect(illegalIdleAck).toEqual({ ok: false, error: ErrorCode.CONFLICT });

    // Opening an unpublished (draft) game -> 409-style CONFLICT ack error
    const draftAck: CommandAck = await host.emitWithAck('host.command', {
      cmd: 'round.open',
      gameId: draftGameId,
    });
    expect(draftAck).toEqual({ ok: false, error: ErrorCode.CONFLICT });

    // Open published game -> transitions to lobby
    const lobbyStatePromise = waitForEvent<EventState>(
      screen,
      'event.state',
      (s) => s.round?.status === 'lobby',
    );
    const openAck: CommandAck = await host.emitWithAck('host.command', {
      cmd: 'round.open',
      gameId,
    });
    expect(openAck).toEqual({ ok: true });
    const lobbyState = await lobbyStatePromise;
    expect(lobbyState.activeGameId).toBe(gameId);
    expect(lobbyState.onlineCount).toBe(2);
    if (!lobbyState.round) throw new Error('Expected round in lobbyState');
    const roundId = lobbyState.round.id;

    // Verify live_rounds row created with status 'lobby'
    const [dbRoundLobby] = await dbClient.db
      .select()
      .from(liveRounds)
      .where(eq(liveRounds.id, roundId));
    expect(dbRoundLobby?.status).toBe('lobby');

    // Illegal transition in lobby (round.pause) -> CONFLICT
    const illegalLobbyAck: CommandAck = await host.emitWithAck('host.command', {
      cmd: 'round.pause',
    });
    expect(illegalLobbyAck).toEqual({ ok: false, error: ErrorCode.CONFLICT });

    // Start round -> 3s countdown -> playing
    const countdownStatePromise = waitForEvent<EventState>(
      screen,
      'event.state',
      (s) => s.round?.status === 'countdown',
    );
    const playingStatePromise = waitForEvent<EventState>(
      screen,
      'event.state',
      (s) => s.round?.status === 'playing',
      6_000,
    );

    const startAck: CommandAck = await host.emitWithAck('host.command', { cmd: 'round.start' });
    expect(startAck).toEqual({ ok: true });

    const countdownState = await countdownStatePromise;
    expect(countdownState.round?.endsAt).toBeDefined();

    // Wait for 3s countdown to elapse into 'playing'
    const playingState = await playingStatePromise;
    expect(playingState.round?.status).toBe('playing');

    const [dbRoundPlaying] = await dbClient.db
      .select()
      .from(liveRounds)
      .where(eq(liveRounds.id, roundId));
    expect(dbRoundPlaying?.status).toBe('playing');
    expect(dbRoundPlaying?.startedAt).toBeInstanceOf(Date);

    // Players send inputs
    player1.emit('input', { roundId, seq: 1, data: { d: 7 } });
    player2.emit('input', { roundId, seq: 1, data: { d: 4 } });

    // Wait for screen and host views and player1 view
    const screenViewMsg = await waitForEvent<RoundView<TapRaceScreenView>>(
      screen,
      'round.view',
      (v) => v.roundId === roundId && (v.view as TapRaceScreenView).top.some((r) => r.score === 7),
    );
    expect(screenViewMsg.seq).toBeGreaterThan(0);
    expect(screenViewMsg.view.top[0]).toMatchObject({
      id: p1.playerId,
      name: 'Lan',
      team: 'Kinh doanh',
      score: 7,
    });

    const hostViewMsg = await waitForEvent<
      RoundView<TapRaceScreenView & { counters: { player: number; screen: number; host: number } }>
    >(host, 'round.view', (v) => v.roundId === roundId);
    expect(hostViewMsg.view.counters).toEqual({ player: 2, screen: 1, host: 1 });

    const p1ViewMsg = await waitForEvent<RoundView<TapRacePlayerView>>(
      player1,
      'round.view',
      (v) => v.roundId === roundId && (v.view as TapRacePlayerView).score === 7,
    );
    expect(p1ViewMsg.view.rank).toBe(1);

    // Pause the round: inputs while paused must be dropped
    const pauseAck: CommandAck = await host.emitWithAck('host.command', { cmd: 'round.pause' });
    expect(pauseAck).toEqual({ ok: true });

    await Bun.sleep(100);
    player1.emit('input', { roundId, seq: 2, data: { d: 8 } });
    await Bun.sleep(150);

    const resumeSnapDuringPause: { snapshot: LiveSnapshot<TapRacePlayerView> } =
      await player1.emitWithAck('session.resume', { lastSeq: 0 });
    expect(resumeSnapDuringPause.snapshot.view?.view.score).toBe(7);

    // Resume the round via round.pause toggle
    const resumeAck: CommandAck = await host.emitWithAck('host.command', { cmd: 'round.pause' });
    expect(resumeAck).toEqual({ ok: true });

    player1.emit('input', { roundId, seq: 3, data: { d: 5 } });
    await waitForEvent<RoundView<TapRacePlayerView>>(
      player1,
      'round.view',
      (v) => (v.view as TapRacePlayerView).score === 12,
    );

    // Disconnect Player 2 during playing: score (4) must be preserved in final result
    player2.close();
    await Bun.sleep(100);

    // End round -> result
    const screenResultPromise = waitForEvent<RoundResultPayload>(screen, 'round.result');
    const p1ResultPromise = waitForEvent<RoundResultPayload>(player1, 'round.result');

    const endAck: CommandAck = await host.emitWithAck('host.command', { cmd: 'round.end' });
    expect(endAck).toEqual({ ok: true });

    const [screenResult, p1Result] = await Promise.all([screenResultPromise, p1ResultPromise]);
    expect(screenResult.roundId).toBe(roundId);
    expect(screenResult.you).toBeUndefined();
    expect(screenResult.ranking).toEqual([
      { playerId: p1.playerId, displayName: 'Lan', score: 12, team: 'Kinh doanh' },
      { playerId: p2.playerId, displayName: 'Minh', score: 4, team: 'Kỹ thuật' },
    ]);
    expect(p1Result.you).toEqual({ rank: 1, score: 12 });

    // Verify round_scores and live_rounds.result written in Postgres
    const scores = await dbClient.db
      .select()
      .from(roundScores)
      .where(eq(roundScores.roundId, roundId));
    expect(scores).toHaveLength(2);
    const p1ScoreRow = scores.find((s) => s.playerId === p1.playerId);
    const p2ScoreRow = scores.find((s) => s.playerId === p2.playerId);
    expect(p1ScoreRow).toMatchObject({
      organizationId: orgId,
      score: 12,
      rank: 1,
      team: 'Kinh doanh',
    });
    expect(p2ScoreRow).toMatchObject({
      organizationId: orgId,
      score: 4,
      rank: 2,
      team: 'Kỹ thuật',
    });

    const [dbRoundResult] = await dbClient.db
      .select()
      .from(liveRounds)
      .where(eq(liveRounds.id, roundId));
    expect(dbRoundResult?.status).toBe('result');
    expect(dbRoundResult?.endedAt).toBeInstanceOf(Date);
    expect(dbRoundResult?.result).toMatchObject({
      roundId,
      ranking: [
        { playerId: p1.playerId, displayName: 'Lan', score: 12, team: 'Kinh doanh' },
        { playerId: p2.playerId, displayName: 'Minh', score: 4, team: 'Kỹ thuật' },
      ],
    });

    // Advance to closed via round.next
    const closedAck: CommandAck = await host.emitWithAck('host.command', { cmd: 'round.next' });
    expect(closedAck).toEqual({ ok: true });
    const [dbRoundClosed] = await dbClient.db
      .select()
      .from(liveRounds)
      .where(eq(liveRounds.id, roundId));
    expect(dbRoundClosed?.status).toBe('closed');
  });

  test('session.resume returns role-projected snapshot with current seq, and clock.ping echoes t0 with server ts', async () => {
    const { eventId, screenKey, gameId } = await createSeededEvent({ status: 'live' });
    const hostToken = makeHostToken({ eventId });
    const p1 = makePlayerToken({ eventId, displayName: 'Hải', team: 'Sales' });

    const host = trackSocket(
      connectLive({ url: rt.url, eventId, role: 'host', auth: { token: hostToken } }),
    );
    const player = trackSocket(
      connectLive({ url: rt.url, eventId, role: 'player', auth: { token: p1.token } }),
    );
    await Promise.all([waitForConnect(host), waitForConnect(player)]);

    // clock.ping
    const pingRes = await player.emitWithAck('clock.ping', { t0: 123456 });
    expect(pingRes.t0).toBe(123456);
    expect(typeof pingRes.ts).toBe('number');

    // Open round and wait for a broadcast tick so seq advances
    await host.emitWithAck('host.command', { cmd: 'round.open', gameId });
    await waitForEvent<RoundView>(host, 'round.view', (v) => v.seq >= 2);

    const playerResume = await player.emitWithAck('session.resume', { lastSeq: 1 });
    expect(playerResume.snapshot.state.eventId).toBe(eventId);
    expect(playerResume.snapshot.state.round?.status).toBe('lobby');
    expect(playerResume.snapshot.view?.seq).toBeGreaterThanOrEqual(2);
    expect(playerResume.snapshot.view?.view).toMatchObject({
      status: 'lobby',
      score: 0,
      rank: 1,
    });

    // Late-joining screen receives snapshot automatically via connectLive's session.resume
    let receivedSnapshot: LiveSnapshot | undefined;
    const screen = trackSocket(
      connectLive({
        url: rt.url,
        eventId,
        role: 'screen',
        auth: { screenKey },
        onSnapshot: (snap) => {
          receivedSnapshot = snap;
        },
      }),
    );
    await waitForConnect(screen);
    await Bun.sleep(80);
    expect(receivedSnapshot).toBeDefined();
    expect(receivedSnapshot?.state.eventId).toBe(eventId);
    expect(receivedSnapshot?.view?.seq).toBeGreaterThanOrEqual(2);
  });

  test('snapshot restore after a simulated restart (new app instance, same Redis) continues the round', async () => {
    const { eventId, gameId } = await createSeededEvent({ status: 'live' });
    const hostToken = makeHostToken({ eventId });
    const p1 = makePlayerToken({ eventId, displayName: 'Khôi', team: 'TeamA' });

    await dbClient.db.insert(players).values({
      id: p1.playerId,
      organizationId: orgId,
      eventId,
      env: 'live',
      displayName: 'Khôi',
      team: 'TeamA',
    });

    // Boot isolated node 1
    const app1 = await bootRealtimeApp('restart-node-1');
    try {
      const host1 = trackSocket(
        connectLive({ url: app1.url, eventId, role: 'host', auth: { token: hostToken } }),
      );
      const player1 = trackSocket(
        connectLive({ url: app1.url, eventId, role: 'player', auth: { token: p1.token } }),
      );
      await Promise.all([waitForConnect(host1), waitForConnect(player1)]);

      const openAck = await host1.emitWithAck('host.command', { cmd: 'round.open', gameId });
      expect(openAck).toEqual({ ok: true });

      const playingPromise = waitForEvent<EventState>(
        host1,
        'event.state',
        (s) => s.round?.status === 'playing',
        6_000,
      );
      await host1.emitWithAck('host.command', { cmd: 'round.start' });
      const playingState = await playingPromise;
      if (!playingState.round) throw new Error('Expected round in playingState');
      const roundId = playingState.round.id;

      // Player submits input (score = 6)
      player1.emit('input', { roundId, seq: 1, data: { d: 6 } });
      const viewBeforeRestart = await waitForEvent<RoundView<TapRacePlayerView>>(
        player1,
        'round.view',
        (v) => (v.view as TapRacePlayerView).score === 6,
      );
      const seqBeforeRestart = viewBeforeRestart.seq;

      host1.close();
      player1.close();

      // Simulate restart: shut down app1 (flushes snapshot to Redis & releases lock)
      await app1.close();

      const snapRaw = await redis.get(snapKey(eventId));
      expect(snapRaw).not.toBeNull();

      // Boot new app instance (app2) against the same Redis & Postgres
      const app2 = await bootRealtimeApp('restart-node-2');
      try {
        const host2 = trackSocket(
          connectLive({ url: app2.url, eventId, role: 'host', auth: { token: hostToken } }),
        );
        const player2 = trackSocket(
          connectLive({ url: app2.url, eventId, role: 'player', auth: { token: p1.token } }),
        );
        await Promise.all([waitForConnect(host2), waitForConnect(player2)]);

        // Resume on app2: round is still playing with score 6 and seq >= seqBeforeRestart
        const resumed = await player2.emitWithAck('session.resume', {
          lastSeq: seqBeforeRestart,
        });
        expect(resumed.snapshot.state.round?.id).toBe(roundId);
        expect(resumed.snapshot.state.round?.status).toBe('playing');
        const resumedPlayerView = resumed.snapshot.view?.view as TapRacePlayerView | undefined;
        expect(resumedPlayerView?.score).toBe(6);
        expect(resumed.snapshot.view?.seq).toBeGreaterThanOrEqual(seqBeforeRestart);

        // Continue playing on app2: add +5 -> total score 11
        await Bun.sleep(100);
        player2.emit('input', { roundId, seq: 2, data: { d: 5 } });
        await waitForEvent<RoundView<TapRacePlayerView>>(
          player2,
          'round.view',
          (v) => (v.view as TapRacePlayerView).score === 11,
        );

        // Finish the round on app2 and verify Postgres has combined score 11
        const resultPromise = waitForEvent<RoundResultPayload>(player2, 'round.result');
        const endAck = await host2.emitWithAck('host.command', { cmd: 'round.end' });
        expect(endAck).toEqual({ ok: true });

        const finalResult = await resultPromise;
        expect(finalResult.you).toEqual({ rank: 1, score: 11 });

        const scores = await dbClient.db
          .select()
          .from(roundScores)
          .where(eq(roundScores.roundId, roundId));
        expect(scores).toHaveLength(1);
        expect(scores[0]?.score).toBe(11);
      } finally {
        await app2.close();
      }
    } finally {
      await app1.close().catch(() => {});
    }
  });

  test('ownership lock prevents a second node instance from taking a room it does not own', async () => {
    const { eventId } = await createSeededEvent({ status: 'live' });
    const hostToken = makeHostToken({ eventId });

    const node1 = await bootRealtimeApp('owner-node-1');
    const node2 = await bootRealtimeApp('intruder-node-2');

    try {
      // Host connects to node1 -> node1 acquires `room:{eventId}:owner`
      const hostOnNode1 = trackSocket(
        connectLive({ url: node1.url, eventId, role: 'host', auth: { token: hostToken } }),
      );
      await waitForConnect(hostOnNode1);

      expect(await redis.get(ownerKey(eventId))).toBe('owner-node-1');

      // Another client attempts to connect to node2 for the same eventId while node1 holds the lock
      const clientOnNode2 = trackSocket(
        connectLive({ url: node2.url, eventId, role: 'host', auth: { token: hostToken } }),
      );
      const errOnNode2 = await waitForConnectError(clientOnNode2);
      expect(errOnNode2).toBe('UNAUTHORIZED');

      // Lock in Redis is still owned by node1
      expect(await redis.get(ownerKey(eventId))).toBe('owner-node-1');
    } finally {
      await Promise.allSettled([node1.close(), node2.close()]);
    }
  });

  test('finalizeLiveRound skips unseeded players without creating player rows and inserts round_scores in chunks', async () => {
    const { eventId, gameId, versionId } = await createSeededEvent({ status: 'live' });
    const repo = rt.app.get(LiveRepository);

    // Seed 1,050 real players (> SCORE_INSERT_CHUNK_SIZE = 1,000) to exercise multi-chunk lookup & insert
    const totalSeeded = SCORE_INSERT_CHUNK_SIZE + 50;
    const seededIds: string[] = [];
    const playerRows = [];
    for (let i = 0; i < totalSeeded; i++) {
      const id = uuidv7();
      seededIds.push(id);
      playerRows.push({
        id,
        organizationId: orgId,
        eventId,
        env: 'live' as const,
        displayName: `Player ${i}`,
        team: i % 2 === 0 ? 'Alpha' : 'Beta',
      });
    }
    await dbClient.db.insert(players).values(playerRows);

    const ghostPlayerId = uuidv7();
    const roundId = uuidv7();
    await repo.insertLiveRound(orgId, {
      id: roundId,
      eventId,
      gameId,
      gameVersionId: versionId,
      env: 'live',
      status: 'playing',
    });

    const ranking = [
      ...seededIds.map((id, i) => ({
        playerId: id,
        displayName: `Player ${i}`,
        score: totalSeeded - i,
        team: i % 2 === 0 ? 'Alpha' : 'Beta',
      })),
      {
        playerId: ghostPlayerId,
        displayName: 'Ghost',
        score: 1,
        team: 'Alpha',
      },
    ];

    await repo.finalizeLiveRound(orgId, {
      roundId,
      eventId,
      endedAt: new Date(),
      result: { roundId, ranking },
    });

    const scores = await dbClient.db
      .select()
      .from(roundScores)
      .where(eq(roundScores.roundId, roundId));
    expect(scores).toHaveLength(totalSeeded);

    // Ghost player was skipped and never created in `players`
    const [ghostRow] = await dbClient.db
      .select()
      .from(players)
      .where(eq(players.id, ghostPlayerId));
    expect(ghostRow).toBeUndefined();
  });

  test('revoking or rotating a screen key via API ScreensService drops matching connected screen sockets within 1 s with UNAUTHORIZED', async () => {
    const { eventId, screenId, screenKey } = await createSeededEvent({ status: 'live' });

    const screensService = new ScreensService(
      new ScreensRepository(dbClient.db),
      {} as never,
      new AuditService(dbClient.db),
      { PLAY_URL: 'http://localhost:3002' } as never,
      redis,
    );

    // Create a second screen on the same event so we verify only the revoked key's socket is dropped
    const secondScreen = await screensService.create(
      orgId,
      eventId,
      { name: 'Side LED' },
      { userId: operatorId },
    );

    const sMain = trackSocket(
      connectLive({ url: rt.url, eventId, role: 'screen', auth: { screenKey } }),
    );
    const sSide = trackSocket(
      connectLive({ url: rt.url, eventId, role: 'screen', auth: { screenKey: secondScreen.key } }),
    );
    await Promise.all([waitForConnect(sMain), waitForConnect(sSide)]);

    // 1. Revoke Main LED via API ScreensService -> sMain receives UNAUTHORIZED and disconnects within 1 s
    const mainErrorPromise = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Screen socket did not emit connect_error within 1 s')),
        1_000,
      );
      sMain.once('connect_error', (err) => {
        clearTimeout(timer);
        resolve(err.message);
      });
    });
    const mainDisconnectPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Screen socket was not dropped within 1 s')),
        1_000,
      );
      sMain.once('disconnect', () => {
        clearTimeout(timer);
        resolve();
      });
    });

    const t0 = Date.now();
    await screensService.revoke(orgId, eventId, screenId, { userId: operatorId });
    const [errCode] = await Promise.all([mainErrorPromise, mainDisconnectPromise]);
    expect(Date.now() - t0).toBeLessThan(1_000);
    expect(errCode).toBe('UNAUTHORIZED');
    expect(sMain.connected).toBe(false);
    // Side LED (different key hash) remains connected
    expect(sSide.connected).toBe(true);

    // 2. Rotate Side LED via API ScreensService -> sSide (authenticated with old key) is dropped within 1 s
    const sideErrorPromise = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Rotated screen socket did not emit connect_error within 1 s')),
        1_000,
      );
      sSide.once('connect_error', (err) => {
        clearTimeout(timer);
        resolve(err.message);
      });
    });
    const sideDisconnectPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Rotated screen socket was not dropped within 1 s')),
        1_000,
      );
      sSide.once('disconnect', () => {
        clearTimeout(timer);
        resolve();
      });
    });

    const rotated = await screensService.rotate(orgId, eventId, secondScreen.id, {
      userId: operatorId,
    });
    const [sideErrCode] = await Promise.all([sideErrorPromise, sideDisconnectPromise]);
    expect(sideErrCode).toBe('UNAUTHORIZED');
    expect(sSide.connected).toBe(false);

    // Connecting with the newly rotated key succeeds
    const sSideNew = trackSocket(
      connectLive({ url: rt.url, eventId, role: 'screen', auth: { screenKey: rotated.key } }),
    );
    await waitForConnect(sSideNew);
  });
});
