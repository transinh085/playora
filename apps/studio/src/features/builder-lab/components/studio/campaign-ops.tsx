'use client';

import {
  App,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  Popconfirm,
  Progress,
  Result,
  Skeleton,
  Table,
  Tabs,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  CircleX,
  ExternalLink,
  Pause,
  Pencil,
  Play,
  Share2,
  Square,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { PageHeader } from '@/components/page-header';
import {
  type Campaign,
  useCampaign,
  useCampaignPlays,
  useCampaignStats,
  useCampaignVouchers,
  useDeleteCampaign,
  useEndCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useUpdateCampaign,
} from '../../api';
import { campaignPhase, isRunning } from '../../lib/phase';
import { preflight } from '../../lib/preflight';
import { campaignRoutes } from '../../lib/routes';
import { isoToLocalInput, localInputToIso } from '../../lib/rules-format';
import { CampaignMetrics } from '../editor/publish-dialog';
import { campaignPeriod } from './campaign-period';
import { CampaignShareView } from './campaign-share-view';
import { PhaseTag } from './phase-tag';

const TABS = ['overview', 'share', 'prizes', 'players', 'settings'] as const;
type TabKey = (typeof TABS)[number];

/**
 * One campaign in "operate" mode (docs/product/specs/studio-ux.md §2): numbers, share kit, prizes, players and lifecycle.
 * Design changes happen in the full-screen editor; this page is where the owner comes back daily.
 */
export function CampaignOps({ orgId, campaignId }: { orgId: string; campaignId: string }) {
  const t = useTranslations('campaigns');
  const tl = useTranslations('builderLab.home');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 }).getTime();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = useCampaign(orgId, campaignId);
  const routes = campaignRoutes(orgId);

  if (query.isPending) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (query.isError || !query.data) {
    return (
      <Result
        status="404"
        title={t('notFound')}
        extra={
          <Link href={routes.list}>
            <Button type="primary">{t('backToList')}</Button>
          </Link>
        }
      />
    );
  }

  const campaign = query.data;
  const phase = campaignPhase(campaign, now);
  const requested = params.get('tab') as TabKey | null;
  const tab: TabKey = requested && TABS.includes(requested) ? requested : 'overview';
  const setTab = (key: string) => router.replace(`${pathname}?tab=${key}` as never);

  return (
    <Flex vertical gap={20}>
      <PageHeader
        title={campaign.name}
        tags={<PhaseTag phase={phase} />}
        description={`${tl(`templates.${campaign.templateKey}`)} · ${tl(`skins.${campaign.skinKey}`)} · ${campaignPeriod(format, campaign)}${campaign.version ? ` · v${campaign.version}` : ''}`}
        backHref={routes.list}
        backLabel={t('backToList')}
        extra={<HeaderActions orgId={orgId} campaign={campaign} />}
      />
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={TABS.map((key) => ({ key, label: t(`tabs.${key}`) }))}
        className="!-mb-2"
      />
      {tab === 'overview' && <OverviewTab orgId={orgId} campaign={campaign} />}
      {tab === 'share' && <ShareTab orgId={orgId} campaign={campaign} />}
      {tab === 'prizes' && <PrizesTab orgId={orgId} campaign={campaign} />}
      {tab === 'players' && <PlayersTab orgId={orgId} campaign={campaign} />}
      {tab === 'settings' && <SettingsTab orgId={orgId} campaign={campaign} />}
    </Flex>
  );
}

