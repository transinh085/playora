/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import type { SimulationResult } from '@playora/core/prize';
import { simulate } from '@playora/core/prize';
import type { LabPrize, LabRules } from '../mock/types';
import { issuedByDay, stockOutAt, summarizeSimulation } from './rules-sim';

const rules: LabRules = {
  mode: 'overall_win_rate',
  overallWinRate: 0.35,
  playsPerDay: 1,
  maxWinsPerPlayer: 1,
  startsAt: '2027-01-20T00:00:00.000Z',
  endsAt: '2027-01-24T00:00:00.000Z',
  openingHours: null,
  pacing: false,
  budgetVnd: null,
  collectForm: true,
};
const prizes: LabPrize[] = [
  { id: 'a', name: 'A', quantity: 30, valueVnd: 10_000 },
  { id: 'b', name: 'B', quantity: 10, valueVnd: 50_000 },
];

function result(patch: Partial<SimulationResult>): SimulationResult {
  return {
    issuedByHour: [],
    remainingByHour: [],
    leftover: 0,
    leftoverByPrize: {},
    exhaustedAt: null,
    exhaustedAtHour: null,
    effectiveWinRate: 0,
    totalValue: 0,
    totalPlays: 0,
    totalWins: 0,
    reasons: { win: 0, lose: 0, out_of_stock: 0, limit: 0, budget: 0, paced: 0, closed: 0 },
    ...patch,
  };
}

describe('issuedByDay', () => {
  test('groups hours into days, keeping a partial last day', () => {
    const hours = [...new Array(24).fill(1), ...new Array(24).fill(2), 5];
    expect(issuedByDay(hours)).toEqual([24, 48, 5]);
    expect(issuedByDay([])).toEqual([]);
  });
});

describe('stockOutAt', () => {
  test('gives the 1-based day and local time', () => {
    // 2027-01-21 07:30Z = 14:30 in Ho Chi Minh City, hour index 31 → day 2.
    expect(
      stockOutAt({ exhaustedAt: new Date('2027-01-21T07:30:00Z'), exhaustedAtHour: 31 }),
    ).toEqual({ day: 2, time: '14:30' });
    expect(stockOutAt({ exhaustedAt: null, exhaustedAtHour: null })).toBeNull();
  });
});

describe('summarizeSimulation', () => {
  test('early stock-out warns and suggests pacing, a lower rate and more stock', () => {
    const s = summarizeSimulation(
      result({
        totalPlays: 200,
        totalWins: 40,
        totalValue: 800_000,
        leftover: 0,
        leftoverByPrize: { a: 0, b: 0 },
        exhaustedAt: new Date('2027-01-21T07:00:00Z'),
        exhaustedAtHour: 31,
        issuedByHour: new Array(48).fill(0).map((_, h) => (h < 32 ? 1.25 : 0)),
        reasons: { win: 40, lose: 160, out_of_stock: 0, limit: 0, budget: 0, paced: 0, closed: 0 },
      }),
      { rules, prizes, days: 4 },
    );
    expect(s.wins).toBe(40);
    expect(s.winRate).toBe(0.2);
    expect(s.stockOut?.day).toBe(2);
    expect(s.warnings[0]).toMatchObject({
      key: 'stockOutEarly',
      severity: 'warning',
      suggestions: ['turnOnPacing', 'lowerRate', 'addStock'],
    });
    expect(s.perPrize.map((p) => p.issued)).toEqual([30, 10]);
  });

  test('a lot left over suggests a higher rate; closed plays are excluded from the rate', () => {
    const s = summarizeSimulation(
      result({
        totalPlays: 120,
        totalWins: 4,
        leftover: 36,
        leftoverByPrize: { a: 28, b: 8 },
        reasons: { win: 4, lose: 96, out_of_stock: 0, limit: 0, budget: 0, paced: 0, closed: 20 },
      }),
      { rules: { ...rules, openingHours: { start: '07:00', end: '22:00' } }, prizes, days: 4 },
    );
    expect(s.plays).toBe(100);
    expect(s.closedPlays).toBe(20);
    expect(s.winRate).toBe(0.04);
    expect(s.leftoverRatio).toBe(0.9);
    expect(s.warnings[0]).toMatchObject({
      key: 'leftover',
      values: { percent: 90, count: 36 },
      suggestions: ['raiseRate', 'longerHours', 'fewerPrizes'],
    });
  });

  test('limit and budget notes, and healthy when nothing is wrong', () => {
    const limited = summarizeSimulation(
      result({
        totalPlays: 100,
        totalWins: 40,
        leftover: 0,
        exhaustedAt: new Date('2027-01-23T20:00:00Z'),
        exhaustedAtHour: 92,
        reasons: { win: 40, lose: 20, out_of_stock: 0, limit: 30, budget: 10, paced: 0, closed: 0 },
      }),
      { rules, prizes, days: 4 },
    );
    expect(limited.warnings.map((w) => w.key)).toEqual(['budgetReached', 'limitBlocks']);

    const healthy = summarizeSimulation(result({ totalPlays: 100, totalWins: 35, leftover: 5 }), {
      rules,
      prizes,
      days: 4,
    });
    expect(healthy.warnings).toEqual([
      { key: 'healthy', severity: 'success', values: { percent: 13 }, suggestions: [] },
    ]);
  });

  test('no wins at all is a warning', () => {
    const s = summarizeSimulation(result({ totalPlays: 50, totalWins: 0, leftover: 40 }), {
      rules: { ...rules, mode: 'per_prize_probability' },
      prizes,
      days: 4,
    });
    expect(s.warnings[0]).toMatchObject({ key: 'noWins', suggestions: ['raiseProbability'] });
  });

  test('works on a real engine run', () => {
    const real = simulate({
      rules: {
        mode: 'guaranteed',
        prizes: prizes.map((p) => ({ id: p.id, quantity: p.quantity, valueVnd: p.valueVnd })),
        window: { startsAt: rules.startsAt, endsAt: rules.endsAt },
      },
      traffic: 2,
      players: 500,
      days: 4,
      seed: 'test',
    });
    const s = summarizeSimulation(real, {
      rules: { ...rules, mode: 'guaranteed' },
      prizes,
      days: 4,
    });
    expect(s.wins).toBe(40);
    expect(s.perDay.reduce((a, b) => a + b, 0)).toBe(40);
    expect(s.stockOut?.day).toBe(1);
    expect(s.warnings[0]?.key).toBe('stockOutEarly');
  });
});
