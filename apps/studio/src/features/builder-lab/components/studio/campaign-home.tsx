'use client';

import { Skeleton } from '@playora/ui/components/base/skeleton/skeleton';
import { CircleAlert, Clock, Pause, PencilLine } from '@playora/ui/icons';
import { useNow, useTranslations } from 'next-intl';
import { QueryError } from '@/components/query-error';
import { useBrandKits } from '@/features/brand-kits/api';
import { useOrgMembers } from '@/features/members/api';
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
import { OutcomeTrendCard } from './home/outcome-trend-card';
import { PlaybooksQuickLaunch } from './home/playbooks-quick-launch';
import { SmartOnboardingBanner } from './home/smart-onboarding-banner';

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
  const now = useNow({ updateInterval: 60_000 }).getTime();
  const campaigns = useCampaigns(orgId);
  const brandKits = useBrandKits(orgId);
  const members = useOrgMembers(orgId);
  const items = campaigns.data ?? [];
  const campaignIds = items.map((c) => c.id);

  const { data: statsById } = useCampaignsStats(orgId, campaignIds);
  const { data: reportsById, isPending: reportsPending } = useCampaignsReports(orgId, campaignIds);
  const { vouchers, isPending: vouchersPending } = useCampaignsVouchers(
    orgId,
    campaignIds.slice(0, 5),
  );

  const routes = campaignRoutes(orgId);

  if (campaigns.isPending || brandKits.isPending || members.isPending) {
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

  const published = rows.find((row) => row.campaign.status === 'published');
  const firstDraft = rows.find((row) => row.phase === 'draft');
  const anyPlays = [...statsById.values()].some((s) => s.plays > 0);
  const teamSize =
    (members.data?.members.length ?? 1) +
    (members.data?.invitations.filter((i) => i.status === 'pending').length ?? 0);

  // Onboarding steps
  const steps = [
    {
      key: 'brand',
      done: (brandKits.data?.items.length ?? 0) > 0,
      title: t('steps.brand'),
      description: t('steps.brandDesc'),
      href: `/orgs/${orgId}/brand-kits`,
      action: t('steps.brandAction'),
    },
    {
      key: 'campaign',
      done: items.length > 0,
      title: t('steps.campaign'),
      description: t('steps.campaignDesc'),
      href: routes.create,
      action: t('steps.campaignAction'),
    },
    {
      key: 'publish',
      done: Boolean(published),
      title: t('steps.publish'),
      description: t('steps.publishDesc'),
      href: firstDraft ? routes.edit(firstDraft.campaign.id, 'rules') : routes.create,
      action: t('steps.publishAction'),
    },
    {
      key: 'share',
      done: anyPlays,
      title: t('steps.share'),
      description: t('steps.shareDesc'),
      href: published ? `${routes.detail(published.campaign.id)}?tab=share` : routes.list,
      action: t('steps.shareAction'),
    },
    {
      key: 'team',
      done: teamSize > 1,
      title: t('steps.team'),
      description: t('steps.teamDesc'),
      href: `/orgs/${orgId}/settings`,
      action: t('steps.teamAction'),
    },
  ];

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

  const hasIncompleteSteps = steps.some((step) => !step.done);

  return (
    <div className="flex flex-col gap-6">
      {/* Quick Launch by Goal (Playbooks) */}
      <PlaybooksQuickLaunch orgId={orgId} />

      {/* Onboarding Checklist for new organizations */}
      {hasIncompleteSteps && <SmartOnboardingBanner items={steps} />}

      {/* Row 1: KPI Stat Cards */}
      <HomeStatCards
        totalRedeemed={totalRedeemed}
        totalPlays={totalPlays}
        totalWins={totalWins}
        totalPrizeCostVnd={totalPrizeCostVnd}
        attentionCount={attention.length}
      />

      {/* Row 2: Bento Grid 2/3 (Outcome Trend Chart) + 1/3 (Attention Hub) */}
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

      {/* Row 3: Bento Grid 2/3 (Campaigns Data-Table) + 1/3 (Live Counter Feed) */}
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
