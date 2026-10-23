import { createDb, type Database, schema } from '@playora/db';
import { parseEnv, workerEnvSchema } from '@playora/env';
import type { JobPayload } from '@playora/jobs';
import { S3Client } from 'bun';
import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';

const { assets } = schema;

export const VARIANT_WIDTHS = [320, 1280, 2560] as const;

export interface AssetProcessorDeps {
  db: Database;
  s3: S3Client;
}

let defaultDeps: AssetProcessorDeps | undefined;

function getDefaultDeps(): AssetProcessorDeps {
  if (!defaultDeps) {
    const env = parseEnv(workerEnvSchema);
    const { db } = createDb(env.DATABASE_URL, { max: 4 });
    const s3 = new S3Client({
      endpoint: env.S3_ENDPOINT,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    });
    defaultDeps = { db, s3 };
  }
  return defaultDeps;
}

export async function processAsset(
  payload: JobPayload<'asset.process'>,
  deps: AssetProcessorDeps = getDefaultDeps(),
) {
  const { db, s3 } = deps;
  const scope = and(
    eq(assets.organizationId, payload.organizationId),
    eq(assets.id, payload.assetId),
  );

  const [asset] = await db.select().from(assets).where(scope);
  if (!asset) return { skipped: true };

  try {
    const bytes = await s3.file(asset.storageKey).bytes();

    if (asset.kind === 'image') {
      const meta = await sharp(bytes).metadata();
      const width = meta.width ?? null;
      const height = meta.height ?? null;
      const variants: Record<
        string,
        {
          key: string;
          width: number;
          height: number;
          bytes: number;
          crop?: { x: number; y: number; w: number; h: number };
        }
      > = {
        ...((asset.variants ?? {}) as Record<string, never>),
      };

      for (const targetWidth of VARIANT_WIDTHS) {
        const { data, info } = await sharp(bytes)
          .rotate()
          .resize({ width: targetWidth, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer({ resolveWithObject: true });

        const variantKey = `orgs/${payload.organizationId}/assets/${payload.assetId}/w${targetWidth}.webp`;
        await s3.write(variantKey, data, { type: 'image/webp' });
        variants[`w${targetWidth}`] = {
          key: variantKey,
          width: info.width,
          height: info.height,
          bytes: info.size,
        };
      }

      if (payload.crop && width && height) {
        const left = Math.min(payload.crop.x, Math.max(0, width - 1));
        const top = Math.min(payload.crop.y, Math.max(0, height - 1));
        const cropW = Math.max(1, Math.min(payload.crop.w, width - left));
        const cropH = Math.max(1, Math.min(payload.crop.h, height - top));

        const { data, info } = await sharp(bytes)
          .rotate()
          .extract({ left, top, width: cropW, height: cropH })
          .webp({ quality: 82 })
          .toBuffer({ resolveWithObject: true });

        const cropKey = `orgs/${payload.organizationId}/assets/${payload.assetId}/cropped.webp`;
        await s3.write(cropKey, data, { type: 'image/webp' });
        variants.cropped = {
          key: cropKey,
          width: info.width,
          height: info.height,
          bytes: info.size,
          crop: { x: left, y: top, w: cropW, h: cropH },
        };
      }

      const [updated] = await db
        .update(assets)
        .set({
          status: 'ready',
          bytes: bytes.byteLength,
          width,
          height,
          variants,
        })
        .where(scope)
        .returning();
      return updated;
    }

    const [updated] = await db
      .update(assets)
      .set({
        status: 'ready',
        bytes: bytes.byteLength,
      })
      .where(scope)
      .returning();
    return updated;
  } catch (err) {
    await db.update(assets).set({ status: 'failed' }).where(scope);
    throw err;
  }
}
