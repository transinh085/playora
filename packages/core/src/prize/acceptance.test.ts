import { describe, expect, test } from 'bun:test';
import type { CampaignPrize, CampaignRulesInput } from '@playora/contracts';
import {
  createSeededRng,
  type DecisionReason,
  decide,
  getLocalWallTime,
  isOpenAt,
  openFraction,
  PrizeRules,
  toPrizeRules,
} from './index';

/**
 * M1 Prize Engine Acceptance Suite (docs/product/specs/prizes-redemption.md §9, docs/product/prd.md §7.3).
 *
 * Default run executes 1,000,000 simulated plays across 4 campaign rule sets (250,000 plays each)
 * with 50,000 players and 50 concurrent player streams. Setting `PRIZE_SIM_FULL=1` scales each
 * rule set to 1,000,000 plays (4,000,000 plays total).
 */
const IS_FULL_SIM = Boolean(
  process.env.PRIZE_SIM_FULL &&
    process.env.PRIZE_SIM_FULL !== '0' &&
    process.env.PRIZE_SIM_FULL !== 'false',
);
const PLAYS_PER_CASE = IS_FULL_SIM ? 1_000_000 : 250_000;
const PLAYER_POOL_SIZE = 50_000;
const CONCURRENT_STREAMS = 50;

interface PacingCheckpoint {
  tenth: number;
  openFrac: number;
  issued: number;
  remaining: number;
  plannedIssued: number;
  plannedRemaining: number;
}

interface AcceptanceRunSummary {
  totalPlays: number;
  issuedTotal: number;
  totalInitialStock: number;
  budgetUsedVnd: number;
  remainingByPrize: Record<string, number>;
  issuedByPrize: Record<string, number>;
  reasons: Record<DecisionReason, number>;
  maxPlayerTotalWins: number;
  maxPlayerDailyWins: number;
  stockOverIssueViolations: number;
  budgetOverrunViolations: number;
  playerLimitViolations: number;
  closedHourWinViolations: number;
  checkpoints: PacingCheckpoint[];
}

