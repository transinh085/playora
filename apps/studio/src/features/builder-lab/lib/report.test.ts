/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import type { CampaignReport } from '@playora/contracts';
import {
  buildReportInsights,
  computePlaybookKeyMetric,
  dayWeekday,
  formatCostPerVisitMetric,
  formatPrizeCostMetric,
  formatReturningMetric,
  formatShortDay,
  redemptionRatePercent,
  returningRatePercent,
} from './report';

const sampleReport: CampaignReport = {
  visits: 12,
  uniqueVisitors: 8,
  returningVisitors: 2,
  prizeCostVnd: 360_000,
  outstandingCostVnd: 90_000,
  budgetVnd: 1_000_000,
  costPerVisitVnd: 30_000,
  plays: 40,
  players: 25,
  issued: 15,
  redemptionRate: 12 / 15,
  timezone: 'Asia/Ho_Chi_Minh',
  byDay: [
    { day: '2027-01-25', plays: 10, wins: 4, visits: 3 }, // Monday (1)
    { day: '2027-01-26', plays: 18, wins: 7, visits: 6 }, // Tuesday (2)
    { day: '2027-01-27', plays: 8, wins: 3, visits: 2 }, // Wednesday (3)
    { day: '2027-01-30', plays: 4, wins: 1, visits: 1 }, // Saturday (6)
  ],
  byChannel: [
    { channel: 'table-qr', plays: 24, wins: 9, visits: 8 },
    { channel: 'fanpage', plays: 10, wins: 4, visits: 3 },
    { channel: null, plays: 6, wins: 2, visits: 1 },
  ],
  byPrize: [
    {
      prizeId: 'p1',
      name: 'Ly cà phê muối',
      valueVnd: 30_000,
      quantity: 50,
      issued: 15,
      redeemed: 12,
      remaining: 35,
    },
  ],
};

const emptyReport: CampaignReport = {
  visits: 0,
  uniqueVisitors: 0,
  returningVisitors: 0,
  prizeCostVnd: 0,
  outstandingCostVnd: 0,
  budgetVnd: null,
  costPerVisitVnd: null,
  plays: 0,
  players: 0,
  issued: 0,
  redemptionRate: null,
  timezone: 'Asia/Ho_Chi_Minh',
  byDay: [
    { day: '2027-01-25', plays: 0, wins: 0, visits: 0 },
    { day: '2027-01-26', plays: 0, wins: 0, visits: 0 },
  ],
  byChannel: [],
  byPrize: [],
};

const fmt = {
  day: (d: string) => formatShortDay(d, 'vi'),
  vnd: (n: number) => `${n}đ`,
  channel: (c: string) => `ch:${c}`,
};

describe('metric formatting', () => {
  test('returning visitor rate and label in vi and en', () => {
    expect(returningRatePercent(0, 0)).toBe(0);
    expect(returningRatePercent(2, 8)).toBe(25);
    expect(returningRatePercent(1, 3)).toBe(33.3);
    expect(formatReturningMetric(2, 8, 'vi')).toBe('2 (25%)');
    expect(formatReturningMetric(1, 3, 'vi')).toBe('1 (33,3%)');
    expect(formatReturningMetric(1, 3, 'en')).toBe('1 (33.3%)');
    expect(formatReturningMetric(0, 0, 'vi')).toBe('0 (0%)');
  });

  test('prize cost with and without budget', () => {
    expect(formatPrizeCostMetric(360_000, 1_000_000, 'vi')).toBe('360.000 đ / 1.000.000 đ');
    expect(formatPrizeCostMetric(360_000, 1_000_000, 'en')).toBe('360,000 đ / 1,000,000 đ');
    expect(formatPrizeCostMetric(360_000, null, 'vi')).toBe('360.000 đ');
  });

  test('cost per visit handles null and positive values', () => {
    expect(formatCostPerVisitMetric(null, 'vi')).toBe('—');
    expect(formatCostPerVisitMetric(30_000, 'vi')).toBe('30.000 đ');
    expect(formatCostPerVisitMetric(30_000, 'en')).toBe('30,000 đ');
  });

  test('redemption rate and short day helpers', () => {
    expect(redemptionRatePercent(sampleReport)).toBe(80);
    expect(redemptionRatePercent(emptyReport)).toBe(0);
    expect(formatShortDay('2027-01-28', 'vi')).toBe('28/01');
    expect(formatShortDay('2027-01-28', 'en')).toBe('01/28');
    expect(dayWeekday('2027-01-25')).toBe(1); // Monday
    expect(dayWeekday('2027-01-30')).toBe(6); // Saturday
  });
});

