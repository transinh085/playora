'use client';

import { toCanvasPrizes } from '@playora/ui/campaign';
import {
  App,
  Button,
  Card,
  Col,
  Dropdown,
  Flex,
  Input,
  type MenuProps,
  Progress,
  Row,
  Segmented,
  Skeleton,
  Table,
  type TableProps,
  Tooltip,
  theme,
} from 'antd';
import {
  Copy,
  ExternalLink,
  Eye,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Search,
  Sparkles,
  Table as TableIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Caption } from '@/components/caption';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { TableCard } from '@/components/table-card';
import { type CampaignPhase, campaignPhase } from '../../lib/phase';
import { campaignRoutes } from '../../lib/routes';
import { useCampaignStats, useCampaigns, useLabSync } from '../../mock/hooks';
import type { Campaign } from '../../mock/types';
import { FitScreen } from '../editor/fit-screen';
import { campaignPeriod } from './campaign-period';
import { PhaseTag } from './phase-tag';

const PHASES: CampaignPhase[] = ['live', 'scheduled', 'draft', 'paused', 'ended'];

type ViewMode = 'table' | 'grid';

/**
 * All campaigns of the organization (docs/product/specs/studio-ux.md §3): what is running and how it is doing.
 * Supports both Table View (dense data) and Grid Card View (visual cover preview).
 */
export function CampaignList({ orgId }: { orgId: string }) {
  const t = useTranslations('campaigns');
  const tl = useTranslations('builderLab.home');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 }).getTime();
  const { message } = App.useApp();
  useLabSync();
  const query = useCampaigns(orgId);
  const routes = campaignRoutes(orgId);
  const [phase, setPhase] = useState<CampaignPhase | 'all'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

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

  const handleCopyLink = async (campaignId: string) => {
    try {
      const url = `${window.location.origin}${routes.play(campaignId)}`;
      await navigator.clipboard.writeText(url);
      message.success(t('linkCopied'));
    } catch {
      // Fallback
    }
  };

  const columns: TableProps<(typeof rows)[number]>['columns'] = [
    {
      title: t('columns.name'),
      key: 'name',
      render: (_, { campaign, phase: rowPhase }) => (
        <Flex align="center" gap={12}>
          <div
            className="shrink-0 overflow-hidden"
            style={{ width: 44, height: 64, borderRadius: 6 }}
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
      width: 80,
      align: 'right',
      render: (_, { campaign }) => {
        const menuItems: MenuProps['items'] = [
          {
            key: 'edit',
            icon: <Pencil className="size-4" />,
            label: <Link href={routes.edit(campaign.id)}>{t('edit')}</Link>,
          },
          {
            key: 'ops',
            icon: <Eye className="size-4" />,
            label: <Link href={routes.detail(campaign.id)}>{t('openOps')}</Link>,
          },
          {
            key: 'play',
            icon: <ExternalLink className="size-4" />,
            label: (
              <a href={routes.play(campaign.id)} target="_blank" rel="noreferrer">
                {t('openPlay')}
              </a>
            ),
          },
          {
            type: 'divider',
          },
          {
            key: 'copy',
            icon: <Copy className="size-4" />,
            label: t('copyLink'),
            onClick: () => handleCopyLink(campaign.id),
          },
        ];

        return (
          <Flex align="center" justify="end" gap={4}>
            <Tooltip title={t('edit')}>
              <Link href={routes.edit(campaign.id)} aria-label={t('edit')}>
                <Button type="text" size="small" icon={<Pencil className="size-4" />} />
              </Link>
            </Tooltip>
            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
              <Button type="text" size="small" icon={<MoreVertical className="size-4" />} />
            </Dropdown>
          </Flex>
        );
      },
    },
  ];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t('emptyTitle')}
        description={t('emptySubtitle')}
        actionText={t('create')}
        actionHref={routes.create}
      />
    );
  }

  return (
    <TableCard
      toolbar={
        <Flex gap={12} wrap justify="space-between" align="center" className="w-full">
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
          <Flex gap={8} align="center" wrap>
            <Input
              allowClear
              prefix={<Search className="size-4" />}
              placeholder={t('search')}
              aria-label={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            <Segmented<ViewMode>
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'table', icon: <TableIcon className="size-4" />, label: t('viewTable') },
                { value: 'grid', icon: <LayoutGrid className="size-4" />, label: t('viewGrid') },
              ]}
            />
          </Flex>
        </Flex>
      }
    >
      {visible.length === 0 ? (
        <EmptyState
          bordered={false}
          icon={Search}
          title={t('noMatchTitle')}
          description={t('noMatchSubtitle')}
          actionText={t('clearFilters')}
          onAction={() => {
            setSearch('');
            setPhase('all');
          }}
        />
      ) : viewMode === 'table' ? (
        <Table
          rowKey={(row) => row.campaign.id}
          columns={columns}
          dataSource={visible}
          pagination={false}
          data-testid="campaign-table"
        />
      ) : (
        <div className="p-4">
          <Row gutter={[16, 16]}>
            {visible.map(({ campaign, phase: rowPhase }) => (
              <Col key={campaign.id} xs={24} sm={12} lg={8} xl={6}>
                <CampaignGridCard
                  campaign={campaign}
                  phase={rowPhase}
                  routes={routes}
                  format={format}
                  onCopyLink={handleCopyLink}
                />
              </Col>
            ))}
          </Row>
        </div>
      )}
    </TableCard>
  );
}

