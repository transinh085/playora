import type { BillingPlan } from '@playora/contracts';
import type { Route } from 'next';

/** Order plans are listed in, cheapest first. */
export const PLAN_ORDER = ['free', 'shop', 'chain'] as const satisfies readonly BillingPlan[];

export type BillingPeriod = 'monthly' | 'yearly';

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
 * Transfer memo that lets staff match the payment to the organization, plan, and billing period (`BIL-01`).
 */
export function transferMemo(
  orgSlug: string,
  plan: BillingPlan,
  period: BillingPeriod = 'monthly',
): string {
  return `PLAYORA ${orgSlug} ${plan} ${period}`.toUpperCase();
}

/**
 * Dynamic VietQR image URL (`https://img.vietqr.io/image/...`) with pre-filled amount and memo (`BIL-01`).
 */
export function vietQrImageUrl(params: {
  bankBin?: string;
  accountNumber?: string;
  accountName?: string;
  amountVnd: number;
  memo: string;
}): string {
  const bankBin = params.bankBin ?? MANUAL_PAYMENT.bankBin;
  const accountNumber = (params.accountNumber ?? MANUAL_PAYMENT.accountNumber).replace(/\s+/g, '');
  const accountName = params.accountName ?? MANUAL_PAYMENT.accountName;
  const query = new URLSearchParams({
    amount: String(Math.max(0, Math.round(params.amountVnd))),
    addInfo: params.memo,
    accountName,
  });
  return `https://img.vietqr.io/image/${encodeURIComponent(bankBin)}-${encodeURIComponent(accountNumber)}-compact2.png?${query.toString()}`;
}

/**
 * Manual payment (M1: VietQR / bank transfer, activated by hand in the back-office; PayOS is M2).
 * Configurable via NEXT_PUBLIC_BILLING_* environment variables with realistic defaults.
 */
export const MANUAL_PAYMENT = {
  bankBin: process.env.NEXT_PUBLIC_BILLING_BANK_BIN || 'MB',
  bankName: process.env.NEXT_PUBLIC_BILLING_BANK_NAME || 'MB Bank (Ngân hàng Quân Đội)',
  accountNumber: process.env.NEXT_PUBLIC_BILLING_ACCOUNT_NUMBER || '0988776655',
  accountName: process.env.NEXT_PUBLIC_BILLING_ACCOUNT_NAME || 'CONG TY TNHH PLAYORA VIET NAM',
  contactEmail: process.env.NEXT_PUBLIC_BILLING_CONTACT_EMAIL || 'billing@playora.vn',
  /** Transfer note that lets staff match the payment to the organization and billing period. */
  transferNote: (orgSlug: string, plan: BillingPlan, period: BillingPeriod = 'monthly') =>
    transferMemo(orgSlug, plan, period),
} as const;

/** The plan & usage page of an organization. */
export const billingPath = (orgId: string) => `/orgs/${orgId}/settings/billing` as Route;
