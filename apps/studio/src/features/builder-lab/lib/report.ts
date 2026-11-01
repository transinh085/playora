import type { CampaignReport, PlaybookKey } from '@playora/contracts';
import { formatVnd, toPercent } from './rules-format';

/**
 * Pure formatting, playbook key metric, and auto-generated insight helpers for the Campaign
 * Overview and One-Page Outcome Report (`docs/product/specs/playbooks.md` §3).
 */

export function formatCount(value: number, locale = 'vi'): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
    maximumFractionDigits: 1,
  }).format(value);
}

/** Share of unique counter visitors who redeemed on >= 2 local days (`0..100`, 1 decimal max). */
export function returningRatePercent(returningVisitors: number, uniqueVisitors: number): number {
  if (uniqueVisitors <= 0 || returningVisitors <= 0) return 0;
  return toPercent(Math.min(1, returningVisitors / uniqueVisitors));
}

/** `"97 (31.1%)"` / `"0 (0%)"` (`docs/product/specs/playbooks.md` §3.1). */
export function formatReturningMetric(
  returningVisitors: number,
  uniqueVisitors: number,
  locale = 'vi',
): string {
  const rate = returningRatePercent(returningVisitors, uniqueVisitors);
  return `${formatCount(returningVisitors, locale)} (${formatCount(rate, locale)}%)`;
}

/** `"1.400.000 đ / 2.000.000 đ"` when a budget is set, or `"1.400.000 đ"` without one. */
export function formatPrizeCostMetric(
  prizeCostVnd: number,
  budgetVnd: number | null,
  locale = 'vi',
): string {
  if (budgetVnd !== null) {
    return `${formatVnd(prizeCostVnd, locale)} / ${formatVnd(budgetVnd, locale)}`;
  }
  return formatVnd(prizeCostVnd, locale);
}

/** `"4.500 đ"` when there is at least one counter visit, or `"—"` when nobody has redeemed yet. */
export function formatCostPerVisitMetric(costPerVisitVnd: number | null, locale = 'vi'): string {
  if (costPerVisitVnd === null) return '—';
  return formatVnd(costPerVisitVnd, locale);
}

/** Redeemed / issued as a percentage (`0..100`, 1 decimal max). */
export function redemptionRatePercent(
  report: Pick<CampaignReport, 'visits' | 'issued' | 'redemptionRate'>,
): number {
  if (report.issued <= 0) return 0;
  const ratio = report.redemptionRate ?? report.visits / report.issued;
  return toPercent(Math.min(1, Math.max(0, ratio)));
}

