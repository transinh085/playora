'use client';

import { Button, Card, Empty, Flex, Skeleton, Typography, theme } from 'antd';
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

/**
 * Home (docs/product/specs/studio-ux.md §3): what needs the owner today, how far setup is, and the campaigns that matter
 * now. Every row links to the screen that resolves it.
 */
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
    return <Skeleton active paragraph={{ rows: 8 }} />;
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
    <Flex vertical gap={20}>
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
        <Flex vertical gap={20} className="min-w-0">
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
        </Flex>
        <TemplateTeaser orgId={orgId} />
      </div>
    </Flex>
  );
}

function AttentionCard({ items }: { items: Attention[] }) {
  const t = useTranslations('campaigns.home');
  const { token } = theme.useToken();
  const color = { error: token.colorError, warning: token.colorWarning, info: token.colorInfo };
  return (
    <Card
      variant="borderless"
      title={t('attention.title')}
      extra={<Caption>{items.length}</Caption>}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      data-testid="home-attention"
    >
      <Flex vertical gap={12}>
        {items.map(({ key, icon: Icon, tone, text, href, action }) => (
          <Flex key={key} align="center" gap={10}>
            <Icon className="size-4 shrink-0" style={{ color: color[tone] }} />
            <Typography.Text className="min-w-0 flex-1">{text}</Typography.Text>
            <Link href={href as never}>
              <Button size="small" tabIndex={-1}>
                {action}
              </Button>
            </Link>
          </Flex>
        ))}
      </Flex>
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
  const { token } = theme.useToken();
  const routes = campaignRoutes(orgId);

  return (
    <Card
      variant="borderless"
      title={t('campaigns')}
      extra={total > 0 && <Link href={routes.list}>{t('allCampaigns', { count: total })}</Link>}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      styles={{ body: { paddingBlock: rows.length ? 4 : undefined } }}
      data-testid="home-campaigns"
    >
      {rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('noCampaigns')} />
      ) : (
        <ul className="m-0 list-none p-0">
          {rows.map(({ campaign, phase }, index) => {
            const isDraft = phase === 'draft';
            const plays = statsById.get(campaign.id)?.plays;
            return (
              <li
                key={campaign.id}
                className="py-3"
                style={index ? { borderTop: `1px solid ${token.colorBorderSecondary}` } : undefined}
              >
                <Flex align="center" gap={12} wrap>
                  <div className="min-w-0 flex-1">
                    <Flex align="center" gap={8} wrap>
                      <Link
                        href={isDraft ? routes.edit(campaign.id) : routes.detail(campaign.id)}
                        style={{ color: token.colorText, fontWeight: 600 }}
                      >
                        {campaign.name}
                      </Link>
                      <PhaseTag phase={phase} />
                    </Flex>
                    <Caption>
                      {campaignPeriod(format, campaign)}
                      {!isDraft && plays !== undefined ? ` · ${t('plays', { count: plays })}` : ''}
                    </Caption>
                  </div>
                  <Link
                    href={
                      isDraft ? routes.edit(campaign.id) : `${routes.detail(campaign.id)}?tab=share`
                    }
                  >
                    <Button size="small" tabIndex={-1}>
                      {isDraft ? t('continueEditing') : t('share')}
                    </Button>
                  </Link>
                </Flex>
              </li>
            );
          })}
        </ul>
      )}
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
  const { token } = theme.useToken();
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
    <Card
      variant="borderless"
      title={t('templates')}
      extra={<Link href={href}>{t('allTemplates')}</Link>}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
    >
      <div className="grid grid-cols-2 gap-3">
        {covers.map((c) => (
          <Link key={`${c.templateKey}:${c.skinKey}`} href={href} className="block">
            <div className="overflow-hidden" style={{ height: 200, borderRadius: 10 }}>
              <FitScreen screen={c.screen} brand={c.brand} />
            </div>
            <Caption className="mt-1 block text-center">
              {tl(`templates.${c.templateKey}`)} · {tl(`skins.${c.skinKey}`)}
            </Caption>
          </Link>
        ))}
      </div>
    </Card>
  );
}
