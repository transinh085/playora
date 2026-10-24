import { decide, getPrizeRemaining } from './decide';
import { getLocalWallTime } from './schedule';
import type { DecisionReason, PrizeRules, PrizeRulesInput, PrizeSnapshot } from './schemas';

const MS_PER_HOUR = 3_600_000;

/**
 * Deterministic 32-bit Mulberry32 PRNG returning floats in `[0, 1)`.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeedString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createSeededRng(seed: number | string): () => number {
  const numericSeed = typeof seed === 'number' ? seed >>> 0 : hashSeedString(seed);
  return mulberry32(numericSeed);
}

export interface SimulateInput {
  rules: PrizeRules | PrizeRulesInput;
  /**
   * Arrivals per hour profile (e.g. a 24-hour daily profile repeated across `days`,
   * a full `days * 24` array, or a single steady number of arrivals per hour).
   */
  traffic: readonly number[] | number;
  /** Number of distinct simulated players in the pool. */
  players: number;
  /** Campaign duration in days (defaults to window duration if omitted). */
  days?: number | undefined;
  /** Seed for deterministic simulation. */
  seed: number | string;
}

export interface SimulationResult {
  /** Number of prizes issued during each hour of the simulation. */
  issuedByHour: number[];
  /** Total remaining stock at the end of each hour of the simulation. */
  remainingByHour: number[];
  /** Total remaining stock across all prizes at the end of the simulation. */
  leftover: number;
  /** Remaining stock per prize ID at the end of the simulation. */
  leftoverByPrize: Record<string, number>;
  /** Timestamp when total remaining stock first reached 0, or `null` if never exhausted. */
  exhaustedAt: Date | null;
  /** Hour index (`0..totalHours-1`) when stock reached 0, or `null` if never exhausted. */
  exhaustedAtHour: number | null;
  /** Ratio of winning plays to total plays (`0..1`). */
  effectiveWinRate: number;
  /** Total VND value of all prizes issued during the simulation. */
  totalValue: number;
  /** Total play decisions executed. */
  totalPlays: number;
  /** Total winning decisions (`sum(issuedByHour)`). */
  totalWins: number;
  /** Decision counts grouped by reason. */
  reasons: Record<DecisionReason, number>;
}

function toTimestampMs(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return new Date(value).getTime();
}

/**
 * Simulates a campaign across `days` with the given hourly `traffic` arrival profile
 * and `players` pool using a deterministic seeded PRNG (`mulberry32`).
 */
