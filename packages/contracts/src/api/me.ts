import { z } from 'zod';
import { AuthId } from './common';
import { defineRoute } from './route';

export const MyOrg = z.object({
  id: AuthId,
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  role: z.string(),
});
export type MyOrg = z.infer<typeof MyOrg>;

export const meApi = {
  orgs: defineRoute({
    method: 'GET',
    path: '/me/orgs',
    summary: 'Organizations the signed-in user belongs to',
    tags: ['me'],
    auth: 'session',
    response: z.object({ items: z.array(MyOrg) }),
  }),
};
