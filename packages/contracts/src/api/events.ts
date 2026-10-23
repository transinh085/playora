import { z } from 'zod';
import { AuthId, Id, IsoDateTime, Ok, OrgParams, Page, PageQuery, Slug } from './common';
import { defineRoute } from './route';

export const EventMode = z.enum(['live', 'campaign']);
export type EventMode = z.infer<typeof EventMode>;
export const EventStatus = z.enum(['draft', 'scheduled', 'live', 'ended', 'archived']);
export type EventStatus = z.infer<typeof EventStatus>;
export const IdentityMode = z.enum([
  'anonymous',
  'guest_list',
  'form_only',
  'phone_otp',
  'email_otp',
  'zalo',
]);
export type IdentityMode = z.infer<typeof IdentityMode>;

export const EventSummary = z.object({
  id: Id,
  organizationId: AuthId,
  brandKitId: Id.nullable(),
  slug: Slug,
  name: z.string(),
  mode: EventMode,
  status: EventStatus,
  identity: IdentityMode,
  timezone: z.string(),
  startsAt: IsoDateTime.nullable(),
  endsAt: IsoDateTime.nullable(),
  playerLimit: z.number().int(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type EventSummary = z.infer<typeof EventSummary>;

export const CreateEventBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    slug: Slug,
    brandKitId: Id.nullable().optional(),
    mode: EventMode.default('live'),
    identity: IdentityMode.default('anonymous'),
    timezone: z.string().default('Asia/Ho_Chi_Minh'),
    startsAt: IsoDateTime.optional(),
    endsAt: IsoDateTime.optional(),
  })
  .refine((e) => !e.startsAt || !e.endsAt || e.startsAt < e.endsAt, {
    message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
    path: ['endsAt'],
  });
export type CreateEventBody = z.input<typeof CreateEventBody>;

export const UpdateEventBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    brandKitId: Id.nullable(),
    identity: IdentityMode,
    timezone: z.string(),
    startsAt: IsoDateTime.nullable(),
    endsAt: IsoDateTime.nullable(),
  })
  .partial();
export type UpdateEventBody = z.input<typeof UpdateEventBody>;

const EventParams = OrgParams.extend({ eventId: Id });

export const eventsApi = {
  list: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/events',
    summary: 'List events of an organization',
    tags: ['events'],
    auth: 'session',
    permission: { event: ['read'] },
    params: OrgParams,
    query: PageQuery.extend({ status: EventStatus.optional() }),
    response: Page(EventSummary),
  }),
  create: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/events',
    summary: 'Create an event',
    tags: ['events'],
    auth: 'session',
    permission: { event: ['create'] },
    params: OrgParams,
    body: CreateEventBody,
    response: EventSummary,
    status: 201,
  }),
  get: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/events/:eventId',
    summary: 'Get an event',
    tags: ['events'],
    auth: 'session',
    permission: { event: ['read'] },
    params: EventParams,
    response: EventSummary,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/orgs/:orgId/events/:eventId',
    summary: 'Update an event',
    tags: ['events'],
    auth: 'session',
    permission: { event: ['update'] },
    params: EventParams,
    body: UpdateEventBody,
    response: EventSummary,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/orgs/:orgId/events/:eventId',
    summary: 'Soft-delete an event',
    tags: ['events'],
    auth: 'session',
    permission: { event: ['delete'] },
    params: EventParams,
    response: Ok,
  }),
};