function runCampaignAcceptanceSimulation(input: {
  campaignRules: CampaignRulesInput;
  campaignPrizes: readonly CampaignPrize[];
  plays?: number;
  playerPoolSize?: number;
  streams?: number;
  seed: string;
  extraLimits?: {
    perPlayerPerDay?: number;
    perPrizePerPlayer?: number | Record<string, number>;
  };
  sampleCheckpoints?: boolean;
}): AcceptanceRunSummary {
  const plays = input.plays ?? PLAYS_PER_CASE;
  const playerPoolSize = input.playerPoolSize ?? PLAYER_POOL_SIZE;
  const streams = input.streams ?? CONCURRENT_STREAMS;
  const timeZone = 'Asia/Ho_Chi_Minh';

  const baseRulesInput = toPrizeRules(input.campaignRules, input.campaignPrizes, {
    rehearsal: false,
    timezone: timeZone,
  });

  if (input.extraLimits) {
    baseRulesInput.limits = {
      ...baseRulesInput.limits,
      ...input.extraLimits,
    };
  }

  // Validate with PrizeRules schema to guarantee contract -> engine compatibility
  const parsedRules = PrizeRules.parse(baseRulesInput);

  const fallbackRng = createSeededRng(`${input.seed}:fallback`);
  // Create one deterministic PRNG per concurrent stream
  const streamRngs = Array.from({ length: streams }, (_, s) =>
    createSeededRng(`${input.seed}:stream:${s}`),
  );

  const startsAtMs = parsedRules.window.startsAt.getTime();
  const endsAtMs = parsedRules.window.endsAt.getTime();
  const durationMs = endsAtMs - startsAtMs;

  const remainingByPrize: Record<string, number> = {};
  const issuedByPrize: Record<string, number> = {};
  const quantityByPrize: Record<string, number> = {};
  const valueByPrize: Record<string, number> = {};
  let totalInitialStock = 0;

  for (const prize of parsedRules.prizes) {
    remainingByPrize[prize.id] = prize.quantity;
    issuedByPrize[prize.id] = 0;
    quantityByPrize[prize.id] = prize.quantity;
    valueByPrize[prize.id] = prize.valueVnd ?? 0;
    totalInitialStock += prize.quantity;
  }

  const playerTotalWins = new Uint32Array(playerPoolSize);
  const playerTodayWins = new Uint32Array(playerPoolSize);
  const playerLastWinDay = new Int32Array(playerPoolSize).fill(-1);
  const playerByPrizeMap = new Map<number, Record<string, number>>();

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
  let maxPlayerTotalWins = 0;
  let maxPlayerDailyWins = 0;
  let stockOverIssueViolations = 0;
  let budgetOverrunViolations = 0;
  let playerLimitViolations = 0;
  let closedHourWinViolations = 0;

  const emptyByPrize: Record<string, number> = {};
  const reusablePlayerAwards = {
    total: 0,
    today: 0,
    byPrize: emptyByPrize,
  };
  const reusableSnapshot = {
    remainingByPrize,
    issuedTotal: 0,
    budgetUsedVnd: 0,
    playerAwards: reusablePlayerAwards,
  };
  const reusableNow = new Date(startsAtMs);

  const maxTotalLimit = parsedRules.limits.perPlayerTotal;
  const maxDailyLimit = parsedRules.limits.perPlayerPerDay;
  const perPrizeLimit = parsedRules.limits.perPrizePerPlayer;
  const budgetVnd = parsedRules.budgetVnd;

  const checkpoints: PacingCheckpoint[] = [];
  let nextCheckpointTenth = 1;

  for (let i = 0; i < plays; i++) {
    const streamRng = streamRngs[i % streams] ?? fallbackRng;
    const nowMs = startsAtMs + Math.floor(((i + 0.5) / plays) * durationMs);
    reusableNow.setTime(nowMs);

    const localDay = getLocalWallTime(nowMs, timeZone).localDayIndex;
    const playerId = Math.floor(streamRng() * playerPoolSize);

    const pTotal = playerTotalWins[playerId] ?? 0;
    const pToday = playerLastWinDay[playerId] === localDay ? (playerTodayWins[playerId] ?? 0) : 0;
    const pByPrize = playerByPrizeMap.get(playerId) ?? emptyByPrize;

    reusablePlayerAwards.total = pTotal;
    reusablePlayerAwards.today = pToday;
    reusablePlayerAwards.byPrize = pByPrize;
    reusableSnapshot.issuedTotal = issuedTotal;
    reusableSnapshot.budgetUsedVnd = budgetUsedVnd;

    const decision = decide({
      rules: parsedRules,
      snapshot: reusableSnapshot,
      now: reusableNow,
      rng: streamRng,
    });

    reasons[decision.reason]++;

    if (decision.reason === 'win') {
      const prizeId = decision.prizeId;
      if (prizeId === null || remainingByPrize[prizeId] === undefined) {
        stockOverIssueViolations++;
      } else {
        const remBefore = remainingByPrize[prizeId] ?? 0;
        if (remBefore <= 0) {
          stockOverIssueViolations++;
        }

        // Server-side atomic stock decrement & issued increment
        const remAfter = remBefore - 1;
        remainingByPrize[prizeId] = remAfter;
        const nextIssuedForPrize = (issuedByPrize[prizeId] ?? 0) + 1;
        issuedByPrize[prizeId] = nextIssuedForPrize;
        issuedTotal++;

        if (remAfter < 0 || nextIssuedForPrize > (quantityByPrize[prizeId] ?? 0)) {
          stockOverIssueViolations++;
        }

        // Server-side budget accumulation
        const prizeValue = valueByPrize[prizeId] ?? 0;
        budgetUsedVnd += prizeValue;
        if (budgetVnd !== undefined && budgetUsedVnd > budgetVnd) {
          budgetOverrunViolations++;
        }

        // Server-side per-player award counters
        const nextPlayerTotal = pTotal + 1;
        const nextPlayerToday = pToday + 1;
        playerTotalWins[playerId] = nextPlayerTotal;
        playerTodayWins[playerId] = nextPlayerToday;
        playerLastWinDay[playerId] = localDay;

        let playerPrizeRecord = playerByPrizeMap.get(playerId);
        if (!playerPrizeRecord) {
          playerPrizeRecord = {};
          playerByPrizeMap.set(playerId, playerPrizeRecord);
        }
        const nextPlayerPrizeCount = (playerPrizeRecord[prizeId] ?? 0) + 1;
        playerPrizeRecord[prizeId] = nextPlayerPrizeCount;

        if (nextPlayerTotal > maxPlayerTotalWins) {
          maxPlayerTotalWins = nextPlayerTotal;
        }
        if (nextPlayerToday > maxPlayerDailyWins) {
          maxPlayerDailyWins = nextPlayerToday;
        }

        if (maxTotalLimit !== undefined && nextPlayerTotal > maxTotalLimit) {
          playerLimitViolations++;
        }
        if (maxDailyLimit !== undefined && nextPlayerToday > maxDailyLimit) {
          playerLimitViolations++;
        }
        if (perPrizeLimit !== undefined) {
          const cap = typeof perPrizeLimit === 'number' ? perPrizeLimit : perPrizeLimit[prizeId];
          if (cap !== undefined && nextPlayerPrizeCount > cap) {
            playerLimitViolations++;
          }
        }

        if (
          parsedRules.openingHours &&
          !isOpenAt(parsedRules.window, parsedRules.openingHours, reusableNow)
        ) {
          closedHourWinViolations++;
        }
      }
    }

    if (input.sampleCheckpoints && nextCheckpointTenth <= 10) {
      const targetPlayIndex = Math.round((plays * nextCheckpointTenth) / 10) - 1;
      if (i === targetPlayIndex) {
        const checkpointMs = startsAtMs + Math.round((durationMs * nextCheckpointTenth) / 10);
        const checkpointDate = new Date(checkpointMs);
        const openFrac = openFraction(parsedRules.window, parsedRules.openingHours, checkpointDate);
        const plannedIssued = totalInitialStock * openFrac;
        const plannedRemaining = totalInitialStock * (1 - openFrac);
        checkpoints.push({
          tenth: nextCheckpointTenth / 10,
          openFrac,
          issued: issuedTotal,
          remaining: totalInitialStock - issuedTotal,
          plannedIssued,
          plannedRemaining,
        });
        nextCheckpointTenth++;
      }
    }
  }

  // Final stock conservation check across all prizes
  for (const prize of parsedRules.prizes) {
    const rem = remainingByPrize[prize.id] ?? 0;
    const iss = issuedByPrize[prize.id] ?? 0;
    if (rem < 0 || iss > prize.quantity || rem + iss !== prize.quantity) {
      stockOverIssueViolations++;
    }
  }

  return {
    totalPlays: plays,
    issuedTotal,
    totalInitialStock,
    budgetUsedVnd,
    remainingByPrize,
    issuedByPrize,
    reasons,
    maxPlayerTotalWins,
    maxPlayerDailyWins,
    stockOverIssueViolations,
    budgetOverrunViolations,
    playerLimitViolations,
    closedHourWinViolations,
    checkpoints,
  };
}

