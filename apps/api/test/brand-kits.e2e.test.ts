import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import { brandKitsApi, ErrorCode, eventsApi } from '@playora/contracts';
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

describe('brand-kits API', () => {
  test('owner creates, reads, lists, updates, attaches to an event and deletes a brand kit', async () => {
    const api = t.client(alice);
    const params = { orgId: aliceOrg };

    const created = await api.call(brandKitsApi.create, {
      params,
      body: {
        name: 'YEP Gala Kit',
        tokens: {
          colors: {
            primary: '#7c3aed',
            secondary: '#f59e0b',
            background: '#0f0a1e',
            text: '#ffffff',
          },
          fontHeading: 'Unbounded',
          fontBody: 'Be Vietnam Pro',
          logoAssetId: '01950000-0000-7000-8000-000000000001',
        },
      },
    });
    expect(created).toMatchObject({
      organizationId: aliceOrg,
      name: 'YEP Gala Kit',
      tokens: {
        colors: {
          primary: '#7c3aed',
          secondary: '#f59e0b',
          background: '#0f0a1e',
          text: '#ffffff',
        },
        fontHeading: 'Unbounded',
        fontBody: 'Be Vietnam Pro',
        logoAssetId: '01950000-0000-7000-8000-000000000001',
      },
    });

    const fetched = await api.call(brandKitsApi.get, {
      params: { ...params, brandKitId: created.id },
    });
    expect(fetched.id).toBe(created.id);

    const page = await api.call(brandKitsApi.list, { params, query: { limit: 10 } });
    expect(page.items.map((k) => k.id)).toContain(created.id);

    const updated = await api.call(brandKitsApi.update, {
      params: { ...params, brandKitId: created.id },
      body: {
        name: 'Tết Đinh Mùi Kit',
        tokens: {
          colors: {
            primary: '#e11d48',
            background: '#fff1f2',
            text: '#1f2937',
          },
          fontHeading: 'Montserrat',
          fontBody: 'Be Vietnam Pro',
        },
      },
    });
    expect(updated.name).toBe('Tết Đinh Mùi Kit');
    expect(updated.tokens.colors.primary).toBe('#e11d48');

    // Attach brand kit to an event via eventsApi.update
    const ev = await api.call(eventsApi.create, {
      params,
      body: { name: 'YEP Event', slug: uniqueSlug('bk') },
    });
    expect(ev.brandKitId).toBeNull();

    const evWithKit = await api.call(eventsApi.update, {
      params: { ...params, eventId: ev.id },
      body: { brandKitId: created.id },
    });
    expect(evWithKit.brandKitId).toBe(created.id);

    // Detach brand kit
    const evDetached = await api.call(eventsApi.update, {
      params: { ...params, eventId: ev.id },
      body: { brandKitId: null },
    });
    expect(evDetached.brandKitId).toBeNull();

    await api.call(brandKitsApi.remove, {
      params: { ...params, brandKitId: created.id },
    });
    await expectApiError(
      api.call(brandKitsApi.get, { params: { ...params, brandKitId: created.id } }),
      404,
      ErrorCode.NOT_FOUND,
    );
  });

  test('invalid tokens or name are rejected with 400 VALIDATION_FAILED', async () => {
    const api = t.client(alice);
    await expectApiError(
      api.call(brandKitsApi.create, {
        params: { orgId: aliceOrg },
        body: {
          name: '',
          tokens: {
            colors: {
              primary: 'not-a-hex',
              background: '#000000',
              text: '#ffffff',
            },
          },
        },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
  });

  test('anonymous requests are rejected with 401 UNAUTHORIZED', async () => {
    await expectApiError(
      t.client().call(brandKitsApi.list, { params: { orgId: aliceOrg } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
  });

  test('tenant isolation: another org gets 403/404 and cannot attach foreign brandKitId to its event', async () => {
    const created = await t.client(alice).call(brandKitsApi.create, {
      params: { orgId: aliceOrg },
      body: {
        name: 'Alice Private Kit',
        tokens: {
          colors: { primary: '#7c3aed', background: '#000000', text: '#ffffff' },
        },
      },
    });

    const asBob = t.client(bob);
    const aliceParams = { orgId: aliceOrg, brandKitId: created.id };

    await expectApiError(
      asBob.call(brandKitsApi.list, { params: { orgId: aliceOrg } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asBob.call(brandKitsApi.get, { params: aliceParams }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asBob.call(brandKitsApi.update, { params: aliceParams, body: { name: 'Hack' } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asBob.call(brandKitsApi.remove, { params: aliceParams }),
      403,
      ErrorCode.FORBIDDEN,
    );

    // Repository scoping on Bob's own org
    await expectApiError(
      asBob.call(brandKitsApi.get, { params: { orgId: bobOrg, brandKitId: created.id } }),
      404,
      ErrorCode.NOT_FOUND,
    );

    // Bob cannot attach Alice's brandKitId to Bob's event
    const bobEvent = await asBob.call(eventsApi.create, {
      params: { orgId: bobOrg },
      body: { name: 'Bob Event', slug: uniqueSlug('bob-ev') },
    });
    await expectApiError(
      asBob.call(eventsApi.update, {
        params: { orgId: bobOrg, eventId: bobEvent.id },
        body: { brandKitId: created.id },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
  });
});
