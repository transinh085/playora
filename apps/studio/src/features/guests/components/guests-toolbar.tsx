'use client';

import { type GuestTeamsResponse, UNASSIGNED_TEAM_FILTER } from '@playora/contracts';
import { Button, Input, Popconfirm, Select, Tag } from 'antd';
import { Search, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RandomTeamsDialog } from './random-teams-dialog';

export const ALL_TEAMS_VALUE = '__all__';

export interface GuestsToolbarProps {
  orgId: string;
  eventId: string;
  search: string;
  onSearchChange: (search: string) => void;
  teamFilter: string;
  onTeamFilterChange: (team: string) => void;
  teamsData?: GuestTeamsResponse;
  onOpenImport: () => void;
  onClearAll: () => void;
  isClearing?: boolean;
}

export function GuestsToolbar({
  orgId,
  eventId,
  search,
  onSearchChange,
  teamFilter,
  onTeamFilterChange,
  teamsData,
  onOpenImport,
  onClearAll,
  isClearing,
}: GuestsToolbarProps) {
  const t = useTranslations();
  const totalCount = teamsData?.totalCount ?? 0;
  const unassignedCount = teamsData?.unassignedCount ?? 0;

  const teamOptions = [
    { value: ALL_TEAMS_VALUE, label: t('guests.allTeams') },
    { value: UNASSIGNED_TEAM_FILTER, label: t('guests.unassigned') },
    ...(teamsData?.items.map((item) => ({
      value: item.team,
      label: `${item.team} (${item.count})`,
    })) ?? []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{t('guests.teamsTitle')}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Tag>{t('guests.totalGuests', { count: totalCount })}</Tag>
            <Tag color="orange">
              {t('guests.unassigned')}: {unassignedCount}
            </Tag>
            {teamsData?.items.map((item) => (
              <Tag key={item.team} color="blue">
                {item.team}: {item.count}
              </Tag>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="primary" icon={<Upload className="size-4" />} onClick={onOpenImport}>
            {t('guests.importTitle')}
          </Button>

          <RandomTeamsDialog orgId={orgId} eventId={eventId} />

          {totalCount > 0 && (
            <Popconfirm
              title={t('guests.clearAll')}
              onConfirm={onClearAll}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
            >
              <Button danger icon={<Trash2 className="size-4" />} loading={isClearing}>
                {t('guests.clearAll')}
              </Button>
            </Popconfirm>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder={t('guests.searchPlaceholder')}
          allowClear
          prefix={<Search className="size-4 text-[var(--ant-color-text-tertiary)]" />}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <Select
          className="w-52"
          aria-label={t('guests.team')}
          value={teamFilter}
          onChange={onTeamFilterChange}
          options={teamOptions}
        />
      </div>
    </div>
  );
}
