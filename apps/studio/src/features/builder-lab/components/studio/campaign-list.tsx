'use client';

import { type CanvasDoc, toCanvasPrizes } from '@playora/ui/campaign';
import {
  Button,
  Card,
  Chip,
  Drawer,
  Dropdown,
  Input,
  Label,
  PhoneMockup,
  ProgressBar,
  SearchField,
  Separator,
  Skeleton,
  Table,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  toast,
} from '@playora/ui/components';
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
  useCampaign,
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
  const selectedFullCampaign = useCampaign(orgId, selectedCampaignId ?? '');

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

  const selectedCampaign =
    selectedFullCampaign.data ?? campaigns.find((c) => c.id === selectedCampaignId) ?? null;
  const selectedPhase = selectedCampaign ? campaignPhase(selectedCampaign, now) : 'draft';
  const selectedStats = selectedCampaign ? statsById?.get(selectedCampaign.id) : undefined;
  const selectedCoverScreen = selectedCampaign
    ? ((selectedCampaign as { screens?: CanvasDoc }).screens?.cover ??
      buildScreens(selectedCampaign.templateKey, selectedCampaign.skinKey).cover)
    : null;

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
      {/* 1. HeroUI Underline Tabs with Count Badges */}
      <Tabs
        selectedKey={phase}
        onSelectionChange={(key) => setPhase(String(key) as CampaignPhase | 'all')}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('title')}>
            <Tabs.Tab id="all">
              <span className="inline-flex items-center gap-1.5">
                {t('all')}
                <span className="rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-2-medium tabular-nums">
                  {rows.length}
                </span>
              </span>
              <Tabs.Indicator />
            </Tabs.Tab>
            {PHASES.map((tab) => {
              const tabCount = count(tab);
              if (tabCount === 0 && phase !== tab) return null;
              return (
                <Tabs.Tab key={tab} id={tab}>
                  <span className="inline-flex items-center gap-1.5">
                    {t(`phase.${tab}`)}
                    <span className="rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-2-medium tabular-nums">
                      {tabCount}
                    </span>
                  </span>
                  <Tabs.Indicator />
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      {/* 2. Main Campaign TableCard */}
      <TableCard
        toolbar={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <SearchField
              value={search}
              onChange={setSearch}
              aria-label={t('search')}
              className="w-full sm:w-72"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={t('search')} />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>

            {/* View Mode Controls */}
            <ToggleButtonGroup
              selectionMode="single"
              disallowEmptySelection
              size="sm"
              selectedKeys={new Set([viewMode])}
              onSelectionChange={(keys) => {
                const next = [...keys][0];
                if (next === 'table' || next === 'grid') setViewMode(next);
              }}
              aria-label={t('title')}
            >
              <ToggleButton id="table" isIconOnly aria-label={t('viewTable')}>
                <RiTableLine className="size-4" />
              </ToggleButton>
              <ToggleButton id="grid" isIconOnly aria-label={t('viewGrid')}>
                <ToggleButtonGroup.Separator />
                <RiGridLine className="size-4" />
              </ToggleButton>
            </ToggleButtonGroup>
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
          <Table data-testid="campaign-table">
            <Table.ScrollContainer>
              <Table.Content aria-label={t('title')}>
                <Table.Header>
                  <Table.Column className="w-12 text-center">#</Table.Column>
                  <Table.Column isRowHeader>
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
                  </Table.Column>
                  <Table.Column>{tl('mechanicsLabel')}</Table.Column>
                  <Table.Column>
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
                  </Table.Column>
                  <Table.Column>
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
                  </Table.Column>
                  <Table.Column className="text-right">
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
                  </Table.Column>
                  <Table.Column>{t('columns.stock')}</Table.Column>
                  <Table.Column className="text-right">{t('actions')}</Table.Column>
                </Table.Header>
                <Table.Body>
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
                        ? ('warning' as const)
                        : campaign.templateKey === 'scratch-card'
                          ? ('accent' as const)
                          : ('default' as const);

                    const skinTone =
                      campaign.skinKey === 'tet'
                        ? ('danger' as const)
                        : campaign.skinKey === 'grand-opening'
                          ? ('warning' as const)
                          : ('accent' as const);

                    return (
                      <Table.Row
                        key={campaign.id}
                        id={campaign.id}
                        data-testid="campaign-row"
                        className={cx(
                          'transition-colors hover:bg-background-secondary-default/60',
                          isSelected && 'bg-background-secondary-default ring-1 ring-accent-500/30',
                        )}
                      >
                        {/* # index */}
                        <Table.Cell className="w-12 text-center text-caption-1-regular text-text-tertiary tabular-nums">
                          {idx + 1}
                        </Table.Cell>

                        {/* Name + Brand swatch */}
                        <Table.Cell>
                          <div className="flex items-center gap-2.5">
                            <div
                              aria-hidden="true"
                              className="size-3.5 shrink-0 rounded-full border border-border-button-default"
                              style={{ backgroundColor: campaign.brand.primary }}
                            />
                            <Link
                              href={
                                (rowPhase === 'draft'
                                  ? routes.edit(campaign.id)
                                  : routes.detail(campaign.id)) as Route
                              }
                              className="text-body-medium text-text-primary transition-colors hover:text-accent-600 hover:underline dark:hover:text-accent-400"
                            >
                              {campaign.name}
                            </Link>
                          </div>
                        </Table.Cell>

                        {/* Template & Skin chips */}
                        <Table.Cell>
                          <div className="flex items-center gap-1.5">
                            <Chip variant="soft" color={categoryTone}>
                              {tl(`templates.${campaign.templateKey}`)}
                            </Chip>
                            <Chip variant="soft" color={skinTone}>
                              {tl(`skins.${campaign.skinKey}`)}
                            </Chip>
                          </div>
                        </Table.Cell>

                        {/* Status */}
                        <Table.Cell>
                          <PhaseTag phase={rowPhase} />
                        </Table.Cell>

                        {/* Period */}
                        <Table.Cell>
                          <span className="text-body-medium text-text-secondary">
                            {campaignPeriod(format, campaign)}
                          </span>
                        </Table.Cell>

                        {/* Plays */}
                        <Table.Cell className="text-right tabular-nums text-body-medium font-medium text-text-primary">
                          {rowPhase === 'draft' ? (
                            <span className="text-text-tertiary">—</span>
                          ) : (
                            format.number(campaignStats?.plays ?? 0)
                          )}
                        </Table.Cell>

                        {/* Stock */}
                        <Table.Cell>
                          {rowPhase === 'draft' ? (
                            <span className="text-caption-1-regular text-text-tertiary">—</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-caption-1-regular tabular-nums text-text-secondary">
                                {remainingPrizes}/{totalPrizes}
                              </span>
                              <Chip
                                variant="soft"
                                color={
                                  stockPercent >= 60
                                    ? 'success'
                                    : stockPercent >= 20
                                      ? 'warning'
                                      : 'danger'
                                }
                              >
                                {stockPercent}%
                              </Chip>
                            </div>
                          )}
                        </Table.Cell>

                        {/* Actions */}
                        <Table.Cell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip delay={150}>
                              <Tooltip.Trigger>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  isIconOnly
                                  aria-label={t('quickView')}
                                  onClick={() => setSelectedCampaignId(campaign.id)}
                                >
                                  <RiSidebarUnfoldLine className="size-4" />
                                </Button>
                              </Tooltip.Trigger>
                              <Tooltip.Content>{t('quickView')}</Tooltip.Content>
                            </Tooltip>

                            <Dropdown>
                              <Dropdown.Trigger
                                aria-label={t('actions')}
                                className="inline-flex size-8 items-center justify-center rounded-2lg border border-border-button-default bg-background-primary-default text-foreground-icon-primary shadow-xs hover:bg-background-secondary-hover"
                              >
                                <RiMore2Fill className="size-4" />
                              </Dropdown.Trigger>
                              <Dropdown.Popover placement="bottom end">
                                <Dropdown.Menu
                                  aria-label={t('actions')}
                                  className="w-48"
                                  onAction={(key) => {
                                    if (key === 'quickView') setSelectedCampaignId(campaign.id);
                                    else if (key === 'copyLink') void handleCopyLink(campaign);
                                  }}
                                >
                                  <Dropdown.Item id="quickView" textValue={t('quickView')}>
                                    <RiSidebarUnfoldLine className="size-4" />
                                    <Label>{t('quickView')}</Label>
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    id="edit"
                                    href={routes.edit(campaign.id)}
                                    textValue={t('edit')}
                                  >
                                    <RiPencilLine className="size-4" />
                                    <Label>{t('edit')}</Label>
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    id="openOps"
                                    href={routes.detail(campaign.id)}
                                    textValue={t('openOps')}
                                  >
                                    <RiEyeLine className="size-4" />
                                    <Label>{t('openOps')}</Label>
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    id="play"
                                    href={
                                      rowPhase === 'draft'
                                        ? routes.rehearsal(campaign.id)
                                        : routes.play(campaign.slug)
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    textValue={rowPhase === 'draft' ? t('rehearse') : t('openPlay')}
                                  >
                                    <RiExternalLinkLine className="size-4" />
                                    <Label>
                                      {rowPhase === 'draft' ? t('rehearse') : t('openPlay')}
                                    </Label>
                                  </Dropdown.Item>
                                  <Separator />
                                  <Dropdown.Item id="copyLink" textValue={t('copyLink')}>
                                    <RiFileCopyLine className="size-4" />
                                    <Label>{t('copyLink')}</Label>
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown.Popover>
                            </Dropdown>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
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
        isOpen={Boolean(selectedCampaign)}
        onOpenChange={(open) => {
          if (!open) setSelectedCampaignId(null);
        }}
      >
        <Drawer.Backdrop isDismissable>
          <Drawer.Content placement="right">
            <Drawer.Dialog className="w-full max-w-[440px] sm:w-[440px]">
              <Drawer.CloseTrigger />
              {selectedCampaign && (
                <>
                  <Drawer.Header>
                    <Drawer.Heading>{selectedCampaign.name}</Drawer.Heading>
                    <div className="mt-1 flex items-center gap-2">
                      <PhaseTag phase={selectedPhase} />
                      <span className="text-caption-1-regular text-text-tertiary">
                        {tl(`templates.${selectedCampaign.templateKey}`)} ·{' '}
                        {tl(`skins.${selectedCampaign.skinKey}`)}
                      </span>
                    </div>
                  </Drawer.Header>

                  <Drawer.Body className="flex flex-col gap-5 py-4">
                    {/* Phone Mockup Canvas Preview */}
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-separator-border bg-background-secondary-default/40 p-4">
                      <PhoneMockup size="xs">
                        {selectedCoverScreen && (
                          <FitScreen
                            screen={selectedCoverScreen}
                            brand={selectedCampaign.brand}
                            prizes={toCanvasPrizes(selectedCampaign)}
                          />
                        )}
                      </PhoneMockup>
                      <p className="mt-2.5 text-caption-1-regular text-text-tertiary">
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
                        <p className="text-caption-1-medium text-text-secondary">
                          {t('draft.hint')}
                        </p>
                      </div>
                    )}

                    {/* Share & QR Access Link */}
                    <Card className="flex flex-col gap-2 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card">
                      <Card.Header className="p-0">
                        <Card.Title className="text-caption-1-semibold text-text-primary">
                          {t('openShare')}
                        </Card.Title>
                      </Card.Header>
                      <Card.Content className="p-0">
                        <div className="flex items-center gap-2">
                          <Input
                            readOnly
                            value={
                              selectedPhase === 'draft'
                                ? `${typeof window !== 'undefined' ? window.location.origin : ''}${routes.rehearsal(selectedCampaign.id)}`
                                : routes.play(selectedCampaign.slug)
                            }
                            className="min-w-0 flex-1 text-caption-1-regular select-all"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            className="shrink-0"
                            onClick={() => handleCopyLink(selectedCampaign)}
                          >
                            <RiFileCopyLine className="size-4" />
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
                        <div className="mt-2 flex items-center justify-between border-t border-separator-border pt-2">
                          <Link
                            href={routes.share(selectedCampaign.id) as Route}
                            className="inline-flex items-center gap-1.5 text-caption-1-medium text-accent-600 hover:underline dark:text-accent-400"
                          >
                            <RiQrCodeLine className="size-4" />
                            <span>{t('openShare')} (Standee / Tent)</span>
                          </Link>
                        </div>
                      </Card.Content>
                    </Card>
                  </Drawer.Body>

                  <Drawer.Footer className="gap-2 border-t border-separator-border pt-3">
                    {selectedPhase === 'draft' ? (
                      <>
                        <Link href={routes.edit(selectedCampaign.id) as Route}>
                          <Button variant="primary">
                            <RiPencilLine className="size-4" />
                            {t('edit')}
                          </Button>
                        </Link>
                        <Link href={routes.detail(selectedCampaign.id) as Route}>
                          <Button variant="secondary">
                            <RiEyeLine className="size-4" />
                            {t('openOps')}
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link href={routes.detail(selectedCampaign.id) as Route}>
                          <Button variant="primary">
                            <RiEyeLine className="size-4" />
                            {t('openOps')}
                          </Button>
                        </Link>
                        <Link href={routes.edit(selectedCampaign.id) as Route}>
                          <Button variant="secondary">
                            <RiPencilLine className="size-4" />
                            {t('edit')}
                          </Button>
                        </Link>
                      </>
                    )}
                    <Button variant="ghost" onClick={() => setSelectedCampaignId(null)}>
                      Đóng
                    </Button>
                  </Drawer.Footer>
                </>
              )}
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
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
    <Card className="group flex flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card transition-all duration-200 hover:shadow-dropdown">
      {/* Cover Canvas Screen */}
      <div className="relative h-[180px] overflow-hidden bg-background-tertiary-default">
        <FitScreen
          screen={
            (campaign as { screens?: CanvasDoc }).screens?.cover ??
            buildScreens(campaign.templateKey, campaign.skinKey).cover
          }
          brand={campaign.brand}
          prizes={toCanvasPrizes(campaign)}
        />
        <div className="absolute top-2.5 left-2.5">
          <PhaseTag phase={phase} />
        </div>
      </div>

      {/* Info Body */}
      <Card.Content className="flex flex-1 flex-col gap-2 p-4">
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
              color={percent < 20 ? 'danger' : 'accent'}
            >
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </div>
        )}

        {/* Action row */}
        <div className="mt-auto flex items-center gap-1.5 pt-3">
          <Link href={routes.edit(campaign.id) as Route} className="flex-1">
            <Button
              variant={phase === 'draft' ? 'primary' : 'secondary'}
              size="sm"
              className="w-full"
            >
              <RiPencilLine className="size-4" />
              {t('edit')}
            </Button>
          </Link>
          <Tooltip delay={150}>
            <Tooltip.Trigger>
              <Button
                size="sm"
                variant="secondary"
                isIconOnly
                aria-label={t('quickView')}
                onClick={onSelect}
              >
                <RiSidebarUnfoldLine className="size-4" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('quickView')}</Tooltip.Content>
          </Tooltip>
          <Link href={routes.detail(campaign.id) as Route}>
            <Button size="sm" variant="secondary" isIconOnly aria-label={t('openOps')}>
              <RiEyeLine className="size-4" />
            </Button>
          </Link>
          <Tooltip delay={150}>
            <Tooltip.Trigger>
              <Button
                size="sm"
                variant="secondary"
                isIconOnly
                aria-label={t('copyLink')}
                onClick={() => onCopyLink(campaign)}
              >
                <RiFileCopyLine className="size-4" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('copyLink')}</Tooltip.Content>
          </Tooltip>
        </div>
      </Card.Content>
    </Card>
  );
}
