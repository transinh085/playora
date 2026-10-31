'use client';

import { toCanvasPrizes } from '@playora/ui/campaign';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@playora/ui/components/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@playora/ui/components/tooltip';
import { cn } from '@playora/ui/lib/utils';
import {
  Copy,
  ExternalLink,
  Eye,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Search,
  Sparkles,
  Table as TableIcon,
} from 'lucide-react';
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

type ViewMode = 'table' | 'grid';

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

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
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
  const visible = rows.filter(
    (row) =>
      (phase === 'all' || row.phase === phase) &&
      (!needle || row.campaign.name.toLowerCase().includes(needle)),
  );

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

  return (
    <TableCard
      toolbar={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border bg-muted/50 p-0.5 text-xs">
            <button
              type="button"
              className={cn(
                'rounded-full px-3 py-1 font-medium transition-all',
                phase === 'all'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setPhase('all')}
            >
              {t('all')} {rows.length}
            </button>
            {PHASES.filter((value) => count(value) > 0).map((value) => (
              <button
                key={value}
                type="button"
                className={cn(
                  'rounded-full px-3 py-1 font-medium transition-all',
                  phase === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setPhase(value)}
              >
                {t(`phase.${value}`)} {count(value)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('search')}
                aria-label={t('search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="inline-flex rounded-full border bg-muted/50 p-0.5 text-xs">
              <button
                type="button"
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-all',
                  viewMode === 'table'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="size-3.5" />
                <span>{t('viewTable')}</span>
              </button>
              <button
                type="button"
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-all',
                  viewMode === 'grid'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="size-3.5" />
                <span>{t('viewGrid')}</span>
              </button>
            </div>
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
                <TableHead>{t('columns.name')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
                <TableHead>{t('columns.period')}</TableHead>
                <TableHead className="text-right">{t('columns.plays')}</TableHead>
                <TableHead className="w-40">{t('columns.stock')}</TableHead>
                <TableHead className="w-20 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(({ campaign, phase: rowPhase }) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-16 w-11 shrink-0 overflow-hidden rounded-md border"
                        aria-hidden
                      >
                        <FitScreen
                          screen={buildScreens(campaign.templateKey, campaign.skinKey).cover}
                          brand={campaign.brand}
                          prizes={toCanvasPrizes(campaign)}
                        />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={
                            rowPhase === 'draft'
                              ? routes.edit(campaign.id)
                              : routes.detail(campaign.id)
                          }
                          className="truncate font-semibold hover:underline"
                        >
                          {campaign.name}
                        </Link>
                        <Caption className="block">
                          {tl(`templates.${campaign.templateKey}`)} ·{' '}
                          {tl(`skins.${campaign.skinKey}`)}
                        </Caption>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <PhaseTag phase={rowPhase} />
                  </TableCell>
                  <TableCell>{campaignPeriod(format, campaign)}</TableCell>
                  <TableCell className="text-right">
                    <PlaysCell campaign={campaign} phase={rowPhase} />
                  </TableCell>
                  <TableCell>
                    <StockCell campaign={campaign} phase={rowPhase} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={routes.edit(campaign.id)} aria-label={t('edit')}>
                            <Button variant="ghost" size="icon" className="size-8">
                              <Pencil className="size-3.5" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>{t('edit')}</TooltipContent>
                      </Tooltip>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
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
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map(({ campaign, phase: rowPhase }) => (
            <CampaignGridCard
              key={campaign.id}
              campaign={campaign}
              phase={rowPhase}
              routes={routes}
              format={format}
              onCopyLink={handleCopyLink}
            />
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
    <Card className="flex flex-col overflow-hidden rounded-2xl border">
      <div className="relative h-[180px] overflow-hidden bg-muted">
        <FitScreen
          screen={buildScreens(campaign.templateKey, campaign.skinKey).cover}
          brand={campaign.brand}
          prizes={toCanvasPrizes(campaign)}
        />
        <div className="absolute left-2.5 top-2.5">
          <PhaseTag phase={phase} />
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 p-3.5">
        <div>
          <Link
            href={phase === 'draft' ? routes.edit(campaign.id) : routes.detail(campaign.id)}
            className="line-clamp-1 text-sm font-semibold hover:underline"
          >
            {campaign.name}
          </Link>
          <Caption className="block">
            {tl(`templates.${campaign.templateKey}`)} · {tl(`skins.${campaign.skinKey}`)}
          </Caption>
        </div>

        <div className="text-xs text-muted-foreground">{campaignPeriod(format, campaign)}</div>

        {phase !== 'draft' && (
          <div className="pt-1">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('columns.stock')}</span>
              <span className="font-semibold tabular-nums">
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
              className="w-full gap-1.5 rounded-full text-xs"
            >
              <Pencil className="size-3" />
              {t('edit')}
            </Button>
          </Link>
          <Link href={routes.detail(campaign.id)}>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full text-xs">
              <Eye className="size-3" />
              {t('openOps')}
            </Button>
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-full"
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
  return <span className="tabular-nums">{stats.data?.plays ?? '…'}</span>;
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
    <div className="space-y-1">
      <Caption className="tabular-nums">
        {left}/{total}
      </Caption>
      <Progress value={percent} className={cn('h-1.5', percent < 20 && '[&>div]:bg-amber-500')} />
    </div>
  );
}
