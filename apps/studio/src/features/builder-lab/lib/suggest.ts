import type { CampaignPrize, CampaignRules } from '@playora/contracts';
import { simulate, toPrizeRules } from '@playora/core/prize';
import { presetSrc } from '@/features/canvas-editor/lib/model';
import {
  daysBetween,
  openDayCount,
  type PlaybookKey,
  type PlaybookSetup,
  playbookRules,
} from './playbooks';
import { CAFE_TRAFFIC_SHAPE } from './rules-sim';

/**
 * Prize-mix suggestion for a playbook (docs/product/specs/playbooks.md §2.2). Pure:
 *
 * 1. Quantities `q_i = floor(B × w_i / c_i)` with weights normalised, so `Σ q_i × c_i ≤ B`.
 * 2. The win rate is the highest one for which the prize engine's own `simulate()` (N guests/day ×
 *    D days, café traffic shape, pacing off as the worst case) runs out of stock before 90% of the
 *    open days in at most 10% of seeded runs. Found by bisection over the same seeds each step.
 */

export const MIN_WIN_RATE = 0.01;
export const MAX_WIN_RATE = 0.8;
/** Share of the campaign that must be covered before stock may run out. */
export const COVER_SHARE = 0.9;
/** Acceptable chance of running out before `COVER_SHARE` of the campaign. */
export const MAX_EXHAUST_RISK = 0.1;
const SEEDS = 10;
const BISECT_STEPS = 7;
/** Simulated plays per run are capped by scaling traffic and stock together (keeps it < 300 ms). */
export const MAX_SIM_PLAYS = 4_000;

/** `q_i = floor(B × w_i / c_i)`, never exceeding the budget in total. */
export function prizeQuantities(
  budgetVnd: number,
  items: readonly { costVnd: number; weight: number }[],
): number[] {
  const budget = Math.max(0, Math.floor(budgetVnd));
  const weights = items.map((p) => Math.max(0, p.weight));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const share = (i: number) =>
    totalWeight > 0 ? (weights[i] ?? 0) / totalWeight : 1 / Math.max(1, items.length);
  const qty = items.map((p, i) =>
    p.costVnd > 0 ? Math.max(0, Math.floor((budget * share(i)) / p.costVnd + 1e-9)) : 0,
  );
  // Floating-point guard: trim the dearest prize until the total fits the budget.
  let cost = qty.reduce((sum, q, i) => sum + q * (items[i]?.costVnd ?? 0), 0);
  while (cost > budget) {
    let dearest = -1;
    qty.forEach((q, i) => {
      if (q > 0 && (dearest < 0 || (items[i]?.costVnd ?? 0) > (items[dearest]?.costVnd ?? 0)))
        dearest = i;
    });
    if (dearest < 0) break;
    qty[dearest] = (qty[dearest] ?? 0) - 1;
    cost -= items[dearest]?.costVnd ?? 0;
  }
  return qty;
}

export interface RiskInput {
  rules: CampaignRules;
  prizes: readonly CampaignPrize[];
  guestsPerDay: number;
  /** Calendar days from `rules.startsAt` (local midnight). */
  days: number;
  seed?: string;
  seeds?: number;
}

/** Hour by which `COVER_SHARE` of the open days have passed (stock may run out after it). */
export function coverHour(days: number, startWeekday: number, openDays: number[] | null): number {
  const open: number[] = [];
  for (let d = 0; d < days; d++)
    if (!openDays || openDays.includes((startWeekday + d) % 7)) open.push(d);
  if (open.length === 0) return days * 24;
  const index = Math.min(open.length - 1, Math.floor(COVER_SHARE * open.length));
  // Every day open: exactly 90% of the hours; otherwise the start of the first open day past 90%.
  return openDays ? (open[index] ?? days) * 24 : COVER_SHARE * days * 24;
}

interface SimPlan {
  rules: CampaignRules;
  prizes: CampaignPrize[];
  traffic: number[];
  players: number;
  days: number;
  coverHour: number;
}

function plan(input: RiskInput): SimPlan {
  const { rules, guestsPerDay, days } = input;
  const plays = guestsPerDay * rules.playsPerDay * days;
  const scale = plays > MAX_SIM_PLAYS ? MAX_SIM_PLAYS / plays : 1;
  const guests = guestsPerDay * scale;
  const startWeekday = new Date(Date.parse(rules.startsAt) + 7 * 3_600_000).getUTCDay();
  return {
    // Worst case: no pacing to hold stock back, no budget stop (quantities already fit it).
    rules: { ...rules, pacing: false, budgetVnd: null, mode: 'overall_win_rate' },
    prizes: input.prizes.map((p) => ({
      ...p,
      quantity: p.quantity > 0 ? Math.max(1, Math.round(p.quantity * scale)) : 0,
    })),
    traffic: CAFE_TRAFFIC_SHAPE.map((share) => share * guests * rules.playsPerDay),
    players: Math.max(1, Math.round(guests * Math.min(days, 7))),
    days,
    coverHour: coverHour(days, startWeekday, rules.openDays),
  };
}

