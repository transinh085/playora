import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import { ErrorCode, eventsApi, liveApi } from '@playora/contracts';
import { HOST_TICKET_TTL_S, verifyLiveToken } from '@playora/core/live';
import {
  createOrg,
  createTestApp,
  signUp,
  TEST_ORIGIN,
  type TestApp,
  uniqueSlug,
} from './create-test-app';

let t: TestApp;
let alice: string;
let bob: string;
let aliceOrg: string;
let bobOrg: string;

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}@test.playora.local`;

async function authFetch(
  baseUrl: string,
  path: string,
  init: { method?: string; body?: unknown; cookie?: string } = {},
) {
  return fetch(`${baseUrl}/auth${path}`, {
    method: init.method ?? 'POST',
    headers: {
      origin: TEST_ORIGIN,
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(init.cookie ? { cookie: init.cookie } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

async function addMemberWithRole(
  baseUrl: string,
  ownerCookie: string,
  orgId: string,
  role: 'operator' | 'viewer',
) {
  const email = uniqueEmail(role);
  const invRes = await authFetch(baseUrl, '/organization/invite-member', {
    cookie: ownerCookie,
    body: { organizationId: orgId, email, role },
  });
  expect(invRes.status).toBe(200);
  const inv = (await invRes.json()) as { id: string };

  const signUpRes = await authFetch(baseUrl, '/sign-up/email', {
    body: { email, password: 'test-password-123', name: `${role} user` },
  });
  expect(signUpRes.ok).toBe(true);
  const cookie = signUpRes.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');

  const acceptRes = await authFetch(baseUrl, '/organization/accept-invitation', {
    cookie,
    body: { invitationId: inv.id },
  });
  expect(acceptRes.status).toBe(200);
  return cookie;
}

async function expectApiError(promise: Promise<unknown>, status: number, code: ErrorCode) {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status, code });
}

beforeAll(async () => {
  t = await createTestApp();
  alice = await signUp(t.baseUrl, 'Alice');
  bob = await signUp(t.baseUrl, 'Bob');
  aliceOrg = await createOrg(t.baseUrl, alice);
  bobOrg = await createOrg(t.baseUrl, bob);
});

afterAll(() => t?.close());

describe('live host ticket API', () => {
  test('owner and operator can issue a host ticket signed with HOST_TICKET_TTL_S', async () => {
    const api = t.client(alice);
    const created = await api.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Live Gala', slug: uniqueSlug('live') },
    });

    const beforeS = Math.floor(Date.now() / 1000);
    const ticket = await api.call(liveApi.ticket, {
      params: { orgId: aliceOrg, eventId: created.id },
    });
    const afterS = Math.floor(Date.now() / 1000);

    const secret = process.env.LIVE_TOKEN_SECRET ?? '';
    const claims = verifyLiveToken(ticket.token, secret);
    if (!claims) throw new Error('Expected valid host claims');
    expect(claims.kind).toBe('host');
    expect(claims.organizationId).toBe(aliceOrg);
    expect(claims.eventId).toBe(created.id);
    expect(claims.exp).toBeGreaterThanOrEqual(beforeS + HOST_TICKET_TTL_S);
    expect(claims.exp).toBeLessThanOrEqual(afterS + HOST_TICKET_TTL_S);
    expect(Math.floor(new Date(ticket.expiresAt).getTime() / 1000)).toBe(claims.exp);

    const operatorCookie = await addMemberWithRole(t.baseUrl, alice, aliceOrg, 'operator');
    const opTicket = await t.client(operatorCookie).call(liveApi.ticket, {
      params: { orgId: aliceOrg, eventId: created.id },
    });
    const opClaims = verifyLiveToken(opTicket.token, secret);
    expect(opClaims?.kind).toBe('host');
    expect(opClaims?.eventId).toBe(created.id);
  });

  test('viewer role is rejected with 403 FORBIDDEN', async () => {
    const created = await t.client(alice).call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Viewer Test', slug: uniqueSlug('viewer') },
    });
    const viewerCookie = await addMemberWithRole(t.baseUrl, alice, aliceOrg, 'viewer');

    await expectApiError(
      t.client(viewerCookie).call(liveApi.ticket, {
        params: { orgId: aliceOrg, eventId: created.id },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );
  });

  test('invalid eventId param returns 400 VALIDATION_FAILED', async () => {
    await expectApiError(
      t.client(alice).call(liveApi.ticket, {
        params: { orgId: aliceOrg, eventId: 'not-a-uuid' },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
  });

  test('anonymous request returns 401 UNAUTHORIZED', async () => {
    const created = await t.client(alice).call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Anon Test', slug: uniqueSlug('anon') },
    });
    await expectApiError(
      t.client().call(liveApi.ticket, {
        params: { orgId: aliceOrg, eventId: created.id },
      }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
  });

  test('tenant isolation: another org gets 403 on Alice org and 404 on Bob org with Alice eventId', async () => {
    const created = await t.client(alice).call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Cross Tenant', slug: uniqueSlug('xtenant') },
    });
    const asBob = t.client(bob);

    await expectApiError(
      asBob.call(liveApi.ticket, {
        params: { orgId: aliceOrg, eventId: created.id },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );

    await expectApiError(
      asBob.call(liveApi.ticket, {
        params: { orgId: bobOrg, eventId: created.id },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
  });
});
