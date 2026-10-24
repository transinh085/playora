'use client';

import type { EventStatus, EventSummary } from '@playora/contracts';
import { Button, Empty, Skeleton, Table, type TableProps } from 'antd';
import { Settings } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useEvents } from '../api';
import { EventStatusBadge } from './event-status-badge';

export function EventsTable({ orgId }: { orgId: string }) {
  const t = useTranslations();
  const format = useFormatter();
  const query = useEvents(orgId, 50);

  if (query.isPending) {
    return <Skeleton active paragraph={{ rows: 4 }} className="py-4" />;
  }

  if (query.isError) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-[var(--ant-color-error)]">{t('common.unknownError')}</span>
        <Button size="small" onClick={() => query.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const columns: TableProps<EventSummary>['columns'] = [
    {
      title: t('events.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, event) => (
        <Link
          href={`/orgs/${orgId}/events/${event.id}/players` as Route}
          className="font-medium hover:underline text-[var(--ant-color-text)]"
        >
          {name}
        </Link>
      ),
    },
    {
      title: t('events.slug'),
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => (
        <span className="text-[var(--ant-color-text-secondary)]">/{slug}</span>
      ),
    },
    {
      title: t('events.startsAt'),
      dataIndex: 'startsAt',
      key: 'startsAt',
      render: (startsAt: string | null) =>
        startsAt
          ? format.dateTime(new Date(startsAt), {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : '—',
    },
    {
      title: t('events.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: EventStatus) => <EventStatusBadge status={status} />,
    },
    {
      key: 'actions',
      width: 48,
      align: 'right',
      render: (_, event) => (
        <Link
          href={`/orgs/${orgId}/events/${event.id}/settings` as Route}
          aria-label={t('events.settings')}
          className="inline-flex size-8 items-center justify-center rounded-md hover:bg-[var(--ant-color-fill-secondary)] text-[var(--ant-color-text-secondary)] hover:text-[var(--ant-color-text)] transition-colors"
        >
          <Settings className="size-4" />
        </Link>
      ),
    },
  ];

  return (
    <Table<EventSummary>
      rowKey="id"
      columns={columns}
      dataSource={query.data.items}
      pagination={false}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('events.empty')}
            className="my-10"
          />
        ),
      }}
    />
  );
}
