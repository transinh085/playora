import { Inject, Injectable } from '@nestjs/common';
import { type GuestEntry, type GuestTeamCount, UNASSIGNED_TEAM_FILTER } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, asc, desc, eq, ilike, inArray, isNull, lt, or, type SQL, sql } from 'drizzle-orm';
import { DB } from '../../infra/tokens';
import type { ValidatedGuestRow } from './guest-file.parser';

const { events, guestListEntries, players } = schema;

type GuestRow = typeof guestListEntries.$inferSelect;
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

interface GuestPlayerState {
  checkedInAt: Date | null;
  deviceId: string | null;
}

function toGuestEntry(row: GuestRow, playerState?: GuestPlayerState): GuestEntry {
  const rawAttrs =
    row.attributes && typeof row.attributes === 'object' && !Array.isArray(row.attributes)
      ? (row.attributes as Record<string, unknown>)
      : {};
  const attributes: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawAttrs)) {
    if (v !== undefined && v !== null) attributes[k] = String(v);
  }
  return {
    id: row.id,
    organizationId: row.organizationId,
    eventId: row.eventId,
    externalCode: row.externalCode,
    displayName: row.displayName,
    team: row.team,
    attributes,
    checkedInAt: playerState?.checkedInAt ? playerState.checkedInAt.toISOString() : null,
    deviceBound: Boolean(playerState?.deviceId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Data access for guest list entries. Every method takes `organizationId` first and filters by it
 * to enforce tenant isolation at the data layer.
 */
@Injectable()
export class GuestsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  private scope(organizationId: string, eventId: string, ...conditions: Array<SQL | undefined>) {
    return and(
      eq(guestListEntries.organizationId, organizationId),
      eq(guestListEntries.eventId, eventId),
      ...conditions,
    );
  }

  async eventExists(
    organizationId: string,
    eventId: string,
    tx: Pick<Database, 'select'> = this.db,
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
    return Boolean(row);
  }

  async list(
    organizationId: string,
    eventId: string,
    opts: { limit: number; cursor?: string; search?: string; team?: string },
  ) {
    const search = opts.search?.trim();
    const team = opts.team?.trim();

    let searchCondition: SQL | undefined;
    if (search) {
      const escaped = search.replace(/[%_\\]/g, '\\$&');
      const pattern = `%${escaped}%`;
      searchCondition = or(
        ilike(guestListEntries.displayName, pattern),
        ilike(guestListEntries.externalCode, pattern),
      );
    }

    let teamCondition: SQL | undefined;
    if (team) {
      teamCondition =
        team === UNASSIGNED_TEAM_FILTER
          ? or(isNull(guestListEntries.team), eq(guestListEntries.team, ''))
          : eq(guestListEntries.team, team);
    }

    const rows = await this.db
      .select()
      .from(guestListEntries)
      .where(
        this.scope(
          organizationId,
          eventId,
          searchCondition,
          teamCondition,
          opts.cursor ? lt(guestListEntries.id, opts.cursor) : undefined,
        ),
      )
      .orderBy(desc(guestListEntries.id))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const playerStateByGuestId = new Map<string, GuestPlayerState>();

    if (slice.length > 0) {
      const playerRows = await this.db
        .select({
          guestListEntryId: players.guestListEntryId,
          checkedInAt: players.checkedInAt,
          deviceId: players.deviceId,
        })
        .from(players)
        .where(
          and(
            eq(players.organizationId, organizationId),
            eq(players.eventId, eventId),
            eq(players.env, 'live'),
            inArray(
              players.guestListEntryId,
              slice.map((r) => r.id),
            ),
          ),
        );
      for (const p of playerRows) {
        if (p.guestListEntryId) {
          playerStateByGuestId.set(p.guestListEntryId, {
            checkedInAt: p.checkedInAt,
            deviceId: p.deviceId,
          });
        }
      }
    }

    const items = slice.map((r) => toGuestEntry(r, playerStateByGuestId.get(r.id)));
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  }

  async findOne(
    organizationId: string,
    eventId: string,
    guestId: string,
    tx: Pick<Database, 'select'> = this.db,
  ): Promise<GuestRow | undefined> {
    const [row] = await tx
      .select()
      .from(guestListEntries)
      .where(this.scope(organizationId, eventId, eq(guestListEntries.id, guestId)));
    return row;
  }

  async releasePlayerDevice(
    organizationId: string,
    eventId: string,
    guestId: string,
    tx: Pick<Database, 'update'> = this.db,
  ): Promise<{ id: string } | undefined> {
    const [row] = await tx
      .update(players)
      .set({ deviceId: null, updatedAt: new Date() })
      .where(
        and(
          eq(players.organizationId, organizationId),
          eq(players.eventId, eventId),
          eq(players.env, 'live'),
          eq(players.guestListEntryId, guestId),
        ),
      )
      .returning({ id: players.id });
    return row;
  }

  async findExistingCodes(
    organizationId: string,
    eventId: string,
    codes: string[],
    tx: Pick<Database, 'select'> = this.db,
  ): Promise<Set<string>> {
    const existing = new Set<string>();
    const chunkSize = 5_000;
    for (let i = 0; i < codes.length; i += chunkSize) {
      const chunk = codes.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;
      const rows = await tx
        .select({ externalCode: guestListEntries.externalCode })
        .from(guestListEntries)
        .where(this.scope(organizationId, eventId, inArray(guestListEntries.externalCode, chunk)));
      for (const r of rows) {
        existing.add(r.externalCode);
      }
    }
    return existing;
  }

  async upsertBatch(
    organizationId: string,
    eventId: string,
    rows: ValidatedGuestRow[],
    tx: Pick<Database, 'insert'> = this.db,
  ): Promise<void> {
    const chunkSize = 2_500;
    const now = new Date();
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;
      await tx
        .insert(guestListEntries)
        .values(
          chunk.map((row) => ({
            organizationId,
            eventId,
            externalCode: row.externalCode,
            displayName: row.displayName,
            team: row.team,
            attributes: row.attributes,
            updatedAt: now,
          })),
        )
        .onConflictDoUpdate({
          target: [guestListEntries.eventId, guestListEntries.externalCode],
          set: {
            displayName: sql`excluded.display_name`,
            team: sql`excluded.team`,
            attributes: sql`excluded.attributes`,
            updatedAt: now,
          },
        });
    }
  }

  async deleteOne(
    organizationId: string,
    eventId: string,
    guestId: string,
    tx: Pick<Database, 'delete'> = this.db,
  ) {
    const [row] = await tx
      .delete(guestListEntries)
      .where(this.scope(organizationId, eventId, eq(guestListEntries.id, guestId)))
      .returning({ id: guestListEntries.id });
    return row;
  }

  async deleteAll(
    organizationId: string,
    eventId: string,
    tx: Pick<Database, 'delete'> = this.db,
  ): Promise<number> {
    const rows = await tx
      .delete(guestListEntries)
      .where(this.scope(organizationId, eventId))
      .returning({ id: guestListEntries.id });
    return rows.length;
  }

  async listTeams(
    organizationId: string,
    eventId: string,
    tx: Pick<Database, 'select'> = this.db,
  ): Promise<{ items: GuestTeamCount[]; unassignedCount: number; totalCount: number }> {
    const rows = await tx
      .select({
        team: guestListEntries.team,
        count: sql<number>`count(*)::int`,
      })
      .from(guestListEntries)
      .where(this.scope(organizationId, eventId))
      .groupBy(guestListEntries.team)
      .orderBy(asc(guestListEntries.team));

    const items: GuestTeamCount[] = [];
    let unassignedCount = 0;
    let totalCount = 0;

    for (const row of rows) {
      totalCount += row.count;
      if (row.team && row.team.trim() !== '') {
        items.push({ team: row.team, count: row.count });
      } else {
        unassignedCount += row.count;
      }
    }

    return { items, unassignedCount, totalCount };
  }

  async findUnassignedIds(
    organizationId: string,
    eventId: string,
    tx: Pick<Database, 'select'> = this.db,
  ): Promise<string[]> {
    const rows = await tx
      .select({ id: guestListEntries.id })
      .from(guestListEntries)
      .where(
        this.scope(
          organizationId,
          eventId,
          or(isNull(guestListEntries.team), eq(guestListEntries.team, '')),
        ),
      );
    return rows.map((r) => r.id);
  }

  async assignTeamToIds(
    organizationId: string,
    eventId: string,
    guestIds: string[],
    team: string,
    tx: Pick<Database, 'update'> = this.db,
  ): Promise<void> {
    const chunkSize = 1_000;
    const now = new Date();
    for (let i = 0; i < guestIds.length; i += chunkSize) {
      const chunk = guestIds.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;
      await tx
        .update(guestListEntries)
        .set({ team, updatedAt: now })
        .where(this.scope(organizationId, eventId, inArray(guestListEntries.id, chunk)));
    }
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.transaction(fn);
  }
}
