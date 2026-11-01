'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { ProgressBar } from '@playora/ui/components/base/progress/progress';
import { Skeleton } from '@playora/ui/components/base/skeleton/skeleton';
import {
  Coins,
  Lightbulb,
  Pencil,
  Printer,
  Repeat,
  Target,
  TicketCheck,
  Wallet,
} from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import Link from 'next/link';
import { useFormatter, useLocale, useNow, useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { DailyOutcomeChart } from '@/components/daily-outcome-chart';
import { IconTile } from '@/components/icon-tile';
import { MetricGrid } from '@/components/metric-card';
import { PageHeader } from '@/components/page-header';
import { QueryError } from '@/components/query-error';
import { type Campaign, type CampaignReport, useCampaign, useCampaignReport } from '../../api';
import { campaignPhase } from '../../lib/phase';
import {
  buildReportInsights,
  computePlaybookKeyMetric,
  formatCostPerVisitMetric,
  formatCount,
  formatPrizeCostMetric,
  formatReturningMetric,
  formatShortDay,
  redemptionRatePercent,
} from '../../lib/report';
import { campaignRoutes } from '../../lib/routes';
import { formatVnd } from '../../lib/rules-format';
import { campaignPeriod } from './campaign-period';
import { PhaseTag } from './phase-tag';

const KNOWN_CHANNELS = new Set([
  'table-qr',
  'counter-qr',
  'standee',
  'fanpage',
  'facebook',
  'zalo',
]);

type KnownChannel =
  | 'direct'
  | 'table-qr'
  | 'counter-qr'
  | 'standee'
  | 'fanpage'
  | 'facebook'
  | 'zalo';

export function resolveChannelLabel(
  channel: string | null,
  translateKnown: (key: KnownChannel) => string,
): string {
  if (!channel?.trim()) return translateKnown('direct');
  const normalized = channel.trim().toLowerCase();
  if (KNOWN_CHANNELS.has(normalized)) {
    return translateKnown(normalized as KnownChannel);
  }
  return channel;
}

/**
 * Playbook goal and highlighted key metric banner (`docs/product/specs/playbooks.md` §2, §3.1):
 * - `tet_traffic` → visits/day
 * - `second_visit` → % returning
 * - `slow_days` → visits on open weekdays
 */
export function PlaybookGoalBanner({
  campaign,
  report,
  showWhenCustom = false,
}: {
  campaign: Campaign;
  report?: CampaignReport;
  showWhenCustom?: boolean;
}) {
  const tr = useTranslations('campaigns.report');
  const locale = useLocale();
  const format = useFormatter();

  if (!campaign.playbook && !showWhenCustom) return null;

  const keyMetric =
    report && campaign.playbook
      ? computePlaybookKeyMetric(report, {
          playbook: campaign.playbook,
          openDays: campaign.rules.openDays,
        })
      : null;

  const playbookKey = campaign.playbook ?? 'custom';
  const title = tr(`playbooks.${playbookKey}.title`);
  const goal = tr(`playbooks.${playbookKey}.goal`);

  const highlightText =
    keyMetric && campaign.playbook
      ? tr(`playbooks.${campaign.playbook}.highlight`, {
          ...keyMetric.values,
          visitsPerDay:
            typeof keyMetric.values.visitsPerDay === 'number'
              ? formatCount(keyMetric.values.visitsPerDay, locale)
              : '',
          rate:
            typeof keyMetric.values.rate === 'number'
              ? formatCount(keyMetric.values.rate, locale)
              : '',
        })
      : null;

  return (
    <div
      className="rounded-3xl border border-teal-500/25 bg-teal-50/50 p-5 shadow-card dark:border-teal-500/30 dark:bg-teal-950/20"
      data-testid="playbook-highlight"
      data-playbook-goal={playbookKey}
      data-print-card
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <IconTile tone="primary" size={40}>
            <Target className="size-5" />
          </IconTile>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <Caption>{tr('goalLabel')}</Caption>
              <Chip variant="subtle" color="neutral">
                {title}
              </Chip>
            </div>
            <span className="block text-body-semibold text-text-primary">{goal}</span>
            <Caption>
              {tr('periodLabel')}: {campaignPeriod(format, campaign)}
            </Caption>
          </div>
        </div>

        {highlightText && (
          <div data-testid="playbook-key-metric" className="text-right">
            <Caption className="block">{tr('keyMetricLabel')}</Caption>
            <span className="text-headline-semibold tabular-nums text-teal-700 dark:text-teal-300">
              {highlightText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The 4 headline outcome numbers (`docs/product/specs/playbooks.md` §3.1):
 * 1. Khách tới quầy (visits)
 * 2. Khách quay lại (%)
 * 3. Chi phí quà / ngân sách
 * 4. Chi phí mỗi khách tới quầy
 */
export function OutcomeMetricGrid({
  campaign,
  report,
  loading,
}: {
  campaign: Campaign;
  report?: CampaignReport;
  loading?: boolean;
}) {
  const tr = useTranslations('campaigns.report');
  const format = useFormatter();
  const locale = useLocale();

  const visits = report?.visits ?? 0;
  const uniqueVisitors = report?.uniqueVisitors ?? 0;
  const returningVisitors = report?.returningVisitors ?? 0;
  const issued = report?.issued ?? 0;
  const prizeCostVnd = report?.prizeCostVnd ?? 0;
  const outstandingCostVnd = report?.outstandingCostVnd ?? 0;
  const budgetVnd = report ? report.budgetVnd : campaign.rules.budgetVnd;
  const costPerVisitVnd = report?.costPerVisitVnd ?? null;
  const plays = report?.plays ?? 0;
  const players = report?.players ?? 0;
  const rate = report ? redemptionRatePercent(report) : 0;

  const keyMetric =
    report && campaign.playbook
      ? computePlaybookKeyMetric(report, {
          playbook: campaign.playbook,
          openDays: campaign.rules.openDays,
        })
      : null;

  const visitsSubtext =
    keyMetric && (campaign.playbook === 'tet_traffic' || campaign.playbook === 'slow_days')
      ? tr(`playbooks.${campaign.playbook}.highlight`, {
          ...keyMetric.values,
          visitsPerDay:
            typeof keyMetric.values.visitsPerDay === 'number'
              ? formatCount(keyMetric.values.visitsPerDay, locale)
              : '',
        })
      : visits > 0 || issued > 0
        ? tr('metrics.visitsSub', {
            unique: uniqueVisitors,
            rate: formatCount(rate, locale),
            visits,
            issued,
          })
        : tr('metrics.visitsEmpty');

  const returningSubtext =
    returningVisitors > 0 || uniqueVisitors > 0
      ? tr('metrics.returningSub', { returning: returningVisitors, unique: uniqueVisitors })
      : tr('metrics.returningEmpty');

  return (
    <MetricGrid
      loading={loading}
      items={[
        {
          label: tr('metrics.visits'),
          value: format.number(visits),
          subtext: visitsSubtext,
          icon: <TicketCheck className="size-5" />,
          tone: 'primary',
          highlighted: campaign.playbook === 'tet_traffic' || campaign.playbook === 'slow_days',
          testId: 'metric-visits',
        },
        {
          label: tr('metrics.returning'),
          value: formatReturningMetric(returningVisitors, uniqueVisitors, locale),
          subtext: returningSubtext,
          icon: <Repeat className="size-5" />,
          tone: 'success',
          highlighted: campaign.playbook === 'second_visit',
          testId: 'metric-returning',
        },
        {
          label: tr('metrics.prizeCost'),
          value: formatPrizeCostMetric(prizeCostVnd, budgetVnd, locale),
          subtext:
            outstandingCostVnd > 0
              ? tr('metrics.prizeCostOutstanding', {
                  amount: formatVnd(outstandingCostVnd, locale),
                })
              : tr('metrics.prizeCostSub'),
          icon: <Wallet className="size-5" />,
          tone: 'warning',
          testId: 'metric-prize-cost',
        },
        {
          label: tr('metrics.costPerVisit'),
          value: formatCostPerVisitMetric(costPerVisitVnd, locale),
          subtext:
            visits > 0 || plays > 0
              ? tr('metrics.costPerVisitSub', { plays, players })
              : tr('metrics.costPerVisitEmpty'),
          icon: <Coins className="size-5" />,
          tone: 'info',
          testId: 'metric-cost-per-visit',
        },
      ]}
    />
  );
}

export function DailyOutcomeCard({
  report,
  loading,
  extra,
}: {
  report?: CampaignReport;
  loading?: boolean;
  extra?: React.ReactNode;
}) {
  const tr = useTranslations('campaigns.report.daily');
  const locale = useLocale();

  return (
    <div
      className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
      data-testid="daily-chart-card"
      data-print-card
    >
      <div className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
        <h3 className="m-0 text-body-medium text-text-primary">{tr('title')}</h3>
        {extra}
      </div>
      <div className="p-5">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <DailyOutcomeChart
            data={report?.byDay ?? []}
            labels={{
              ariaLabel: tr('ariaLabel'),
              empty: tr('empty'),
              plays: tr('plays'),
              wins: tr('wins'),
              visits: tr('visits'),
              formatDay: (day) => formatShortDay(day, locale),
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Channel performance breakdown — rendered as a visual BoardUI card-list with progress bars
 * instead of a dense HTML table.
 */
export function ChannelsTableCard({
  report,
  loading,
}: {
  report?: CampaignReport;
  loading?: boolean;
}) {
  const tr = useTranslations('campaigns.report.channels');
  const format = useFormatter();
  const rows = report?.byChannel ?? [];
  const maxPlays = Math.max(1, ...rows.map((r) => r.plays));

  return (
    <div
      className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
      data-testid="channel-table"
      data-print-card
    >
      <div className="border-b border-separator-border px-5 py-3.5">
        <h3 className="m-0 text-body-medium text-text-primary">{tr('title')}</h3>
      </div>
      <div className="p-0">
        {loading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Caption>{tr('empty')}</Caption>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-separator-border p-0">
            {rows.map((row) => {
              const label = resolveChannelLabel(row.channel, (k) => tr(`known.${k}`));
              const sharePercent = Math.round((row.plays / maxPlays) * 100);
              const conversionRate = row.wins > 0 ? Math.round((row.visits / row.wins) * 100) : 0;

              return (
                <li key={row.channel ?? '__direct__'} className="flex flex-col gap-2 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-body-2-semibold text-text-primary">{label}</span>
                      {row.channel?.trim() && (
                        <Chip variant="caption" color="neutral" className="font-mono">
                          ?ch={row.channel}
                        </Chip>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-caption-1-regular text-text-secondary">
                        {tr('visits')}:
                      </span>
                      <span className="text-body-2-semibold tabular-nums text-teal-600 dark:text-teal-400">
                        {format.number(row.visits)}
                      </span>
                      {row.wins > 0 && (
                        <Chip variant="subtle" color="lime">
                          {conversionRate}%
                        </Chip>
                      )}
                    </div>
                  </div>

                  <ProgressBar value={sharePercent} size="sm" aria-label={label} />

                  <div className="flex flex-wrap items-center justify-between gap-3 text-caption-1-regular text-text-secondary">
                    <span>
                      {tr('plays')}:{' '}
                      <strong className="font-medium tabular-nums text-text-primary">
                        {format.number(row.plays)}
                      </strong>
                    </span>
                    <span>
                      {tr('wins')}:{' '}
                      <strong className="font-medium tabular-nums text-text-primary">
                        {format.number(row.wins)}
                      </strong>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Prize stock & redemption outcome card — rendered as a visual BoardUI card-list with progress bars
 * instead of a wide multi-column HTML table.
 */
export function PrizesOutcomeCard({
  orgId,
  campaign,
  report,
  loading,
  showEditLink = true,
  showRedeemedCost = false,
}: {
  orgId: string;
  campaign: Campaign;
  report?: CampaignReport;
  loading?: boolean;
  showEditLink?: boolean;
  showRedeemedCost?: boolean;
}) {
  const t = useTranslations('campaigns');
  const tr = useTranslations('campaigns.report.prizes');
  const format = useFormatter();
  const locale = useLocale();

  const rows: CampaignReport['byPrize'] =
    report && report.byPrize.length > 0
      ? report.byPrize
      : campaign.prizes.map((p) => ({
          prizeId: p.id,
          name: p.name,
          valueVnd: p.valueVnd,
          quantity: p.quantity,
          issued: 0,
          redeemed: 0,
          remaining: p.quantity,
        }));

  return (
    <div
      className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
      data-testid="prize-stock"
      data-print-card
    >
      <div className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
        <h3 className="m-0 text-body-medium text-text-primary">{tr('title')}</h3>
        {showEditLink && (
          <Link href={campaignRoutes(orgId).edit(campaign.id, 'rules')} data-print-hide>
            <Button variant="secondary" size="small" leadingIcon={Pencil} tabIndex={-1}>
              {t('stock.edit')}
            </Button>
          </Link>
        )}
      </div>
      <div className="p-0">
        {loading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Caption>{tr('empty')}</Caption>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-separator-border p-0">
            {rows.map((row) => {
              const percent = row.quantity ? Math.round((row.remaining / row.quantity) * 100) : 0;
              return (
                <li key={row.prizeId} className="flex flex-col gap-2 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="text-body-2-semibold text-text-primary">{row.name}</span>
                      <Caption className="block">
                        {tr('unitCost')}: {formatVnd(row.valueVnd, locale)}
                      </Caption>
                    </div>
                    {showRedeemedCost ? (
                      <div className="text-right">
                        <span className="block text-body-2-semibold tabular-nums text-text-primary">
                          {formatVnd(row.redeemed * row.valueVnd, locale)}
                        </span>
                        <Caption className="block">{tr('redeemedCost')}</Caption>
                      </div>
                    ) : (
                      <Caption className="tabular-nums">
                        {t('stock.left', { left: row.remaining, total: row.quantity })}
                      </Caption>
                    )}
                  </div>

                  <ProgressBar
                    value={percent}
                    aria-label={row.name}
                    size="sm"
                    className={cx('h-1.5', percent < 20 && '[&>div]:bg-rose-500')}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-caption-1-regular text-text-secondary">
                    <span>
                      {t('stock.issued', {
                        issued: format.number(row.issued),
                        redeemed: format.number(row.redeemed),
                      })}
                    </span>
                    {showRedeemedCost && (
                      <span className="font-medium tabular-nums text-text-primary">
                        {t('stock.left', { left: row.remaining, total: row.quantity })}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Full one-page outcome report (`/orgs/[orgId]/campaigns/[campaignId]/report`, PLB-04):
 * printable on A4 and readable on a phone.
 */
export function CampaignReportView({ orgId, campaignId }: { orgId: string; campaignId: string }) {
  const t = useTranslations('campaigns');
  const tr = useTranslations('campaigns.report');
  const tl = useTranslations('builderLab.home');
  const format = useFormatter();
  const locale = useLocale();
  const now = useNow({ updateInterval: 60_000 }).getTime();
  const campaignQuery = useCampaign(orgId, campaignId);
  const phase = campaignQuery.data ? campaignPhase(campaignQuery.data, now) : 'draft';
  const reportQuery = useCampaignReport(orgId, campaignId, {
    refetchInterval: phase === 'live' ? 30_000 : undefined,
  });
  const routes = campaignRoutes(orgId);

  if (campaignQuery.isPending || reportQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    );
  }
  if (campaignQuery.isError || !campaignQuery.data) {
    return (
      <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 text-center shadow-card">
        <p className="m-0 mb-4 text-body-medium text-text-secondary">{t('notFound')}</p>
        <Link href={routes.list}>
          <Button size="small">{t('backToList')}</Button>
        </Link>
      </div>
    );
  }
  if (reportQuery.isError || !reportQuery.data) {
    return <QueryError onRetry={() => reportQuery.refetch()} />;
  }

  const campaign = campaignQuery.data;
  const report = reportQuery.data;
  const insights = buildReportInsights(report, {
    day: (d) => formatShortDay(d, locale),
    vnd: (n) => formatVnd(n, locale),
    channel: (ch) => resolveChannelLabel(ch, (k) => tr(`channels.known.${k}`)),
  });

  return (
    <div className="flex flex-col gap-5" data-testid="campaign-one-page-report">
      <div data-print-hide>
        <PageHeader
          title={tr('pageTitle', { name: campaign.name })}
          tags={<PhaseTag phase={phase} />}
          description={`${tl(`templates.${campaign.templateKey}`)} · ${tl(`skins.${campaign.skinKey}`)} · ${campaignPeriod(format, campaign)}`}
          backHref={routes.detail(campaign.id)}
          backLabel={tr('backToCampaign')}
          extra={
            <Button size="small" leadingIcon={Printer} onClick={() => window.print()}>
              {tr('printPdf')}
            </Button>
          }
        />
      </div>

      <PlaybookGoalBanner campaign={campaign} report={report} showWhenCustom />

      <OutcomeMetricGrid campaign={campaign} report={report} />

      <div
        className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
        data-testid="report-insights"
        data-print-card
      >
        <div className="border-b border-separator-border px-5 py-3.5">
          <h3 className="m-0 text-body-medium text-text-primary">{tr('insights.title')}</h3>
        </div>
        <div className="space-y-3 p-5">
          {insights.map((insight) => (
            <div
              key={insight.key}
              className="flex items-start gap-2.5 text-body-2-regular text-text-primary"
              data-testid="report-insight-item"
              data-insight-key={insight.key}
            >
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-400" />
              <span>{tr(`insights.${insight.key}`, insight.values)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <DailyOutcomeCard report={report} />
        <ChannelsTableCard report={report} />
      </div>

      <PrizesOutcomeCard
        orgId={orgId}
        campaign={campaign}
        report={report}
        showEditLink={false}
        showRedeemedCost
      />
    </div>
  );
}