export function simulate({ rules, traffic, players, days, seed }: SimulateInput): SimulationResult {
  const rng = createSeededRng(seed);
  const startsAtMs = toTimestampMs(rules.window.startsAt);
  const windowEndsAtMs = toTimestampMs(rules.window.endsAt);
  const timeZone = rules.window.timezone ?? 'Asia/Ho_Chi_Minh';

  const totalHours =
    days !== undefined
      ? Math.max(1, Math.round(days * 24))
      : Math.max(1, Math.round((windowEndsAtMs - startsAtMs) / MS_PER_HOUR));

  const playerCount = Math.max(1, Math.floor(players));

  // Build mutable simulation state
  const remainingByPrize: Record<string, number> = {};
  const valueByPrize: Record<string, number> = {};
  let totalRemaining = 0;

  for (const prize of rules.prizes) {
    const rem = getPrizeRemaining(prize, { remainingByPrize: {} });
    remainingByPrize[prize.id] = rem;
    valueByPrize[prize.id] = prize.valueVnd ?? 0;
    totalRemaining += rem;
  }

  // Per-player award counters (allocated lazily on win to keep memory tiny even for 100k+ players)
  const playerTotalAwards = new Uint32Array(playerCount);
  const playerTodayAwards = new Uint32Array(playerCount);
  const playerLastWinDay = new Int32Array(playerCount).fill(-1);
  const playerByPrizeMap = new Map<number, Record<string, number>>();

  const issuedByHour = new Array<number>(totalHours).fill(0);
  const remainingByHour = new Array<number>(totalHours).fill(0);
  const reasons: Record<DecisionReason, number> = {
    win: 0,
    lose: 0,
    out_of_stock: 0,
    limit: 0,
    budget: 0,
    paced: 0,
    closed: 0,
  };

  let issuedTotal = 0;
  let budgetUsedVnd = 0;
  let totalPlays = 0;
  let totalWins = 0;
  let exhaustedAt: Date | null = totalRemaining === 0 ? new Date(startsAtMs) : null;
  let exhaustedAtHour: number | null = totalRemaining === 0 ? 0 : null;

  const emptyByPrize: Record<string, number> = {};
  const reusablePlayerAwards = {
    total: 0,
    today: 0,
    byPrize: emptyByPrize,
  };
  const reusableSnapshot: PrizeSnapshot = {
    remainingByPrize,
    issuedTotal: 0,
    budgetUsedVnd: 0,
    playerAwards: reusablePlayerAwards,
  };
  const reusableNow = new Date(startsAtMs);

  const trafficIsArray = Array.isArray(traffic);
  const trafficArray = trafficIsArray ? (traffic as readonly number[]) : null;
  const trafficScalar = typeof traffic === 'number' ? traffic : 0;

  for (let h = 0; h < totalHours; h++) {
    const rawArrivals =
      trafficArray !== null
        ? trafficArray.length > 0
          ? (trafficArray[h % trafficArray.length] ?? 0)
          : 0
        : trafficScalar;
    const arrivals = Math.max(0, Math.round(rawArrivals));
    const hourStartMs = startsAtMs + h * MS_PER_HOUR;
    const currentLocalDay = getLocalWallTime(hourStartMs, timeZone).localDayIndex;

    let hourWins = 0;

    for (let a = 0; a < arrivals; a++) {
      const playTimestampMs = hourStartMs + Math.floor(((a + 0.5) / arrivals) * MS_PER_HOUR);
      reusableNow.setTime(playTimestampMs);

      const playerIdx = Math.floor(rng() * playerCount);
      const pTotal = playerTotalAwards[playerIdx] ?? 0;
      const pToday =
        playerLastWinDay[playerIdx] === currentLocalDay ? (playerTodayAwards[playerIdx] ?? 0) : 0;
      const pByPrize = playerByPrizeMap.get(playerIdx) ?? emptyByPrize;

      reusablePlayerAwards.total = pTotal;
      reusablePlayerAwards.today = pToday;
      reusablePlayerAwards.byPrize = pByPrize;
      reusableSnapshot.issuedTotal = issuedTotal;
      reusableSnapshot.budgetUsedVnd = budgetUsedVnd;

      const decision = decide({
        rules,
        snapshot: reusableSnapshot,
        now: reusableNow,
        rng,
      });

      totalPlays++;
      reasons[decision.reason]++;

      if (decision.reason === 'win' && decision.prizeId !== null) {
        const prizeId = decision.prizeId;
        const prevRem = remainingByPrize[prizeId] ?? 0;
        if (prevRem > 0) {
          remainingByPrize[prizeId] = prevRem - 1;
          totalRemaining--;
          issuedTotal++;
          hourWins++;
          totalWins++;
          budgetUsedVnd += valueByPrize[prizeId] ?? 0;

          playerTotalAwards[playerIdx] = pTotal + 1;
          playerTodayAwards[playerIdx] = pToday + 1;
          playerLastWinDay[playerIdx] = currentLocalDay;

          let playerPrizeCounts = playerByPrizeMap.get(playerIdx);
          if (!playerPrizeCounts) {
            playerPrizeCounts = {};
            playerByPrizeMap.set(playerIdx, playerPrizeCounts);
          }
          playerPrizeCounts[prizeId] = (playerPrizeCounts[prizeId] ?? 0) + 1;

          if (totalRemaining === 0 && exhaustedAt === null) {
            exhaustedAt = new Date(playTimestampMs);
            exhaustedAtHour = h;
          }
        }
      }
    }

    issuedByHour[h] = hourWins;
    remainingByHour[h] = totalRemaining;
  }

  const effectiveWinRate = totalPlays > 0 ? totalWins / totalPlays : 0;

  return {
    issuedByHour,
    remainingByHour,
    leftover: totalRemaining,
    leftoverByPrize: { ...remainingByPrize },
    exhaustedAt,
    exhaustedAtHour,
    effectiveWinRate,
    totalValue: budgetUsedVnd,
    totalPlays,
    totalWins,
    reasons,
  };
}
