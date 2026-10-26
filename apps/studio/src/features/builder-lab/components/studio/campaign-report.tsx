'use client';

import {
  Button,
  Card,
  Empty,
  Flex,
  Progress,
  Result,
  Skeleton,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import { Coins, Lightbulb, Printer, Repeat, Target, TicketCheck, Wallet } from 'lucide-react';
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
  const { token } = theme.useToken();

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
      variant="borderless"
      data-testid="playbook-highlight"
      data-playbook={playbookKey}
      data-print-card
      style={{
        border: `1px solid ${token.colorPrimaryBorder}`,
        background: token.colorPrimaryBg,
      }}
      styles={{ body: { padding: '14px 20px' } }}
    >
      <Flex align="center" justify="space-between" gap={16} wrap>
        <Flex align="center" gap={12} className="min-w-0">
          <IconTile tone="primary" size={40}>
            <Target className="size-5" />
          </IconTile>
          <div className="min-w-0">
            <Flex align="center" gap={8} wrap>
              <Caption>{tr('goalLabel')}</Caption>
              <Tag color="processing" className="!m-0">
                {title}
              </Tag>
            </Flex>
            <Typography.Text strong className="block" style={{ fontSize: 15 }}>
              {goal}
            </Typography.Text>
            <Caption>
              {tr('periodLabel')}: {campaignPeriod(format, campaign)}
            </Caption>
          </div>
        </Flex>
        {highlightText && (
          <div data-testid="playbook-key-metric">
            <Caption className="block">{tr('keyMetricLabel')}</Caption>
            <Typography.Text
              strong
              style={{ fontSize: 16, color: token.colorPrimary }}
              className="tabular-nums"
            >
              {highlightText}
            </Typography.Text>
          </div>
        )}
      </Flex>
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
  const { token } = theme.useToken();

  return (
    <Card
      variant="borderless"
      title={tr('title')}
      extra={extra}
      loading={loading}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      data-testid="daily-chart-card"
      data-print-card
    >
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
  const { token } = theme.useToken();
  const rows = report?.byChannel ?? [];

  return (
    <Card
      variant="borderless"
      title={tr('title')}
      loading={loading}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      styles={{ body: rows.length > 0 ? { padding: 0 } : undefined }}
      data-testid="channel-table"
      data-print-card
    >
      {rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tr('empty')} />
      ) : (
        <Table
          size="small"
          rowKey={(row) => row.channel ?? '__direct__'}
          pagination={false}
          dataSource={rows}
          columns={[
            {
              title: tr('channel'),
              dataIndex: 'channel',
              render: (ch: string | null) => (
                <Typography.Text strong>
                  {resolveChannelLabel(ch, (k) => tr(`known.${k}`))}
                </Typography.Text>
              ),
            },
            {
              title: tr('plays'),
              dataIndex: 'plays',
              align: 'right',
              render: (n: number) => <span className="tabular-nums">{format.number(n)}</span>,
            },
            {
              title: tr('wins'),
              dataIndex: 'wins',
              align: 'right',
              render: (n: number) => <span className="tabular-nums">{format.number(n)}</span>,
            },
            {
              title: tr('visits'),
              dataIndex: 'visits',
              align: 'right',
              render: (n: number) => (
                <Typography.Text strong className="tabular-nums">
                  {format.number(n)}
                </Typography.Text>
              ),
            },
          ]}
        />
      )}
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
  const { token } = theme.useToken();

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
      variant="borderless"
      title={tr('title')}
      extra={
        showEditLink ? (
          <Link href={campaignRoutes(orgId).edit(campaign.id, 'rules')} data-print-hide>
            {t('stock.edit')}
          </Link>
        ) : undefined
      }
      loading={loading}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      styles={{ body: rows.length > 0 ? { padding: 0 } : undefined }}
      data-testid="prize-stock"
      data-print-card
    >
      {rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tr('empty')} />
      ) : (
        <Table
          size="small"
          rowKey="prizeId"
          pagination={false}
          dataSource={rows}
          columns={[
            {
              title: tr('name'),
              dataIndex: 'name',
              render: (name: string, row) => (
                <div>
                  <Typography.Text strong>{name}</Typography.Text>
                  <Caption className="block">
                    {t('stock.issued', { issued: row.issued, redeemed: row.redeemed })}
                  </Caption>
                </div>
              ),
            },
            {
              title: tr('unitCost'),
              dataIndex: 'valueVnd',
              align: 'right',
              render: (v: number) => <span className="tabular-nums">{formatVnd(v, locale)}</span>,
            },
            {
              title: tr('issued'),
              dataIndex: 'issued',
              align: 'right',
              render: (n: number) => <span className="tabular-nums">{format.number(n)}</span>,
            },
            {
              title: tr('redeemed'),
              dataIndex: 'redeemed',
              align: 'right',
              render: (n: number) => (
                <Typography.Text strong className="tabular-nums">
                  {format.number(n)}
                </Typography.Text>
              ),
            },
            {
              title: tr('remaining'),
              key: 'remaining',
              width: 160,
              render: (_, row) => {
                const percent = row.quantity ? Math.round((row.remaining / row.quantity) * 100) : 0;
                return (
                  <div>
                    <Caption className="tabular-nums">
                      {t('stock.left', { left: row.remaining, total: row.quantity })}
                    </Caption>
                    <Progress
                      percent={percent}
                      showInfo={false}
                      size="small"
                      status={percent < 20 ? 'exception' : 'normal'}
                      className="!m-0"
                    />
                  </div>
                );
              },
            },
            ...(showRedeemedCost
              ? [
                  {
                    title: tr('redeemedCost'),
                    key: 'redeemedCost',
                    align: 'right' as const,
                    render: (_: unknown, row: CampaignReport['byPrize'][number]) => (
                      <Typography.Text strong className="tabular-nums">
                        {formatVnd(row.redeemed * row.valueVnd, locale)}
                      </Typography.Text>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}
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
  const { token } = theme.useToken();
  const campaignQuery = useCampaign(orgId, campaignId);
  const phase = campaignQuery.data ? campaignPhase(campaignQuery.data, now) : 'draft';
  const reportQuery = useCampaignReport(orgId, campaignId, {
    refetchInterval: phase === 'live' ? 30_000 : undefined,
  });
  const routes = campaignRoutes(orgId);

  if (campaignQuery.isPending || reportQuery.isPending) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }
  if (campaignQuery.isError || !campaignQuery.data) {
    return (
      <Result
        status="404"
        title={t('notFound')}
        extra={
          <Link href={routes.list}>
            <Button type="primary">{t('backToList')}</Button>
          </Link>
        }
      />
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
    <Flex vertical gap={20} data-testid="campaign-one-page-report">
      <div data-print-hide>
        <PageHeader
          title={tr('pageTitle', { name: campaign.name })}
          tags={<PhaseTag phase={phase} />}
          description={`${tl(`templates.${campaign.templateKey}`)} · ${tl(`skins.${campaign.skinKey}`)} · ${campaignPeriod(format, campaign)}`}
          backHref={routes.detail(campaign.id)}
          backLabel={tr('backToCampaign')}
          extra={
            <Button
              type="primary"
              icon={<Printer className="size-4" />}
              onClick={() => window.print()}
            >
              {tr('printPdf')}
            </Button>
          }
        />
      </div>

      <PlaybookGoalBanner campaign={campaign} report={report} showWhenCustom />

      <OutcomeMetricGrid campaign={campaign} report={report} />

      <Card
        variant="borderless"
        title={tr('insights.title')}
        style={{ border: `1px solid ${token.colorBorderSecondary}` }}
        data-testid="report-insights"
        data-print-card
      >
        <Flex vertical gap={12}>
          {insights.map((insight) => (
            <Flex
              key={insight.key}
              align="start"
              gap={10}
              data-testid="report-insight-item"
              data-insight-key={insight.key}
            >
              <Lightbulb className="mt-0.5 size-4 shrink-0" style={{ color: token.colorPrimary }} />
              <Typography.Text>{tr(`insights.${insight.key}`, insight.values)}</Typography.Text>
            </Flex>
          ))}
        </Flex>
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
    </Flex>
  );
}
