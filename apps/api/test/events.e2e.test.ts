import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import { ErrorCode, eventsApi, meApi, publicApi } from '@playora/contracts';
import { createOrg, createTestApp, signUp, type TestApp, uniqueSlug } from './create-test-app';

let t: TestApp;
let alice: string;
let bob: string;
let aliceOrg: string;
let bobOrg: string;

beforeAll(async () => {
  t = await createTestApp();
  alice = await signUp(t.baseUrl, 'Alice');
  bob = await signUp(t.baseUrl, 'Bob');
  aliceOrg = await createOrg(t.baseUrl, alice);
  bobOrg = await createOrg(t.baseUrl, bob);
});

afterAll(() => t?.close());

async function expectApiError(promise: Promise<unknown>, status: number, code: ErrorCode) {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status, code });
}

describe('events API', () => {
  test('owner creates, reads, lists, updates and deletes an event', async () => {
    const api = t.client(alice);
    const params = { orgId: aliceOrg };
    const slug = uniqueSlug();

    const created = await api.call(eventsApi.create, {
      params,
      body: { name: 'YEP 2026', slug, startsAt: '2026-12-20T11:00:00.000Z' },
    });
    expect(created).toMatchObject({
      slug,
      name: 'YEP 2026',
      status: 'draft',
      playerLimit: 100,
    });

    const fetched = await api.call(eventsApi.get, { params: { ...params, eventId: created.id } });
    expect(fetched.id).toBe(created.id);

    const page = await api.call(eventsApi.list, { params, query: { limit: 10 } });
    expect(page.items.map((e) => e.id)).toContain(created.id);

    const updated = await api.call(eventsApi.update, {
      params: { ...params, eventId: created.id },
      body: { name: 'YEP ABC 2026' },
    });
    expect(updated.name).toBe('YEP ABC 2026');

    // Visible to the player shell by slug.
    await expect(api.call(publicApi.event, { params: { slug } })).resolves.toMatchObject({
      id: created.id,
    });

    await api.call(eventsApi.remove, { params: { ...params, eventId: created.id } });
    await expectApiError(
      api.call(eventsApi.get, { params: { ...params, eventId: created.id } }),
      404,
      ErrorCode.NOT_FOUND,
    );
  });

  test('cursor pagination walks every event exactly once', async () => {
    const api = t.client(alice);
    const params = { orgId: aliceOrg };
    for (let i = 0; i < 5; i++) {
      await api.call(eventsApi.create, {
        params,
        body: { name: `E${i}`, slug: uniqueSlug('page') },
      });
    }
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await api.call(eventsApi.list, { params, query: { limit: 2, cursor } });
      seen.push(...page.items.map((e) => e.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.length).toBeGreaterThanOrEqual(5);
  });

  test('duplicate slug is a 409 SLUG_TAKEN', async () => {
    const api = t.client(alice);
    const slug = uniqueSlug();
    await api.call(eventsApi.create, { params: { orgId: aliceOrg }, body: { name: 'A', slug } });
    await expectApiError(
      api.call(eventsApi.create, { params: { orgId: aliceOrg }, body: { name: 'B', slug } }),
      409,
      ErrorCode.SLUG_TAKEN,
    );
  });

  test('invalid body is a 400 with field details', async () => {
    await expectApiError(
      t.client(alice).call(eventsApi.create, {
        params: { orgId: aliceOrg },
        body: { name: '', slug: 'Bad Slug!' },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
  });

  test('anonymous requests are rejected with 401', async () => {
    await expectApiError(
      t.client().call(eventsApi.list, { params: { orgId: aliceOrg } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
  });

  test('tenant isolation: a member of another org gets 403 on every route', async () => {
    const created = await t.client(alice).call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Secret', slug: uniqueSlug() },
    });
    const asBob = t.client(bob);
    const params = { orgId: aliceOrg, eventId: created.id };

    await expectApiError(
      asBob.call(eventsApi.list, { params: { orgId: aliceOrg } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(asBob.call(eventsApi.get, { params }), 403, ErrorCode.FORBIDDEN);
    await expectApiError(
      asBob.call(eventsApi.update, { params, body: { name: 'x' } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(asBob.call(eventsApi.remove, { params }), 403, ErrorCode.FORBIDDEN);

    // Bob's own org cannot reach Alice's event either (repository scoping).
    await expectApiError(
      asBob.call(eventsApi.get, { params: { orgId: bobOrg, eventId: created.id } }),
      404,
      ErrorCode.NOT_FOUND,
    );
  });

  test('GET /me/orgs lists memberships with roles', async () => {
    const { items } = await t.client(alice).call(meApi.orgs);
    expect(items).toContainEqual(expect.objectContaining({ id: aliceOrg, role: 'owner' }));
  });
});

describe('platform', () => {
  test('responses carry an x-request-id and errors echo it', async () => {
    const res = await fetch(`${t.baseUrl}/v1/p/does-not-exist`, {
      headers: { 'x-request-id': 'req-123' },
    });
    expect(res.headers.get('x-request-id')).toBe('req-123');
    expect(await res.json()).toMatchObject({
      error: { code: ErrorCode.NOT_FOUND, requestId: 'req-123' },
    });
  });

  test('OpenAPI document is served', async () => {
    const doc = (await (await fetch(`${t.baseUrl}/v1/openapi.json`)).json()) as { paths: object };
    expect(Object.keys(doc.paths)).toContain('/orgs/{orgId}/events');
  });

  test('security headers are set', async () => {
    const res = await fetch(`${t.baseUrl}/v1/health`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