function HeaderActions({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const phase = campaignPhase(campaign);
  const routes = campaignRoutes(orgId);
  const resume = useResumeCampaign(orgId);

  const edit = (
    <Link href={routes.edit(campaign.id)}>
      <Button
        type={phase === 'draft' ? 'primary' : 'default'}
        icon={<Pencil className="size-4" />}
        tabIndex={-1}
      >
        {phase === 'draft' ? t('continueEditing') : t('editDesign')}
      </Button>
    </Link>
  );
  const share = (
    <Link href={routes.share(campaign.id)}>
      <Button icon={<Share2 className="size-4" />}>{t('share.action')}</Button>
    </Link>
  );
  if (phase === 'draft') {
    return (
      <Flex gap={8} wrap>
        {edit}
        {share}
      </Flex>
    );
  }
  return (
    <Flex gap={8} wrap>
      {edit}
      {share}
      {phase === 'paused' ? (
        <Button
          type="primary"
          icon={<Play className="size-4" />}
          loading={resume.isPending}
          onClick={() => resume.mutate(campaign.id)}
        >
          {t('resume')}
        </Button>
      ) : (
        <Button
          type="primary"
          icon={<ExternalLink className="size-4" />}
          href={routes.play(campaign.id)}
          target="_blank"
        >
          {t('openPlay')}
        </Button>
      )}
    </Flex>
  );
}

function OverviewTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  if (campaign.status === 'draft') return <DraftChecklist orgId={orgId} campaign={campaign} />;
  return (
    <Flex vertical gap={20}>
      <CampaignMetrics orgId={orgId} campaignId={campaign.id} />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <PrizeStock orgId={orgId} campaign={campaign} />
        <RecentPlays orgId={orgId} campaign={campaign} />
      </div>
    </Flex>
  );
}

