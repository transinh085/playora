import { Inject, Injectable } from '@nestjs/common';
import type { VoucherStatus } from '@playora/contracts';
import { type Database, type DbOrTx, schema, type Tx } from '@playora/db';
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';
import { DB } from '../../infra/tokens';

const { events, games, gameVersions, prizes, awards, plays, players } = schema;

export type EventRow = typeof events.$inferSelect;
export type GameRow = typeof games.$inferSelect;
export type PrizeRow = typeof prizes.$inferSelect;
export type NewEvent = Omit<typeof events.$inferInsert, 'organizationId'>;
export type NewGame = Omit<typeof games.$inferInsert, 'organizationId'>;
export type NewGameVersion = Omit<typeof gameVersions.$inferInsert, 'organizationId'>;
export type EventPatch = Partial<
  Pick<
    EventRow,
    | 'name'
    | 'status'
    | 'paused'
    | 'startsAt'
    | 'endsAt'
    | 'identity'
    | 'registrationForm'
    | 'schedule'
    | 'participation'
    | 'updatedAt'
  >
>;
export type GamePatch = Partial<
  Pick<GameRow, 'name' | 'skinKey' | 'draftConfig' | 'status' | 'currentVersionId' | 'updatedAt'>
>;

/** A campaign as stored: its event, its single game and a summary of the current version. */
export interface CampaignRow {
  event: EventRow;
  game: GameRow;
  version: {
    version: number;
    configHash: string;
    skinKey: string | null;
    createdAt: Date;
    /** `rules.startsAt` / `rules.endsAt` exactly as stored in the published config. */
    startsAt: string | null;
    endsAt: string | null;
  } | null;
}

/** Updated-at truncated to ms so it round-trips through the `<ms>_<id>` list cursor. */
const gameUpdatedMs = sql<number>`floor(extract(epoch from ${games.updatedAt}) * 1000)::bigint`;

/**
 * Data access for campaigns (ADR-015 option A: one `events` row + exactly one `games` row).
 * Every method takes `organizationId` first and filters every table it reads by it.
 */
