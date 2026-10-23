import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createAuth } from '@playora/auth';
import { createDb } from '@playora/db';
import type { ApiEnv } from '@playora/env';
import { createProducer, type Producer } from '@playora/jobs';
import { Redis } from 'ioredis';
import { AUTH, DB, ENV, JOBS, REDIS } from './tokens';

const SQL = Symbol('SQL');

/** Process-wide clients: one Postgres pool, one Redis connection, one Better Auth instance. */
@Global()
@Module({})
export class InfraModule implements OnApplicationShutdown {
  constructor(
    @Inject(SQL) private readonly sql: ReturnType<typeof createDb>['sql'],
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(JOBS) private readonly jobs: Producer,
  ) {}

  static forRoot(env: ApiEnv) {
    const { db, sql } = createDb(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX });
    const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
    const auth = createAuth({
      db,
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.API_PUBLIC_URL,
      trustedOrigins: env.STUDIO_ORIGINS.split(','),
      smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        from: env.SMTP_FROM,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    });
    // BullMQ needs its own connection without per-request retry limits.
    const jobs = createProducer(new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }));
    return {
      module: InfraModule,
      providers: [
        { provide: ENV, useValue: env },
        { provide: DB, useValue: db },
        { provide: SQL, useValue: sql },
        { provide: REDIS, useValue: redis },
        { provide: AUTH, useValue: auth },
        { provide: JOBS, useValue: jobs },
      ],
      exports: [ENV, DB, REDIS, AUTH, JOBS],
    };
  }

  async onApplicationShutdown() {
    await Promise.allSettled([this.sql.end({ timeout: 5 }), this.redis.quit(), this.jobs.close()]);
  }
}
