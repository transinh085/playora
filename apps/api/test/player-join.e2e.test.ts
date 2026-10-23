import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { ApiError } from '@playora/api-client';
import {
  assetsApi,
  brandKitsApi,
  ErrorCode,
  eventsApi,
  guestsApi,
  publicApi,
} from '@playora/contracts';
import { PLAYER_TOKEN_TTL_S, verifyLiveToken } from '@playora/core/live';
import { type Database, schema } from '@playora/db';
import type { ApiEnv } from '@playora/env';
import { eq } from 'drizzle-orm';
import { DB, ENV } from '../src/infra/tokens';
import { createOrg, createTestApp, signUp, type TestApp, uniqueSlug } from './create-test-app';

let t: TestApp;
let db: Database;
let env: ApiEnv;
let alice: string;
let bob: string;
let aliceOrg: string;
let bobOrg: string;

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

beforeAll(async () => {
  t = await createTestApp({ RATE_LIMIT_PER_MIN: '300' });
  db = t.app.get(DB);
  env = t.app.get(ENV);
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

async function uploadImageAsset(cookie: string, orgId: string): Promise<string> {
  const api = t.client(cookie);
  const upload = await api.call(assetsApi.createUpload, {
    params: { orgId },
    body: { kind: 'image', mime: 'image/png', bytes: TINY_PNG.byteLength },
  });
  const putRes = await fetch(upload.uploadUrl, {
    method: 'PUT',
    headers: upload.headers,
    body: TINY_PNG,
  });
  expect(putRes.ok).toBe(true);
  await api.call(assetsApi.completeUpload, {
    params: { orgId, assetId: upload.assetId },
    body: {},
  });
  return upload.assetId;
}

describe('player join & participation config (EVT-02, EVT-05)', () => {
  test('GET /p/:slug returns participation config, versioned consents, brand kit with presigned URLs, and hides internal org data', async () => {
    const api = t.client(alice);
    const logoAssetId = await uploadImageAsset(alice, aliceOrg);
    const bgAssetId = await uploadImageAsset(alice, aliceOrg);

    const kit = await api.call(brandKitsApi.create, {
      params: { orgId: aliceOrg },
      body: {
        name: 'Gala Brand Kit',
        tokens: {
          colors: {
            primary: '#e11d48',
            secondary: '#fbbf24',
            background: '#1e1b4b',
            text: '#ffffff',
          },
          fontHeading: 'Unbounded',
          fontBody: 'Be Vietnam Pro',
          logoAssetId,
          backgroundAssetId: bgAssetId,
        },
      },
    });

    const slug = uniqueSlug('pub');
    const consentText = 'Tôi đồng ý tham gia chương trình và xử lý dữ liệu cá nhân';
    const expectedHash = createHash('sha256').update(consentText).digest('hex');

    const created = await api.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: {
        name: 'Gala Night 2026',
        slug,
        brandKitId: kit.id,
        status: 'scheduled',
        identity: 'form_only',
        playerLimit: 50,
        registrationForm: {
          fields: [
            {
              key: 'full_name',
              type: 'text',
              label: { vi: 'Họ và tên', en: 'Full name' },
              required: true,
            },
          ],
          consents: [
            {
              purpose: 'participation',
              text: { vi: consentText },
              required: true,
            },
          ],
        },
      },
    });

    const pub = await t.client().call(publicApi.event, { params: { slug } });
    expect(pub.id).toBe(created.id);
    expect(pub.slug).toBe(slug);
    expect(pub.identity).toBe('form_only');
    expect(pub.playerLimitReached).toBe(false);
    expect(pub.registrationForm.fields).toHaveLength(1);
    expect(pub.consents).toHaveLength(1);
    expect(pub.consents[0]).toMatchObject({
      purpose: 'participation',
      required: true,
      textHash: expectedHash,
      textVersion: `sha256:${expectedHash.slice(0, 12)}`,
    });
    expect(pub.brandKit).not.toBeNull();
    expect(pub.brandKit?.colors.primary).toBe('#e11d48');
    expect(pub.brandKit?.fontHeading).toBe('Unbounded');
    expect(pub.brandKit?.logoUrl).toContain(logoAssetId);
    expect(pub.brandKit?.backgroundUrl).toContain(bgAssetId);

    // Must never leak org-internal fields
    const rawPub = pub as Record<string, unknown>;
    expect(rawPub.organizationId).toBeUndefined();
    expect(rawPub.brandKitId).toBeUndefined();
    expect(rawPub.playerLimit).toBeUndefined();
  });

  test('anonymous identity mode: happy path, token claims verification, and idempotent re-join by deviceId', async () => {
    const api = t.client(alice);
    const slug = uniqueSlug('anon');
    const event = await api.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: {
        name: 'Anonymous Event',
        slug,
        status: 'live',
        identity: 'anonymous',
      },
    });

    const anonClient = t.client();
    const devId = uniqueSlug('dev-anon');
    const beforeS = Math.floor(Date.now() / 1000);
    const first = await anonClient.call(publicApi.join, {
      params: { slug },
      body: { deviceId: devId, displayName: 'Minh Anh' },
    });

    expect(first.player).toMatchObject({
      displayName: 'Minh Anh',
      team: null,
    });

    const claims = verifyLiveToken(first.playerToken, env.LIVE_TOKEN_SECRET);
    expect(claims).not.toBeNull();
    expect(claims).toMatchObject({
      kind: 'player',
      organizationId: aliceOrg,
      eventId: event.id,
      sub: first.player.id,
      displayName: 'Minh Anh',
      team: null,
      env: 'live',
    });
    expect(claims?.exp).toBeGreaterThanOrEqual(beforeS + PLAYER_TOKEN_TTL_S - 5);

    // Idempotent re-join with same deviceId returns the exact same player row
    const second = await anonClient.call(publicApi.join, {
      params: { slug },
      body: { deviceId: devId },
    });
    expect(second.player.id).toBe(first.player.id);
    expect(second.player.displayName).toBe('Minh Anh');
  });

  test('guest_list identity mode: device binding, impersonation defense (409 GUEST_CODE_ALREADY_USED), operator release-device (audit-logged), and 404 GUEST_CODE_NOT_FOUND', async () => {
    const api = t.client(alice);
    const bobApi = t.client(bob);
    const slug = uniqueSlug('guest');
    const event = await api.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: {
        name: 'Guest List Event',
        slug,
        status: 'scheduled',
        identity: 'guest_list',
      },
    });

    const csv = ['externalCode,displayName,team', 'NV-001,Nguyễn Văn A,Kinh doanh'].join('\n');
    await api.call(guestsApi.import, {
      params: { orgId: aliceOrg, eventId: event.id },
      body: { fileName: 'guests.csv', content: csv, encoding: 'text' },
    });

    const guestsBefore = await api.call(guestsApi.list, {
      params: { orgId: aliceOrg, eventId: event.id },
    });
    const guestEntry = guestsBefore.items[0];
    expect(guestEntry).toBeDefined();
    expect(guestEntry?.checkedInAt).toBeNull();
    expect(guestEntry?.deviceBound).toBe(false);

    const publicClient = t.client();
    const phone1 = uniqueSlug('dev-guest-phone1');
    const phone2 = uniqueSlug('dev-guest-phone2');

    // Missing deviceId in guest_list mode → 400 VALIDATION_FAILED
    await expectApiError(
      publicClient.call(publicApi.join, {
        params: { slug },
        body: { code: 'NV-001' },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    // Case-insensitive + whitespace-trimmed match with deviceId
    const joined = await publicClient.call(publicApi.join, {
      params: { slug },
      body: { deviceId: phone1, code: '  nv-001  ' },
    });
    expect(joined.player).toMatchObject({
      displayName: 'Nguyễn Văn A',
      team: 'Kinh doanh',
    });

    const [playerRow1] = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, joined.player.id));
    expect(playerRow1?.checkedInAt).toBeInstanceOf(Date);
    expect(playerRow1?.deviceId).toBe(phone1);
    const firstCheckedInAt = playerRow1?.checkedInAt?.getTime();

    const guestsAfterJoin = await api.call(guestsApi.list, {
      params: { orgId: aliceOrg, eventId: event.id },
    });
    expect(guestsAfterJoin.items[0]?.checkedInAt).toBeTruthy();
    expect(guestsAfterJoin.items[0]?.deviceBound).toBe(true);

    const claims = verifyLiveToken(joined.playerToken, env.LIVE_TOKEN_SECRET);
    expect(claims).toMatchObject({
      kind: 'player',
      organizationId: aliceOrg,
      eventId: event.id,
      sub: joined.player.id,
      displayName: 'Nguyễn Văn A',
      team: 'Kinh doanh',
      env: 'live',
    });

    // Idempotent re-join with same guest code + same deviceId returns same player and preserves original checkedInAt
    const rejoined = await publicClient.call(publicApi.join, {
      params: { slug },
      body: { deviceId: phone1, code: 'NV-001' },
    });
    expect(rejoined.player.id).toBe(joined.player.id);

    const [playerRow2] = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, joined.player.id));
    expect(playerRow2?.checkedInAt?.getTime()).toBe(firstCheckedInAt);

    // Impersonation attempt from another deviceId → 409 GUEST_CODE_ALREADY_USED
    await expectApiError(
      publicClient.call(publicApi.join, {
        params: { slug },
        body: { deviceId: phone2, code: 'NV-001' },
      }),
      409,
      ErrorCode.GUEST_CODE_ALREADY_USED,
    );

    // release-device auth & tenant isolation (401, 403, 404)
    const guestId = guestEntry?.id ?? '';
    await expectApiError(
      publicClient.call(guestsApi.releaseDevice, {
        params: { orgId: aliceOrg, eventId: event.id, guestId },
      }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
    await expectApiError(
      bobApi.call(guestsApi.releaseDevice, {
        params: { orgId: aliceOrg, eventId: event.id, guestId },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      bobApi.call(guestsApi.releaseDevice, {
        params: { orgId: bobOrg, eventId: event.id, guestId },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      api.call(guestsApi.releaseDevice, {
        params: { orgId: aliceOrg, eventId: event.id, guestId: event.id },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );

    // Operator releases device binding
    const released = await api.call(guestsApi.releaseDevice, {
      params: { orgId: aliceOrg, eventId: event.id, guestId },
    });
    expect(released).toEqual({ ok: true });

    // Audit log recorded for guests.release_device
    const auditRows = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.targetId, guestId));
    expect(auditRows.some((a) => a.action === 'guests.release_device')).toBe(true);

    const guestsAfterRelease = await api.call(guestsApi.list, {
      params: { orgId: aliceOrg, eventId: event.id },
    });
    expect(guestsAfterRelease.items[0]?.checkedInAt).toBeTruthy();
    expect(guestsAfterRelease.items[0]?.deviceBound).toBe(false);

    // Guest can now join from the new phone (phone2) and keeps their player row
    const joinedNewPhone = await publicClient.call(publicApi.join, {
      params: { slug },
      body: { deviceId: phone2, code: 'NV-001' },
    });
    expect(joinedNewPhone.player.id).toBe(joined.player.id);

    // Old phone (phone1) is now rejected with 409 GUEST_CODE_ALREADY_USED
    await expectApiError(
      publicClient.call(publicApi.join, {
        params: { slug },
        body: { deviceId: phone1, code: 'NV-001' },
      }),
      409,
      ErrorCode.GUEST_CODE_ALREADY_USED,
    );

    // Unknown guest code → 404 GUEST_CODE_NOT_FOUND
    await expectApiError(
      publicClient.call(publicApi.join, {
        params: { slug },
        body: { deviceId: uniqueSlug('dev-guest'), code: 'NV-999' },
      }),
      404,
      ErrorCode.GUEST_CODE_NOT_FOUND,
    );
  });

  test('form_only identity mode: validates fields and consents, persists and merges sanitized form_data (never returned publicly), writes consents rows, and rejects missing required consent with 400', async () => {
    const api = t.client(alice);
    const slug = uniqueSlug('form');
    const event = await api.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Form Event', slug },
    });

    const participationText = 'Đồng ý điều khoản tham gia sự kiện';
    const marketingText = 'Đồng ý nhận thông tin ưu đãi';
    const participationHash = createHash('sha256').update(participationText).digest('hex');
    const marketingHash = createHash('sha256').update(marketingText).digest('hex');

    await api.call(eventsApi.update, {
      params: { orgId: aliceOrg, eventId: event.id },
      body: {
        status: 'live',
        identity: 'form_only',
        registrationForm: {
          fields: [
            {
              key: 'full_name',
              type: 'text',
              label: { vi: 'Họ tên', en: 'Full name' },
              required: true,
            },
            {
              key: 'phone',
              type: 'phone',
              label: { vi: 'Số điện thoại' },
              required: true,
            },
            {
              key: 'email',
              type: 'email',
              label: { vi: 'Email' },
              required: false,
            },
            {
              key: 'dept',
              type: 'select',
              label: { vi: 'Phòng ban' },
              required: true,
              options: ['Kỹ thuật', 'Sản phẩm'],
            },
            {
              key: 'vip',
              type: 'checkbox',
              label: { vi: 'Khách VIP' },
              required: false,
            },
            {
              key: 'note',
              type: 'text',
              label: { vi: 'Ghi chú' },
              required: false,
            },
          ],
          consents: [
            {
              purpose: 'participation',
              text: { vi: participationText },
              required: true,
            },
            {
              purpose: 'marketing',
              text: { vi: marketingText },
              required: false,
            },
          ],
        },
      },
    });

    const publicClient = t.client();
    const devId = uniqueSlug('dev-form');

    // Missing required consent → 400 VALIDATION_FAILED
    await expectApiError(
      publicClient.call(publicApi.join, {
        params: { slug },
        body: {
          deviceId: devId,
          fields: {
            full_name: 'Trần Thị B',
            phone: '0901234567',
            dept: 'Kỹ thuật',
          },
          consents: {
            participation: false,
            marketing: true,
          },
        },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    // Missing required field → 400 VALIDATION_FAILED
    await expectApiError(
      publicClient.call(publicApi.join, {
        params: { slug },
        body: {
          deviceId: devId,
          fields: {
            full_name: 'Trần Thị B',
            dept: 'Kỹ thuật',
          },
          consents: {
            participation: true,
          },
        },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    const longNote = `  ${'A'.repeat(650)}  `;

    // Happy path with custom User-Agent, extra unknown field key, untrimmed values, and over-length note
    const joinRes = await fetch(`${t.baseUrl}/v1/p/${slug}/join`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'PlayoraTestAgent/1.0',
      },
      body: JSON.stringify({
        deviceId: devId,
        fields: {
          full_name: '  Trần Thị B  ',
          phone: '  0901234567  ',
          email: '  b.tran@example.com  ',
          dept: 'Kỹ thuật',
          vip: true,
          note: longNote,
          unknown_injected_key: 'should-be-dropped',
        },
        consents: {
          participation: true,
          marketing: false,
        },
      }),
    });
    expect(joinRes.status).toBe(200);
    const joined = (await joinRes.json()) as Record<string, unknown> & {
      playerToken: string;
      player: Record<string, unknown> & { id: string; displayName: string; team: string | null };
    };
    expect(joined.player.displayName).toBe('Trần Thị B');

    // Public response must never leak form_data / formData
    expect(joined.formData).toBeUndefined();
    expect(joined.form_data).toBeUndefined();
    expect(joined.player.formData).toBeUndefined();
    expect(joined.player.form_data).toBeUndefined();

    // Verify players.form_data in DB: only configured keys stored, strings trimmed & capped to 500 chars
    const [playerRowBefore] = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, joined.player.id));
    expect(playerRowBefore?.formData).toEqual({
      full_name: 'Trần Thị B',
      phone: '0901234567',
      email: 'b.tran@example.com',
      dept: 'Kỹ thuật',
      vip: true,
      note: 'A'.repeat(500),
    });

    // Verify consents rows in DB
    const consentRows = await db
      .select()
      .from(schema.consents)
      .where(eq(schema.consents.playerId, joined.player.id));
    expect(consentRows).toHaveLength(2);

    const partConsent = consentRows.find((c) => c.purpose === 'participation');
    const mktConsent = consentRows.find((c) => c.purpose === 'marketing');
    expect(partConsent).toMatchObject({
      organizationId: aliceOrg,
      playerId: joined.player.id,
      purpose: 'participation',
      granted: true,
      textHash: participationHash,
      textVersion: `sha256:${participationHash.slice(0, 12)}`,
      userAgent: 'PlayoraTestAgent/1.0',
    });
    expect(partConsent?.ip).toBeTruthy();
    expect(mktConsent).toMatchObject({
      organizationId: aliceOrg,
      playerId: joined.player.id,
      purpose: 'marketing',
      granted: false,
      textHash: marketingHash,
      textVersion: `sha256:${marketingHash.slice(0, 12)}`,
    });

    // Re-join with same deviceId merges updated form_data over existing answers without duplicating player or consents
    const rejoined = await publicClient.call(publicApi.join, {
      params: { slug },
      body: {
        deviceId: devId,
        fields: {
          full_name: 'Trần Thị B',
          phone: '0901234567',
          dept: 'Sản phẩm',
          unknown_second_key: 'dropped',
        },
        consents: {
          participation: true,
          marketing: false,
        },
      },
    });
    expect(rejoined.player.id).toBe(joined.player.id);

    const [playerRowAfter] = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, joined.player.id));
    expect(playerRowAfter?.formData).toEqual({
      full_name: 'Trần Thị B',
      phone: '0901234567',
      email: 'b.tran@example.com',
      dept: 'Sản phẩm',
      vip: true,
      note: 'A'.repeat(500),
    });

    const consentRowsAfter = await db
      .select()
      .from(schema.consents)
      .where(eq(schema.consents.playerId, joined.player.id));
    expect(consentRowsAfter).toHaveLength(2);
  });

  test('playerLimit enforcement: returns 409 PLAYER_LIMIT_REACHED when full, while allowing existing players to re-join', async () => {
    const api = t.client(alice);
    const slug = uniqueSlug('limit');
    await api.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: {
        name: 'Limited Event',
        slug,
        status: 'live',
        identity: 'anonymous',
        playerLimit: 2,
      },
    });

    const publicClient = t.client();
    const dev1 = uniqueSlug('dev-limit-1');
    const dev2 = uniqueSlug('dev-limit-2');
    const dev3 = uniqueSlug('dev-limit-3');
    const p1 = await publicClient.call(publicApi.join, {
      params: { slug },
      body: { deviceId: dev1, displayName: 'P1' },
    });
    await publicClient.call(publicApi.join, {
      params: { slug },
      body: { deviceId: dev2, displayName: 'P2' },
    });

    // Public event now reports playerLimitReached: true
    const pub = await publicClient.call(publicApi.event, { params: { slug } });
    expect(pub.playerLimitReached).toBe(true);

    // 3rd new player is rejected with 409 PLAYER_LIMIT_REACHED
    await expectApiError(
      publicClient.call(publicApi.join, {
        params: { slug },
        body: { deviceId: dev3, displayName: 'P3' },
      }),
      409,
      ErrorCode.PLAYER_LIMIT_REACHED,
    );

    // Existing player 1 can still idempotently re-join
    const p1Again = await publicClient.call(publicApi.join, {
      params: { slug },
      body: { deviceId: dev1, displayName: 'P1' },
    });
    expect(p1Again.player.id).toBe(p1.player.id);
  });

  test('draft event returns 404 NOT_FOUND on join; ended event returns 409 EVENT_NOT_LIVE', async () => {
    const api = t.client(alice);
    const slug = uniqueSlug('status');
    const event = await api.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: {
        name: 'Draft Event',
        slug,
        status: 'draft',
        identity: 'anonymous',
      },
    });

    const publicClient = t.client();
    await expectApiError(
      publicClient.call(publicApi.join, {
        params: { slug },
        body: { deviceId: uniqueSlug('dev-draft') },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );

    await api.call(eventsApi.update, {
      params: { orgId: aliceOrg, eventId: event.id },
      body: { status: 'ended' },
    });

    await expectApiError(
      publicClient.call(publicApi.join, {
        params: { slug },
        body: { deviceId: uniqueSlug('dev-ended') },
      }),
      409,
      ErrorCode.EVENT_NOT_LIVE,
    );
  });

  test('cross-tenant & cross-event isolation: guest code from another org or another event never matches', async () => {
    const aliceApi = t.client(alice);
    const bobApi = t.client(bob);

    const aliceSlug1 = uniqueSlug('alice1');
    const aliceEvent1 = await aliceApi.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Alice Event 1', slug: aliceSlug1, status: 'live', identity: 'guest_list' },
    });

    const aliceSlug2 = uniqueSlug('alice2');
    const aliceEvent2 = await aliceApi.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Alice Event 2', slug: aliceSlug2, status: 'live', identity: 'guest_list' },
    });

    const bobSlug = uniqueSlug('bob');
    const bobEvent = await bobApi.call(eventsApi.create, {
      params: { orgId: bobOrg },
      body: { name: 'Bob Event', slug: bobSlug, status: 'live', identity: 'guest_list' },
    });

    await aliceApi.call(guestsApi.import, {
      params: { orgId: aliceOrg, eventId: aliceEvent2.id },
      body: {
        fileName: 'alice2.csv',
        content: 'externalCode,displayName,team\nALICE2-CODE,Alice Guest 2,Team A',
        encoding: 'text',
      },
    });

    await bobApi.call(guestsApi.import, {
      params: { orgId: bobOrg, eventId: bobEvent.id },
      body: {
        fileName: 'bob.csv',
        content: 'externalCode,displayName,team\nBOB-SECRET,Bob Guest,Team B',
        encoding: 'text',
      },
    });

    const publicClient = t.client();

    // Bob's guest code never matches Alice's event
    await expectApiError(
      publicClient.call(publicApi.join, {
        params: { slug: aliceSlug1 },
        body: { deviceId: uniqueSlug('dev-iso1'), code: 'BOB-SECRET' },
      }),
      404,
      ErrorCode.GUEST_CODE_NOT_FOUND,
    );

    // Alice's Event 2 guest code never matches Alice's Event 1
    await expectApiError(
      publicClient.call(publicApi.join, {
        params: { slug: aliceSlug1 },
        body: { deviceId: uniqueSlug('dev-iso2'), code: 'ALICE2-CODE' },
      }),
      404,
      ErrorCode.GUEST_CODE_NOT_FOUND,
    );

    // Bob cannot update Alice's event registration form (403 on aliceOrg, 404 on bobOrg)
    await expectApiError(
      bobApi.call(eventsApi.update, {
        params: { orgId: aliceOrg, eventId: aliceEvent1.id },
        body: { identity: 'anonymous' },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      bobApi.call(eventsApi.update, {
        params: { orgId: bobOrg, eventId: aliceEvent1.id },
        body: { identity: 'anonymous' },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
  });

  test(
    'venue NAT rate limit: 400 joins from one IP with distinct deviceIds all succeed (exceeding default 300/min), while one deviceId hammering join gets 429 RATE_LIMITED',
    async () => {
      const api = t.client(alice);
      const slug = uniqueSlug('nat');
      await api.call(eventsApi.create, {
        params: { orgId: aliceOrg },
        body: {
          name: 'Venue NAT Gala',
          slug,
          status: 'live',
          identity: 'anonymous',
          playerLimit: 1000,
        },
      });

      const publicClient = t.client();
      const runPrefix = uniqueSlug('nat-dev');

      // 400 distinct deviceIds from the same IP (in batches of 25) all succeed despite global 300/min default
      const totalPlayers = 400;
      const batchSize = 25;
      for (let offset = 0; offset < totalPlayers; offset += batchSize) {
        const batch = Array.from({ length: batchSize }, (_, idx) => {
          const n = offset + idx + 1;
          return publicClient.call(publicApi.join, {
            params: { slug },
            body: {
              deviceId: `${runPrefix}-${n}`,
              displayName: `Player ${n}`,
            },
          });
        });
        const results = await Promise.all(batch);
        expect(results).toHaveLength(batchSize);
      }

      // A single deviceId hammering join > 20 times in a minute gets 429 RATE_LIMITED
      const hammerDeviceId = `${runPrefix}-hammer`;
      for (let i = 0; i < 20; i++) {
        const res = await publicClient.call(publicApi.join, {
          params: { slug },
          body: { deviceId: hammerDeviceId, displayName: 'Hammer' },
        });
        expect(res.player.displayName).toBe('Hammer');
      }

      await expectApiError(
        publicClient.call(publicApi.join, {
          params: { slug },
          body: { deviceId: hammerDeviceId, displayName: 'Hammer' },
        }),
        429,
        ErrorCode.RATE_LIMITED,
      );
    },
    { timeout: 30_000 },
  );
});
