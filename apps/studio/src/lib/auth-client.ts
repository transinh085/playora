'use client';

import { organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/** Talks to Better Auth mounted on the API at /auth (cookies are shared on localhost). */
export const authClient = createAuthClient({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/auth`,
  plugins: [organizationClient()],
});
