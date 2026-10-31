'use client';

import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
import { Skeleton } from '@playora/ui/components/skeleton';
import { CircleAlert, Clock, Gift, Pause, PencilLine, Play, Radio, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Caption } from '@/components/caption';
import { Checklist } from '@/components/checklist';
import { MetricGrid } from '@/components/metric-card';
import { QueryError } from '@/components/query-error';
import { useBrandKits } from '@/features/brand-kits/api';
import { useOrgMembers } from '@/features/members/api';
import {
  type CampaignListItem,
  type CampaignStats,
  useCampaigns,
  useCampaignsStats,
} from '../../api';
import { type CampaignPhase, campaignPhase } from '../../lib/phase';
import { campaignRoutes } from '../../lib/routes';
import { buildScreens, skinBrand } from '../../lib/starter';
import { hasUnpublishedChanges } from '../editor/campaign-status-tag';
import { FitScreen } from '../editor/fit-screen';
import { campaignPeriod } from './campaign-period';
import { PhaseTag } from './phase-tag';

const ORDER: Record<CampaignPhase, number> = {
  live: 0,
  paused: 1,
  scheduled: 2,
  draft: 3,
  ended: 4,
};
const RECENT_LIMIT = 5;
const ENDING_SOON_MS = 3 * 86_400_000;
const LOW_STOCK_SHARE = 0.2;

type Attention = {
  key: string;
  icon: typeof Clock;
  tone: 'error' | 'warning' | 'info';
  text: string;
  href: string;
  action: string;
};

