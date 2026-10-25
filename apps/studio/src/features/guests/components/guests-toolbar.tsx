'use client';

import { type GuestTeamsResponse, UNASSIGNED_TEAM_FILTER } from '@playora/contracts';
import { Button, Flex, Input, Popconfirm, Select, Tag, Typography } from 'antd';
import { Flag, Search, Trash2, Upload, Users, UserX } from 'lucide-react';
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
    <Flex vertical gap={16}>
      <Flex vertical gap={8}>
        <Typography.Title level={5} className="!m-0">
          {t('guests.teamsTitle')}
        </Typography.Title>
        <Flex wrap align="center" gap={4}>
          <Tag icon={<Users className="size-3" />}>
            {t('guests.totalGuests', { count: totalCount })}
          </Tag>
          <Tag color="orange" icon={<UserX className="size-3" />}>
            {t('guests.unassigned')}: {unassignedCount}
          </Tag>
          {teamsData?.items.map((item) => (
            <Tag key={item.team} color="blue" icon={<Flag className="size-3" />}>
              {item.team}: {item.count}
            </Tag>
          ))}
        </Flex>
      </Flex>

      <Flex wrap align="center" justify="space-between" gap={12}>
        <Flex wrap align="center" gap={12} className="min-w-0 flex-1">
          <Input
            className="max-w-80"
            placeholder={t('guests.searchPlaceholder')}
            allowClear
            prefix={<Search className="size-4" />}
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
        </Flex>

        <Flex wrap align="center" gap={8}>
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

          <RandomTeamsDialog orgId={orgId} eventId={eventId} />

          <Button type="primary" icon={<Upload className="size-4" />} onClick={onOpenImport}>
            {t('guests.importTitle')}
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
}