/** Day of week (`0` = Sunday … `6` = Saturday) for a local calendar date `'YYYY-MM-DD'`. */
export function dayWeekday(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  if (!y || !m || !d) return 0;
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** `'2027-01-28'` → `'28/01'` (`vi`) or `'01/28'` (`en`). */
export function formatShortDay(day: string, locale = 'vi'): string {
  const parts = day.split('-');
  if (parts.length !== 3) return day;
  const [, month, date] = parts;
  return locale === 'en' ? `${month}/${date}` : `${date}/${month}`;
}

export type PlaybookMetricKind = 'visitsPerDay' | 'returningRate' | 'openWeekdayVisits';

export interface PlaybookKeyMetric {
  playbook: PlaybookKey;
  metricKey: PlaybookMetricKind;
  value: number;
  values: Record<string, string | number>;
}

export interface BaselineComparison {
  visitsPerDay: number;
  baselineGuestsPerDay: number;
  percentOfBaseline: number;
  days: number;
}

/**
 * Computes the self-reported normal-day baseline comparison (`PLB-08`):
 * "Khách tới quầy/ngày = X% khách ngày thường (ước tính, theo số bạn nhập)".
 * Returns `null` when `baselineGuestsPerDay` is not set.
 */
export function computeBaselineComparison(
  report: Pick<CampaignReport, 'visits' | 'byDay'>,
  baselineGuestsPerDay: number | null | undefined,
): BaselineComparison | null {
  if (!baselineGuestsPerDay || baselineGuestsPerDay <= 0) return null;
  const days = Math.max(1, report.byDay.length);
  const visitsPerDay = Math.round((report.visits / days) * 10) / 10;
  const percentOfBaseline = Math.round((visitsPerDay / baselineGuestsPerDay) * 1000) / 10;
  return {
    visitsPerDay,
    baselineGuestsPerDay,
    percentOfBaseline,
    days,
  };
}

const DEFAULT_SLOW_WEEKDAYS = [1, 2, 3] as const;

/**
 * Computes the highlighted outcome metric for the campaign's playbook
 * (`docs/product/specs/playbooks.md` §2):
 * - `tet_traffic` → visits/day
 * - `second_visit` → % returning visitors
 * - `slow_days` → visits on open weekdays
 */
export function computePlaybookKeyMetric(
  report: CampaignReport,
  options: { playbook: PlaybookKey | null; openDays?: readonly number[] | null },
): PlaybookKeyMetric | null {
  const { playbook, openDays } = options;
  if (!playbook) return null;

  if (playbook === 'tet_traffic') {
    const days = Math.max(1, report.byDay.length);
    const visitsPerDay = Math.round((report.visits / days) * 10) / 10;
    return {
      playbook: 'tet_traffic',
      metricKey: 'visitsPerDay',
      value: visitsPerDay,
      values: { visitsPerDay, visits: report.visits, days },
    };
  }

  if (playbook === 'second_visit') {
    const rate = returningRatePercent(report.returningVisitors, report.uniqueVisitors);
    return {
      playbook: 'second_visit',
      metricKey: 'returningRate',
      value: rate,
      values: {
        rate,
        returning: report.returningVisitors,
        unique: report.uniqueVisitors,
      },
    };
  }

  const targetWeekdays = openDays && openDays.length > 0 ? openDays : DEFAULT_SLOW_WEEKDAYS;
  const openDayEntries = report.byDay.filter((d) => targetWeekdays.includes(dayWeekday(d.day)));
  const visits = openDayEntries.reduce((sum, d) => sum + d.visits, 0);
  return {
    playbook: 'slow_days',
    metricKey: 'openWeekdayVisits',
    value: visits,
    values: { visits, days: openDayEntries.length },
  };
}

export type ReportInsightKey =
  | 'busiestDayVisits'
  | 'busiestDayPlays'
  | 'lowSampleNotice'
  | 'noActivityYet'
  | 'topChannelVisits'
  | 'topChannelPlays'
  | 'unattributedChannel'
  | 'noChannelYet'
  | 'redemptionAndCostWithBudget'
  | 'redemptionAndCost'
  | 'lowRedemptionPrize'
  | 'issuedPendingRedemption'
  | 'noPrizesIssuedYet';

export interface ReportInsight {
  key: ReportInsightKey;
  values?: Record<string, string | number>;
}

export interface ReportFormatters {
  day: (day: string) => string;
  vnd: (amount: number) => string;
  channel: (channel: string) => string;
}

const defaultReportFormatters: ReportFormatters = {
  day: (day) => formatShortDay(day, 'vi'),
  vnd: (amount) => formatVnd(amount, 'vi'),
  channel: (channel) => channel,
};

/**
 * Generates the 3 summary insights for the one-page outcome report
 * (`docs/product/specs/playbooks.md` §3.3):
 * 1. Busiest day with count
 * 2. Best channel
 * 3. Redemption rate vs issued & cost per visit vs budget
 */
export function buildReportInsights(
  report: CampaignReport,
  fmt: ReportFormatters = defaultReportFormatters,
): [ReportInsight, ReportInsight, ReportInsight] {
  // 1. Busiest day insight
  let dayInsight: ReportInsight;
  const daysWithVisits = report.byDay.filter((d) => d.visits > 0);
  const daysWithPlays = report.byDay.filter((d) => d.plays > 0);

  if (report.visits > 0 && report.visits < 10) {
    dayInsight = {
      key: 'lowSampleNotice',
      values: {
        visits: report.visits,
        plays: report.plays,
      },
    };
  } else if (daysWithVisits.length > 0) {
    const best = daysWithVisits.reduce((acc, cur) =>
      cur.visits > acc.visits || (cur.visits === acc.visits && cur.plays >= acc.plays) ? cur : acc,
    );
    dayInsight = {
      key: 'busiestDayVisits',
      values: {
        day: fmt.day(best.day),
        visits: best.visits,
        plays: best.plays,
      },
    };
  } else if (daysWithPlays.length > 0) {
    const best = daysWithPlays.reduce((acc, cur) =>
      cur.plays > acc.plays || (cur.plays === acc.plays && cur.wins >= acc.wins) ? cur : acc,
    );
    dayInsight = {
      key: 'busiestDayPlays',
      values: {
        day: fmt.day(best.day),
        plays: best.plays,
        wins: best.wins,
      },
    };
  } else {
    dayInsight = { key: 'noActivityYet' };
  }

  // 2. Best channel insight
  let channelInsight: ReportInsight;
  const namedChannels = report.byChannel.filter((c): c is typeof c & { channel: string } =>
    Boolean(c.channel && c.channel.trim().length > 0),
  );
  const namedWithVisits = namedChannels.filter((c) => c.visits > 0);
  const namedWithPlays = namedChannels.filter((c) => c.plays > 0);
  const totalChannelPlays = report.byChannel.reduce((s, c) => s + c.plays, 0);
  const totalChannelVisits = report.byChannel.reduce((s, c) => s + c.visits, 0);

  if (namedWithVisits.length > 0) {
    const best = namedWithVisits.reduce((acc, cur) =>
      cur.visits > acc.visits || (cur.visits === acc.visits && cur.plays > acc.plays) ? cur : acc,
    );
    channelInsight = {
      key: 'topChannelVisits',
      values: {
        channel: fmt.channel(best.channel),
        visits: best.visits,
        plays: best.plays,
      },
    };
  } else if (namedWithPlays.length > 0) {
    const best = namedWithPlays.reduce((acc, cur) =>
      cur.plays > acc.plays || (cur.plays === acc.plays && cur.wins > acc.wins) ? cur : acc,
    );
    channelInsight = {
      key: 'topChannelPlays',
      values: {
        channel: fmt.channel(best.channel),
        plays: best.plays,
        wins: best.wins,
      },
    };
  } else if (totalChannelPlays > 0 || totalChannelVisits > 0) {
    channelInsight = {
      key: 'unattributedChannel',
      values: {
        visits: totalChannelVisits,
        plays: totalChannelPlays,
      },
    };
  } else {
    channelInsight = { key: 'noChannelYet' };
  }

  // 3. Redemption rate vs issued & cost per visit vs budget insight
  let costInsight: ReportInsight;
  const lowRedemptionPrize = report.byPrize.find(
    (p) => p.issued >= 30 && p.redeemed / p.issued < 0.5,
  );
  if (lowRedemptionPrize) {
    costInsight = {
      key: 'lowRedemptionPrize',
      values: {
        prize: lowRedemptionPrize.name,
        issued: lowRedemptionPrize.issued,
        rate: toPercent(lowRedemptionPrize.redeemed / lowRedemptionPrize.issued),
      },
    };
  } else if (report.issued > 0 && report.visits > 0) {
    const rate = redemptionRatePercent(report);
    const costPerVisit = fmt.vnd(
      report.costPerVisitVnd ?? Math.round(report.prizeCostVnd / report.visits),
    );
    if (report.budgetVnd !== null && report.budgetVnd > 0) {
      const budgetPercent = toPercent(report.prizeCostVnd / report.budgetVnd);
      costInsight = {
        key: 'redemptionAndCostWithBudget',
        values: {
          rate,
          visits: report.visits,
          issued: report.issued,
          costPerVisit,
          budgetPercent,
          prizeCost: fmt.vnd(report.prizeCostVnd),
          budget: fmt.vnd(report.budgetVnd),
        },
      };
    } else {
      costInsight = {
        key: 'redemptionAndCost',
        values: {
          rate,
          visits: report.visits,
          issued: report.issued,
          costPerVisit,
          prizeCost: fmt.vnd(report.prizeCostVnd),
        },
      };
    }
  } else if (report.issued > 0) {
    costInsight = {
      key: 'issuedPendingRedemption',
      values: {
        issued: report.issued,
        outstandingCost: fmt.vnd(report.outstandingCostVnd),
      },
    };
  } else {
    costInsight = { key: 'noPrizesIssuedYet' };
  }

  return [dayInsight, channelInsight, costInsight];
}

export type PacingStatus = 'on_track' | 'exhausting_early' | 'surplus_remaining';

export interface PacingMonitorResult {
  status: PacingStatus;
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  expectedDailyPlays: number;
  actualDailyPlays: number;
  totalStock: number;
  issuedStock: number;
  remainingStock: number;
  dailyIssueRate: number;
  /** Estimated days until prize stock runs out at the current issue pace (`null` when 0 issued). */
  projectedDaysToExhaust: number | null;
  /** Estimated unissued prizes left at `endsAt` at the current issue pace. */
  projectedSurplusStock: number;
  /** Suggested `overallWinRate` (0..1) to finish close to `endsAt`, when off-track by >20%. */
  suggestedWinRate: number | null;
  currentWinRate: number;
}

const DAY_MS = 86_400_000;

/**
 * Computes the Prize Pacing Monitor (`PRZ-22`) for a campaign:
 * - Compares actual daily plays vs expected traffic (`baselineGuestsPerDay ?? 50`).
 * - Projects stock exhaustion or surplus at `endsAt`.
 * - Recommends a 1-click win-rate adjustment when off-track by >20%.
 */
export function computePacingMonitor(
  campaign: {
    rules: {
      mode: string;
      overallWinRate: number;
      startsAt: string;
      endsAt: string;
      baselineGuestsPerDay?: number | null;
    };
    prizes: ReadonlyArray<{ quantity: number }>;
  },
  report: Pick<CampaignReport, 'plays' | 'issued' | 'byPrize'>,
  nowMs = Date.now(),
): PacingMonitorResult {
  const startMs = Date.parse(campaign.rules.startsAt);
  const endMs = Date.parse(campaign.rules.endsAt);
  const totalDays = Math.max(1, Math.ceil((endMs - startMs) / DAY_MS));
  const rawElapsed = (Math.min(nowMs, endMs) - startMs) / DAY_MS;
  const elapsedDays = Math.max(1, Math.min(totalDays, Math.ceil(rawElapsed)));
  const remainingDays = Math.max(0, totalDays - elapsedDays);

  const expectedDailyPlays =
    campaign.rules.baselineGuestsPerDay && campaign.rules.baselineGuestsPerDay > 0
      ? campaign.rules.baselineGuestsPerDay
      : 50;
  const actualDailyPlays = Math.round((report.plays / elapsedDays) * 10) / 10;

  const totalStock =
    report.byPrize.length > 0
      ? report.byPrize.reduce((s, p) => s + p.quantity, 0)
      : campaign.prizes.reduce((s, p) => s + p.quantity, 0);
  const issuedStock =
    report.byPrize.length > 0 ? report.byPrize.reduce((s, p) => s + p.issued, 0) : report.issued;
  const remainingStock =
    report.byPrize.length > 0
      ? report.byPrize.reduce((s, p) => s + p.remaining, 0)
      : Math.max(0, totalStock - issuedStock);

  const dailyIssueRate = Math.round((issuedStock / elapsedDays) * 10) / 10;
  const projectedDaysToExhaust =
    dailyIssueRate > 0 ? Math.round((remainingStock / dailyIssueRate) * 10) / 10 : null;
  const projectedAdditionalIssued = dailyIssueRate * remainingDays;
  const projectedSurplusStock = Math.max(0, Math.round(remainingStock - projectedAdditionalIssued));

  let status: PacingStatus = 'on_track';
  if (totalStock > 0 && remainingDays > 0) {
    if (projectedDaysToExhaust !== null && projectedDaysToExhaust < remainingDays * 0.8) {
      status = 'exhausting_early';
    } else if (projectedSurplusStock > totalStock * 0.2) {
      status = 'surplus_remaining';
    }
  }

  let suggestedWinRate: number | null = null;
  if (status !== 'on_track' && remainingDays > 0 && remainingStock > 0) {
    const ReferenceDailyPlays = actualDailyPlays > 0 ? actualDailyPlays : expectedDailyPlays;
    const expectedRemainingPlays = Math.max(1, ReferenceDailyPlays * remainingDays);
    const rawTarget = remainingStock / expectedRemainingPlays;
    const clamped = Math.min(0.95, Math.max(0.05, Math.round(rawTarget * 100) / 100));
    if (Math.abs(clamped - campaign.rules.overallWinRate) >= 0.02) {
      suggestedWinRate = clamped;
    }
  }

  return {
    status,
    totalDays,
    elapsedDays,
    remainingDays,
    expectedDailyPlays,
    actualDailyPlays,
    totalStock,
    issuedStock,
    remainingStock,
    dailyIssueRate,
    projectedDaysToExhaust,
    projectedSurplusStock,
    suggestedWinRate,
    currentWinRate: campaign.rules.overallWinRate,
  };
}
