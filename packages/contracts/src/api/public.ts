import { z } from 'zod';
import { BrandFont, BrandKitColors } from './brand-kits';
import { Id, IsoDateTime, Slug } from './common';
import { EventMode, EventStatus, IdentityMode, LocalizedCopy, RegistrationField } from './events';
import { defineRoute } from './route';

export const PublicConsentItem = z.object({
  purpose: z.string(),
  text: LocalizedCopy,
  required: z.boolean(),
  textVersion: z.string(),
  textHash: z.string(),
});
export type PublicConsentItem = z.infer<typeof PublicConsentItem>;

export const PublicBrandKit = z.object({
  colors: BrandKitColors,
  fontHeading: BrandFont.optional(),
  fontBody: BrandFont.optional(),
  logoUrl: z.string().nullable(),
  backgroundUrl: z.string().nullable(),
});
export type PublicBrandKit = z.infer<typeof PublicBrandKit>;

export const PublicRegistrationForm = z.object({
  fields: z.array(RegistrationField),
  consents: z.array(PublicConsentItem),
});
export type PublicRegistrationForm = z.infer<typeof PublicRegistrationForm>;

export const PublicEvent = z.object({
  id: Id,
  slug: Slug,
  name: z.string(),
  mode: EventMode,
  status: EventStatus,
  identity: IdentityMode,
  startsAt: IsoDateTime.nullable(),
  registrationForm: PublicRegistrationForm,
  consents: z.array(PublicConsentItem),
  brandKit: PublicBrandKit.nullable(),
  playerLimitReached: z.boolean(),
});
export type PublicEvent = z.infer<typeof PublicEvent>;

export const JoinConsentEntry = z.object({
  purpose: z.string().trim().min(1).max(64),
  granted: z.boolean(),
});
export type JoinConsentEntry = z.infer<typeof JoinConsentEntry>;

export const JoinEventBody = z.object({
  deviceId: z.string().trim().min(1).max(128).optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
  code: z.string().trim().min(1).max(120).optional(),
  fields: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
  consents: z.union([z.record(z.string(), z.boolean()), z.array(JoinConsentEntry)]).optional(),
});
export type JoinEventBody = z.input<typeof JoinEventBody>;

export const JoinedPlayer = z.object({
  id: Id,
  displayName: z.string(),
  team: z.string().nullable(),
});
export type JoinedPlayer = z.infer<typeof JoinedPlayer>;

export const JoinEventResponse = z.object({
  playerToken: z.string(),
  player: JoinedPlayer,
});
export type JoinEventResponse = z.infer<typeof JoinEventResponse>;

export const publicApi = {
  event: defineRoute({
    method: 'GET',
    path: '/p/:slug',
    summary: 'Public event info for the player shell',
    tags: ['player'],
    auth: 'public',
    params: z.object({ slug: Slug }),
    response: PublicEvent,
  }),
  join: defineRoute({
    method: 'POST',
    path: '/p/:slug/join',
    summary: 'Join an event and obtain a signed playerToken',
    tags: ['player'],
    auth: 'public',
    params: z.object({ slug: Slug }),
    body: JoinEventBody,
    response: JoinEventResponse,
  }),
  health: defineRoute({
    method: 'GET',
    path: '/health',
    summary: 'Liveness and dependency status',
    tags: ['system'],
    auth: 'public',
    response: z.object({
      status: z.enum(['ok', 'degraded']),
      db: z.enum(['ok', 'down']),
      redis: z.enum(['ok', 'down']),
      uptimeSec: z.number(),
    }),
  }),
};
