'use client';

import { Button, Card, Chip, ProgressBar, SearchField, Tabs } from '@playora/ui/components';
import { ExternalLink, Pencil, Plus, QrCode, Sparkles } from '@playora/ui/icons';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import type { CampaignListItem, CampaignStats } from '../../../api';
import type { CampaignPhase } from '../../../lib/phase';
import { campaignRoutes } from '../../../lib/routes';
import { campaignPeriod } from '../campaign-period';
import { PhaseTag } from '../phase-tag';
import { PlaybookTag } from '../playbook-tag';

type TableTab = 'all' | 'live' | 'draft_scheduled' | 'ended';

export function CampaignsDataTable({
  orgId,
  rows,
  total,
  statsById,
}: {
  orgId: string;
  rows: { campaign: CampaignListItem; phase: CampaignPhase }[];
  total: number;
  statsById: Map<string, CampaignStats>;
}) {
  const t = useTranslations('campaigns.home');
  const tc = useTranslations('campaigns');
  const format = useFormatter();
  const routes = campaignRoutes(orgId);
  const [activeTab, setActiveTab] = useState<TableTab>('all');
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    return rows.filter(({ campaign, phase }) => {
      if (activeTab === 'live' && phase !== 'live') return false;
      if (
        activeTab === 'draft_scheduled' &&
        phase !== 'draft' &&
        phase !== 'scheduled' &&
        phase !== 'paused'
      )
        return false;
      if (activeTab === 'ended' && phase !== 'ended') return false;

      if (search.trim()) {
        const query = search.trim().toLowerCase();
        if (!campaign.name.toLowerCase().includes(query)) return false;
      }

      return true;
    });
  }, [rows, activeTab, search]);

  return (
    <Card
      className="flex flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
      data-testid="home-campaigns"
    >
      {/* Header with Title & All Campaigns Link */}
      <Card.Header className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-separator-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Card.Title className="m-0 text-body-medium text-text-primary">
            {t('campaigns')}
          </Card.Title>
          <Chip variant="soft" size="sm" color="default" className="tabular-nums">
            {total}
          </Chip>
        </div>
        {total > 0 && (
          <Link
            href={routes.list as never}
            className="flex items-center gap-1 text-caption-1-medium text-accent-600 hover:underline dark:text-accent-400"
          >
            <span>{t('allCampaigns', { count: total })}</span>
            <ExternalLink className="size-3.5" />
          </Link>
        )}
      </Card.Header>

      {/* Toolbar: Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator-border bg-background-secondary-default/40 px-5 py-2.5">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(String(key) as TableTab)}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={t('campaigns')}>
              {(
                [
                  { key: 'all', label: t('table.tabs.all') },
                  { key: 'live', label: t('table.tabs.live') },
                  { key: 'draft_scheduled', label: t('table.tabs.draftScheduled') },
                  { key: 'ended', label: t('table.tabs.ended') },
                ] as const
              ).map((tab) => (
                <Tabs.Tab key={tab.key} id={tab.key}>
                  {tab.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        <SearchField
          value={search}
          onChange={setSearch}
          aria-label={t('table.searchPlaceholder')}
          className="w-full max-w-[220px]"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={t('table.searchPlaceholder')} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>

      {/* Card-List view (replaces cramped multi-column table on Home) */}
      <Card.Content className="p-0">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-foreground-icon-secondary">
              <Sparkles className="size-5" />
            </div>
            <p className="m-0 max-w-sm text-body-2-regular text-text-secondary">
              {rows.length === 0 ? t('noCampaigns') : tc('noMatch')}
            </p>
            {rows.length === 0 && (
              <Link href={routes.create as never}>
                <Button size="sm" excludeFromTabOrder>
                  <Plus className="size-4" />
                  {tc('create')}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-separator-border p-0">
            {filteredRows.map(({ campaign, phase }) => {
              const isDraft = phase === 'draft';
              const stats = statsById.get(campaign.id);

              const totalStock = campaign.prizes.reduce((sum, p) => sum + p.quantity, 0);
              const remainingStock = stats
                ? campaign.prizes.reduce(
                    (sum, p) => sum + (stats.remainingByPrize[p.id] ?? p.quantity),
                    0,
                  )
                : totalStock;
              const stockPercent =
                totalStock > 0 ? Math.round((remainingStock / totalStock) * 100) : 100;

              const plays = stats?.plays ?? 0;
              const wins = stats?.wins ?? 0;
              const redeemed = stats?.redeemed ?? 0;
              const redemptionRate = wins > 0 ? Math.round((redeemed / wins) * 100) : 0;

              return (
                <li
                  key={campaign.id}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-background-secondary-default/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Left: Brand Swatch + Title + Tags + Period */}
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                      aria-hidden="true"
                      className="mt-1 size-3.5 shrink-0 rounded-full border border-border-button-default shadow-2xs"
                      style={{ backgroundColor: campaign.brand.primary }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={
                            isDraft
                              ? (routes.edit(campaign.id) as never)
                              : (routes.detail(campaign.id) as never)
                          }
                          className="truncate text-body-medium text-text-primary hover:text-accent-600 hover:underline dark:hover:text-accent-400"
                        >
                          {campaign.name}
                        </Link>
                        <PhaseTag phase={phase} />
                        <PlaybookTag playbook={campaign.playbook} />
                      </div>
                      <p className="mt-0.5 m-0 text-caption-1-regular text-text-tertiary">
                        {campaignPeriod(format, campaign)}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Outcome Metrics Strip (Plays, Counter Visits, Stock) */}
                  {!isDraft && (
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div className="min-w-[84px]">
                        <span className="block text-caption-2-medium text-text-tertiary">
                          {t('table.columns.counterConversion')}
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-body-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                            {format.number(redeemed)}
                          </span>
                          {wins > 0 && (
                            <span className="text-caption-2-medium text-text-tertiary">
                              ({redemptionRate}%)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="min-w-[76px]">
                        <span className="block text-caption-2-medium text-text-tertiary">
                          {t('table.columns.performance')}
                        </span>
                        <span className="text-body-2-medium tabular-nums text-text-primary">
                          {format.number(plays)}{' '}
                          <span className="text-text-tertiary">/ {format.number(wins)}</span>
                        </span>
                      </div>

                      <div className="w-28">
                        <div className="mb-1 flex items-center justify-between text-caption-2-medium tabular-nums text-text-secondary">
                          <span>
                            {totalStock > 0
                              ? t('table.stockLeft', { left: remainingStock, total: totalStock })
                              : t('table.unlimited')}
                          </span>
                        </div>
                        {totalStock > 0 && (
                          <ProgressBar
                            value={stockPercent}
                            size="sm"
                            aria-label={t('table.columns.stock')}
                          >
                            <ProgressBar.Track>
                              <ProgressBar.Fill />
                            </ProgressBar.Track>
                          </ProgressBar>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Right: Quick Actions */}
                  <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
                    {isDraft ? (
                      <Link href={routes.edit(campaign.id) as never}>
                        <Button variant="secondary" size="sm" excludeFromTabOrder>
                          <Pencil className="size-4" />
                          {t('continueEditing')}
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <Link href={`${routes.detail(campaign.id)}?tab=share` as never}>
                          <Button variant="secondary" size="sm" excludeFromTabOrder>
                            <QrCode className="size-4" />
                            {t('share')}
                          </Button>
                        </Link>
                        <Link href={routes.detail(campaign.id) as never}>
                          <Button variant="ghost" size="sm" isIconOnly excludeFromTabOrder>
                            <ExternalLink className="size-4" />
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
}
