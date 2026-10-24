import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import { createTestMailer, setTestMailTransport } from '@playora/auth';
import { assetsApi, ErrorCode, eventsApi, gamesApi, templatesApi } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, eq } from 'drizzle-orm';
import { DB } from '../src/infra/tokens';
import {
  createOrg,
  createTestApp,
  signUp,
  TEST_ORIGIN,
  type TestApp,
  uniqueSlug,
} from './create-test-app';

const mailer = createTestMailer();
let t: TestApp;
let alice: string;
let bob: string;
let viewerCookie: string;
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

async function expectApiError(
  promise: Promise<unknown>,
  status: number,
  code: ErrorCode,
): Promise<ApiError> {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status, code });
  return err as ApiError;
}

beforeAll(async () => {
  setTestMailTransport(mailer);
  t = await createTestApp();
  alice = await signUp(t.baseUrl, 'Alice');
  bob = await signUp(t.baseUrl, 'Bob');
  aliceOrg = await createOrg(t.baseUrl, alice);
  bobOrg = await createOrg(t.baseUrl, bob);

  // Invite a viewer into Alice's org to verify 403 on write/publish operations.
  const vEmail = uniqueEmail('viewer');
  const inviteRes = await authFetch(t.baseUrl, '/organization/invite-member', {
    cookie: alice,
    body: { organizationId: aliceOrg, email: vEmail, role: 'viewer' },
  });
  const inv = (await inviteRes.json()) as { id: string };

  const signUpRes = await authFetch(t.baseUrl, '/sign-up/email', {
    body: { email: vEmail, password: 'test-password-123', name: 'Viewer' },
  });
  viewerCookie = signUpRes.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');

  await authFetch(t.baseUrl, '/organization/accept-invitation', {
    cookie: viewerCookie,
    body: { invitationId: inv.id },
  });
});

afterAll(async () => {
  setTestMailTransport(null);
  await t?.close();
});

