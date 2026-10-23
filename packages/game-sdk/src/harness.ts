import type { HostCommand, RoundStatus } from '@playora/contracts';
import type { z } from 'zod';
import type { TemplateDefinition } from './define';
import type {
  LiveServerModule,
  PlayerRef,
  RoomContext,
  RoundResult,
  ServerModuleEntry,
} from './types';

export type RoundTransitionCommand = HostCommand['cmd'] | 'timer.elapsed' | 'countdown.elapsed';

export type HarnessCommand = HostCommand | { cmd: 'timer.elapsed' } | { cmd: 'countdown.elapsed' };

/**
 * Pure round state machine implementing `docs/07-api-realtime.md` §4.3:
 * `idle -round.open-> lobby -round.start-> countdown -countdown.elapsed-> playing -round.end|timer.elapsed-> result -round.next-> closed`.
 * While in `'playing'`, `'round.pause'` is a legal self-transition (`'playing'`) that toggles the runner's `paused` flag.
 * Returns `null` when the transition is illegal.
 */
export function transitionRound(
  status: RoundStatus,
  cmd: RoundTransitionCommand,
): RoundStatus | null {
  switch (status) {
    case 'idle':
      return cmd === 'round.open' ? 'lobby' : null;
    case 'lobby':
      return cmd === 'round.start' ? 'countdown' : null;
    case 'countdown':
      return cmd === 'countdown.elapsed' ? 'playing' : null;
    case 'playing':
      if (cmd === 'round.end' || cmd === 'timer.elapsed') return 'result';
      if (cmd === 'round.pause') return 'playing';
      return null;
    case 'result':
      return cmd === 'round.next' ? 'closed' : null;
    case 'closed':
      return null;
  }
}

export interface TestRoomOptions {
  eventId?: string;
  roundId?: string;
  /** Initial server clock timestamp in ms (default 0). */
  now?: number;
  /** Initial round status (default 'lobby'). */
  status?: RoundStatus;
}

export interface TestRoom<C, S, A = unknown, PV = unknown, SV = unknown> {
  readonly config: C;
  readonly state: S;
  readonly status: RoundStatus;
  readonly paused: boolean;
  readonly players: ReadonlyMap<string, PlayerRef>;
  now(): number;
  setNow(timestampMs: number): void;
  advanceTime(deltaMs: number): void;
  join(playerOrId: string | PlayerRef, displayName?: string, team?: string): PlayerRef;
  /**
   * Simulates a player disconnecting from the room.
   * While in `'lobby'`, the player is removed from `players`; once the round has left `'lobby'`,
   * the player stays in `players` so they keep their score and ranking.
   */
  leave(playerId: string): void;
  action(playerOrId: string | PlayerRef, action: A): S;
  command(cmd: HarnessCommand): S;
  tick(deltaMs?: number): S;
  playerView(playerOrId: string | PlayerRef): PV;
  screenView(): SV;
  finalize(): RoundResult;
}

export async function resolveServerModule<M>(entry: ServerModuleEntry<M>): Promise<M> {
  if (typeof entry === 'function') {
    const loaded = await (entry as () => Promise<{ default: M } | M>)();
    if (loaded && typeof loaded === 'object' && 'default' in loaded) {
      return loaded.default;
    }
    return loaded as M;
  }
  return entry;
}

function isTemplateDefinition<Schema extends z.ZodType, S, A, PV, SV>(
  value: unknown,
): value is TemplateDefinition<Schema, S, A, PV, SV> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'configSchema' in value &&
    'kind' in value &&
    'version' in value
  );
}

function normalizePlayerRef(
  playerOrId: string | PlayerRef,
  displayName?: string,
  team?: string,
): PlayerRef {
  if (typeof playerOrId === 'string') {
    return {
      playerId: playerOrId,
      displayName: displayName ?? playerOrId,
      ...(team !== undefined ? { team } : {}),
    };
  }
  return playerOrId;
}

/**
 * In-memory deterministic test harness for simulating a live game room
 * (players joining/leaving, player actions, host commands, ticks, projections, and final results).
 */
export function createTestRoom<
  Schema extends z.ZodType,
  S = unknown,
  A = unknown,
  PV = unknown,
  SV = unknown,
