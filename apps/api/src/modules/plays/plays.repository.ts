import { Inject, Injectable } from '@nestjs/common';
import { type Database, type DbOrTx, schema, type Tx } from '@playora/db';
import { and, desc, eq, gt, isNull, ne, or, sql } from 'drizzle-orm';
import { DB } from '../../infra/tokens';
import { type CampaignDocument, readCampaignDocument } from '../campaigns/campaign-defaults';

const { events, games, gameVersions, prizes, awards, plays, playCounters, players, organization } =
  schema;

export type PlayEnv = 'live' | 'rehearsal';
export type EventRow = typeof events.$inferSelect;
export type GameRow = typeof games.$inferSelect;
export type PrizeRow = typeof prizes.$inferSelect;
export type NewPlay = Omit<typeof plays.$inferInsert, 'organizationId'>;
export type NewAward = Omit<typeof awards.$inferInsert, 'organizationId'>;

/** A published campaign as the player shell sees it: event, game and the current version. */
export interface PublishedCampaign {
  event: EventRow;
  game: GameRow;
  version: { id: string; version: number; config: CampaignDocument };
  /** The shop's name: the organizer in the generated terms. */
  organizationName: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Data access for the play engine (ADR-012 §4). The slug lookup resolves the organization; every
 * other method takes `organizationId` first and filters every table it reads by it.
 */
@Injectable()
export class PlaysRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  // ── Campaign lookup ──────────────────────────────────────────────────────────

  /** The current published version of a campaign by slug (or campaign id); nothing when never published or deleted. */
  async findPublishedBySlug(slug: string): Promise<PublishedCampaign | undefined> {
    const slugOrIdMatch = UUID_RE.test(slug)
      ? or(eq(events.slug, slug), eq(events.id, slug))
      : eq(events.slug, slug);
    const [row] = await this.db
      .select({
        event: events,
        game: games,
        version: gameVersions,
        organizationName: organization.name,
      })
      .from(events)
      .innerJoin(organization, eq(organization.id, events.organizationId))
      .innerJoin(
        games,
        and(
          eq(games.organizationId, events.organizationId),
          eq(games.eventId, events.id),
          isNull(games.deletedAt),
        ),
      )
      .innerJoin(
        gameVersions,
        and(
          eq(gameVersions.organizationId, events.organizationId),
          eq(gameVersions.id, games.currentVersionId),
        ),
      )
      .where(
        and(
          slugOrIdMatch,
          isNull(events.deletedAt),
          sql`jsonb_exists(${gameVersions.config}, 'rules')`,
        ),
      )
      .limit(1);
    if (!row) return undefined;
    return {
      event: row.event,
      game: row.game,
      version: {
        id: row.version.id,
        version: row.version.version,
        config: readCampaignDocument(row.version.config),
      },
      organizationName: row.organizationName,
    };
  }

  /** A campaign (event + its game) with its draft, for rehearsal plays from the Studio. */
  async findCampaign(organizationId: string, campaignId: string) {
    const [row] = await this.db
      .select({ event: events, game: games })
      .from(events)
      .innerJoin(
        games,
        and(
          eq(games.organizationId, organizationId),
          eq(games.eventId, events.id),
          isNull(games.deletedAt),
        ),
      )
      .where(
        and(
          eq(events.organizationId, organizationId),
          eq(events.id, campaignId),
          isNull(events.deletedAt),
          sql`jsonb_exists(${games.draftConfig}, 'rules')`,
        ),
      )
      .limit(1);
    return row;
  }

  // ── Players ──────────────────────────────────────────────────────────────────

  /**
   * Locks the player row for the rest of the transaction. This serializes the plays of one
   * player (per-player limits and idempotency hold under concurrency) without touching anyone
   * else's plays.
   */
  async lockPlayer(
    organizationId: string,
    eventId: string,
    playerId: string,
    env: PlayEnv,
    tx: Tx,
  ) {
    const [row] = await tx
      .select({ id: players.id })
      .from(players)
      .where(
        and(
          eq(players.organizationId, organizationId),
          eq(players.eventId, eventId),
          eq(players.id, playerId),
          eq(players.env, env),
        ),
      )
      .for('update');
    return row;
  }

  async findPlayer(organizationId: string, eventId: string, playerId: string, env: PlayEnv) {
    const [row] = await this.db
      .select({ id: players.id, sessionVer: players.sessionVer })
      .from(players)
      .where(
        and(
          eq(players.organizationId, organizationId),
          eq(players.eventId, eventId),
          eq(players.id, playerId),
          eq(players.env, env),
        ),
      );
    return row;
  }

