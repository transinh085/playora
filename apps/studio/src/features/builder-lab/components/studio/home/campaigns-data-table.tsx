'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { InputBase } from '@playora/ui/components/base/input/input';
import { ProgressBar } from '@playora/ui/components/base/progress/progress';
import { ExternalLink, Pencil, QrCode, Search } from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import type { CampaignListItem, CampaignStats } from '../../../api';
import type { CampaignPhase } from '../../../lib/phase';
import { campaignRoutes } from '../../../lib/routes';
import { campaignPeriod } from '../campaign-period';
import { PhaseTag } from '../phase-tag';
import { PlaybookTag } from '../playbook-tag';

const ROW_GRADIENTS = [
  'from-emerald-400 to-cyan-500',
  'from-rose-400 to-red-500',
  'from-amber-400 to-orange-500',
  'from-blue-400 to-indigo-500',
  'from-fuchsia-400 to-purple-500',
  'from-cyan-400 to-blue-500',
] as const;

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
  const format = useFormatter();
  const routes = campaignRoutes(orgId);
  const [activeTab, setActiveTab] = useState<TableTab>('all');
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    return rows.filter(({ campaign, phase }) => {
      // Tab filter
      if (activeTab === 'live' && phase !== 'live') return false;
      if (
        activeTab === 'draft_scheduled' &&
        phase !== 'draft' &&
        phase !== 'scheduled' &&
        phase !== 'paused'
      )
        return false;
      if (activeTab === 'ended' && phase !== 'ended') return false;

      // Search filter
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        if (!campaign.name.toLowerCase().includes(query)) return false;
      }

      return true;
    });
  }, [rows, activeTab, search]);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"
      data-testid="home-campaigns"
    >
      {/* Header with Title & All Campaigns Link */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <h3 className="text-body-medium text-text-primary">{t('campaigns')}</h3>
          <span className="rounded-md border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-caption-1-medium tabular-nums text-text-secondary">
            {total}
          </span>
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
      </div>

      {/* Toolbar: Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator-border bg-background-secondary-default/40 px-5 py-2.5">
        <div className="flex items-center gap-1 rounded-xl border border-border-button-default bg-background-primary-default p-0.5">
          {(
            [
              { key: 'all', label: t('table.tabs.all') },
              { key: 'live', label: t('table.tabs.live') },
              { key: 'draft_scheduled', label: t('table.tabs.draftScheduled') },
              { key: 'ended', label: t('table.tabs.ended') },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cx(
                'rounded-lg px-2.5 py-1 text-caption-1-medium transition-all',
                activeTab === tab.key
                  ? 'bg-background-secondary-default text-text-primary font-semibold shadow-xs'
                  : 'text-text-tertiary hover:text-text-secondary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full max-w-[220px]">
          <InputBase
            size="small"
            placeholder={t('table.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leadingIcon={Search}
            className="h-8 text-caption-1-regular"
          />
        </div>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto">
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-caption-1-regular text-text-tertiary">
              {rows.length === 0 ? t('noCampaigns') : t('table.searchPlaceholder')}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-caption-1-regular">
            <thead>
              <tr className="border-b border-separator-border text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
                <th className="px-5 py-3">{t('table.columns.campaign')}</th>
                <th className="px-4 py-3">{t('table.columns.phase')}</th>
                <th className="px-4 py-3">{t('table.columns.performance')}</th>
                <th className="px-4 py-3">{t('table.columns.counterConversion')}</th>
                <th className="px-4 py-3">{t('table.columns.stock')}</th>
                <th className="px-5 py-3 text-right">{t('table.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-separator-border">
              {filteredRows.map(({ campaign, phase }, idx) => {
                const isDraft = phase === 'draft';
                const stats = statsById.get(campaign.id);
                const gradient = ROW_GRADIENTS[idx % ROW_GRADIENTS.length];

                // Calculate stock remaining
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
                  <tr
                    key={campaign.id}
                    className="transition-colors hover:bg-background-secondary-default/50"
                  >
                    {/* Campaign Name + Playbook */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={cx(
                            'size-8 shrink-0 rounded-lg bg-gradient-to-br shadow-xs',
                            gradient,
                          )}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={
                                isDraft
                                  ? (routes.edit(campaign.id) as never)
                                  : (routes.detail(campaign.id) as never)
                              }
                              className="truncate text-caption-1-semibold text-text-primary hover:text-accent-600 dark:hover:text-accent-400 hover:underline"
                            >
                              {campaign.name}
                            </Link>
                            <PlaybookTag playbook={campaign.playbook} />
                          </div>
                          <p className="mt-0.5 text-[11px] text-text-tertiary">
                            {campaignPeriod(format, campaign)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status Phase Tag */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <PhaseTag phase={phase} />
                    </td>

                    {/* Performance: Plays / Wins */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 tabular-nums text-text-primary">
                          <span className="font-medium">{format.number(plays)}</span>
                          <span className="text-text-tertiary">/</span>
                          <span className="text-text-secondary">{format.number(wins)}</span>
                        </div>
                        <p className="text-[10px] text-text-tertiary">
                          {t('plays', { count: plays })}
                        </p>
                      </div>
                    </td>

                    {/* Counter Conversion: Redeemed + % rate */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {format.number(redeemed)}
                        </span>
                        {wins > 0 && (
                          <p className="text-[10px] text-text-tertiary">
                            {t('table.rate', { percent: redemptionRate })}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Prize Stock Progress */}
                    <td className="px-4 py-3.5 whitespace-nowrap min-w-[120px]">
                      {totalStock > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] tabular-nums text-text-secondary">
                            <span>
                              {t('table.stockLeft', {
                                left: remainingStock,
                                total: totalStock,
                              })}
                            </span>
                            <span className="text-[10px] text-text-tertiary">{stockPercent}%</span>
                          </div>
                          <ProgressBar
                            value={stockPercent}
                            size="sm"
                            aria-label={t('table.columns.stock')}
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] text-text-tertiary">
                          {t('table.unlimited')}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {isDraft ? (
                          <Link href={routes.edit(campaign.id) as never}>
                            <Button
                              variant="secondary"
                              size="xs"
                              leadingIcon={Pencil}
                              tabIndex={-1}
                            >
                              {t('continueEditing')}
                            </Button>
                          </Link>
                        ) : (
                          <>
                            <Link href={`${routes.detail(campaign.id)}?tab=share` as never}>
                              <Button
                                variant="secondary"
                                size="xs"
                                leadingIcon={QrCode}
                                tabIndex={-1}
                              >
                                {t('share')}
                              </Button>
                            </Link>
                            <Link href={routes.detail(campaign.id) as never}>
                              <Button variant="ghost" size="xs" tabIndex={-1}>
                                <ExternalLink className="size-3.5" />
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
