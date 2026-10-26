/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { defaultSetup, PLAYBOOK_KEYS, PLAYBOOKS, playbookRules } from './playbooks';
import {
  coverHour,
  exhaustionRisk,
  MAX_EXHAUST_RISK,
  MAX_WIN_RATE,
  MIN_WIN_RATE,
  prizeQuantities,
  suggestPlaybook,
} from './suggest';

const NOW = new Date('2026-10-27T03:00:00.000Z');
const cost = (q: number[], items: { costVnd: number }[]) =>
  q.reduce((s, n, i) => s + n * (items[i]?.costVnd ?? 0), 0);

describe('prizeQuantities: q_i = floor(B × w_i / c_i)', () => {
  test('the Tết example: 2 million buys about 400 prizes', () => {
    const items = PLAYBOOKS.tet_traffic.prizes;
    const q = prizeQuantities(2_000_000, items);
    expect(q).toEqual([266, 120, 20, 4]);
    expect(q.reduce((a, b) => a + b, 0)).toBe(410);
  });

  test('weights are normalised and an empty weight list splits evenly', () => {
    expect(
      prizeQuantities(100_000, [
        { costVnd: 10_000, weight: 2 },
        { costVnd: 10_000, weight: 2 },
      ]),
    ).toEqual([5, 5]);
    expect(
      prizeQuantities(90_000, [
        { costVnd: 10_000, weight: 0 },
        { costVnd: 5_000, weight: 0 },
      ]),
    ).toEqual([4, 9]);
    expect(prizeQuantities(50_000, [{ costVnd: 0, weight: 1 }])).toEqual([0]);
  });

  test('Σ q_i × c_i ≤ B for any budget, costs and weights (acceptance §4.2)', () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed / 2_147_483_648;
    };
    for (let run = 0; run < 2_000; run++) {
      const items = Array.from({ length: 1 + Math.floor(rand() * 6) }, () => ({
        costVnd: 1 + Math.floor(rand() * 200_000),
        weight: rand() < 0.1 ? 0 : rand() * 3,
      }));
      const budget = Math.floor(rand() * 20_000_000);
      const q = prizeQuantities(budget, items);
      expect(q.every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
      expect(cost(q, items)).toBeLessThanOrEqual(budget);
    }
  });
});

describe('coverHour', () => {
  test('90% of the hours when open every day', () => {
    expect(coverHour(20, 2, null)).toBe(432);
  });
  test('the first open day past 90% of open days otherwise', () => {
    // 28 days from a Tuesday, Tue–Thu: 12 open days; index 10 = day 22 (Wednesday, week 4).
    expect(coverHour(28, 2, [2, 3, 4])).toBe(22 * 24);
  });
});

describe('suggestPlaybook', () => {
  test('every playbook stays within budget and runs out early in ≤ 10% of runs', () => {
    for (const key of PLAYBOOK_KEYS) {
      const setup = defaultSetup(key, key, NOW);
      const s = suggestPlaybook(key, setup);
      expect(s.totalCostVnd).toBeLessThanOrEqual(setup.budgetVnd);
      expect(s.rules.budgetVnd).toBe(setup.budgetVnd);
      expect(s.winRate).toBeGreaterThanOrEqual(MIN_WIN_RATE);
      expect(s.winRate).toBeLessThanOrEqual(MAX_WIN_RATE);
      expect(s.risk).toBeLessThanOrEqual(MAX_EXHAUST_RISK);
      expect(s.tooFewPrizes).toBe(false);
      // Independent check on fresh seeds: the chosen rate is safe, and much higher is not.
      const input = {
        rules: s.rules,
        prizes: s.prizes,
        guestsPerDay: setup.guestsPerDay,
        days: s.days,
        seed: 'check',
        seeds: 20,
      };
      expect(exhaustionRisk(input, s.winRate)).toBeLessThanOrEqual(0.2);
      if (s.winRate * 1.5 <= MAX_WIN_RATE) {
        expect(exhaustionRisk(input, s.winRate * 1.5)).toBeGreaterThan(MAX_EXHAUST_RISK);
      }
    }
  });

  test('the Tết default reads as the spec sentence: ~400 prizes, about 1 in 3–4 guests, 20 days', () => {
    const s = suggestPlaybook('tet_traffic', defaultSetup('tet_traffic', 'Tết', NOW));
    expect(s.totalPrizes).toBe(410);
    expect(s.days).toBe(20);
    expect(s.openDays).toBe(20);
    expect(s.oneIn).toBeGreaterThanOrEqual(3);
    expect(s.oneIn).toBeLessThanOrEqual(4);
    expect(s.prizes.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  test('more guests → lower win rate; plentiful prizes cap at the maximum', () => {
    const setup = defaultSetup('tet_traffic', 'Tết', NOW);
    const few = suggestPlaybook('tet_traffic', { ...setup, guestsPerDay: 40 });
    const many = suggestPlaybook('tet_traffic', { ...setup, guestsPerDay: 400 });
    expect(many.winRate).toBeLessThan(few.winRate);
    const rich = suggestPlaybook('tet_traffic', {
      ...setup,
      budgetVnd: 50_000_000,
      guestsPerDay: 20,
    });
    expect(rich.winRate).toBe(MAX_WIN_RATE);
  });

  test('flags too few prizes for the traffic', () => {
    const setup = defaultSetup('slow_days', 'x', NOW);
    const s = suggestPlaybook('slow_days', { ...setup, budgetVnd: 100_000, guestsPerDay: 3_000 });
    expect(s.tooFewPrizes).toBe(true);
    expect(s.winRate).toBe(MIN_WIN_RATE);
  });

  test('slow days counts only open weekdays and keeps them in the rules', () => {
    const s = suggestPlaybook('slow_days', defaultSetup('slow_days', 'x', NOW));
    expect(s.openDays).toBe(12);
    expect(s.expectedPlays).toBe(PLAYBOOKS.slow_days.guestsPerDay * 12);
    expect(s.rules.openDays).toEqual([2, 3, 4]);
  });

  test('fast enough to run on every form change', () => {
    const setup = { ...defaultSetup('second_visit', 'x', NOW), guestsPerDay: 1_000 };
    const started = performance.now();
    suggestPlaybook('second_visit', setup);
    expect(performance.now() - started).toBeLessThan(300);
  });

  test('base rules match the playbook', () => {
    const setup = defaultSetup('second_visit', 'x', NOW);
    const s = suggestPlaybook('second_visit', setup);
    expect(s.rules).toEqual({ ...playbookRules('second_visit', setup), overallWinRate: s.winRate });
  });
});
