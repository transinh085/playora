import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common';
import { ErrorCode } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DB } from '../infra/tokens';

const slugSchema = z.string().regex(/^[a-z0-9-]{3,64}$/);

/** `GET /v1/p/:slug` — public event info for the player shell (docs/07-api-realtime.md §2.2). */
@Controller('p')
export class PublicEventsController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get(':slug')
  async bySlug(@Param('slug', new ZodValidationPipe(slugSchema)) slug: string) {
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
      .where(and(eq(events.slug, slug), isNull(events.deletedAt)));

    if (!event) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }
    return event;
  }
}