  /** The rehearsal player behind a Studio tester key (stored in `deviceId`). */
  async findOrCreateTester(organizationId: string, eventId: string, testerKey: string, tx: Tx) {
    const where = and(
      eq(players.organizationId, organizationId),
      eq(players.eventId, eventId),
      eq(players.env, 'rehearsal'),
      eq(players.deviceId, testerKey),
    );
    const [found] = await tx.select({ id: players.id }).from(players).where(where).limit(1);
    if (found) return found;
    const [created] = await tx
      .insert(players)
      .values({
        organizationId,
        eventId,
        env: 'rehearsal',
        deviceId: testerKey,
        displayName: 'Chạy thử',
      })
      .returning({ id: players.id });
    return created as { id: string };
  }

  // ── Turns ────────────────────────────────────────────────────────────────────

  /**
   * Claims one turn with a conditional upsert (ADR-012 §4). Returns the turn number, or nothing
   * when the player has used `limit` turns on that day.
   */
  async claimTurn(
    organizationId: string,
    input: { playerId: string; gameId: string; day: string; limit: number },
    tx: Tx,
  ): Promise<number | undefined> {
    const [row] = await tx
      .insert(playCounters)
      .values({
        organizationId,
        playerId: input.playerId,
        gameId: input.gameId,
        day: input.day,
        n: 1,
      })
      .onConflictDoUpdate({
        target: [playCounters.playerId, playCounters.gameId, playCounters.day],
        set: { n: sql`${playCounters.n} + 1` },
        setWhere: and(
          eq(playCounters.organizationId, organizationId),
          sql`${playCounters.n} < ${input.limit}`,
        ),
      })
      .returning({ n: playCounters.n });
    return row?.n;
  }

  async turnsUsed(
    organizationId: string,
    input: { playerId: string; gameId: string; day: string },
    tx: DbOrTx = this.db,
  ): Promise<number> {
    const [row] = await tx
      .select({ n: playCounters.n })
      .from(playCounters)
      .where(
        and(
          eq(playCounters.organizationId, organizationId),
          eq(playCounters.playerId, input.playerId),
          eq(playCounters.gameId, input.gameId),
          eq(playCounters.day, input.day),
        ),
      );
    return row?.n ?? 0;
  }

  // ── Plays ────────────────────────────────────────────────────────────────────

  /** A recorded play with its prize and voucher, to replay an idempotent retry. */
  async findPlayByRequest(
    organizationId: string,
    playerId: string,
    requestId: string,
    tx: DbOrTx = this.db,
  ) {
    const [row] = await tx
      .select({
        id: plays.id,
        outcome: plays.outcome,
        reason: plays.reason,
        prizeKey: prizes.key,
        prizeRowId: prizes.id,
        prizeName: prizes.name,
        prizeImageUrl: prizes.imageUrl,
        code: awards.redeemCode,
        expiresAt: awards.expiresAt,
      })
      .from(plays)
      .leftJoin(
        prizes,
        and(eq(prizes.organizationId, organizationId), eq(prizes.id, plays.prizeId)),
      )
      .leftJoin(awards, and(eq(awards.organizationId, organizationId), eq(awards.playId, plays.id)))
      .where(
        and(
          eq(plays.organizationId, organizationId),
          eq(plays.playerId, playerId),
          eq(plays.requestId, requestId),
        ),
      );
    return row;
  }

  async insertPlay(organizationId: string, data: NewPlay, tx: Tx) {
    const [row] = await tx
      .insert(plays)
      .values({ ...data, organizationId })
      .returning({ id: plays.id });
    return row as { id: string };
  }

  // ── Prizes and stock ─────────────────────────────────────────────────────────

  async listPrizes(organizationId: string, gameId: string, tx: DbOrTx = this.db) {
    return tx
      .select()
      .from(prizes)
      .where(and(eq(prizes.organizationId, organizationId), eq(prizes.gameId, gameId)));
  }

  /**
   * Gives a prize row to every draft prize key that has none yet, so rehearsal awards have a row to
   * reference. New rows hold no live stock (quantity = remaining = 0): only publish sets live stock,
   * and existing rows are left untouched.
   */
  async ensurePrizeRows(
    organizationId: string,
    input: {
      eventId: string;
      gameId: string;
      prizes: ReadonlyArray<{ id: string; name: string; image?: string; valueVnd: number }>;
    },
    tx: Tx,
  ) {
    if (input.prizes.length === 0) return;
    await tx
      .insert(prizes)
      .values(
        input.prizes.map((p, i) => ({
          organizationId,
          eventId: input.eventId,
          gameId: input.gameId,
          key: p.id,
          name: p.name,
          imageUrl: p.image ?? null,
          valueVnd: p.valueVnd,
          quantity: 0,
          issued: 0,
          remaining: 0,
          sortOrder: i,
        })),
      )
      .onConflictDoNothing({ target: [prizes.gameId, prizes.key] });
  }

  /**
   * Serializes budget-capped wins of one campaign. `FOR NO KEY UPDATE` conflicts with publish's
   * `FOR UPDATE` and with itself, but not with the `KEY SHARE` locks that inserting plays takes,
   * so losing plays never wait on it.
   */
  async lockGameForBudget(organizationId: string, gameId: string, tx: Tx) {
    await tx
      .select({ id: games.id })
      .from(games)
      .where(and(eq(games.organizationId, organizationId), eq(games.id, gameId)))
      .for('no key update');
  }