/** Before the first publish: what still blocks it, each with a way into the editor. */
function DraftChecklist({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const tp = useTranslations('builderLab.publish');
  const { token } = theme.useToken();
  const issues = preflight(campaign);
  const errors = issues.filter((issue) => issue.level === 'error');
  const routes = campaignRoutes(orgId);

  return (
    <Card
      variant="borderless"
      title={errors.length ? t('draft.blocked', { count: errors.length }) : t('draft.ready')}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      data-testid="draft-checklist"
    >
      <Flex vertical gap={12}>
        <Typography.Text type="secondary">{t('draft.hint')}</Typography.Text>
        {issues.map((issue) => {
          const Icon = issue.level === 'error' ? CircleX : TriangleAlert;
          return (
            <Flex key={issue.id} align="center" gap={10}>
              <Icon
                className="size-4 shrink-0"
                style={{ color: issue.level === 'error' ? token.colorError : token.colorWarning }}
              />
              <Typography.Text className="flex-1">
                {tp(`issues.${issue.code}`, issue.params)}
              </Typography.Text>
              <Link
                href={routes.edit(campaign.id, issue.where.area === 'screens' ? 'quick' : 'rules')}
              >
                {t('draft.fix')}
              </Link>
            </Flex>
          );
        })}
        <Flex gap={8} wrap className="mt-2">
          <Button href={routes.rehearsal(campaign.id)} target="_blank">
            {t('rehearse')}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}

function PrizeStock({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const { token } = theme.useToken();
  const stats = useCampaignStats(orgId, campaign.id);
  const vouchers = useCampaignVouchers(orgId, campaign.id).data ?? [];

  return (
    <Card
      variant="borderless"
      title={t('stock.title')}
      extra={<Link href={campaignRoutes(orgId).edit(campaign.id, 'rules')}>{t('stock.edit')}</Link>}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      loading={stats.isPending}
      data-testid="prize-stock"
    >
      <Flex vertical gap={14}>
        {campaign.prizes.map((prize) => {
          const left = stats.data?.remainingByPrize[prize.id] ?? prize.quantity;
          const issued = vouchers.filter((v) => v.prizeId === prize.id);
          const redeemed = issued.filter((v) => v.redeemedAt).length;
          const percent = prize.quantity ? Math.round((left / prize.quantity) * 100) : 0;
          return (
            <div key={prize.id}>
              <Flex justify="space-between" gap={8}>
                <Typography.Text strong ellipsis>
                  {prize.name}
                </Typography.Text>
                <Caption className="tabular-nums">
                  {t('stock.left', { left, total: prize.quantity })}
                </Caption>
              </Flex>
              <Progress
                percent={percent}
                showInfo={false}
                size="small"
                status={percent < 20 ? 'exception' : 'normal'}
                className="!m-0"
              />
              <Caption>{t('stock.issued', { issued: issued.length, redeemed })}</Caption>
            </div>
          );
        })}
      </Flex>
    </Card>
  );
}

function RecentPlays({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const { token } = theme.useToken();
  const plays = useCampaignPlays(orgId, campaign.id);
  const recent = (plays.data ?? []).slice(0, 8);

  return (
    <Card
      variant="borderless"
      title={t('recent.title')}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      loading={plays.isPending}
    >
      {recent.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('recent.empty')} />
      ) : (
        <PlaysTable campaign={campaign} rows={recent} compact />
      )}
    </Card>
  );
}

function PlaysTable({
  campaign,
  rows,
  compact,
}: {
  campaign: Campaign;
  rows: NonNullable<ReturnType<typeof useCampaignPlays>['data']>;
  compact?: boolean;
}) {
  const t = useTranslations('campaigns');
  const format = useFormatter();
  const prizeName = (id: string | null) => campaign.prizes.find((p) => p.id === id)?.name ?? '—';
  const OUTCOME_COLOR = { win: 'success', lose: 'default', closed: 'warning', no_turns: 'default' };

  return (
    <Table
      size={compact ? 'small' : 'middle'}
      rowKey="id"
      pagination={compact ? false : { pageSize: 20, hideOnSinglePage: true }}
      dataSource={rows}
      columns={[
        {
          title: t('players.time'),
          dataIndex: 'at',
          render: (at: string) =>
            format.dateTime(new Date(at), { dateStyle: 'short', timeStyle: 'short' }),
        },
        ...(compact
          ? []
          : [
              {
                title: t('players.player'),
                dataIndex: 'playerId',
                render: (id: string) => <span className="font-mono">{id.slice(0, 8)}</span>,
              },
            ]),
        {
          title: t('players.outcome'),
          dataIndex: 'outcome',
          render: (outcome: keyof typeof OUTCOME_COLOR) => (
            <Tag className="!m-0" color={OUTCOME_COLOR[outcome]}>
              {t(`outcome.${outcome}`)}
            </Tag>
          ),
        },
        { title: t('players.prize'), dataIndex: 'prizeId', render: prizeName },
        ...(compact
          ? []
          : [
              {
                title: t('players.code'),
                dataIndex: 'voucherCode',
                render: (code: string | null) => <span className="font-mono">{code ?? '—'}</span>,
              },
            ]),
      ]}
    />
  );
}

function ShareTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  return <CampaignShareView orgId={orgId} campaignId={campaign.id} embedded />;
}

function PrizesTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const format = useFormatter();
  const { token } = theme.useToken();
  const vouchers = useCampaignVouchers(orgId, campaign.id);
  const prizeName = (id: string) => campaign.prizes.find((p) => p.id === id)?.name ?? '—';

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <PrizeStock orgId={orgId} campaign={campaign} />
      <Card
        variant="borderless"
        title={t('vouchers.title')}
        extra={<Link href={campaignRoutes(orgId).redeem}>{t('vouchers.desk')}</Link>}
        style={{ border: `1px solid ${token.colorBorderSecondary}` }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="code"
          loading={vouchers.isPending}
          dataSource={vouchers.data ?? []}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('vouchers.empty')} />
            ),
          }}
          columns={[
            {
              title: t('vouchers.code'),
              dataIndex: 'code',
              render: (code: string) => <span className="font-mono">{code}</span>,
            },
            { title: t('players.prize'), dataIndex: 'prizeId', render: prizeName },
            {
              title: t('vouchers.issued'),
              dataIndex: 'issuedAt',
              render: (at: string) =>
                format.dateTime(new Date(at), { dateStyle: 'short', timeStyle: 'short' }),
            },
            {
              title: t('vouchers.status'),
              dataIndex: 'redeemedAt',
              render: (at: string | null) =>
                at ? (
                  <Tag className="!m-0" color="success">
                    {t('vouchers.redeemed')}
                  </Tag>
                ) : (
                  <Tag className="!m-0">{t('vouchers.pending')}</Tag>
                ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

function PlayersTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const { token } = theme.useToken();
  const plays = useCampaignPlays(orgId, campaign.id);
  return (
    <Card
      variant="borderless"
      title={t('players.title', { count: plays.data?.length ?? 0 })}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      styles={{ body: { padding: 0 } }}
      loading={plays.isPending}
    >
      {plays.data?.length ? (
        <PlaysTable campaign={campaign} rows={plays.data} />
      ) : (
        <Empty
          className="py-8"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('recent.empty')}
        />
      )}
    </Card>
  );
}

/** Lifecycle actions (docs/product/specs/builder.md §6): pause, end, extend; delete only when nothing is running. */
function SettingsTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const router = useRouter();
  const phase = campaignPhase(campaign);
  const update = useUpdateCampaign(orgId, campaign.id);
  const pause = usePauseCampaign(orgId);
  const resume = useResumeCampaign(orgId);
  const end = useEndCampaign(orgId);
  const remove = useDeleteCampaign(orgId);
  const border = { border: `1px solid ${token.colorBorderSecondary}` };

  const extend = (value: string) => {
    const endsAt = localInputToIso(value);
    if (!endsAt || endsAt <= campaign.rules.startsAt) return;
    update.mutate(
      { rules: { ...campaign.rules, endsAt } },
      { onSuccess: () => message.success(t('settings.extended')) },
    );
  };

  return (
    <Flex vertical gap={20} className="max-w-3xl">
      <Card variant="borderless" title={t('settings.scheduleTitle')} style={border}>
        <Flex vertical gap={8}>
          <Typography.Text type="secondary">{t('settings.scheduleHint')}</Typography.Text>
          <Input
            type="datetime-local"
            aria-label={t('settings.endsAt')}
            defaultValue={isoToLocalInput(campaign.rules.endsAt)}
            min={isoToLocalInput(campaign.rules.startsAt)}
            onBlur={(e) => extend(e.target.value)}
            className="!w-64"
          />
        </Flex>
      </Card>

      {campaign.status === 'published' && phase !== 'ended' && (
        <Card variant="borderless" title={t('settings.runTitle')} style={border}>
          <Flex gap={8} wrap align="center">
            {phase === 'paused' ? (
              <Button icon={<Play className="size-4" />} onClick={() => resume.mutate(campaign.id)}>
                {t('resume')}
              </Button>
            ) : (
              <Button icon={<Pause className="size-4" />} onClick={() => pause.mutate(campaign.id)}>
                {t('settings.pause')}
              </Button>
            )}
            <Popconfirm
              title={t('settings.endConfirm')}
              okText={t('settings.end')}
              okButtonProps={{ danger: true }}
              onConfirm={() => end.mutate(campaign.id)}
            >
              <Button danger icon={<Square className="size-4" />}>
                {t('settings.end')}
              </Button>
            </Popconfirm>
            <Caption>{t('settings.runHint')}</Caption>
          </Flex>
        </Card>
      )}

      <Card variant="borderless" title={t('settings.deleteTitle')} style={border}>
        <Flex gap={12} align="center" wrap>
          <Popconfirm
            title={t('settings.deleteConfirm', { name: campaign.name })}
            okText={t('settings.delete')}
            okButtonProps={{ danger: true }}
            disabled={isRunning(phase)}
            onConfirm={async () => {
              await remove.mutateAsync(campaign.id);
              message.success(t('settings.deleted'));
              router.push(campaignRoutes(orgId).list);
            }}
          >
            <Button danger icon={<Trash2 className="size-4" />} disabled={isRunning(phase)}>
              {t('settings.delete')}
            </Button>
          </Popconfirm>
          <Caption>
            {isRunning(phase) ? t('settings.deleteBlocked') : t('settings.deleteHint')}
          </Caption>
        </Flex>
      </Card>
    </Flex>
  );
}
