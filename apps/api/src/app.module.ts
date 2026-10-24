import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { ApiEnv } from '@playora/env';
import type { Redis } from 'ioredis';
import { LoggerModule } from 'nestjs-pino';
import { uuidv7 } from 'uuidv7';
import { OrgAccessGuard } from './common/auth/org-access.guard';
import { SessionGuard } from './common/auth/session.guard';
import { CommonModule } from './common/common.module';
import { ResponseContractInterceptor } from './common/contract/response-contract.interceptor';
import { RedisThrottlerStorage } from './common/throttle/redis-throttler.storage';
import { InfraModule } from './infra/infra.module';
import { REDIS } from './infra/tokens';
import { AssetsModule } from './modules/assets/assets.module';
import { BrandKitsModule } from './modules/brand-kits/brand-kits.module';
import { EventsModule } from './modules/events/events.module';
import { GamesModule } from './modules/games/games.module';
import { GuestsModule } from './modules/guests/guests.module';
import { HealthController } from './modules/health/health.controller';
import { MeController } from './modules/me/me.controller';
import { OpenApiController } from './modules/openapi/openapi.controller';
import {
  getPublicJoinDeviceTracker,
  PUBLIC_JOIN_DEVICE_LIMIT_PER_MIN,
  PUBLIC_JOIN_DEVICE_THROTTLER,
  PUBLIC_THROTTLER,
  PublicController,
} from './modules/public/public.controller';
import { TemplatesModule } from './modules/templates/templates.module';

@Module({})
export class AppModule {
  static forRoot(env: ApiEnv) {
    return {
      module: AppModule,
      imports: [
        InfraModule.forRoot(env),
        CommonModule,
        LoggerModule.forRoot({
          pinoHttp: {
            level: env.LOG_LEVEL,
            genReqId: (req, res) => {
              const incoming = req.headers['x-request-id'];
              const id =
                typeof incoming === 'string' && incoming.length <= 64 ? incoming : uuidv7();
              res.setHeader('x-request-id', id);
              return id;
            },
            redact: [
              'req.headers.cookie',
              'req.headers.authorization',
              'res.headers["set-cookie"]',
            ],
            autoLogging: { ignore: (req) => req.url === '/v1/health' },
            transport:
              env.NODE_ENV === 'development'
                ? {
                    target: 'pino-pretty',
                    options: { singleLine: true, translateTime: 'HH:MM:ss' },
                  }
                : undefined,
          },
        }),
        ThrottlerModule.forRootAsync({
          inject: [REDIS],
          useFactory: (redis: Redis) => ({
            throttlers: [
              {
                name: 'default',
                ttl: 60_000,
                limit: env.RATE_LIMIT_PER_MIN,
                skipIf: (ctx) => ctx.getClass() === PublicController,
              },
              {
                name: PUBLIC_THROTTLER,
                ttl: 60_000,
                limit: env.PUBLIC_RATE_LIMIT_PER_MIN,
                skipIf: (ctx) => ctx.getClass() !== PublicController,
              },
              {
                name: PUBLIC_JOIN_DEVICE_THROTTLER,
                ttl: 60_000,
                limit: PUBLIC_JOIN_DEVICE_LIMIT_PER_MIN,
                skipIf: (ctx) =>
                  ctx.getClass() !== PublicController || ctx.getHandler().name !== 'join',
                getTracker: getPublicJoinDeviceTracker,
              },
            ],
            storage: new RedisThrottlerStorage(redis),
          }),
        }),
        EventsModule,
        AssetsModule,
        BrandKitsModule,
        GuestsModule,
        TemplatesModule,
        GamesModule,
      ],
      controllers: [HealthController, OpenApiController, PublicController, MeController],
      providers: [
        // Order matters: rate limit → session → org permission.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: SessionGuard },
        { provide: APP_GUARD, useClass: OrgAccessGuard },
        ...(env.NODE_ENV === 'production'
          ? []
          : [{ provide: APP_INTERCEPTOR, useClass: ResponseContractInterceptor }]),
      ],
    };
  }
}
