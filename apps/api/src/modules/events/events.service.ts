import { createHash } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type ConsentItem,
  ErrorCode,
  type EventRegistrationForm,
  type eventsApi,
  type PublicConsentItem,
  type PublicRegistrationForm,
  type RouteArgs,
} from '@playora/contracts';
import { AuditService } from '../../common/audit/audit.service';
import { PG_UNIQUE_VIOLATION, pgErrorCode } from '../../common/http/pg-errors';
import { EventsRepository } from './events.repository';

/** Free plan cap until billing lands (docs/02-business-model.md §3.2). */
export const FREE_PLAYER_LIMIT = 100;

export function versionConsentItem(item: ConsentItem): PublicConsentItem {
  const payload = item.text.en ? `${item.text.vi}\n${item.text.en}` : item.text.vi;
  const textHash = createHash('sha256').update(payload).digest('hex');
  const textVersion = `sha256:${textHash.slice(0, 12)}`;
  return {
    purpose: item.purpose,
    text: item.text,
    required: item.required,
    textVersion,
    textHash,
  };
}

export function normalizeRegistrationForm(form: EventRegistrationForm): PublicRegistrationForm {
  return {
    fields: form.fields,
    consents: form.consents.map(versionConsentItem),
  };
}

type ListQuery = RouteArgs<typeof eventsApi.list>['query'];
type CreateBody = RouteArgs<typeof eventsApi.create>['body'];
type UpdateBody = RouteArgs<typeof eventsApi.update>['body'];

const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value);

export interface Actor {
  userId: string;
  ip?: string;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly repo: EventsRepository,
    private readonly audit: AuditService,
  ) {}

  list(orgId: string, query: ListQuery) {
    return this.repo.list(orgId, query);
  }

  async get(orgId: string, eventId: string) {
    const event = await this.repo.findById(orgId, eventId);
    if (!event)
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    return event;
  }

  async create(orgId: string, body: CreateBody) {
    if (body.brandKitId) {
      const ok = await this.repo.brandKitExistsInOrg(orgId, body.brandKitId);
      if (!ok) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Brand kit not found',
        });
      }
    }
    try {
      return await this.repo.insert(orgId, {
        name: body.name,
        slug: body.slug,
        brandKitId: body.brandKitId,
        mode: body.mode,
        status: body.status,
        identity: body.identity,
        registrationForm:
          body.registrationForm === undefined
            ? undefined
            : body.registrationForm === null
              ? null
              : normalizeRegistrationForm(body.registrationForm),
        timezone: body.timezone,
        startsAt: toDate(body.startsAt),
        endsAt: toDate(body.endsAt),
        playerLimit: body.playerLimit ?? FREE_PLAYER_LIMIT,
      });
    } catch (err) {
      if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
        throw new ConflictException({
          code: ErrorCode.SLUG_TAKEN,
          message: `Đường dẫn "${body.slug}" đã được dùng`,
          details: { field: 'slug' },
        });
      }
      throw err;
    }
  }

  async update(orgId: string, eventId: string, body: UpdateBody) {
    if (body.brandKitId) {
      const ok = await this.repo.brandKitExistsInOrg(orgId, body.brandKitId);
      if (!ok) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Brand kit not found',
        });
      }
    }
    const updated = await this.repo.update(orgId, eventId, {
      name: body.name,
      brandKitId: body.brandKitId,
      status: body.status,
      identity: body.identity,
      registrationForm:
        body.registrationForm === undefined
          ? undefined
          : body.registrationForm === null
            ? null
            : normalizeRegistrationForm(body.registrationForm),
      playerLimit: body.playerLimit,
      timezone: body.timezone,
      startsAt: toDate(body.startsAt),
      endsAt: toDate(body.endsAt),
    });
    if (!updated)
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    return updated;
  }

  async remove(orgId: string, eventId: string, actor: Actor) {
    const removed = await this.repo.transaction(async (tx) => {
      const row = await this.repo.softDelete(orgId, eventId, tx);
      if (row) {
        await this.audit.record(
          {
            organizationId: orgId,
            actorType: 'user',
            actorId: actor.userId,
            action: 'event.delete',
            targetType: 'event',
            targetId: eventId,
            ip: actor.ip,
          },
          tx,
        );
      }
      return row;
    });
    if (!removed)
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    return { ok: true as const };
  }
}
