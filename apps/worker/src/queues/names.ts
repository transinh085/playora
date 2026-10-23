/** Queues active in M1 (docs/05-architecture.md §14). More are added from M2. */
export const QueueName = {
  media: 'media',
  export: 'export',
} as const;

export type QueueName = (typeof QueueName)[keyof typeof QueueName];
