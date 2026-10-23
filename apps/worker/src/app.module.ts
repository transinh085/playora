import { Module } from '@nestjs/common';
import type { WorkerEnv } from '@playora/env';
import { WorkersService } from './queues/workers.service';
import { ENV } from './tokens';

@Module({})
export class AppModule {
  static forRoot(env: WorkerEnv) {
    return {
      module: AppModule,
      providers: [{ provide: ENV, useValue: env }, WorkersService],
    };
  }
}
