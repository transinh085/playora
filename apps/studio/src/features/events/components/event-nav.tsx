'use client';

import { Skeleton, Tabs } from 'antd';
import { Gamepad2, Gift, LayoutDashboard, Settings, Users } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { QueryError } from '@/components/query-error';
import { useEvent } from '../api';
import { EventStatusBadge } from './event-status-badge';

export function EventHeader({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations();
  const eventQuery = useEvent(orgId, eventId);

  if (eventQuery.isPending) {
    return <Skeleton.Input active size="large" className="!w-64 !h-12" />;
  }

  if (eventQuery.isError) {
    return <QueryError onRetry={() => eventQuery.refetch()} />;
  }

  const event = eventQuery.data;

  return (
    <PageHeader
      title={event.name}
      tags={<EventStatusBadge status={event.status} />}
      description={`/${event.slug}`}
      backHref={`/orgs/${orgId}/events` as Route}
      backLabel={t('eventNav.backToEvents')}
    />
  );
}

type NavItemKey = 'overview' | 'games' | 'prizes' | 'players' | 'settings';

interface NavItemConfig {
  key: NavItemKey;
  labelKey: NavItemKey;
  icon: typeof LayoutDashboard;
  path: string;
  testId: string;
}

const NAV_ITEMS: readonly NavItemConfig[] = [
  {
    key: 'overview',
    labelKey: 'overview',
    icon: LayoutDashboard,
    path: '',
    testId: 'event-tab-overview',
  },
  {
    key: 'games',
    labelKey: 'games',
    icon: Gamepad2,
    path: 'games',
    testId: 'event-tab-games',
  },
  {
    key: 'prizes',
    labelKey: 'prizes',
    icon: Gift,
    path: 'prizes',
    testId: 'event-tab-prizes',
  },
  {
    key: 'players',
    labelKey: 'players',
    icon: Users,
    path: 'players',
    testId: 'event-tab-players',
  },
  {
    key: 'settings',
    labelKey: 'settings',
    icon: Settings,
    path: 'settings',
    testId: 'event-tab-settings',
  },
] as const;

function resolveActiveKey(pathname: string, base: string): string {
  if (pathname === base) return 'overview';
  if (pathname.startsWith(`${base}/games`)) return 'games';
  if (pathname.startsWith(`${base}/prizes`)) return 'prizes';
  if (pathname.startsWith(`${base}/players`) || pathname.startsWith(`${base}/guests`))
    return 'players';
  if (pathname.startsWith(`${base}/settings`)) return 'settings';
  return 'overview';
}

export function EventNav({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations('eventNav');
  const pathname = usePathname();
  const router = useRouter();
  const base = `/orgs/${orgId}/events/${eventId}`;
  const activeKey = resolveActiveKey(pathname, base);

  const tabItems = NAV_ITEMS.map(({ key, labelKey, icon: Icon, path, testId }) => {
    const href = path ? `${base}/${path}` : base;
    return {
      key,
      label: (
        <Link
          href={href as Route}
          data-testid={testId}
          className="inline-flex items-center gap-2 text-inherit"
        >
          <Icon className="size-4" />
          <span>{t(labelKey)}</span>
        </Link>
      ),
    };
  });

  return (
    <Tabs
      activeKey={activeKey}
      items={tabItems}
      onChange={(key) => {
        const item = NAV_ITEMS.find((navItem) => navItem.key === key);
        if (item) {
          const href = item.path ? `${base}/${item.path}` : base;
          router.push(href as Route);
        }
      }}
      className="mb-2"
    />
  );
}
