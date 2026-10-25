'use client';

import type { EventStatus, EventSummary } from '@playora/contracts';
import { Button, Card, Empty, Flex, Skeleton, Typography, theme } from 'antd';
import type { Route } from 'next';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { Checklist } from '@/components/checklist';
import { QueryError } from '@/components/query-error';
import { useBrandKits } from '@/features/brand-kits/api';
import { useOrgMembers } from '@/features/members/api';
import { useEvents } from '../api';
import { EventStatusBadge } from './event-status-badge';

/** Running campaigns first, then the ones waiting to start, then drafts. */
const STATUS_ORDER: Record<EventStatus, number> = {
  live: 0,
  scheduled: 1,
  draft: 2,
  ended: 3,
  archived: 4,
};
const RECENT_LIMIT = 5;

export function HomeDashboard({ orgId }: { orgId: string }) {
  const t = useTranslations('home');
  const events = useEvents(orgId);
  const brandKits = useBrandKits(orgId);
  const members = useOrgMembers(orgId);

  if (events.isPending || brandKits.isPending || members.isPending) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }
  if (events.isError) return <QueryError onRetry={() => events.refetch()} />;

  const items = events.data.items;
  const base = `/orgs/${orgId}`;
  const opened = items.find((event) => event.status === 'live' || event.status === 'scheduled');
  const firstEvent = items[0];
  const teamSize =
    (members.data?.members.length ?? 1) +
    (members.data?.invitations.filter((invite) => invite.status === 'pending').length ?? 0);

  const steps = [
    {
      key: 'brand',
      done: (brandKits.data?.items.length ?? 0) > 0,
      title: t('steps.brand'),
      description: t('steps.brandDesc'),
      href: `${base}/brand-kits`,
      action: t('steps.brandAction'),
    },
    {
      key: 'campaign',
      done: items.length > 0,
      title: t('steps.campaign'),
      description: t('steps.campaignDesc'),
      href: `${base}/templates`,
      action: t('steps.campaignAction'),
    },
    {
      key: 'open',
      done: Boolean(opened),
      title: t('steps.open'),
      description: t('steps.openDesc'),
      href: firstEvent ? `${base}/events/${firstEvent.id}` : `${base}/templates`,
      action: t('steps.openAction'),
    },
    {
      key: 'team',
      done: teamSize > 1,
      title: t('steps.team'),
      description: t('steps.teamDesc'),
      href: `${base}/settings`,
      action: t('steps.teamAction'),
    },
  ];

  return (
    <Flex vertical gap={20}>
      {steps.some((step) => !step.done) && (
        <Checklist title={t('gettingStarted')} items={steps} testId="home-checklist" />
      )}
      <RecentCampaigns orgId={orgId} events={items} />
    </Flex>
  );
}

function RecentCampaigns({ orgId, events }: { orgId: string; events: readonly EventSummary[] }) {
  const t = useTranslations('home');
  const format = useFormatter();
  const { token } = theme.useToken();
  const base = `/orgs/${orgId}`;
  const recent = [...events]
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.updatedAt.localeCompare(a.updatedAt),
    )
    .slice(0, RECENT_LIMIT);

  const period = (event: EventSummary) =>
    event.startsAt && event.endsAt
      ? format.dateTimeRange(new Date(event.startsAt), new Date(event.endsAt), {
          day: 'numeric',
          month: 'numeric',
        })
      : t('noSchedule');

  return (
    <Card
      variant="borderless"
      title={t('campaigns')}
      extra={events.length > 0 && <Link href={`${base}/events` as Route}>{t('allCampaigns')}</Link>}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      styles={{ body: { paddingBlock: recent.length ? 4 : undefined } }}
      data-testid="home-campaigns"
    >
      {recent.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('noCampaigns')} />
      ) : (
        <ul className="m-0 list-none p-0">
          {recent.map((event, index) => {
            const overview = `${base}/events/${event.id}`;
            const isDraft = event.status === 'draft';
            return (
              <li
                key={event.id}
                className="py-3"
                style={index ? { borderTop: `1px solid ${token.colorBorderSecondary}` } : undefined}
              >
                <Flex align="center" gap={12} wrap>
                  <div className="min-w-0 flex-1">
                    <Flex align="center" gap={8} wrap>
                      <Link
                        href={overview as Route}
                        style={{ color: token.colorText, fontWeight: 600 }}
                      >
                        {event.name}
                      </Link>
                      <EventStatusBadge status={event.status} />
                    </Flex>
                    <Caption>{period(event)}</Caption>
                  </div>
                  <Link href={(isDraft ? `${overview}/games` : overview) as Route}>
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
      {events.length > RECENT_LIMIT && (
        <Typography.Paragraph type="secondary" className="!mb-2 !mt-1" style={{ fontSize: 13 }}>
          {t('moreCampaigns', { count: events.length - RECENT_LIMIT })}
        </Typography.Paragraph>
      )}
    </Card>
  );
}