describe('templates & games API (BLD-01, BLD-02, BLD-08)', () => {
  test('GET /templates returns registered templates with skins, assetSlots, formDescriptor, and defaultConfig', async () => {
    const api = t.client(alice);
    const { items } = await api.call(templatesApi.list);

    expect(items.length).toBeGreaterThanOrEqual(1);
    const spinWheel = items.find((item) => item.id === 'spin-wheel');
    expect(spinWheel).toBeDefined();
    expect(spinWheel).toMatchObject({
      id: 'spin-wheel',
      version: '1.0.0',
      kind: 'instant',
      name: { vi: 'Vòng quay may mắn', en: 'Lucky Spin Wheel' },
      tags: ['instant', 'tet', 'chung'],
      skins: [
        { key: 'chung', name: { vi: 'Mặc định', en: 'Default' }, tags: ['chung'] },
        { key: 'tet', name: { vi: 'Tết Rực Rỡ', en: 'Lunar New Year' }, tags: ['tet'] },
      ],
      defaultConfig: {
        spins: 5,
        durationMs: 3000,
        copy: {
          title: { vi: 'Vòng quay may mắn', en: 'Lucky Spin Wheel' },
          cta: { vi: 'Quay ngay', en: 'Spin now' },
        },
      },
    });
    expect(spinWheel?.assetSlots.map((s) => s.key)).toEqual(['background', 'centerLogo']);
    expect(spinWheel?.formDescriptor.groups).toEqual(['gameplay', 'appearance', 'content']);
    expect(spinWheel?.formDescriptor.hotEditablePaths).toEqual(['copy.title', 'copy.cta']);
  });

  test('create, list ordered by sortOrder, get, patch valid/invalid config with field paths, reorder, publish (versions increment, configHash stable, immutable), and soft-delete', async () => {
    const api = t.client(alice);
    const event = await api.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'YEP Games 2026', slug: uniqueSlug('games') },
    });

    // 1. Create two games; draftConfig is initialized from template defaultConfig
    const g1 = await api.call(gamesApi.create, {
      params: { orgId: aliceOrg, eventId: event.id },
      body: { templateId: 'spin-wheel', name: 'Vòng 1: Khởi động', skinKey: 'chung' },
    });
    expect(g1).toMatchObject({
      organizationId: aliceOrg,
      eventId: event.id,
      templateId: 'spin-wheel',
      templateKey: 'spin-wheel',
      templateVersion: '1.0.0',
      skinKey: 'chung',
      name: 'Vòng 1: Khởi động',
      status: 'draft',
      currentVersionId: null,
      currentVersion: null,
      sortOrder: 0,
      draftConfig: {
        spins: 5,
        durationMs: 3000,
      },
    });

    const g2 = await api.call(gamesApi.create, {
      params: { orgId: aliceOrg, eventId: event.id },
      body: { templateId: 'spin-wheel', name: 'Vòng 2: Chung kết', skinKey: 'tet' },
    });
    expect(g2.sortOrder).toBe(1);

    // 2. List games ordered by sortOrder
    const listedBefore = await api.call(gamesApi.list, {
      params: { orgId: aliceOrg, eventId: event.id },
    });
    expect(listedBefore.items.map((g) => g.id)).toEqual([g1.id, g2.id]);

    // 3. Get single game
    const fetched = await api.call(gamesApi.get, {
      params: { orgId: aliceOrg, gameId: g1.id },
    });
    expect(fetched.id).toBe(g1.id);

    // 4. Patch with valid config
    const validDraft = {
      ...g1.draftConfig,
      spins: 7,
      durationMs: 4500,
      copy: {
        title: { vi: 'Vòng quay YEP', en: 'YEP Spin' },
        cta: { vi: 'Quay ngay!', en: 'Spin now!' },
      },
    };
    const updated = await api.call(gamesApi.update, {
      params: { orgId: aliceOrg, gameId: g1.id },
      body: {
        name: 'Vòng 1: Quay trúng thưởng',
        skinKey: 'tet',
        draftConfig: validDraft,
      },
    });
    expect(updated.name).toBe('Vòng 1: Quay trúng thưởng');
    expect(updated.skinKey).toBe('tet');
    expect(updated.draftConfig.spins).toBe(7);
    expect(updated.draftConfig.durationMs).toBe(4500);

    // 5. Patch with invalid config returns 400 VALIDATION_FAILED with field paths
    const invalidErr = await expectApiError(
      api.call(gamesApi.update, {
        params: { orgId: aliceOrg, gameId: g1.id },
        body: {
          draftConfig: {
            ...validDraft,
            spins: 99,
            segments: [],
            copy: {
              title: { vi: '' },
              cta: { vi: 'OK' },
            },
          },
        },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
    const details = invalidErr.details as {
      fieldErrors?: Record<string, string[]>;
      body?: { fieldErrors?: Record<string, string[]> };
    };
    const fieldErrors = details?.fieldErrors ?? details?.body?.fieldErrors ?? {};
    expect(fieldErrors.spins).toBeDefined();
    expect(fieldErrors.segments).toBeDefined();
    expect(fieldErrors['copy.title.vi']).toBeDefined();

    // 6. Reorder games
    const reordered = await api.call(gamesApi.reorder, {
      params: { orgId: aliceOrg, eventId: event.id },
      body: { gameIds: [g2.id, g1.id] },
    });
    expect(reordered.items.map((g) => ({ id: g.id, sortOrder: g.sortOrder }))).toEqual([
      { id: g2.id, sortOrder: 0 },
      { id: g1.id, sortOrder: 1 },
    ]);

    // 7. Publish v1
    const pub1 = await api.call(gamesApi.publish, {
      params: { orgId: aliceOrg, gameId: g1.id },
    });
    expect(pub1.version).toBe(1);
    expect(pub1.configHash).toMatch(/^[0-9a-f]{64}$/);
    expect(pub1.config.spins).toBe(7);
    expect(pub1.game.status).toBe('published');
    expect(pub1.game.currentVersionId).toBe(pub1.id);
    expect(pub1.game.currentVersion).toBe(1);

    // 8. Re-publishing the exact same config produces v2 with the exact same canonical configHash
    const pub2 = await api.call(gamesApi.publish, {
      params: { orgId: aliceOrg, gameId: g1.id },
    });
    expect(pub2.version).toBe(2);
    expect(pub2.configHash).toBe(pub1.configHash);
    expect(pub2.game.currentVersionId).toBe(pub2.id);
    expect(pub2.game.currentVersion).toBe(2);

    // 9. Modifying draftConfig after publish and publishing v3 leaves v1 and v2 immutable
    const modifiedDraft = {
      ...validDraft,
      spins: 4,
    };
    await api.call(gamesApi.update, {
      params: { orgId: aliceOrg, gameId: g1.id },
      body: { draftConfig: modifiedDraft },
    });

    const pub3 = await api.call(gamesApi.publish, {
      params: { orgId: aliceOrg, gameId: g1.id },
    });
    expect(pub3.version).toBe(3);
    expect(pub3.configHash).not.toBe(pub1.configHash);
    expect(pub3.config.spins).toBe(4);

    const versions = await api.call(gamesApi.listVersions, {
      params: { orgId: aliceOrg, gameId: g1.id },
    });
    expect(versions.items).toHaveLength(3);
    expect(versions.items[0]?.id).toBe(pub1.id);
    expect(versions.items[0]?.version).toBe(1);
    expect(versions.items[0]?.config.spins).toBe(7);
    expect(versions.items[0]?.configHash).toBe(pub1.configHash);
    expect(versions.items[2]?.version).toBe(3);
    expect(versions.items[2]?.config.spins).toBe(4);

    // 10. Audit log was recorded on publish
    const db = t.app.get<Database>(DB);
    const audits = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.organizationId, aliceOrg),
          eq(schema.auditLogs.action, 'game.publish'),
          eq(schema.auditLogs.targetId, g1.id),
        ),
      );
    expect(audits).toHaveLength(3);

    // 11. Soft delete removes game from list and get returns 404
    await api.call(gamesApi.remove, {
      params: { orgId: aliceOrg, gameId: g2.id },
    });
    await expectApiError(
      api.call(gamesApi.get, { params: { orgId: aliceOrg, gameId: g2.id } }),
      404,
      ErrorCode.NOT_FOUND,
    );
    const listedAfterDelete = await api.call(gamesApi.list, {
      params: { orgId: aliceOrg, eventId: event.id },
    });
    expect(listedAfterDelete.items.map((g) => g.id)).toEqual([g1.id]);
  });

  test('asset reference validation: accepts same-org image asset, rejects another org asset or wrong asset kind', async () => {
    const asAlice = t.client(alice);
    const asBob = t.client(bob);

    const event = await asAlice.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Asset Check Event', slug: uniqueSlug('asset-ev') },
    });
    const game = await asAlice.call(gamesApi.create, {
      params: { orgId: aliceOrg, eventId: event.id },
      body: { templateId: 'spin-wheel', name: 'Asset Game' },
    });

    const aliceImage = await asAlice.call(assetsApi.createUpload, {
      params: { orgId: aliceOrg },
      body: { kind: 'image', mime: 'image/png', bytes: 64, filename: 'logo.png' },
    });
    const aliceAudio = await asAlice.call(assetsApi.createUpload, {
      params: { orgId: aliceOrg },
      body: { kind: 'audio', mime: 'audio/mpeg', bytes: 64, filename: 'bgm.mp3' },
    });
    const bobImage = await asBob.call(assetsApi.createUpload, {
      params: { orgId: bobOrg },
      body: { kind: 'image', mime: 'image/png', bytes: 64, filename: 'bob-logo.png' },
    });

    // Same-org image asset ID in centerLogo is accepted; API returns assets Record<assetId, url>
    const updatedOk = await asAlice.call(gamesApi.update, {
      params: { orgId: aliceOrg, gameId: game.id },
      body: {
        draftConfig: {
          ...game.draftConfig,
          centerLogo: aliceImage.assetId,
        },
      },
    });
    expect(updatedOk.draftConfig.centerLogo).toBe(aliceImage.assetId);
    expect(typeof updatedOk.assets[aliceImage.assetId]).toBe('string');
    expect(updatedOk.assets[aliceImage.assetId]).toContain(aliceImage.assetId);

    // Publishing stores the asset UUID in version.config and returns the resolved assets map
    const publishedWithAsset = await asAlice.call(gamesApi.publish, {
      params: { orgId: aliceOrg, gameId: game.id },
    });
    expect(publishedWithAsset.config.centerLogo).toBe(aliceImage.assetId);
    expect(publishedWithAsset.assets[aliceImage.assetId]).toContain(aliceImage.assetId);
    expect(publishedWithAsset.game.assets[aliceImage.assetId]).toContain(aliceImage.assetId);

    const listedVersions = await asAlice.call(gamesApi.listVersions, {
      params: { orgId: aliceOrg, gameId: game.id },
    });
    expect(listedVersions.items[0]?.config.centerLogo).toBe(aliceImage.assetId);
    expect(listedVersions.items[0]?.assets[aliceImage.assetId]).toContain(aliceImage.assetId);

    // Passing a URL instead of an asset UUID is rejected with 400 VALIDATION_FAILED
    const urlErr = await expectApiError(
      asAlice.call(gamesApi.update, {
        params: { orgId: aliceOrg, gameId: game.id },
        body: {
          draftConfig: {
            ...game.draftConfig,
            centerLogo: updatedOk.assets[aliceImage.assetId],
          },
        },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
    const urlFieldErrors =
      (urlErr.details as { fieldErrors?: Record<string, string[]> })?.fieldErrors ?? {};
    expect(urlFieldErrors.centerLogo).toBeDefined();

    // Another org's asset ID in centerLogo is rejected with 400 VALIDATION_FAILED on centerLogo
    const crossOrgErr = await expectApiError(
      asAlice.call(gamesApi.update, {
        params: { orgId: aliceOrg, gameId: game.id },
        body: {
          draftConfig: {
            ...game.draftConfig,
            centerLogo: bobImage.assetId,
          },
        },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
    const crossFieldErrors =
      (crossOrgErr.details as { fieldErrors?: Record<string, string[]> })?.fieldErrors ?? {};
    expect(crossFieldErrors.centerLogo).toBeDefined();

    // Audio asset in image slot centerLogo is rejected with 400 VALIDATION_FAILED
    const wrongKindErr = await expectApiError(
      asAlice.call(gamesApi.update, {
        params: { orgId: aliceOrg, gameId: game.id },
        body: {
          draftConfig: {
            ...game.draftConfig,
            centerLogo: aliceAudio.assetId,
          },
        },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
    const kindFieldErrors =
      (wrongKindErr.details as { fieldErrors?: Record<string, string[]> })?.fieldErrors ?? {};
    expect(kindFieldErrors.centerLogo).toBeDefined();
  });

  test('concurrent publishes serialize via SELECT ... FOR UPDATE and produce versions 1..5 without 500', async () => {
    const asAlice = t.client(alice);
    const event = await asAlice.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Concurrent Publish Event', slug: uniqueSlug('conc-pub') },
    });
    const game = await asAlice.call(gamesApi.create, {
      params: { orgId: aliceOrg, eventId: event.id },
      body: { templateId: 'spin-wheel', name: 'Concurrent Game' },
    });

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        asAlice.call(gamesApi.publish, {
          params: { orgId: aliceOrg, gameId: game.id },
        }),
      ),
    );

    const versions = results.map((r) => r.version).sort((a, b) => a - b);
    expect(versions).toEqual([1, 2, 3, 4, 5]);

    const listed = await asAlice.call(gamesApi.listVersions, {
      params: { orgId: aliceOrg, gameId: game.id },
    });
    expect(listed.items.map((v) => v.version)).toEqual([1, 2, 3, 4, 5]);
  });

  test('400, 401, 403 (viewer cannot create/patch/reorder/delete/publish), and cross-tenant 404', async () => {
    const asAlice = t.client(alice);
    const asBob = t.client(bob);
    const asViewer = t.client(viewerCookie);
    const anon = t.client();

    const aliceEvent = await asAlice.call(eventsApi.create, {
      params: { orgId: aliceOrg },
      body: { name: 'Alice Isolation Event', slug: uniqueSlug('iso') },
    });
    const aliceGame = await asAlice.call(gamesApi.create, {
      params: { orgId: aliceOrg, eventId: aliceEvent.id },
      body: { templateId: 'spin-wheel', name: 'Alice Game' },
    });

    // 401 for anonymous requests
    await expectApiError(anon.call(templatesApi.list), 401, ErrorCode.UNAUTHORIZED);
    await expectApiError(
      anon.call(gamesApi.list, { params: { orgId: aliceOrg, eventId: aliceEvent.id } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
    await expectApiError(
      anon.call(gamesApi.get, { params: { orgId: aliceOrg, gameId: aliceGame.id } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );

    // 400 for unknown templateId or empty name
    await expectApiError(
      asAlice.call(gamesApi.create, {
        params: { orgId: aliceOrg, eventId: aliceEvent.id },
        body: { templateId: 'non-existent-template', name: 'Test' },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
    await expectApiError(
      asAlice.call(gamesApi.create, {
        params: { orgId: aliceOrg, eventId: aliceEvent.id },
        body: { templateId: 'spin-wheel', name: '' },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    // Viewer can read templates and games, but gets 403 FORBIDDEN on create, patch, reorder, publish, delete
    const viewerList = await asViewer.call(gamesApi.list, {
      params: { orgId: aliceOrg, eventId: aliceEvent.id },
    });
    expect(viewerList.items.map((g) => g.id)).toContain(aliceGame.id);

    await expectApiError(
      asViewer.call(gamesApi.create, {
        params: { orgId: aliceOrg, eventId: aliceEvent.id },
        body: { templateId: 'spin-wheel', name: 'Viewer Game' },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asViewer.call(gamesApi.update, {
        params: { orgId: aliceOrg, gameId: aliceGame.id },
        body: { name: 'Hacked by Viewer' },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asViewer.call(gamesApi.reorder, {
        params: { orgId: aliceOrg, eventId: aliceEvent.id },
        body: { gameIds: [aliceGame.id] },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asViewer.call(gamesApi.publish, {
        params: { orgId: aliceOrg, gameId: aliceGame.id },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asViewer.call(gamesApi.remove, {
        params: { orgId: aliceOrg, gameId: aliceGame.id },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );

    // Cross-tenant: Bob gets 403 on aliceOrg routes, and 404 when querying bobOrg with Alice's eventId/gameId
    await expectApiError(
      asBob.call(gamesApi.get, { params: { orgId: aliceOrg, gameId: aliceGame.id } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asBob.call(gamesApi.list, { params: { orgId: bobOrg, eventId: aliceEvent.id } }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(gamesApi.create, {
        params: { orgId: bobOrg, eventId: aliceEvent.id },
        body: { templateId: 'spin-wheel', name: 'Cross Tenant' },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(gamesApi.get, { params: { orgId: bobOrg, gameId: aliceGame.id } }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(gamesApi.update, {
        params: { orgId: bobOrg, gameId: aliceGame.id },
        body: { name: 'Cross Tenant Patch' },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(gamesApi.publish, {
        params: { orgId: bobOrg, gameId: aliceGame.id },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(gamesApi.remove, {
        params: { orgId: bobOrg, gameId: aliceGame.id },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
  });
});
