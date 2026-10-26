import { z } from 'zod';
import { AuthId, Id, IsoDateTime, Ok, OrgParams, Page, PageQuery, Slug } from './common';
import { defineRoute } from './route';

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

export const ParticipationIdentityMode = z.enum(['anonymous', 'guest_list', 'form_only']);
export type ParticipationIdentityMode = z.infer<typeof ParticipationIdentityMode>;

export const LocalizedCopy = z.object({
  vi: z.string().trim().min(1).max(1000),
  en: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});
export type LocalizedCopy = z.infer<typeof LocalizedCopy>;

export const RegistrationFieldType = z.enum(['text', 'phone', 'email', 'select', 'checkbox']);
export type RegistrationFieldType = z.infer<typeof RegistrationFieldType>;

export const RegistrationField = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9_]+$/, 'Khoá trường chỉ gồm chữ, số và dấu gạch dưới'),
    type: RegistrationFieldType,
    label: LocalizedCopy,
    required: z.boolean().default(false),
    options: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  })
  .refine((f) => f.type !== 'select' || (f.options && f.options.length > 0), {
    message: 'Trường lựa chọn phải có ít nhất 1 tuỳ chọn',
    path: ['options'],
  });
export type RegistrationField = z.infer<typeof RegistrationField>;

export const ConsentItem = z.object({
  purpose: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_]+$/, 'Khoá mục đích chỉ gồm chữ, số và dấu gạch dưới'),
  text: LocalizedCopy,
  required: z.boolean().default(true),
  textVersion: z.string().optional(),
  textHash: z.string().optional(),
});
export type ConsentItem = z.infer<typeof ConsentItem>;

export const EventRegistrationForm = z
  .object({
    fields: z.array(RegistrationField).max(20).default([]),
    consents: z.array(ConsentItem).max(10).default([]),
  })
  .refine((form) => new Set(form.fields.map((f) => f.key)).size === form.fields.length, {
    message: 'Khoá các trường đăng ký không được trùng nhau',
    path: ['fields'],
  })
  .refine((form) => new Set(form.consents.map((c) => c.purpose)).size === form.consents.length, {
    message: 'Mục đích đồng ý không được trùng nhau',
    path: ['consents'],
  });
export type EventRegistrationForm = z.infer<typeof EventRegistrationForm>;

export const EventSummary = z.object({
  id: Id,
  organizationId: AuthId,
  brandKitId: Id.nullable(),
  slug: Slug,
  name: z.string(),
  status: EventStatus,
  identity: IdentityMode,
  registrationForm: EventRegistrationForm.nullable(),
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
    status: EventStatus.optional(),
    identity: IdentityMode.default('anonymous'),
    registrationForm: EventRegistrationForm.nullable().optional(),
    playerLimit: z.number().int().min(1).max(100_000).optional(),
    timezone: z.string().default('Asia/Ho_Chi_Minh'),
    startsAt: IsoDateTime.optional(),
    endsAt: IsoDateTime.optional(),
  })
  .refine((e) => !e.startsAt || !e.endsAt || Date.parse(e.startsAt) < Date.parse(e.endsAt), {
    message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
    path: ['endsAt'],
  });
export type CreateEventBody = z.input<typeof CreateEventBody>;

export const UpdateEventBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    brandKitId: Id.nullable(),
    status: EventStatus,
    identity: IdentityMode,
    registrationForm: EventRegistrationForm.nullable(),
    playerLimit: z.number().int().min(1).max(100_000),
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
