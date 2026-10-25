'use client';

import type { EventStatus, EventSummary } from '@playora/contracts';
import {
  Button,
  Empty,
  Flex,
  Input,
  Select,
  Skeleton,
  Table,
  type TableProps,
  Typography,
} from 'antd';
import { CalendarDays, Clock, PencilLine, Radio, Search, Settings } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { MetricGrid } from '@/components/metric-card';
import { QueryError } from '@/components/query-error';
import { TableCard } from '@/components/table-card';
import { useEvents } from '../api';
import { EventStatusBadge } from './event-status-badge';

export function EventsTable({ orgId }: { orgId: string }) {
  const t = useTranslations();
  const format = useFormatter();
  const query = useEvents(orgId, 50);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EventStatus | 'all'>('all');

  if (query.isPending) {
    return <Skeleton active paragraph={{ rows: 4 }} className="py-4" />;
  }

  if (query.isError) {
    return <QueryError onRetry={() => query.refetch()} />;
  }

  const columns: TableProps<EventSummary>['columns'] = [
    {
      title: t('events.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, event) => (
        <Link href={`/orgs/${orgId}/events/${event.id}` as Route}>{name}</Link>
      ),
    },
    {
      title: t('events.slug'),
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => <Typography.Text type="secondary">/{slug}</Typography.Text>,
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
        // A real link (e2e and middle-click rely on it); the Button is presentational only.
        <Link
          href={`/orgs/${orgId}/events/${event.id}/settings` as Route}
          aria-label={t('events.settings')}
        >
          <Button type="text" tabIndex={-1} aria-hidden icon={<Settings className="size-4" />} />
        </Link>
      ),
    },
  ];

  const items = query.data.items;
  const count = (value: EventStatus) => items.filter((event) => event.status === value).length;
  const needle = search.trim().toLowerCase();
  const filtered = items.filter(
    (event) =>
      (status === 'all' || event.status === status) &&
      (!needle ||
        event.name.toLowerCase().includes(needle) ||
        event.slug.toLowerCase().includes(needle)),
  );
  const statuses: EventStatus[] = ['draft', 'scheduled', 'live', 'ended', 'archived'];

  return (
    <Flex vertical gap={20}>
      <MetricGrid
        items={[
          {
            label: t('events.metricTotal'),
            value: items.length,
            icon: <CalendarDays className="size-5" />,
          },
          {
            label: t('events.metricLive'),
            value: count('live'),
            icon: <Radio className="size-5" />,
            tone: 'success',
          },
          {
            label: t('events.metricScheduled'),
            value: count('scheduled'),
            icon: <Clock className="size-5" />,
            tone: 'info',
          },
          {
            label: t('events.metricDraft'),
            value: count('draft'),
            icon: <PencilLine className="size-5" />,
            tone: 'warning',
          },
        ]}
      />
      <TableCard
        toolbar={
          <Flex gap={12} wrap>
            <Input
              allowClear
              prefix={<Search className="size-4" />}
              placeholder={t('events.search')}
              aria-label={t('events.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-80"
            />
            <Select<EventStatus | 'all'>
              value={status}
              onChange={setStatus}
              aria-label={t('events.status')}
              className="w-48"
              options={[
                { value: 'all', label: t('events.allStatuses') },
                ...statuses.map((value) => ({ value, label: t(`events.statuses.${value}`) })),
              ]}
            />
          </Flex>
        }
      >
        <Table<EventSummary>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={items.length ? t('events.noMatch') : t('events.empty')}
              />
            ),
          }}
        />
      </TableCard>
    </Flex>
  );
}