export function CampaignHome({ orgId }: { orgId: string }) {
  const t = useTranslations('campaigns.home');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 }).getTime();
  const campaigns = useCampaigns(orgId);
  const brandKits = useBrandKits(orgId);
  const members = useOrgMembers(orgId);
  const items = campaigns.data ?? [];
  const { data: statsById } = useCampaignsStats(
    orgId,
    items.map((c) => c.id),
  );
  const routes = campaignRoutes(orgId);

  if (campaigns.isPending || brandKits.isPending || members.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
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

  const attention: Attention[] = rows.flatMap(({ campaign, phase }): Attention[] => {
    const list: Attention[] = [];
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

  const liveCount = rows.filter((r) => r.phase === 'live').length;
  const draftAndScheduledCount = rows.filter(
    (r) => r.phase === 'draft' || r.phase === 'scheduled',
  ).length;
  const totalPlays = [...statsById.values()].reduce((sum, s) => sum + s.plays, 0);
  const totalPrizesIssued = [...statsById.values()].reduce((sum, s) => sum + s.wins, 0);

  return (
    <div className="flex flex-col gap-5">
      <MetricGrid
        items={[
          {
            label: t('metrics.liveCampaigns'),
            value: liveCount,
            subtext: t('metrics.liveCampaignsSubtext', { count: draftAndScheduledCount }),
            icon: <Radio className="size-5" />,
            tone: 'primary',
          },
          {
            label: t('metrics.totalPlays'),
            value: format.number(totalPlays),
            subtext: t('metrics.totalPlaysSubtext'),
            icon: <Play className="size-5" />,
            tone: 'info',
          },
          {
            label: t('metrics.prizesIssued'),
            value: format.number(totalPrizesIssued),
            subtext: t('metrics.prizesIssuedSubtext'),
            icon: <Gift className="size-5" />,
            tone: 'success',
          },
          {
            label: t('metrics.attentionNeeded'),
            value: attention.length,
            subtext:
              attention.length > 0
                ? t('metrics.attentionNeededSubtext', { count: attention.length })
                : t('metrics.allGood'),
            icon:
              attention.length > 0 ? (
                <CircleAlert className="size-5" />
              ) : (
                <Sparkles className="size-5" />
              ),
            tone: attention.length > 0 ? 'warning' : 'success',
          },
        ]}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {attention.length > 0 && <AttentionCard items={attention} />}
          {steps.some((step) => !step.done) && (
            <Checklist title={t('gettingStarted')} items={steps} testId="home-checklist" />
          )}
          <RecentCampaigns
            orgId={orgId}
            rows={rows.slice(0, RECENT_LIMIT)}
            total={rows.length}
            statsById={statsById}
          />
        </div>
        <TemplateTeaser orgId={orgId} />
      </div>
    </div>
  );
}

function AttentionCard({ items }: { items: Attention[] }) {
  const t = useTranslations('campaigns.home');
  return (
    <Card className="rounded-2xl border" data-testid="home-attention">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">{t('attention.title')}</CardTitle>
        <Caption>{items.length}</Caption>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(({ key, icon: Icon, tone, text, href, action }) => {
          const colorClass =
            tone === 'error'
              ? 'text-destructive'
              : tone === 'warning'
                ? 'text-amber-500'
                : 'text-blue-500';
          return (
            <div key={key} className="flex items-center gap-2.5 text-sm">
              <Icon className={`size-4 shrink-0 ${colorClass}`} />
              <span className="min-w-0 flex-1 truncate">{text}</span>
              <Link href={href as never}>
                <Button variant="outline" size="sm" tabIndex={-1} className="h-7 text-xs">
                  {action}
                </Button>
              </Link>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function RecentCampaigns({
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

  return (
    <Card className="rounded-2xl border" data-testid="home-campaigns">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">{t('campaigns')}</CardTitle>
        {total > 0 && (
          <Link href={routes.list} className="text-xs text-primary hover:underline">
            {t('allCampaigns', { count: total })}
          </Link>
        )}
      </CardHeader>
      <CardContent className="p-4">
        {rows.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">{t('noCampaigns')}</div>
        ) : (
          <ul className="m-0 divide-y list-none p-0">
            {rows.map(({ campaign, phase }) => {
              const isDraft = phase === 'draft';
              const plays = statsById.get(campaign.id)?.plays;
              return (
                <li key={campaign.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={isDraft ? routes.edit(campaign.id) : routes.detail(campaign.id)}
                          className="font-semibold hover:underline"
                        >
                          {campaign.name}
                        </Link>
                        <PhaseTag phase={phase} />
                      </div>
                      <Caption>
                        {campaignPeriod(format, campaign)}
                        {!isDraft && plays !== undefined
                          ? ` · ${t('plays', { count: plays })}`
                          : ''}
                      </Caption>
                    </div>
                    <Link
                      href={
                        isDraft
                          ? routes.edit(campaign.id)
                          : `${routes.detail(campaign.id)}?tab=share`
                      }
                    >
                      <Button variant="outline" size="sm" tabIndex={-1} className="h-8 text-xs">
                        {isDraft ? t('continueEditing') : t('share')}
                      </Button>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const TEASER = [
  { templateKey: 'spin-wheel', skinKey: 'tet' },
  { templateKey: 'scratch-card', skinKey: 'grand-opening' },
] as const;

function TemplateTeaser({ orgId }: { orgId: string }) {
  const t = useTranslations('campaigns.home');
  const tl = useTranslations('builderLab.home');
  const href = campaignRoutes(orgId).create;
  const covers = useMemo(
    () =>
      TEASER.map((c) => ({
        ...c,
        screen: buildScreens(c.templateKey, c.skinKey).cover,
        brand: skinBrand(c.skinKey),
      })),
    [],
  );

  return (
    <Card className="rounded-2xl border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">{t('templates')}</CardTitle>
        <Link href={href} className="text-xs text-primary hover:underline">
          {t('allTemplates')}
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {covers.map((c) => (
            <Link key={`${c.templateKey}:${c.skinKey}`} href={href} className="block group">
              <div className="h-[200px] overflow-hidden rounded-xl border bg-muted transition-transform group-hover:scale-[1.02]">
                <FitScreen screen={c.screen} brand={c.brand} />
              </div>
              <Caption className="mt-1.5 block text-center truncate">
                {tl(`templates.${c.templateKey}`)} · {tl(`skins.${c.skinKey}`)}
              </Caption>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
