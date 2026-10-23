import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { WorkerEnv } from '@playora/env';
import { type Job, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { ENV } from '../tokens';
import { QueueName } from './names';

@Injectable()
export class WorkersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkersService.name);
  private readonly workers: Worker[] = [];
  private connection?: Redis;

  constructor(@Inject(ENV) private readonly env: WorkerEnv) {}

  onModuleInit() {
    // BullMQ requires maxRetriesPerRequest: null on worker connections.
    this.connection = new Redis(this.env.REDIS_URL, { maxRetriesPerRequest: null });
    for (const name of Object.values(QueueName)) {
      const worker = new Worker(name, (job) => this.process(job), {
        connection: this.connection,
        concurrency: 4,
      });
      worker.on('failed', (job, err) =>
        this.logger.error(`${name}#${job?.id} failed: ${err.message}`),
      );
      this.workers.push(worker);
    }
    this.logger.log(`Listening on queues: ${Object.values(QueueName).join(', ')}`);
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close()));
    await this.connection?.quit();
  }

  get running() {
    return this.workers.filter((w) => w.isRunning()).length;
  }

  private async process(job: Job) {
    // Processors land in M1 (image variants via sharp, CSV/XLSX export).
    this.logger.log(`${job.queueName}#${job.id} ${job.name} — no processor yet`);
  }
}
