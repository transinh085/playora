'use client';

import {
  Button,
  Empty,
  Flex,
  Input,
  Progress,
  Segmented,
  Skeleton,
  Table,
  type TableProps,
} from 'antd';
import { Pencil, Search } from 'lucide-react';
import Link from 'next/link';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Caption } from '@/components/caption';
import { QueryError } from '@/components/query-error';
import { TableCard } from '@/components/table-card';
import { type CampaignPhase, campaignPhase } from '../../lib/phase';
import { campaignRoutes } from '../../lib/routes';
import { useCampaignStats, useCampaigns, useLabSync } from '../../mock/hooks';
import type { Campaign } from '../../mock/types';
import { FitScreen } from '../editor/fit-screen';
import { toCanvasPrizes } from '../editor/to-canvas-prizes';
import { campaignPeriod } from './campaign-period';
import { PhaseTag } from './phase-tag';

const PHASES: CampaignPhase[] = ['live', 'scheduled', 'draft', 'paused', 'ended'];

/**
 * All campaigns of the organization (docs/product/specs/studio-ux.md §3): what is running and how it is doing. A row
 * opens the campaign's operations page; drafts go straight back to the editor.
 */
export function CampaignList({ orgId }: { orgId: string }) {
  const t = useTranslations('campaigns');
  const tl = useTranslations('builderLab.home');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 }).getTime();
  useLabSync();
  const query = useCampaigns(orgId);
  const routes = campaignRoutes(orgId);
  const [phase, setPhase] = useState<CampaignPhase | 'all'>('all');
  const [search, setSearch] = useState('');

  if (query.isPending) return <Skeleton active paragraph={{ rows: 5 }} />;
  if (query.isError) return <QueryError onRetry={() => query.refetch()} />;

  const rows = query.data.map((campaign) => ({ campaign, phase: campaignPhase(campaign, now) }));
  const count = (value: CampaignPhase) => rows.filter((row) => row.phase === value).length;
  const needle = search.trim().toLowerCase();
  const visible = rows.filter(
    (row) =>
      (phase === 'all' || row.phase === phase) &&
      (!needle || row.campaign.name.toLowerCase().includes(needle)),
  );

  const columns: TableProps<(typeof rows)[number]>['columns'] = [
    {
      title: t('columns.name'),
      key: 'name',
      render: (_, { campaign, phase: rowPhase }) => (
        <Flex align="center" gap={12}>
          <div
            className="shrink-0 overflow-hidden"
            style={{ width: 40, height: 60, borderRadius: 6 }}
            aria-hidden
          >
            <FitScreen
              screen={campaign.screens.cover}
              brand={campaign.brand}
              prizes={toCanvasPrizes(campaign)}
            />
          </div>
          <div className="min-w-0">
            <Link
              href={rowPhase === 'draft' ? routes.edit(campaign.id) : routes.detail(campaign.id)}
              style={{ fontWeight: 600 }}
            >
              {campaign.name}
            </Link>
            <Caption className="block">
              {tl(`templates.${campaign.templateKey}`)} · {tl(`skins.${campaign.skinKey}`)}
            </Caption>
          </div>
        </Flex>
      ),
    },
    {
      title: t('columns.status'),
      key: 'status',
      render: (_, row) => <PhaseTag phase={row.phase} />,
    },
    {
      title: t('columns.period'),
      key: 'period',
      render: (_, { campaign }) => campaignPeriod(format, campaign),
    },
    {
      title: t('columns.plays'),
      key: 'plays',
      align: 'right',
      render: (_, row) => <PlaysCell campaign={row.campaign} phase={row.phase} />,
    },
    {
      title: t('columns.stock'),
      key: 'stock',
      width: 160,
      render: (_, row) => <StockCell campaign={row.campaign} phase={row.phase} />,
    },
    {
      key: 'actions',
      width: 56,
      align: 'right',
      render: (_, { campaign }) => (
        <Link href={routes.edit(campaign.id)} aria-label={t('edit')}>
          <Button type="text" tabIndex={-1} aria-hidden icon={<Pencil className="size-4" />} />
        </Link>
      ),
    },
  ];

  return (
    <TableCard
      toolbar={
        <Flex gap={12} wrap justify="space-between" className="w-full">
          <Segmented<CampaignPhase | 'all'>
            value={phase}
            onChange={setPhase}
            aria-label={t('columns.status')}
            options={[
              { value: 'all', label: `${t('all')} ${rows.length}` },
              ...PHASES.filter((value) => count(value) > 0).map((value) => ({
                value,
                label: `${t(`phase.${value}`)} ${count(value)}`,
              })),
            ]}
          />
          <Input
            allowClear
            prefix={<Search className="size-4" />}
            placeholder={t('search')}
            aria-label={t('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-72"
          />
        </Flex>
      }
    >
      <Table
        rowKey={(row) => row.campaign.id}
        columns={columns}
        dataSource={visible}
        pagination={false}
        data-testid="campaign-table"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={rows.length ? t('noMatch') : t('empty')}
            >
              {!rows.length && (
                <Link href={routes.create}>
                  <Button type="primary" tabIndex={-1}>
                    {t('create')}
                  </Button>
                </Link>
              )}
            </Empty>
          ),
        }}
      />
    </TableCard>
  );
}

function PlaysCell({ campaign, phase }: { campaign: Campaign; phase: CampaignPhase }) {
  const stats = useCampaignStats(campaign.id);
  if (phase === 'draft') return <Caption>—</Caption>;
  return <span className="tabular-nums">{stats.data?.plays ?? '…'}</span>;
}

/** Prizes left over prizes stocked; amber under 20 % so running low is visible at a glance. */
function StockCell({ campaign, phase }: { campaign: Campaign; phase: CampaignPhase }) {
  const stats = useCampaignStats(campaign.id);
  if (phase === 'draft') return <Caption>—</Caption>;
  const total = campaign.prizes.reduce((sum, prize) => sum + prize.quantity, 0);
  const left = Object.values(stats.data?.remainingByPrize ?? {}).reduce((a, b) => a + b, 0);
  const percent = total ? Math.round((left / total) * 100) : 0;
  return (
    <div>
      <Caption className="tabular-nums">
        {left}/{total}
      </Caption>
      <Progress
        percent={percent}
        showInfo={false}
        size="small"
        status={percent < 20 ? 'exception' : 'normal'}
        className="!m-0"
      />
    </div>
  );
}
