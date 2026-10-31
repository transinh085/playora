'use client';

import { toCanvasPrizes } from '@playora/ui/campaign';
import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { IconButton } from '@playora/ui/components/base/buttons/icon-button';
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
} from '@playora/ui/components/base/drawer/drawer';
import {
  Dropdown,
  DropdownDivider,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from '@playora/ui/components/base/dropdown/dropdown';
import { InputBase } from '@playora/ui/components/base/input/input';
import { ProgressBar } from '@playora/ui/components/base/progress/progress';
import { Skeleton } from '@playora/ui/components/base/skeleton/skeleton';
import { Tab, TabList, Tabs } from '@playora/ui/components/base/tabs/tabs';
import { toast } from '@playora/ui/components/base/toast/toast';
import { Tooltip, TooltipTrigger } from '@playora/ui/components/base/tooltip/tooltip';
import { Search, Sparkles } from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiExternalLinkLine,
  RiEyeLine,
  RiFileCopyLine,
  RiGridLine,
  RiMore2Fill,
  RiPencilLine,
  RiQrCodeLine,
  RiSearchLine,
  RiSidebarUnfoldLine,
  RiTableLine,
} from '@remixicon/react';
import type { Route } from 'next';
import Link from 'next/link';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Caption } from '@/components/caption';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { TableCard } from '@/components/table-card';
import {
  type CampaignListItem,
  type CampaignStats,
  useCampaigns,
  useCampaignsStats,
} from '../../api';
import { type CampaignPhase, campaignPhase } from '../../lib/phase';
import { campaignRoutes } from '../../lib/routes';
import { formatVnd } from '../../lib/rules-format';
import { buildScreens } from '../../lib/starter';
import { FitScreen } from '../editor/fit-screen';
import { campaignPeriod } from './campaign-period';
import { PhaseTag } from './phase-tag';

const PHASES: readonly CampaignPhase[] = ['live', 'scheduled', 'draft', 'paused', 'ended'] as const;

type ViewMode = 'table' | 'grid';
type SortKey = 'name' | 'template' | 'status' | 'period' | 'plays' | null;
type SortDir = 'asc' | 'desc';

