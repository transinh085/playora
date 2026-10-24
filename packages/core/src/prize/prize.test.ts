import { describe, expect, test } from 'bun:test';
import {
  CampaignTimestamp,
  computeSmoothingFactor,
  createSeededRng,
  decide,
  isOpenAt,
  mulberry32,
  openFraction,
  PrizeRules,
  type PrizeRulesInput,
  simulate,
} from './index';

const BASE_WINDOW = {
  // 2026-01-01 00:00:00 to 2026-01-02 00:00:00 in Asia/Ho_Chi_Minh (UTC+7)
  startsAt: new Date('2026-01-01T00:00:00+07:00'),
  endsAt: new Date('2026-01-02T00:00:00+07:00'),
  timezone: 'Asia/Ho_Chi_Minh',
};

describe('PrizeRules zod schema', () => {
  test('validates per_prize_probability, overall_win_rate and guaranteed rules', () => {
    const probRules = PrizeRules.parse({
      mode: 'per_prize_probability',
      prizes: [
        { id: 'p1', quantity: 10, probability: 0.1, valueVnd: 50_000 },
        { id: 'p2', quantity: 20, probability: 0.2, valueVnd: 20_000 },
        { id: 'p3', quantity: 70, probability: 0.7, valueVnd: 5_000 },
      ],
      window: BASE_WINDOW,
    });
    expect(probRules.prizes[0]?.remaining).toBe(10);
    expect(probRules.pacing.strategy).toBe('none');
    expect(probRules.pacing.buffer).toBe(0.1);

    const overallRules = PrizeRules.parse({
      mode: 'overall_win_rate',
      overallWinRate: 0.25,
      prizes: [{ id: 'p1', quantity: 100, remaining: 80 }],
      window: BASE_WINDOW,
    });
    expect(overallRules.overallWinRate).toBe(0.25);

    const guaranteedRules = PrizeRules.parse({
      mode: 'guaranteed',
      prizes: [{ id: 'p1', quantity: 50 }],
      window: BASE_WINDOW,
    });
    expect(guaranteedRules.mode).toBe('guaranteed');
  });

  test('rejects invalid probability sums, missing fields, duplicate prize ids and bad windows', () => {
    // Sum of probabilities > 1
    expect(() =>
      PrizeRules.parse({
        mode: 'per_prize_probability',
        prizes: [
          { id: 'p1', quantity: 10, probability: 0.6 },
          { id: 'p2', quantity: 10, probability: 0.5 },
        ],
        window: BASE_WINDOW,
      }),
    ).toThrow();

    // Missing probability in per_prize_probability
    expect(() =>
      PrizeRules.parse({
        mode: 'per_prize_probability',
        prizes: [{ id: 'p1', quantity: 10 }],
        window: BASE_WINDOW,
      }),
    ).toThrow();

    // Missing overallWinRate in overall_win_rate
    expect(() =>
      PrizeRules.parse({
        mode: 'overall_win_rate',
        prizes: [{ id: 'p1', quantity: 10 }],
        window: BASE_WINDOW,
      }),
    ).toThrow();

    // Duplicate prize ID
    expect(() =>
      PrizeRules.parse({
        mode: 'guaranteed',
        prizes: [
          { id: 'dup', quantity: 10 },
          { id: 'dup', quantity: 5 },
        ],
        window: BASE_WINDOW,
      }),
    ).toThrow();

    // remaining > quantity
    expect(() =>
      PrizeRules.parse({
        mode: 'guaranteed',
        prizes: [{ id: 'p1', quantity: 5, remaining: 10 }],
        window: BASE_WINDOW,
      }),
    ).toThrow();

    // Invalid openingHours (end <= start)
    expect(() =>
      PrizeRules.parse({
        mode: 'guaranteed',
        prizes: [{ id: 'p1', quantity: 5 }],
        openingHours: [{ start: '22:00', end: '08:00' }],
        window: BASE_WINDOW,
      }),
    ).toThrow();

    // Invalid timezone
    expect(() =>
      PrizeRules.parse({
        mode: 'guaranteed',
        prizes: [{ id: 'p1', quantity: 5 }],
        window: {
          ...BASE_WINDOW,
          timezone: 'Invalid/Timezone_Name',
        },
      }),
    ).toThrow();
  });

  test('CampaignTimestamp accepts Date, epoch-ms, and ISO with offset, but rejects offset-less ISO strings', () => {
    // Valid inputs
    expect(CampaignTimestamp.parse('2026-01-01T00:00:00Z')).toBeInstanceOf(Date);
    expect(CampaignTimestamp.parse('2026-01-01T00:00:00+07:00')).toBeInstanceOf(Date);
    expect(CampaignTimestamp.parse('2026-01-01T12:34:56.789-05:00')).toBeInstanceOf(Date);
    expect(CampaignTimestamp.parse(1767225600000)).toBeInstanceOf(Date);
    expect(CampaignTimestamp.parse(new Date('2026-01-01T00:00:00Z'))).toBeInstanceOf(Date);

    // Offset-less ISO datetime is rejected to prevent server-local timezone ambiguity
    expect(() => CampaignTimestamp.parse('2026-01-01T00:00:00')).toThrow();
    expect(() => CampaignTimestamp.parse('2026-01-01T00:00:00.000')).toThrow();
    expect(() => CampaignTimestamp.parse('2026-01-01')).toThrow();
    expect(() => CampaignTimestamp.parse('invalid-date')).toThrow();

    // Rejected when passed inside CampaignWindow / PrizeRules
    expect(() =>
      PrizeRules.parse({
        mode: 'guaranteed',
        prizes: [{ id: 'p1', quantity: 5 }],
        window: {
          startsAt: '2026-01-01T00:00:00',
          endsAt: '2026-01-02T00:00:00Z',
          timezone: 'Asia/Ho_Chi_Minh',
        },
      }),
    ).toThrow();
  });
});

