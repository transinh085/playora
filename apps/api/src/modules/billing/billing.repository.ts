import { Inject, Injectable } from '@nestjs/common';
import { type Database, type DbOrTx, schema, type Tx } from '@playora/db';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { DB } from '../../infra/tokens';

const {
  awards,
  billingInvoices,
  events,
  games,
  member,
  orgSubscriptions,
  organization,
  plays,
  prizes,
  user,
} = schema;

export type SubscriptionRow = typeof orgSubscriptions.$inferSelect;
export type InvoiceRow = typeof billingInvoices.$inferSelect;
export type SubscriptionPatch = Pick<
  typeof orgSubscriptions.$inferInsert,
  'plan' | 'status' | 'currentPeriodEnd' | 'note' | 'updatedBy'
>;
export type NewInvoice = Omit<typeof billingInvoices.$inferInsert, 'organizationId' | 'id'>;

/**
 * Plan, usage and manual invoices. Org-facing methods take `organizationId` first and filter by
 * it; `searchOrgs` is the one cross-tenant read, used only by the platform back-office.
 */
@Injectable()
export class BillingRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.transaction(fn);
  }

  /**
   * Serializes plan checks of one organization until the transaction ends, so two campaigns
   * published at the same time cannot both take the last free slot.
   */
  async lockOrgUsage(organizationId: string, tx: Tx) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`plan:${organizationId}`}))`);
  }

  async findSubscription(organizationId: string, tx: DbOrTx = this.db) {
    const [row] = await tx
      .select()
      .from(orgSubscriptions)
      .where(eq(orgSubscriptions.organizationId, organizationId));
    return row;
  }

  async upsertSubscription(organizationId: string, patch: SubscriptionPatch, tx: DbOrTx = this.db) {
    const [row] = await tx
      .insert(orgSubscriptions)
      .values({ organizationId, ...patch })
      .onConflictDoUpdate({
        target: orgSubscriptions.organizationId,
        set: { ...patch, updatedAt: new Date() },
      })
      .returning();
    if (!row) throw new Error('subscription upsert returned nothing');
    return row;
  }

  /**
   * Published campaigns that are live or scheduled at `now` (not paused, not ended), the same
   * rule as `campaignPhase` → `isRunningPhase`.
   */
  async countRunningCampaigns(
    organizationId: string,
    now: Date,
    opts: { excludeCampaignId?: string } = {},
    tx: DbOrTx = this.db,
  ) {
    const [row] = await tx
      .select({ n: count() })
      .from(events)
      .innerJoin(
        games,
        and(
          eq(games.organizationId, organizationId),
          eq(games.eventId, events.id),
          isNull(games.deletedAt),
          isNotNull(games.currentVersionId),
        ),
      )
      .where(
        and(
          eq(events.organizationId, organizationId),
          isNull(events.deletedAt),
          eq(events.paused, false),
          gt(events.endsAt, now),
          sql`jsonb_exists(${games.draftConfig}, 'rules')`,
          opts.excludeCampaignId ? ne(events.id, opts.excludeCampaignId) : undefined,
        ),
      );
    return row?.n ?? 0;
  }

  /** Live counter redemptions in `[from, to)`; rehearsal and voided codes never count. */
  async countRedemptions(organizationId: string, from: Date, to: Date, tx: DbOrTx = this.db) {
    const [row] = await tx
      .select({ n: count() })
      .from(awards)
      .where(
        and(
          eq(awards.organizationId, organizationId),
          eq(awards.env, 'live'),
          ne(awards.status, 'void'),
          gte(awards.redeemedAt, from),
          lt(awards.redeemedAt, to),
        ),
      );
    return row?.n ?? 0;
  }

  /**
   * Live, unredeemed, non-expired awards currently outstanding across the organization (D-23).
   */
  async countActiveIssuedVouchers(organizationId: string, now: Date, tx: DbOrTx = this.db) {
    const [row] = await tx
      .select({ n: count() })
      .from(awards)
      .where(
        and(
          eq(awards.organizationId, organizationId),
          eq(awards.env, 'live'),
          eq(awards.status, 'issued'),
          isNull(awards.redeemedAt),
          or(isNull(awards.expiresAt), gt(awards.expiresAt, now)),
        ),
      );
    return row?.n ?? 0;
  }

  async listInvoices(organizationId: string, limit = 24) {
    return this.db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.organizationId, organizationId))
      .orderBy(desc(billingInvoices.paidAt))
      .limit(limit);
  }

  async insertInvoice(organizationId: string, data: NewInvoice, tx: DbOrTx = this.db) {
    const [row] = await tx
      .insert(billingInvoices)
      .values({ ...data, organizationId })
      .returning();
    if (!row) throw new Error('invoice insert returned nothing');
    return row;
  }

  // ── Platform back-office (cross-tenant on purpose) ───────────────────────────

  async findOrg(organizationId: string) {
    const [row] = await this.db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
      })
      .from(organization)
      .where(eq(organization.id, organizationId));
    return row;
  }

  /** Organizations whose name, slug or an owner's email matches `query`; newest first. */
  async searchOrgs(query: string | undefined, limit: number) {
    const pattern = query ? `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : undefined;
    const ownerMatch = pattern
      ? this.db
          .select({ id: member.organizationId })
          .from(member)
          .innerJoin(user, eq(user.id, member.userId))
          .where(and(ilike(member.role, '%owner%'), ilike(user.email, pattern)))
      : undefined;
    return this.db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
      })
      .from(organization)
      .where(
        pattern && ownerMatch
          ? or(
              ilike(organization.name, pattern),
              ilike(organization.slug, pattern),
              inArray(organization.id, ownerMatch),
            )
          : undefined,
      )
      .orderBy(desc(organization.createdAt), asc(organization.id))
      .limit(limit);
  }

  /** First owner email of each organization. */
  async ownerEmails(organizationIds: string[]) {
    if (organizationIds.length === 0) return new Map<string, string>();
    const rows = await this.db
      .select({ organizationId: member.organizationId, email: user.email })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(and(inArray(member.organizationId, organizationIds), ilike(member.role, '%owner%')))
      .orderBy(asc(member.createdAt));
    const map = new Map<string, string>();
    for (const r of rows) if (!map.has(r.organizationId)) map.set(r.organizationId, r.email);
    return map;
  }

  async subscriptionsOf(organizationIds: string[]) {
    if (organizationIds.length === 0) return new Map<string, SubscriptionRow>();
    const rows = await this.db
      .select()
      .from(orgSubscriptions)
      .where(inArray(orgSubscriptions.organizationId, organizationIds));
    return new Map(rows.map((r) => [r.organizationId, r]));
  }

  /** Batched running campaign count per organization (avoids N+1 in adminListOrgs). */
  async countRunningCampaignsByOrgIds(organizationIds: string[], now: Date) {
    if (organizationIds.length === 0) return new Map<string, number>();
    const rows = await this.db
      .select({
        organizationId: events.organizationId,
        n: count(),
      })
      .from(events)
      .innerJoin(
        games,
        and(
          eq(games.organizationId, events.organizationId),
          eq(games.eventId, events.id),
          isNull(games.deletedAt),
          isNotNull(games.currentVersionId),
        ),
      )
      .where(
        and(
          inArray(events.organizationId, organizationIds),
          isNull(events.deletedAt),
          eq(events.paused, false),
          gt(events.endsAt, now),
          sql`jsonb_exists(${games.draftConfig}, 'rules')`,
        ),
      )
      .groupBy(events.organizationId);
    return new Map(rows.map((r) => [r.organizationId, r.n]));
  }

  /** Batched monthly redemptions count per organization (avoids N+1 in adminListOrgs). */
  async countRedemptionsByOrgIds(organizationIds: string[], from: Date, to: Date) {
    if (organizationIds.length === 0) return new Map<string, number>();
    const rows = await this.db
      .select({
        organizationId: awards.organizationId,
        n: count(),
      })
      .from(awards)
      .where(
        and(
          inArray(awards.organizationId, organizationIds),
          eq(awards.env, 'live'),
          ne(awards.status, 'void'),
          gte(awards.redeemedAt, from),
          lt(awards.redeemedAt, to),
        ),
      )
      .groupBy(awards.organizationId);
    return new Map(rows.map((r) => [r.organizationId, r.n]));
  }

  /** Batched active issued vouchers count per organization (avoids N+1 in adminListOrgs). */
  async countActiveIssuedVouchersByOrgIds(organizationIds: string[], now: Date) {
    if (organizationIds.length === 0) return new Map<string, number>();
    const rows = await this.db
      .select({
        organizationId: awards.organizationId,
        n: count(),
      })
      .from(awards)
      .where(
        and(
          inArray(awards.organizationId, organizationIds),
          eq(awards.env, 'live'),
          eq(awards.status, 'issued'),
          isNull(awards.redeemedAt),
          or(isNull(awards.expiresAt), gt(awards.expiresAt, now)),
        ),
      )
      .groupBy(awards.organizationId);
    return new Map(rows.map((r) => [r.organizationId, r.n]));
  }

  /**
   * Campaigns running now or starting within `[now, until]` across all organizations (ADM-02).
   */
  async listUpcomingCampaigns(now: Date, until: Date, limit = 100) {
    const stockByGame = this.db
      .select({
        gameId: prizes.gameId,
        totalStock: sql<number>`coalesce(sum(${prizes.quantity}), 0)::int`.as('total_stock'),
        remainingStock: sql<number>`coalesce(sum(${prizes.remaining}), 0)::int`.as(
          'remaining_stock',
        ),
      })
      .from(prizes)
      .groupBy(prizes.gameId)
      .as('stock_by_game');

    const playsByEvent = this.db
      .select({
        eventId: plays.eventId,
        playsCount: sql<number>`count(*)::int`.as('plays_count'),
      })
      .from(plays)
      .where(eq(plays.env, 'live'))
      .groupBy(plays.eventId)
      .as('plays_by_event');

    return this.db
      .select({
        id: events.id,
        organizationId: events.organizationId,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        name: events.name,
        slug: events.slug,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        baselineGuestsPerDay: sql<
          string | null
        >`${games.draftConfig} -> 'rules' ->> 'baselineGuestsPerDay'`,
        totalStock: sql<number>`coalesce(${stockByGame.totalStock}, 0)::int`.mapWith(Number),
        remainingStock: sql<number>`coalesce(${stockByGame.remainingStock}, 0)::int`.mapWith(
          Number,
        ),
        plays: sql<number>`coalesce(${playsByEvent.playsCount}, 0)::int`.mapWith(Number),
      })
      .from(events)
      .innerJoin(organization, eq(organization.id, events.organizationId))
      .innerJoin(
        games,
        and(
          eq(games.organizationId, events.organizationId),
          eq(games.eventId, events.id),
          isNull(games.deletedAt),
          isNotNull(games.currentVersionId),
        ),
      )
      .leftJoin(stockByGame, eq(stockByGame.gameId, games.id))
      .leftJoin(playsByEvent, eq(playsByEvent.eventId, events.id))
      .where(
        and(
          isNull(events.deletedAt),
          eq(events.paused, false),
          isNotNull(events.startsAt),
          isNotNull(events.endsAt),
          gt(events.endsAt, now),
          lt(events.startsAt, until),
          sql`jsonb_exists(${games.draftConfig}, 'rules')`,
        ),
      )
      .orderBy(desc(events.startsAt), desc(events.id))
      .limit(limit);
  }
}
