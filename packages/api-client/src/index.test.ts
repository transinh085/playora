import { describe, expect, mock, test } from 'bun:test';
import { ErrorCode, eventsApi, publicApi } from '@playora/contracts';
import { ApiError, createApiClient } from './index';

function fakeFetch(status: number, body: unknown) {
  return mock(async (_url: URL, _init: RequestInit) => Response.json(body, { status }));
}

describe('api client', () => {
  test('builds URL, query string and JSON body from the contract', async () => {
    const fetch = fakeFetch(200, { items: [], nextCursor: null });
    const api = createApiClient({ baseUrl: 'http://api.test/', fetch: fetch });

    await api.call(eventsApi.list, { params: { orgId: 'org_1' }, query: { limit: 20 } });
    const [url, init] = fetch.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('http://api.test/v1/orgs/org_1/events?limit=20');
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
  });

  test('routes without input can be called with no arguments', async () => {
    const fetch = fakeFetch(200, { status: 'ok', db: 'ok', redis: 'ok', uptimeSec: 1 });
    const api = createApiClient({ baseUrl: 'http://api.test', fetch: fetch });
    await expect(api.call(publicApi.health)).resolves.toMatchObject({ status: 'ok' });
  });

  test('throws ApiError with the server error code', async () => {
    const fetch = fakeFetch(404, {
      error: { code: ErrorCode.NOT_FOUND, message: 'Event not found' },
    });
    const api = createApiClient({ baseUrl: 'http://api.test', fetch: fetch });
    const promise = api.call(publicApi.event, { params: { slug: 'missing' } });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 404, code: ErrorCode.NOT_FOUND });
  });
});
