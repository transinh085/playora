/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { campaignPhase } from './phase';

const NOW = Date.parse('2027-01-20T10:00:00+07:00');
const base = {
  status: 'published' as const,
  paused: false,
  rules: { startsAt: '2027-01-15T00:00:00+07:00', endsAt: '2027-02-10T00:00:00+07:00' },
} as Parameters<typeof campaignPhase>[0];

describe('campaignPhase', () => {
  test('unpublished is draft whatever the schedule', () => {
    expect(campaignPhase({ ...base, status: 'draft' }, NOW)).toBe('draft');
  });
  test('published follows the schedule', () => {
    expect(campaignPhase(base, NOW)).toBe('live');
    expect(campaignPhase(base, Date.parse('2027-01-01T00:00:00+07:00'))).toBe('scheduled');
    expect(campaignPhase(base, Date.parse('2027-03-01T00:00:00+07:00'))).toBe('ended');
  });
  test('pause wins over live but not over ended', () => {
    expect(campaignPhase({ ...base, paused: true }, NOW)).toBe('paused');
    expect(campaignPhase({ ...base, paused: true }, Date.parse('2027-03-01T00:00:00+07:00'))).toBe(
      'ended',
    );
  });
  test('uses server phase when now is omitted', () => {
    expect(campaignPhase({ ...base, status: 'draft', phase: 'paused' })).toBe('paused');
  });
});