@Injectable()
export class CampaignsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Campaign rows: live events joined with their game. Legacy events built with the older
   * events/games routes are skipped because their game draft has no campaign `rules`.
   */
  private selectCampaigns(
    organizationId: string,
    tx: DbOrTx,
    ...conditions: Array<SQL | undefined>
  ) {
    return tx
      .select({
        event: events,
        game: games,
        version: gameVersions.version,
        versionHash: gameVersions.configHash,
        versionSkinKey: gameVersions.skinKey,
        versionCreatedAt: gameVersions.createdAt,
        versionStartsAt: sql<string | null>`${gameVersions.config} -> 'rules' ->> 'startsAt'`,
        versionEndsAt: sql<string | null>`${gameVersions.config} -> 'rules' ->> 'endsAt'`,
      })
      .from(events)
      .innerJoin(
        games,
        and(
          eq(games.organizationId, organizationId),
          eq(games.eventId, events.id),
          isNull(games.deletedAt),
        ),
      )
      .leftJoin(
        gameVersions,
        and(
          eq(gameVersions.organizationId, organizationId),
          eq(gameVersions.id, games.currentVersionId),
        ),
      )
      .where(
        and(
          eq(events.organizationId, organizationId),
          isNull(events.deletedAt),
          sql`jsonb_exists(${games.draftConfig}, 'rules')`,
          ...conditions,
        ),
      );
  }

  private toRow(r: {
    event: EventRow;
    game: GameRow;
    version: number | null;
    versionHash: string | null;
    versionSkinKey: string | null;
    versionCreatedAt: Date | null;
    versionStartsAt: string | null;
    versionEndsAt: string | null;
  }): CampaignRow {
    return {
      event: r.event,
      game: r.game,
      version:
        r.version === null || r.versionHash === null || r.versionCreatedAt === null
          ? null
          : {
              version: r.version,
              configHash: r.versionHash,
              skinKey: r.versionSkinKey,
              createdAt: r.versionCreatedAt,
              startsAt: r.versionStartsAt,
              endsAt: r.versionEndsAt,
            },
    };
  }

  async list(organizationId: string, opts: { limit: number; cursor?: string }) {
    let cursorCond: SQL | undefined;
    if (opts.cursor) {
      const [ms, id] = opts.cursor.split('_');
      if (ms && id && /^\d+$/.test(ms)) {
        cursorCond = or(
          lt(gameUpdatedMs, Number(ms)),
          and(eq(gameUpdatedMs, Number(ms)), lt(events.id, id)),
        );
      }
    }
    const rows = await this.selectCampaigns(organizationId, this.db, cursorCond)
      .orderBy(desc(gameUpdatedMs), desc(events.id))
      .limit(opts.limit + 1);
    const hasMore = rows.length > opts.limit;
    const items = (hasMore ? rows.slice(0, opts.limit) : rows).map((r) => this.toRow(r));
    const last = items.at(-1);
    return {
      items,
      nextCursor: hasMore && last ? `${last.game.updatedAt.getTime()}_${last.event.id}` : null,
    };
  }

  async findById(organizationId: string, campaignId: string, tx: DbOrTx = this.db) {
    const [row] = await this.selectCampaigns(organizationId, tx, eq(events.id, campaignId));
    return row ? this.toRow(row) : undefined;
  }

  /** Locks the campaign's game row so publishes and lifecycle changes are serialized. */
  async lockGame(organizationId: string, campaignId: string, tx: Tx) {
    const [row] = await tx
      .select({ id: games.id })
      .from(games)
      .innerJoin(
        events,
        and(
          eq(events.organizationId, organizationId),
          eq(events.id, games.eventId),
          isNull(events.deletedAt),
        ),
      )
      .where(
        and(
          eq(games.organizationId, organizationId),
          eq(games.eventId, campaignId),
          isNull(games.deletedAt),
        ),
      )
      .for('update', { of: games });
    return row;
  }

  async insertEvent(organizationId: string, data: NewEvent, tx: DbOrTx = this.db) {
    const [row] = await tx
      .insert(events)
      .values({ ...data, organizationId })
      .returning();
    return row as EventRow;
  }

  async insertGame(organizationId: string, data: NewGame, tx: DbOrTx = this.db) {
    const [row] = await tx
      .insert(games)
      .values({ ...data, organizationId })
      .returning();
    return row as GameRow;
  }

  async updateEvent(
    organizationId: string,
    eventId: string,
    patch: EventPatch,
    tx: DbOrTx = this.db,
  ) {
    const [row] = await tx
      .update(events)
      .set(patch)
      .where(
        and(
          eq(events.organizationId, organizationId),
          eq(events.id, eventId),
          isNull(events.deletedAt),
        ),
      )
      .returning({ id: events.id });
    return row;
  }

  async updateGame(organizationId: string, gameId: string, patch: GamePatch, tx: DbOrTx = this.db) {
    const [row] = await tx
      .update(games)
      .set(patch)
      .where(
        and(
          eq(games.organizationId, organizationId),
          eq(games.id, gameId),
          isNull(games.deletedAt),
        ),
      )
      .returning({ id: games.id });
    return row;
  }

  async softDelete(organizationId: string, eventId: string, tx: DbOrTx = this.db) {
    const now = new Date();
    await tx
      .update(games)
      .set({ deletedAt: now })
      .where(and(eq(games.organizationId, organizationId), eq(games.eventId, eventId)));
    const [row] = await tx
      .update(events)
      .set({ deletedAt: now })
      .where(
        and(
          eq(events.organizationId, organizationId),
          eq(events.id, eventId),
          isNull(events.deletedAt),
        ),
      )
      .returning({ id: events.id });
    return row;
  }

  async nextVersionNumber(organizationId: string, gameId: string, tx: DbOrTx = this.db) {
    const [row] = await tx
      .select({ next: sql<number>`coalesce(max(${gameVersions.version}), 0) + 1` })
      .from(gameVersions)
      .where(and(eq(gameVersions.organizationId, organizationId), eq(gameVersions.gameId, gameId)));
    return Number(row?.next ?? 1);
  }

  async insertVersion(organizationId: string, data: NewGameVersion, tx: DbOrTx = this.db) {
    const [row] = await tx
      .insert(gameVersions)
      .values({ ...data, organizationId })
      .returning();
    return row as typeof gameVersions.$inferSelect;
  }

  async listPrizes(organizationId: string, gameId: string, tx: DbOrTx = this.db) {
    return tx
      .select()
      .from(prizes)
      .where(and(eq(prizes.organizationId, organizationId), eq(prizes.gameId, gameId)));
  }

  async insertPrize(
    organizationId: string,
    data: Omit<typeof prizes.$inferInsert, 'organizationId'>,
    tx: DbOrTx = this.db,
  ) {
    await tx.insert(prizes).values({ ...data, organizationId });
  }

  /**
   * Sets a prize's stock to `quantity`, keeping what was already issued: `remaining` is computed
   * in SQL so a concurrent play decrement cannot be lost. Returns nothing when `quantity` is
   * below the issued count.
   */
  async setPrizeStock(
    organizationId: string,
    prizeId: string,
    data: {
      name: string;
      imageUrl: string | null;
      valueVnd: number;
      quantity: number;
      sortOrder: number;
    },
    tx: DbOrTx = this.db,
  ) {
    const [row] = await tx
      .update(prizes)
      .set({
        name: data.name,
        imageUrl: data.imageUrl,
        valueVnd: data.valueVnd,
        sortOrder: data.sortOrder,
        quantity: data.quantity,
        remaining: sql`${data.quantity} - ${prizes.issued}`,
      })
      .where(
        and(
          eq(prizes.organizationId, organizationId),
          eq(prizes.id, prizeId),
          sql`${prizes.issued} <= ${data.quantity}`,
        ),
      )
      .returning({ id: prizes.id });
    return row;
  }

  /** A prize removed from the draft keeps its row (awards reference it) but stops issuing. */
  async retirePrize(organizationId: string, prizeId: string, tx: DbOrTx = this.db) {
    await tx
      .update(prizes)
      .set({ quantity: sql`${prizes.issued}`, remaining: 0 })
      .where(and(eq(prizes.organizationId, organizationId), eq(prizes.id, prizeId)));
  }

  async listPlays(
    organizationId: string,
    eventId: string,
    opts: { limit: number; cursor?: string },
  ) {
    const rows = await this.db
      .select({
        id: plays.id,
        playerId: plays.playerId,
        playerName: players.displayName,
        env: plays.env,
        createdAt: plays.createdAt,
        outcome: plays.outcome,
        reason: plays.reason,
        prizeKey: prizes.key,
        prizeRowId: prizes.id,
        voucherCode: awards.redeemCode,
        channel: plays.channelKey,
      })
      .from(plays)
      .leftJoin(
        players,
        and(eq(players.organizationId, organizationId), eq(players.id, plays.playerId)),
      )
      .leftJoin(
        prizes,
        and(eq(prizes.organizationId, organizationId), eq(prizes.id, plays.prizeId)),
      )
      .leftJoin(awards, and(eq(awards.organizationId, organizationId), eq(awards.playId, plays.id)))
      .where(
        and(
          eq(plays.organizationId, organizationId),
          eq(plays.eventId, eventId),
          eq(plays.env, 'live'),
          opts.cursor ? lt(plays.id, opts.cursor) : undefined,
        ),
      )
      .orderBy(desc(plays.id))
      .limit(opts.limit + 1);
    const hasMore = rows.length > opts.limit;
    const items = hasMore ? rows.slice(0, opts.limit) : rows;
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  }

  async listVouchers(
    organizationId: string,
    eventId: string,
    opts: { limit: number; cursor?: string; status?: VoucherStatus },
  ) {
    const rows = await this.db
      .select({
        id: awards.id,
        code: awards.redeemCode,
        status: awards.status,
        env: awards.env,
        createdAt: awards.createdAt,
        expiresAt: awards.expiresAt,
        redeemedAt: awards.redeemedAt,
        playerId: awards.playerId,
        playerName: players.displayName,
        prizeKey: prizes.key,
        prizeRowId: prizes.id,
        prizeName: prizes.name,
      })
      .from(awards)
      .innerJoin(
        prizes,
        and(eq(prizes.organizationId, organizationId), eq(prizes.id, awards.prizeId)),
      )
      .leftJoin(
        players,
        and(eq(players.organizationId, organizationId), eq(players.id, awards.playerId)),
      )
      .where(
        and(
          eq(awards.organizationId, organizationId),
          eq(awards.eventId, eventId),
          eq(awards.env, 'live'),
          opts.status ? voucherStatusCondition(opts.status) : undefined,
          opts.cursor ? lt(awards.id, opts.cursor) : undefined,
        ),
      )
      .orderBy(desc(awards.id))
      .limit(opts.limit + 1);
    const hasMore = rows.length > opts.limit;
    const items = hasMore ? rows.slice(0, opts.limit) : rows;
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  }

  async stats(organizationId: string, eventId: string, gameId: string) {
    const [playRow] = await this.db
      .select({ plays: count(), players: countDistinct(plays.playerId) })
      .from(plays)
      .where(
        and(
          eq(plays.organizationId, organizationId),
          eq(plays.eventId, eventId),
          eq(plays.env, 'live'),
        ),
      );
    const redeemedCond = and(isNotNull(awards.redeemedAt), ne(awards.status, 'void'));
    const [awardRow] = await this.db
      .select({
        wins: count(),
        redeemed: sql<number>`count(*) filter (where ${redeemedCond})`.mapWith(Number),
        redeemedValueVnd:
          sql<number>`coalesce(sum(${prizes.valueVnd}) filter (where ${redeemedCond}), 0)`.mapWith(
            Number,
          ),
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
          eq(awards.env, 'live'),
        ),
      );
    const prizeRows = await this.listPrizes(organizationId, gameId);
    return {
      plays: playRow?.plays ?? 0,
      players: playRow?.players ?? 0,
      wins: awardRow?.wins ?? 0,
      redeemed: awardRow?.redeemed ?? 0,
      redeemedValueVnd: awardRow?.redeemedValueVnd ?? 0,
      prizes: prizeRows,
    };
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.transaction(fn);
  }
}

/** SQL for the derived voucher status (void → redeemed → expired → issued). */
export function voucherStatusCondition(status: VoucherStatus): SQL | undefined {
  const notVoid = ne(awards.status, 'void');
  switch (status) {
    case 'void':
      return eq(awards.status, 'void');
    case 'redeemed':
      return and(notVoid, isNotNull(awards.redeemedAt));
    case 'expired':
      return and(notVoid, isNull(awards.redeemedAt), sql`${awards.expiresAt} <= now()`);
    case 'issued':
      return and(
        notVoid,
        isNull(awards.redeemedAt),
        or(isNull(awards.expiresAt), gt(awards.expiresAt, sql`now()`)),
      );
  }
}
