'use client';

import type { GuestEntry } from '@playora/contracts';
import { Button, Empty, Popconfirm, Table, type TableColumnsType, Tag } from 'antd';
import { Trash2, Unlock } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
      render: (code: string) => <span className="font-mono text-xs">{code}</span>,
    },
    {
      title: t('guests.displayName'),
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      title: t('guests.team'),
      dataIndex: 'team',
      key: 'team',
      render: (team: string | null) =>
        team ? (
          <Tag color="blue">{team}</Tag>
        ) : (
          <span className="text-xs text-[var(--ant-color-text-tertiary)]">
            {t('guests.unassigned')}
          </span>
        ),
    },
    {
      title: t('guests.attributes'),
      dataIndex: 'attributes',
      key: 'attributes',
      render: (attributes: Record<string, string>) => {
        const text = Object.entries(attributes ?? {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ');
        return (
          <span className="text-xs text-[var(--ant-color-text-secondary)]">{text || '—'}</span>
        );
      },
    },
    {
      title: t('guests.actions'),
      key: 'actions',
      width: 160,
      align: 'right',
      render: (_: unknown, guest: GuestEntry) => (
        <div className="flex items-center justify-end gap-1">
          {guest.checkedInAt && (
            <Button
              size="small"
              icon={<Unlock className="size-3.5" />}
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
        </div>
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
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('guests.empty')}
            className="py-8"
          />
        ),
      }}
    />
  );
}