>(
  template: TemplateDefinition<Schema, S, A, PV, SV>,
  config?: Partial<z.infer<Schema>>,
  options?: TestRoomOptions,
): TestRoom<z.infer<Schema>, S, A, PV, SV>;
export function createTestRoom<C, S, A = unknown, PV = unknown, SV = unknown>(
  server: LiveServerModule<C, S, A, PV, SV>,
  config: C,
  options?: TestRoomOptions,
): TestRoom<C, S, A, PV, SV>;
export function createTestRoom<C, S, A = unknown, PV = unknown, SV = unknown>(
  templateOrServer:
    | TemplateDefinition<z.ZodType<C>, S, A, PV, SV>
    | LiveServerModule<C, S, A, PV, SV>,
  configOrOverrides?: Partial<C> | C,
  options?: TestRoomOptions,
): TestRoom<C, S, A, PV, SV> {
  let server: LiveServerModule<C, S, A, PV, SV>;
  let resolvedConfig: C;

  if (isTemplateDefinition<z.ZodType<C>, S, A, PV, SV>(templateOrServer)) {
    if (!templateOrServer.server || typeof templateOrServer.server === 'function') {
      throw new Error(
        `Template "${templateOrServer.id}" does not have a synchronous server module; pass an inline LiveServerModule to defineTemplate or createTestRoom.`,
      );
    }
    server = templateOrServer.server;
    const baseDefault =
      typeof templateOrServer.defaultConfig === 'object' && templateOrServer.defaultConfig !== null
        ? templateOrServer.defaultConfig
        : {};
    const merged =
      typeof configOrOverrides === 'object' && configOrOverrides !== null
        ? { ...baseDefault, ...configOrOverrides }
        : templateOrServer.defaultConfig;
    resolvedConfig = templateOrServer.configSchema.parse(merged ?? {});
  } else {
    server = templateOrServer;
    resolvedConfig = configOrOverrides as C;
  }

  let currentNow = options?.now ?? 0;
  let currentStatus: RoundStatus = options?.status ?? 'lobby';
  let paused = false;
  const players = new Map<string, PlayerRef>();
  const eventId = options?.eventId ?? 'evt_test';
  const roundId = options?.roundId ?? 'rnd_test';

  const ctx: RoomContext<C> = {
    eventId,
    roundId,
    config: resolvedConfig,
    get status() {
      return currentStatus;
    },
    players,
    now() {
      return currentNow;
    },
    setStatus(nextStatus: RoundStatus) {
      const transitioned =
        nextStatus === 'result' ? transitionRound(currentStatus, 'timer.elapsed') : null;
      if (transitioned === null) {
        throw new Error(`Illegal round transition from "${currentStatus}" to "${nextStatus}"`);
      }
      currentStatus = transitioned;
      paused = false;
    },
  };

  const applyTransition = (nextState: S | undefined): S => {
    if (nextState !== undefined) {
      state = nextState;
    }
    return state;
  };

  let state: S = server.init(resolvedConfig, ctx);

  const resolveExistingOrNewPlayer = (playerOrId: string | PlayerRef): PlayerRef => {
    if (typeof playerOrId === 'string') {
      return players.get(playerOrId) ?? { playerId: playerOrId, displayName: playerOrId };
    }
    return players.get(playerOrId.playerId) ?? playerOrId;
  };

  const join = (playerOrId: string | PlayerRef, displayName?: string, team?: string): PlayerRef => {
    const ref = normalizePlayerRef(playerOrId, displayName, team);
    const existing = players.get(ref.playerId);
    const finalRef = existing ?? ref;
    players.set(finalRef.playerId, finalRef);
    if (server.onPlayerJoin) {
      applyTransition(server.onPlayerJoin(state, finalRef, ctx));
    }
    return finalRef;
  };

  /**
   * Simulates a player disconnecting from the room.
   * While in `'lobby'`, the player is removed from `players`; once the round has left `'lobby'`,
   * the player stays in `players` so they keep their score and ranking.
   */
  const leave = (playerId: string): void => {
    if (server.onPlayerLeave) {
      applyTransition(server.onPlayerLeave(state, playerId, ctx));
    }
    if (currentStatus === 'lobby') {
      players.delete(playerId);
    }
  };

  const action = (playerOrId: string | PlayerRef, rawAction: A): S => {
    const parsed = server.actionSchema ? server.actionSchema.parse(rawAction) : rawAction;
    if (paused) return state;
    const playerRef = resolveExistingOrNewPlayer(playerOrId);
    return applyTransition(server.onPlayerAction(state, playerRef, parsed, ctx));
  };

  const command = (cmd: HarnessCommand): S => {
    const nextStatus = transitionRound(currentStatus, cmd.cmd);
    if (nextStatus === null) {
      throw new Error(`Illegal round transition from "${currentStatus}" via "${cmd.cmd}"`);
    }
    if (cmd.cmd === 'round.pause') {
      paused = !paused;
    } else if (nextStatus !== currentStatus) {
      paused = false;
    }
    currentStatus = nextStatus;

    if (cmd.cmd !== 'countdown.elapsed' && cmd.cmd !== 'timer.elapsed' && server.onHostCommand) {
      return applyTransition(server.onHostCommand(state, cmd, ctx));
    }
    return state;
  };

  const tick = (deltaMs = 0): S => {
    if (deltaMs !== 0) {
      currentNow += deltaMs;
    }
    if (paused) return state;
    if (server.onTick) {
      return applyTransition(server.onTick(state, ctx));
    }
    return state;
  };

  const playerView = (playerOrId: string | PlayerRef): PV => {
    const playerRef = resolveExistingOrNewPlayer(playerOrId);
    return server.toPlayerView(state, playerRef, ctx);
  };

  const screenView = (): SV => {
    return server.toScreenView(state, ctx);
  };

  const finalize = (): RoundResult => {
    return server.finalize(state, ctx);
  };

  return {
    get config() {
      return resolvedConfig;
    },
    get state() {
      return state;
    },
    get status() {
      return currentStatus;
    },
    get paused() {
      return paused;
    },
    get players() {
      return players;
    },
    now() {
      return currentNow;
    },
    setNow(timestampMs: number) {
      currentNow = timestampMs;
    },
    advanceTime(deltaMs: number) {
      currentNow += deltaMs;
    },
    join,
    leave,
    action,
    command,
    tick,
    playerView,
    screenView,
    finalize,
  };
}
