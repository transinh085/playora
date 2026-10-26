import { index, integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createdAt, id, orgId, timestamps } from './_shared';
import { user } from './auth';

/**
 * Plans (BIL-01/02). Limits live in code (`@playora/core/billing`); the DB only records which plan
 * an organization is on. No row, `expired`, or a passed `currentPeriodEnd` means Free.
 */
export const billingPlan = pgEnum('billing_plan', ['free', 'shop', 'chain']);
export const subscriptionStatus = pgEnum('subscription_status', ['active', 'expired']);

export const orgSubscriptions = pgTable('org_subscriptions', {
  organizationId: orgId().primaryKey(),
  plan: billingPlan().notNull().default('free'),
  status: subscriptionStatus().notNull().default('active'),
  /** Paid until; null = no end date (e.g. a pilot shop kept on a plan until further notice). */
  currentPeriodEnd: timestamp({ withTimezone: true }),
  note: text(),
  updatedBy: text().references(() => user.id, { onDelete: 'set null' }),
  ...timestamps,
});

/** Manual payment record (M1: bank transfer / VietQR checked by hand). Append-only. */
export const billingInvoices = pgTable(
  'billing_invoices',
  {
    id: id(),
    organizationId: orgId(),
    plan: billingPlan().notNull(),
    amountVnd: integer().notNull(),
    periodStart: timestamp({ withTimezone: true }).notNull(),
    periodEnd: timestamp({ withTimezone: true }).notNull(),
    paidAt: timestamp({ withTimezone: true }).notNull(),
    /** Bank transfer reference, receipt number… */
    reference: text(),
    createdBy: text().references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.organizationId, t.paidAt)],
);
