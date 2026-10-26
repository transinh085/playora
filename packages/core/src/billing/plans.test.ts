import { describe, expect, test } from 'bun:test';
import { billingMonth, effectivePlan, planLimits } from './plans';

describe('plans', () => {
  test('limits match the business model (§3.2) with a 10% redemption grace', () => {
    expect(planLimits('free')).toEqual({
      maxRunningCampaigns: 1,
      redemptionsPerMonth: 100,
      redemptionsHardLimit: 110,
      watermark: true,
    });
    expect(planLimits('shop')).toMatchObject({
      maxRunningCampaigns: 3,
      redemptionsPerMonth: 2_000,
      redemptionsHardLimit: 2_200,
      watermark: false,
    });
    expect(planLimits('chain')).toMatchObject({
      maxRunningCampaigns: null,
      redemptionsPerMonth: 10_000,
      watermark: false,
    });
  });

  test('no subscription, expired or past its period end means Free', () => {
    const now = new Date('2027-01-15T00:00:00Z');
    expect(effectivePlan(null, now)).toBe('free');
    expect(effectivePlan({ plan: 'shop', status: 'expired', currentPeriodEnd: null }, now)).toBe(
      'free',
    );
    expect(
      effectivePlan(
        { plan: 'shop', status: 'active', currentPeriodEnd: new Date('2027-01-14T00:00:00Z') },
        now,
      ),
    ).toBe('free');
    expect(
      effectivePlan(
        { plan: 'chain', status: 'active', currentPeriodEnd: new Date('2027-02-14T00:00:00Z') },
        now,
      ),
    ).toBe('chain');
    expect(effectivePlan({ plan: 'shop', status: 'active', currentPeriodEnd: null }, now)).toBe(
      'shop',
    );
  });

  test('the billing month is the calendar month in Vietnam', () => {
    // 2027-01-31T17:30Z is already 1 February 00:30 in Hồ Chí Minh City (UTC+7).
    const feb = billingMonth(new Date('2027-01-31T17:30:00Z'));
    expect(feb.start.toISOString()).toBe('2027-01-31T17:00:00.000Z');
    expect(feb.end.toISOString()).toBe('2027-02-28T17:00:00.000Z');
    const jan = billingMonth(new Date('2027-01-31T16:59:59Z'));
    expect(jan.start.toISOString()).toBe('2026-12-31T17:00:00.000Z');
    const dec = billingMonth(new Date('2026-12-10T00:00:00Z'));
    expect(dec.end.toISOString()).toBe('2026-12-31T17:00:00.000Z');
  });
});