function CampaignGridCard({
  campaign,
  phase,
  routes,
  format,
  onCopyLink,
}: {
  campaign: Campaign;
  phase: CampaignPhase;
  routes: ReturnType<typeof campaignRoutes>;
  format: ReturnType<typeof useFormatter>;
  onCopyLink: (id: string) => void;
}) {
  const t = useTranslations('campaigns');
  const tl = useTranslations('builderLab.home');
  const { token } = theme.useToken();
  const stats = useCampaignStats(campaign.id);
  const total = campaign.prizes.reduce((sum, prize) => sum + prize.quantity, 0);
  const left = Object.values(stats.data?.remainingByPrize ?? {}).reduce((a, b) => a + b, 0);
  const percent = total ? Math.round((left / total) * 100) : 0;

  return (
    <Card
      variant="borderless"
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        overflow: 'hidden',
      }}
      styles={{ body: { padding: 14 } }}
      cover={
        <div className="relative overflow-hidden" style={{ height: 180 }}>
          <FitScreen
            screen={campaign.screens.cover}
            brand={campaign.brand}
            prizes={toCanvasPrizes(campaign)}
          />
          <div className="absolute top-2.5 left-2.5">
            <PhaseTag phase={phase} />
          </div>
        </div>
      }
    >
      <Flex vertical gap={8}>
        <div>
          <Link
            href={phase === 'draft' ? routes.edit(campaign.id) : routes.detail(campaign.id)}
            style={{ fontWeight: 600, fontSize: 14 }}
            className="line-clamp-1"
          >
            {campaign.name}
          </Link>
          <Caption className="block">
            {tl(`templates.${campaign.templateKey}`)} · {tl(`skins.${campaign.skinKey}`)}
          </Caption>
        </div>

        <div className="text-xs text-secondary">{campaignPeriod(format, campaign)}</div>

        {phase !== 'draft' && (
          <div className="pt-1">
            <Flex justify="space-between" align="center" className="mb-1 text-xs">
              <span className="text-secondary">{t('columns.stock')}</span>
              <span className="font-semibold tabular-nums">
                {left}/{total}
              </span>
            </Flex>
            <Progress
              percent={percent}
              showInfo={false}
              size="small"
              status={percent < 20 ? 'exception' : 'normal'}
              className="!m-0"
            />
          </div>
        )}

        <Flex gap={8} align="center" className="pt-2 mt-auto">
          <Link href={routes.edit(campaign.id)} className="flex-1">
            <Button
              type={phase === 'draft' ? 'primary' : 'default'}
              size="small"
              block
              icon={<Pencil className="size-3.5" />}
            >
              {t('edit')}
            </Button>
          </Link>
          <Link href={routes.detail(campaign.id)}>
            <Button size="small" icon={<Eye className="size-3.5" />}>
              {t('openOps')}
            </Button>
          </Link>
          <Tooltip title={t('copyLink')}>
            <Button
              size="small"
              icon={<Copy className="size-3.5" />}
              onClick={() => onCopyLink(campaign.id)}
            />
          </Tooltip>
        </Flex>
      </Flex>
    </Card>
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
