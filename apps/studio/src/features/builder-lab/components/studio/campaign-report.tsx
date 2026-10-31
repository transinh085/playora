'use client';

import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
import { Progress } from '@playora/ui/components/progress';
import { Skeleton } from '@playora/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@playora/ui/components/table';
import { Coins, Lightbulb, Printer, Repeat, Target, TicketCheck, Wallet } from '@playora/ui/icons';
import { cn } from '@playora/ui/lib/utils';
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
    <Card
      className="rounded-lg border border-teal-500/25 bg-teal-50/50 p-4 shadow-xs dark:border-teal-500/30 dark:bg-teal-950/20"
      data-testid="playbook-highlight"
      data-playbook-goal={playbookKey}
      data-print-card
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <IconTile tone="primary" size={40}>
            <Target className="size-5" />
          </IconTile>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Caption>{tr('goalLabel')}</Caption>
              <Badge variant="secondary" className="font-normal">
                {title}
              </Badge>
            </div>
            <span className="block text-base font-semibold">{goal}</span>
            <Caption>
              {tr('periodLabel')}: {campaignPeriod(format, campaign)}
            </Caption>
          </div>
        </div>

        {highlightText && (
          <div data-testid="playbook-key-metric" className="text-right">
            <Caption className="block">{tr('keyMetricLabel')}</Caption>
            <span className="text-base font-bold tabular-nums text-primary">{highlightText}</span>
          </div>
        )}
      </div>
    </Card>
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
    <Card
      className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]"
      data-testid="daily-chart-card"
      data-print-card
    >
      <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-white/10">
        <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
          {tr('title')}
        </CardTitle>
        {extra}
      </CardHeader>
      <CardContent className="p-4">
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
      </CardContent>
    </Card>
  );
}

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

  return (
    <Card
      className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]"
      data-testid="channel-table"
      data-print-card
    >
      <CardHeader className="border-b border-neutral-200 px-4 py-3 dark:border-white/10">
        <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
          {tr('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400 dark:text-[#737373]">
            {tr('empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr('channel')}</TableHead>
                  <TableHead className="text-right">{tr('plays')}</TableHead>
                  <TableHead className="text-right">{tr('wins')}</TableHead>
                  <TableHead className="text-right">{tr('visits')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.channel ?? '__direct__'}>
                    <TableCell className="text-xs font-medium">
                      {resolveChannelLabel(row.channel, (k) => tr(`known.${k}`))}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-neutral-600 dark:text-[#A3A3A3]">
                      {format.number(row.plays)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-neutral-600 dark:text-[#A3A3A3]">
                      {format.number(row.wins)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums text-neutral-900 dark:text-[#FAFAFA]">
                      {format.number(row.visits)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
    <Card
      className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]"
      data-testid="prize-stock"
      data-print-card
    >
      <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-white/10">
        <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
          {tr('title')}
        </CardTitle>
        {showEditLink && (
          <Link
            href={campaignRoutes(orgId).edit(campaign.id, 'rules')}
            className="text-xs font-medium text-teal-600 hover:underline dark:text-teal-400"
            data-print-hide
          >
            {t('stock.edit')}
          </Link>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400 dark:text-[#737373]">
            {tr('empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr('name')}</TableHead>
                  <TableHead className="text-right">{tr('unitCost')}</TableHead>
                  <TableHead className="text-right">{tr('issued')}</TableHead>
                  <TableHead className="text-right">{tr('redeemed')}</TableHead>
                  <TableHead className="w-40">{tr('remaining')}</TableHead>
                  {showRedeemedCost && (
                    <TableHead className="text-right">{tr('redeemedCost')}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const percent = row.quantity
                    ? Math.round((row.remaining / row.quantity) * 100)
                    : 0;
                  return (
                    <TableRow key={row.prizeId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-neutral-900 dark:text-[#FAFAFA]">
                            {row.name}
                          </span>
                          <Caption className="text-[11px]">
                            {t('stock.issued', { issued: row.issued, redeemed: row.redeemed })}
                          </Caption>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-neutral-600 dark:text-[#A3A3A3]">
                        {formatVnd(row.valueVnd, locale)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-neutral-600 dark:text-[#A3A3A3]">
                        {format.number(row.issued)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold tabular-nums text-neutral-900 dark:text-[#FAFAFA]">
                        {format.number(row.redeemed)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Caption className="tabular-nums text-[11px]">
                            {t('stock.left', { left: row.remaining, total: row.quantity })}
                          </Caption>
                          <Progress
                            value={percent}
                            className={cn('h-1.5', percent < 20 && '[&>div]:bg-rose-500')}
                          />
                        </div>
                      </TableCell>
                      {showRedeemedCost && (
                        <TableCell className="text-right text-xs font-semibold tabular-nums text-neutral-900 dark:text-[#FAFAFA]">
                          {formatVnd(row.redeemed * row.valueVnd, locale)}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
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
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }
  if (campaignQuery.isError || !campaignQuery.data) {
    return (
      <div className="py-12 text-center text-neutral-500">
        <p className="mb-4 text-sm">{t('notFound')}</p>
        <Link href={routes.list}>
          <Button size="sm" className="h-8 rounded-md text-xs">
            {t('backToList')}
          </Button>
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
            <Button
              size="sm"
              className="gap-2 rounded-md h-8 text-xs shadow-xs"
              onClick={() => window.print()}
            >
              <Printer className="size-3.5" />
              {tr('printPdf')}
            </Button>
          }
        />
      </div>

      <PlaybookGoalBanner campaign={campaign} report={report} showWhenCustom />

      <OutcomeMetricGrid campaign={campaign} report={report} />

      <Card
        className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]"
        data-testid="report-insights"
        data-print-card
      >
        <CardHeader className="border-b border-neutral-200 px-4 py-3 dark:border-white/10">
          <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
            {tr('insights.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {insights.map((insight) => (
            <div
              key={insight.key}
              className="flex items-start gap-2.5 text-xs text-neutral-700 dark:text-[#D4D4D4]"
              data-testid="report-insight-item"
              data-insight-key={insight.key}
            >
              <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
              <span>{tr(`insights.${insight.key}`, insight.values)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

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
