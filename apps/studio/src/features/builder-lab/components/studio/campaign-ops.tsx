'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { InputBase } from '@playora/ui/components/base/input/input';
import { Modal, ModalFooter, ModalHeader } from '@playora/ui/components/base/modal/modal';
import { ProgressBar } from '@playora/ui/components/base/progress/progress';
import { Skeleton } from '@playora/ui/components/base/skeleton/skeleton';
import { Tab, TabList, Tabs } from '@playora/ui/components/base/tabs/tabs';
import { toast } from '@playora/ui/components/base/toast/toast';
import {
  CircleX,
  ExternalLink,
  FileText,
  Pause,
  Pencil,
  Play,
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
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Caption } from '@/components/caption';
import { PageHeader } from '@/components/page-header';
import { QueryError } from '@/components/query-error';
import { useCampaignActionError } from '@/features/billing/components/plan-limit';
import {
  type Campaign,
  useCampaign,
  useCampaignPlays,
  useCampaignReport,
  useCampaignStats,
  useCampaignVouchers,
  useDeleteCampaign,
  useEndCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useUpdateCampaign,
} from '../../api';
import { campaignPhase, isRunning } from '../../lib/phase';
import { preflight } from '../../lib/preflight';
import { campaignRoutes } from '../../lib/routes';
import { isoToLocalInput, localInputToIso } from '../../lib/rules-format';
import { campaignPeriod } from './campaign-period';
import {
  ChannelsTableCard,
  DailyOutcomeCard,
  OutcomeMetricGrid,
  PlaybookGoalBanner,
  PrizesOutcomeCard,
} from './campaign-report';
import { CampaignShareView } from './campaign-share-view';
import { PhaseTag } from './phase-tag';
import { PlaybookTag } from './playbook-tag';

