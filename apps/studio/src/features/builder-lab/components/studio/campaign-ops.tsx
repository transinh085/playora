'use client';

import { isValidZaloOaUrl, type VoucherStatus } from '@playora/contracts';
import {
  Button,
  Card,
  Chip,
  Input,
  Modal,
  ProgressBar,
  Skeleton,
  Table,
  Tabs,
  toast,
} from '@playora/ui/components';
import {
  CircleX,
  Download,
  ExternalLink,
  FileText,
  Pause,
  Pencil,
  Play,
  Plus,
  Share2,
  Square,
  Store,
  Trash2,
  TriangleAlert,
} from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useFormatter, useLocale, useNow, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Caption } from '@/components/caption';
import { PageHeader } from '@/components/page-header';
import { QueryError } from '@/components/query-error';
import { useCampaignActionError } from '@/features/billing/components/plan-limit';
import {
  type Campaign,
  type CampaignPlay,
  type CampaignPlayerItem,
  type CampaignReport,
  type CampaignVoucher,
  useAdjustPrizeStock,
  useCampaign,
  useCampaignPlayers,
  useCampaignPlays,
  useCampaignReport,
  useCampaignStats,
  useCampaignVouchers,
  useDeleteCampaign,
  useEndCampaign,
  useExportCampaignCsv,
  usePauseCampaign,
  usePublishCampaign,
  useResumeCampaign,
  useUpdateCampaign,
} from '../../api';
import { campaignPhase, isRunning } from '../../lib/phase';
import { preflight } from '../../lib/preflight';
import { computePacingMonitor, formatCount } from '../../lib/report';
import { campaignRoutes } from '../../lib/routes';
import { formatVnd, isoToLocalInput, localInputToIso } from '../../lib/rules-format';
import { campaignPeriod } from './campaign-period';
import {
  ChannelsTableCard,
  DailyOutcomeCard,
  OutcomeMetricGrid,
  PlaybookGoalBanner,
  PrizesOutcomeCard,
  resolveChannelLabel,
} from './campaign-report';
import { CampaignShareView } from './campaign-share-view';
import { PhaseTag } from './phase-tag';
import { PlaybookTag } from './playbook-tag';

const TABS = ['overview', 'share', 'prizes', 'players', 'settings'] as const;
type TabKey = (typeof TABS)[number];

function triggerCsvDownload(filename: string, csvContent: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function CampaignOps({ orgId, campaignId }: { orgId: string; campaignId: string }) {
  const t = useTranslations('campaigns');
  const tl = useTranslations('builderLab.home');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 }).getTime();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = useCampaign(orgId, campaignId);
  const routes = campaignRoutes(orgId);

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Card className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 text-center shadow-card">
        <Card.Content className="p-0">
          <p className="m-0 mb-4 text-body-medium text-text-secondary">{t('notFound')}</p>
          <Link href={routes.list}>
            <Button size="sm">{t('backToList')}</Button>
          </Link>
        </Card.Content>
      </Card>
    );
  }

  const campaign = query.data;
  const phase = campaignPhase(campaign, now);
  const requested = params.get('tab') as TabKey | null;
  const tab: TabKey = requested && TABS.includes(requested) ? requested : 'overview';
  const setTab = (key: string) => router.replace(`${pathname}?tab=${key}` as never);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={campaign.name}
        tags={
          <div className="flex items-center gap-1.5">
            <PhaseTag phase={phase} />
            <PlaybookTag playbook={campaign.playbook} />
          </div>
        }
        description={`${tl(`templates.${campaign.templateKey}`)} · ${tl(`skins.${campaign.skinKey}`)} · ${campaignPeriod(format, campaign)}${campaign.version ? ` · v${campaign.version}` : ''}`}
        backHref={routes.list}
        backLabel={t('backToList')}
        extra={<HeaderActions orgId={orgId} campaign={campaign} />}
      />

      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))} className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label={campaign.name} className="w-fit">
            {TABS.map((key) => (
              <Tabs.Tab key={key} id={key}>
                {t(`tabs.${key}`)}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      {tab === 'overview' && <OverviewTab orgId={orgId} campaign={campaign} />}
      {tab === 'share' && <ShareTab orgId={orgId} campaign={campaign} />}
      {tab === 'prizes' && <PrizesTab orgId={orgId} campaign={campaign} />}
      {tab === 'players' && <PlayersTab orgId={orgId} campaign={campaign} />}
      {tab === 'settings' && <SettingsTab orgId={orgId} campaign={campaign} />}
    </div>
  );
}

function HeaderActions({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const phase = campaignPhase(campaign);
  const routes = campaignRoutes(orgId);
  const resume = useResumeCampaign(orgId);
  const onActionError = useCampaignActionError(orgId);

  const reportLink = (
    <Link href={routes.report(campaign.id)}>
      <Button variant="secondary" size="sm" excludeFromTabOrder>
        <FileText className="size-4" />
        {t('viewReport')}
      </Button>
    </Link>
  );

  const edit = (
    <Link href={routes.edit(campaign.id)}>
      <Button variant={phase === 'draft' ? 'primary' : 'secondary'} size="sm" excludeFromTabOrder>
        <Pencil className="size-4" />
        {phase === 'draft' ? t('continueEditing') : t('editDesign')}
      </Button>
    </Link>
  );

  const share = (
    <Link href={routes.share(campaign.id)}>
      <Button variant="secondary" size="sm" excludeFromTabOrder>
        <Share2 className="size-4" />
        {t('share.action')}
      </Button>
    </Link>
  );

  if (phase === 'draft') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {edit}
        {share}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {reportLink}
      {edit}
      {share}
      {phase === 'paused' ? (
        <Button
          size="sm"
          isDisabled={resume.isPending}
          onClick={() => resume.mutate(campaign.id, { onError: onActionError })}
        >
          <Play className="size-4" />
          {t('resume')}
        </Button>
      ) : (
        <a href={routes.play(campaign.slug)} target="_blank" rel="noreferrer">
          <Button size="sm" excludeFromTabOrder>
            <ExternalLink className="size-4" />
            {t('openPlay')}
          </Button>
        </a>
      )}
    </div>
  );
}

function OverviewTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const tr = useTranslations('campaigns.report');
  const phase = campaignPhase(campaign);
  const isLive = phase === 'live';
  const report = useCampaignReport(orgId, campaign.id, {
    refetchInterval: isLive ? 30_000 : undefined,
  });

  return (
    <div className="flex flex-col gap-5">
      {campaign.status === 'draft' && <DraftChecklist orgId={orgId} campaign={campaign} />}
      {report.isError && <QueryError onRetry={() => report.refetch()} />}
      <PlaybookGoalBanner campaign={campaign} report={report.data} />
      <OutcomeMetricGrid campaign={campaign} report={report.data} loading={report.isPending} />
      {report.data && <PacingMonitorCard orgId={orgId} campaign={campaign} report={report.data} />}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <DailyOutcomeCard
          report={report.data}
          loading={report.isPending}
          extra={isLive ? <Caption>{tr('autoRefreshHint')}</Caption> : undefined}
        />
        <ChannelsTableCard report={report.data} loading={report.isPending} />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <PrizesOutcomeCard
          orgId={orgId}
          campaign={campaign}
          report={report.data}
          loading={report.isPending}
        />
        <RecentPlays orgId={orgId} campaign={campaign} />
      </div>
    </div>
  );
}