describe('Prize engine 1M-play acceptance suite (PRZ-05, PRZ-07, PRZ-09)', () => {
  let cumulativePlaysExecuted = 0;

  test('1. overall_win_rate with budget: 0 stock over-issue, 0 budget overrun, 0 player limit violations', () => {
    const campaignRules: CampaignRulesInput = {
      mode: 'overall_win_rate',
      overallWinRate: 0.25,
      playsPerDay: 5,
      maxWinsPerPlayer: 3,
      startsAt: '2027-01-01T00:00:00.000Z',
      endsAt: '2027-01-11T00:00:00.000Z',
      openingHours: null,
      pacing: false,
      budgetVnd: 150_000_000,
      collectForm: true,
    };

    // Total inventory value = 3,000*30k + 2,000*50k + 500*200k = 290,000,000 VND > 150,000,000 VND budget
    const campaignPrizes: CampaignPrize[] = [
      { id: 'coffee', name: 'Cà phê muối', quantity: 3_000, valueVnd: 30_000 },
      { id: 'voucher50k', name: 'Voucher 50K', quantity: 2_000, valueVnd: 50_000 },
      { id: 'tumbler', name: 'Bình giữ nhiệt', quantity: 500, valueVnd: 200_000 },
    ];

    const summary = runCampaignAcceptanceSimulation({
      campaignRules,
      campaignPrizes,
      seed: 'acceptance-overall-win-rate-budget',
    });
    cumulativePlaysExecuted += summary.totalPlays;

    expect(summary.totalPlays).toBe(PLAYS_PER_CASE);
    expect(summary.stockOverIssueViolations).toBe(0);
    expect(summary.budgetOverrunViolations).toBe(0);
    expect(summary.playerLimitViolations).toBe(0);
    expect(summary.budgetUsedVnd).toBeLessThanOrEqual(150_000_000);
    // Budget was actively binding and exhausted up to the cheapest prize (30,000 VND)
    expect(summary.budgetUsedVnd).toBeGreaterThan(150_000_000 - 30_000);
    expect(summary.reasons.budget).toBeGreaterThan(0);
    expect(summary.maxPlayerTotalWins).toBeLessThanOrEqual(campaignRules.maxWinsPerPlayer);
  });

  test('2. per_prize_probability with per-player limit: 0 stock over-issue, 0 budget overrun, 0 player limit violations', () => {
    const campaignRules: CampaignRulesInput = {
      mode: 'per_prize_probability',
      overallWinRate: 0.38,
      playsPerDay: 3,
      maxWinsPerPlayer: 2,
      startsAt: '2027-01-01T00:00:00.000Z',
      endsAt: '2027-01-11T00:00:00.000Z',
      openingHours: null,
      pacing: false,
      budgetVnd: 2_500_000_000,
      collectForm: true,
    };

    const campaignPrizes: CampaignPrize[] = [
      {
        id: 'topping',
        name: 'Topping trân châu',
        quantity: 40_000,
        valueVnd: 15_000,
        probability: 0.25,
      },
      {
        id: 'upsize',
        name: 'Miễn phí Upsize',
        quantity: 25_000,
        valueVnd: 20_000,
        probability: 0.1,
      },
      { id: 'mug', name: 'Ly sứ Tết', quantity: 5_000, valueVnd: 120_000, probability: 0.03 },
    ];

    const summary = runCampaignAcceptanceSimulation({
      campaignRules,
      campaignPrizes,
      seed: 'acceptance-per-prize-prob-limits',
      extraLimits: {
        perPlayerPerDay: 1,
        perPrizePerPlayer: { topping: 2, upsize: 1, mug: 1 },
      },
    });
    cumulativePlaysExecuted += summary.totalPlays;

    expect(summary.totalPlays).toBe(PLAYS_PER_CASE);
    expect(summary.stockOverIssueViolations).toBe(0);
    expect(summary.budgetOverrunViolations).toBe(0);
    expect(summary.playerLimitViolations).toBe(0);
    expect(summary.maxPlayerTotalWins).toBeLessThanOrEqual(2);
    expect(summary.maxPlayerDailyWins).toBeLessThanOrEqual(1);
    expect(summary.reasons.limit).toBeGreaterThan(0);
    expect(summary.issuedTotal).toBeGreaterThan(0);
    expect(summary.issuedTotal).toBeLessThanOrEqual(summary.totalInitialStock);
  });

  test('3. guaranteed mode: awards every eligible play until stock exhausts with 0 over-issue', () => {
    const campaignRules: CampaignRulesInput = {
      mode: 'guaranteed',
      overallWinRate: 1,
      playsPerDay: 3,
      maxWinsPerPlayer: 2,
      startsAt: '2027-01-01T00:00:00.000Z',
      endsAt: '2027-01-11T00:00:00.000Z',
      openingHours: null,
      pacing: false,
      budgetVnd: 600_000_000,
      collectForm: false,
    };

    const campaignPrizes: CampaignPrize[] = [
      { id: 'p1', name: 'Kẹo Tết', quantity: 10_000, valueVnd: 10_000 },
      { id: 'p2', name: 'Bao lì xì', quantity: 6_000, valueVnd: 20_000 },
      { id: 'p3', name: 'Trà đào cam sả', quantity: 4_000, valueVnd: 45_000 },
    ];

    const summary = runCampaignAcceptanceSimulation({
      campaignRules,
      campaignPrizes,
      seed: 'acceptance-guaranteed',
    });
    cumulativePlaysExecuted += summary.totalPlays;

    expect(summary.totalPlays).toBe(PLAYS_PER_CASE);
    expect(summary.stockOverIssueViolations).toBe(0);
    expect(summary.budgetOverrunViolations).toBe(0);
    expect(summary.playerLimitViolations).toBe(0);
    // All 20,000 items are issued and remaining stock is 0 for every prize
    expect(summary.issuedTotal).toBe(20_000);
    expect(summary.remainingByPrize).toEqual({ p1: 0, p2: 0, p3: 0 });
    expect(summary.issuedByPrize).toEqual({ p1: 10_000, p2: 6_000, p3: 4_000 });
    expect(summary.reasons.lose).toBe(0);
    expect(summary.reasons.out_of_stock).toBeGreaterThan(0);
  });

  test('4. time_uniform pacing with opening hours: 0 violations and issued curve stays within ±10% of plan at each tenth', () => {
    // 10 full days in Asia/Ho_Chi_Minh (2027-01-01 00:00+07:00 to 2027-01-11 00:00+07:00)
    const campaignRules: CampaignRulesInput = {
      mode: 'overall_win_rate',
      overallWinRate: 0.35,
      playsPerDay: 2,
      maxWinsPerPlayer: 5,
      startsAt: '2026-12-31T17:00:00.000Z',
      endsAt: '2027-01-10T17:00:00.000Z',
      openingHours: { start: '08:00', end: '20:00' },
      pacing: true,
      budgetVnd: 300_000_000,
      collectForm: true,
    };

    const campaignPrizes: CampaignPrize[] = [
      { id: 'p1', name: 'Ly trà sữa', quantity: 3_000, valueVnd: 30_000 },
      { id: 'p2', name: 'Voucher 50K', quantity: 1_500, valueVnd: 50_000 },
      { id: 'p3', name: 'Túi canvas', quantity: 500, valueVnd: 120_000 },
    ];

    const summary = runCampaignAcceptanceSimulation({
      campaignRules,
      campaignPrizes,
      seed: 'acceptance-time-uniform-opening-hours',
      sampleCheckpoints: true,
    });
    cumulativePlaysExecuted += summary.totalPlays;

    expect(summary.totalPlays).toBe(PLAYS_PER_CASE);
    expect(summary.stockOverIssueViolations).toBe(0);
    expect(summary.budgetOverrunViolations).toBe(0);
    expect(summary.playerLimitViolations).toBe(0);
    expect(summary.closedHourWinViolations).toBe(0);
    expect(summary.reasons.closed).toBeGreaterThan(0);
    expect(summary.reasons.paced).toBeGreaterThan(0);

    expect(summary.checkpoints).toHaveLength(10);
    for (const cp of summary.checkpoints) {
      expect(cp.openFrac).toBeCloseTo(cp.tenth, 5);
      // Deviation relative to total stock AND relative to planned issued at each tenth must be <= 10%
      const stockDeviation = Math.abs(cp.issued - cp.plannedIssued) / summary.totalInitialStock;
      const planDeviation =
        cp.plannedIssued > 0 ? Math.abs(cp.issued - cp.plannedIssued) / cp.plannedIssued : 0;
      expect(stockDeviation).toBeLessThanOrEqual(0.1);
      expect(planDeviation).toBeLessThanOrEqual(0.1);
    }

    // Verify the suite executed at least 1,000,000 simulated plays in total
    expect(cumulativePlaysExecuted).toBeGreaterThanOrEqual(1_000_000);
  });
});
