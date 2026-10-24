import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { WorkerEnv } from '@playora/env';
import { type JobName, jobs, queueNames } from '@playora/jobs';
import { type Job, UnrecoverableError, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { processors } from '../processors';
import { ENV } from '../tokens';

@Injectable()
export class WorkersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkersService.name);
  private readonly workers: Worker[] = [];
  private connection?: Redis;

  constructor(@Inject(ENV) private readonly env: WorkerEnv) {}

  onModuleInit() {
    // BullMQ requires maxRetriesPerRequest: null on worker connections.
    this.connection = new Redis(this.env.REDIS_URL, { maxRetriesPerRequest: null });
    for (const queue of queueNames) {
      const worker = new Worker(queue, (job) => this.process(job), {
        connection: this.connection,
        concurrency: 4,
      });
      worker.on('failed', (job, err) =>
        this.logger.error(`${queue}#${job?.id} ${job?.name} failed: ${err.message}`),
      );
      this.workers.push(worker);
    }
    this.logger.log(`Listening on queues: ${queueNames.join(', ')}`);
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close()));
    await this.connection?.quit();
  }

  get running() {
    return this.workers.filter((w) => w.isRunning()).length;
  }

  get isHealthy() {
    return this.running > 0;
  }

  private async process(job: Job) {
    const name = job.name as JobName;
    const def = jobs[name];
    if (!def) throw new UnrecoverableError(`Unknown job "${job.name}"`);
    const payload = def.payload.safeParse(job.data);
    // A malformed payload will never succeed; do not burn retries on it.
    if (!payload.success) throw new UnrecoverableError(`Invalid payload for ${name}`);
    const processor = processors[name] as (data: unknown, job: Job) => Promise<unknown>;
    return processor(payload.data, job);
  }
}
