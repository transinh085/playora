import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError, createApiClient } from '@playora/api-client';
import {
  assetsApi,
  brandKitsApi,
  DEFAULT_SCREEN_LAYOUT,
  ErrorCode,
  eventsApi,
  screensApi,
} from '@playora/contracts';
import { hashScreenKey } from '@playora/core/live';
import { type Database, schema } from '@playora/db';
import { and, eq } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import { DB, REDIS } from '../src/infra/tokens';
import { SCREEN_REVOKED_CHANNEL } from '../src/modules/screens/screens.service';
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

function screenClient(screenKey?: string) {
  return createApiClient({
    baseUrl: t.baseUrl,
    headers: screenKey !== undefined ? { 'x-screen-key': screenKey } : undefined,
  });
}

async function inviteAndAcceptRole(orgId: string, ownerCookie: string, role: string) {
  const email = `member-${role}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}@test.playora.local`;
  const invRes = await fetch(`${t.baseUrl}/auth/organization/invite-member`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: TEST_ORIGIN,
      cookie: ownerCookie,
    },
    body: JSON.stringify({ organizationId: orgId, email, role }),
  });
  expect(invRes.status).toBe(200);
  const invitation = (await invRes.json()) as { id: string };

  const signUpRes = await fetch(`${t.baseUrl}/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: TEST_ORIGIN },
    body: JSON.stringify({ email, password: 'test-password-123', name: `Member ${role}` }),
  });
  expect(signUpRes.ok).toBe(true);
  const memberCookie = signUpRes.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');

  const acceptRes = await fetch(`${t.baseUrl}/auth/organization/accept-invitation`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: TEST_ORIGIN,
      cookie: memberCookie,
    },
    body: JSON.stringify({ invitationId: invitation.id }),
  });
  expect(acceptRes.status).toBe(200);
  return memberCookie;
}

describe('screens API (LIV-02, BLD-11)', () => {
  test('create returns raw key once + fragment launch URL, stores only hashScreenKey, list never returns key, session resolves brand kit + presigned URLs, revoke and rotate invalidate old keys and write audit logs', async () => {
    const api = t.client(alice);
    const orgParams = { orgId: aliceOrg };

    // Upload logo & background assets and create a brand kit
    const logoTicket = await api.call(assetsApi.createUpload, {
      params: orgParams,
      body: { kind: 'image', mime: 'image/png', bytes: 128, filename: 'logo.png' },
    });
    const bgTicket = await api.call(assetsApi.createUpload, {
      params: orgParams,
      body: { kind: 'image', mime: 'image/jpeg', bytes: 256, filename: 'bg.jpg' },
    });

    const brandKit = await api.call(brandKitsApi.create, {
      params: orgParams,
      body: {
        name: 'YEP LED Kit',
        tokens: {
          colors: {
            primary: '#7c3aed',
            secondary: '#f59e0b',
            background: '#0f0a1e',
            text: '#ffffff',
          },
          fontHeading: 'Unbounded',
          fontBody: 'Be Vietnam Pro',
          logoAssetId: logoTicket.assetId,
          backgroundAssetId: bgTicket.assetId,
        },
      },
    });

    const slug = uniqueSlug('yep-screen');
    const event = await api.call(eventsApi.create, {
      params: orgParams,
      body: { name: 'YEP Gala 2026', slug, brandKitId: brandKit.id },
    });
    const eventParams = { orgId: aliceOrg, eventId: event.id };

    // 1. Create screen -> returns raw key once + launch URL (#k=<key>)
    const created = await api.call(screensApi.create, {
      params: eventParams,
      body: {
        name: 'Màn LED Sân khấu Chính',
        layout: {
          aspect: '32:9',
          safeAreaPct: 6,
          qrPosition: 'top-right',
          qrSize: 'lg',
          showEventTitle: true,
        },
      },
    });

    expect(created.name).toBe('Màn LED Sân khấu Chính');
    expect(created.key.length).toBeGreaterThanOrEqual(43);
    expect(created.launchUrl).toBe(`http://localhost:3002/screen#k=${created.key}`);
    expect(created.revokedAt).toBeNull();
    expect(created.layout).toEqual({
      aspect: '32:9',
      safeAreaPct: 6,
      qrPosition: 'top-right',
      qrSize: 'lg',
      showEventTitle: true,
    });

    // Verify DB stores only hashScreenKey(key), never the raw key
    const db = t.app.get<Database>(DB);
    const [dbScreen] = await db
      .select()
      .from(schema.eventScreens)
      .where(eq(schema.eventScreens.id, created.id));
    expect(dbScreen?.screenKeyHash).toBe(hashScreenKey(created.key));
    expect(dbScreen?.screenKeyHash).not.toBe(created.key);

    // 2. List screens -> never returns key, launchUrl, or screenKeyHash
    const listed = await api.call(screensApi.list, { params: eventParams });
    expect(listed.items).toHaveLength(1);
    const firstItem = listed.items[0] as Record<string, unknown> | undefined;
    expect(firstItem).toMatchObject({
      id: created.id,
      name: 'Màn LED Sân khấu Chính',
      revokedAt: null,
    });
    expect(firstItem).not.toHaveProperty('key');
    expect(firstItem).not.toHaveProperty('launchUrl');
    expect(firstItem).not.toHaveProperty('screenKeyHash');

    // 3. GET /screen/session works with the raw key in x-screen-key header
    const session = await screenClient(created.key).call(screensApi.session);
    expect(session.screen).toEqual({
      id: created.id,
      name: 'Màn LED Sân khấu Chính',
    });
    expect(session.event).toEqual({
      id: event.id,
      name: 'YEP Gala 2026',
      slug,
      status: 'draft',
    });
    expect(session.joinUrl).toBe(`http://localhost:3002/${slug}`);
    expect(session.layout).toEqual(created.layout);
    expect(session.brandKit).toMatchObject({
      id: brandKit.id,
      name: 'YEP LED Kit',
      colors: {
        primary: '#7c3aed',
        secondary: '#f59e0b',
        background: '#0f0a1e',
        text: '#ffffff',
      },
      fontHeading: 'Unbounded',
      fontBody: 'Be Vietnam Pro',
    });
    expect(session.brandKit?.logoUrl).toContain(logoTicket.assetId);
    expect(session.brandKit?.backgroundUrl).toContain(bgTicket.assetId);

    // 4. Update screen name and layout preset (including custom aspect)
    const updated = await api.call(screensApi.update, {
      params: { ...eventParams, screenId: created.id },
      body: {
        name: 'Màn LED Sảnh Đón Khách',
        layout: {
          aspect: 'custom',
          custom: { width: 3840, height: 1200 },
          safeAreaPct: 5,
          qrPosition: 'bottom-left',
          qrSize: 'md',
          showEventTitle: false,
        },
      },
    });
    expect(updated.name).toBe('Màn LED Sảnh Đón Khách');
    expect(updated.layout.aspect).toBe('custom');
    expect(updated.layout.custom).toEqual({ width: 3840, height: 1200 });
    expect(updated.layout.showEventTitle).toBe(false);

    // 5. Rotate key -> returns new key once, invalidates old key (401), and publishes OLD hash on live:screen.revoked
    const redis = t.app.get<Redis>(REDIS);
    const sub = redis.duplicate();
    const revokedEvents: Array<{ eventId: string; screenKeyHash: string }> = [];
    sub.on('message', (channel, msg) => {
      if (channel === SCREEN_REVOKED_CHANNEL) {
        revokedEvents.push(JSON.parse(msg) as { eventId: string; screenKeyHash: string });
      }
    });
    await sub.subscribe(SCREEN_REVOKED_CHANNEL);

    try {
      const oldKey = created.key;
      const rotated = await api.call(screensApi.rotate, {
        params: { ...eventParams, screenId: created.id },
      });
      expect(rotated.key).not.toBe(oldKey);
      expect(rotated.launchUrl).toBe(`http://localhost:3002/screen#k=${rotated.key}`);

      await Bun.sleep(30);
      expect(revokedEvents).toContainEqual({
        eventId: event.id,
        screenKeyHash: hashScreenKey(oldKey),
      });

      // Old key -> 401 UNAUTHORIZED
      await expectApiError(
        screenClient(oldKey).call(screensApi.session),
        401,
        ErrorCode.UNAUTHORIZED,
      );

      // New key -> 200 with updated screen name and layout
      const rotatedSession = await screenClient(rotated.key).call(screensApi.session);
      expect(rotatedSession.screen.name).toBe('Màn LED Sảnh Đón Khách');
      expect(rotatedSession.layout.aspect).toBe('custom');

      // 6. Revoke -> sets revokedAt, publishes rotated key hash on live:screen.revoked, session now returns 401
      const revoked = await api.call(screensApi.revoke, {
        params: { ...eventParams, screenId: created.id },
      });
      expect(revoked.revokedAt).not.toBeNull();

      await Bun.sleep(30);
      expect(revokedEvents).toContainEqual({
        eventId: event.id,
        screenKeyHash: hashScreenKey(rotated.key),
      });

      await expectApiError(
        screenClient(rotated.key).call(screensApi.session),
        401,
        ErrorCode.UNAUTHORIZED,
      );
    } finally {
      await sub.quit();
    }

    // 7. Verify audit log entries for create, rotate, and revoke
    const audits = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.organizationId, aliceOrg),
          eq(schema.auditLogs.targetId, created.id),
        ),
      );
    expect(audits.map((a) => a.action).sort()).toEqual([
      'screen.create',
      'screen.revoke',
      'screen.rotate',
    ]);
  });

  test('validates layout preset and screen name with 400 VALIDATION_FAILED', async () => {
    const api = t.client(alice);
    const event = await api.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Validation Event', slug: uniqueSlug('val-scr') },
    });
    const params = { orgId: aliceOrg, eventId: event.id };

    // Empty name
    await expectApiError(
      api.call(screensApi.create, {
        params,
        body: { name: '   ' },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    // Custom aspect without custom dimensions
    await expectApiError(
      api.call(screensApi.create, {
        params,
        body: {
          name: 'Bad Custom',
          layout: {
            ...DEFAULT_SCREEN_LAYOUT,
            aspect: 'custom',
          },
        },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    // Out-of-range safeAreaPct (> 20)
    await expectApiError(
      api.call(screensApi.create, {
        params,
        body: {
          name: 'Bad Safe Area',
          layout: {
            ...DEFAULT_SCREEN_LAYOUT,
            safeAreaPct: 30,
          },
        },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    // Out-of-range custom dimensions (< 320)
    await expectApiError(
      api.call(screensApi.create, {
        params,
        body: {
          name: 'Tiny Custom',
          layout: {
            ...DEFAULT_SCREEN_LAYOUT,
            aspect: 'custom',
            custom: { width: 100, height: 100 },
          },
        },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
  });

  test('viewer can list screens (200) but cannot create, update, revoke or rotate (403 FORBIDDEN)', async () => {
    const ownerApi = t.client(alice);
    const event = await ownerApi.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Viewer Test Event', slug: uniqueSlug('viewer-scr') },
    });
    const created = await ownerApi.call(screensApi.create, {
      params: { orgId: aliceOrg, eventId: event.id },
      body: { name: 'Main Screen' },
    });

    const viewerCookie = await inviteAndAcceptRole(aliceOrg, alice, 'viewer');
    const viewerApi = t.client(viewerCookie);
    const eventParams = { orgId: aliceOrg, eventId: event.id };
    const screenParams = { ...eventParams, screenId: created.id };

    // Viewer can list (event:read)
    const listRes = await viewerApi.call(screensApi.list, { params: eventParams });
    expect(listRes.items.map((s) => s.id)).toContain(created.id);

    // Viewer cannot create, update, revoke, or rotate (event:update -> 403 FORBIDDEN)
    await expectApiError(
      viewerApi.call(screensApi.create, { params: eventParams, body: { name: 'Nope' } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      viewerApi.call(screensApi.update, { params: screenParams, body: { name: 'Nope' } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      viewerApi.call(screensApi.revoke, { params: screenParams }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      viewerApi.call(screensApi.rotate, { params: screenParams }),
      403,
      ErrorCode.FORBIDDEN,
    );
  });

  test('anonymous requests and bad screen keys are rejected with 401 UNAUTHORIZED', async () => {
    const event = await t.client(alice).call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Auth Event', slug: uniqueSlug('auth-scr') },
    });
    const params = { orgId: aliceOrg, eventId: event.id };

    await expectApiError(t.client().call(screensApi.list, { params }), 401, ErrorCode.UNAUTHORIZED);
    await expectApiError(
      t.client().call(screensApi.create, { params, body: { name: 'Anon' } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );

    // Missing or invalid x-screen-key on GET /screen/session -> 401
    await expectApiError(screenClient().call(screensApi.session), 401, ErrorCode.UNAUTHORIZED);
    await expectApiError(
      screenClient('short').call(screensApi.session),
      401,
      ErrorCode.UNAUTHORIZED,
    );
    await expectApiError(
      screenClient('non-existent-screen-key-with-sufficient-length-12345').call(screensApi.session),
      401,
      ErrorCode.UNAUTHORIZED,
    );
  });

  test('cross-tenant isolation: another org cannot list, create, update, revoke or rotate (403 on foreign orgId, 404 on own orgId)', async () => {
    const asAlice = t.client(alice);
    const asBob = t.client(bob);

    const aliceEvent = await asAlice.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Alice Private Event', slug: uniqueSlug('alice-scr') },
    });
    const aliceScreen = await asAlice.call(screensApi.create, {
      params: { orgId: aliceOrg, eventId: aliceEvent.id },
      body: { name: 'Alice LED' },
    });

    // Bob calling Alice's orgId directly -> 403 FORBIDDEN
    const foreignOrgEventParams = { orgId: aliceOrg, eventId: aliceEvent.id };
    const foreignOrgScreenParams = { ...foreignOrgEventParams, screenId: aliceScreen.id };

    await expectApiError(
      asBob.call(screensApi.list, { params: foreignOrgEventParams }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asBob.call(screensApi.create, {
        params: foreignOrgEventParams,
        body: { name: 'Intruder' },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asBob.call(screensApi.revoke, { params: foreignOrgScreenParams }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asBob.call(screensApi.rotate, { params: foreignOrgScreenParams }),
      403,
      ErrorCode.FORBIDDEN,
    );

    // Bob using his own orgId (bobOrg) with Alice's eventId / screenId -> 404 NOT_FOUND
    const crossTenantEventParams = { orgId: bobOrg, eventId: aliceEvent.id };
    const crossTenantScreenParams = { ...crossTenantEventParams, screenId: aliceScreen.id };

    await expectApiError(
      asBob.call(screensApi.list, { params: crossTenantEventParams }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(screensApi.create, {
        params: crossTenantEventParams,
        body: { name: 'Intruder' },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(screensApi.update, {
        params: crossTenantScreenParams,
        body: { name: 'Intruder' },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(screensApi.revoke, { params: crossTenantScreenParams }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(screensApi.rotate, { params: crossTenantScreenParams }),
      404,
      ErrorCode.NOT_FOUND,
    );

    // Even if Bob creates his own event in bobOrg and tries to update/revoke/rotate Alice's screenId -> 404 NOT_FOUND
    const bobEvent = await asBob.call(eventsApi.create, {
      params: { orgId: bobOrg },
      body: { name: 'Bob Event', slug: uniqueSlug('bob-scr') },
    });
    const bobEventAliceScreenParams = {
      orgId: bobOrg,
      eventId: bobEvent.id,
      screenId: aliceScreen.id,
    };
    await expectApiError(
      asBob.call(screensApi.revoke, { params: bobEventAliceScreenParams }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(screensApi.rotate, { params: bobEventAliceScreenParams }),
      404,
      ErrorCode.NOT_FOUND,
    );
  });
});
