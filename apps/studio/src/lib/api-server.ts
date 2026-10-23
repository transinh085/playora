import { createApiClient } from '@playora/api-client';
import { cookies } from 'next/headers';
import { API_URL } from './env';

/** Server-component client: forwards the incoming session cookie to the API. */
export async function serverApi() {
  const cookie = (await cookies()).toString();
  return createApiClient({ baseUrl: API_URL, headers: cookie ? { cookie } : undefined });
}
