import { Controller, Inject, NotFoundException } from '@nestjs/common';
import { ErrorCode, publicApi, type RouteArgs } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, eq, isNull } from 'drizzle-orm';
import { Args, Route } from '../../common/contract/route.decorator';
import { DB } from '../../infra/tokens';

@Controller()
export class PublicController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Route(publicApi.event)
  async event(@Args() { params }: RouteArgs<typeof publicApi.event>) {
    const { events } = schema;
    const [event] = await this.db
      .select({
        id: events.id,
        name: events.name,
        mode: events.mode,
        status: events.status,
        identity: events.identity,
        startsAt: events.startsAt,
      })
      .from(events)
      .where(and(eq(events.slug, params.slug), isNull(events.deletedAt)));

    if (!event)
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    return event;
  }
}
