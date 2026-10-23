import { type ConnectionOptions, type JobsOptions, Queue } from 'bullmq';
import { type JobName, type JobPayload, jobs, type QueueName } from './definitions';

const defaults: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: { age: 24 * 3600, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

/** Typed enqueue: `producer.enqueue('event.export', { … })` validates the payload before it hits Redis. */
export function createProducer(connection: ConnectionOptions) {
  const queues = new Map<QueueName, Queue>();
  const queueFor = (name: QueueName) => {
    let queue = queues.get(name);
    if (!queue) {
      queue = new Queue(name, { connection, defaultJobOptions: defaults });
      queues.set(name, queue);
    }
    return queue;
  };

  return {
    async enqueue<N extends JobName>(name: N, payload: JobPayload<N>, opts?: JobsOptions) {
      const def = jobs[name];
      const data = def.payload.parse(payload);
      return queueFor(def.queue).add(name, data, opts);
    },
    async close() {
      await Promise.all([...queues.values()].map((q) => q.close()));
    },
  };
}

export type Producer = ReturnType<typeof createProducer>;
