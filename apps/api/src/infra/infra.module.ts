import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createAuth } from '@playora/auth';
import { createDb } from '@playora/db';
import type { ApiEnv } from '@playora/env';
import { Redis } from 'ioredis';
import { AUTH, DB, ENV, REDIS } from './tokens';

const SQL = Symbol('SQL');

@Global()
@Module({})
export class InfraModule implements OnApplicationShutdown {
  constructor(
    @Inject(SQL) private readonly sql: ReturnType<typeof createDb>['sql'],
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  static forRoot(env: ApiEnv) {
    const { db, sql } = createDb(env.DATABASE_URL);
    const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
    const auth = createAuth({
      db,
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.API_PUBLIC_URL,
      trustedOrigins: env.STUDIO_ORIGINS.split(','),
    });
    return {
      module: InfraModule,
      providers: [
        { provide: ENV, useValue: env },
        { provide: DB, useValue: db },
        { provide: SQL, useValue: sql },
        { provide: REDIS, useValue: redis },
        { provide: AUTH, useValue: auth },
      ],
      exports: [ENV, DB, REDIS, AUTH],
    };
  }

  async onApplicationShutdown() {
    await Promise.allSettled([this.sql.end({ timeout: 5 }), this.redis.quit()]);
  }
}
