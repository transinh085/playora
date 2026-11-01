'use client';

import { Card, Skeleton } from '@playora/ui/components';
import {
  ArrowRight,
  Calendar,
  CircleAlert,
  Clock,
  Pause,
  PencilLine,
  Repeat,
  Sparkles,
  WandSparkles,
} from '@playora/ui/icons';
import type { Route } from 'next';
import Link from 'next/link';
import { useNow, useTranslations } from 'next-intl';
import { IconTile, type Tone } from '@/components/icon-tile';
import { OnboardingLaunchpad } from '@/components/onboarding-launchpad';
import { QueryError } from '@/components/query-error';
import {
  useCampaigns,
  useCampaignsReports,
  useCampaignsStats,
  useCampaignsVouchers,
} from '../../api';
import { type CampaignPhase, campaignPhase } from '../../lib/phase';
import { campaignRoutes } from '../../lib/routes';
import { hasUnpublishedChanges } from '../editor/campaign-status-tag';
import { AttentionHub, type AttentionItem } from './home/attention-hub';
import { CampaignsDataTable } from './home/campaigns-data-table';
import { HomeStatCards } from './home/home-stat-cards';
import { LiveCounterFeed } from './home/live-counter-feed';
import {
  computePeriodComparison,
  formatPeriodDelta,
  OutcomeTrendCard,
} from './home/outcome-trend-card';

const ORDER: Record<CampaignPhase, number> = {
  live: 0,
  paused: 1,
  scheduled: 2,
  draft: 3,
  ended: 4,
};

const ENDING_SOON_MS = 3 * 86_400_000;
const LOW_STOCK_SHARE = 0.2;

