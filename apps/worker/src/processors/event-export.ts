import { createDb, type Database, schema } from '@playora/db';
import { parseEnv, workerEnvSchema } from '@playora/env';
import type { JobPayload } from '@playora/jobs';
import { S3Client } from 'bun';
import { and, desc, eq, ne } from 'drizzle-orm';

const { awards, players, prizes } = schema;

export interface EventExportDeps {
  db: Database;
  s3: S3Client;
}

let defaultDeps: EventExportDeps | undefined;

function getDefaultDeps(): EventExportDeps {
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

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function processEventExport(
  payload: JobPayload<'event.export'>,
  deps: EventExportDeps = getDefaultDeps(),
) {
  const { db, s3 } = deps;
  const { organizationId, eventId, exportId, kind } = payload;

  let lines: string[] = [];
  if (kind === 'players' || kind === 'leads') {
    const rows = await db
      .select({
        id: players.id,
        displayName: players.displayName,
        createdAt: players.createdAt,
      })
      .from(players)
      .where(
        and(
          eq(players.organizationId, organizationId),
          eq(players.eventId, eventId),
          eq(players.env, 'live'),
        ),
      )
      .orderBy(desc(players.id));
    lines = [
      'id,name,createdAt',
      ...rows.map((r) =>
        [r.id, r.displayName ?? '', r.createdAt.toISOString()].map(escapeCsvCell).join(','),
      ),
    ];
  } else {
    const rows = await db
      .select({
        code: awards.redeemCode,
        status: awards.status,
        createdAt: awards.createdAt,
        redeemedAt: awards.redeemedAt,
        expiresAt: awards.expiresAt,
        playerName: players.displayName,
        prizeName: prizes.name,
        valueVnd: prizes.valueVnd,
      })
      .from(awards)
      .innerJoin(
        prizes,
        and(eq(prizes.organizationId, organizationId), eq(prizes.id, awards.prizeId)),
      )
      .leftJoin(
        players,
        and(eq(players.organizationId, organizationId), eq(players.id, awards.playerId)),
      )
      .where(
        and(
          eq(awards.organizationId, organizationId),
          eq(awards.eventId, eventId),
          eq(awards.env, 'live'),
          kind === 'winners' ? ne(awards.status, 'void') : undefined,
        ),
      )
      .orderBy(desc(awards.id));
    lines = [
      'code,prizeName,valueVnd,playerName,status,issuedAt,redeemedAt,expiresAt',
      ...rows.map((r) =>
        [
          r.code,
          r.prizeName,
          r.valueVnd ?? 0,
          r.playerName ?? '',
          r.status,
          r.createdAt.toISOString(),
          r.redeemedAt?.toISOString() ?? '',
          r.expiresAt?.toISOString() ?? '',
        ]
          .map(escapeCsvCell)
          .join(','),
      ),
    ];
  }

  const csv = `\uFEFF${lines.join('\r\n')}\r\n`;
  const key = `orgs/${organizationId}/exports/${exportId}.csv`;

  await s3.write(key, Buffer.from(csv, 'utf8'), { type: 'text/csv; charset=utf-8' });

  return { key, rowCount: lines.length - 1 };
}
