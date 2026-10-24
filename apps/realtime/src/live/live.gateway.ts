import { Inject, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  type CommandAck,
  ErrorCode,
  HostCommand,
  LiveConnectError,
  LiveHandshakeAuth,
  LiveInput,
  type LiveSnapshot,
  type RoundResultPayload,
  SocketRole,
} from '@playora/contracts';
import { hashScreenKey, verifyLiveToken } from '@playora/core/live';
import type { RealtimeEnv } from '@playora/env';
import { type PlayerRef, transitionRound } from '@playora/game-sdk/server';
import type { Redis } from 'ioredis';
import type { Namespace, Socket } from 'socket.io';
import { uuidv7 } from 'uuidv7';
import { z } from 'zod';
import { resolveTemplateConfig, type TemplateRegistry } from '../templates';
import { ENV, NODE_ID, REDIS, TEMPLATE_REGISTRY } from '../tokens';
import { LiveMetrics } from './live.metrics';
import { LiveRepository } from './live.repository';
import { LiveRoom, type RoomSnapshotData } from './live-room';
import type { RoundTransitionEvent } from './round-runner';

export const SCREEN_HZ = 10;
export const PLAYER_HZ = 2;
const PLAYER_EVERY_N_TICKS = SCREEN_HZ / PLAYER_HZ;
export const EVENT_STATE_MAX_HZ = 2;
const EVENT_STATE_MIN_INTERVAL_MS = 1_000 / EVENT_STATE_MAX_HZ;

export const SNAPSHOT_INTERVAL_MS = 1_000;
export const OWNER_LOCK_TTL_MS = 5_000;
export const OWNER_RENEW_INTERVAL_MS = 2_000;

const RENEW_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
else
  return 0
