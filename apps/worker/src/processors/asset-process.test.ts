import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createDb, type Database, schema } from '@playora/db';
import { parseEnv, workerEnvSchema } from '@playora/env';
import { S3Client } from 'bun';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { processAsset } from './asset-process';

const { assets, organization, user } = schema;

let db: Database;
let closeDb: () => Promise<void>;
let s3: S3Client;
let s3Server: ReturnType<typeof Bun.serve>;
let orgId: string;
let userId: string;
const getRequests = new Set<string>();

beforeAll(async () => {
  const store = new Map<string, { data: Uint8Array<ArrayBuffer>; type: string }>();
  s3Server = Bun.serve({
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
      if (req.method === 'HEAD' || req.method === 'GET') {
        if (req.method === 'GET') {
          getRequests.add(path);
        }
        const item = store.get(path);
        if (!item) return new Response('NotFound', { status: 404 });
        return new Response(req.method === 'HEAD' ? null : item.data, {
          status: 200,
          headers: {
            'content-type': item.type,
            'content-length': String(item.data.byteLength),
            etag: '"mock-etag"',
            'last-modified': new Date().toUTCString(),
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

  const env = parseEnv(workerEnvSchema);
  const conn = createDb(env.DATABASE_URL, { max: 2 });
  db = conn.db;
  closeDb = () => conn.sql.end();

  s3 = new S3Client({
    endpoint: s3Server.url.origin,
    bucket: 'worker-test',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
  });

  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  userId = `usr_${suffix}`;
  orgId = `org_${suffix}`;

  await db.insert(user).values({
    id: userId,
    name: 'Worker Test User',
    email: `worker-${suffix}@test.playora.local`,
    emailVerified: true,
  });

  await db.insert(organization).values({
    id: orgId,
    name: 'Worker Test Org',
    slug: `worker-org-${suffix}`,
    createdAt: new Date(),
  });
});

afterAll(async () => {
  if (orgId) {
    await db.delete(organization).where(eq(organization.id, orgId));
  }
  if (userId) {
    await db.delete(user).where(eq(user.id, userId));
  }
  await closeDb?.();
  s3Server?.stop();
});

describe('processAsset worker processor', () => {
  test('generates w320/w1280/w2560 and cropped webp variants for valid image', async () => {
    const assetId = crypto.randomUUID();
    const storageKey = `orgs/${orgId}/assets/${assetId}/original.png`;
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

    await s3.write(storageKey, pngBuffer, { type: 'image/png' });
    await db.insert(assets).values({
      id: assetId,
      organizationId: orgId,
      kind: 'image',
      mime: 'image/png',
      bytes: pngBuffer.byteLength,
      storageKey,
      variants: {},
      status: 'pending',
      createdBy: userId,
    });

    const crop = { x: 100, y: 50, w: 400, h: 400 };
    const updated = await processAsset({ organizationId: orgId, assetId, crop }, { db, s3 });

    expect(updated).toMatchObject({
      id: assetId,
      organizationId: orgId,
      status: 'ready',
      width: 1600,
      height: 900,
      bytes: pngBuffer.byteLength,
    });

    const variants = (updated && 'variants' in updated ? updated.variants : {}) as Record<
      string,
      { key: string; width: number; height: number; bytes: number; crop?: unknown }
    >;
    expect(variants.w320).toMatchObject({ width: 320, height: 180 });
    expect(variants.w1280).toMatchObject({ width: 1280, height: 720 });
    expect(variants.w2560).toMatchObject({ width: 1600, height: 900 });
    expect(variants.cropped).toMatchObject({ width: 400, height: 400, crop });

    const w320Stat = await s3.file(variants.w320?.key ?? '').stat();
    expect(w320Stat.size).toBeGreaterThan(0);
  });

  test('marks image asset as failed when real sharp format mismatches declared mime', async () => {
    const assetId = crypto.randomUUID();
    const storageKey = `orgs/${orgId}/assets/${assetId}/original.png`;
    const jpegBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    await s3.write(storageKey, jpegBuffer, { type: 'image/png' });
    await db.insert(assets).values({
      id: assetId,
      organizationId: orgId,
      kind: 'image',
      mime: 'image/png',
      bytes: jpegBuffer.byteLength,
      storageKey,
      variants: {},
      status: 'pending',
      createdBy: userId,
    });

    await expect(processAsset({ organizationId: orgId, assetId }, { db, s3 })).rejects.toThrow(
      /format mismatch/i,
    );

    const [row] = await db.select().from(assets).where(eq(assets.id, assetId));
    expect(row?.status).toBe('failed');
  });

  test('processes audio/video via s3.file(key).stat() without downloading the object', async () => {
    const assetId = crypto.randomUUID();
    const storageKey = `orgs/${orgId}/assets/${assetId}/original.mp3`;
    const audioBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    await s3.write(storageKey, audioBytes, { type: 'audio/mpeg' });
    await db.insert(assets).values({
      id: assetId,
      organizationId: orgId,
      kind: 'audio',
      mime: 'audio/mpeg',
      bytes: audioBytes.byteLength,
      storageKey,
      variants: {},
      status: 'pending',
      createdBy: userId,
    });

    getRequests.clear();
    const updated = await processAsset({ organizationId: orgId, assetId }, { db, s3 });
    expect(updated).toMatchObject({
      id: assetId,
      status: 'ready',
      bytes: audioBytes.byteLength,
    });
    expect(getRequests.has(`/worker-test/${storageKey}`)).toBe(false);
  });
});