/**
 * Prize Pacing & Stock Forecast card (`PRZ-22`):
 * compares actual daily plays vs expected traffic, projects stock exhaustion/surplus at `endsAt`,
 * and offers a 1-click win-rate adjustment when off-track.
 */
function PacingMonitorCard({
  orgId,
  campaign,
  report,
}: {
  orgId: string;
  campaign: Campaign;
  report: CampaignReport;
}) {
  const t = useTranslations('campaigns.pacing');
  const locale = useLocale();
  const update = useUpdateCampaign(orgId, campaign.id);
  const publish = usePublishCampaign(orgId, campaign.id);
  const pacing = computePacingMonitor(campaign, report);

  if (!pacing) return null;

  const statusLabel =
    pacing.status === 'exhausting_early'
      ? t('statusExhaustingEarly')
      : pacing.status === 'surplus_remaining'
        ? t('statusSurplusRemaining')
        : t('statusOnTrack');

  const statusColor =
    pacing.status === 'exhausting_early'
      ? 'danger'
      : pacing.status === 'surplus_remaining'
        ? 'warning'
        : 'success';

  const suggestedPercent =
    pacing.suggestedWinRate !== null ? Math.round(pacing.suggestedWinRate * 100) : null;
  const trafficRatioPercent =
    pacing.expectedDailyPlays > 0
      ? Math.round((pacing.actualDailyPlays / pacing.expectedDailyPlays) * 100)
      : null;

  const applySuggestedWinRate = async () => {
    if (pacing.suggestedWinRate === null || suggestedPercent === null) return;
    await update.mutateAsync({
      rules: { ...campaign.rules, overallWinRate: pacing.suggestedWinRate },
    });
    if (campaign.status === 'published') {
      await publish.mutateAsync();
    }
    toast.success(t('winRateAdjusted', { rate: suggestedPercent }));
  };

  return (
    <Card
      className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
      data-testid="pacing-monitor-card"
      data-pacing-status={pacing.status}
    >
      <Card.Header className="flex flex-wrap items-center justify-between gap-2 border-b border-separator-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Card.Title className="m-0 text-body-medium text-text-primary">{t('title')}</Card.Title>
          <Chip variant="soft" color={statusColor} size="sm">
            {statusLabel}
          </Chip>
        </div>
        {suggestedPercent !== null && (
          <Button
            size="sm"
            variant="secondary"
            isDisabled={update.isPending || publish.isPending}
            onClick={applySuggestedWinRate}
            data-testid="pacing-adjust-winrate"
          >
            {t('adjustWinRateCta', { rate: suggestedPercent })}
          </Button>
        )}
      </Card.Header>
      <Card.Content className="space-y-2 p-5">
        <p className="m-0 text-body-2-medium text-text-primary">
          {pacing.expectedDailyPlays && trafficRatioPercent !== null
            ? t('actualVsExpected', {
                actual: formatCount(pacing.actualDailyPlays, locale),
                expected: formatCount(pacing.expectedDailyPlays, locale),
                percent: trafficRatioPercent,
              })
            : t('actualOnly', {
                actual: formatCount(pacing.actualDailyPlays, locale),
              })}
        </p>
        <Caption className="block">
          {pacing.status === 'exhausting_early' && pacing.projectedDaysToExhaust !== null
            ? t('projectionExhaust', {
                days: formatCount(pacing.projectedDaysToExhaust, locale),
              })
            : pacing.status === 'surplus_remaining'
              ? t('projectionSurplus', {
                  surplus: formatCount(pacing.projectedSurplusStock, locale),
                })
              : t('projectionOnTrack', {
                  daysLeft: formatCount(pacing.remainingDays, locale),
                })}
        </Caption>
      </Card.Content>
    </Card>
  );
}

