import { z } from 'zod';
import { Id, IsoDateTime, OrgParams } from './common';
import { defineRoute } from './route';

export const LiveTicketResponse = z.object({
  token: z.string().min(1),
  expiresAt: IsoDateTime,
});
export type LiveTicketResponse = z.infer<typeof LiveTicketResponse>;

const EventParams = OrgParams.extend({ eventId: Id });

export const liveApi = {
  ticket: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/events/:eventId/live/ticket',
    summary: 'Issue a short-lived host ticket for the realtime gateway',
    tags: ['live'],
    auth: 'session',
    permission: { live: ['operate'] },
    params: EventParams,
    response: LiveTicketResponse,
  }),
};
