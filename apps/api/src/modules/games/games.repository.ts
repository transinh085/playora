import { Inject, Injectable } from '@nestjs/common';
import { type Database, type DbOrTx, schema, type Tx } from '@playora/db';
import { and, asc, eq, inArray, isNull, type SQL, sql } from 'drizzle-orm';
import { DB } from '../../infra/tokens';

const { assets, events, games, gameVersions } = schema;

export type GameRow = typeof games.$inferSelect;
export type GameVersionRow = typeof gameVersions.$inferSelect;
export type NewGame = Omit<typeof games.$inferInsert, 'organizationId'>;
export type NewGameVersion = Omit<typeof gameVersions.$inferInsert, 'organizationId'>;
export type GamePatch = Partial<
  Pick<
    GameRow,
    | 'name'
    | 'skinKey'
    | 'draftConfig'
    | 'hotConfig'
    | 'status'
    | 'currentVersionId'
    | 'sortOrder'
    | 'updatedAt'
  >
>;

export interface GameWithVersion {
  game: GameRow;
  currentVersion: number | null;
}

/**
 * Data access for games and game_versions. Every method takes `organizationId` first
 * and filters by it to enforce tenant isolation (docs/engineering/architecture.md §8).
 */
@Injectable()
export class GamesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  private scope(organizationId: string, ...conditions: Array<SQL | undefined>) {
    return and(eq(games.organizationId, organizationId), isNull(games.deletedAt), ...conditions);
  }

  async eventExistsInOrg(
    organizationId: string,
    eventId: string,
    tx: DbOrTx = this.db,
  ): Promise<boolean> {
    const [row] = await tx
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          eq(events.id, eventId),
          isNull(events.deletedAt),
        ),
      );
    return !!row;
  }

  async findAssetInOrg(organizationId: string, assetId: string, tx: DbOrTx = this.db) {
    const [row] = await tx
      .select({ id: assets.id, kind: assets.kind, storageKey: assets.storageKey })
      .from(assets)
      .where(and(eq(assets.organizationId, organizationId), eq(assets.id, assetId)));
    return row;
  }

  async findAssetsByIds(organizationId: string, assetIds: readonly string[], tx: DbOrTx = this.db) {
    if (assetIds.length === 0) return [];
    return tx
      .select({ id: assets.id, kind: assets.kind, storageKey: assets.storageKey })
      .from(assets)
      .where(and(eq(assets.organizationId, organizationId), inArray(assets.id, [...assetIds])));
  }

  async listByEvent(
    organizationId: string,
    eventId: string,
    tx: DbOrTx = this.db,
  ): Promise<GameWithVersion[]> {
    const rows = await tx
      .select({
        game: games,
        currentVersion: gameVersions.version,
      })
      .from(games)
      .leftJoin(
        gameVersions,
        and(
          eq(gameVersions.organizationId, organizationId),
          eq(gameVersions.id, games.currentVersionId),
        ),
      )
      .where(this.scope(organizationId, eq(games.eventId, eventId)))
      .orderBy(asc(games.sortOrder), asc(games.createdAt), asc(games.id));

    return rows.map((r) => ({
      game: r.game,
      currentVersion: r.currentVersion ?? null,
    }));
  }

  async findById(
    organizationId: string,
    id: string,
    tx: DbOrTx = this.db,
  ): Promise<GameWithVersion | undefined> {
    const [row] = await tx
      .select({
        game: games,
        currentVersion: gameVersions.version,
      })
      .from(games)
      .leftJoin(
        gameVersions,
        and(
          eq(gameVersions.organizationId, organizationId),
          eq(gameVersions.id, games.currentVersionId),
        ),
      )
      .where(this.scope(organizationId, eq(games.id, id)));

    if (!row) return undefined;
    return {
      game: row.game,
      currentVersion: row.currentVersion ?? null,
    };
  }

  async findByIdForUpdate(
    organizationId: string,
    id: string,
    tx: DbOrTx = this.db,
  ): Promise<GameRow | undefined> {
    const [row] = await tx
      .select()
      .from(games)
      .where(this.scope(organizationId, eq(games.id, id)))
      .for('update');
    return row;
  }

  async nextSortOrder(
    organizationId: string,
    eventId: string,
    tx: DbOrTx = this.db,
  ): Promise<number> {
    const [row] = await tx
      .select({
        nextOrder: sql<number>`coalesce(max(${games.sortOrder}), -1) + 1`,
      })
      .from(games)
      .where(this.scope(organizationId, eq(games.eventId, eventId)));
    return Number(row?.nextOrder ?? 0);
  }

  async insert(organizationId: string, data: NewGame, tx: DbOrTx = this.db): Promise<GameRow> {
    const [row] = await tx
      .insert(games)
      .values({ ...data, organizationId })
      .returning();
    return row as GameRow;
  }

  async update(
    organizationId: string,
    id: string,
    patch: GamePatch,
    tx: DbOrTx = this.db,
  ): Promise<GameRow | undefined> {
    const [row] = await tx
      .update(games)
      .set(patch)
      .where(this.scope(organizationId, eq(games.id, id)))
      .returning();
    return row;
  }

  async reorder(
    organizationId: string,
    eventId: string,
    gameIds: readonly string[],
    tx: DbOrTx = this.db,
  ): Promise<void> {
    const now = new Date();
    for (let i = 0; i < gameIds.length; i++) {
      const gameId = gameIds[i];
      if (!gameId) continue;
      await tx
        .update(games)
        .set({ sortOrder: i, updatedAt: now })
        .where(this.scope(organizationId, eq(games.eventId, eventId), eq(games.id, gameId)));
    }
  }

  async softDelete(
    organizationId: string,
    id: string,
    tx: DbOrTx = this.db,
  ): Promise<{ id: string } | undefined> {
    const [row] = await tx
      .update(games)
      .set({ deletedAt: new Date() })
      .where(this.scope(organizationId, eq(games.id, id)))
      .returning({ id: games.id });
    return row;
  }

  async nextVersionNumber(
    organizationId: string,
    gameId: string,
    tx: DbOrTx = this.db,
  ): Promise<number> {
    const [row] = await tx
      .select({
        nextVer: sql<number>`coalesce(max(${gameVersions.version}), 0) + 1`,
      })
      .from(gameVersions)
      .where(and(eq(gameVersions.organizationId, organizationId), eq(gameVersions.gameId, gameId)));
    return Number(row?.nextVer ?? 1);
  }

  async insertVersion(
    organizationId: string,
    data: NewGameVersion,
    tx: DbOrTx = this.db,
  ): Promise<GameVersionRow> {
    const [row] = await tx
      .insert(gameVersions)
      .values({ ...data, organizationId })
      .returning();
    return row as GameVersionRow;
  }

  async listVersions(
    organizationId: string,
    gameId: string,
    tx: DbOrTx = this.db,
  ): Promise<GameVersionRow[]> {
    return tx
      .select()
      .from(gameVersions)
      .where(and(eq(gameVersions.organizationId, organizationId), eq(gameVersions.gameId, gameId)))
      .orderBy(asc(gameVersions.version));
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.transaction(fn);
  }
}
