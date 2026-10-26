'use client';

import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  QRCode,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import { Copy, Download, ExternalLink, Play, Plus, Printer, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { PLAY_URL } from '@/lib/env';
import { type Campaign, useCampaign, useCampaignReport } from '../../api';
import {
  buildPlayerLink,
  type CustomChannel,
  downloadCanvasQRCode,
  downloadSvgQRCode,
  loadCustomChannels,
  PRESET_CHANNELS,
  saveCustomChannels,
  slugifyChannelKey,
} from '../../lib/channels';
import { campaignRoutes } from '../../lib/routes';

interface ChannelItem {
  key: string;
  name: string;
  isPreset: boolean;
}

export function CampaignShareView({
  orgId,
  campaignId,
  embedded = false,
}: {
  orgId: string;
  campaignId: string;
  embedded?: boolean;
}) {
  const t = useTranslations('campaigns.share');
  const tc = useTranslations('campaigns');
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const routes = campaignRoutes(orgId);

  const campaignQuery = useCampaign(orgId, campaignId);
  const reportQuery = useCampaignReport(orgId, campaignId);

  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm] = Form.useForm<{ name: string; key: string }>();

  // Hydrate custom channels from localStorage (client-side only for M1)
  useEffect(() => {
    if (campaignQuery.data?.id) {
      setCustomChannels(loadCustomChannels(campaignQuery.data.id));
    }
  }, [campaignQuery.data?.id]);

  if (campaignQuery.isPending) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (campaignQuery.isError || !campaignQuery.data) {
    return <Empty description={tc('notFound')} />;
  }

  const campaign = campaignQuery.data;
  const isDraft = campaign.status === 'draft';

  const allChannels: ChannelItem[] = [
    ...PRESET_CHANNELS.map((p) => ({
      key: p.key,
      name: t(p.labelKey as never),
      isPreset: true,
    })),
    ...customChannels.map((c) => ({
      key: c.key,
      name: c.label,
      isPreset: false,
    })),
  ];

  const handleAddChannel = (values: { name: string; key: string }) => {
    const key = slugifyChannelKey(values.key || values.name);
    if (!key) {
      message.error(t('channels.keyRequired'));
      return;
    }
    if (allChannels.some((c) => c.key === key)) {
      message.error(t('channels.keyDuplicate'));
      return;
    }
    const updated = [...customChannels, { key, label: values.name.trim() }];
    setCustomChannels(updated);
    saveCustomChannels(campaign.id, updated);
    setIsAddModalOpen(false);
    addForm.resetFields();
    message.success(t('channels.addTitle'));
  };

  const handleDeleteCustomChannel = (channelKey: string) => {
    const updated = customChannels.filter((c) => c.key !== channelKey);
    setCustomChannels(updated);
    saveCustomChannels(campaign.id, updated);
  };

  // Compile performance data by channel from campaignsApi.report
  const reportByChannel = reportQuery.data?.byChannel ?? [];
  const channelStatsMap = new Map(reportByChannel.map((item) => [item.channel ?? '', item]));

  const reportTableData = allChannels.map((ch) => {
    const stats = channelStatsMap.get(ch.key);
    const plays = stats?.plays ?? 0;
    const wins = stats?.wins ?? 0;
    const visits = stats?.visits ?? 0;
    const rate = wins > 0 ? `${Math.round((visits / wins) * 100)}%` : '—';
    return {
      key: ch.key,
      channelKey: ch.key,
      name: ch.name,
      plays,
      wins,
      visits,
      rate,
    };
  });

  // Also include direct/other channels if any appear in report
  reportByChannel.forEach((item) => {
    const key = item.channel ?? '';
    if (!allChannels.some((c) => c.key === key)) {
      const plays = item.plays;
      const wins = item.wins;
      const visits = item.visits;
      const rate = wins > 0 ? `${Math.round((visits / wins) * 100)}%` : '—';
      reportTableData.push({
        key: key || 'direct',
        channelKey: key,
        name: key ? key : t('channels.direct'),
        plays,
        wins,
        visits,
        rate,
      });
    }
  });

  return (
    <Flex vertical gap={24} data-testid="campaign-share-page">
      {!embedded && (
        <PageHeader
          title={t('title')}
          description={t('subtitle')}
          backHref={routes.detail(campaign.id)}
          backLabel={campaign.name}
          extra={
            isDraft ? (
              <Button
                icon={<Play className="size-4" />}
                href={routes.rehearsal(campaign.id)}
                target="_blank"
              >
                {tc('rehearse')}
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<ExternalLink className="size-4" />}
                href={routes.play(campaign.id)}
                target="_blank"
              >
                {tc('openPlay')}
              </Button>
            )
          }
        />
      )}

      {isDraft && (
        <Alert
          type="warning"
          showIcon
          message={t('draftNotice')}
          description={t('draft')}
          action={
            <Button href={routes.rehearsal(campaign.id)} target="_blank">
              {tc('rehearse')}
            </Button>
          }
        />
      )}

      {/* Preset and Custom Channels */}
      <Card
        variant="borderless"
        style={{ border: `1px solid ${token.colorBorderSecondary}` }}
        title={
          <Flex justify="space-between" align="center" wrap gap={8}>
            <div>
              <Typography.Title level={5} className="!m-0">
                {t('channels.title')}
              </Typography.Title>
              <Typography.Text type="secondary" className="text-xs">
                {t('channels.hint')}
              </Typography.Text>
            </div>
            <Button
              type="primary"
              icon={<Plus className="size-4" />}
              onClick={() => setIsAddModalOpen(true)}
            >
              {t('channels.add')}
            </Button>
          </Flex>
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          {allChannels.map((channel) => (
            <ChannelCard
              key={channel.key}
              orgId={orgId}
              campaign={campaign}
              channel={channel}
              onDelete={channel.isPreset ? undefined : () => handleDeleteCustomChannel(channel.key)}
            />
          ))}
        </div>
      </Card>

      {/* Counter Staff Card */}
      <Card
        variant="borderless"
        style={{ border: `1px solid ${token.colorBorderSecondary}` }}
        data-testid="invite-counter-staff"
      >
        <Flex justify="space-between" align="center" wrap gap={16}>
          <Flex gap={12} align="start" className="max-w-2xl">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: token.colorPrimaryBg,
                color: token.colorPrimary,
              }}
            >
              <Users className="size-5" />
            </div>
            <div>
              <Typography.Text strong className="block text-base">
                {t('counterStaff.title')}
              </Typography.Text>
              <Typography.Text type="secondary" className="text-sm">
                {t('counterStaff.description')}
              </Typography.Text>
            </div>
          </Flex>
          <Link href={`/orgs/${orgId}/settings`}>
            <Button type="default" icon={<Users className="size-4" />}>
              {t('counterStaff.action')}
            </Button>
          </Link>
        </Flex>
      </Card>

      {/* Report by Channel Table */}
      <Card
        variant="borderless"
        style={{ border: `1px solid ${token.colorBorderSecondary}` }}
        title={
          <div>
            <Typography.Title level={5} className="!m-0">
              {t('report.title')}
            </Typography.Title>
            <Typography.Text type="secondary" className="text-xs">
              {t('report.description')}
            </Typography.Text>
          </div>
        }
        styles={{ body: { padding: 0 } }}
        data-testid="channel-report-table"
      >
        <Table
          rowKey="key"
          loading={reportQuery.isPending}
          dataSource={reportTableData}
          pagination={false}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('report.empty')} />
            ),
          }}
          columns={[
            {
              title: t('report.channel'),
              dataIndex: 'name',
              render: (name: string, record) => (
                <Flex align="center" gap={8}>
                  <Typography.Text strong>{name}</Typography.Text>
                  {record.channelKey && (
                    <Tag className="!m-0 font-mono text-xs">?ch={record.channelKey}</Tag>
                  )}
                </Flex>
              ),
            },
            {
              title: t('report.plays'),
              dataIndex: 'plays',
              align: 'right',
              render: (val: number) => <span className="tabular-nums">{val}</span>,
            },
            {
              title: t('report.wins'),
              dataIndex: 'wins',
              align: 'right',
              render: (val: number) => <span className="tabular-nums">{val}</span>,
            },
            {
              title: t('report.visits'),
              dataIndex: 'visits',
              align: 'right',
              render: (val: number) => (
                <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                  {val}
                </span>
              ),
            },
            {
              title: t('report.redemptionRate'),
              dataIndex: 'rate',
              align: 'right',
              render: (val: string) => <span className="tabular-nums">{val}</span>,
            },
          ]}
        />
      </Card>

      {/* Add Custom Channel Modal */}
      <Modal
        title={t('channels.addTitle')}
        open={isAddModalOpen}
        onCancel={() => {
          setIsAddModalOpen(false);
          addForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={handleAddChannel}
          initialValues={{ name: '', key: '' }}
        >
          <Form.Item
            name="name"
            label={t('channels.channelName')}
            rules={[{ required: true, message: t('channels.keyRequired') }]}
          >
            <Input
              placeholder={t('channels.channelNamePlaceholder')}
              onChange={(e) => {
                const autoKey = slugifyChannelKey(e.target.value);
                addForm.setFieldValue('key', autoKey);
              }}
            />
          </Form.Item>
          <Form.Item
            name="key"
            label={t('channels.channelKey')}
            extra={t('channels.channelKeyHint')}
            rules={[
              { required: true, message: t('channels.keyRequired') },
              {
                pattern: /^[a-z0-9_-]{1,64}$/,
                message: t('channels.channelKeyHint'),
              },
            ]}
          >
            <Input prefix="?ch=" />
          </Form.Item>
          <Flex justify="end" gap={8} className="mt-4">
            <Button
              onClick={() => {
                setIsAddModalOpen(false);
                addForm.resetFields();
              }}
            >
              {tc('settings.pause')}
            </Button>
            <Button type="primary" htmlType="submit">
              {t('channels.add')}
            </Button>
          </Flex>
        </Form>
      </Modal>
    </Flex>
  );
}

