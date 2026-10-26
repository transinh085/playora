import type { BillingPlan, PlanLimits, SubscriptionStatus } from '@playora/contracts';
import { getTimezoneOffsetMs } from '../prize/schedule';

/**
 * Plans (docs/business/business-model.md §3.2, D-20). Limits live in code, not in the DB: a price
 * change is a deploy, and the DB only says which plan an organization is on.
 *
 * The limit unit is live counter redemptions per calendar month, never plays (D-20): a shop
 * "uses up" its plan only when real customers come to the counter.
 */

/**
 * Redemptions keep working for 10% over the monthly limit (D-21, founder review): the Studio
 * warns at 80% and 100%, and only after the grace is the counter refused, so a customer who
 * already won is not turned away the moment the shop crosses its limit.
 */
export const REDEMPTION_GRACE_RATIO = 0.1;

/** Billing months follow the calendar in Vietnam, whatever a campaign's own timezone. */
export const BILLING_TIMEZONE = 'Asia/Ho_Chi_Minh';

interface PlanDefinition {
  maxRunningCampaigns: number | null;
  redemptionsPerMonth: number;
  watermark: boolean;
}

export const PLANS: Record<BillingPlan, PlanDefinition> = {
  free: { maxRunningCampaigns: 1, redemptionsPerMonth: 100, watermark: true },
  shop: { maxRunningCampaigns: 3, redemptionsPerMonth: 2_000, watermark: false },
  chain: { maxRunningCampaigns: null, redemptionsPerMonth: 10_000, watermark: false },
};

export function planLimits(plan: BillingPlan): PlanLimits {
  const def = PLANS[plan];
  return {
    ...def,
    redemptionsHardLimit: Math.floor(def.redemptionsPerMonth * (1 + REDEMPTION_GRACE_RATIO)),
  };
}

export interface StoredSubscription {
  plan: BillingPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
}

/** Plan in effect at `now`: no subscription, `expired`, or a passed period end all mean Free. */
export function effectivePlan(sub: StoredSubscription | null | undefined, now = new Date()) {
  if (sub?.status !== 'active') return 'free' as const;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() <= now.getTime()) return 'free';
  return sub.plan;
}

/** Midnight local time on day 1 of `year`/`month` (1-based) in `timeZone`, as an instant. */
function localMonthStart(year: number, month: number, timeZone: string): Date {
  const wallClock = Date.UTC(year, month - 1, 1);
  let at = wallClock - getTimezoneOffsetMs(timeZone, wallClock);
  at = wallClock - getTimezoneOffsetMs(timeZone, at);
  return new Date(at);
}

/** `[start, end)` of the billing month that contains `now`. */
export function billingMonth(now = new Date(), timeZone = BILLING_TIMEZONE) {
  const [y, m] = new Intl.DateTimeFormat('en-CA', { timeZone })
    .format(now)
    .split('-')
    .map(Number) as [number, number];
  return {
    start: localMonthStart(y, m, timeZone),
    end: m === 12 ? localMonthStart(y + 1, 1, timeZone) : localMonthStart(y, m + 1, timeZone),
  };
}
