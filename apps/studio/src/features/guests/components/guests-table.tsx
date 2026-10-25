'use client';

import type { GuestEntry } from '@playora/contracts';
import {
  Button,
  Empty,
  Flex,
  Popconfirm,
  Table,
  type TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import { Trash2, Unlock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';

export interface GuestsTableProps {
  guests: GuestEntry[];
  loading?: boolean;
  onReleaseDevice: (guestId: string) => void;
  onRemoveGuest: (guestId: string) => void;
  isReleasing?: boolean;
  isRemoving?: boolean;
}

export function GuestsTable({
  guests,
  loading,
  onReleaseDevice,
  onRemoveGuest,
  isReleasing,
  isRemoving,
}: GuestsTableProps) {
  const t = useTranslations();

  const columns: TableColumnsType<GuestEntry> = [
    {
      title: t('guests.code'),
      dataIndex: 'externalCode',
      key: 'externalCode',
      render: (code: string) => <Typography.Text code>{code}</Typography.Text>,
    },
    {
      title: t('guests.displayName'),
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string) => <Typography.Text strong>{name}</Typography.Text>,
    },
    {
      title: t('guests.team'),
      dataIndex: 'team',
      key: 'team',
      render: (team: string | null) =>
        team ? <Tag color="blue">{team}</Tag> : <Caption>{t('guests.unassigned')}</Caption>,
    },
    {
      title: t('guests.attributes'),
      dataIndex: 'attributes',
      key: 'attributes',
      render: (attributes: Record<string, string>) => {
        const text = Object.entries(attributes ?? {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ');
        return <Caption>{text || '—'}</Caption>;
      },
    },
    {
      title: t('guests.actions'),
      key: 'actions',
      width: 160,
      align: 'right',
      render: (_: unknown, guest: GuestEntry) => (
        <Flex align="center" justify="end" gap={4}>
          {guest.checkedInAt && (
            <Button
              size="small"
              icon={<Unlock className="size-4" />}
              disabled={isReleasing}
              onClick={() => onReleaseDevice(guest.id)}
            >
              {t('guests.releaseDevice')}
            </Button>
          )}
          <Popconfirm
            title={t('guests.deleteGuest')}
            onConfirm={() => onRemoveGuest(guest.id)}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
          >
            <Button
              type="text"
              danger
              icon={<Trash2 className="size-4" />}
              aria-label={t('guests.deleteGuest')}
              disabled={isRemoving}
            />
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={guests}
      loading={loading}
      pagination={false}
      scroll={{ x: 600 }}
      locale={{
        emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('guests.empty')} />,
      }}
    />
  );
}