/** Share of seeded runs that run out of stock before the cover hour at `rate`. */
function riskAt(p: SimPlan, rate: number, seed: string, seeds: number, stopAfter: number): number {
  const engine = toPrizeRules({ ...p.rules, overallWinRate: rate }, p.prizes, { rehearsal: false });
  let failures = 0;
  for (let k = 0; k < seeds; k++) {
    const result = simulate({
      rules: engine,
      traffic: p.traffic,
      players: p.players,
      days: p.days,
      seed: `${seed}:${k}`,
    });
    if (result.exhaustedAtHour !== null && result.exhaustedAtHour < p.coverHour) failures++;
    if (failures > stopAfter) break;
  }
  return failures / seeds;
}

export function exhaustionRisk(input: RiskInput, rate: number): number {
  const seeds = input.seeds ?? SEEDS;
  return riskAt(plan(input), rate, input.seed ?? 'playbook', seeds, seeds);
}

export interface WinRatePick {
  rate: number;
  risk: number;
  /** Even the lowest rate runs out early: too few prizes for this traffic. */
  tooFewPrizes: boolean;
}

/** Highest win rate whose early stock-out risk is ≤ `MAX_EXHAUST_RISK`. */
export function suggestWinRate(input: RiskInput): WinRatePick {
  const p = plan(input);
  const seeds = input.seeds ?? SEEDS;
  const seed = input.seed ?? 'playbook';
  const allowed = Math.floor(MAX_EXHAUST_RISK * seeds + 1e-9);
  const ok = (rate: number) => riskAt(p, rate, seed, seeds, allowed) * seeds <= allowed;

  if (p.prizes.every((x) => x.quantity <= 0))
    return { rate: MIN_WIN_RATE, risk: 0, tooFewPrizes: true };
  if (ok(MAX_WIN_RATE)) {
    return {
      rate: MAX_WIN_RATE,
      risk: riskAt(p, MAX_WIN_RATE, seed, seeds, seeds),
      tooFewPrizes: false,
    };
  }
  if (!ok(MIN_WIN_RATE)) {
    return {
      rate: MIN_WIN_RATE,
      risk: riskAt(p, MIN_WIN_RATE, seed, seeds, seeds),
      tooFewPrizes: true,
    };
  }
  let lo = MIN_WIN_RATE;
  let hi = MAX_WIN_RATE;
  for (let i = 0; i < BISECT_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  const rate = Math.max(MIN_WIN_RATE, Math.floor(lo * 100) / 100);
  return { rate, risk: riskAt(p, rate, seed, seeds, seeds), tooFewPrizes: false };
}

export interface PlaybookSuggestion {
  prizes: CampaignPrize[];
  rules: CampaignRules;
  totalPrizes: number;
  totalCostVnd: number;
  /** Calendar days and days the game is open. */
  days: number;
  openDays: number;
  /** Plays expected over the campaign (guests × plays/day × open days). */
  expectedPlays: number;
  winRate: number;
  /** "1 in N guests wins". */
  oneIn: number;
  risk: number;
  tooFewPrizes: boolean;
}

/** Quantities, rules and win rate for a playbook setup, plus the numbers the sentence needs. */
export function suggestPlaybook(
  key: PlaybookKey,
  setup: PlaybookSetup,
  opts: { seed?: string; seeds?: number } = {},
): PlaybookSuggestion {
  const quantities = prizeQuantities(setup.budgetVnd, setup.prizes);
  const prizes: CampaignPrize[] = setup.prizes.map((p, i) => ({
    id: `p${i + 1}`,
    name: p.name.trim(),
    image: presetSrc(p.image ?? 'gift'),
    quantity: quantities[i] ?? 0,
    valueVnd: Math.round(p.costVnd),
  }));
  const days = Math.max(1, daysBetween(setup.startDate, setup.endDate));
  const open = openDayCount(setup.startDate, setup.endDate, setup.openDays);
  const baseRules = playbookRules(key, setup);
  const pick = suggestWinRate({
    rules: baseRules,
    prizes,
    guestsPerDay: Math.max(1, setup.guestsPerDay),
    days,
    seed: opts.seed ?? key,
    seeds: opts.seeds,
  });
  return {
    prizes,
    rules: { ...baseRules, overallWinRate: pick.rate },
    totalPrizes: quantities.reduce((a, b) => a + b, 0),
    totalCostVnd: prizes.reduce((sum, p) => sum + p.quantity * p.valueVnd, 0),
    days,
    openDays: open,
    expectedPlays: Math.round(setup.guestsPerDay * baseRules.playsPerDay * open),
    winRate: pick.rate,
    oneIn: Math.max(1, Math.round(1 / pick.rate)),
    risk: pick.risk,
    tooFewPrizes: pick.tooFewPrizes,
  };
}
