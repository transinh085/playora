import { Controller, Get, Inject } from '@nestjs/common';
import type { Database } from '@playora/db';
import { sql } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import { DB, REDIS } from '../infra/tokens';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    const [db, redis] = await Promise.allSettled([
      this.db.execute(sql`select 1`),
      this.redis.ping(),
    ]);
    const ok = db.status === 'fulfilled' && redis.status === 'fulfilled';
    return {
      status: ok ? 'ok' : 'degraded',
      db: db.status === 'fulfilled' ? 'ok' : 'down',
      redis: redis.status === 'fulfilled' ? 'ok' : 'down',
      uptimeSec: Math.round(process.uptime()),
    };
  }
}
