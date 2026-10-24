import type { EventState, LiveSnapshot, SocketRole } from '@playora/contracts';
import type { PlayerRef } from '@playora/game-sdk/server';
import type { TemplateRegistry } from '../templates';
import {
  RoundRunner,
  type RoundRunnerOptions,
  type RoundSnapshotData,
  type RoundTransitionEvent,
} from './round-runner';

export interface RoomSnapshotData {
  eventId: string;
  organizationId: string;
  env: 'live' | 'rehearsal';
  playerLimit: number;
  seq: number;
  activeGameId: string | null;
  players: PlayerRef[];
  round: RoundSnapshotData | null;
  savedAt: number;
}

export interface RoleCounters {
  player: number;
  screen: number;
  host: number;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * In-memory actor for a single live event (`docs/05-architecture.md` §6.1).
 * Tracks per-role online counts and multi-tab player sockets (multiple tabs = one player).
 */
export class LiveRoom {
  readonly eventId: string;
  organizationId: string;
  env: 'live' | 'rehearsal';
  playerLimit: number;
  owned = true;
  dirty = false;
  seq = 0;
  activeGameId: string | null = null;

  readonly players = new Map<string, PlayerRef>();
  readonly playerSockets = new Map<string, Set<string>>();
  readonly screenSockets = new Set<string>();
  readonly hostSockets = new Set<string>();

  runner: RoundRunner | null = null;

  constructor(params: {
    eventId: string;
    organizationId: string;
    env: 'live' | 'rehearsal';
    playerLimit: number;
  }) {
    this.eventId = params.eventId;
    this.organizationId = params.organizationId;
    this.env = params.env;
    this.playerLimit = params.playerLimit;
  }

  /** Number of unique connected players (multiple tabs = 1 player). */
  get onlineCount(): number {
    return this.playerSockets.size;
  }

  get onlineByRole(): RoleCounters {
    return {
      player: this.playerSockets.size,
      screen: this.screenSockets.size,
      host: this.hostSockets.size,
    };
  }

  isPlayerOnline(playerId: string): boolean {
    const sockets = this.playerSockets.get(playerId);
    return !!sockets && sockets.size > 0;
  }

  canAcceptPlayer(playerId: string, limit = this.playerLimit): boolean {
    if (this.isPlayerOnline(playerId)) return true;
    return this.playerSockets.size < limit;
  }

  /**
   * Registers a connected socket. Returns `true` when the unique player `onlineCount` changed.
   */
  addSocket(socketId: string, role: SocketRole, player?: PlayerRef): boolean {
    if (role === 'player' && player) {
      const wasOnline = this.isPlayerOnline(player.playerId);
      let set = this.playerSockets.get(player.playerId);
      if (!set) {
        set = new Set();
        this.playerSockets.set(player.playerId, set);
      }
      set.add(socketId);
      this.players.set(player.playerId, player);
      this.runner?.onPlayerJoin(player);
      this.dirty = true;
      return !wasOnline;
    }
    if (role === 'screen') {
      this.screenSockets.add(socketId);
      return false;
    }
    this.hostSockets.add(socketId);
    return false;
  }

  /**
   * Unregisters a disconnected socket. Returns `true` when the unique player `onlineCount` changed.
   */
  removeSocket(socketId: string, role: SocketRole, playerId?: string): boolean {
    if (role === 'player' && playerId) {
      const set = this.playerSockets.get(playerId);
      if (!set) return false;
      set.delete(socketId);
      if (set.size === 0) {
        this.playerSockets.delete(playerId);
        if (this.runner) {
          this.runner.onPlayerLeave(playerId);
        } else {
          this.players.delete(playerId);
        }
        this.dirty = true;
        return true;
      }
      return false;
    }
    if (role === 'screen') {
      this.screenSockets.delete(socketId);
      return false;
    }
    this.hostSockets.delete(socketId);
    return false;
  }

  createRoundRunner(options: Omit<RoundRunnerOptions, 'eventId' | 'players'>): RoundRunner {
    this.runner?.destroy();
    this.activeGameId = options.gameId;
    this.dirty = true;
    this.runner = new RoundRunner({
      ...options,
      eventId: this.eventId,
      players: this.players,
    });
    return this.runner;
  }

  getEventState(): EventState {
    const r = this.runner;
    return {
      eventId: this.eventId,
      activeGameId: this.activeGameId,
      round:
        r && r.status !== 'idle'
          ? {
              id: r.roundId,
              status: r.status,
              ...(r.endsAt !== null ? { endsAt: r.endsAt } : {}),
            }
          : null,
      onlineCount: this.onlineCount,
    };
  }

  getHostView(): unknown {
    if (!this.runner) return null;
    const screenView = this.runner.toScreenView();
    const counters = this.onlineByRole;
    if (isPlainObject(screenView)) {
      return {
        ...screenView,
        counters,
      };
    }
    return {
      view: screenView,
      counters,
    };
  }

  getSnapshotForRole(role: SocketRole, playerId?: string): LiveSnapshot {
    const state = this.getEventState();
    if (!this.runner || this.runner.status === 'idle' || this.runner.status === 'closed') {
      return { state, view: null };
    }
    if (this.seq === 0) {
      this.seq = 1;
    }
    const projected =
      role === 'player'
        ? this.runner.toPlayerView(playerId ?? '')
        : role === 'host'
          ? this.getHostView()
          : this.runner.toScreenView();

    return {
      state,
      view: {
        seq: this.seq,
        roundId: this.runner.roundId,
        view: projected,
      },
    };
  }

  toRedisSnapshot(now = Date.now()): RoomSnapshotData {
    return {
      eventId: this.eventId,
      organizationId: this.organizationId,
      env: this.env,
      playerLimit: this.playerLimit,
      seq: this.seq,
      activeGameId: this.activeGameId,
      players: [...this.players.values()],
      round: this.runner ? this.runner.toSnapshot() : null,
      savedAt: now,
    };
  }

  restoreFromRedisSnapshot(
    snap: RoomSnapshotData,
    registry: TemplateRegistry,
    onTransition: (event: RoundTransitionEvent) => void | Promise<void>,
  ) {
    this.seq = snap.seq;
    this.activeGameId = snap.activeGameId;
    for (const p of snap.players) {
      this.players.set(p.playerId, p);
    }
    if (snap.round) {
      const template = registry.get(snap.round.templateKey, snap.round.templateVersion);
      if (template) {
        const runner = this.createRoundRunner({
          roundId: snap.round.roundId,
          gameId: snap.round.gameId,
          gameVersionId: snap.round.gameVersionId,
          templateKey: snap.round.templateKey,
          templateVersion: snap.round.templateVersion,
          config: snap.round.config,
          module: template.server,
          onTransition,
        });
        runner.restoreFromSnapshot(snap.round);
      }
    }
    this.dirty = false;
  }

  destroy() {
    this.runner?.destroy();
  }
}
