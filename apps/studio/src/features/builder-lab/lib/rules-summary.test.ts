/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import type { CampaignPrize, CampaignRules } from '@playora/contracts';
import { prizeTotals, ruleIssues, summarizeRules } from './rules-summary';

const rules: CampaignRules = {
  mode: 'overall_win_rate',
  overallWinRate: 0.35,
  playsPerDay: 2,
  maxWinsPerPlayer: 1,
  startsAt: '2027-01-20T01:00:00.000Z',
  endsAt: '2027-02-03T01:00:00.000Z',
  openingHours: { start: '07:00', end: '22:00' },
  pacing: true,
  budgetVnd: null,
  collectForm: true,
  openDays: null,
  requireRedeemBeforeReplay: false,
  antiFraud: 'standard',
};

const prizes: CampaignPrize[] = [
  { id: 'a', name: 'A', quantity: 100, valueVnd: 30_000, probability: 0.25 },
  { id: 'b', name: 'B', quantity: 10, valueVnd: 250_000, probability: 0.1 },
];

const fmt = {
  dateTime: (iso: string) => iso.slice(0, 10),
  vnd: (n: number) => `${n}đ`,
  weekdays: (days: readonly number[]) => days.join('|'),
};
const byKey = (lines: ReturnType<typeof summarizeRules>) =>
  Object.fromEntries(lines.map((l) => [l.key, l.values ?? {}]));

describe('prizeTotals', () => {
  test('sums stock, value and probability', () => {
    expect(prizeTotals(prizes)).toEqual({
      count: 2,
      stock: 110,
      valueVnd: 5_500_000,
      probabilityPercent: 35,
    });
  });
});

describe('summarizeRules', () => {
  test('describes every rule in order', () => {
    const lines = summarizeRules(rules, prizes, fmt);
    expect(lines.map((l) => l.key)).toEqual([
      'modeOverall',
      'prizes',
      'plays',
      'maxWins',
      'window',
      'hours',
      'pacingOn',
      'budgetOff',
      'formOn',
    ]);
    const v = byKey(lines);
    expect(v.modeOverall).toEqual({ rate: 35 });
    expect(v.prizes).toEqual({ count: 2, stock: 110, value: '5500000đ' });
    expect(v.plays).toEqual({ count: 2 });
    expect(v.window).toEqual({ start: '2027-01-20', end: '2027-02-03', days: 14 });
    expect(v.hours).toEqual({ start: '07:00', end: '22:00' });
  });

  test('per-prize mode reports the total and the losing share', () => {
    const v = byKey(summarizeRules({ ...rules, mode: 'per_prize_probability' }, prizes, fmt));
    expect(v.modePerPrize).toEqual({ total: 35, lose: 65 });
  });

  test('guaranteed, all day, no pacing, budget, no form', () => {
    const keys = summarizeRules(
      {
        ...rules,
        mode: 'guaranteed',
        openingHours: null,
        pacing: false,
        budgetVnd: 1_000_000,
        collectForm: false,
        openDays: null,
        requireRedeemBeforeReplay: false,
        antiFraud: 'standard',
      },
      [],
      fmt,
    ).map((l) => l.key);
    expect(keys).toContain('modeGuaranteed');
    expect(keys).toContain('noPrizes');
    expect(keys).toContain('hoursAllDay');
    expect(keys).toContain('pacingOff');
    expect(keys).toContain('budget');
    expect(keys).toContain('formOff');
  });

  test('default formatters produce readable VND', () => {
    const v = byKey(summarizeRules(rules, prizes));
    expect(String(v.prizes?.value)).toContain('5.500.000');
  });

  test('open weekdays, redeem before replay and low anti-fraud each add a line', () => {
    const lines = summarizeRules(
      { ...rules, openDays: [4, 2, 3], requireRedeemBeforeReplay: true, antiFraud: 'low' },
      prizes,
      fmt,
    );
    const keys = lines.map((l) => l.key);
    expect(keys.slice(keys.indexOf('hours'))).toEqual([
      'hours',
      'openDays',
      'pacingOn',
      'budgetOff',
      'formOn',
      'redeemFirst',
      'antiFraudLow',
    ]);
    expect(byKey(lines).openDays).toEqual({ days: '4|2|3' });
    expect(byKey(summarizeRules({ ...rules, openDays: [0, 2, 3] }, prizes)).openDays).toEqual({
      days: 'T3, T4, CN',
    });
    // All seven days is "every day": no line.
    expect(
      summarizeRules({ ...rules, openDays: [0, 1, 2, 3, 4, 5, 6] }, prizes, fmt).map((l) => l.key),
    ).not.toContain('openDays');
  });
});

describe('ruleIssues', () => {
  test('valid rules have no issues', () => {
    expect(ruleIssues(rules, prizes)).toEqual([]);
  });

  test('flags probability over 100% only in per-prize mode', () => {
    const heavy = prizes.map((p) => ({ ...p, probability: 0.6 }));
    expect(ruleIssues(rules, heavy)).toEqual([]);
    expect(ruleIssues({ ...rules, mode: 'per_prize_probability' }, heavy)).toEqual([
      { key: 'probabilityOver', values: { total: 120 } },
    ]);
  });

  test('flags empty prizes, zero stock, bad window, bad hours, tiny budget', () => {
    expect(ruleIssues(rules, []).map((i) => i.key)).toEqual(['noPrizes']);
    expect(
      ruleIssues(
        rules,
        prizes.slice(0, 1).map((p) => ({ ...p, quantity: 0 })),
      ).map((i) => i.key),
    ).toEqual(['noStock']);
    expect(
      ruleIssues(
        {
          ...rules,
          endsAt: rules.startsAt,
          openingHours: { start: '22:00', end: '07:00' },
          budgetVnd: 1000,
        },
        prizes,
      ).map((i) => i.key),
    ).toEqual(['windowOrder', 'hoursOrder', 'budgetBelowCheapest']);
  });
});
