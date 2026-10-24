import { isOpenAt, openFraction } from './schedule';
import type {
  DecisionResult,
  PrizeLimits,
  PrizeRuleItem,
  PrizeRuleItemInput,
  PrizeRules,
  PrizeRulesInput,
  PrizeSnapshot,
  PrizeSnapshotInput,
} from './schemas';

const PACING_EPSILON = 1e-9;
const MIN_SMOOTHING_FACTOR = 0.05;
const MAX_SMOOTHING_FACTOR = 10;
const BEHIND_PLAN_GAIN = 20;

function getSortedPrizes(prizes: readonly PrizeRuleItemInput[]): readonly PrizeRuleItemInput[] {
  if (prizes.length <= 1) return prizes;

  let needsSort = false;
  let prevOrder = prizes[0]?.sortOrder ?? 0;
  for (let i = 1; i < prizes.length; i++) {
    const order = prizes[i]?.sortOrder ?? 0;
    if (order < prevOrder) {
      needsSort = true;
      break;
    }
    prevOrder = order;
  }

  return needsSort ? [...prizes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : prizes;
}

export function getPrizeRemaining(
  prize: PrizeRuleItem | PrizeRuleItemInput,
  snapshot: PrizeSnapshot | PrizeSnapshotInput,
): number {
  const fromMap = snapshot.remainingByPrize?.[prize.id];
  const raw = fromMap !== undefined ? fromMap : (prize.remaining ?? prize.quantity);
  return Math.max(0, Math.floor(raw));
}

function getPerPrizeLimit(prizeId: string, limits: PrizeLimits | undefined): number | undefined {
  const perPrize = limits?.perPrizePerPlayer;
  if (perPrize === undefined) return undefined;
  if (typeof perPrize === 'number') return perPrize;
  return perPrize[prizeId];
}

function sampleUnitRng(rng: () => number): number {
  const value = rng();
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1 - Number.EPSILON;
  return value;
}

function chooseWeightedByRemaining(
  prizes: readonly PrizeRuleItemInput[],
  snapshot: PrizeSnapshot | PrizeSnapshotInput,
  rng: () => number,
): PrizeRuleItemInput | null {
  if (prizes.length === 0) return null;

  let totalWeight = 0;
  for (const prize of prizes) {
    const rem = getPrizeRemaining(prize, snapshot);
    if (rem > 0) {
      totalWeight += rem;
    }
  }
  if (totalWeight <= 0) return null;

  let threshold = sampleUnitRng(rng) * totalWeight;
  let lastEligible: PrizeRuleItemInput | null = null;

  for (const prize of prizes) {
    const rem = getPrizeRemaining(prize, snapshot);
    if (rem <= 0) continue;
    lastEligible = prize;
    threshold -= rem;
    if (threshold < 0) {
      return prize;
    }
  }
  return lastEligible;
}

export interface SmoothingInput {
  totalQuantity: number;
  issued: number;
  elapsedFraction: number;
  buffer: number;
}

/**
 * Computes the adaptive probability multiplier for `time_uniform` pacing with `smoothing: true`.
 *
 * Formula:
 * Let:
 *   - `Q` = total initial stock (`totalQuantity`)
 *   - `I` = total prizes issued so far (`issued`)
 *   - `i = I / Q` = actual issued fraction (`0..1`)
 *   - `f` = elapsed fraction of OPEN campaign time (`0..1`)
 *   - `delta = f - i` = normalized plan error (`> 0` behind plan, `< 0` ahead of plan)
 *   - `rho = (1 - i) / max(1 - f, 0.01)` = remaining-stock-to-remaining-time burn ratio
 *
 * When behind plan (`delta >= 0`):
 *   `multiplier = clamp(rho * (1 + K_up * delta), MIN_SMOOTHING_FACTOR, MAX_SMOOTHING_FACTOR)`
 *   This boosts the effective win probability proportionally to both the accumulated deficit
 *   and the remaining burn rate `rho`, ensuring stock catches up to the plan and is not left over at the end.
 *
 * When ahead of plan (`delta < 0`):
 *   `aheadRatio = (-delta) / max(buffer, 0.05)`
 *   `multiplier = clamp(rho * max(0.05, 1 - 0.9 * aheadRatio), MIN_SMOOTHING_FACTOR, 1)`
 *   This dampens the effective win probability smoothly before hitting the hard buffer cap
 *   `allowed = Q * f * (1 + buffer)`.
 */
export function computeSmoothingFactor({
  totalQuantity,
  issued,
  elapsedFraction,
  buffer,
}: SmoothingInput): number {
  if (totalQuantity <= 0) return 1;

  const f = Math.min(1, Math.max(0, elapsedFraction));
  const i = Math.min(1, Math.max(0, issued / totalQuantity));
  const delta = f - i;
  const remainingTimeFraction = Math.max(0.01, 1 - f);
  const rho = Math.max(0, (1 - i) / remainingTimeFraction);

  if (delta >= 0) {
    const rawUp = rho * (1 + BEHIND_PLAN_GAIN * delta);
    return Math.min(MAX_SMOOTHING_FACTOR, Math.max(1, rawUp));
  }

  const effectiveBuffer = Math.max(buffer, 0.05);
  const aheadRatio = -delta / effectiveBuffer;
  const damping = Math.max(MIN_SMOOTHING_FACTOR, 1 - 0.9 * aheadRatio);
  const rawDown = rho * damping;
  return Math.min(1, Math.max(MIN_SMOOTHING_FACTOR, rawDown));
}

export interface DecideInput {
  rules: PrizeRules | PrizeRulesInput;
  snapshot: PrizeSnapshot | PrizeSnapshotInput;
  now: Date;
  rng: () => number;
}

/**
 * Pure server-side prize decision engine.
 *
 * Evaluation order:
 * 1. `closed` — outside campaign `[startsAt, endsAt]` window or weekly `openingHours`.
 * 2. `paced` — `time_uniform` pacing where `issued >= total * openFraction * (1 + buffer)`.
 * 3. Mode roll (`per_prize_probability` | `overall_win_rate` | `guaranteed`), scaled by `smoothing` if enabled:
 *    - `per_prize_probability`: single RNG roll over cumulative probabilities of all prizes in sortOrder.
 *      If hit prize is eligible (in stock, within player limits, within budget), it wins;
 *      otherwise result is lose with reason `out_of_stock` / `limit` / `budget`.
 *    - `overall_win_rate` / `guaranteed`: pool filtered by stock, limits, budget, then rolled / weighted by remaining.
 */
export function decide({ rules, snapshot, now, rng }: DecideInput): DecisionResult {
  // 1. Campaign window & opening hours check
  if (!isOpenAt(rules.window, rules.openingHours, now)) {
    return { prizeId: null, reason: 'closed' };
  }

  const sortedPrizes = getSortedPrizes(rules.prizes);

  let totalQuantity = 0;
  let derivedIssuedTotal = 0;

  for (const prize of sortedPrizes) {
    const rem = getPrizeRemaining(prize, snapshot);
    totalQuantity += prize.quantity;
    derivedIssuedTotal += Math.max(0, prize.quantity - rem);
  }

  // 2. Pacing check (`time_uniform`)
  const pacingStrategy = rules.pacing?.strategy ?? 'none';
  let smoothingFactor = 1;

  if (pacingStrategy === 'time_uniform') {
    const buffer = rules.pacing?.buffer ?? 0.1;
    const elapsed = openFraction(rules.window, rules.openingHours, now);
    const issued = snapshot.issuedTotal ?? derivedIssuedTotal;
    const allowed = totalQuantity * elapsed * (1 + buffer);

    if (issued + PACING_EPSILON >= allowed) {
      return { prizeId: null, reason: 'paced' };
    }

    if (rules.pacing?.smoothing) {
      smoothingFactor = computeSmoothingFactor({
        totalQuantity,
        issued,
        elapsedFraction: elapsed,
        buffer,
      });
    }
  }

  const limits = rules.limits;
  const playerAwards = snapshot.playerAwards;
  const playerTotal = playerAwards?.total ?? 0;
  const playerToday = playerAwards?.today ?? 0;
  const playerByPrize = playerAwards?.byPrize;
  const budgetVnd = rules.budgetVnd;
  const budgetUsedVnd = snapshot.budgetUsedVnd ?? 0;

  // 3. Mode-specific prize selection
  switch (rules.mode) {
    case 'per_prize_probability': {
      let scaledSum = 0;
      const scaledProbs: number[] = [];
      for (const prize of sortedPrizes) {
        const scaled = (prize.probability ?? 0) * smoothingFactor;
        scaledProbs.push(scaled);
        scaledSum += scaled;
      }

      if (scaledSum > 1) {
        for (let i = 0; i < scaledProbs.length; i++) {
          const current = scaledProbs[i];
          if (current !== undefined) {
            scaledProbs[i] = current / scaledSum;
          }
        }
        scaledSum = 1;
      }

      if (scaledSum <= 0) {
        return { prizeId: null, reason: 'lose' };
      }

      const u = sampleUnitRng(rng);
      if (u >= scaledSum) {
        return { prizeId: null, reason: 'lose' };
      }

      let cumulative = 0;
      let matchedPrize: PrizeRuleItemInput | null = null;
      for (let i = 0; i < sortedPrizes.length; i++) {
        const prize = sortedPrizes[i];
        const prob = scaledProbs[i] ?? 0;
        if (!prize || prob <= 0) continue;
        cumulative += prob;
        if (u < cumulative || (scaledSum >= 1 && i === sortedPrizes.length - 1)) {
          matchedPrize = prize;
          break;
        }
      }

      if (!matchedPrize) {
        return { prizeId: null, reason: 'lose' };
      }

      // Check matched prize eligibility:
      // 1. Stock check
      const rem = getPrizeRemaining(matchedPrize, snapshot);
      if (rem <= 0) {
        return { prizeId: null, reason: 'out_of_stock' };
      }

      // 2. Limits check
      if (limits?.perPlayerTotal !== undefined && playerTotal >= limits.perPlayerTotal) {
        return { prizeId: null, reason: 'limit' };
      }
      if (limits?.perPlayerPerDay !== undefined && playerToday >= limits.perPlayerPerDay) {
        return { prizeId: null, reason: 'limit' };
      }
      const maxForPrize = getPerPrizeLimit(matchedPrize.id, limits);
      if (maxForPrize !== undefined) {
        const wonOfPrize = playerByPrize?.[matchedPrize.id] ?? 0;
        if (wonOfPrize >= maxForPrize) {
          return { prizeId: null, reason: 'limit' };
        }
      }

      // 3. Budget check
      if (budgetVnd !== undefined) {
        const prizeValue = matchedPrize.valueVnd ?? 0;
        if (budgetUsedVnd >= budgetVnd || budgetUsedVnd + prizeValue > budgetVnd) {
          return { prizeId: null, reason: 'budget' };
        }
      }

      return { prizeId: matchedPrize.id, reason: 'win' };
    }

    case 'overall_win_rate':
    case 'guaranteed': {
      // Stock check (remaining > 0)
      const inStockPrizes: PrizeRuleItemInput[] = [];
      for (const prize of sortedPrizes) {
        const rem = getPrizeRemaining(prize, snapshot);
        if (rem > 0) {
          inStockPrizes.push(prize);
        }
      }

      if (inStockPrizes.length === 0) {
        return { prizeId: null, reason: 'out_of_stock' };
      }

      // Player limits check
      if (limits?.perPlayerTotal !== undefined && playerTotal >= limits.perPlayerTotal) {
        return { prizeId: null, reason: 'limit' };
      }
      if (limits?.perPlayerPerDay !== undefined && playerToday >= limits.perPlayerPerDay) {
        return { prizeId: null, reason: 'limit' };
      }

      const limitEligiblePrizes: PrizeRuleItemInput[] = [];
      for (const prize of inStockPrizes) {
        const maxForPrize = getPerPrizeLimit(prize.id, limits);
        if (maxForPrize !== undefined) {
          const wonOfPrize = playerByPrize?.[prize.id] ?? 0;
          if (wonOfPrize >= maxForPrize) {
            continue;
          }
        }
        limitEligiblePrizes.push(prize);
      }

      if (limitEligiblePrizes.length === 0) {
        return { prizeId: null, reason: 'limit' };
      }

      // Budget check (counting valueVnd)
      let eligiblePrizes = limitEligiblePrizes;

      if (budgetVnd !== undefined) {
        if (budgetUsedVnd >= budgetVnd) {
          return { prizeId: null, reason: 'budget' };
        }
        const affordablePrizes: PrizeRuleItemInput[] = [];
        for (const prize of limitEligiblePrizes) {
          const prizeValue = prize.valueVnd ?? 0;
          if (budgetUsedVnd + prizeValue <= budgetVnd) {
            affordablePrizes.push(prize);
          }
        }
        if (affordablePrizes.length === 0) {
          return { prizeId: null, reason: 'budget' };
        }
        eligiblePrizes = affordablePrizes;
      }

      if (rules.mode === 'overall_win_rate') {
        const baseRate = rules.overallWinRate ?? 0;
        const effectiveRate = Math.min(1, Math.max(0, baseRate * smoothingFactor));
        if (effectiveRate <= 0 || sampleUnitRng(rng) >= effectiveRate) {
          return { prizeId: null, reason: 'lose' };
        }
      }

      const chosen = chooseWeightedByRemaining(eligiblePrizes, snapshot, rng);
      if (!chosen) {
        return { prizeId: null, reason: 'out_of_stock' };
      }
      return { prizeId: chosen.id, reason: 'win' };
    }
  }
}
