import {
  type CommandAck,
  ErrorCode,
  type HostCommand,
  type RoundResultPayload,
  type RoundStatus,
} from '@playora/contracts';
import {
  type LiveServerModule,
  type PlayerRef,
  type RoomContext,
  type RoundTransitionCommand,
  transitionRound,
} from '@playora/game-sdk/server';

export const COUNTDOWN_DURATION_MS = 3_000;
export const DEFAULT_MIN_INPUT_INTERVAL_MS = 200;

export interface RoundTransitionEvent {
  roundId: string;
  status: RoundStatus;
  command: RoundTransitionCommand;
  paused: boolean;
  startedAt?: Date;
  endedAt?: Date;
  result?: RoundResultPayload;
}

export interface RoundSnapshotData {
  roundId: string;
  gameId: string;
  gameVersionId: string;
  templateKey: string;
  templateVersion: string;
  config: unknown;
  status: RoundStatus;
  paused: boolean;
  endsAt: number | null;
  remainingMs: number | null;
  moduleState: unknown;
  lastResult: RoundResultPayload | null;
}

export interface RoundRunnerOptions<
  C = unknown,
  S = unknown,
  A = unknown,
  PV = unknown,
  SV = unknown,
> {
  eventId: string;
  roundId: string;
  gameId: string;
  gameVersionId: string;
  templateKey: string;
  templateVersion: string;
  config: C;
  module: LiveServerModule<C, S, A, PV, SV>;
  players: Map<string, PlayerRef>;
  now?: () => number;
  countdownMs?: number;
  onTransition?: (event: RoundTransitionEvent) => void | Promise<void>;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Server-authoritative round state machine (`docs/07-api-realtime.md` §4.3).
 * Delegates all state transition decisions to `transitionRound` from `@playora/game-sdk/server`.
 */
export class RoundRunner<C = unknown, S = unknown, A = unknown, PV = unknown, SV = unknown> {
  readonly eventId: string;
  readonly roundId: string;
  readonly gameId: string;
  readonly gameVersionId: string;
  readonly templateKey: string;
  readonly templateVersion: string;
  readonly config: C;
  readonly module: LiveServerModule<C, S, A, PV, SV>;
  readonly players: Map<string, PlayerRef>;

  status: RoundStatus = 'idle';
  paused = false;
  endsAt: number | null = null;
  remainingMs: number | null = null;
  state: S;
  lastResult: RoundResultPayload | null = null;

  private readonly now: () => number;
  private readonly countdownMs: number;
  private readonly onTransition?: (event: RoundTransitionEvent) => void | Promise<void>;
  private readonly lastInputAt = new Map<string, number>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly ctx: RoomContext<C>;

  constructor(options: RoundRunnerOptions<C, S, A, PV, SV>) {
    this.eventId = options.eventId;
    this.roundId = options.roundId;
    this.gameId = options.gameId;
    this.gameVersionId = options.gameVersionId;
    this.templateKey = options.templateKey;
    this.templateVersion = options.templateVersion;
    this.config = options.config;
    this.module = options.module;
    this.players = options.players;
    this.now = options.now ?? Date.now;
    this.countdownMs = options.countdownMs ?? COUNTDOWN_DURATION_MS;
    this.onTransition = options.onTransition;

    const self = this;
    this.ctx = {
      eventId: this.eventId,
      roundId: this.roundId,
      config: this.config,
      get status() {
        return self.status;
      },
      players: this.players,
      now: () => this.now(),
      setStatus: (nextStatus: RoundStatus) => {
        if (nextStatus === 'result' && this.status === 'playing') {
          const next = transitionRound(this.status, 'timer.elapsed');
          if (next === 'result') {
            void this.enterResult('timer.elapsed');
          }
        }
      },
    };

    this.state = this.module.init(this.config, this.ctx);
  }

  /** Transitions from `'idle'` to `'lobby'` via `round.open`. */
  async open(): Promise<CommandAck> {
    const next = transitionRound(this.status, 'round.open');
    if (next === null) {
      return { ok: false, error: ErrorCode.CONFLICT };
    }
    this.clearTimer();
    this.status = next;
    this.paused = false;
    this.endsAt = null;
    this.remainingMs = null;
    this.lastResult = null;
    this.lastInputAt.clear();

    if (this.module.onHostCommand) {
      this.applyState(
        this.module.onHostCommand(this.state, { cmd: 'round.open', gameId: this.gameId }, this.ctx),
      );
    }

    await this.notifyTransition({
      roundId: this.roundId,
      status: this.status,
      command: 'round.open',
      paused: this.paused,
    });
    return { ok: true };
  }

  async handleCommand(cmd: HostCommand): Promise<CommandAck> {
    const next = transitionRound(this.status, cmd.cmd);
    if (next === null) {
      return { ok: false, error: ErrorCode.CONFLICT };
    }

    switch (cmd.cmd) {
      case 'round.start': {
        this.clearTimer();
        this.status = next;
        this.paused = false;
        this.remainingMs = null;
        this.lastInputAt.clear();
        const now = this.now();
        this.endsAt = now + this.countdownMs;

        if (this.module.onHostCommand) {
          this.applyState(this.module.onHostCommand(this.state, cmd, this.ctx));
        }
        this.syncStateEndsAt(this.endsAt);
        this.scheduleCountdown(this.countdownMs);

        await this.notifyTransition({
          roundId: this.roundId,
          status: this.status,
          command: 'round.start',
          paused: this.paused,
        });
        return { ok: true };
      }

      case 'round.pause': {
        const now = this.now();
        this.paused = !this.paused;
        if (this.paused) {
          this.clearTimer();
          if (this.endsAt !== null) {
            this.remainingMs = Math.max(0, this.endsAt - now);
            this.endsAt = null;
            this.syncStateEndsAt(null);
          }
        } else if (this.remainingMs !== null) {
          const durationMs = this.remainingMs;
          this.remainingMs = null;
          this.endsAt = now + durationMs;
          this.syncStateEndsAt(this.endsAt);
          this.scheduleDuration(durationMs);
        }

        if (this.module.onHostCommand) {
          this.applyState(this.module.onHostCommand(this.state, cmd, this.ctx));
        }

        await this.notifyTransition({
          roundId: this.roundId,
          status: this.status,
          command: 'round.pause',
          paused: this.paused,
        });
        return { ok: true };
      }

      case 'round.end': {
        this.clearTimer();
        if (this.module.onHostCommand) {
          this.applyState(this.module.onHostCommand(this.state, cmd, this.ctx));
        }
        await this.enterResult('round.end');
        return { ok: true };
      }

      case 'round.next': {
        this.clearTimer();
        this.status = next;
        this.paused = false;
        this.endsAt = null;
        this.remainingMs = null;
        if (this.module.onHostCommand) {
          this.applyState(this.module.onHostCommand(this.state, cmd, this.ctx));
        }
        await this.notifyTransition({
          roundId: this.roundId,
          status: this.status,
          command: 'round.next',
          paused: this.paused,
        });
        return { ok: true };
      }

      default:
        return { ok: false, error: ErrorCode.CONFLICT };
    }
  }

  onPlayerJoin(player: PlayerRef) {
    this.players.set(player.playerId, player);
    if (this.module.onPlayerJoin) {
      this.applyState(this.module.onPlayerJoin(this.state, player, this.ctx));
    }
  }

  onPlayerLeave(playerId: string) {
    if (this.module.onPlayerLeave) {
      this.applyState(this.module.onPlayerLeave(this.state, playerId, this.ctx));
    }
    if (this.status === 'lobby' || this.status === 'idle') {
      this.players.delete(playerId);
    }
  }

  /**
   * Validates `rawData` with the template's `actionSchema`, throttles per player,
   * and drops inputs when not in `'playing'` or while `paused`.
   */
  handlePlayerInput(playerId: string, rawData: unknown): boolean {
    if (this.status !== 'playing' || this.paused) return false;
    const player = this.players.get(playerId);
    if (!player) return false;

    let parsedData = rawData as A;
    if (this.module.actionSchema) {
      const parsed = this.module.actionSchema.safeParse(rawData);
      if (!parsed.success) return false;
      parsedData = parsed.data;
    }

    const now = this.now();
    const minInterval = this.getMinInputIntervalMs();
    const prevAt = this.lastInputAt.get(playerId);
    if (prevAt !== undefined && now - prevAt < minInterval) {
      return false;
    }
    this.lastInputAt.set(playerId, now);

    this.applyState(this.module.onPlayerAction(this.state, player, parsedData, this.ctx));
    return true;
  }

  tick(): boolean {
    if (this.status !== 'playing' || this.paused) return false;
    if (this.endsAt !== null && this.now() >= this.endsAt) {
      void this.onTimerElapsed();
      return false;
    }
    if (this.module.onTick) {
      const prev = this.state;
      this.applyState(this.module.onTick(this.state, this.ctx));
      return this.state !== prev;
    }
    return false;
  }

  toScreenView(): SV {
    return this.module.toScreenView(this.state, this.ctx);
  }

  toPlayerView(playerId: string): PV {
    const player = this.players.get(playerId) ?? { playerId, displayName: playerId };
    return this.module.toPlayerView(this.state, player, this.ctx);
  }

  toSnapshot(): RoundSnapshotData {
    return {
      roundId: this.roundId,
      gameId: this.gameId,
      gameVersionId: this.gameVersionId,
      templateKey: this.templateKey,
      templateVersion: this.templateVersion,
      config: this.config,
      status: this.status,
      paused: this.paused,
      endsAt: this.endsAt,
      remainingMs: this.remainingMs,
      moduleState: this.state,
      lastResult: this.lastResult,
    };
  }

  restoreFromSnapshot(snap: RoundSnapshotData) {
    this.clearTimer();
    this.status = snap.status;
    this.paused = snap.paused;
    this.endsAt = snap.endsAt;
    this.remainingMs = snap.remainingMs;
    this.state = structuredClone(snap.moduleState) as S;
    this.lastResult = snap.lastResult ? structuredClone(snap.lastResult) : null;

    const now = this.now();
    if (this.status === 'countdown' && this.endsAt !== null) {
      this.scheduleCountdown(Math.max(0, this.endsAt - now));
    } else if (this.status === 'playing' && !this.paused && this.endsAt !== null) {
      this.scheduleDuration(Math.max(0, this.endsAt - now));
    }
  }

  destroy() {
    this.clearTimer();
  }

  private scheduleCountdown(delayMs: number) {
    this.clearTimer();
    this.timer = setTimeout(() => {
      void this.onCountdownElapsed();
    }, delayMs);
  }

  private scheduleDuration(delayMs: number) {
    this.clearTimer();
    this.timer = setTimeout(() => {
      void this.onTimerElapsed();
    }, delayMs);
  }

  private clearTimer() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async onCountdownElapsed() {
    this.timer = null;
    const next = transitionRound(this.status, 'countdown.elapsed');
    if (next !== 'playing') return;

    this.status = 'playing';
    this.paused = false;
    this.remainingMs = null;
    const now = this.now();
    const durationSec = this.getDurationSec();

    if (durationSec !== null && durationSec > 0) {
      const durationMs = durationSec * 1_000;
      this.endsAt = now + durationMs;
      this.syncStateEndsAt(this.endsAt);
      this.scheduleDuration(durationMs);
    } else {
      this.endsAt = null;
      this.syncStateEndsAt(null);
    }

    await this.notifyTransition({
      roundId: this.roundId,
      status: this.status,
      command: 'countdown.elapsed',
      paused: this.paused,
      startedAt: new Date(now),
    });
  }

  private async onTimerElapsed() {
    this.timer = null;
    const next = transitionRound(this.status, 'timer.elapsed');
    if (next !== 'result') return;
    await this.enterResult('timer.elapsed');
  }

  private async enterResult(command: 'round.end' | 'timer.elapsed') {
    this.clearTimer();
    this.status = 'result';
    this.paused = false;
    this.endsAt = null;
    this.remainingMs = null;
    this.syncStateEndsAt(null);

    const finalized = this.module.finalize(this.state, this.ctx);
    const ranking = finalized.ranking.map((r) => ({
      playerId: r.playerId,
      displayName: this.players.get(r.playerId)?.displayName ?? r.playerId,
      score: r.score,
      ...(r.team !== undefined ? { team: r.team } : {}),
    }));

    const resultPayload: RoundResultPayload = {
      roundId: this.roundId,
      ranking,
      ...(finalized.teams !== undefined ? { teams: finalized.teams } : {}),
    };
    this.lastResult = resultPayload;

    await this.notifyTransition({
      roundId: this.roundId,
      status: this.status,
      command,
      paused: this.paused,
      endedAt: new Date(this.now()),
      result: resultPayload,
    });
  }

  private applyState(nextState: S | undefined) {
    if (nextState !== undefined) {
      this.state = nextState;
    }
  }

  private syncStateEndsAt(endsAt: number | null) {
    if (isPlainObject(this.state) && 'endsAt' in this.state) {
      this.state = { ...this.state, endsAt } as S;
    }
  }

  private getDurationSec(): number | null {
    if (isPlainObject(this.config) && typeof this.config.durationSec === 'number') {
      return this.config.durationSec;
    }
    return null;
  }

  private getMinInputIntervalMs(): number {
    if (isPlainObject(this.config) && typeof this.config.minInputIntervalMs === 'number') {
      return this.config.minInputIntervalMs;
    }
    return DEFAULT_MIN_INPUT_INTERVAL_MS;
  }

  private async notifyTransition(event: RoundTransitionEvent) {
    if (this.onTransition) {
      await this.onTransition(event);
    }
  }
}
