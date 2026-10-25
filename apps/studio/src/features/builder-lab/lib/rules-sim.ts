import type { SimulationResult } from '@playora/core/prize';
import type { LabPrize, LabRules } from '../mock/types';

/**
 * Turns a `SimulationResult` (docs/12 §6.5) into what a shop owner reads: totals, per-day bars,
 * when stock runs out, and plain-language warnings with suggestions. Pure; the panel renders it.
 */

const HOURS_PER_DAY = 24;
/** Leftover share above which we warn "you'll keep most prizes". */
export const LEFTOVER_WARN_RATIO = 0.3;
/** Share of plays blocked by the per-player limit above which we mention it. */
export const LIMIT_WARN_RATIO = 0.2;

/** Sums `issuedByHour` into simulated days (day 0 = the first 24 hours from `startsAt`). */
export function issuedByDay(issuedByHour: readonly number[]): number[] {
  const days: number[] = [];
  for (let h = 0; h < issuedByHour.length; h++) {
    const d = Math.floor(h / HOURS_PER_DAY);
    days[d] = (days[d] ?? 0) + (issuedByHour[h] ?? 0);
  }
  return days;
}

export interface StockOut {
  /** 1-based campaign day. */
  day: number;
  /** Wall-clock `HH:mm` in the campaign time zone. */
  time: string;
}

export function stockOutAt(
  result: Pick<SimulationResult, 'exhaustedAt' | 'exhaustedAtHour'>,
  timeZone = 'Asia/Ho_Chi_Minh',
): StockOut | null {
  if (result.exhaustedAt === null || result.exhaustedAtHour === null) return null;
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(result.exhaustedAt);
  return { day: Math.floor(result.exhaustedAtHour / HOURS_PER_DAY) + 1, time };
}

export type SimSuggestion =
  | 'turnOnPacing'
  | 'lowerRate'
  | 'raiseRate'
  | 'lowerProbability'
  | 'raiseProbability'
  | 'addStock'
  | 'fewerPrizes'
  | 'longerHours'
  | 'raiseBudget'
  | 'raiseMaxWins';

export interface SimWarning {
  key: 'stockOutEarly' | 'leftover' | 'budgetReached' | 'limitBlocks' | 'noWins' | 'healthy';
  severity: 'warning' | 'info' | 'success';
  values?: Record<string, string | number>;
  suggestions: SimSuggestion[];
}

export interface PrizeLeftover {
  id: string;
  name: string;
  quantity: number;
  issued: number;
  left: number;
}

export interface SimSummary {
  days: number;
  /** Plays that reached the prize engine during opening hours. */
  plays: number;
  /** Plays that arrived outside opening hours / the campaign window. */
  closedPlays: number;
  wins: number;
  /** Wins ÷ plays during opening hours (0..1). */
  winRate: number;
  costVnd: number;
  stock: number;
  leftover: number;
  leftoverRatio: number;
  perDay: number[];
  perPrize: PrizeLeftover[];
  stockOut: StockOut | null;
  warnings: SimWarning[];
}

export function summarizeSimulation(
  result: SimulationResult,
  input: { rules: LabRules; prizes: readonly LabPrize[]; days: number },
): SimSummary {
  const { rules, prizes, days } = input;
  const closedPlays = result.reasons.closed ?? 0;
  const plays = Math.max(0, result.totalPlays - closedPlays);
  const stock = prizes.reduce((sum, p) => sum + Math.max(0, p.quantity), 0);
  const leftover = result.leftover;
  const leftoverRatio = stock > 0 ? leftover / stock : 0;
  const stockOut = stockOutAt(result);
  const perPrize = prizes.map((p) => {
    const left = result.leftoverByPrize[p.id] ?? Math.max(0, p.quantity);
    return {
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      left,
      issued: Math.max(0, p.quantity - left),
    };
  });

  const warnings: SimWarning[] = [];
  const isOverall = rules.mode === 'overall_win_rate';
  const isPerPrize = rules.mode === 'per_prize_probability';

  if (result.totalWins === 0 && plays > 0 && stock > 0) {
    warnings.push({
      key: 'noWins',
      severity: 'warning',
      suggestions: [
        ...(isOverall ? (['raiseRate'] as const) : []),
        ...(isPerPrize ? (['raiseProbability'] as const) : []),
        ...(rules.budgetVnd !== null ? (['raiseBudget'] as const) : []),
      ],
    });
  } else if (stockOut && stockOut.day < days) {
    warnings.push({
      key: 'stockOutEarly',
      severity: 'warning',
      values: { day: stockOut.day, time: stockOut.time, days },
      suggestions: [
        ...(!rules.pacing ? (['turnOnPacing'] as const) : []),
        ...(isOverall ? (['lowerRate'] as const) : []),
        ...(isPerPrize ? (['lowerProbability'] as const) : []),
        'addStock',
      ],
    });
  } else if (stock > 0 && leftoverRatio > LEFTOVER_WARN_RATIO) {
    warnings.push({
      key: 'leftover',
      severity: 'info',
      values: { percent: Math.round(leftoverRatio * 100), count: leftover },
      suggestions: [
        ...(isOverall ? (['raiseRate'] as const) : []),
        ...(isPerPrize ? (['raiseProbability'] as const) : []),
        ...(rules.openingHours ? (['longerHours'] as const) : []),
        'fewerPrizes',
      ],
    });
  }

  if ((result.reasons.budget ?? 0) > 0) {
    warnings.push({ key: 'budgetReached', severity: 'info', suggestions: ['raiseBudget'] });
  }
  if (plays > 0 && (result.reasons.limit ?? 0) / plays > LIMIT_WARN_RATIO) {
    warnings.push({
      key: 'limitBlocks',
      severity: 'info',
      values: { percent: Math.round(((result.reasons.limit ?? 0) / plays) * 100) },
      suggestions: ['raiseMaxWins'],
    });
  }
  if (warnings.length === 0 && stock > 0 && plays > 0) {
    warnings.push({
      key: 'healthy',
      severity: 'success',
      values: { percent: Math.round(leftoverRatio * 100) },
      suggestions: [],
    });
  }

  return {
    days,
    plays,
    closedPlays,
    wins: result.totalWins,
    winRate: plays > 0 ? result.totalWins / plays : 0,
    costVnd: result.totalValue,
    stock,
    leftover,
    leftoverRatio,
    perDay: issuedByDay(result.issuedByHour),
    perPrize,
    stockOut,
    warnings,
  };
}
