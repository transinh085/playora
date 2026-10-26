import { describe, expect, test } from 'bun:test';
import type { CampaignPrize, CampaignRules } from '@playora/contracts';
import { campaignPhase, localDayKey, toPrizeRules } from './campaign';
import { decide } from './decide';
import { PrizeRules } from './schemas';

const rules: CampaignRules = {
  mode: 'per_prize_probability',
  overallWinRate: 0.3,
  playsPerDay: 1,
  maxWinsPerPlayer: 1,
  startsAt: '2027-01-01T00:00:00.000Z',
  endsAt: '2027-02-01T00:00:00.000Z',
  openingHours: { start: '07:00', end: '22:00' },
  pacing: true,
  budgetVnd: 1_000_000,
  collectForm: true,
};
const prizes: CampaignPrize[] = [
  { id: 'p1', name: 'Cà phê', quantity: 10, valueVnd: 30_000, probability: 0.5 },
  { id: 'p2', name: 'Voucher', quantity: 5, valueVnd: 50_000, probability: 0.1 },
];

describe('toPrizeRules', () => {
  test('maps a live campaign to valid engine rules with schedule and pacing', () => {
    const parsed = PrizeRules.parse(toPrizeRules(rules, prizes, { rehearsal: false }));
    expect(parsed.pacing).toMatchObject({ strategy: 'time_uniform', smoothing: true });
    expect(parsed.openingHours).toHaveLength(1);
    expect(parsed.prizes.map((p) => p.probability)).toEqual([0.5, 0.1]);
    expect(parsed.limits.perPlayerTotal).toBe(1);
    expect(parsed.budgetVnd).toBe(1_000_000);
  });

  test('rehearsal ignores schedule and pacing so testers always get a real roll', () => {
    const now = new Date('2030-06-01T03:00:00.000Z');
    const parsed = PrizeRules.parse(toPrizeRules(rules, prizes, { rehearsal: true, now }));
    expect(parsed.pacing.strategy).toBe('none');
    expect(parsed.openingHours).toBeUndefined();
    const decision = decide({
      rules: parsed,
      snapshot: {},
      now,
      rng: () => 0.01,
    });
    expect(decision).toEqual({ prizeId: 'p1', reason: 'win' });
  });

  test('remaining stock is clamped to the quantity', () => {
    const parsed = PrizeRules.parse(
      toPrizeRules(rules, prizes, { rehearsal: false, remainingByPrize: { p1: 50, p2: -3 } }),
    );
    expect(parsed.prizes.map((p) => p.remaining)).toEqual([10, 0]);
  });
});

describe('campaignPhase', () => {
  const base = { published: true, paused: false, startsAt: rules.startsAt, endsAt: rules.endsAt };
  const at = (iso: string) => Date.parse(iso);

  test('derives draft, scheduled, live, paused and ended', () => {
    expect(campaignPhase({ ...base, published: false }, at('2027-01-10T00:00:00Z'))).toBe('draft');
    expect(campaignPhase(base, at('2026-12-31T00:00:00Z'))).toBe('scheduled');
    expect(campaignPhase(base, at('2027-01-10T00:00:00Z'))).toBe('live');
    expect(campaignPhase({ ...base, paused: true }, at('2027-01-10T00:00:00Z'))).toBe('paused');
    expect(campaignPhase({ ...base, paused: true }, at('2027-03-01T00:00:00Z'))).toBe('ended');
  });
});

test('localDayKey uses the campaign timezone', () => {
  // 18:00 UTC is already the next day in Vietnam (UTC+7).
  expect(localDayKey(new Date('2027-01-01T18:00:00Z'))).toBe('2027-01-02');
  expect(localDayKey(new Date('2027-01-01T18:00:00Z'), 'UTC')).toBe('2027-01-01');
});