const TABS = ['overview', 'share', 'prizes', 'players', 'settings'] as const;
type TabKey = (typeof TABS)[number];

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
      <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 text-center shadow-card">
        <p className="m-0 mb-4 text-body-medium text-text-secondary">{t('notFound')}</p>
        <Link href={routes.list}>
          <Button size="small">{t('backToList')}</Button>
        </Link>
      </div>
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
        <TabList aria-label={campaign.name} className="w-fit">
          {TABS.map((key) => (
            <Tab key={key} id={key}>
              {t(`tabs.${key}`)}
            </Tab>
          ))}
        </TabList>
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
      <Button variant="secondary" size="small" leadingIcon={FileText} tabIndex={-1}>
        {t('viewReport')}
      </Button>
    </Link>
  );

  const edit = (
    <Link href={routes.edit(campaign.id)}>
      <Button
        variant={phase === 'draft' ? 'primary' : 'secondary'}
        size="small"
        leadingIcon={Pencil}
        tabIndex={-1}
      >
        {phase === 'draft' ? t('continueEditing') : t('editDesign')}
      </Button>
    </Link>
  );

  const share = (
    <Link href={routes.share(campaign.id)}>
      <Button variant="secondary" size="small" leadingIcon={Share2} tabIndex={-1}>
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
          size="small"
          leadingIcon={Play}
          disabled={resume.isPending}
          onClick={() => resume.mutate(campaign.id, { onError: onActionError })}
        >
          {t('resume')}
        </Button>
      ) : (
        <a href={routes.play(campaign.slug)} target="_blank" rel="noreferrer">
          <Button size="small" leadingIcon={ExternalLink} tabIndex={-1}>
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

function DraftChecklist({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const tp = useTranslations('builderLab.publish');
  const issues = preflight(campaign);
  const errors = issues.filter((issue) => issue.level === 'error');
  const routes = campaignRoutes(orgId);

  return (
    <div
      className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
      data-testid="draft-checklist"
    >
      <div className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
        <h3 className="m-0 text-body-medium text-text-primary">
          {errors.length ? t('draft.blocked', { count: errors.length }) : t('draft.ready')}
        </h3>
      </div>
      <div className="space-y-3 p-5">
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
            <Button variant="secondary" size="small" leadingIcon={Play} tabIndex={-1}>
              {t('rehearse')}
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Recent plays feed in Overview tab — rendered as a clean BoardUI activity list (`ul/li`)
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
    <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
      <div className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
        <h3 className="m-0 text-body-medium text-text-primary">{t('recent.title')}</h3>
      </div>
      <div className="p-0">
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
                    variant={row.outcome === 'win' ? 'bold' : 'subtle'}
                    color={row.outcome === 'win' ? 'lime' : 'neutral'}
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
                    <Chip variant="caption" color="neutral" className="cursor-pointer font-mono">
                      {row.voucherCode}
                    </Chip>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PlaysTable({
  campaign,
  rows,
  compact,
}: {
  campaign: Campaign;
  rows: NonNullable<ReturnType<typeof useCampaignPlays>['data']>;
  compact?: boolean;
}) {
  const t = useTranslations('campaigns');
  const format = useFormatter();
  const prizeName = (id: string | null) => campaign.prizes.find((p) => p.id === id)?.name ?? '—';

  return (
    <div className="w-full overflow-x-auto">
      <table className="bui-table w-full">
        <thead>
          <tr>
            <th>{t('players.time')}</th>
            {!compact && <th>{t('players.player')}</th>}
            <th>{t('players.outcome')}</th>
            <th>{t('players.prize')}</th>
            {!compact && <th>{t('players.code')}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="text-body-2-regular text-text-secondary">
                {format.dateTime(new Date(row.at), { dateStyle: 'short', timeStyle: 'short' })}
              </td>
              {!compact && (
                <td className="font-mono text-caption-1-medium text-text-primary">
                  {row.playerName || row.playerId.slice(0, 8)}
                </td>
              )}
              <td>
                <Chip
                  variant={row.outcome === 'win' ? 'bold' : 'subtle'}
                  color={row.outcome === 'win' ? 'lime' : 'neutral'}
                >
                  {t(`outcome.${row.outcome}`)}
                </Chip>
              </td>
              <td className="text-body-2-regular text-text-primary">{prizeName(row.prizeId)}</td>
              {!compact && (
                <td className="font-mono text-caption-1-medium text-text-primary">
                  {row.voucherCode ?? '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShareTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  return <CampaignShareView orgId={orgId} campaignId={campaign.id} embedded />;
}

function PrizeStock({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const stats = useCampaignStats(orgId, campaign.id);
  const vouchers = useCampaignVouchers(orgId, campaign.id).data ?? [];

  return (
    <div
      className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
      data-testid="prize-stock"
    >
      <div className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
        <h3 className="m-0 text-body-medium text-text-primary">{t('stock.title')}</h3>
        <Link href={campaignRoutes(orgId).edit(campaign.id, 'rules')}>
          <Button variant="secondary" size="small" leadingIcon={Pencil} tabIndex={-1}>
            {t('stock.edit')}
          </Button>
        </Link>
      </div>
      <div className="space-y-4 p-5">
        {campaign.prizes.map((prize) => {
          const left = stats.data?.remainingByPrize[prize.id] ?? prize.quantity;
          const issued = vouchers.filter((v) => v.prizeId === prize.id);
          const redeemed = issued.filter((v) => v.redeemedAt).length;
          const percent = prize.quantity ? Math.round((left / prize.quantity) * 100) : 0;
          return (
            <div key={prize.id} className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-body-2-medium text-text-primary">{prize.name}</span>
                <Caption className="tabular-nums">
                  {t('stock.left', { left, total: prize.quantity })}
                </Caption>
              </div>
              <ProgressBar
                value={percent}
                aria-label={prize.name}
                size="sm"
                className={cx('h-1.5', percent < 20 && '[&>div]:bg-rose-500')}
              />
              <Caption>{t('stock.issued', { issued: issued.length, redeemed })}</Caption>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrizesTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const format = useFormatter();
  const vouchers = useCampaignVouchers(orgId, campaign.id);
  const prizeName = (id: string) => campaign.prizes.find((p) => p.id === id)?.name ?? '—';

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <PrizeStock orgId={orgId} campaign={campaign} />
      <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
        <div className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
          <h3 className="m-0 text-body-medium text-text-primary">{t('vouchers.title')}</h3>
          <Link href={campaignRoutes(orgId).redeem}>
            <Button variant="secondary" size="small" leadingIcon={Store} tabIndex={-1}>
              {t('vouchers.desk')}
            </Button>
          </Link>
        </div>
        <div className="p-0">
          {vouchers.isPending ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : (vouchers.data ?? []).length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Caption>{t('vouchers.empty')}</Caption>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="bui-table w-full">
                <thead>
                  <tr>
                    <th>{t('vouchers.code')}</th>
                    <th>{t('players.prize')}</th>
                    <th>{t('vouchers.issued')}</th>
                    <th>{t('vouchers.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(vouchers.data ?? []).map((row) => (
                    <tr key={row.code}>
                      <td className="font-mono text-caption-1-semibold text-text-primary">
                        {row.code}
                      </td>
                      <td className="text-body-2-regular text-text-primary">
                        {prizeName(row.prizeId)}
                      </td>
                      <td className="text-body-2-regular text-text-secondary">
                        {format.dateTime(new Date(row.issuedAt), {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td>
                        <Chip
                          variant={row.redeemedAt ? 'bold' : 'subtle'}
                          color={row.redeemedAt ? 'lime' : 'neutral'}
                        >
                          {row.redeemedAt ? t('vouchers.redeemed') : t('vouchers.pending')}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayersTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const plays = useCampaignPlays(orgId, campaign.id);
  return (
    <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
      <div className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
        <h3 className="m-0 text-body-medium text-text-primary">
          {t('players.title', { count: plays.data?.length ?? 0 })}
        </h3>
      </div>
      <div className="p-0">
        {plays.isPending ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : (plays.data ?? []).length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Caption>{t('recent.empty')}</Caption>
          </div>
        ) : (
          <PlaysTable campaign={campaign} rows={plays.data ?? []} />
        )}
      </div>
    </div>
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

  const extend = (value: string) => {
    const endsAt = localInputToIso(value);
    if (!endsAt || endsAt <= campaign.rules.startsAt) return;
    update.mutate(
      { rules: { ...campaign.rules, endsAt } },
      { onSuccess: () => toast.success(t('settings.extended')) },
    );
  };

  return (
    <div className="flex max-w-4xl flex-col">
      <div className="divide-y divide-separator-border overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
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
          <InputBase
            type="datetime-local"
            aria-label={t('settings.endsAt')}
            defaultValue={isoToLocalInput(campaign.rules.endsAt)}
            min={isoToLocalInput(campaign.rules.startsAt)}
            onBlur={(e) => extend(e.target.value)}
            className="w-56"
            fieldClassName="font-mono"
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
                  size="small"
                  leadingIcon={Play}
                  onClick={() => resume.mutate(campaign.id, { onError: onActionError })}
                >
                  {t('resume')}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="small"
                  leadingIcon={Pause}
                  onClick={() => pause.mutate(campaign.id)}
                >
                  {t('settings.pause')}
                </Button>
              )}

              <Button
                variant="danger"
                size="small"
                leadingIcon={Square}
                onClick={() => setIsEndOpen(true)}
              >
                {t('settings.end')}
              </Button>
              <Modal isOpen={isEndOpen} onOpenChange={setIsEndOpen} size="sm">
                <ModalHeader title={t('settings.endConfirm')} />
                <ModalFooter>
                  <Button variant="secondary" size="small" onClick={() => setIsEndOpen(false)}>
                    {tCommon('cancel')}
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => {
                      end.mutate(campaign.id);
                      setIsEndOpen(false);
                    }}
                  >
                    {t('settings.end')}
                  </Button>
                </ModalFooter>
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
            size="small"
            leadingIcon={Trash2}
            disabled={isRunning(phase)}
            onClick={() => setIsDeleteOpen(true)}
          >
            {t('settings.delete')}
          </Button>
          <Modal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen} size="sm">
            <ModalHeader title={t('settings.deleteConfirm', { name: campaign.name })} />
            <ModalFooter>
              <Button variant="secondary" size="small" onClick={() => setIsDeleteOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button
                variant="danger"
                size="small"
                onClick={async () => {
                  await remove.mutateAsync(campaign.id);
                  setIsDeleteOpen(false);
                  toast.success(t('settings.deleted'));
                  router.push(campaignRoutes(orgId).list);
                }}
              >
                {t('settings.delete')}
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      </div>
    </div>
  );
}
