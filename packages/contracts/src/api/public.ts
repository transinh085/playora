import { z } from 'zod';
import { Id, IsoDateTime, Slug } from './common';
import { EventMode, EventStatus, IdentityMode } from './events';
import { defineRoute } from './route';

export const PublicEvent = z.object({
  id: Id,
  name: z.string(),
  mode: EventMode,
  status: EventStatus,
  identity: IdentityMode,
  startsAt: IsoDateTime.nullable(),
});
export type PublicEvent = z.infer<typeof PublicEvent>;

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
