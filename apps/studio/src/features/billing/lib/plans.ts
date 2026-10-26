import type { BillingPlan } from '@playora/contracts';
import type { Route } from 'next';

/** Order plans are listed in, cheapest first. */
export const PLAN_ORDER = ['free', 'shop', 'chain'] as const satisfies readonly BillingPlan[];

/**
 * List prices in VND (docs/business/business-model.md §3.2, `[GĐ]` = still an assumption). Limits
 * come from `@playora/core/billing`; prices are shown only, never charged by the Studio.
 */
export const PLAN_PRICES: Record<BillingPlan, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  shop: { monthly: 299_000, yearly: 2_990_000 },
  chain: { monthly: 799_000, yearly: 7_990_000 },
};

/**
 * Manual payment (M1: VietQR / bank transfer, activated by hand in the back-office; PayOS is M2).
 * Placeholder values until the company account is opened — change them here, not in the UI.
 */
export const MANUAL_PAYMENT = {
  bankName: 'Ngân hàng (đang cập nhật)',
  accountNumber: '0000 0000 0000',
  accountName: 'PLAYORA',
  contactEmail: 'billing@playora.vn',
  /** Transfer note that lets staff match the payment to the organization. */
  transferNote: (orgSlug: string, plan: BillingPlan) => `PLAYORA ${orgSlug} ${plan}`.toUpperCase(),
} as const;

/** The plan & usage page of an organization. */
export const billingPath = (orgId: string) => `/orgs/${orgId}/settings/billing` as Route;
