import { z } from 'zod';
import { AuthId, Id, IsoDateTime, OrgParams } from './common';
import { defineRoute } from './route';

/**
 * Plans and manual billing (BIL-01/02, docs/business/business-model.md §3). Limit values live in
 * `@playora/core/billing`; these schemas only describe what the API returns.
 */

/** `free` = Free, `shop` = Quán, `chain` = Chuỗi. */
export const BillingPlan = z.enum(['free', 'shop', 'chain']);
export type BillingPlan = z.infer<typeof BillingPlan>;

export const SubscriptionStatus = z.enum(['active', 'expired']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

export const PlanLimits = z.object({
  /** Published campaigns that are live or scheduled at once; null = unlimited. */
  maxRunningCampaigns: z.number().int().nullable(),
  /** Live counter redemptions per calendar month (Asia/Ho_Chi_Minh), D-20. */
  redemptionsPerMonth: z.number().int(),
  /**
   * Redemptions are refused only from this number on (limit + grace, D-21), so a customer who
   * already won is not turned away the moment the shop crosses its limit.
   */
  redemptionsHardLimit: z.number().int(),
  watermark: z.boolean(),
});
export type PlanLimits = z.infer<typeof PlanLimits>;

export const BillingUsage = z.object({
  runningCampaigns: z.number().int(),
  redemptionsThisMonth: z.number().int(),
  /** Start of the current calendar month in Asia/Ho_Chi_Minh. */
  monthStart: IsoDateTime,
});
export type BillingUsage = z.infer<typeof BillingUsage>;

export const BillingInvoice = z.object({
  id: Id,
  plan: BillingPlan,
  amountVnd: z.number().int(),
  periodStart: IsoDateTime,
  periodEnd: IsoDateTime,
  paidAt: IsoDateTime,
  reference: z.string().nullable(),
  createdAt: IsoDateTime,
});
export type BillingInvoice = z.infer<typeof BillingInvoice>;

export const OrgBilling = z.object({
  /** Plan in effect now (Free when there is no subscription or it has lapsed). */
  plan: BillingPlan,
  /** Stored subscription; null when the organization never had one. */
  subscription: z
    .object({
      plan: BillingPlan,
      status: SubscriptionStatus,
      currentPeriodEnd: IsoDateTime.nullable(),
    })
    .nullable(),
  limits: PlanLimits,
  usage: BillingUsage,
  invoices: z.array(BillingInvoice),
});
export type OrgBilling = z.infer<typeof OrgBilling>;

// ── Platform back-office (internal staff, PLATFORM_ADMIN_EMAILS) ────────────

export const AdminOrg = z.object({
  id: AuthId,
  name: z.string(),
  slug: z.string(),
  ownerEmail: z.string().nullable(),
  createdAt: IsoDateTime,
  plan: BillingPlan,
  subscription: OrgBilling.shape.subscription,
  note: z.string().nullable(),
  usage: BillingUsage,
});
export type AdminOrg = z.infer<typeof AdminOrg>;

export const AdminOrgsQuery = z.object({
  /** Matches organization name, slug or an owner's email (case-insensitive). */
  query: z.string().trim().max(120).optional(),
  limit: z.coerce.number<number | string>().int().min(1).max(100).default(50),
});

export const SetSubscriptionBody = z.object({
  plan: BillingPlan,
  status: SubscriptionStatus.default('active'),
  currentPeriodEnd: IsoDateTime.nullable(),
  note: z.string().trim().max(1000).nullable().optional(),
});
export type SetSubscriptionBody = z.input<typeof SetSubscriptionBody>;

export const RecordInvoiceBody = z
  .object({
    plan: BillingPlan.exclude(['free']),
    amountVnd: z.number().int().min(0).max(2_000_000_000),
    periodStart: IsoDateTime,
    periodEnd: IsoDateTime,
    paidAt: IsoDateTime,
    reference: z.string().trim().max(200).nullable().optional(),
  })
  .refine((b) => Date.parse(b.periodStart) < Date.parse(b.periodEnd), {
    message: 'Kỳ kết thúc phải sau kỳ bắt đầu',
    path: ['periodEnd'],
  });
export type RecordInvoiceBody = z.input<typeof RecordInvoiceBody>;

export const billingApi = {
  get: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/billing',
    summary: 'Current plan, limits, usage this month and invoices of an organization',
    tags: ['billing'],
    auth: 'session',
    permission: { billing: ['read'] },
    params: OrgParams,
    response: OrgBilling,
  }),
};

export const adminApi = {
  orgs: defineRoute({
    method: 'GET',
    path: '/admin/orgs',
    summary: 'Back-office: search organizations with their plan and usage',
    tags: ['admin'],
    auth: 'session',
    platformAdmin: true,
    query: AdminOrgsQuery,
    response: z.object({ items: z.array(AdminOrg) }),
  }),
  setSubscription: defineRoute({
    method: 'PUT',
    path: '/admin/orgs/:orgId/subscription',
    summary: 'Back-office: activate or change an organization’s plan by hand (audited)',
    tags: ['admin'],
    auth: 'session',
    platformAdmin: true,
    params: OrgParams,
    body: SetSubscriptionBody,
    response: AdminOrg,
  }),
  recordInvoice: defineRoute({
    method: 'POST',
    path: '/admin/orgs/:orgId/invoices',
    summary:
      'Back-office: record a manual payment; activates the plan until the paid period ends (audited)',
    tags: ['admin'],
    auth: 'session',
    platformAdmin: true,
    params: OrgParams,
    body: RecordInvoiceBody,
    response: BillingInvoice,
    status: 201,
  }),
};
