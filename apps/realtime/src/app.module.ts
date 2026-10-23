import { Module } from '@nestjs/common';
import type { RealtimeEnv } from '@playora/env';
import { HealthController } from './health/health.controller';
import { LiveGateway } from './live/live.gateway';
import { LiveMetrics } from './live/live.metrics';
import { ENV } from './tokens';

@Module({})
export class AppModule {
  static forRoot(env: RealtimeEnv) {
    return {
      module: AppModule,
      controllers: [HealthController],
      providers: [{ provide: ENV, useValue: env }, LiveMetrics, LiveGateway],
    };
  }
}
