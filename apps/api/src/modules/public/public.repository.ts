import { Inject, Injectable } from '@nestjs/common';
import { type Database, type DbOrTx, schema, type Tx } from '@playora/db';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DB } from '../../infra/tokens';

const { brandKits, consents, events, guestListEntries, players } = schema;

export type EventRow = typeof events.$inferSelect;
export type GuestRow = typeof guestListEntries.$inferSelect;
export type PlayerRow = typeof players.$inferSelect;
export type NewPlayer = Omit<typeof players.$inferInsert, 'organizationId'>;
export type NewConsent = Omit<typeof consents.$inferInsert, 'organizationId'>;
export type { Tx };

/**
 * Data access for public player routes (`/p/:slug` and `/p/:slug/join`).
 * Once the event is resolved by slug, every query takes `organizationId` first and filters by it
 * to enforce tenant isolation at the data layer.
 */
@Injectable()
export class PublicRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findEventBySlug(slug: string, tx: DbOrTx = this.db) {
    const [row] = await tx
      .select()
      .from(events)
      .where(and(eq(events.slug, slug), isNull(events.deletedAt)));
    return row;
  }

  async findBrandKit(organizationId: string, brandKitId: string) {
    const [row] = await this.db
      .select()
      .from(brandKits)
      .where(and(eq(brandKits.organizationId, organizationId), eq(brandKits.id, brandKitId)));
    return row;
  }

  async countLivePlayers(
    organizationId: string,
    eventId: string,
    tx: DbOrTx = this.db,
  ): Promise<number> {
    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(players)
      .where(
        and(
          eq(players.organizationId, organizationId),
          eq(players.eventId, eventId),
          eq(players.env, 'live'),
        ),
      );
    return row?.count ?? 0;
  }

  async findGuestByCode(
    organizationId: string,
    eventId: string,
    code: string,
    tx: DbOrTx = this.db,
  ): Promise<GuestRow | undefined> {
    const normalized = code.trim().toLowerCase();
    const [row] = await tx
      .select()
      .from(guestListEntries)
      .where(
        and(
          eq(guestListEntries.organizationId, organizationId),
          eq(guestListEntries.eventId, eventId),
          sql`lower(btrim(${guestListEntries.externalCode})) = ${normalized}`,
        ),
      );
    return row;
  }

  async findPlayerByGuestEntry(
    organizationId: string,
    eventId: string,
    guestListEntryId: string,
    tx: DbOrTx = this.db,
  ): Promise<PlayerRow | undefined> {
    const [row] = await tx
      .select()
      .from(players)
      .where(
        and(
          eq(players.organizationId, organizationId),
          eq(players.eventId, eventId),
          eq(players.env, 'live'),
          eq(players.guestListEntryId, guestListEntryId),
        ),
      );
    return row;
  }

  async findPlayerByDeviceId(
    organizationId: string,
    eventId: string,
    deviceId: string,
    tx: DbOrTx = this.db,
  ): Promise<PlayerRow | undefined> {
    const [row] = await tx
      .select()
      .from(players)
      .where(
        and(
          eq(players.organizationId, organizationId),
          eq(players.eventId, eventId),
          eq(players.env, 'live'),
          eq(players.deviceId, deviceId),
        ),
      );
    return row;
  }

  async insertPlayer(
    organizationId: string,
    data: NewPlayer,
    tx: DbOrTx = this.db,
  ): Promise<PlayerRow> {
    const [row] = await tx
      .insert(players)
      .values({ ...data, organizationId })
      .returning();
    return row as PlayerRow;
  }

  async updatePlayer(
    organizationId: string,
    playerId: string,
    patch: Partial<
      Pick<PlayerRow, 'displayName' | 'team' | 'checkedInAt' | 'deviceId' | 'formData'>
    >,
    tx: DbOrTx = this.db,
  ): Promise<PlayerRow> {
    const [row] = await tx
      .update(players)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(players.organizationId, organizationId), eq(players.id, playerId)))
      .returning();
    return row as PlayerRow;
  }

  async findConsentPurposes(
    organizationId: string,
    playerId: string,
    tx: DbOrTx = this.db,
  ): Promise<Set<string>> {
    const rows = await tx
      .select({ purpose: consents.purpose })
      .from(consents)
      .where(and(eq(consents.organizationId, organizationId), eq(consents.playerId, playerId)));
    return new Set(rows.map((r) => r.purpose));
  }

  async insertConsents(
    organizationId: string,
    rows: NewConsent[],
    tx: DbOrTx = this.db,
  ): Promise<void> {
    if (rows.length === 0) return;
    await tx.insert(consents).values(rows.map((r) => ({ ...r, organizationId })));
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.transaction(fn);
  }
}
