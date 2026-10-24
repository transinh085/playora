import { Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createDb } from '@playora/db';
import type { RealtimeEnv } from '@playora/env';
import { Redis } from 'ioredis';
import { uuidv7 } from 'uuidv7';
import { HealthController } from './health/health.controller';
import { LiveGateway } from './live/live.gateway';
import { LiveMetrics } from './live/live.metrics';
import { LiveRepository } from './live/live.repository';
import { createDefaultTemplateRegistry, type TemplateRegistry } from './templates';
import { DB, ENV, NODE_ID, REDIS, TEMPLATE_REGISTRY } from './tokens';

const SQL = Symbol('SQL');

export interface RealtimeModuleOptions {
  nodeId?: string;
  registry?: TemplateRegistry;
}

@Module({})
export class AppModule implements OnApplicationShutdown {
  constructor(
    @Inject(SQL) private readonly sql: ReturnType<typeof createDb>['sql'],
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  static forRoot(env: RealtimeEnv, options: RealtimeModuleOptions = {}) {
    const { db, sql } = createDb(env.DATABASE_URL, { max: 5 });
    const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
    const nodeId = options.nodeId ?? uuidv7();
    const registry = options.registry ?? createDefaultTemplateRegistry();

    return {
      module: AppModule,
      controllers: [HealthController],
      providers: [
        { provide: ENV, useValue: env },
        { provide: DB, useValue: db },
        { provide: SQL, useValue: sql },
        { provide: REDIS, useValue: redis },
        { provide: NODE_ID, useValue: nodeId },
        { provide: TEMPLATE_REGISTRY, useValue: registry },
        LiveMetrics,
        LiveRepository,
        LiveGateway,
      ],
    };
  }

  async onApplicationShutdown() {
    await Promise.allSettled([this.sql.end({ timeout: 5 }), this.redis.quit()]);
  }
}
