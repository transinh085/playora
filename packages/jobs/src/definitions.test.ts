import { describe, expect, test } from 'bun:test';
import { jobs, jobsOfQueue, queueNames } from './definitions';

describe('job definitions', () => {
  test('every job belongs to a known queue', () => {
    for (const queue of queueNames) expect(jobsOfQueue(queue).length).toBeGreaterThan(0);
  });

  test('payload schemas reject malformed data', () => {
    expect(jobs['event.export'].payload.safeParse({ eventId: 'nope' }).success).toBe(false);
  });
});