describe('isOpenAt and openFraction (Asia/Ho_Chi_Minh Intl timezone math)', () => {
  const twoDayWindow = {
    startsAt: new Date('2026-01-01T00:00:00+07:00'), // Thursday
    endsAt: new Date('2026-01-03T00:00:00+07:00'), // Saturday
    timezone: 'Asia/Ho_Chi_Minh',
  };
  const dailyHours = [{ start: '08:00', end: '20:00' }]; // 12 open hours/day = 24 open hours total

  test('isOpenAt respects campaign window and Asia/Ho_Chi_Minh opening hours', () => {
    // Before campaign starts
    expect(isOpenAt(twoDayWindow, dailyHours, new Date('2025-12-31T12:00:00+07:00'))).toBe(false);
    // After campaign ends
    expect(isOpenAt(twoDayWindow, dailyHours, new Date('2026-01-03T10:00:00+07:00'))).toBe(false);

    // 07:59 ICT (00:59 UTC) -> closed
    expect(isOpenAt(twoDayWindow, dailyHours, new Date('2026-01-01T00:59:00.000Z'))).toBe(false);
    // 08:00 ICT (01:00 UTC) -> open
    expect(isOpenAt(twoDayWindow, dailyHours, new Date('2026-01-01T01:00:00.000Z'))).toBe(true);
    // 19:59 ICT (12:59 UTC) -> open
    expect(isOpenAt(twoDayWindow, dailyHours, new Date('2026-01-01T12:59:00.000Z'))).toBe(true);
    // 20:00 ICT (13:00 UTC) -> closed (end is exclusive)
    expect(isOpenAt(twoDayWindow, dailyHours, new Date('2026-01-01T13:00:00.000Z'))).toBe(false);

    // Day-of-week filter: Thursday is day 4, Friday is day 5
    const thursdayOnly = [{ days: [4], start: '08:00', end: '20:00' }];
    expect(isOpenAt(twoDayWindow, thursdayOnly, new Date('2026-01-01T10:00:00+07:00'))).toBe(true);
    expect(isOpenAt(twoDayWindow, thursdayOnly, new Date('2026-01-02T10:00:00+07:00'))).toBe(false);
  });

  test('openFraction counts only open hours and stays constant during closed hours', () => {
    expect(openFraction(twoDayWindow, dailyHours, new Date('2026-01-01T00:00:00+07:00'))).toBe(0);
    // Before 08:00 on day 1, 0 open minutes have elapsed
    expect(openFraction(twoDayWindow, dailyHours, new Date('2026-01-01T07:30:00+07:00'))).toBe(0);
    // At 14:00 on day 1: 6 of 24 open hours elapsed = 0.25
    expect(
      openFraction(twoDayWindow, dailyHours, new Date('2026-01-01T14:00:00+07:00')),
    ).toBeCloseTo(0.25, 6);
    // At 20:00 on day 1: 12 of 24 open hours elapsed = 0.50
    expect(
      openFraction(twoDayWindow, dailyHours, new Date('2026-01-01T20:00:00+07:00')),
    ).toBeCloseTo(0.5, 6);
    // At 03:00 on day 2 (overnight closed): still 0.50
    expect(
      openFraction(twoDayWindow, dailyHours, new Date('2026-01-02T03:00:00+07:00')),
    ).toBeCloseTo(0.5, 6);
    // At 14:00 on day 2: 18 of 24 open hours elapsed = 0.75
    expect(
      openFraction(twoDayWindow, dailyHours, new Date('2026-01-02T14:00:00+07:00')),
    ).toBeCloseTo(0.75, 6);
    // At 20:00 on day 2: 24 of 24 open hours elapsed = 1.00
    expect(
      openFraction(twoDayWindow, dailyHours, new Date('2026-01-02T20:00:00+07:00')),
    ).toBeCloseTo(1, 6);
    // After endsAt: 1.00
    expect(openFraction(twoDayWindow, dailyHours, new Date('2026-01-03T05:00:00+07:00'))).toBe(1);
  });
});

