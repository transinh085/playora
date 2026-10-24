import { Inject, Injectable } from '@nestjs/common';
import type { EventStatus } from '@playora/contracts';
import { type Database, type DbOrTx, schema, type Tx } from '@playora/db';
import { and, desc, eq, isNull, lt, type SQL } from 'drizzle-orm';
import { DB } from '../../infra/tokens';

const { events, brandKits } = schema;

export type EventRow = typeof events.$inferSelect;
export type NewEvent = Omit<typeof events.$inferInsert, 'organizationId'>;
export type EventPatch = Partial<
  Pick<
    EventRow,
    | 'name'
    | 'brandKitId'
    | 'status'
    | 'identity'
    | 'registrationForm'
    | 'playerLimit'
    | 'timezone'
    | 'startsAt'
    | 'endsAt'
  >
>;

/**
 * Data access for events. Every method takes `organizationId` first and filters by it:
 * tenant isolation is enforced here, not only in guards (docs/05 §8).
 */
@Injectable()
export class EventsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  private scope(organizationId: string, ...conditions: Array<SQL | undefined>) {
    return and(eq(events.organizationId, organizationId), isNull(events.deletedAt), ...conditions);
  }

  async list(
    organizationId: string,
    opts: { limit: number; cursor?: string; status?: EventStatus },
  ) {
    const rows = await this.db
      .select()
      .from(events)
      .where(
        this.scope(
          organizationId,
          opts.status ? eq(events.status, opts.status) : undefined,
          // UUIDv7 ids sort by creation time, so the id doubles as a stable cursor.
          opts.cursor ? lt(events.id, opts.cursor) : undefined,
        ),
      )
      .orderBy(desc(events.id))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    const items = hasMore ? rows.slice(0, opts.limit) : rows;
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  }

  async findById(organizationId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(events)
      .where(this.scope(organizationId, eq(events.id, id)));
    return row;
  }

  async brandKitExistsInOrg(organizationId: string, brandKitId: string) {
    const [row] = await this.db
      .select({ id: brandKits.id })
      .from(brandKits)
      .where(and(eq(brandKits.organizationId, organizationId), eq(brandKits.id, brandKitId)));
    return !!row;
  }

  async insert(organizationId: string, data: NewEvent) {
    const [row] = await this.db
      .insert(events)
      .values({ ...data, organizationId })
      .returning();
    return row as EventRow;
  }

  async update(organizationId: string, id: string, patch: EventPatch) {
    const [row] = await this.db
      .update(events)
      .set(patch)
      .where(this.scope(organizationId, eq(events.id, id)))
      .returning();
    return row;
  }

  async softDelete(organizationId: string, id: string, tx: DbOrTx = this.db) {
    const [row] = await tx
      .update(events)
      .set({ deletedAt: new Date() })
      .where(this.scope(organizationId, eq(events.id, id)))
      .returning({ id: events.id });
    return row;
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.transaction(fn);
  }
}