describe('computePlaybookKeyMetric', () => {
  test('returns null when campaign has no playbook', () => {
    expect(computePlaybookKeyMetric(sampleReport, { playbook: null })).toBeNull();
  });

  test('tet_traffic computes average counter visits per day', () => {
    expect(computePlaybookKeyMetric(sampleReport, { playbook: 'tet_traffic' })).toEqual({
      playbook: 'tet_traffic',
      metricKey: 'visitsPerDay',
      value: 3,
      values: { visitsPerDay: 3, visits: 12, days: 4 },
    });
  });

  test('second_visit computes returning visitor percentage', () => {
    expect(computePlaybookKeyMetric(sampleReport, { playbook: 'second_visit' })).toEqual({
      playbook: 'second_visit',
      metricKey: 'returningRate',
      value: 25,
      values: { rate: 25, returning: 2, unique: 8 },
    });
  });

  test('slow_days sums visits on configured open weekdays (or Mon–Wed by default)', () => {
    expect(
      computePlaybookKeyMetric(sampleReport, { playbook: 'slow_days', openDays: [1, 2, 3] }),
    ).toEqual({
      playbook: 'slow_days',
      metricKey: 'openWeekdayVisits',
      value: 11,
      values: { visits: 11, days: 3 },
    });

    expect(
      computePlaybookKeyMetric(sampleReport, { playbook: 'slow_days', openDays: [6] }),
    ).toEqual({
      playbook: 'slow_days',
      metricKey: 'openWeekdayVisits',
      value: 1,
      values: { visits: 1, days: 1 },
    });
  });
});

describe('buildReportInsights', () => {
  test('builds busiest day, top channel and redemption+budget insights from live data', () => {
    const insights = buildReportInsights(sampleReport, fmt);
    expect(insights).toEqual([
      {
        key: 'busiestDayVisits',
        values: { day: '26/01', visits: 6, plays: 18 },
      },
      {
        key: 'topChannelVisits',
        values: { channel: 'ch:table-qr', visits: 8, plays: 24 },
      },
      {
        key: 'redemptionAndCostWithBudget',
        values: {
          rate: 80,
          visits: 12,
          issued: 15,
          costPerVisit: '30000đ',
          budgetPercent: 36,
          prizeCost: '360000đ',
          budget: '1000000đ',
        },
      },
    ]);
  });

  test('handles campaigns without a budget and with plays but no redemptions yet', () => {
    const playsOnly: CampaignReport = {
      ...emptyReport,
      plays: 7,
      players: 5,
      issued: 2,
      outstandingCostVnd: 60_000,
      byDay: [
        { day: '2027-01-25', plays: 2, wins: 1, visits: 0 },
        { day: '2027-01-26', plays: 5, wins: 1, visits: 0 },
      ],
      byChannel: [{ channel: 'zalo', plays: 7, wins: 2, visits: 0 }],
    };
    expect(buildReportInsights(playsOnly, fmt)).toEqual([
      { key: 'busiestDayPlays', values: { day: '26/01', plays: 5, wins: 1 } },
      { key: 'topChannelPlays', values: { channel: 'ch:zalo', plays: 7, wins: 2 } },
      { key: 'issuedPendingRedemption', values: { issued: 2, outstandingCost: '60000đ' } },
    ]);

    const noBudget: CampaignReport = { ...sampleReport, budgetVnd: null };
    expect(buildReportInsights(noBudget, fmt)[2]).toEqual({
      key: 'redemptionAndCost',
      values: {
        rate: 80,
        visits: 12,
        issued: 15,
        costPerVisit: '30000đ',
        prizeCost: '360000đ',
      },
    });
  });

  test('handles unattributed channels and empty campaigns', () => {
    const unattributed: CampaignReport = {
      ...emptyReport,
      plays: 3,
      byChannel: [{ channel: null, plays: 3, wins: 0, visits: 0 }],
    };
    expect(buildReportInsights(unattributed, fmt)[1]).toEqual({
      key: 'unattributedChannel',
      values: { visits: 0, plays: 3 },
    });

    expect(buildReportInsights(emptyReport, fmt)).toEqual([
      { key: 'noActivityYet' },
      { key: 'noChannelYet' },
      { key: 'noPrizesIssuedYet' },
    ]);
  });
});