describe('decide() modes, limits, budget and pacing', () => {
  const midCampaignNow = new Date('2026-01-01T12:00:00+07:00');

  test('per_prize_probability single roll over cumulative probabilities in sortOrder', () => {
    const rules: PrizeRulesInput = {
      mode: 'per_prize_probability',
      prizes: [
        { id: 'second', quantity: 10, probability: 0.4, sortOrder: 2 },
        { id: 'first', quantity: 10, probability: 0.2, sortOrder: 1 },
      ],
      window: BASE_WINDOW,
    };

    // 'first' has band [0, 0.2), 'second' has band [0.2, 0.6), beyond [0.6, 1.0) is lose
    // Roll 0.15 hits 'first' (prob 0.2) because 'first' has sortOrder 1
    const hitFirst = decide({
      rules,
      snapshot: {},
      now: midCampaignNow,
      rng: () => 0.15,
    });
    expect(hitFirst).toEqual({ prizeId: 'first', reason: 'win' });

    // Roll 0.35 hits 'second' in its cumulative band [0.2, 0.6)
    const hitSecond = decide({
      rules,
      snapshot: {},
      now: midCampaignNow,
      rng: () => 0.35,
    });
    expect(hitSecond).toEqual({ prizeId: 'second', reason: 'win' });

    // Roll 0.9 misses both
    const missAll = decide({
      rules,
      snapshot: {},
      now: midCampaignNow,
      rng: () => 0.9,
    });
    expect(missAll).toEqual({ prizeId: null, reason: 'lose' });
  });

  test('per_prize_probability observed rates match configured probabilities within ±1% over 200k decisions', () => {
    const rules: PrizeRulesInput = {
      mode: 'per_prize_probability',
      prizes: [
        { id: 'A', quantity: 1_000_000, probability: 0.5, sortOrder: 1 },
        { id: 'B', quantity: 1_000_000, probability: 0.2, sortOrder: 2 },
        { id: 'C', quantity: 1_000_000, probability: 0.1, sortOrder: 3 },
      ],
      window: BASE_WINDOW,
    };

    const N = 200_000;
    const rng = mulberry32(12345);
    let countA = 0;
    let countB = 0;
    let countC = 0;
    let countLose = 0;

    for (let i = 0; i < N; i++) {
      const res = decide({ rules, snapshot: {}, now: midCampaignNow, rng });
      if (res.prizeId === 'A') countA++;
      else if (res.prizeId === 'B') countB++;
      else if (res.prizeId === 'C') countC++;
      else if (res.reason === 'lose') countLose++;
    }

    const rateA = countA / N;
    const rateB = countB / N;
    const rateC = countC / N;
    const rateLose = countLose / N;

    expect(Math.abs(rateA - 0.5)).toBeLessThan(0.01);
    expect(Math.abs(rateB - 0.2)).toBeLessThan(0.01);
    expect(Math.abs(rateC - 0.1)).toBeLessThan(0.01);
    expect(Math.abs(rateLose - 0.2)).toBeLessThan(0.01);
  });

  test('per_prize_probability keeps rates for A and C when B is out of stock and drops overall win rate by ~0.2', () => {
    const rules: PrizeRulesInput = {
      mode: 'per_prize_probability',
      prizes: [
        { id: 'A', quantity: 1_000_000, probability: 0.5, sortOrder: 1 },
        { id: 'B', quantity: 1_000_000, probability: 0.2, sortOrder: 2 },
        { id: 'C', quantity: 1_000_000, probability: 0.1, sortOrder: 3 },
      ],
      window: BASE_WINDOW,
    };

    const N = 200_000;
    const rng = mulberry32(12345);
    let countA = 0;
    let countB = 0;
    let countC = 0;
    let countOOS = 0;
    let countLose = 0;

    for (let i = 0; i < N; i++) {
      const res = decide({
        rules,
        snapshot: { remainingByPrize: { B: 0 } },
        now: midCampaignNow,
        rng,
      });
      if (res.prizeId === 'A') countA++;
      else if (res.prizeId === 'B') countB++;
      else if (res.prizeId === 'C') countC++;
      if (res.reason === 'out_of_stock') countOOS++;
      else if (res.reason === 'lose') countLose++;
    }

    const rateA = countA / N;
    const rateB = countB / N;
    const rateC = countC / N;
    const rateOOS = countOOS / N;
    const rateLose = countLose / N;
    const overallWinRate = (countA + countB + countC) / N;

    expect(rateB).toBe(0);
    expect(countB).toBe(0);
    expect(Math.abs(rateA - 0.5)).toBeLessThan(0.01);
    expect(Math.abs(rateC - 0.1)).toBeLessThan(0.01);
    expect(Math.abs(rateOOS - 0.2)).toBeLessThan(0.01);
    expect(Math.abs(rateLose - 0.2)).toBeLessThan(0.01);
    expect(Math.abs(overallWinRate - 0.6)).toBeLessThan(0.01);
  });

  test('per_prize_probability smoothing multiplies probabilities and normalises when sum > 1', () => {
    const rules: PrizeRulesInput = {
      mode: 'per_prize_probability',
      prizes: [
        { id: 'A', quantity: 100, probability: 0.5, sortOrder: 1 },
        { id: 'B', quantity: 100, probability: 0.3, sortOrder: 2 },
      ],
      pacing: { strategy: 'time_uniform', buffer: 0.1, smoothing: true },
      window: BASE_WINDOW,
    };

    // When behind plan, smoothing factor is > 1. E.g. factor = 2.0 -> scaled probs: A=1.0, B=0.6, sum=1.6 > 1
    // Normalised: A = 1.0/1.6 = 0.625, B = 0.6/1.6 = 0.375, sum = 1.0 (no lose)
    // Elapsed fraction 0.5, issued 10 -> delta = 0.4 behind plan -> smoothingFactor > 1.25 -> sum > 1
    const res = decide({
      rules,
      snapshot: { issuedTotal: 10, remainingByPrize: { A: 90, B: 90 } },
      now: new Date('2026-01-01T12:00:00+07:00'),
      rng: () => 0.5, // 0.5 < 0.625 -> wins A
    });
    expect(res).toEqual({ prizeId: 'A', reason: 'win' });

    const resB = decide({
      rules,
      snapshot: { issuedTotal: 10, remainingByPrize: { A: 90, B: 90 } },
      now: new Date('2026-01-01T12:00:00+07:00'),
      rng: () => 0.8, // 0.8 in [0.625, 1.0) -> wins B
    });
    expect(resB).toEqual({ prizeId: 'B', reason: 'win' });
  });

  test('overall_win_rate rolls win rate then chooses prize weighted by remaining stock', () => {
    const rules: PrizeRulesInput = {
      mode: 'overall_win_rate',
      overallWinRate: 0.5,
      prizes: [
        { id: 'rare', quantity: 100, remaining: 20 },
        { id: 'common', quantity: 100, remaining: 80 },
      ],
      window: BASE_WINDOW,
    };

    // First RNG roll >= 0.5 -> lose
    expect(
      decide({
        rules,
        snapshot: {},
        now: midCampaignNow,
        rng: () => 0.5,
      }),
    ).toEqual({ prizeId: null, reason: 'lose' });

    // First roll < 0.5 (win), second roll 0.10 (< 20/100) -> 'rare'
    const rollsRare = [0.1, 0.1];
    let i = 0;
    expect(
      decide({
        rules,
        snapshot: {},
        now: midCampaignNow,
        rng: () => rollsRare[i++] ?? 0,
      }),
    ).toEqual({ prizeId: 'rare', reason: 'win' });

    // First roll < 0.5 (win), second roll 0.25 (>= 20/100) -> 'common'
    const rollsCommon = [0.1, 0.25];
    let j = 0;
    expect(
      decide({
        rules,
        snapshot: {},
        now: midCampaignNow,
        rng: () => rollsCommon[j++] ?? 0,
      }),
    ).toEqual({ prizeId: 'common', reason: 'win' });
  });

  test('guaranteed always wins while stock remains and weights by remaining', () => {
    const rules: PrizeRulesInput = {
      mode: 'guaranteed',
      prizes: [
        { id: 'a', quantity: 30, remaining: 30 },
        { id: 'b', quantity: 70, remaining: 70 },
      ],
      window: BASE_WINDOW,
    };

    const rng = mulberry32(12345);
    let winsA = 0;
    let winsB = 0;
    for (let k = 0; k < 2000; k++) {
      const res = decide({ rules, snapshot: {}, now: midCampaignNow, rng });
      expect(res.reason).toBe('win');
      if (res.prizeId === 'a') winsA++;
      if (res.prizeId === 'b') winsB++;
    }
    expect(winsA / 2000).toBeGreaterThan(0.25);
    expect(winsA / 2000).toBeLessThan(0.35);
    expect(winsB / 2000).toBeGreaterThan(0.65);

    // When all prizes have remaining 0 -> out_of_stock
    expect(
      decide({
        rules,
        snapshot: { remainingByPrize: { a: 0, b: 0 } },
        now: midCampaignNow,
        rng: () => 0.1,
      }),
    ).toEqual({ prizeId: null, reason: 'out_of_stock' });
  });

  test('enforces player limits (perPlayerTotal, perPlayerPerDay, perPrizePerPlayer)', () => {
    const rules: PrizeRulesInput = {
      mode: 'guaranteed',
      prizes: [
        { id: 'p1', quantity: 10 },
        { id: 'p2', quantity: 10 },
      ],
      limits: {
        perPlayerTotal: 3,
        perPlayerPerDay: 2,
        perPrizePerPlayer: { p1: 1, p2: 2 },
      },
      window: BASE_WINDOW,
    };

    // Hit perPlayerTotal
    expect(
      decide({
        rules,
        snapshot: { playerAwards: { total: 3, today: 1, byPrize: {} } },
        now: midCampaignNow,
        rng: () => 0,
      }),
    ).toEqual({ prizeId: null, reason: 'limit' });

    // Hit perPlayerPerDay
    expect(
      decide({
        rules,
        snapshot: { playerAwards: { total: 2, today: 2, byPrize: {} } },
        now: midCampaignNow,
        rng: () => 0,
      }),
    ).toEqual({ prizeId: null, reason: 'limit' });

    // Hit perPrizePerPlayer on p1 only -> skips p1 and awards p2
    expect(
      decide({
        rules,
        snapshot: { playerAwards: { total: 1, today: 1, byPrize: { p1: 1 } } },
        now: midCampaignNow,
        rng: () => 0,
      }),
    ).toEqual({ prizeId: 'p2', reason: 'win' });

    // Hit perPrizePerPlayer on both p1 and p2 (or p2 is out of stock) -> limit
    expect(
      decide({
        rules,
        snapshot: {
          remainingByPrize: { p1: 5, p2: 0 },
          playerAwards: { total: 1, today: 1, byPrize: { p1: 1 } },
        },
        now: midCampaignNow,
        rng: () => 0,
      }),
    ).toEqual({ prizeId: null, reason: 'limit' });
  });

  test('enforces budgetVnd and never selects a prize exceeding remaining budget', () => {
    const rules: PrizeRulesInput = {
      mode: 'guaranteed',
      budgetVnd: 100_000,
      prizes: [
        { id: 'expensive', quantity: 10, valueVnd: 80_000 },
        { id: 'cheap', quantity: 10, valueVnd: 20_000 },
      ],
      window: BASE_WINDOW,
    };

    // With 30,000 VND used, expensive (80k) exceeds 100k, so only cheap (20k) is eligible
    expect(
      decide({
        rules,
        snapshot: { budgetUsedVnd: 30_000 },
        now: midCampaignNow,
        rng: () => 0,
      }),
    ).toEqual({ prizeId: 'cheap', reason: 'win' });

    // With 90,000 VND used, neither prize fits -> budget
    expect(
      decide({
        rules,
        snapshot: { budgetUsedVnd: 90_000 },
        now: midCampaignNow,
        rng: () => 0,
      }),
    ).toEqual({ prizeId: null, reason: 'budget' });

    // With 100,000 VND used -> budget
    expect(
      decide({
        rules,
        snapshot: { budgetUsedVnd: 100_000 },
        now: midCampaignNow,
        rng: () => 0,
      }),
    ).toEqual({ prizeId: null, reason: 'budget' });
  });

  test('pacing edges: start, mid-window, end, outside hours, and smoothing', () => {
    const rules: PrizeRulesInput = {
      mode: 'guaranteed',
      prizes: [{ id: 'p1', quantity: 100, remaining: 100 }],
      pacing: { strategy: 'time_uniform', buffer: 0.1, smoothing: true },
      openingHours: [{ start: '08:00', end: '20:00' }],
      window: BASE_WINDOW,
    };

    // Outside opening hours (07:00 ICT) -> closed
    expect(
      decide({
        rules,
        snapshot: { issuedTotal: 0 },
        now: new Date('2026-01-01T07:00:00+07:00'),
        rng: () => 0,
      }),
    ).toEqual({ prizeId: null, reason: 'closed' });

    // Outside campaign window (before startsAt) -> closed
    expect(
      decide({
        rules,
        snapshot: { issuedTotal: 0 },
        now: new Date('2025-12-31T12:00:00+07:00'),
        rng: () => 0,
      }),
    ).toEqual({ prizeId: null, reason: 'closed' });

    // Exact start of open hours (08:00 ICT, openFraction = 0): allowed = 0, issued = 0 -> paced
    expect(
      decide({
        rules,
        snapshot: { issuedTotal: 0 },
        now: new Date('2026-01-01T08:00:00+07:00'),
        rng: () => 0,
      }),
    ).toEqual({ prizeId: null, reason: 'paced' });

    // Mid open hours (14:00 ICT, openFraction = 0.5): allowed = 100 * 0.5 * 1.1 = 55
    // issued = 54 -> win
    expect(
      decide({
        rules,
        snapshot: { issuedTotal: 54, remainingByPrize: { p1: 46 } },
        now: new Date('2026-01-01T14:00:00+07:00'),
        rng: () => 0,
      }),
    ).toEqual({ prizeId: 'p1', reason: 'win' });

    // issued = 55 -> paced
    expect(
      decide({
        rules,
        snapshot: { issuedTotal: 55, remainingByPrize: { p1: 45 } },
        now: new Date('2026-01-01T14:00:00+07:00'),
        rng: () => 0,
      }),
    ).toEqual({ prizeId: null, reason: 'paced' });

    // Near end of open hours (19:59 ICT, openFraction ~ 1): allowed > 100 -> win while stock remains
    expect(
      decide({
        rules,
        snapshot: { issuedTotal: 99, remainingByPrize: { p1: 1 } },
        now: new Date('2026-01-01T19:59:00+07:00'),
        rng: () => 0,
      }),
    ).toEqual({ prizeId: 'p1', reason: 'win' });

    // Smoothing factor scales up when behind plan and down when ahead of plan
    const behindFactor = computeSmoothingFactor({
      totalQuantity: 100,
      issued: 20,
      elapsedFraction: 0.5,
      buffer: 0.1,
    });
    const onPlanFactor = computeSmoothingFactor({
      totalQuantity: 100,
      issued: 50,
      elapsedFraction: 0.5,
      buffer: 0.1,
    });
    const aheadFactor = computeSmoothingFactor({
      totalQuantity: 100,
      issued: 54,
      elapsedFraction: 0.5,
      buffer: 0.1,
    });
    expect(behindFactor).toBeGreaterThan(1);
    expect(onPlanFactor).toBeCloseTo(1, 5);
    expect(aheadFactor).toBeLessThan(1);
  });
});

