import { Module } from '@nestjs/common';
import type { ApiEnv } from '@playora/env';
import { HealthController } from './health/health.controller';
import { InfraModule } from './infra/infra.module';
import { PublicEventsController } from './public-events/public-events.controller';

@Module({})
export class AppModule {
  static forRoot(env: ApiEnv) {
    return {
      module: AppModule,
      imports: [InfraModule.forRoot(env)],
      controllers: [HealthController, PublicEventsController],
    };
  }
}
