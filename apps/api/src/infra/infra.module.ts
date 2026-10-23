import {
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { createAuth } from '@playora/auth';
import { createDb } from '@playora/db';
import type { ApiEnv } from '@playora/env';
import { createProducer, type Producer } from '@playora/jobs';
import { Redis } from 'ioredis';
import { createS3Client, ensureS3Bucket } from './s3';
import { AUTH, DB, ENV, JOBS, REDIS, S3 } from './tokens';

const SQL = Symbol('SQL');

/** Process-wide clients: one Postgres pool, one Redis connection, one Better Auth instance. */
@Global()
@Module({})
export class InfraModule implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(InfraModule.name);

  constructor(
    @Inject(ENV) private readonly env: ApiEnv,
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
    const s3 = createS3Client(env);
    return {
      module: InfraModule,
      providers: [
        { provide: ENV, useValue: env },
        { provide: DB, useValue: db },
        { provide: SQL, useValue: sql },
        { provide: REDIS, useValue: redis },
        { provide: AUTH, useValue: auth },
        { provide: JOBS, useValue: jobs },
        { provide: S3, useValue: s3 },
      ],
      exports: [ENV, DB, REDIS, AUTH, JOBS, S3],
    };
  }

  async onModuleInit() {
    if (this.env.NODE_ENV !== 'production') {
      await ensureS3Bucket(this.env).catch((err: unknown) => {
        this.logger.warn(
          `Could not ensure S3 bucket ${this.env.S3_BUCKET}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }
  }

  async onApplicationShutdown() {
    await Promise.allSettled([this.sql.end({ timeout: 5 }), this.redis.quit(), this.jobs.close()]);
  }
}