describe('simulate() and property / Monte Carlo verification', () => {
  test('is deterministic for a fixed seed and differs across seeds', () => {
    const rules: PrizeRulesInput = {
      mode: 'overall_win_rate',
      overallWinRate: 0.15,
      budgetVnd: 5_000_000,
      prizes: [
        { id: 'gold', quantity: 20, valueVnd: 100_000 },
        { id: 'silver', quantity: 100, valueVnd: 20_000 },
      ],
      limits: { perPlayerTotal: 3, perPlayerPerDay: 2, perPrizePerPlayer: { gold: 1 } },
      pacing: { strategy: 'time_uniform', buffer: 0.1, smoothing: true },
      window: {
        startsAt: new Date('2026-01-01T00:00:00+07:00'),
        endsAt: new Date('2026-01-04T00:00:00+07:00'),
        timezone: 'Asia/Ho_Chi_Minh',
      },
    };
    const traffic = [
      20, 10, 5, 5, 5, 10, 30, 60, 100, 120, 150, 180, 160, 140, 130, 150, 180, 220, 250, 200, 150,
      90, 50, 30,
    ];

    const run1 = simulate({ rules, traffic, players: 500, days: 3, seed: 42 });
    const run2 = simulate({ rules, traffic, players: 500, days: 3, seed: 42 });
    const run3 = simulate({ rules, traffic, players: 500, days: 3, seed: 99 });

    expect(run1).toEqual(run2);
    expect(run1.issuedByHour).not.toEqual(run3.issuedByHour);
  });

  test('time_uniform with steady traffic tracks remaining stock within ±10% of plan at every hour and never exhausts before 80% duration', () => {
    const totalHours = 48; // 2 days
    const totalStock = 600;
    const steadyTraffic = 200; // 200 plays/hr * 48h = 9,600 plays (plan win rate = 6.25%)

    const modes: PrizeRulesInput[] = [
      // 1. overall_win_rate with high base rate (25% > 6.25%)
      {
        mode: 'overall_win_rate',
        overallWinRate: 0.25,
        prizes: [
          { id: 'p1', quantity: 200 },
          { id: 'p2', quantity: 400 },
        ],
        pacing: { strategy: 'time_uniform', buffer: 0.1, smoothing: true },
        window: {
          startsAt: new Date('2026-01-01T00:00:00+07:00'),
          endsAt: new Date('2026-01-03T00:00:00+07:00'),
          timezone: 'Asia/Ho_Chi_Minh',
        },
      },
      // 2. per_prize_probability with low base rate (3% < 6.25%, tests upward smoothing)
      {
        mode: 'per_prize_probability',
        prizes: [
          { id: 'p1', quantity: 200, probability: 0.01 },
          { id: 'p2', quantity: 400, probability: 0.02 },
        ],
        pacing: { strategy: 'time_uniform', buffer: 0.1, smoothing: true },
        window: {
          startsAt: new Date('2026-01-01T00:00:00+07:00'),
          endsAt: new Date('2026-01-03T00:00:00+07:00'),
          timezone: 'Asia/Ho_Chi_Minh',
        },
      },
      // 3. guaranteed mode with time_uniform pacing
      {
        mode: 'guaranteed',
        prizes: [{ id: 'p1', quantity: 600 }],
        pacing: { strategy: 'time_uniform', buffer: 0.1, smoothing: true },
        window: {
          startsAt: new Date('2026-01-01T00:00:00+07:00'),
          endsAt: new Date('2026-01-03T00:00:00+07:00'),
          timezone: 'Asia/Ho_Chi_Minh',
        },
      },
    ];

    for (const rules of modes) {
      const result = simulate({
        rules,
        traffic: steadyTraffic,
        players: 5000,
        days: 2,
        seed: 2027,
      });

      expect(result.remainingByHour).toHaveLength(totalHours);

      for (let h = 0; h < totalHours; h++) {
        const plannedRemaining = totalStock * (1 - (h + 1) / totalHours);
        const actualRemaining = result.remainingByHour[h] ?? 0;
        const deviationFraction = Math.abs(actualRemaining - plannedRemaining) / totalStock;
        expect(deviationFraction).toBeLessThanOrEqual(0.1);
      }

      // Must not be exhausted before 80% of the duration (hour 38 of 48)
      if (result.exhaustedAtHour !== null) {
        expect(result.exhaustedAtHour).toBeGreaterThanOrEqual(Math.floor(totalHours * 0.8));
      }
    }

    // 4. time_uniform with openingHours (08:00..20:00 ICT) across 2 days (24 open hours out of 48 total hours)
    const openingHoursWindow = {
      startsAt: new Date('2026-01-01T00:00:00+07:00'),
      endsAt: new Date('2026-01-03T00:00:00+07:00'),
      timezone: 'Asia/Ho_Chi_Minh',
    };
    const openingHours = [{ start: '08:00', end: '20:00' }];
    const openRules: PrizeRulesInput = {
      mode: 'overall_win_rate',
      overallWinRate: 0.2,
      prizes: [{ id: 'p1', quantity: totalStock }],
      pacing: { strategy: 'time_uniform', buffer: 0.1, smoothing: true },
      openingHours,
      window: openingHoursWindow,
    };
    const openResult = simulate({
      rules: openRules,
      traffic: steadyTraffic,
      players: 5000,
      days: 2,
      seed: 2027,
    });

    for (let h = 0; h < totalHours; h++) {
      const hourEnd = new Date(openingHoursWindow.startsAt.getTime() + (h + 1) * 3_600_000);
      const frac = openFraction(openingHoursWindow, openingHours, hourEnd);
      const plannedRemaining = totalStock * (1 - frac);
      const actualRemaining = openResult.remainingByHour[h] ?? 0;
      const deviationFraction = Math.abs(actualRemaining - plannedRemaining) / totalStock;
      expect(deviationFraction).toBeLessThanOrEqual(0.1);
    }
    expect(openResult.reasons.closed).toBe(24 * steadyTraffic);
  });

  test('property test: 1,000,000 decisions across randomized rules and traffic with 0 over-stock, 0 over-budget, 0 over-player-limit', () => {
    const masterRng = createSeededRng(20261024);
    const totalTargetDecisions = 1_000_000;
    const campaignCount = 50;
    const decisionsPerCampaign = totalTargetDecisions / campaignCount; // 20,000 plays per campaign

    let totalDecisionsExecuted = 0;
    let totalWinsExecuted = 0;

    for (let c = 0; c < campaignCount; c++) {
      const modeRoll = masterRng();
      const mode =
        modeRoll < 0.34
          ? 'per_prize_probability'
          : modeRoll < 0.67
            ? 'overall_win_rate'
            : 'guaranteed';

      const prizeCount = 2 + Math.floor(masterRng() * 4); // 2..5 prizes
      const prizes: {
        id: string;
        quantity: number;
        remaining: number;
        valueVnd: number;
        probability?: number;
        sortOrder: number;
      }[] = [];

      const probBudget = 0.85;
      let totalMaxValue = 0;
      for (let p = 0; p < prizeCount; p++) {
        const quantity = 10 + Math.floor(masterRng() * 250);
        const valueVnd = (1 + Math.floor(masterRng() * 20)) * 10_000;
        const prob =
          mode === 'per_prize_probability'
            ? Number((masterRng() * (probBudget / prizeCount)).toFixed(4))
            : undefined;
        totalMaxValue += quantity * valueVnd;
        prizes.push({
          id: `prize_${p}`,
          quantity,
          remaining: quantity,
          valueVnd,
          ...(prob !== undefined ? { probability: prob } : {}),
          sortOrder: p,
        });
      }

      const hasBudget = masterRng() < 0.7;
      const budgetVnd = hasBudget
        ? Math.floor(totalMaxValue * (0.2 + masterRng() * 0.6))
        : undefined;

      const perPlayerTotal = masterRng() < 0.7 ? 1 + Math.floor(masterRng() * 5) : undefined;
      const perPlayerPerDay = masterRng() < 0.7 ? 1 + Math.floor(masterRng() * 3) : undefined;
      const perPrizeLimitCap = masterRng() < 0.6 ? 1 + Math.floor(masterRng() * 2) : undefined;

      const useTimeUniform = masterRng() < 0.6;
      const buffer = Number((0.05 + masterRng() * 0.2).toFixed(2));
      const smoothing = masterRng() < 0.7;

      const useOpeningHours = masterRng() < 0.4;
      const openingHours = useOpeningHours ? [{ start: '08:00', end: '22:00' }] : undefined;

      const days = 2;
      const totalHours = days * 24;
      const startsAtMs = new Date('2026-02-01T00:00:00+07:00').getTime();
      const endsAtMs = startsAtMs + totalHours * 3_600_000;

      const rules = PrizeRules.parse({
        mode,
        overallWinRate: mode === 'overall_win_rate' ? 0.05 + masterRng() * 0.5 : undefined,
        prizes,
        limits: {
          ...(perPlayerTotal !== undefined ? { perPlayerTotal } : {}),
          ...(perPlayerPerDay !== undefined ? { perPlayerPerDay } : {}),
          ...(perPrizeLimitCap !== undefined ? { perPrizePerPlayer: perPrizeLimitCap } : {}),
        },
        ...(budgetVnd !== undefined ? { budgetVnd } : {}),
        pacing: {
          strategy: useTimeUniform ? 'time_uniform' : 'none',
          buffer,
          smoothing,
        },
        ...(openingHours !== undefined ? { openingHours } : {}),
        window: {
          startsAt: new Date(startsAtMs),
          endsAt: new Date(endsAtMs),
          timezone: 'Asia/Ho_Chi_Minh',
        },
      });

      const playerPoolSize = 50 + Math.floor(masterRng() * 450);
      const remainingByPrize: Record<string, number> = {};
      const issuedByPrize: Record<string, number> = {};
      const quantityByPrize: Record<string, number> = {};
      const valueByPrize: Record<string, number> = {};

      for (const prize of rules.prizes) {
        remainingByPrize[prize.id] = prize.remaining;
        issuedByPrize[prize.id] = 0;
        quantityByPrize[prize.id] = prize.quantity;
        valueByPrize[prize.id] = prize.valueVnd ?? 0;
      }

      const playerTotalWins = new Uint32Array(playerPoolSize);
      const playerDayWins = new Uint32Array(playerPoolSize);
      const playerLastDay = new Int32Array(playerPoolSize).fill(-1);
      const playerPrizeWins = Array.from(
        { length: playerPoolSize },
        () => ({}) as Record<string, number>,
      );

      let issuedTotal = 0;
      let budgetUsedVnd = 0;
      const reusableNow = new Date(startsAtMs);
      const reusablePlayerAwards = {
        total: 0,
        today: 0,
        byPrize: {} as Record<string, number>,
      };
      const reusableSnapshot = {
        remainingByPrize,
        issuedTotal: 0,
        budgetUsedVnd: 0,
        playerAwards: reusablePlayerAwards,
      };

      const playsPerHour = decisionsPerCampaign / totalHours;

      for (let i = 0; i < decisionsPerCampaign; i++) {
        const hourIdx = Math.min(totalHours - 1, Math.floor(i / playsPerHour));
        const dayIdx = Math.floor(hourIdx / 24);
        const withinHourFrac = (i % playsPerHour) / playsPerHour;
        const nowMs = startsAtMs + (hourIdx + withinHourFrac) * 3_600_000;
        reusableNow.setTime(nowMs);

        const playerId = Math.floor(masterRng() * playerPoolSize);
        if (playerLastDay[playerId] !== dayIdx) {
          playerDayWins[playerId] = 0;
          playerLastDay[playerId] = dayIdx;
        }

        const pTotal = playerTotalWins[playerId] ?? 0;
        const pToday = playerDayWins[playerId] ?? 0;
        const pByPrize = playerPrizeWins[playerId] ?? {};

        reusablePlayerAwards.total = pTotal;
        reusablePlayerAwards.today = pToday;
        reusablePlayerAwards.byPrize = pByPrize;
        reusableSnapshot.issuedTotal = issuedTotal;
        reusableSnapshot.budgetUsedVnd = budgetUsedVnd;

        const decision = decide({
          rules,
          snapshot: reusableSnapshot,
          now: reusableNow,
          rng: masterRng,
        });

        totalDecisionsExecuted++;

        if (decision.reason === 'win') {
          expect(decision.prizeId).not.toBeNull();
          const prizeId = decision.prizeId ?? '';
          const remBefore = remainingByPrize[prizeId] ?? 0;

          // Invariant 1: Never select a prize with remaining <= 0
          expect(remBefore).toBeGreaterThan(0);

          remainingByPrize[prizeId] = remBefore - 1;
          issuedByPrize[prizeId] = (issuedByPrize[prizeId] ?? 0) + 1;
          issuedTotal++;
          totalWinsExecuted++;

          const prizeVal = valueByPrize[prizeId] ?? 0;
          budgetUsedVnd += prizeVal;

          // Invariant 2: Never exceed budget
          if (budgetVnd !== undefined) {
            expect(budgetUsedVnd).toBeLessThanOrEqual(budgetVnd);
          }

          const newPlayerTotal = pTotal + 1;
          const newPlayerToday = pToday + 1;
          const newPlayerPrize = (pByPrize[prizeId] ?? 0) + 1;

          playerTotalWins[playerId] = newPlayerTotal;
          playerDayWins[playerId] = newPlayerToday;
          pByPrize[prizeId] = newPlayerPrize;

          // Invariant 3: Never exceed player limits
          if (perPlayerTotal !== undefined) {
            expect(newPlayerTotal).toBeLessThanOrEqual(perPlayerTotal);
          }
          if (perPlayerPerDay !== undefined) {
            expect(newPlayerToday).toBeLessThanOrEqual(perPlayerPerDay);
          }
          if (perPrizeLimitCap !== undefined) {
            expect(newPlayerPrize).toBeLessThanOrEqual(perPrizeLimitCap);
          }
        }
      }

      // Final campaign stock invariant check
      for (const prize of rules.prizes) {
        const expectedQuantity = quantityByPrize[prize.id] ?? 0;
        expect(remainingByPrize[prize.id]).toBeGreaterThanOrEqual(0);
        expect(issuedByPrize[prize.id]).toBeLessThanOrEqual(expectedQuantity);
        expect((remainingByPrize[prize.id] ?? 0) + (issuedByPrize[prize.id] ?? 0)).toBe(
          expectedQuantity,
        );
      }
    }

    expect(totalDecisionsExecuted).toBe(1_000_000);
    expect(totalWinsExecuted).toBeGreaterThan(0);
  });
});