function ChannelCard({
  orgId,
  campaign,
  channel,
  onDelete,
}: {
  orgId: string;
  campaign: Campaign;
  channel: ChannelItem;
  onDelete?: () => void;
}) {
  const t = useTranslations('campaigns.share');
  const tc = useTranslations('campaigns');
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const routes = campaignRoutes(orgId);

  const playerLink = buildPlayerLink(PLAY_URL, campaign.slug, channel.key);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(playerLink);
      message.success(t('links.copied'));
    } catch {
      // Fallback
      message.info(playerLink);
    }
  };

  return (
    <Card
      size="small"
      variant="outlined"
      style={{
        borderRadius: token.borderRadiusLG,
        borderColor: token.colorBorderSecondary,
      }}
      data-testid={`share-channel-${channel.key}`}
    >
      <Flex vertical gap={12}>
        {/* Channel Header */}
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={8}>
            <Typography.Text strong className="text-sm">
              {channel.name}
            </Typography.Text>
            <Tag color="cyan" className="!m-0 font-mono text-xs">
              ch={channel.key}
            </Tag>
          </Flex>
          {onDelete && (
            <Popconfirm
              title={t('channels.deleteConfirm')}
              onConfirm={onDelete}
              okText={tc('settings.delete')}
              cancelText={t('links.copy')}
            >
              <Button type="text" size="small" danger icon={<Trash2 className="size-3.5" />} />
            </Popconfirm>
          )}
        </Flex>

        {/* Link and Copy */}
        <Space.Compact block>
          <Input value={playerLink} readOnly data-testid={`channel-link-${channel.key}`} />
          <Button icon={<Copy className="size-3.5" />} onClick={copyLink}>
            {t('links.copy')}
          </Button>
        </Space.Compact>

        {/* QR Code and Actions */}
        <Flex gap={16} align="center">
          <div
            ref={qrContainerRef}
            className="flex shrink-0 items-center justify-center rounded-lg p-2"
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              backgroundColor: '#FFFFFF',
            }}
          >
            {/* Canvas QR code for display & PNG export */}
            <QRCode value={playerLink} size={112} bordered={false} type="canvas" />
            {/* Hidden SVG QR code for SVG export */}
            <div ref={svgContainerRef} style={{ display: 'none' }}>
              <QRCode value={playerLink} size={300} bordered={false} type="svg" />
            </div>
          </div>

          <Flex vertical gap={6} className="min-w-0 flex-1">
            <Flex gap={6} wrap>
              <Button
                size="small"
                icon={<Download className="size-3.5" />}
                onClick={() =>
                  downloadCanvasQRCode(
                    qrContainerRef.current,
                    `qr-${campaign.slug}-${channel.key}.png`,
                  )
                }
              >
                {t('links.downloadPng')}
              </Button>
              <Button
                size="small"
                icon={<Download className="size-3.5" />}
                onClick={() =>
                  downloadSvgQRCode(
                    svgContainerRef.current,
                    `qr-${campaign.slug}-${channel.key}.svg`,
                  )
                }
              >
                {t('links.downloadSvg')}
              </Button>
            </Flex>

            <Flex gap={6} wrap className="mt-1">
              <Button
                size="small"
                type="dashed"
                icon={<Printer className="size-3.5" />}
                href={routes.sharePrint(campaign.id, {
                  ch: channel.key,
                  format: 'standee',
                })}
                target="_blank"
                data-testid={`print-standee-${channel.key}`}
              >
                {t('links.printStandee')}
              </Button>
              <Button
                size="small"
                type="dashed"
                icon={<Printer className="size-3.5" />}
                href={routes.sharePrint(campaign.id, {
                  ch: channel.key,
                  format: 'tent',
                })}
                target="_blank"
                data-testid={`print-tent-${channel.key}`}
              >
                {t('links.printTent')}
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}
