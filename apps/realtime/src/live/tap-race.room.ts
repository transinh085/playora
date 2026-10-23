import type { RoundStatus } from '@playora/contracts';
import { z } from 'zod';

/**
 * M0 spike room (S0-3 / S0-4): one shake/tap race per event, kept in memory.
 * In M1 this is replaced by RoundRunner + the `shake-race` template's LiveServerModule.
 */

export const TapInput = z.object({ d: z.number().int().min(0).max(64) });

/** Max counted shakes/taps per input window (250 ms) — ~32/s, faster than any human. */
export const MAX_DELTA_PER_INPUT = 8;
const MIN_INPUT_INTERVAL_MS = 200;
const TOP_N = 10;

interface Racer {
  id: string;
  name: string;
  team: string;
  score: number;
  lastInputAt: number;
}

export interface ScreenView {
  status: RoundStatus;
  online: number;
  endsAt: number | null;
  top: Array<{ id: string; name: string; team: string; score: number }>;
  teams: Array<{ team: string; score: number }>;
  serverTs: number;
}

export interface PlayerView {
  status: RoundStatus;
  endsAt: number | null;
  score: number;
  rank: number;
  teamScore: number;
  serverTs: number;
}

export class TapRaceRoom {
  status: RoundStatus = 'lobby';
  endsAt: number | null = null;
  private readonly racers = new Map<string, Racer>();

  join(id: string, name: string, team: string) {
    const existing = this.racers.get(id);
    if (existing) return existing;
    const racer = { id, name, team, score: 0, lastInputAt: 0 };
    this.racers.set(id, racer);
    return racer;
  }

  leave(id: string) {
    // Scores survive disconnects; only lobby leavers are dropped.
    if (this.status === 'lobby') this.racers.delete(id);
  }

  get online() {
    return this.racers.size;
  }

  start(durationMs: number, now = Date.now()) {
    for (const racer of this.racers.values()) racer.score = 0;
    this.status = 'playing';
    this.endsAt = now + durationMs;
  }

  /** Returns false when the input was dropped (not playing, too frequent, unknown racer). */
  input(id: string, delta: number, now = Date.now()): boolean {
    const racer = this.racers.get(id);
    if (!racer || this.status !== 'playing') return false;
    if (now - racer.lastInputAt < MIN_INPUT_INTERVAL_MS) return false;
    racer.lastInputAt = now;
    racer.score += Math.min(delta, MAX_DELTA_PER_INPUT);
    return true;
  }

  /** Ends the round when its time is up. Returns true on the transition. */
  tick(now = Date.now()): boolean {
    if (this.status === 'playing' && this.endsAt !== null && now >= this.endsAt) {
      this.status = 'result';
      return true;
    }
    return false;
  }

  reset() {
    this.status = 'lobby';
    this.endsAt = null;
    for (const racer of this.racers.values()) racer.score = 0;
  }

  private ranked() {
    return [...this.racers.values()].sort((a, b) => b.score - a.score);
  }

  private teamTotals() {
    const totals = new Map<string, number>();
    for (const r of this.racers.values()) totals.set(r.team, (totals.get(r.team) ?? 0) + r.score);
    return [...totals].map(([team, score]) => ({ team, score })).sort((a, b) => b.score - a.score);
  }

  screenView(now = Date.now()): ScreenView {
    return {
      status: this.status,
      online: this.online,
      endsAt: this.endsAt,
      top: this.ranked()
        .slice(0, TOP_N)
        .map(({ id, name, team, score }) => ({ id, name, team, score })),
      teams: this.teamTotals(),
      serverTs: now,
    };
  }

  /** Player views for everyone at once, so ranking is computed once per broadcast. */
  playerViews(now = Date.now()): Map<string, PlayerView> {
    const teams = new Map(this.teamTotals().map((t) => [t.team, t.score]));
    const views = new Map<string, PlayerView>();
    this.ranked().forEach((racer, index) => {
      views.set(racer.id, {
        status: this.status,
        endsAt: this.endsAt,
        score: racer.score,
        rank: index + 1,
        teamScore: teams.get(racer.team) ?? 0,
        serverTs: now,
      });
    });
    return views;
  }
}