export function CampaignList({ orgId }: { orgId: string }) {
  const t = useTranslations('campaigns');
  const th = useTranslations('campaigns.home');
  const tl = useTranslations('builderLab.home');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 }).getTime();

  const query = useCampaigns(orgId);
  const campaigns = query.data ?? [];
  const campaignIds = useMemo(() => campaigns.map((c) => c.id), [campaigns]);
  const { data: statsById } = useCampaignsStats(orgId, campaignIds);

  const routes = campaignRoutes(orgId);
  const [phase, setPhase] = useState<CampaignPhase | 'all'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const toggleSort = (key: Exclude<SortKey, null>) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir('asc');
    }
  };

  const handleCopyLink = async (campaign: { id: string; slug: string; status: string }) => {
    try {
      const url =
        campaign.status === 'draft'
          ? `${window.location.origin}${routes.rehearsal(campaign.id)}`
          : routes.play(campaign.slug);
      await navigator.clipboard.writeText(url);
      toast.success(t('linkCopied'));
    } catch {
      // Fallback ignore
    }
  };

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-96 rounded-xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    );
  }

  if (query.isError) {
    return <QueryError onRetry={() => query.refetch()} />;
  }

  const rows = campaigns.map((campaign) => ({
    campaign,
    phase: campaignPhase(campaign, now),
  }));

  const count = (value: CampaignPhase) => rows.filter((row) => row.phase === value).length;
  const needle = search.trim().toLowerCase();

  const filtered = rows.filter(
    (row) =>
      (phase === 'all' || row.phase === phase) &&
      (!needle || row.campaign.name.toLowerCase().includes(needle)),
  );

  const visible = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    const mul = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'name') {
      return a.campaign.name.localeCompare(b.campaign.name) * mul;
    }
    if (sortKey === 'template') {
      return a.campaign.templateKey.localeCompare(b.campaign.templateKey) * mul;
    }
    if (sortKey === 'status') {
      return a.phase.localeCompare(b.phase) * mul;
    }
    if (sortKey === 'plays') {
      const aPlays = statsById?.get(a.campaign.id)?.plays ?? 0;
      const bPlays = statsById?.get(b.campaign.id)?.plays ?? 0;
      return (aPlays - bPlays) * mul;
    }
    const aStart = new Date(a.campaign.rules.startsAt).getTime();
    const bStart = new Date(b.campaign.rules.startsAt).getTime();
    return (aStart - bStart) * mul;
  });

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null;
  const selectedPhase = selectedCampaign ? campaignPhase(selectedCampaign, now) : 'draft';
  const selectedStats = selectedCampaign ? statsById?.get(selectedCampaign.id) : undefined;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t('emptyTitle')}
        description={t('emptySubtitle')}
        actionText={t('create')}
        actionHref={routes.create}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1. BoardUI Underline Tabs with Count Badges */}
      <Tabs
        selectedKey={phase}
        onSelectionChange={(key) => setPhase(String(key) as CampaignPhase | 'all')}
      >
        <TabList aria-label={t('title')}>
          <Tab id="all" count={rows.length}>
            {t('all')}
          </Tab>
          {PHASES.map((tab) => {
            const tabCount = count(tab);
            if (tabCount === 0 && phase !== tab) return null;
            return (
              <Tab key={tab} id={tab} count={tabCount}>
                {t(`phase.${tab}`)}
              </Tab>
            );
          })}
        </TabList>
      </Tabs>

      {/* 2. Main Campaign TableCard */}
      <TableCard
        toolbar={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="w-full sm:w-72">
              <InputBase
                size="small"
                placeholder={t('search')}
                aria-label={t('search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leadingIcon={RiSearchLine}
              />
            </div>

            {/* View Mode Controls */}
            <div className="flex items-center rounded-lg border border-border-button-default bg-background-secondary-default p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-label={t('viewTable')}
                className={cx(
                  'flex size-7 items-center justify-center rounded-md cursor-pointer transition-colors',
                  viewMode === 'table'
                    ? 'bg-background-primary-default text-text-primary shadow-xs'
                    : 'text-text-tertiary hover:text-text-primary',
                )}
              >
                <RiTableLine className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label={t('viewGrid')}
                className={cx(
                  'flex size-7 items-center justify-center rounded-md cursor-pointer transition-colors',
                  viewMode === 'grid'
                    ? 'bg-background-primary-default text-text-primary shadow-xs'
                    : 'text-text-tertiary hover:text-text-primary',
                )}
              >
                <RiGridLine className="size-4" />
              </button>
            </div>
          </div>
        }
      >
        {visible.length === 0 ? (
          <EmptyState
            bordered={false}
            icon={Search}
            title={t('noMatchTitle')}
            description={t('noMatchSubtitle')}
            actionText={t('clearFilters')}
            onAction={() => {
              setSearch('');
              setPhase('all');
            }}
          />
        ) : viewMode === 'table' ? (
          <div className="w-full overflow-x-auto" data-testid="campaign-table">
            <table className="bui-table w-full">
              <thead>
                <tr>
                  <th className="w-12 text-center text-caption-1-medium text-text-tertiary">#</th>
                  <th>
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1.5 cursor-pointer font-medium hover:text-text-primary"
                    >
                      <span>{t('columns.name')}</span>
                      {sortKey === 'name' &&
                        (sortDir === 'asc' ? (
                          <RiArrowUpLine className="size-3.5 text-accent-500" />
                        ) : (
                          <RiArrowDownLine className="size-3.5 text-accent-500" />
                        ))}
                    </button>
                  </th>
                  <th>{tl('mechanicsLabel')}</th>
                  <th>
                    <button
                      type="button"
                      onClick={() => toggleSort('status')}
                      className="inline-flex items-center gap-1.5 cursor-pointer font-medium hover:text-text-primary"
                    >
                      <span>{t('columns.status')}</span>
                      {sortKey === 'status' &&
                        (sortDir === 'asc' ? (
                          <RiArrowUpLine className="size-3.5 text-accent-500" />
                        ) : (
                          <RiArrowDownLine className="size-3.5 text-accent-500" />
                        ))}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      onClick={() => toggleSort('period')}
                      className="inline-flex items-center gap-1.5 cursor-pointer font-medium hover:text-text-primary"
                    >
                      <span>{t('columns.period')}</span>
                      {sortKey === 'period' &&
                        (sortDir === 'asc' ? (
                          <RiArrowUpLine className="size-3.5 text-accent-500" />
                        ) : (
                          <RiArrowDownLine className="size-3.5 text-accent-500" />
                        ))}
                    </button>
                  </th>
                  <th className="text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('plays')}
                      className="ml-auto inline-flex items-center gap-1.5 cursor-pointer font-medium hover:text-text-primary"
                    >
                      <span>{t('columns.plays')}</span>
                      {sortKey === 'plays' &&
                        (sortDir === 'asc' ? (
                          <RiArrowUpLine className="size-3.5 text-accent-500" />
                        ) : (
                          <RiArrowDownLine className="size-3.5 text-accent-500" />
                        ))}
                    </button>
                  </th>
                  <th>{t('columns.stock')}</th>
                  <th className="text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ campaign, phase: rowPhase }, idx) => {
                  const campaignStats = statsById?.get(campaign.id);
                  const totalPrizes = campaign.prizes.reduce((sum, p) => sum + p.quantity, 0);
                  const remainingPrizes = Object.values(
                    campaignStats?.remainingByPrize ?? {},
                  ).reduce((a, b) => a + b, 0);
                  const stockPercent = totalPrizes
                    ? Math.round((remainingPrizes / totalPrizes) * 100)
                    : 0;
                  const isSelected = selectedCampaignId === campaign.id;

                  const categoryTone =
                    campaign.templateKey === 'spin-wheel'
                      ? ('orange' as const)
                      : campaign.templateKey === 'scratch-card'
                        ? ('cyan' as const)
                        : ('purple' as const);

                  const skinTone =
                    campaign.skinKey === 'tet'
                      ? ('rose' as const)
                      : campaign.skinKey === 'grand-opening'
                        ? ('purple' as const)
                        : ('blue' as const);

                  return (
                    <tr
                      key={campaign.id}
                      className={cx(
                        'transition-colors hover:bg-background-secondary-default/60',
                        isSelected && 'bg-background-secondary-default ring-1 ring-accent-500/30',
                      )}
                    >
                      {/* # index */}
                      <td className="w-12 text-center text-caption-1-regular text-text-tertiary tabular-nums">
                        {idx + 1}
                      </td>

                      {/* Name + Brand swatch */}
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedCampaignId(campaign.id)}
                          className="flex items-center gap-2.5 text-left cursor-pointer group/name"
                        >
                          <div
                            aria-hidden="true"
                            className="size-3.5 shrink-0 rounded-full border border-border-button-default"
                            style={{ backgroundColor: campaign.brand.primary }}
                          />
                          <span className="font-medium text-text-primary group-hover/name:text-accent-600 transition-colors">
                            {campaign.name}
                          </span>
                        </button>
                      </td>

                      {/* Template & Skin chips */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Chip variant="subtle" color={categoryTone}>
                            {tl(`templates.${campaign.templateKey}`)}
                          </Chip>
                          <Chip variant="subtle" color={skinTone}>
                            {tl(`skins.${campaign.skinKey}`)}
                          </Chip>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <PhaseTag phase={rowPhase} />
                      </td>

                      {/* Period */}
                      <td>
                        <span className="text-body-medium text-text-secondary">
                          {campaignPeriod(format, campaign)}
                        </span>
                      </td>

                      {/* Plays */}
                      <td className="text-right tabular-nums text-body-medium font-medium text-text-primary">
                        {rowPhase === 'draft' ? (
                          <span className="text-text-tertiary">—</span>
                        ) : (
                          format.number(campaignStats?.plays ?? 0)
                        )}
                      </td>

                      {/* Stock */}
                      <td>
                        {rowPhase === 'draft' ? (
                          <span className="text-caption-1-regular text-text-tertiary">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-caption-1-regular tabular-nums text-text-secondary">
                              {remainingPrizes}/{totalPrizes}
                            </span>
                            <Chip
                              variant="subtle"
                              color={
                                stockPercent >= 60 ? 'lime' : stockPercent >= 20 ? 'yellow' : 'rose'
                              }
                            >
                              {stockPercent}%
                            </Chip>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipTrigger>
                            <IconButton
                              size="small"
                              icon={RiSidebarUnfoldLine}
                              aria-label={t('quickView')}
                              onClick={() => setSelectedCampaignId(campaign.id)}
                            />
                            <Tooltip>{t('quickView')}</Tooltip>
                          </TooltipTrigger>

                          <Dropdown>
                            <DropdownTrigger
                              aria-label={t('actions')}
                              className="inline-flex size-8 items-center justify-center rounded-2lg border border-border-button-default bg-background-primary-default text-foreground-icon-primary shadow-xs hover:bg-background-secondary-hover"
                            >
                              <RiMore2Fill className="size-4" />
                            </DropdownTrigger>
                            <DropdownPopover
                              aria-label={t('actions')}
                              placement="bottom end"
                              className="w-48"
                            >
                              <DropdownItem
                                onSelect={() => setSelectedCampaignId(campaign.id)}
                                className="gap-2"
                              >
                                <RiSidebarUnfoldLine className="size-4" />
                                <span>{t('quickView')}</span>
                              </DropdownItem>
                              <Link
                                href={routes.edit(campaign.id) as Route}
                                className="flex w-full items-center gap-2 rounded-2lg p-2 text-body-medium text-text-primary hover:bg-background-secondary-hover"
                              >
                                <RiPencilLine className="size-4" />
                                <span>{t('edit')}</span>
                              </Link>
                              <Link
                                href={routes.detail(campaign.id) as Route}
                                className="flex w-full items-center gap-2 rounded-2lg p-2 text-body-medium text-text-primary hover:bg-background-secondary-hover"
                              >
                                <RiEyeLine className="size-4" />
                                <span>{t('openOps')}</span>
                              </Link>
                              <a
                                href={
                                  rowPhase === 'draft'
                                    ? routes.rehearsal(campaign.id)
                                    : routes.play(campaign.slug)
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="flex w-full items-center gap-2 rounded-2lg p-2 text-body-medium text-text-primary hover:bg-background-secondary-hover"
                              >
                                <RiExternalLinkLine className="size-4" />
                                <span>{rowPhase === 'draft' ? t('rehearse') : t('openPlay')}</span>
                              </a>
                              <DropdownDivider />
                              <DropdownItem
                                onSelect={() => handleCopyLink(campaign)}
                                className="gap-2"
                              >
                                <RiFileCopyLine className="size-4" />
                                <span>{t('copyLink')}</span>
                              </DropdownItem>
                            </DropdownPopover>
                          </Dropdown>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid Cards View */
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map(({ campaign, phase: rowPhase }) => (
              <CampaignGridCard
                key={campaign.id}
                campaign={campaign}
                phase={rowPhase}
                stats={statsById?.get(campaign.id)}
                routes={routes}
                format={format}
                onSelect={() => setSelectedCampaignId(campaign.id)}
                onCopyLink={handleCopyLink}
              />
            ))}
          </div>
        )}
      </TableCard>

      {/* 3. Side Drawer: Quick Inspection Panel */}
      <Drawer
        placement="end"
        size="lg"
        isOpen={Boolean(selectedCampaign)}
        onOpenChange={(open) => {
          if (!open) setSelectedCampaignId(null);
        }}
      >
        {selectedCampaign && (
          <>
            <DrawerHeader
              title={selectedCampaign.name}
              description={
                <div className="mt-1 flex items-center gap-2">
                  <PhaseTag phase={selectedPhase} />
                  <span className="text-caption-1-regular text-text-tertiary">
                    {tl(`templates.${selectedCampaign.templateKey}`)} ·{' '}
                    {tl(`skins.${selectedCampaign.skinKey}`)}
                  </span>
                </div>
              }
            />

            <DrawerBody className="flex flex-col gap-5 py-4">
              {/* Phone Mockup Canvas Preview */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-separator-border bg-background-secondary-default/40 p-4">
                <div className="relative aspect-[9/16] w-full max-w-[210px] overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default shadow-card">
                  <FitScreen
                    screen={
                      buildScreens(selectedCampaign.templateKey, selectedCampaign.skinKey).cover
                    }
                    brand={selectedCampaign.brand}
                    prizes={toCanvasPrizes(selectedCampaign)}
                  />
                </div>
                <p className="mt-2 text-caption-1-regular text-text-tertiary">
                  {campaignPeriod(format, selectedCampaign)}
                </p>
              </div>

              {/* Outcome Performance Metrics */}
              {selectedPhase !== 'draft' ? (
                <div className="flex flex-col gap-2">
                  <span className="text-caption-1-semibold text-text-primary">
                    {th('trends.title')}
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-border-button-default bg-background-primary-default p-3 shadow-2xs">
                      <span className="text-caption-1-regular text-text-secondary">
                        {t('columns.plays')}
                      </span>
                      <p className="text-title-2-semibold text-text-primary tabular-nums">
                        {format.number(selectedStats?.plays ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border-button-default bg-background-primary-default p-3 shadow-2xs">
                      <span className="text-caption-1-regular text-text-secondary">
                        {th('trends.redeemed')}
                      </span>
                      <p className="text-title-2-semibold text-accent-600 dark:text-accent-400 tabular-nums">
                        {format.number(selectedStats?.redeemed ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border-button-default bg-background-primary-default p-3 shadow-2xs">
                      <span className="text-caption-1-regular text-text-secondary">
                        {th('statCards.prizeCostCaption')}
                      </span>
                      <p className="text-title-2-semibold text-text-primary tabular-nums">
                        {formatVnd(selectedStats?.redeemedValueVnd ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border-button-default bg-background-primary-default p-3 shadow-2xs">
                      <span className="text-caption-1-regular text-text-secondary">
                        {t('columns.stock')}
                      </span>
                      <p className="text-title-2-semibold text-text-primary tabular-nums">
                        {Object.values(selectedStats?.remainingByPrize ?? {}).reduce(
                          (a, b) => a + b,
                          0,
                        )}
                        /{selectedCampaign.prizes.reduce((sum, p) => sum + p.quantity, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border-button-default bg-background-secondary-default/50 p-4 text-center">
                  <p className="text-caption-1-medium text-text-secondary">{t('draft.hint')}</p>
                </div>
              )}

              {/* Share & QR Access Link */}
              <div className="flex flex-col gap-2 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card">
                <span className="text-caption-1-semibold text-text-primary">{t('openShare')}</span>
                <div className="flex items-center gap-2">
                  <InputBase
                    readOnly
                    size="small"
                    value={
                      selectedPhase === 'draft'
                        ? `${typeof window !== 'undefined' ? window.location.origin : ''}${routes.rehearsal(selectedCampaign.id)}`
                        : routes.play(selectedCampaign.slug)
                    }
                    fieldClassName="min-w-0 flex-1"
                    className="text-caption-1-regular select-all"
                  />
                  <Button
                    size="small"
                    variant="secondary"
                    leadingIcon={RiFileCopyLine}
                    className="shrink-0"
                    onClick={() => handleCopyLink(selectedCampaign)}
                  >
                    {t('copyLink')}
                  </Button>
                  <a
                    href={
                      selectedPhase === 'draft'
                        ? routes.rehearsal(selectedCampaign.id)
                        : routes.play(selectedCampaign.slug)
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-secondary-default text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <RiExternalLinkLine className="size-4" />
                  </a>
                </div>
                <div className="mt-1 flex items-center justify-between pt-2 border-t border-separator-border">
                  <Link
                    href={routes.share(selectedCampaign.id) as Route}
                    className="inline-flex items-center gap-1.5 text-caption-1-medium text-accent-600 hover:underline dark:text-accent-400"
                  >
                    <RiQrCodeLine className="size-4" />
                    <span>{t('openShare')} (Standee / Tent)</span>
                  </Link>
                </div>
              </div>
            </DrawerBody>

            <DrawerFooter className="gap-2 border-t border-separator-border pt-3">
              <Link href={routes.detail(selectedCampaign.id) as Route}>
                <Button variant="primary" leadingIcon={RiEyeLine}>
                  {t('openOps')}
                </Button>
              </Link>
              <Link href={routes.edit(selectedCampaign.id) as Route}>
                <Button variant="secondary" leadingIcon={RiPencilLine}>
                  {t('edit')}
                </Button>
              </Link>
              <Button variant="ghost" onClick={() => setSelectedCampaignId(null)}>
                Đóng
              </Button>
            </DrawerFooter>
          </>
        )}
      </Drawer>
    </div>
  );
}

function CampaignGridCard({
  campaign,
  phase,
  stats,
  routes,
  format,
  onSelect,
  onCopyLink,
}: {
  campaign: CampaignListItem;
  phase: CampaignPhase;
  stats?: CampaignStats;
  routes: ReturnType<typeof campaignRoutes>;
  format: ReturnType<typeof useFormatter>;
  onSelect: () => void;
  onCopyLink: (campaign: CampaignListItem) => void;
}) {
  const t = useTranslations('campaigns');
  const tl = useTranslations('builderLab.home');
  const total = campaign.prizes.reduce((sum, prize) => sum + prize.quantity, 0);
  const left = Object.values(stats?.remainingByPrize ?? {}).reduce((a, b) => a + b, 0);
  const percent = total ? Math.round((left / total) * 100) : 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card transition-all duration-200 hover:shadow-dropdown">
      {/* Cover Canvas Screen */}
      <div className="relative h-[180px] overflow-hidden bg-background-tertiary-default">
        <FitScreen
          screen={buildScreens(campaign.templateKey, campaign.skinKey).cover}
          brand={campaign.brand}
          prizes={toCanvasPrizes(campaign)}
        />
        <div className="absolute top-2.5 left-2.5">
          <PhaseTag phase={phase} />
        </div>
      </div>

      {/* Info Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <button
            type="button"
            onClick={onSelect}
            className="line-clamp-1 text-left text-body-medium font-semibold text-text-primary group-hover:text-accent-600 transition-colors cursor-pointer"
          >
            {campaign.name}
          </button>
          <Caption className="block">
            {tl(`templates.${campaign.templateKey}`)} · {tl(`skins.${campaign.skinKey}`)}
          </Caption>
        </div>

        <div className="text-caption-1-regular text-text-secondary">
          {campaignPeriod(format, campaign)}
        </div>

        {phase !== 'draft' && (
          <div className="pt-1">
            <div className="mb-1 flex items-center justify-between text-caption-1-regular text-text-secondary">
              <span>{t('columns.stock')}</span>
              <span className="font-medium tabular-nums text-text-primary">
                {left}/{total}
              </span>
            </div>
            <ProgressBar
              value={percent}
              aria-label={t('columns.stock')}
              size="sm"
              className={cx('h-1.5', percent < 20 && '[&>div]:bg-notification-error-background')}
            />
          </div>
        )}

        {/* Action row */}
        <div className="mt-auto flex items-center gap-1.5 pt-3">
          <Link href={routes.edit(campaign.id) as Route} className="flex-1">
            <Button
              variant={phase === 'draft' ? 'primary' : 'secondary'}
              size="small"
              className="w-full"
              leadingIcon={RiPencilLine}
            >
              {t('edit')}
            </Button>
          </Link>
          <TooltipTrigger>
            <IconButton
              size="small"
              icon={RiSidebarUnfoldLine}
              aria-label={t('quickView')}
              onClick={onSelect}
            />
            <Tooltip>{t('quickView')}</Tooltip>
          </TooltipTrigger>
          <Link href={routes.detail(campaign.id) as Route}>
            <IconButton size="small" icon={RiEyeLine} aria-label={t('openOps')} />
          </Link>
          <TooltipTrigger>
            <IconButton
              size="small"
              icon={RiFileCopyLine}
              aria-label={t('copyLink')}
              onClick={() => onCopyLink(campaign)}
            />
            <Tooltip>{t('copyLink')}</Tooltip>
          </TooltipTrigger>
        </div>
      </div>
    </div>
  );
}