export function CampaignHome({ orgId }: { orgId: string }) {
  const t = useTranslations('campaigns.home');
  const tp = useTranslations('builderLab.playbooks.items');
  const now = useNow({ updateInterval: 60_000 }).getTime();
  const campaigns = useCampaigns(orgId);
  const items = campaigns.data ?? [];
  const campaignIds = items.map((c) => c.id);

  const { data: statsById } = useCampaignsStats(orgId, campaignIds);
  const { data: reportsById, isPending: reportsPending } = useCampaignsReports(orgId, campaignIds);
  const { vouchers, isPending: vouchersPending } = useCampaignsVouchers(
    orgId,
    campaignIds.slice(0, 5),
  );

  const routes = campaignRoutes(orgId);

  if (campaigns.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-3xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (campaigns.isError) return <QueryError onRetry={() => campaigns.refetch()} />;

  const rows = items
    .map((campaign) => ({ campaign, phase: campaignPhase(campaign, now) }))
    .sort((a, b) => ORDER[a.phase] - ORDER[b.phase]);

  // Attention Items calculation
  const attention: AttentionItem[] = rows.flatMap(({ campaign, phase }): AttentionItem[] => {
    const list: AttentionItem[] = [];
    const detail = routes.detail(campaign.id);
    const s = statsById.get(campaign.id);

    if ((phase === 'live' || phase === 'paused') && s) {
      for (const prize of campaign.prizes) {
        const left = s.remainingByPrize[prize.id] ?? prize.quantity;
        if (prize.quantity > 0 && left / prize.quantity < LOW_STOCK_SHARE) {
          list.push({
            key: `${campaign.id}:stock:${prize.id}`,
            icon: CircleAlert,
            tone: 'error',
            text: t('attention.lowStock', {
              prize: prize.name,
              left,
              total: prize.quantity,
              campaign: campaign.name,
            }),
            href: routes.edit(campaign.id, 'rules'),
            action: t('attention.addStock'),
          });
        }
      }
    }

    if (phase === 'paused') {
      list.push({
        key: `${campaign.id}:paused`,
        icon: Pause,
        tone: 'warning',
        text: t('attention.paused', { campaign: campaign.name }),
        href: `${detail}?tab=settings`,
        action: t('attention.open'),
      });
    }

    if (phase === 'live' && Date.parse(campaign.rules.endsAt) - now < ENDING_SOON_MS) {
      list.push({
        key: `${campaign.id}:ending`,
        icon: Clock,
        tone: 'info',
        text: t('attention.endingSoon', { campaign: campaign.name }),
        href: `${detail}?tab=settings`,
        action: t('attention.extend'),
      });
    }

    if (campaign.status === 'published' && phase !== 'ended' && hasUnpublishedChanges(campaign)) {
      list.push({
        key: `${campaign.id}:dirty`,
        icon: PencilLine,
        tone: 'info',
        text: t('attention.unpublished', { campaign: campaign.name }),
        href: routes.edit(campaign.id),
        action: t('attention.review'),
      });
    }

    return list;
  });

  // Calculate totals
  const totalPlays = [...statsById.values()].reduce((sum, s) => sum + s.plays, 0);
  const totalWins = [...statsById.values()].reduce((sum, s) => sum + s.wins, 0);
  const totalRedeemed = [...statsById.values()].reduce((sum, s) => sum + s.redeemed, 0);
  const totalPrizeCostVnd = [...statsById.values()].reduce(
    (sum, s) => sum + (s.redeemedValueVnd ?? s.budgetUsedVnd ?? 0),
    0,
  );
  const periodComparison = computePeriodComparison(reportsById, new Date(now));
  const redeemedDelta = formatPeriodDelta(
    periodComparison.current7dVisits,
    periodComparison.prior7dVisits,
  );
  const playsDelta = formatPeriodDelta(
    periodComparison.current7dPlays,
    periodComparison.prior7dPlays,
  );

  const quickPlaybooks: {
    key: string;
    title: string;
    desc: string;
    href: string;
    tone: Tone;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'tet_traffic',
      title: tp('tet_traffic.title'),
      desc: tp('tet_traffic.goal'),
      href: `${routes.create}?playbook=tet_traffic`,
      tone: 'primary',
      icon: <Sparkles className="size-4" />,
    },
    {
      key: 'second_visit',
      title: tp('second_visit.title'),
      desc: tp('second_visit.goal'),
      href: `${routes.create}?playbook=second_visit`,
      tone: 'success',
      icon: <Repeat className="size-4" />,
    },
    {
      key: 'slow_days',
      title: tp('slow_days.title'),
      desc: tp('slow_days.goal'),
      href: `${routes.create}?playbook=slow_days`,
      tone: 'warning',
      icon: <Calendar className="size-4" />,
    },
    {
      key: 'custom',
      title: t('playbooks.custom'),
      desc: t('playbooks.customDesc'),
      href: `${routes.create}?start=templates`,
      tone: 'info',
      icon: <WandSparkles className="size-4" />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Row 0: Interactive SaaS Onboarding Launchpad */}
      <OnboardingLaunchpad orgId={orgId} />

      {/* Row 1: KPI Stat Cards */}
      <HomeStatCards
        totalRedeemed={totalRedeemed}
        totalPlays={totalPlays}
        totalWins={totalWins}
        totalPrizeCostVnd={totalPrizeCostVnd}
        attentionCount={attention.length}
        returningPlayers={periodComparison.returningVisitors}
        redeemedDelta={redeemedDelta}
        playsDelta={playsDelta}
      />

      {/* Row 2: Outcome Playbook Quick-Launcher (PLB-01) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-caption-1-semibold uppercase tracking-wider text-text-secondary">
            {t('playbooks.title')}
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickPlaybooks.map((item) => (
            <Link key={item.key} href={item.href as Route} className="group block">
              <Card className="flex flex-row items-center justify-between gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-3.5 shadow-card transition-all group-hover:border-border-card-hover group-hover:bg-background-secondary-default/40">
                <Card.Content className="flex min-w-0 flex-row items-center gap-3 p-0">
                  <IconTile tone={item.tone} size={38}>
                    {item.icon}
                  </IconTile>
                  <div className="min-w-0">
                    <span className="block truncate text-body-2-semibold text-text-primary group-hover:text-accent-600 dark:group-hover:text-accent-400">
                      {item.title}
                    </span>
                    <span className="block truncate text-caption-1-regular text-text-secondary">
                      {item.desc}
                    </span>
                  </div>
                </Card.Content>
                <ArrowRight className="size-4 shrink-0 text-foreground-icon-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary" />
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Row 3: Bento Grid 2/3 (Outcome Trend Chart) + 1/3 (Attention Hub) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OutcomeTrendCard
            orgId={orgId}
            reportsById={reportsById}
            campaigns={items}
            isPending={reportsPending}
          />
        </div>
        <div className="lg:col-span-1">
          <AttentionHub items={attention} />
        </div>
      </div>

      {/* Row 4: Bento Grid 2/3 (Campaigns List) + 1/3 (Live Counter Feed) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CampaignsDataTable orgId={orgId} rows={rows} total={rows.length} statsById={statsById} />
        </div>
        <div className="lg:col-span-1">
          <LiveCounterFeed
            orgId={orgId}
            vouchers={vouchers}
            campaigns={items}
            isPending={vouchersPending}
          />
        </div>
      </div>
    </div>
  );
}