  /** Cost of the live prizes issued so far (Σ issued × valueVnd). */
  async liveBudgetUsed(organizationId: string, gameId: string, tx: DbOrTx = this.db) {
    const [row] = await tx
      .select({
        used: sql<number>`coalesce(sum(${prizes.issued}::bigint * coalesce(${prizes.valueVnd}, 0)), 0)`.mapWith(
          Number,
        ),
      })
      .from(prizes)
      .where(and(eq(prizes.organizationId, organizationId), eq(prizes.gameId, gameId)));
    return row?.used ?? 0;
  }

  /** Takes one unit of live stock; nothing when it is gone (never goes below zero). */
  async takeStock(organizationId: string, prizeId: string, tx: Tx) {
    const [row] = await tx
      .update(prizes)
      .set({
        remaining: sql`${prizes.remaining} - 1`,
        issued: sql`${prizes.issued} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(prizes.organizationId, organizationId),
          eq(prizes.id, prizeId),
          sql`${prizes.remaining} > 0`,
        ),
      )
      .returning({ id: prizes.id });
    return row;
  }

  // ── Awards ───────────────────────────────────────────────────────────────────

  /** Non-void awards of an environment grouped by prize key (rehearsal stock and budget). */
  async awardCountsByPrizeKey(
    organizationId: string,
    input: { eventId: string; env: PlayEnv; playerId?: string; timezone: string; day: string },
    tx: DbOrTx = this.db,
  ) {
    return tx
      .select({
        key: prizes.key,
        total: sql<number>`count(*)::int`,
        today: sql<number>`count(*) filter (where to_char(${awards.createdAt} at time zone ${input.timezone}, 'YYYY-MM-DD') = ${input.day})::int`,
      })
      .from(awards)
      .innerJoin(
        prizes,
        and(eq(prizes.organizationId, organizationId), eq(prizes.id, awards.prizeId)),
      )
      .where(
        and(
          eq(awards.organizationId, organizationId),
          eq(awards.eventId, input.eventId),
          eq(awards.env, input.env),
          ne(awards.status, 'void'),
          input.playerId ? eq(awards.playerId, input.playerId) : undefined,
        ),
      )
      .groupBy(prizes.key);
  }

  /**
   * Inserts an award; nothing when the redeem code is already taken (the caller retries with a new
   * code). `ON CONFLICT DO NOTHING` keeps the surrounding transaction usable.
   */
  async insertAward(organizationId: string, data: NewAward, tx: Tx) {
    const [row] = await tx
      .insert(awards)
      .values({ ...data, organizationId })
      .onConflictDoNothing()
      .returning({ id: awards.id, code: awards.redeemCode, expiresAt: awards.expiresAt });
    return row;
  }

  /**
   * Whether the player holds a voucher still to be used at the counter: not void, not redeemed and
   * not expired ("Khách quay lại lần 2": redeem it before playing again).
   */
  async hasUnredeemedVoucher(
    organizationId: string,
    input: { eventId: string; playerId: string; env: PlayEnv },
    tx: DbOrTx = this.db,
  ): Promise<boolean> {
    const [row] = await tx
      .select({ id: awards.id })
      .from(awards)
      .where(
        and(
          eq(awards.organizationId, organizationId),
          eq(awards.eventId, input.eventId),
          eq(awards.playerId, input.playerId),
          eq(awards.env, input.env),
          ne(awards.status, 'void'),
          isNull(awards.redeemedAt),
          or(isNull(awards.expiresAt), gt(awards.expiresAt, sql`now()`)),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  /** The player's vouchers ("Quà của tôi"), newest first. */
  async listPlayerVouchers(organizationId: string, eventId: string, playerId: string) {
    return this.db
      .select({
        code: awards.redeemCode,
        status: awards.status,
        createdAt: awards.createdAt,
        expiresAt: awards.expiresAt,
        redeemedAt: awards.redeemedAt,
        prizeKey: prizes.key,
        prizeRowId: prizes.id,
        prizeName: prizes.name,
        prizeImageUrl: prizes.imageUrl,
      })
      .from(awards)
      .innerJoin(
        prizes,
        and(eq(prizes.organizationId, organizationId), eq(prizes.id, awards.prizeId)),
      )
      .where(
        and(
          eq(awards.organizationId, organizationId),
          eq(awards.eventId, eventId),
          eq(awards.playerId, playerId),
        ),
      )
      .orderBy(desc(awards.id));
  }

  // ── Transactions ─────────────────────────────────────────────────────────────

  /** Serializes rehearsal plays of one campaign; rehearsal stock is counted, not decremented. */
  async lockRehearsal(organizationId: string, gameId: string, tx: Tx) {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`rehearsal:${organizationId}:${gameId}`}, 0))`,
    );
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.transaction(fn);
  }
}
