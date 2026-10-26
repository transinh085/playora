import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type AdminOrg,
  type adminApi,
  type BillingInvoice,
  type BillingPlan,
  type BillingUsage,
  ErrorCode,
  type OrgBilling,
  type PlanLimits,
  type RouteArgs,
} from '@playora/contracts';
import { billingMonth, effectivePlan, planLimits } from '@playora/core/billing';
import type { DbOrTx, Tx } from '@playora/db';
import type { Actor } from '../../common/actor';
import { AuditService } from '../../common/audit/audit.service';
import { BillingRepository, type InvoiceRow, type SubscriptionRow } from './billing.repository';

type AdminOrgsQuery = RouteArgs<typeof adminApi.orgs>['query'];
type SetSubscriptionBody = RouteArgs<typeof adminApi.setSubscription>['body'];
type RecordInvoiceBody = RouteArgs<typeof adminApi.recordInvoice>['body'];

export interface OrgPlan {
  plan: BillingPlan;
  limits: PlanLimits;
  subscription: SubscriptionRow | undefined;
}

function toSubscription(row: SubscriptionRow | undefined): OrgBilling['subscription'] {
  return row
    ? {
        plan: row.plan,
        status: row.status,
        currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
      }
    : null;
}

function toInvoice(row: InvoiceRow): BillingInvoice {
  return {
    id: row.id,
    plan: row.plan,
    amountVnd: row.amountVnd,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    paidAt: row.paidAt.toISOString(),
    reference: row.reference ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function orgNotFound(): never {
  throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Organization not found' });
}

/**
 * Plans and quotas (BIL-01/02). Other modules call `assertCanRunCampaign`, `assertCanRedeem`
 * and `watermark`; limit values come from `@playora/core/billing`. Plays and rehearsal are never
 * limited by plan (D-20).
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly repo: BillingRepository,
    private readonly audit: AuditService,
  ) {}

  async planOf(orgId: string, tx?: DbOrTx, now = new Date()): Promise<OrgPlan> {
    const subscription = await this.repo.findSubscription(orgId, tx);
    const plan = effectivePlan(subscription, now);
    return { plan, limits: planLimits(plan), subscription };
  }

  async usage(orgId: string, now = new Date()): Promise<BillingUsage> {
    const month = billingMonth(now);
    const [runningCampaigns, redemptionsThisMonth] = await Promise.all([
      this.repo.countRunningCampaigns(orgId, now),
      this.repo.countRedemptions(orgId, month.start, month.end),
    ]);
    return { runningCampaigns, redemptionsThisMonth, monthStart: month.start.toISOString() };
  }

  /** Free shows the "Tạo bằng Playora" badge in the player shell. */
  async watermark(orgId: string): Promise<boolean> {
    return (await this.planOf(orgId)).limits.watermark;
  }

  /**
   * Call inside the transaction that will make `campaignId` live or scheduled (publish, resume).
   * Takes a per-org lock so concurrent publishes cannot both use the last slot.
   */
  async assertCanRunCampaign(orgId: string, campaignId: string, tx: Tx, now = new Date()) {
    await this.repo.lockOrgUsage(orgId, tx);
    const { plan, limits } = await this.planOf(orgId, tx, now);
    if (limits.maxRunningCampaigns === null) return;
    const running = await this.repo.countRunningCampaigns(
      orgId,
      now,
      { excludeCampaignId: campaignId },
      tx,
    );
    if (running >= limits.maxRunningCampaigns) {
      throw new ConflictException({
        code: ErrorCode.PLAN_CAMPAIGN_LIMIT,
        message: `The ${plan} plan allows ${limits.maxRunningCampaigns} running campaign(s)`,
        details: { plan, limit: limits.maxRunningCampaigns, running },
      });
    }
  }

  /**
   * Refuses a live redemption once this month's count reaches the hard limit (limit + grace,
   * D-21). Not locked: two counters redeeming in the same instant may go one or two over, which
   * the grace already absorbs.
   */
  async assertCanRedeem(orgId: string, now = new Date()) {
    const { plan, limits } = await this.planOf(orgId, undefined, now);
    const month = billingMonth(now);
    const used = await this.repo.countRedemptions(orgId, month.start, month.end);
    if (used >= limits.redemptionsHardLimit) {
      throw new ConflictException({
        code: ErrorCode.PLAN_REDEMPTION_LIMIT,
        message: `The ${plan} plan allows ${limits.redemptionsPerMonth} redemptions per month`,
        details: {
          plan,
          limit: limits.redemptionsPerMonth,
          hardLimit: limits.redemptionsHardLimit,
          used,
          monthStart: month.start.toISOString(),
        },
      });
    }
  }

  async get(orgId: string): Promise<OrgBilling> {
    const now = new Date();
    const [{ plan, limits, subscription }, usage, invoices] = await Promise.all([
      this.planOf(orgId, undefined, now),
      this.usage(orgId, now),
      this.repo.listInvoices(orgId),
    ]);
    return {
      plan,
      subscription: toSubscription(subscription),
      limits,
      usage,
      invoices: invoices.map(toInvoice),
    };
  }

  // ── Platform back-office ─────────────────────────────────────────────────────

  private async toAdminOrg(
    org: { id: string; name: string; slug: string; createdAt: Date },
    subscription: SubscriptionRow | undefined,
    ownerEmail: string | undefined,
    now: Date,
  ): Promise<AdminOrg> {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      ownerEmail: ownerEmail ?? null,
      createdAt: org.createdAt.toISOString(),
      plan: effectivePlan(subscription, now),
      subscription: toSubscription(subscription),
      note: subscription?.note ?? null,
      usage: await this.usage(org.id, now),
    };
  }

  async adminListOrgs(query: AdminOrgsQuery): Promise<{ items: AdminOrg[] }> {
    const now = new Date();
    const orgs = await this.repo.searchOrgs(query.query || undefined, query.limit);
    const ids = orgs.map((o) => o.id);
    const [subs, owners] = await Promise.all([
      this.repo.subscriptionsOf(ids),
      this.repo.ownerEmails(ids),
    ]);
    return {
      items: await Promise.all(
        orgs.map((o) => this.toAdminOrg(o, subs.get(o.id), owners.get(o.id), now)),
      ),
    };
  }

  private async adminOrg(orgId: string): Promise<AdminOrg> {
    const org = await this.repo.findOrg(orgId);
    if (!org) orgNotFound();
    const [sub, owners] = await Promise.all([
      this.repo.findSubscription(orgId),
      this.repo.ownerEmails([orgId]),
    ]);
    return this.toAdminOrg(org, sub, owners.get(orgId), new Date());
  }

  private recordAdminAudit(
    orgId: string,
    actor: Actor,
    action: string,
    targetType: string,
    targetId: string,
    diff: unknown,
    tx: Tx,
  ) {
    return this.audit.record(
      {
        organizationId: orgId,
        actorType: 'admin',
        actorId: actor.userId,
        action,
        targetType,
        targetId,
        diff,
        ip: actor.ip,
      },
      tx,
    );
  }

  async adminSetSubscription(
    orgId: string,
    body: SetSubscriptionBody,
    actor: Actor,
  ): Promise<AdminOrg> {
    if (!(await this.repo.findOrg(orgId))) orgNotFound();
    await this.repo.transaction(async (tx) => {
      const before = await this.repo.findSubscription(orgId, tx);
      const after = await this.repo.upsertSubscription(
        orgId,
        {
          plan: body.plan,
          status: body.status,
          currentPeriodEnd: body.currentPeriodEnd ? new Date(body.currentPeriodEnd) : null,
          note: body.note === undefined ? (before?.note ?? null) : body.note,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.recordAdminAudit(
        orgId,
        actor,
        'billing.subscription.set',
        'organization',
        orgId,
        {
          before: before ? toSubscription(before) : null,
          after: toSubscription(after),
          note: after.note,
        },
        tx,
      );
    });
    return this.adminOrg(orgId);
  }

  /**
   * Records a manual payment and activates its plan until the paid period ends; a period end
   * earlier than the current one never shortens a running subscription of the same plan.
   */
  async adminRecordInvoice(
    orgId: string,
    body: RecordInvoiceBody,
    actor: Actor,
  ): Promise<BillingInvoice> {
    if (!(await this.repo.findOrg(orgId))) orgNotFound();
    const periodEnd = new Date(body.periodEnd);
    const invoice = await this.repo.transaction(async (tx) => {
      const before = await this.repo.findSubscription(orgId, tx);
      const row = await this.repo.insertInvoice(
        orgId,
        {
          plan: body.plan,
          amountVnd: body.amountVnd,
          periodStart: new Date(body.periodStart),
          periodEnd,
          paidAt: new Date(body.paidAt),
          reference: body.reference ?? null,
          createdBy: actor.userId,
        },
        tx,
      );
      const keepLater =
        before?.status === 'active' &&
        before.plan === body.plan &&
        before.currentPeriodEnd &&
        before.currentPeriodEnd.getTime() > periodEnd.getTime();
      const after = await this.repo.upsertSubscription(
        orgId,
        {
          plan: body.plan,
          status: 'active',
          currentPeriodEnd: keepLater ? before.currentPeriodEnd : periodEnd,
          note: before?.note ?? null,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.recordAdminAudit(
        orgId,
        actor,
        'billing.invoice.record',
        'billing_invoice',
        row.id,
        {
          invoice: toInvoice(row),
          before: before ? toSubscription(before) : null,
          after: toSubscription(after),
        },
        tx,
      );
      return row;
    });
    return toInvoice(invoice);
  }
}