function DraftChecklist({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const tp = useTranslations('builderLab.publish');
  const issues = preflight(campaign);
  const errors = issues.filter((issue) => issue.level === 'error');
  const routes = campaignRoutes(orgId);

  return (
    <Card
      className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
      data-testid="draft-checklist"
    >
      <Card.Header className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
        <Card.Title className="m-0 text-body-medium text-text-primary">
          {errors.length ? t('draft.blocked', { count: errors.length }) : t('draft.ready')}
        </Card.Title>
      </Card.Header>
      <Card.Content className="space-y-3 p-5">
        <Caption>{t('draft.hint')}</Caption>
        {issues.map((issue) => {
          const Icon = issue.level === 'error' ? CircleX : TriangleAlert;
          return (
            <div key={issue.id} className="flex items-center gap-2.5 text-body-2-regular">
              <Icon
                className={cx(
                  'size-4 shrink-0',
                  issue.level === 'error' ? 'text-rose-500' : 'text-amber-500',
                )}
              />
              <span className="flex-1 text-text-primary">
                {tp(`issues.${issue.code}`, issue.params)}
              </span>
              <Link
                href={routes.edit(campaign.id, issue.where.area === 'screens' ? 'quick' : 'rules')}
                className="text-caption-1-semibold text-teal-600 hover:underline dark:text-teal-400"
              >
                {t('draft.fix')}
              </Link>
            </div>
          );
        })}
        <div className="pt-1">
          <a href={routes.rehearsal(campaign.id)} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" excludeFromTabOrder>
              <Play className="size-4" />
              {t('rehearse')}
            </Button>
          </a>
        </div>
      </Card.Content>
    </Card>
  );
}

/**
 * Recent plays feed in Overview tab — rendered as a clean HeroUI activity list (`ul/li`)
 * instead of a table.
 */
function RecentPlays({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const format = useFormatter();
  const isLive = campaignPhase(campaign) === 'live';
  const plays = useCampaignPlays(orgId, campaign.id, {
    refetchInterval: isLive ? 30_000 : undefined,
  });
  const recent = (plays.data ?? []).slice(0, 8);
  const prizeName = (id: string | null) => campaign.prizes.find((p) => p.id === id)?.name ?? '—';
  const routes = campaignRoutes(orgId);

  return (
    <Card className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
      <Card.Header className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
        <Card.Title className="m-0 text-body-medium text-text-primary">
          {t('recent.title')}
        </Card.Title>
      </Card.Header>
      <Card.Content className="p-0">
        {plays.isPending ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : recent.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Caption>{t('recent.empty')}</Caption>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-separator-border p-0">
            {recent.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-background-secondary-default/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Chip
                    variant={row.outcome === 'win' ? 'primary' : 'soft'}
                    color={row.outcome === 'win' ? 'success' : 'default'}
                  >
                    {t(`outcome.${row.outcome}`)}
                  </Chip>
                  <div className="min-w-0">
                    <span className="block truncate text-body-2-medium text-text-primary">
                      {prizeName(row.prizeId)}
                    </span>
                    <Caption className="block">
                      {format.dateTime(new Date(row.at), {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </Caption>
                  </div>
                </div>
                {row.voucherCode && (
                  <Link href={`${routes.redeem}?code=${row.voucherCode}` as Route}>
                    <Chip
                      variant="soft"
                      color="default"
                      size="sm"
                      className="cursor-pointer font-mono"
                    >
                      {row.voucherCode}
                    </Chip>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
}

function PlaysTable({
  campaign,
  rows,
  compact,
}: {
  campaign: Campaign;
  rows: CampaignPlay[];
  compact?: boolean;
}) {
  const t = useTranslations('campaigns');
  const trCh = useTranslations('campaigns.report.channels');
  const format = useFormatter();
  const prizeName = (id: string | null) => campaign.prizes.find((p) => p.id === id)?.name ?? '—';

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label={t('tabs.players')}>
          <Table.Header>
            <Table.Column isRowHeader>{t('players.time')}</Table.Column>
            {!compact && <Table.Column>{t('players.player')}</Table.Column>}
            <Table.Column>{t('players.outcome')}</Table.Column>
            <Table.Column>{t('players.prize')}</Table.Column>
            {!compact && <Table.Column>{t('players.channel')}</Table.Column>}
            {!compact && <Table.Column>{t('players.code')}</Table.Column>}
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={row.id} id={row.id}>
                <Table.Cell className="text-body-2-regular text-text-secondary">
                  {format.dateTime(new Date(row.at), { dateStyle: 'short', timeStyle: 'short' })}
                </Table.Cell>
                {!compact && (
                  <Table.Cell className="font-mono text-caption-1-medium text-text-primary">
                    {row.playerName || row.playerId.slice(0, 8)}
                  </Table.Cell>
                )}
                <Table.Cell>
                  <Chip
                    variant={row.outcome === 'win' ? 'primary' : 'soft'}
                    color={row.outcome === 'win' ? 'success' : 'default'}
                  >
                    {t(`outcome.${row.outcome}`)}
                  </Chip>
                </Table.Cell>
                <Table.Cell className="text-body-2-regular text-text-primary">
                  {prizeName(row.prizeId)}
                </Table.Cell>
                {!compact && (
                  <Table.Cell className="text-body-2-regular text-text-secondary">
                    {resolveChannelLabel(row.channel, (k) => trCh(`known.${k}`))}
                  </Table.Cell>
                )}
                {!compact && (
                  <Table.Cell className="font-mono text-caption-1-medium text-text-primary">
                    {row.voucherCode ?? '—'}
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

function ShareTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  return <CampaignShareView orgId={orgId} campaignId={campaign.id} embedded />;
}

function PrizeStock({
  orgId,
  campaign,
  report,
}: {
  orgId: string;
  campaign: Campaign;
  report?: CampaignReport;
}) {
  const t = useTranslations('campaigns');
  const trPrizes = useTranslations('campaigns.report.prizes');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const format = useFormatter();
  const stats = useCampaignStats(orgId, campaign.id);
  const adjustStock = useAdjustPrizeStock(orgId, campaign.id);
  const [adjustingPrizeId, setAdjustingPrizeId] = useState<string | null>(null);
  const [deltaInput, setDeltaInput] = useState('10');

  const prizeRows = campaign.prizes.map((prize) => {
    const byPrize = report?.byPrize.find((p) => p.prizeId === prize.id);
    const quantity = byPrize?.quantity ?? prize.quantity;
    const remaining =
      byPrize?.remaining ?? stats.data?.remainingByPrize[prize.id] ?? prize.quantity;
    const issued = byPrize?.issued ?? Math.max(0, quantity - remaining);
    const redeemed = byPrize?.redeemed ?? 0;
    const valueVnd = byPrize?.valueVnd ?? prize.valueVnd;
    return {
      id: prize.id,
      name: prize.name,
      quantity,
      remaining,
      issued,
      redeemed,
      valueVnd,
    };
  });

  const activePrize = prizeRows.find((p) => p.id === adjustingPrizeId) ?? null;

  const submitStockAdjust = async () => {
    if (!activePrize) return;
    const delta = Number.parseInt(deltaInput, 10);
    if (Number.isNaN(delta) || delta === 0) return;
    await adjustStock.mutateAsync({ prizeId: activePrize.id, delta });
    toast.success(t('stock.adjusted'));
    setAdjustingPrizeId(null);
  };

  return (
    <Card
      className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
      data-testid="prize-stock"
    >
      <Card.Header className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
        <Card.Title className="m-0 text-body-medium text-text-primary">
          {t('stock.title')}
        </Card.Title>
        <Link href={campaignRoutes(orgId).edit(campaign.id, 'rules')}>
          <Button variant="secondary" size="sm" excludeFromTabOrder>
            <Pencil className="size-4" />
            {t('stock.edit')}
          </Button>
        </Link>
      </Card.Header>
      <Card.Content className="space-y-4 p-5">
        {prizeRows.map((prize) => {
          const percent = prize.quantity ? Math.round((prize.remaining / prize.quantity) * 100) : 0;
          const redemptionRate =
            prize.issued > 0 ? Math.round((prize.redeemed / prize.issued) * 100) : 0;
          const isLowRedemption = prize.issued >= 30 && prize.redeemed / prize.issued < 0.5;

          return (
            <div
              key={prize.id}
              className="space-y-2 border-b border-separator-border pb-4 last:border-b-0 last:pb-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-body-2-medium text-text-primary">{prize.name}</span>
                  <Caption className="block">
                    {trPrizes('unitCost')}: {formatVnd(prize.valueVnd, locale)} ·{' '}
                    {trPrizes('redeemedCost')}: {formatVnd(prize.redeemed * prize.valueVnd, locale)}
                  </Caption>
                </div>
                <Caption className="tabular-nums">
                  {t('stock.left', { left: prize.remaining, total: prize.quantity })}
                </Caption>
              </div>
              <ProgressBar
                value={percent}
                aria-label={prize.name}
                size="sm"
                color={percent < 20 ? 'danger' : 'accent'}
              >
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Caption>
                  {t('stock.issued', {
                    issued: format.number(prize.issued),
                    redeemed: format.number(prize.redeemed),
                  })}
                  {prize.issued > 0 ? ` (${redemptionRate}%)` : ''}
                </Caption>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDeltaInput('10');
                    setAdjustingPrizeId(prize.id);
                  }}
                  data-testid="adjust-stock-button"
                >
                  <Plus className="size-3.5" />
                  {t('stock.adjust')}
                </Button>
              </div>
              {isLowRedemption && (
                <div data-testid="low-redemption-warning">
                  <Chip variant="soft" color="warning" size="sm">
                    <TriangleAlert className="mr-1 size-3.5" />
                    {t('stock.lowRedemptionWarning', { rate: redemptionRate })}
                  </Chip>
                </div>
              )}
            </div>
          );
        })}
      </Card.Content>

      <Modal
        isOpen={Boolean(activePrize)}
        onOpenChange={(open) => {
          if (!open) setAdjustingPrizeId(null);
        }}
      >
        <Modal.Backdrop isDismissable>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>
                  {t('stock.adjustTitle', { prize: activePrize?.name ?? '' })}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-3 py-2">
                {activePrize && (
                  <Caption className="block">
                    {t('stock.adjustHint', {
                      remaining: activePrize.remaining,
                      quantity: activePrize.quantity,
                      issued: activePrize.issued,
                    })}
                  </Caption>
                )}
                <div className="space-y-1">
                  <span className="text-body-2-medium text-text-primary">
                    {t('stock.adjustDelta')}
                  </span>
                  <Input
                    type="number"
                    value={deltaInput}
                    onChange={(e) => setDeltaInput(e.target.value)}
                    fullWidth
                    className="font-mono"
                    data-testid="adjust-stock-delta-input"
                  />
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" onClick={() => setAdjustingPrizeId(null)}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  size="sm"
                  isDisabled={
                    adjustStock.isPending ||
                    !deltaInput.trim() ||
                    Number.isNaN(Number.parseInt(deltaInput, 10)) ||
                    Number.parseInt(deltaInput, 10) === 0
                  }
                  onClick={submitStockAdjust}
                  data-testid="adjust-stock-submit"
                >
                  {tCommon('save')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Card>
  );
}

const VOUCHER_STATUS_FILTERS: Array<'all' | VoucherStatus> = [
  'all',
  'issued',
  'redeemed',
  'expired',
  'void',
];

function PrizesTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const format = useFormatter();
  const report = useCampaignReport(orgId, campaign.id);
  const exportCsv = useExportCampaignCsv(orgId, campaign.id);

  const [statusFilter, setStatusFilter] = useState<'all' | VoucherStatus>('all');
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [extraRows, setExtraRows] = useState<CampaignVoucher[]>([]);

  const vouchers = useCampaignVouchers(orgId, campaign.id, {
    status: statusFilter === 'all' ? undefined : statusFilter,
    cursor,
    limit: 50,
  });

  const baseRows = cursor ? [...extraRows, ...(vouchers.data ?? [])] : (vouchers.data ?? []);
  const filteredRows = search.trim()
    ? baseRows.filter((row) => {
        const q = search.trim().toLowerCase();
        return (
          row.code.toLowerCase().includes(q) || (row.playerName ?? '').toLowerCase().includes(q)
        );
      })
    : baseRows;

  const prizeName = (id: string) => campaign.prizes.find((p) => p.id === id)?.name ?? '—';

  const handleExportVouchers = async () => {
    const res = await exportCsv.mutateAsync('vouchers');
    triggerCsvDownload(res.filename, res.csv);
    toast.success(t('stock.exported'));
  };

  const renderStatusChip = (status: VoucherStatus) => {
    if (status === 'redeemed') {
      return (
        <Chip variant="primary" color="success">
          {t('vouchers.redeemed')}
        </Chip>
      );
    }
    if (status === 'expired') {
      return (
        <Chip variant="soft" color="warning">
          {t('vouchers.expired')}
        </Chip>
      );
    }
    if (status === 'void') {
      return (
        <Chip variant="soft" color="danger">
          {t('vouchers.void')}
        </Chip>
      );
    }
    return (
      <Chip variant="soft" color="default">
        {t('vouchers.pending')}
      </Chip>
    );
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <PrizeStock orgId={orgId} campaign={campaign} report={report.data} />
      <Card className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
        <Card.Header className="flex flex-wrap items-center justify-between gap-2 border-b border-separator-border px-5 py-3.5">
          <Card.Title className="m-0 text-body-medium text-text-primary">
            {t('vouchers.title')}
          </Card.Title>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              isDisabled={exportCsv.isPending}
              onClick={handleExportVouchers}
              data-testid="export-csv-button"
            >
              <Download className="size-4" />
              {t('stock.exportCsv')}
            </Button>
            <Link href={campaignRoutes(orgId).redeem}>
              <Button variant="secondary" size="sm" excludeFromTabOrder>
                <Store className="size-4" />
                {t('vouchers.desk')}
              </Button>
            </Link>
          </div>
        </Card.Header>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator-border px-5 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {VOUCHER_STATUS_FILTERS.map((st) => {
              const active = statusFilter === st;
              const label =
                st === 'all'
                  ? t('vouchers.filterAll')
                  : st === 'issued'
                    ? t('vouchers.pending')
                    : t(`vouchers.${st}`);
              return (
                <Button
                  key={st}
                  size="sm"
                  variant={active ? 'primary' : 'secondary'}
                  onClick={() => {
                    setStatusFilter(st);
                    setCursor(undefined);
                    setExtraRows([]);
                  }}
                  data-testid={`voucher-filter-${st}`}
                >
                  {label}
                </Button>
              );
            })}
          </div>
          <Input
            placeholder={t('vouchers.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
            data-testid="voucher-search-input"
          />
        </div>
        <Card.Content className="p-0">
          {vouchers.isPending && !cursor ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Caption>{t('vouchers.empty')}</Caption>
            </div>
          ) : (
            <>
              <Table>
                <Table.ScrollContainer>
                  <Table.Content aria-label={t('vouchers.title')}>
                    <Table.Header>
                      <Table.Column isRowHeader>{t('vouchers.code')}</Table.Column>
                      <Table.Column>{t('players.player')}</Table.Column>
                      <Table.Column>{t('players.prize')}</Table.Column>
                      <Table.Column>{t('vouchers.issued')}</Table.Column>
                      <Table.Column>{t('vouchers.expiresAt')}</Table.Column>
                      <Table.Column>{t('vouchers.status')}</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {filteredRows.map((row) => (
                        <Table.Row key={row.code} id={row.code}>
                          <Table.Cell className="font-mono text-caption-1-semibold text-text-primary">
                            {row.code}
                          </Table.Cell>
                          <Table.Cell className="text-body-2-regular text-text-primary">
                            {row.playerName || '—'}
                          </Table.Cell>
                          <Table.Cell className="text-body-2-regular text-text-primary">
                            {prizeName(row.prizeId)}
                          </Table.Cell>
                          <Table.Cell className="text-body-2-regular text-text-secondary">
                            {format.dateTime(new Date(row.issuedAt), {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </Table.Cell>
                          <Table.Cell className="text-body-2-regular text-text-secondary">
                            {row.expiresAt
                              ? format.dateTime(new Date(row.expiresAt), {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : '—'}
                          </Table.Cell>
                          <Table.Cell>{renderStatusChip(row.status)}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
              {vouchers.nextCursor && (
                <div className="flex justify-center border-t border-separator-border p-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    isDisabled={vouchers.isFetching}
                    onClick={() => {
                      setExtraRows(baseRows);
                      setCursor(vouchers.nextCursor ?? undefined);
                    }}
                  >
                    {t('vouchers.loadMore')}
                  </Button>
                </div>
              )}
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}

function PlayersTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const format = useFormatter();
  const exportCsv = useExportCampaignCsv(orgId, campaign.id);

  const [view, setView] = useState<'directory' | 'history'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [playersCursor, setPlayersCursor] = useState<string | undefined>(undefined);
  const [extraPlayers, setExtraPlayers] = useState<CampaignPlayerItem[]>([]);

  const [playsCursor, setPlaysCursor] = useState<string | undefined>(undefined);
  const [extraPlays, setExtraPlays] = useState<CampaignPlay[]>([]);

  const playersQuery = useCampaignPlayers(orgId, campaign.id, {
    query: searchQuery.trim() || undefined,
    cursor: playersCursor,
    limit: 50,
  });

  const playsQuery = useCampaignPlays(orgId, campaign.id, {
    cursor: playsCursor,
    limit: 50,
  });

  const playerRows = playersCursor
    ? [...extraPlayers, ...(playersQuery.data ?? [])]
    : (playersQuery.data ?? []);
  const playRows = playsCursor
    ? [...extraPlays, ...(playsQuery.data ?? [])]
    : (playsQuery.data ?? []);

  const handleExportPlayers = async () => {
    const res = await exportCsv.mutateAsync('players');
    triggerCsvDownload(res.filename, res.csv);
    toast.success(t('stock.exported'));
  };

  return (
    <Card className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
      <Card.Header className="flex flex-wrap items-center justify-between gap-3 border-b border-separator-border px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={view === 'directory' ? 'primary' : 'secondary'}
            onClick={() => setView('directory')}
            data-testid="players-directory-tab"
          >
            {t('players.directoryTab')}
          </Button>
          <Button
            size="sm"
            variant={view === 'history' ? 'primary' : 'secondary'}
            onClick={() => setView('history')}
            data-testid="players-history-tab"
          >
            {t('players.historyTab')}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view === 'directory' && (
            <Input
              placeholder={t('players.search')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPlayersCursor(undefined);
                setExtraPlayers([]);
              }}
              className="w-64"
              data-testid="players-search-input"
            />
          )}
          <Button
            variant="secondary"
            size="sm"
            isDisabled={exportCsv.isPending}
            onClick={handleExportPlayers}
            data-testid="export-csv-button"
          >
            <Download className="size-4" />
            {t('players.exportCsv')}
          </Button>
        </div>
      </Card.Header>
      <Card.Content className="p-0">
        {view === 'directory' ? (
          <div data-testid="players-directory">
            {playersQuery.isPending && !playersCursor ? (
              <div className="space-y-2 p-5">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : playerRows.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Caption>{t('players.emptyPlayers')}</Caption>
              </div>
            ) : (
              <>
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content aria-label={t('players.directoryTab')}>
                      <Table.Header>
                        <Table.Column isRowHeader>{t('players.player')}</Table.Column>
                        <Table.Column>{t('players.phone')}</Table.Column>
                        <Table.Column>{t('players.playsCount')}</Table.Column>
                        <Table.Column>{t('players.winsCount')}</Table.Column>
                        <Table.Column>{t('players.consent')}</Table.Column>
                        <Table.Column>{t('players.joinedAt')}</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {playerRows.map((p) => (
                          <Table.Row key={p.id} id={p.id}>
                            <Table.Cell className="text-body-2-medium text-text-primary">
                              {p.name || p.id.slice(0, 8)}
                            </Table.Cell>
                            <Table.Cell className="font-mono text-caption-1-medium text-text-secondary">
                              {p.phoneMasked ?? '—'}
                            </Table.Cell>
                            <Table.Cell className="tabular-nums text-body-2-regular text-text-primary">
                              {format.number(p.playsCount)}
                            </Table.Cell>
                            <Table.Cell className="tabular-nums text-body-2-regular text-text-primary">
                              {format.number(p.winsCount)}
                            </Table.Cell>
                            <Table.Cell>
                              <Chip
                                variant="soft"
                                color={p.marketingConsent ? 'success' : 'default'}
                                size="sm"
                              >
                                {p.marketingConsent
                                  ? t('players.consentYes')
                                  : t('players.consentNo')}
                              </Chip>
                            </Table.Cell>
                            <Table.Cell className="text-body-2-regular text-text-secondary">
                              {format.dateTime(new Date(p.createdAt), {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
                {playersQuery.nextCursor && (
                  <div className="flex justify-center border-t border-separator-border p-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      isDisabled={playersQuery.isFetching}
                      onClick={() => {
                        setExtraPlayers(playerRows);
                        setPlayersCursor(playersQuery.nextCursor ?? undefined);
                      }}
                    >
                      {t('players.loadMore')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div data-testid="players-history">
            {playsQuery.isPending && !playsCursor ? (
              <div className="space-y-2 p-5">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : playRows.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Caption>{t('recent.empty')}</Caption>
              </div>
            ) : (
              <>
                <PlaysTable campaign={campaign} rows={playRows} />
                {playsQuery.nextCursor && (
                  <div className="flex justify-center border-t border-separator-border p-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      isDisabled={playsQuery.isFetching}
                      onClick={() => {
                        setExtraPlays(playRows);
                        setPlaysCursor(playsQuery.nextCursor ?? undefined);
                      }}
                    >
                      {t('players.loadMore')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

function SettingsTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const phase = campaignPhase(campaign);
  const update = useUpdateCampaign(orgId, campaign.id);
  const pause = usePauseCampaign(orgId);
  const resume = useResumeCampaign(orgId);
  const onActionError = useCampaignActionError(orgId);
  const end = useEndCampaign(orgId);
  const remove = useDeleteCampaign(orgId);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [endsAtInput, setEndsAtInput] = useState(() => isoToLocalInput(campaign.rules.endsAt));

  useEffect(() => {
    setEndsAtInput(isoToLocalInput(campaign.rules.endsAt));
  }, [campaign.rules.endsAt]);

  const extend = (value: string) => {
    const endsAt = localInputToIso(value);
    if (!endsAt || endsAt <= campaign.rules.startsAt || endsAt === campaign.rules.endsAt) return;
    update.mutate(
      { rules: { ...campaign.rules, endsAt } },
      { onSuccess: () => toast.success(t('settings.extended')) },
    );
  };

  const saveBaselineGuests = (raw: string) => {
    const trimmed = raw.trim();
    const next = trimmed ? Number.parseInt(trimmed, 10) : null;
    if (next !== null && (Number.isNaN(next) || next < 1 || next > 100_000)) return;
    if ((campaign.rules.baselineGuestsPerDay ?? null) === next) return;
    update.mutate(
      { rules: { ...campaign.rules, baselineGuestsPerDay: next } },
      { onSuccess: () => toast.success(t('settings.baselineSaved')) },
    );
  };

  const saveZaloOaUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed && !isValidZaloOaUrl(trimmed)) return;
    const next = trimmed || null;
    if ((campaign.rules.zaloOaUrl ?? null) === next) return;
    update.mutate(
      { rules: { ...campaign.rules, zaloOaUrl: next } },
      { onSuccess: () => toast.success(t('settings.zaloOaSaved')) },
    );
  };

  return (
    <div className="flex max-w-4xl flex-col">
      <Card className="divide-y divide-separator-border overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
        {/* Schedule Section */}
        <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="max-w-md space-y-1">
            <h3 className="m-0 text-body-medium text-text-primary">
              {t('settings.scheduleTitle')}
            </h3>
            <p className="m-0 text-body-2-regular text-text-secondary">
              {t('settings.scheduleHint')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="datetime-local"
              aria-label={t('settings.endsAt')}
              value={endsAtInput}
              min={isoToLocalInput(campaign.rules.startsAt)}
              onChange={(e) => setEndsAtInput(e.target.value)}
              onBlur={(e) => extend(e.target.value)}
              className="w-56 font-mono"
            />
            <Button
              size="sm"
              variant="secondary"
              isDisabled={update.isPending}
              onClick={() => extend(endsAtInput)}
              data-testid="extend-campaign-button"
            >
              {t('settings.saveExtension')}
            </Button>
          </div>
        </div>

        {/* Baseline Guests Section (PLB-08) */}
        <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="max-w-md space-y-1">
            <h3 className="m-0 text-body-medium text-text-primary">
              {t('settings.baselineTitle')}
            </h3>
            <p className="m-0 text-body-2-regular text-text-secondary">
              {t('settings.baselineHint')}
            </p>
          </div>
          <Input
            type="number"
            min={1}
            max={100_000}
            aria-label={t('settings.baselineTitle')}
            placeholder={t('settings.baselinePlaceholder')}
            defaultValue={
              campaign.rules.baselineGuestsPerDay ? String(campaign.rules.baselineGuestsPerDay) : ''
            }
            onBlur={(e) => saveBaselineGuests(e.target.value)}
            className="w-40 font-mono"
            data-testid="settings-baseline-guests"
          />
        </div>

        {/* Zalo OA URL Section (RET-07) */}
        <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="max-w-md space-y-1">
            <h3 className="m-0 text-body-medium text-text-primary">{t('settings.zaloOaTitle')}</h3>
            <p className="m-0 text-body-2-regular text-text-secondary">
              {t('settings.zaloOaHint')}
            </p>
          </div>
          <Input
            type="url"
            aria-label={t('settings.zaloOaTitle')}
            placeholder="https://zalo.me/..."
            defaultValue={campaign.rules.zaloOaUrl ?? ''}
            onBlur={(e) => saveZaloOaUrl(e.target.value)}
            className="w-64"
            data-testid="settings-zalo-oa-url"
          />
        </div>

        {/* Lifecycle Status Section */}
        {campaign.status === 'published' && phase !== 'ended' && (
          <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div className="max-w-md space-y-1">
              <h3 className="m-0 text-body-medium text-text-primary">{t('settings.runTitle')}</h3>
              <p className="m-0 text-body-2-regular text-text-secondary">{t('settings.runHint')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {phase === 'paused' ? (
                <Button
                  size="sm"
                  onClick={() => resume.mutate(campaign.id, { onError: onActionError })}
                >
                  <Play className="size-4" />
                  {t('resume')}
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => pause.mutate(campaign.id)}>
                  <Pause className="size-4" />
                  {t('settings.pause')}
                </Button>
              )}

              <Button variant="danger" size="sm" onClick={() => setIsEndOpen(true)}>
                <Square className="size-4" />
                {t('settings.end')}
              </Button>
              <Modal isOpen={isEndOpen} onOpenChange={setIsEndOpen}>
                <Modal.Backdrop isDismissable>
                  <Modal.Container size="sm">
                    <Modal.Dialog>
                      <Modal.CloseTrigger />
                      <Modal.Header>
                        <Modal.Heading>{t('settings.endConfirm')}</Modal.Heading>
                      </Modal.Header>
                      <Modal.Footer>
                        <Button variant="secondary" size="sm" onClick={() => setIsEndOpen(false)}>
                          {tCommon('cancel')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            end.mutate(campaign.id);
                            setIsEndOpen(false);
                          }}
                        >
                          {t('settings.end')}
                        </Button>
                      </Modal.Footer>
                    </Modal.Dialog>
                  </Modal.Container>
                </Modal.Backdrop>
              </Modal>
            </div>
          </div>
        )}

        {/* Danger Zone: Delete Section */}
        <div className="flex flex-col justify-between gap-4 bg-rose-50/20 p-5 sm:flex-row sm:items-center dark:bg-rose-950/10">
          <div className="max-w-md space-y-1">
            <h3 className="m-0 text-body-medium text-rose-700 dark:text-rose-400">
              {t('settings.deleteTitle')}
            </h3>
            <p className="m-0 text-body-2-regular text-text-secondary">
              {isRunning(phase) ? t('settings.deleteBlocked') : t('settings.deleteHint')}
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            isDisabled={isRunning(phase)}
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            {t('settings.delete')}
          </Button>
          <Modal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <Modal.Backdrop isDismissable>
              <Modal.Container size="sm">
                <Modal.Dialog>
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>
                      {t('settings.deleteConfirm', { name: campaign.name })}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Footer>
                    <Button variant="secondary" size="sm" onClick={() => setIsDeleteOpen(false)}>
                      {tCommon('cancel')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={async () => {
                        await remove.mutateAsync(campaign.id);
                        setIsDeleteOpen(false);
                        toast.success(t('settings.deleted'));
                        router.push(campaignRoutes(orgId).list);
                      }}
                    >
                      {t('settings.delete')}
                    </Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        </div>
      </Card>
    </div>
  );
}