end
`;

const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export const roomKey = (eventId: string, role?: SocketRole) =>
  role ? `evt:${eventId}:${role}` : `evt:${eventId}`;

export const teamRoomKey = (eventId: string, team: string) => `evt:${eventId}:team:${team}`;

export const snapKey = (eventId: string) => `room:${eventId}:snap`;
export const ownerKey = (eventId: string) => `room:${eventId}:owner`;
export const SCREEN_REVOKED_CHANNEL = 'live:screen.revoked';

interface SocketData {
  eventId: string;
  organizationId: string;
  role: SocketRole;
  env: 'live' | 'rehearsal';
  player?: PlayerRef;
  screenKeyHash?: string;
  onlineChanged?: boolean;
}

@WebSocketGateway({ namespace: '/live' })
export class LiveGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(LiveGateway.name);
  private readonly rooms = new Map<string, LiveRoom>();
  private readonly loadingRooms = new Map<string, Promise<LiveRoom | null>>();
  private readonly lastEventStateAt = new Map<string, number>();
  private readonly pendingEventStateTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private redisSub: Redis | null = null;
  private tickNo = 0;
  private shuttingDown = false;
  private readonly broadcastTimer = setInterval(() => this.broadcast(), 1_000 / SCREEN_HZ);
  private readonly snapshotTimer = setInterval(
    () => void this.snapshotAllRooms(),
    SNAPSHOT_INTERVAL_MS,
  );
  private readonly renewTimer = setInterval(
    () => void this.renewAllLocks(),
    OWNER_RENEW_INTERVAL_MS,
  );

  @WebSocketServer() private readonly server!: Namespace;

  constructor(
    @Inject(ENV) private readonly env: RealtimeEnv,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(NODE_ID) readonly nodeId: string,
    @Inject(TEMPLATE_REGISTRY) private readonly registry: TemplateRegistry,
    private readonly repo: LiveRepository,
    private readonly metrics: LiveMetrics,
  ) {}

  async onModuleInit() {
    const sub = this.redis.duplicate();
    this.redisSub = sub;
    sub.on('message', (channel, message) => {
      if (channel === SCREEN_REVOKED_CHANNEL) {
        this.handleScreenRevokedMessage(message);
      }
    });
    await sub.subscribe(SCREEN_REVOKED_CHANNEL);
  }

  afterInit(server: Namespace) {
    server.use((socket, next) => {
      void this.authenticateSocket(socket, next);
    });
  }

  async onModuleDestroy() {
    this.shuttingDown = true;
    clearInterval(this.broadcastTimer);
    clearInterval(this.snapshotTimer);
    clearInterval(this.renewTimer);
    for (const timer of this.pendingEventStateTimers.values()) {
      clearTimeout(timer);
    }
    this.pendingEventStateTimers.clear();

    if (this.redisSub) {
      await this.redisSub.quit().catch(() => {});
      this.redisSub = null;
    }

    const ownedRooms = [...this.rooms.values()].filter((r) => r.owned);
    for (const room of this.rooms.values()) {
      room.destroy();
    }
    await Promise.allSettled(
      ownedRooms.map(async (room) => {
        await this.saveRoomSnapshot(room);
        await this.redis.eval(RELEASE_LOCK_LUA, 1, ownerKey(room.eventId), this.nodeId);
      }),
    );
    this.rooms.clear();
    this.metrics.rooms = 0;
  }

  handleConnection(socket: Socket) {
    const data = socket.data as Partial<SocketData> | undefined;
    if (!data?.eventId || !data.role) {
      socket.disconnect(true);
      return;
    }

    const room = this.rooms.get(data.eventId);
    if (!room?.owned) {
      socket.disconnect(true);
      return;
    }

    const roomsToJoin = [roomKey(data.eventId), roomKey(data.eventId, data.role)];
    if (data.role === 'player' && data.player?.team) {
      roomsToJoin.push(teamRoomKey(data.eventId, data.player.team));
    }
    socket.join(roomsToJoin);

    this.metrics.onConnect(data.role);
    socket.emit('event.state', room.getEventState());

    if (data.onlineChanged) {
      this.scheduleOnlineCountBroadcast(room);
    }
  }

  handleDisconnect(socket: Socket) {
    const data = socket.data as Partial<SocketData> | undefined;
    if (!data?.eventId || !data.role) return;

    this.metrics.onDisconnect(data.role);
    const room = this.rooms.get(data.eventId);
    if (!room) return;

    const onlineChanged = room.removeSocket(socket.id, data.role, data.player?.playerId);
    if (onlineChanged && room.owned && !this.shuttingDown) {
      this.scheduleOnlineCountBroadcast(room);
    }
  }

  @SubscribeMessage('clock.ping')
  clockPing(@MessageBody() body: { t0: number }) {
    return { t0: Number(body?.t0 ?? 0), ts: Date.now() };
  }

  @SubscribeMessage('session.resume')
  sessionResume(
    @ConnectedSocket() socket: Socket,
    @MessageBody() _body: { lastSeq?: number },
  ): { snapshot: LiveSnapshot } {
    const data = socket.data as SocketData;
    const room = this.rooms.get(data.eventId);
    if (!room?.owned) {
      return {
        snapshot: {
          state: {
            eventId: data?.eventId ?? '',
            activeGameId: null,
            round: null,
            onlineCount: 0,
          },
          view: null,
        },
      };
    }
    return {
      snapshot: room.getSnapshotForRole(data.role, data.player?.playerId),
    };
  }

  @SubscribeMessage('input')
  input(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    this.metrics.inputs++;
    const data = socket.data as SocketData;
    if (data.role !== 'player' || !data.player) return;

    const room = this.rooms.get(data.eventId);
    if (!room?.owned || !room.runner) return;

    const parsed = LiveInput.safeParse(body);
    if (!parsed.success) return;
    if (parsed.data.roundId !== room.runner.roundId) return;

    const accepted = room.runner.handlePlayerInput(data.player.playerId, parsed.data.data);
    if (accepted) {
      room.dirty = true;
    }
  }

  @SubscribeMessage('host.command')
  async hostCommand(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<CommandAck> {
    const data = socket.data as SocketData;
    if (data.role !== 'host') {
      return { ok: false, error: ErrorCode.FORBIDDEN };
    }

    const command = HostCommand.safeParse(body);
    if (!command.success) {
      return { ok: false, error: ErrorCode.VALIDATION_FAILED };
    }

    const room = this.rooms.get(data.eventId);
    if (!room?.owned || !(await this.verifyOwnership(data.eventId))) {
      if (room) room.owned = false;
      return { ok: false, error: 'NOT_OWNER' };
    }

    if (command.data.cmd === 'round.open') {
      return this.handleRoundOpen(room, command.data.gameId);
    }

    if (!room.runner) {
      return { ok: false, error: ErrorCode.CONFLICT };
    }

    return room.runner.handleCommand(command.data);
  }

  private async handleRoundOpen(room: LiveRoom, gameId: string): Promise<CommandAck> {
    const effectiveStatus =
      !room.runner || room.runner.status === 'closed' ? 'idle' : room.runner.status;
    if (transitionRound(effectiveStatus, 'round.open') === null) {
      return { ok: false, error: ErrorCode.CONFLICT };
    }

    const gameRes = await this.repo.findGameWithPublishedVersion(
      room.organizationId,
      room.eventId,
      gameId,
    );
    if (gameRes.status === 'not_found') {
      return { ok: false, error: ErrorCode.NOT_FOUND };
    }
    if (gameRes.status === 'not_published') {
      return { ok: false, error: ErrorCode.CONFLICT };
    }

    const template = this.registry.get(
      gameRes.version.templateKey,
      gameRes.version.templateVersion,
    );
    if (!template) {
      return { ok: false, error: ErrorCode.NOT_FOUND };
    }

    const config = resolveTemplateConfig(template, gameRes.version.config, gameRes.game.hotConfig);
    const roundId = uuidv7();

    await this.repo.insertLiveRound(room.organizationId, {
      id: roundId,
      eventId: room.eventId,
      gameId: gameRes.game.id,
      gameVersionId: gameRes.version.id,
      env: room.env,
      status: 'idle',
    });

    const runner = room.createRoundRunner({
      roundId,
      gameId: gameRes.game.id,
      gameVersionId: gameRes.version.id,
      templateKey: gameRes.version.templateKey,
      templateVersion: gameRes.version.templateVersion,
      config,
      module: template.server,
      onTransition: (ev) => this.onRoundTransition(room, ev),
    });

    const ack = await runner.open();
    this.logger.log(`${room.eventId}: round.open (${roundId})`);
    return ack;
  }

  private async onRoundTransition(room: LiveRoom, ev: RoundTransitionEvent) {
    if (!room.owned) return;

    if (ev.status === 'result' && ev.result) {
      await this.repo.finalizeLiveRound(room.organizationId, {
        roundId: ev.roundId,
        eventId: room.eventId,
        endedAt: ev.endedAt ?? new Date(),
        result: ev.result,
      });
    } else {
      await this.repo.updateLiveRoundStatus(room.organizationId, ev.roundId, ev.status, {
        startedAt: ev.startedAt,
        endedAt: ev.endedAt,
      });
    }

    await this.saveRoomSnapshot(room);
    this.emitEventStateImmediate(room);

    if (ev.status === 'result' && ev.result) {
      this.emitRoundResult(room, ev.result);
    }
  }

  private emitRoundResult(room: LiveRoom, result: RoundResultPayload) {
    this.server
      .to([roomKey(room.eventId, 'screen'), roomKey(room.eventId, 'host')])
      .emit('round.result', result);

    for (const [playerId, socketIds] of room.playerSockets) {
      if (socketIds.size === 0) continue;
      const idx = result.ranking.findIndex((r) => r.playerId === playerId);
      const entry = idx >= 0 ? result.ranking[idx] : undefined;
      const you = entry
        ? { rank: idx + 1, score: entry.score }
        : { rank: result.ranking.length + 1, score: 0 };
      const payload = {
        ...result,
        you,
      };
      for (const socketId of socketIds) {
        this.server.sockets.get(socketId)?.emit('round.result', payload);
      }
    }
  }

  private async authenticateSocket(socket: Socket, next: (err?: Error) => void) {
    try {
      const eventParsed = z.uuid().safeParse(socket.handshake.query.event);
      const roleParsed = SocketRole.safeParse(socket.handshake.query.role);
      if (!eventParsed.success || !roleParsed.success) {
        return next(new Error(LiveConnectError.enum.BAD_REQUEST));
      }
      const eventId = eventParsed.data;
      const role = roleParsed.data;

      const authParsed = LiveHandshakeAuth.safeParse(socket.handshake.auth);
      if (!authParsed.success) {
        return next(new Error(LiveConnectError.enum.UNAUTHORIZED));
      }
      const auth = authParsed.data;

      let organizationId: string;
      let env: 'live' | 'rehearsal' = 'live';
      let playerRef: PlayerRef | undefined;
      let screenKeyHash: string | undefined;

      if (role === 'player' || role === 'host') {
        if (!('token' in auth)) {
          return next(new Error(LiveConnectError.enum.UNAUTHORIZED));
        }
        const claims = verifyLiveToken(auth.token, this.env.LIVE_TOKEN_SECRET);
        if (!claims || claims.kind !== role || claims.eventId !== eventId) {
          return next(new Error(LiveConnectError.enum.UNAUTHORIZED));
        }
        organizationId = claims.organizationId;
        if (claims.kind === 'player') {
          env = claims.env;
          playerRef = {
            playerId: claims.sub,
            displayName: claims.displayName,
            ...(claims.team ? { team: claims.team } : {}),
          };
        }
      } else {
        if (!('screenKey' in auth)) {
          return next(new Error(LiveConnectError.enum.UNAUTHORIZED));
        }
        const keyHash = hashScreenKey(auth.screenKey);
        const screenRow = await this.repo.findActiveScreenByKeyHash(eventId, keyHash);
        if (!screenRow) {
          return next(new Error(LiveConnectError.enum.UNAUTHORIZED));
        }
        organizationId = screenRow.organizationId;
        screenKeyHash = keyHash;
      }

      const eventRow = await this.repo.findEvent(organizationId, eventId);
      if (!eventRow) {
        return next(new Error(LiveConnectError.enum.EVENT_NOT_LIVE));
      }
      if (eventRow.status !== 'live' && env !== 'rehearsal') {
        return next(new Error(LiveConnectError.enum.EVENT_NOT_LIVE));
      }

      const room = await this.getOrLoadRoom({
        eventId,
        organizationId,
        env,
        playerLimit: eventRow.playerLimit,
      });
      if (!room?.owned) {
        return next(new Error(LiveConnectError.enum.UNAUTHORIZED));
      }
      room.playerLimit = eventRow.playerLimit;

      if (role === 'player' && playerRef) {
        if (!room.canAcceptPlayer(playerRef.playerId, eventRow.playerLimit)) {
          return next(new Error(LiveConnectError.enum.PLAYER_LIMIT_REACHED));
        }
      }

      const onlineChanged = room.addSocket(socket.id, role, playerRef);
      const data = socket.data as SocketData;
      data.eventId = eventId;
      data.organizationId = organizationId;
      data.role = role;
      data.env = env;
      data.player = playerRef;
      data.screenKeyHash = screenKeyHash;
      data.onlineChanged = onlineChanged;

      return next();
    } catch (err) {
      this.logger.error(`Handshake error: ${err instanceof Error ? err.message : String(err)}`);
      return next(new Error(LiveConnectError.enum.UNAUTHORIZED));
    }
  }

  private handleScreenRevokedMessage(raw: string) {
    if (this.shuttingDown || !this.server) return;
    try {
      const parsed = JSON.parse(raw) as { eventId?: unknown; screenKeyHash?: unknown };
      if (typeof parsed.eventId !== 'string' || typeof parsed.screenKeyHash !== 'string') {
        return;
      }
      this.disconnectRevokedScreens(parsed.eventId, parsed.screenKeyHash);
    } catch (err) {
      this.logger.warn(
        `Invalid ${SCREEN_REVOKED_CHANNEL} payload: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private disconnectRevokedScreens(eventId: string, screenKeyHash: string) {
    const room = this.rooms.get(eventId);
    if (!room) return;
    for (const socketId of [...room.screenSockets]) {
      const socket = this.server?.sockets.get(socketId);
      if (!socket) continue;
      const data = socket.data as Partial<SocketData> | undefined;
      if (
        data?.role === 'screen' &&
        data.eventId === eventId &&
        data.screenKeyHash === screenKeyHash
      ) {
        (socket as unknown as { _error: (err: { message: string }) => void })._error({
          message: LiveConnectError.enum.UNAUTHORIZED,
        });
        socket.disconnect(true);
      }
    }
  }

  private async getOrLoadRoom(params: {
    eventId: string;
    organizationId: string;
    env: 'live' | 'rehearsal';
    playerLimit: number;
  }): Promise<LiveRoom | null> {
    const existing = this.rooms.get(params.eventId);
    if (existing) {
      if (!existing.owned) return null;
      return existing;
    }

    const pending = this.loadingRooms.get(params.eventId);
    if (pending) return pending;

    const loadPromise = (async () => {
      try {
        const acquired = await this.tryAcquireOwnership(params.eventId);
        if (!acquired) return null;

        const room = new LiveRoom(params);
        const snapRaw = await this.redis.get(snapKey(params.eventId));
        if (snapRaw) {
          try {
            const snap = JSON.parse(snapRaw) as RoomSnapshotData;
            room.restoreFromRedisSnapshot(snap, this.registry, (ev) =>
              this.onRoundTransition(room, ev),
            );
          } catch (err) {
            this.logger.warn(
              `Failed to restore snapshot for ${params.eventId}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
        this.rooms.set(params.eventId, room);
        this.metrics.rooms = this.rooms.size;
        return room;
      } finally {
        this.loadingRooms.delete(params.eventId);
      }
    })();

    this.loadingRooms.set(params.eventId, loadPromise);
    return loadPromise;
  }

  private async tryAcquireOwnership(eventId: string): Promise<boolean> {
    const key = ownerKey(eventId);
    const res = await this.redis.set(key, this.nodeId, 'PX', OWNER_LOCK_TTL_MS, 'NX');
    if (res === 'OK') return true;

    const renewed = await this.redis.eval(
      RENEW_LOCK_LUA,
      1,
      key,
      this.nodeId,
      String(OWNER_LOCK_TTL_MS),
    );
    return Number(renewed) === 1;
  }

  private async verifyOwnership(eventId: string): Promise<boolean> {
    const owner = await this.redis.get(ownerKey(eventId));
    return owner === this.nodeId;
  }

  private async renewAllLocks() {
    if (this.shuttingDown) return;
    for (const [eventId, room] of this.rooms) {
      if (!room.owned) continue;
      try {
        const renewed = await this.redis.eval(
          RENEW_LOCK_LUA,
          1,
          ownerKey(eventId),
          this.nodeId,
          String(OWNER_LOCK_TTL_MS),
        );
        if (Number(renewed) !== 1) {
          room.owned = false;
          room.destroy();
          this.rooms.delete(eventId);
          this.metrics.rooms = this.rooms.size;
        }
      } catch (err) {
        this.logger.warn(
          `Failed to renew lock for ${eventId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  private async snapshotAllRooms() {
    if (this.shuttingDown) return;
    for (const room of this.rooms.values()) {
      if (!room.owned || !room.dirty) continue;
      await this.saveRoomSnapshot(room);
    }
  }

  private async saveRoomSnapshot(room: LiveRoom) {
    if (!room.owned) return;
    room.dirty = false;
    try {
      const payload = JSON.stringify(room.toRedisSnapshot());
      await this.redis.set(snapKey(room.eventId), payload);
    } catch (err) {
      room.dirty = true;
      this.logger.warn(
        `Failed to save snapshot for ${room.eventId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private emitEventStateImmediate(room: LiveRoom) {
    const existingTimer = this.pendingEventStateTimers.get(room.eventId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.pendingEventStateTimers.delete(room.eventId);
    }
    this.lastEventStateAt.set(room.eventId, Date.now());
    this.server.to(roomKey(room.eventId)).emit('event.state', room.getEventState());
  }

  private scheduleOnlineCountBroadcast(room: LiveRoom) {
    const now = Date.now();
    const lastAt = this.lastEventStateAt.get(room.eventId) ?? 0;
    const elapsed = now - lastAt;
    if (elapsed >= EVENT_STATE_MIN_INTERVAL_MS) {
      this.emitEventStateImmediate(room);
      return;
    }
    if (this.pendingEventStateTimers.has(room.eventId)) return;

    const delay = EVENT_STATE_MIN_INTERVAL_MS - elapsed;
    const timer = setTimeout(() => {
      this.pendingEventStateTimers.delete(room.eventId);
      if (room.owned && !this.shuttingDown) {
        this.emitEventStateImmediate(room);
      }
    }, delay);
    this.pendingEventStateTimers.set(room.eventId, timer);
  }

  private broadcast() {
    if (this.shuttingDown) return;
    this.tickNo++;
    const withPlayers = this.tickNo % PLAYER_EVERY_N_TICKS === 0;

    for (const [eventId, room] of this.rooms) {
      if (!room.owned || !room.runner) continue;
      const status = room.runner.status;
      if (status === 'idle' || status === 'closed') continue;

      if (room.runner.tick()) {
        room.dirty = true;
      }
      const roundId = room.runner.roundId;
      const seq = ++room.seq;

      if (room.screenSockets.size > 0) {
        const screenView = room.runner.toScreenView();
        this.server
          .to(roomKey(eventId, 'screen'))
          .emit('round.view', { seq, roundId, view: screenView });
        this.metrics.broadcasts++;
      }

      if (room.hostSockets.size > 0) {
        const hostView = room.getHostView();
        this.server
          .to(roomKey(eventId, 'host'))
          .emit('round.view', { seq, roundId, view: hostView });
        this.metrics.broadcasts++;
      }

      if (!withPlayers || room.playerSockets.size === 0) continue;

      for (const [playerId, socketIds] of room.playerSockets) {
        if (socketIds.size === 0) continue;
        const playerView = room.runner.toPlayerView(playerId);
        const payload = { seq, roundId, view: playerView };
        for (const socketId of socketIds) {
          this.server.sockets.get(socketId)?.emit('round.view', payload);
        }
        this.metrics.broadcasts++;
      }
    }
  }
}
