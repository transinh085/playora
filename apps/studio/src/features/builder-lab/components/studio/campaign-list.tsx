'use client';

import { toCanvasPrizes } from '@playora/ui/campaign';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent } from '@playora/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@playora/ui/components/dropdown-menu';
import { Input } from '@playora/ui/components/input';
import { Progress } from '@playora/ui/components/progress';
import { Skeleton } from '@playora/ui/components/skeleton';
import { toast } from '@playora/ui/components/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@playora/ui/components/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@playora/ui/components/tooltip';
import {
  Activity,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  Building2,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Eye,
  GripVertical,
  Hash,
  LayoutGrid,
  ListOrdered,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Tags,
} from '@playora/ui/icons';
import { cn } from '@playora/ui/lib/utils';
import Link from 'next/link';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Caption } from '@/components/caption';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { TableCard } from '@/components/table-card';
import { type CampaignListItem, useCampaignStats, useCampaigns } from '../../api';
import { type CampaignPhase, campaignPhase } from '../../lib/phase';
import { campaignRoutes } from '../../lib/routes';
import { buildScreens } from '../../lib/starter';
import { FitScreen } from '../editor/fit-screen';
import { campaignPeriod } from './campaign-period';
import { PhaseTag } from './phase-tag';

const PHASES: CampaignPhase[] = ['live', 'scheduled', 'draft', 'paused', 'ended'];

const ROW_GRADIENTS = [
  'from-emerald-400 to-cyan-500',
  'from-rose-400 to-red-500',
  'from-amber-400 to-orange-500',
  'from-blue-400 to-indigo-500',
  'from-fuchsia-400 to-purple-500',
  'from-cyan-400 to-blue-500',
] as const;

type ViewMode = 'table' | 'grid';
type RowDensity = 'compact' | 'default' | 'comfortable';
type SortKey = 'name' | 'template' | 'status' | 'period' | null;
type SortDir = 'asc' | 'desc';

const DENSITY_HEIGHT_CLASS: Record<RowDensity, string> = {
  compact: 'h-[36px]',
  default: 'h-[44px]',
  comfortable: 'h-[56px]',
};

