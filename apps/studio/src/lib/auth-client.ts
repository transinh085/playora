'use client';

import { organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { API_URL } from './env';

/** Better Auth is mounted on the API at /auth. */
export const authClient = createAuthClient({
  baseURL: `${API_URL}/auth`,
  plugins: [organizationClient()],
});
