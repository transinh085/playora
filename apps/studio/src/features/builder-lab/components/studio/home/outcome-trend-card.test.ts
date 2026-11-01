import { describe, expect, it } from 'bun:test';
import type { CampaignReport } from '../../../api';
import {
  buildRollingDayKeys,
  computePeriodComparison,
  formatLocalDayKey,
  formatPeriodDelta,
} from './outcome-trend-card';

describe('outcome-trend-card timezone & period comparison helpers', () => {
  it('formats dates in Asia/Ho_Chi_Minh timezone across UTC midnight boundary', () => {
    // 2026-10-20T18:30:00.000Z is 2026-10-21 01:30:00 in Asia/Ho_Chi_Minh (UTC+7)
    const lateUtcDate = new Date('2026-10-20T18:30:00.000Z');
    expect(formatLocalDayKey(lateUtcDate, 'Asia/Ho_Chi_Minh')).toBe('2026-10-21');

    const keys = buildRollingDayKeys(7, lateUtcDate, 'Asia/Ho_Chi_Minh');
    expect(keys).toEqual([
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
    ]);
  });

  it('computes honest 7-day vs prior-7-day deltas and aggregates returningVisitors', () => {
    const now = new Date('2026-10-20T18:30:00.000Z'); // local today: 2026-10-21
    const sampleReport: CampaignReport = {
      timezone: 'Asia/Ho_Chi_Minh',
      plays: 60,
      players: 45,
      issued: 24,
      visits: 15,
      uniqueVisitors: 11,
      returningVisitors: 4,
      redemptionRate: 0.625,
      prizeCostVnd: 150_000,
      outstandingCostVnd: 20_000,
      budgetVnd: 500_000,
      costPerVisitVnd: 10_000,
      byPrize: [],
      byChannel: [],
      byDay: [
        // Prior 7-day window (2026-10-08 .. 2026-10-14)
        { day: '2026-10-10', plays: 20, wins: 8, visits: 5 },
        // Current 7-day window (2026-10-15 .. 2026-10-21)
        { day: '2026-10-20', plays: 30, wins: 12, visits: 7 },
        { day: '2026-10-21', plays: 10, wins: 4, visits: 3 },
      ],
    };

    const reports = new Map<string, CampaignReport>([['camp_1', sampleReport]]);
    const comp = computePeriodComparison(reports, now, 'Asia/Ho_Chi_Minh');

    expect(comp.prior7dVisits).toBe(5);
    expect(comp.current7dVisits).toBe(10);
    expect(comp.prior7dPlays).toBe(20);
    expect(comp.current7dPlays).toBe(40);
    expect(comp.returningVisitors).toBe(4);

    // 10 vs 5 = +100%
    expect(formatPeriodDelta(comp.current7dVisits, comp.prior7dVisits)).toEqual({
      label: '+100%',
      color: 'success',
    });

    // When prior period is 0, never fabricate a percentage — show honest 7d count
    expect(formatPeriodDelta(6, 0)).toEqual({
      label: '+6 (7d)',
      color: 'success',
    });
    expect(formatPeriodDelta(0, 0)).toEqual({
      label: '0%',
      color: 'default',
    });
  });
});
