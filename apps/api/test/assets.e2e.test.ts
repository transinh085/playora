import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import { assetsApi, ErrorCode, MAX_ASSET_BYTES } from '@playora/contracts';
import type { Database } from '@playora/db';
import type { S3Client } from 'bun';
import sharp from 'sharp';
import { processAsset } from '../../worker/src/processors/asset-process';
import { DB, S3 } from '../src/infra/tokens';
import { createOrg, createTestApp, signUp, type TestApp } from './create-test-app';

let t: TestApp;
let alice: string;
let bob: string;
let aliceOrg: string;
let bobOrg: string;
let fallbackS3Server: ReturnType<typeof Bun.serve> | undefined;

beforeAll(async () => {
  const endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
  const minioAlive = await fetch(`${endpoint}/minio/health/live`)
    .then((r) => r.ok)
    .catch(() => false);
  if (!minioAlive) {
    const store = new Map<string, { data: Uint8Array<ArrayBuffer>; type: string }>();
    fallbackS3Server = Bun.serve({
      port: 0,
      async fetch(req) {
        const path = new URL(req.url).pathname;
        if (req.method === 'PUT') {
          const data = new Uint8Array(await req.arrayBuffer());
          store.set(path, {
            data,
            type: req.headers.get('content-type') ?? 'application/octet-stream',
          });
          return new Response('', { status: 200, headers: { etag: '"mock-etag"' } });
        }
        if (req.method === 'GET' || req.method === 'HEAD') {
          const item = store.get(path);
          if (!item) return new Response('NotFound', { status: 404 });
          return new Response(req.method === 'HEAD' ? null : item.data, {
            status: 200,
            headers: {
              'content-type': item.type,
              'content-length': String(item.data.byteLength),
            },
          });
        }
        if (req.method === 'DELETE') {
          store.delete(path);
          return new Response(null, { status: 204 });
        }
        return new Response(null, { status: 405 });
      },
    });
    process.env.S3_ENDPOINT = fallbackS3Server.url.origin;
  }

  t = await createTestApp();
  alice = await signUp(t.baseUrl, 'Alice');
  bob = await signUp(t.baseUrl, 'Bob');
  aliceOrg = await createOrg(t.baseUrl, alice);
  bobOrg = await createOrg(t.baseUrl, bob);
});

afterAll(async () => {
  await t?.close();
  fallbackS3Server?.stop();
});

async function expectApiError(promise: Promise<unknown>, status: number, code: ErrorCode) {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status, code });
}

