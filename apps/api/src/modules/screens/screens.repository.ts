import { Inject, Injectable } from '@nestjs/common';
import type { ScreenLayout } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DB } from '../../infra/tokens';

const { eventScreens, events, brandKits } = schema;

export type EventScreenRow = typeof eventScreens.$inferSelect;
export type NewEventScreen = Omit<typeof eventScreens.$inferInsert, 'organizationId'>;
export type EventScreenPatch = Partial<
  Pick<EventScreenRow, 'name' | 'layout' | 'screenKeyHash' | 'revokedAt'>
> & {
  layout?: ScreenLayout;
};

/**
 * Data access for event screens. Every org-scoped method takes `organizationId` first
 * and filters by it to enforce tenant isolation (docs/05 §8).
 */
@Injectable()
export class ScreensRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async eventExistsInOrg(
    organizationId: string,
    eventId: string,
    tx: Pick<Database, 'select'> = this.db,
  ) {
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

  async listByEvent(organizationId: string, eventId: string) {
    return this.db
      .select()
      .from(eventScreens)
      .where(
        and(eq(eventScreens.organizationId, organizationId), eq(eventScreens.eventId, eventId)),
      )
      .orderBy(desc(eventScreens.id));
  }

  async findById(
    organizationId: string,
    eventId: string,
    screenId: string,
    tx: Pick<Database, 'select'> = this.db,
  ) {
    const [row] = await tx
      .select()
      .from(eventScreens)
      .where(
        and(
          eq(eventScreens.organizationId, organizationId),
          eq(eventScreens.eventId, eventId),
          eq(eventScreens.id, screenId),
        ),
      );
    return row;
  }

  async insert(
    organizationId: string,
    data: NewEventScreen,
    tx: Pick<Database, 'insert'> = this.db,
  ) {
    const [row] = await tx
      .insert(eventScreens)
      .values({ ...data, organizationId })
      .returning();
    return row as EventScreenRow;
  }

  async update(
    organizationId: string,
    eventId: string,
    screenId: string,
    patch: EventScreenPatch,
    tx: Pick<Database, 'update'> = this.db,
  ) {
    const [row] = await tx
      .update(eventScreens)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(eventScreens.organizationId, organizationId),
          eq(eventScreens.eventId, eventId),
          eq(eventScreens.id, screenId),
        ),
      )
      .returning();
    return row;
  }

  async findActiveSessionByKeyHash(screenKeyHash: string) {
    const [row] = await this.db
      .select({
        screen: eventScreens,
        event: {
          id: events.id,
          organizationId: events.organizationId,
          name: events.name,
          slug: events.slug,
          status: events.status,
          brandKitId: events.brandKitId,
        },
        brandKit: {
          id: brandKits.id,
          name: brandKits.name,
          tokens: brandKits.tokens,
        },
      })
      .from(eventScreens)
      .innerJoin(
        events,
        and(
          eq(events.id, eventScreens.eventId),
          eq(events.organizationId, eventScreens.organizationId),
          isNull(events.deletedAt),
        ),
      )
      .leftJoin(
        brandKits,
        and(
          eq(brandKits.id, events.brandKitId),
          eq(brandKits.organizationId, eventScreens.organizationId),
        ),
      )
      .where(and(eq(eventScreens.screenKeyHash, screenKeyHash), isNull(eventScreens.revokedAt)));
    return row;
  }

  transaction<T>(fn: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>) {
    return this.db.transaction(fn);
  }
}
