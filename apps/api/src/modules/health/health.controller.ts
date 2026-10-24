import { Controller, HttpStatus, Inject, Res } from '@nestjs/common';
import { type HealthReadyResponse, publicApi, type RouteResponse } from '@playora/contracts';
import { type Database, latestMigration, type MigrationInfo } from '@playora/db';
import { sql } from 'drizzle-orm';
import type { Response } from 'express';
import type { Redis } from 'ioredis';
import { Route } from '../../common/contract/route.decorator';
import { DB, REDIS } from '../../infra/tokens';

export async function checkReadiness(
  db: Database,
  redis: Redis,
  latest: MigrationInfo | undefined = latestMigration(),
): Promise<{ isReady: boolean; response: HealthReadyResponse }> {
  let dbStatus: 'ok' | 'down' = 'ok';
  try {
    await db.execute(sql`select 1`);
  } catch {
    dbStatus = 'down';
  }

  let redisStatus: 'ok' | 'down' = 'ok';
  try {
    const ping = await redis.ping();
    if (ping !== 'PONG') {
      redisStatus = 'down';
    }
  } catch {
    redisStatus = 'down';
  }

  let migrationStatus: 'ok' | 'missing' | 'down' = 'ok';
  if (latest) {
    if (dbStatus === 'down') {
      migrationStatus = 'down';
    } else {
      try {
        const rows = await db.execute(
          sql`select 1 from drizzle.__drizzle_migrations where created_at = ${String(latest.when)} limit 1`,
        );
        migrationStatus = rows.length > 0 ? 'ok' : 'missing';
      } catch {
        migrationStatus = 'down';
      }
    }
  }

  const isReady = dbStatus === 'ok' && redisStatus === 'ok' && migrationStatus === 'ok';
  return {
    isReady,
    response: {
      status: isReady ? 'ok' : 'down',
      db: dbStatus,
      redis: redisStatus,
      migrations: {
        status: migrationStatus,
        ...(latest?.tag !== undefined ? { latestJournal: latest.tag } : {}),
      },
    },
  };
}

@Controller()
export class HealthController {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Route(publicApi.health)
  async check(): Promise<RouteResponse<typeof publicApi.health>> {
    return {
      status: 'ok',
      uptimeSec: Math.round(process.uptime()),
    };
  }

  @Route(publicApi.ready)
  async ready(
    @Res({ passthrough: true }) res: Response,
  ): Promise<RouteResponse<typeof publicApi.ready>> {
    const { isReady, response } = await checkReadiness(this.db, this.redis);
    if (!isReady) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return response;
  }
}
