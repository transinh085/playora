import { createApiClient } from '@playora/api-client';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';

/** Contract-driven API client for the player shell (no TanStack Query). */
export const api = createApiClient({ baseUrl: API_URL });

/** Client for `auth: 'player'` routes: the signed player token as a bearer (docs/engineering/api.md). */
export function playerApi(playerToken: string) {
  return createApiClient({
    baseUrl: API_URL,
    headers: { authorization: `Bearer ${playerToken}` },
    credentials: 'omit',
  });
}
