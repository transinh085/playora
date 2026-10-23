import { z } from 'zod';

/**
 * Every background job: queue, name and payload schema. API enqueues, worker processes,
 * both validate against the same schema (docs/05-architecture.md §9).
 */
export const jobs = {
  'asset.process': {
    queue: 'media',
    payload: z.object({ organizationId: z.string(), assetId: z.uuid() }),
  },
  'event.export': {
    queue: 'export',
    payload: z.object({
      organizationId: z.string(),
      eventId: z.uuid(),
      exportId: z.uuid(),
      kind: z.enum(['players', 'winners', 'leads']),
    }),
  },
} as const;

export type JobName = keyof typeof jobs;
export type JobPayload<N extends JobName> = z.infer<(typeof jobs)[N]['payload']>;
export type QueueName = (typeof jobs)[JobName]['queue'];

export const queueNames = [...new Set(Object.values(jobs).map((j) => j.queue))] as QueueName[];

export function jobsOfQueue(queue: QueueName): JobName[] {
  return (Object.keys(jobs) as JobName[]).filter((name) => jobs[name].queue === queue);
}
