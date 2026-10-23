import { Inject, Logger, type OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { type CommandAck, HostCommand, LiveInput, SocketRole } from '@playora/contracts';
import type { RealtimeEnv } from '@playora/env';
import type { Namespace, Socket } from 'socket.io';
import { ENV } from '../tokens';
import { LiveMetrics } from './live.metrics';
import { TapInput, TapRaceRoom } from './tap-race.room';

const SCREEN_HZ = 10;
const PLAYER_EVERY_N_TICKS = 5; // 2 Hz
const ROUND_MS = 60_000;

interface SocketData {
  eventId: string;
  role: SocketRole;
  playerKey?: string;
}

const roomKey = (eventId: string, role?: SocketRole) =>
  role ? `evt:${eventId}:${role}` : `evt:${eventId}`;

/**
 * M0 spike gateway: proves rooms, host commands, input throttling and fan-out at 5k CCU.
 * Auth is a shared host key for now; M1 switches to player tokens and screen keys (docs/07 §4).
 */
@WebSocketGateway({ namespace: '/live' })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(LiveGateway.name);
  private readonly rooms = new Map<string, TapRaceRoom>();
  private readonly socketsByPlayer = new Map<string, string>();
  private tickNo = 0;
  private readonly timer = setInterval(() => this.broadcast(), 1000 / SCREEN_HZ);

  @WebSocketServer() private readonly server!: Namespace;

  constructor(
    @Inject(ENV) private readonly env: RealtimeEnv,
    private readonly metrics: LiveMetrics,
  ) {}

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  handleConnection(socket: Socket) {
    const { event, role, key, name, team } = socket.handshake.query;
    const parsedRole = SocketRole.safeParse(role);
    if (typeof event !== 'string' || !event || !parsedRole.success) {
      socket.disconnect(true);
      return;
    }
    if (
      parsedRole.data === 'host' &&
      socket.handshake.auth?.hostKey !== this.env.REALTIME_HOST_KEY
    ) {
      socket.disconnect(true);
      return;
    }

    const data = socket.data as SocketData;
    data.eventId = event;
    data.role = parsedRole.data;
    socket.join([roomKey(event), roomKey(event, parsedRole.data)]);

    const room = this.room(event);
    if (parsedRole.data === 'player') {
      const playerKey = typeof key === 'string' && key ? key : socket.id;
      data.playerKey = playerKey;
      room.join(
        playerKey,
        typeof name === 'string' && name ? name.slice(0, 40) : 'Khách',
        typeof team === 'string' && team ? team.slice(0, 40) : 'Chung',
      );
      this.socketsByPlayer.set(`${event}:${playerKey}`, socket.id);
    }
    this.metrics.connections++;
  }

  handleDisconnect(socket: Socket) {
    const data = socket.data as Partial<SocketData>;
    if (!data.eventId) return;
    this.metrics.connections--;
    if (data.role === 'player' && data.playerKey) {
      const mapKey = `${data.eventId}:${data.playerKey}`;
      if (this.socketsByPlayer.get(mapKey) === socket.id) this.socketsByPlayer.delete(mapKey);
      this.rooms.get(data.eventId)?.leave(data.playerKey);
    }
  }

  @SubscribeMessage('clock.ping')
  clockPing(@MessageBody() body: { t0: number }) {
    return { t0: body?.t0, ts: Date.now() };
  }

  @SubscribeMessage('input')
  input(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    this.metrics.inputs++;
    const data = socket.data as SocketData;
    if (data.role !== 'player' || !data.playerKey) return;
    const input = LiveInput.safeParse(body);
    const tap = input.success ? TapInput.safeParse(input.data.data) : undefined;
    if (!tap?.success) return;
    this.rooms.get(data.eventId)?.input(data.playerKey, tap.data.d);
  }

  @SubscribeMessage('host.command')
  hostCommand(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown): CommandAck {
    const data = socket.data as SocketData;
    if (data.role !== 'host') return { ok: false, error: 'FORBIDDEN' };
    const command = HostCommand.safeParse(body);
    if (!command.success) return { ok: false, error: 'VALIDATION_FAILED' };

    const room = this.room(data.eventId);
    switch (command.data.cmd) {
      case 'round.start':
        room.start(ROUND_MS);
        break;
      case 'round.end':
        room.endsAt = Date.now();
        room.tick();
        break;
      case 'round.next':
        room.reset();
        break;
      default:
        return { ok: false, error: 'UNSUPPORTED_IN_SPIKE' };
    }
    this.logger.log(`${data.eventId}: ${command.data.cmd}`);
    return { ok: true };
  }

  private room(eventId: string) {
    let room = this.rooms.get(eventId);
    if (!room) {
      room = new TapRaceRoom();
      this.rooms.set(eventId, room);
    }
    return room;
  }

  private broadcast() {
    this.tickNo++;
    const now = Date.now();
    const withPlayers = this.tickNo % PLAYER_EVERY_N_TICKS === 0;
    for (const [eventId, room] of this.rooms) {
      room.tick(now);
      const view = { seq: this.tickNo, roundId: eventId, view: room.screenView(now) };
      this.server
        .to([roomKey(eventId, 'screen'), roomKey(eventId, 'host')])
        .emit('round.view', view);
      this.metrics.broadcasts++;

      if (!withPlayers) continue;
      for (const [playerKey, playerView] of room.playerViews(now)) {
        const socketId = this.socketsByPlayer.get(`${eventId}:${playerKey}`);
        if (!socketId) continue;
        this.server
          .to(socketId)
          .emit('round.view', { seq: this.tickNo, roundId: eventId, view: playerView });
        this.metrics.broadcasts++;
      }
    }
  }
}
