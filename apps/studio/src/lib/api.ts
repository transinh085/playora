'use client';

import { createApiClient } from '@playora/api-client';
import { API_URL } from './env';

/** Browser client: Better Auth session cookie is sent with `credentials: 'include'`. */
export const api = createApiClient({ baseUrl: API_URL });