export function CampaignList({ orgId }: { orgId: string }) {
  const t = useTranslations('campaigns');
  const tl = useTranslations('builderLab.home');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 }).getTime();
  const query = useCampaigns(orgId);
  const routes = campaignRoutes(orgId);
  const [phase, setPhase] = useState<CampaignPhase | 'all'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [density, setDensity] = useState<RowDensity>('default');
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [isViewDirty, setIsViewDirty] = useState(true);

  const toggleSort = (key: Exclude<SortKey, null>) => {
    setIsViewDirty(true);
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

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }
  if (query.isError) return <QueryError onRetry={() => query.refetch()} />;

  const rows = (query.data ?? []).map((campaign) => ({
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
    const aStart = new Date(a.campaign.rules.startsAt).getTime();
    const bStart = new Date(b.campaign.rules.startsAt).getTime();
    return (aStart - bStart) * mul;
  });

  const handleCopyLink = async (campaignId: string) => {
    try {
      const url = `${window.location.origin}${routes.play(campaignId)}`;
      await navigator.clipboard.writeText(url);
      toast.success(t('linkCopied'));
    } catch {
      // Fallback
    }
  };

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

  const activeFilterCount = (phase !== 'all' ? 1 : 0) + (needle ? 1 : 0);

  return (
    <TableCard
      toolbar={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          {/* Left: Filter (n) + Filter Chips + Add Filter (+) */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setPhase('all');
                setIsViewDirty(true);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-neutral-600 transition-all duration-150 hover:bg-neutral-100 active:scale-[0.97] dark:text-[#A3A3A3] dark:hover:bg-white/5"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-sm font-normal">
                Filter (<span className="tabular-nums">{activeFilterCount}</span>)
              </span>
            </button>

            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setPhase('all');
                  setIsViewDirty(true);
                }}
                className={cn(
                  'flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]',
                  phase === 'all'
                    ? 'border-neutral-200 bg-neutral-100 font-medium text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-[#FAFAFA]'
                    : 'border-transparent font-normal text-neutral-500 hover:bg-neutral-100 dark:text-[#737373] dark:hover:bg-white/5',
                )}
              >
                <span>{t('all')}</span>
                <span className="text-xs opacity-70 tabular-nums">{rows.length}</span>
              </button>
              {PHASES.filter((value) => count(value) > 0).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setPhase(value);
                    setIsViewDirty(true);
                  }}
                  className={cn(
                    'flex h-8 animate-crm-chip-in cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]',
                    phase === value
                      ? 'border-neutral-200 bg-neutral-100 font-medium text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-[#FAFAFA]'
                      : 'border-transparent font-normal text-neutral-500 hover:bg-neutral-100 dark:text-[#737373] dark:hover:bg-white/5',
                  )}
                >
                  <span>{t(`phase.${value}`)}</span>
                  <span className="text-xs opacity-70 tabular-nums">{count(value)}</span>
                </button>
              ))}
            </div>

            <Link
              href={routes.create}
              title={t('create')}
              aria-label={t('create')}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md p-1.5 text-neutral-500 transition-all duration-150 hover:bg-neutral-100 active:scale-95 dark:text-[#737373] dark:hover:bg-white/5"
            >
              <Plus className="h-4 w-4" />
            </Link>
          </div>

          {/* Right: Search + Layout + Sort + View Settings + Divider + Save */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder={t('search')}
                aria-label={t('search')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setIsViewDirty(true);
                }}
                className="h-8 rounded-md border-neutral-200 bg-white pl-8 text-[13px] shadow-none transition-all duration-150 dark:border-white/10 dark:bg-[#0A0A0A]"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-neutral-600 transition-all duration-150 hover:bg-neutral-100 active:scale-[0.97] dark:text-[#A3A3A3] dark:hover:bg-white/5"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden text-sm font-normal sm:block">Layout</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    setViewMode(viewMode === 'table' ? 'grid' : 'table');
                    setIsViewDirty(true);
                  }}
                  className="justify-between"
                >
                  <span>{viewMode === 'table' ? t('viewGrid') : t('viewTable')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {(
                  [
                    { key: 'compact', label: 'Compact (36px)' },
                    { key: 'default', label: 'Default (44px)' },
                    { key: 'comfortable', label: 'Comfortable (56px)' },
                  ] as const
                ).map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={() => {
                      setDensity(item.key);
                      setIsViewDirty(true);
                    }}
                    className="justify-between"
                  >
                    <span>{item.label}</span>
                    {density === item.key && <Check className="h-3.5 w-3.5 text-blue-500" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-150 hover:bg-neutral-100 active:scale-[0.97] dark:hover:bg-white/5',
                    sortKey
                      ? 'bg-neutral-100 font-medium text-neutral-900 dark:bg-white/10 dark:text-[#FAFAFA]'
                      : 'text-neutral-600 dark:text-[#A3A3A3]',
                  )}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden text-sm font-normal sm:block">
                    Sort{sortKey ? ` (1)` : ''}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {(
                  [
                    { key: 'name', label: t('columns.name') },
                    { key: 'template', label: 'Template' },
                    { key: 'status', label: t('columns.status') },
                    { key: 'period', label: t('columns.period') },
                  ] as const
                ).map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={() => toggleSort(item.key)}
                    className="justify-between"
                  >
                    <span>{item.label}</span>
                    {sortKey === item.key && (
                      <ArrowUp
                        className={cn(
                          'h-3.5 w-3.5 text-blue-500 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                          sortDir === 'desc' && 'rotate-180',
                        )}
                      />
                    )}
                  </DropdownMenuItem>
                ))}
                {sortKey && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setSortKey(null);
                        setIsViewDirty(true);
                      }}
                    >
                      Clear sort
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={() => {
                setViewMode(viewMode === 'table' ? 'grid' : 'table');
                setIsViewDirty(true);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-neutral-600 transition-all duration-150 hover:bg-neutral-100 active:scale-[0.97] dark:text-[#A3A3A3] dark:hover:bg-white/5"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden text-sm font-normal lg:block">View Settings</span>
            </button>

            <div className="mx-1 hidden h-[18px] w-[0.5px] bg-neutral-200 sm:block dark:bg-white/10" />

            <button
              type="button"
              title="Save view"
              aria-label="Save view"
              onClick={() => {
                setIsViewDirty(false);
              }}
              className="relative hidden h-8 w-8 cursor-pointer items-center justify-center rounded-md p-2 text-neutral-500 transition-all duration-150 hover:bg-neutral-100 active:scale-95 sm:flex dark:text-[#737373] dark:hover:bg-white/5"
            >
              <Save className="h-4 w-4" />
              <span
                className={cn(
                  'absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  isViewDirty ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
                )}
              />
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
        <div className="overflow-x-auto" data-testid="campaign-table">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Col 1: Numbering (#) */}
                <TableHead className="relative w-[52px] text-center">
                  <span className="text-sm font-medium text-neutral-500 dark:text-[#737373]">
                    #
                  </span>
                  <div className="group absolute top-0 right-0 z-30 flex h-full w-[10px] translate-x-1/2 cursor-col-resize justify-center">
                    <div className="h-full w-[2px] transition-colors duration-200 group-hover:bg-blue-500" />
                  </div>
                </TableHead>

                {/* Col 2: Campaign Name */}
                <TableHead className="relative">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="flex cursor-pointer items-center gap-2 text-left transition-opacity hover:opacity-80"
                    >
                      <Building2 className="h-4 w-4 shrink-0 text-neutral-500 dark:text-[#737373]" />
                      <span className="truncate text-sm font-normal text-neutral-900 dark:text-[#FAFAFA]">
                        {t('columns.name')}
                      </span>
                      <ArrowUp
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 text-blue-500 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                          sortKey === 'name' ? 'scale-100 opacity-100' : 'w-0 scale-75 opacity-0',
                          sortKey === 'name' && sortDir === 'desc' && 'rotate-180',
                        )}
                      />
                    </button>
                    <Link
                      href={routes.create}
                      aria-label={t('create')}
                      className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-[#FAFAFA]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="group absolute top-0 right-0 z-30 flex h-full w-[10px] translate-x-1/2 cursor-col-resize justify-center">
                    <div className="h-full w-[2px] transition-colors duration-200 group-hover:bg-blue-500" />
                  </div>
                </TableHead>

                {/* Col 3: Categories / Template */}
                <TableHead className="relative">
                  <button
                    type="button"
                    onClick={() => toggleSort('template')}
                    className="flex w-full cursor-pointer items-center gap-2 px-1 text-left transition-opacity hover:opacity-80"
                  >
                    <Tags className="h-4 w-4 shrink-0 text-neutral-500 dark:text-[#737373]" />
                    <span className="truncate text-sm font-normal text-neutral-900 dark:text-[#FAFAFA]">
                      Template
                    </span>
                    <ArrowUp
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-blue-500 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                        sortKey === 'template' ? 'scale-100 opacity-100' : 'w-0 scale-75 opacity-0',
                        sortKey === 'template' && sortDir === 'desc' && 'rotate-180',
                      )}
                    />
                  </button>
                  <div className="group absolute top-0 right-0 z-30 flex h-full w-[10px] translate-x-1/2 cursor-col-resize justify-center">
                    <div className="h-full w-[2px] transition-colors duration-200 group-hover:bg-blue-500" />
                  </div>
                </TableHead>

                {/* Col 4: Status */}
                <TableHead className="relative">
                  <button
                    type="button"
                    onClick={() => toggleSort('status')}
                    className="flex w-full cursor-pointer items-center gap-2 px-1 text-left transition-opacity hover:opacity-80"
                  >
                    <Activity className="h-4 w-4 shrink-0 text-neutral-500 dark:text-[#737373]" />
                    <span className="truncate text-sm font-normal text-neutral-900 dark:text-[#FAFAFA]">
                      {t('columns.status')}
                    </span>
                    <ArrowUp
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-blue-500 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                        sortKey === 'status' ? 'scale-100 opacity-100' : 'w-0 scale-75 opacity-0',
                        sortKey === 'status' && sortDir === 'desc' && 'rotate-180',
                      )}
                    />
                  </button>
                  <div className="group absolute top-0 right-0 z-30 flex h-full w-[10px] translate-x-1/2 cursor-col-resize justify-center">
                    <div className="h-full w-[2px] transition-colors duration-200 group-hover:bg-blue-500" />
                  </div>
                </TableHead>

                {/* Col 5: Period */}
                <TableHead className="relative">
                  <button
                    type="button"
                    onClick={() => toggleSort('period')}
                    className="flex w-full cursor-pointer items-center gap-2 px-1 text-left transition-opacity hover:opacity-80"
                  >
                    <Calendar className="h-4 w-4 shrink-0 text-neutral-500 dark:text-[#737373]" />
                    <span className="truncate text-sm font-normal text-neutral-900 dark:text-[#FAFAFA]">
                      {t('columns.period')}
                    </span>
                    <ArrowUp
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-blue-500 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                        sortKey === 'period' ? 'scale-100 opacity-100' : 'w-0 scale-75 opacity-0',
                        sortKey === 'period' && sortDir === 'desc' && 'rotate-180',
                      )}
                    />
                  </button>
                  <div className="group absolute top-0 right-0 z-30 flex h-full w-[10px] translate-x-1/2 cursor-col-resize justify-center">
                    <div className="h-full w-[2px] transition-colors duration-200 group-hover:bg-blue-500" />
                  </div>
                </TableHead>

                {/* Col 6: Plays */}
                <TableHead className="relative text-right">
                  <div className="flex items-center justify-end gap-2 px-1">
                    <Hash className="h-4 w-4 shrink-0 text-neutral-500 dark:text-[#737373]" />
                    <span className="truncate text-sm font-normal text-neutral-900 dark:text-[#FAFAFA]">
                      {t('columns.plays')}
                    </span>
                  </div>
                  <div className="group absolute top-0 right-0 z-30 flex h-full w-[10px] translate-x-1/2 cursor-col-resize justify-center">
                    <div className="h-full w-[2px] transition-colors duration-200 group-hover:bg-blue-500" />
                  </div>
                </TableHead>

                {/* Col 7: Stock */}
                <TableHead className="relative w-40">
                  <div className="flex items-center gap-2 px-1">
                    <Briefcase className="h-4 w-4 shrink-0 text-neutral-500 dark:text-[#737373]" />
                    <span className="truncate text-sm font-normal text-neutral-900 dark:text-[#FAFAFA]">
                      {t('columns.stock')}
                    </span>
                  </div>
                  <div className="group absolute top-0 right-0 z-30 flex h-full w-[10px] translate-x-1/2 cursor-col-resize justify-center">
                    <div className="h-full w-[2px] transition-colors duration-200 group-hover:bg-blue-500" />
                  </div>
                </TableHead>

                {/* Col 8: Actions */}
                <TableHead className="w-20 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(({ campaign, phase: rowPhase }, idx) => {
                const grad = ROW_GRADIENTS[idx % ROW_GRADIENTS.length];
                const categoryTone =
                  campaign.templateKey === 'spin-wheel'
                    ? ('orange' as const)
                    : campaign.templateKey === 'scratch-card'
                      ? ('teal' as const)
                      : ('purple' as const);
                const skinTone =
                  campaign.skinKey === 'tet'
                    ? ('rose' as const)
                    : campaign.skinKey === 'grand-opening'
                      ? ('indigo' as const)
                      : ('blue' as const);

                return (
                  <TableRow
                    key={campaign.id}
                    style={{ animationDelay: `${Math.min(idx * 25, 250)}ms` }}
                    className={cn(
                      'group animate-crm-row-in transition-[height,background-color] duration-[340ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
                      DENSITY_HEIGHT_CLASS[density],
                    )}
                  >
                    {/* Col 1: Row number + GripVertical on hover */}
                    <TableCell
                      className={cn(
                        'w-[52px] text-center transition-[height,padding] duration-[340ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
                        DENSITY_HEIGHT_CLASS[density],
                      )}
                    >
                      <div className="relative flex items-center justify-center">
                        <span className="text-sm font-normal text-neutral-500 tabular-nums group-hover:hidden dark:text-[#A3A3A3]">
                          {idx + 1}
                        </span>
                        <span
                          aria-hidden="true"
                          className="hidden items-center justify-center rounded p-1 text-neutral-400 group-hover:flex dark:text-[#737373]"
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                      </div>
                    </TableCell>

                    {/* Col 2: Gradient swatch + Campaign Link */}
                    <TableCell>
                      <div className="flex items-center gap-2 px-1">
                        <div
                          aria-hidden="true"
                          className={`h-4 w-4 shrink-0 rounded-md bg-gradient-to-tr ${grad} shadow-2xs`}
                        />
                        <Link
                          href={
                            rowPhase === 'draft'
                              ? routes.edit(campaign.id)
                              : routes.detail(campaign.id)
                          }
                          className="truncate text-sm font-medium text-neutral-900 transition-colors hover:underline dark:text-[#FAFAFA]"
                        >
                          {campaign.name}
                        </Link>
                      </div>
                    </TableCell>

                    {/* Col 3: Pastel Category Tags */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 px-1">
                        <Badge variant={categoryTone}>
                          {tl(`templates.${campaign.templateKey}`)}
                        </Badge>
                        <Badge variant={skinTone}>{tl(`skins.${campaign.skinKey}`)}</Badge>
                      </div>
                    </TableCell>

                    {/* Col 4: Status */}
                    <TableCell>
                      <div className="px-1">
                        <PhaseTag phase={rowPhase} />
                      </div>
                    </TableCell>

                    {/* Col 5: Period */}
                    <TableCell>
                      <span className="px-1 text-sm font-normal text-neutral-600 dark:text-[#A3A3A3]">
                        {campaignPeriod(format, campaign)}
                      </span>
                    </TableCell>

                    {/* Col 6: Plays */}
                    <TableCell className="text-right">
                      <div className="px-1">
                        <PlaysCell campaign={campaign} phase={rowPhase} />
                      </div>
                    </TableCell>

                    {/* Col 7: Stock */}
                    <TableCell>
                      <div className="px-1">
                        <StockCell campaign={campaign} phase={rowPhase} />
                      </div>
                    </TableCell>

                    {/* Col 8: Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={routes.edit(campaign.id)} aria-label={t('edit')}>
                              <Button variant="ghost" size="icon" className="size-7 rounded-md">
                                <Pencil className="size-3.5" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>{t('edit')}</TooltipContent>
                        </Tooltip>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 rounded-md">
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={routes.edit(campaign.id)} className="gap-2">
                                <Pencil className="size-3.5" />
                                {t('edit')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={routes.detail(campaign.id)} className="gap-2">
                                <Eye className="size-3.5" />
                                {t('openOps')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a
                                href={routes.play(campaign.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="gap-2"
                              >
                                <ExternalLink className="size-3.5" />
                                {t('openPlay')}
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleCopyLink(campaign.id)}
                              className="gap-2"
                            >
                              <Copy className="size-3.5" />
                              {t('copyLink')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            {/* Sticky Table Footer Row (1-to-1 Louis CRM) */}
            <TableFooter>
              <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                <TableCell className="text-center text-sm font-normal text-neutral-500 dark:text-[#A3A3A3]">
                  -
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 px-1 text-sm font-normal text-neutral-500 tabular-nums dark:text-[#A3A3A3]">
                    <ListOrdered className="h-4 w-4 shrink-0" />
                    <span>Total: {visible.length}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 px-1 text-sm font-normal text-neutral-500 dark:text-[#A3A3A3]">
                    <ListOrdered className="h-4 w-4 shrink-0" />
                    <span>Count</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 px-1 text-sm font-normal text-neutral-500 dark:text-[#A3A3A3]">
                    <ListOrdered className="h-4 w-4 shrink-0" />
                    <span>Count</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 px-1 text-sm font-normal text-neutral-500 dark:text-[#A3A3A3]">
                    <ListOrdered className="h-4 w-4 shrink-0" />
                    <span>Count</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2 px-1 text-sm font-normal text-neutral-500 dark:text-[#A3A3A3]">
                    <ListOrdered className="h-4 w-4 shrink-0" />
                    <span>Count</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 px-1 text-sm font-normal text-neutral-500 dark:text-[#A3A3A3]">
                    <ListOrdered className="h-4 w-4 shrink-0" />
                    <span>Count</span>
                  </div>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map(({ campaign, phase: rowPhase }, idx) => (
            <div
              key={campaign.id}
              style={{ animationDelay: `${Math.min(idx * 35, 280)}ms` }}
              className="animate-crm-row-in"
            >
              <CampaignGridCard
                campaign={campaign}
                phase={rowPhase}
                routes={routes}
                format={format}
                onCopyLink={handleCopyLink}
              />
            </div>
          ))}
        </div>
      )}
    </TableCard>
  );
}

function CampaignGridCard({
  campaign,
  phase,
  routes,
  format,
  onCopyLink,
}: {
  campaign: CampaignListItem;
  phase: CampaignPhase;
  routes: ReturnType<typeof campaignRoutes>;
  format: ReturnType<typeof useFormatter>;
  onCopyLink: (id: string) => void;
}) {
  const t = useTranslations('campaigns');
  const tl = useTranslations('builderLab.home');
  const stats = useCampaignStats(campaign.organizationId, campaign.id, {
    enabled: phase !== 'draft',
  });
  const total = campaign.prizes.reduce((sum, prize) => sum + prize.quantity, 0);
  const left = Object.values(stats.data?.remainingByPrize ?? {}).reduce((a, b) => a + b, 0);
  const percent = total ? Math.round((left / total) * 100) : 0;

  return (
    <Card className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 dark:border-white/10">
      <div className="relative h-[180px] overflow-hidden bg-muted">
        <FitScreen
          screen={buildScreens(campaign.templateKey, campaign.skinKey).cover}
          brand={campaign.brand}
          prizes={toCanvasPrizes(campaign)}
        />
        <div className="absolute top-2.5 left-2.5">
          <PhaseTag phase={phase} />
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 p-3.5">
        <div>
          <Link
            href={phase === 'draft' ? routes.edit(campaign.id) : routes.detail(campaign.id)}
            className="line-clamp-1 text-sm font-medium hover:underline"
          >
            {campaign.name}
          </Link>
          <Caption className="block">
            {tl(`templates.${campaign.templateKey}`)} · {tl(`skins.${campaign.skinKey}`)}
          </Caption>
        </div>

        <div className="text-[13px] text-muted-foreground">{campaignPeriod(format, campaign)}</div>

        {phase !== 'draft' && (
          <div className="pt-1">
            <div className="mb-1 flex items-center justify-between text-[13px] text-muted-foreground">
              <span>{t('columns.stock')}</span>
              <span className="font-medium tabular-nums">
                {left}/{total}
              </span>
            </div>
            <Progress
              value={percent}
              className={cn('h-1.5', percent < 20 && '[&>div]:bg-destructive')}
            />
          </div>
        )}

        <div className="mt-auto flex items-center gap-1.5 pt-2">
          <Link href={routes.edit(campaign.id)} className="flex-1">
            <Button
              variant={phase === 'draft' ? 'default' : 'outline'}
              size="sm"
              className="w-full gap-1.5 rounded-md text-[13px]"
            >
              <Pencil className="size-3.5" />
              {t('edit')}
            </Button>
          </Link>
          <Link href={routes.detail(campaign.id)}>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-md text-[13px]">
              <Eye className="size-3.5" />
              {t('openOps')}
            </Button>
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-md"
                onClick={() => onCopyLink(campaign.id)}
              >
                <Copy className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('copyLink')}</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}

function PlaysCell({ campaign, phase }: { campaign: CampaignListItem; phase: CampaignPhase }) {
  const stats = useCampaignStats(campaign.organizationId, campaign.id, {
    enabled: phase !== 'draft',
  });
  if (phase === 'draft') return <Caption>—</Caption>;
  return (
    <span className="text-sm font-medium text-neutral-900 tabular-nums dark:text-[#FAFAFA]">
      {stats.data?.plays ?? '…'}
    </span>
  );
}

/** Prizes left over prizes stocked; amber under 20 % so running low is visible at a glance. */
function StockCell({ campaign, phase }: { campaign: CampaignListItem; phase: CampaignPhase }) {
  const stats = useCampaignStats(campaign.organizationId, campaign.id, {
    enabled: phase !== 'draft',
  });
  if (phase === 'draft') return <Caption>—</Caption>;
  const total = campaign.prizes.reduce((sum, prize) => sum + prize.quantity, 0);
  const left = Object.values(stats.data?.remainingByPrize ?? {}).reduce((a, b) => a + b, 0);
  const percent = total ? Math.round((left / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-normal text-neutral-900 tabular-nums dark:text-[#FAFAFA]">
        {left}/{total}
      </span>
      <Badge variant={percent >= 60 ? 'success' : percent >= 20 ? 'warning' : 'rose'}>
        {percent}%
      </Badge>
    </div>
  );
}
