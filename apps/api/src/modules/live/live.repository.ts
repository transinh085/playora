import { Inject, Injectable } from '@nestjs/common';
import { type Database, schema } from '@playora/db';
import { and, eq, isNull } from 'drizzle-orm';
import { DB } from '../../infra/tokens';

const { events } = schema;

@Injectable()
export class LiveRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findEventById(organizationId: string, eventId: string) {
    const [row] = await this.db
      .select({ id: events.id, organizationId: events.organizationId })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          eq(events.id, eventId),
          isNull(events.deletedAt),
        ),
      );
    return row;
  }
}