describe('assets API + worker processing', () => {
  test('upload flow with MinIO, worker image variants + crop, list by kind, get and delete', async () => {
    const api = t.client(alice);
    const params = { orgId: aliceOrg };

    const pngBuffer = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 4,
        background: { r: 124, g: 58, b: 237, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const ticket = await api.call(assetsApi.createUpload, {
      params,
      body: {
        kind: 'image',
        mime: 'image/png',
        bytes: pngBuffer.byteLength,
        filename: 'banner.png',
      },
    });
    expect(ticket.assetId).toBeString();
    expect(ticket.uploadUrl).toContain(ticket.assetId);
    expect(ticket.headers['content-type']).toBe('image/png');

    // Presigned PUT directly to MinIO
    const putRes = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      headers: ticket.headers,
      body: new Uint8Array(pngBuffer),
    });
    expect(putRes.ok).toBe(true);

    const crop = { x: 100, y: 50, w: 400, h: 400 };
    const completed = await api.call(assetsApi.completeUpload, {
      params: { ...params, assetId: ticket.assetId },
      body: { crop },
    });
    expect(completed.status).toBe('pending');

    // Run worker processor directly against test DB and S3
    const db = t.app.get<Database>(DB);
    const s3 = t.app.get<S3Client>(S3);
    await processAsset({ organizationId: aliceOrg, assetId: ticket.assetId, crop }, { db, s3 });

    const ready = await api.call(assetsApi.get, {
      params: { ...params, assetId: ticket.assetId },
    });
    expect(ready).toMatchObject({
      id: ticket.assetId,
      organizationId: aliceOrg,
      kind: 'image',
      mime: 'image/png',
      width: 1600,
      height: 900,
      status: 'ready',
    });
    expect(ready.variants.w320).toMatchObject({ width: 320, height: 180 });
    expect(ready.variants.w1280).toMatchObject({ width: 1280, height: 720 });
    expect(ready.variants.w2560).toMatchObject({ width: 1600, height: 900 });
    expect(ready.variants.cropped).toMatchObject({ width: 400, height: 400, crop });

    // Verify presigned GET URLs work against MinIO
    const getVariantRes = await fetch(ready.variants.w320?.url ?? '');
    expect(getVariantRes.ok).toBe(true);
    const getCropRes = await fetch(ready.variants.cropped?.url ?? '');
    expect(getCropRes.ok).toBe(true);

    // Upload an audio asset to test kind filtering
    const audioTicket = await api.call(assetsApi.createUpload, {
      params,
      body: { kind: 'audio', mime: 'audio/mpeg', bytes: 8, filename: 'bgm.mp3' },
    });
    await fetch(audioTicket.uploadUrl, {
      method: 'PUT',
      headers: audioTicket.headers,
      body: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
    });
    await api.call(assetsApi.completeUpload, {
      params: { ...params, assetId: audioTicket.assetId },
      body: {},
    });
    await processAsset({ organizationId: aliceOrg, assetId: audioTicket.assetId }, { db, s3 });

    const imagesOnly = await api.call(assetsApi.list, {
      params,
      query: { kind: 'image', limit: 20 },
    });
    expect(imagesOnly.items.map((a) => a.id)).toContain(ticket.assetId);
    expect(imagesOnly.items.map((a) => a.id)).not.toContain(audioTicket.assetId);

    const audioOnly = await api.call(assetsApi.list, {
      params,
      query: { kind: 'audio', limit: 20 },
    });
    expect(audioOnly.items.map((a) => a.id)).toContain(audioTicket.assetId);
    expect(audioOnly.items.find((a) => a.id === audioTicket.assetId)?.status).toBe('ready');

    // Delete asset
    await api.call(assetsApi.remove, { params: { ...params, assetId: ticket.assetId } });
    await expectApiError(
      api.call(assetsApi.get, { params: { ...params, assetId: ticket.assetId } }),
      404,
      ErrorCode.NOT_FOUND,
    );
  });

  test('invalid upload body is rejected with 400 VALIDATION_FAILED', async () => {
    const api = t.client(alice);
    await expectApiError(
      api.call(assetsApi.createUpload, {
        params: { orgId: aliceOrg },
        body: { kind: 'image', mime: 'audio/mpeg', bytes: 1024 },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
    await expectApiError(
      api.call(assetsApi.createUpload, {
        params: { orgId: aliceOrg },
        body: { kind: 'image', mime: 'image/png', bytes: MAX_ASSET_BYTES + 1 },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
  });

  test('anonymous requests are rejected with 401 UNAUTHORIZED', async () => {
    await expectApiError(
      t.client().call(assetsApi.list, { params: { orgId: aliceOrg } }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
  });

  test('tenant isolation: another org gets 403 on aliceOrg and 404 on own org with alice assetId', async () => {
    const ticket = await t.client(alice).call(assetsApi.createUpload, {
      params: { orgId: aliceOrg },
      body: { kind: 'image', mime: 'image/png', bytes: 128 },
    });

    const asBob = t.client(bob);
    const aliceParams = { orgId: aliceOrg, assetId: ticket.assetId };

    await expectApiError(
      asBob.call(assetsApi.list, { params: { orgId: aliceOrg } }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asBob.call(assetsApi.createUpload, {
        params: { orgId: aliceOrg },
        body: { kind: 'image', mime: 'image/png', bytes: 128 },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asBob.call(assetsApi.get, { params: aliceParams }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asBob.call(assetsApi.completeUpload, { params: aliceParams, body: {} }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asBob.call(assetsApi.remove, { params: aliceParams }),
      403,
      ErrorCode.FORBIDDEN,
    );

    // Repository-level tenant scoping when Bob queries his own org with Alice's assetId
    const bobParams = { orgId: bobOrg, assetId: ticket.assetId };
    await expectApiError(
      asBob.call(assetsApi.get, { params: bobParams }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(assetsApi.completeUpload, { params: bobParams, body: {} }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(assetsApi.remove, { params: bobParams }),
      404,
      ErrorCode.NOT_FOUND,
    );
  });
});
