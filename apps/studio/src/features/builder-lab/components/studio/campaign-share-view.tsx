'use client';

import {
  Alert,
  Button,
  Card,
  Chip,
  Input,
  Modal,
  ProgressBar,
  QRCodeSvg,
  Skeleton,
  toast,
} from '@playora/ui/components';
import {
  AlertTriangle,
  Copy,
  Download,
  ExternalLink,
  Play,
  Plus,
  Printer,
  Trash2,
  Users,
} from '@playora/ui/icons';
import type { Route } from 'next';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Caption } from '@/components/caption';
import { IconTile } from '@/components/icon-tile';
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
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const routes = campaignRoutes(orgId);

  const campaignQuery = useCampaign(orgId, campaignId);
  const reportQuery = useCampaignReport(orgId, campaignId);

  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelKey, setNewChannelKey] = useState('');

  useEffect(() => {
    if (campaignQuery.data?.id) {
      setCustomChannels(loadCustomChannels(campaignQuery.data.id));
    }
  }, [campaignQuery.data?.id]);

  if (campaignQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (campaignQuery.isError || !campaignQuery.data) {
    return <div className="py-12 text-center text-text-secondary">{tc('notFound')}</div>;
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

  const handleAddChannel = () => {
    const name = newChannelName.trim();
    const key = newChannelKey.trim();
    if (!name || !key) return;

    if (allChannels.some((c) => c.key === key)) {
      toast.error(t('channels.keyDuplicate'));
      return;
    }

    const updated = [...customChannels, { key, label: name }];
    setCustomChannels(updated);
    saveCustomChannels(campaign.id, updated);
    toast.success(t('channels.addTitle'));
    setIsAddModalOpen(false);
    setNewChannelName('');
    setNewChannelKey('');
  };

  const handleDeleteCustomChannel = (key: string) => {
    const updated = customChannels.filter((c) => c.key !== key);
    setCustomChannels(updated);
    saveCustomChannels(campaign.id, updated);
    toast.success(tCommon('delete'));
  };

  const reportChannels = reportQuery.data?.byChannel ?? [];
  const channelStatsMap = new Map(reportChannels.map((c) => [c.channel ?? '', c]));
  const reportTableData = allChannels.map((ch) => {
    const item = channelStatsMap.get(ch.key);
    const plays = item?.plays ?? 0;
    const wins = item?.wins ?? 0;
    const visits = item?.visits ?? 0;
    const rate = wins > 0 ? `${Math.round((visits / wins) * 100)}%` : '—';
    return {
      key: ch.key,
      name: ch.name,
      plays,
      wins,
      visits,
      rate,
    };
  });

  reportChannels.forEach((item) => {
    const chKey = item.channel ?? '';
    if (!allChannels.some((c) => c.key === chKey)) {
      const plays = item.plays;
      const wins = item.wins;
      const visits = item.visits;
      const rate = wins > 0 ? `${Math.round((visits / wins) * 100)}%` : '—';
      reportTableData.push({
        key: chKey || 'direct',
        name: chKey ? chKey : t('channels.direct'),
        plays,
        wins,
        visits,
        rate,
      });
    }
  });

  const maxPlays = Math.max(1, ...reportTableData.map((r) => r.plays));

  return (
    <div className="flex flex-col gap-6" data-testid="campaign-share-page">
      {!embedded && (
        <PageHeader
          title={t('title')}
          description={t('subtitle')}
          backHref={routes.detail(campaign.id)}
          backLabel={campaign.name}
          extra={
            isDraft ? (
              <a href={routes.rehearsal(campaign.id)} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">
                  <Play className="size-4" />
                  {tc('rehearse')}
                </Button>
              </a>
            ) : (
              <a href={routes.play(campaign.slug)} target="_blank" rel="noreferrer">
                <Button size="sm">
                  <ExternalLink className="size-4" />
                  {tc('openPlay')}
                </Button>
              </a>
            )
          }
        />
      )}

      {isDraft && (
        <Alert
          status="warning"
          className="items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200"
        >
          <Alert.Indicator className="mt-0.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0" />
          </Alert.Indicator>
          <Alert.Content className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Alert.Title className="text-body-2-semibold">{t('draftNotice')}</Alert.Title>
              <Alert.Description className="mt-0.5 text-caption-1-regular text-amber-800/90 dark:text-amber-300/80">
                {t('draft')}
              </Alert.Description>
            </div>
            <a href={routes.rehearsal(campaign.id)} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm" className="shrink-0">
                {tc('rehearse')}
              </Button>
            </a>
          </Alert.Content>
        </Alert>
      )}

      {/* Preset and Custom Channels */}
      <Card className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
        <Card.Header className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-4">
          <div>
            <Card.Title className="m-0 text-body-medium text-text-primary">
              {t('channels.title')}
            </Card.Title>
            <Card.Description className="text-caption-1-regular text-text-secondary">
              {t('channels.hint')}
            </Card.Description>
          </div>
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="size-4" />
            {t('channels.add')}
          </Button>
        </Card.Header>
        <Card.Content className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {allChannels.map((channel) => (
              <ChannelCard
                key={channel.key}
                orgId={orgId}
                campaign={campaign}
                channel={channel}
                onDelete={
                  channel.isPreset ? undefined : () => handleDeleteCustomChannel(channel.key)
                }
              />
            ))}
          </div>
        </Card.Content>
      </Card>

      {/* Counter Staff Card */}
      <Card
        className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
        data-testid="invite-counter-staff"
      >
        <Card.Content className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3.5">
            <IconTile tone="success" size={40}>
              <Users className="size-4" />
            </IconTile>
            <div>
              <h3 className="m-0 text-body-medium text-text-primary">{t('counterStaff.title')}</h3>
              <Caption className="mt-0.5 block max-w-2xl">{t('counterStaff.description')}</Caption>
            </div>
          </div>
          <Link href={`/orgs/${orgId}/settings` as Route}>
            <Button variant="secondary" size="sm">
              <ExternalLink className="size-4" />
              {t('counterStaff.action')}
            </Button>
          </Link>
        </Card.Content>
      </Card>

      {/* Traffic by Channel Visual List (replaces table) */}
      <Card className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
        <Card.Header className="border-b border-separator-border px-5 py-4">
          <Card.Title className="m-0 text-body-medium text-text-primary">
            {t('report.title')}
          </Card.Title>
          <Card.Description className="text-caption-1-regular text-text-secondary">
            {t('report.description')}
          </Card.Description>
        </Card.Header>
        <Card.Content className="p-0">
          <ul className="m-0 flex list-none flex-col divide-y divide-separator-border p-0">
            {reportTableData.map((row) => {
              const sharePercent = row.plays > 0 ? Math.round((row.plays / maxPlays) * 100) : 0;
              return (
                <li key={row.key} className="flex flex-col gap-2.5 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-body-2-semibold text-text-primary">{row.name}</span>
                      <Chip variant="soft" color="default" size="sm" className="font-mono">
                        ?ch={row.key}
                      </Chip>
                    </div>
                    <div className="flex items-center gap-4 text-caption-1-regular text-text-secondary">
                      <span>
                        {t('report.plays')}:{' '}
                        <strong className="font-medium tabular-nums text-text-primary">
                          {format.number(row.plays)}
                        </strong>
                      </span>
                      <span>
                        {t('report.wins')}:{' '}
                        <strong className="font-medium tabular-nums text-text-primary">
                          {format.number(row.wins)}
                        </strong>
                      </span>
                      <span>
                        {t('report.visits')}:{' '}
                        <strong className="font-semibold tabular-nums text-teal-600 dark:text-teal-400">
                          {format.number(row.visits)}
                        </strong>
                      </span>
                      <Chip variant="soft" color={row.visits > 0 ? 'success' : 'default'}>
                        {t('report.redemptionRate')}: {row.rate}
                      </Chip>
                    </div>
                  </div>
                  <ProgressBar value={sharePercent} size="sm" aria-label={row.name}>
                    <ProgressBar.Track>
                      <ProgressBar.Fill />
                    </ProgressBar.Track>
                  </ProgressBar>
                </li>
              );
            })}
          </ul>
        </Card.Content>
      </Card>

      {/* Add Custom Channel Modal */}
      <Modal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t('channels.addTitle')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <span className="text-body-2-medium text-text-primary">
                    {t('channels.channelName')}
                  </span>
                  <Input
                    placeholder={t('channels.channelNamePlaceholder')}
                    value={newChannelName}
                    fullWidth
                    onChange={(e) => {
                      setNewChannelName(e.target.value);
                      setNewChannelKey(slugifyChannelKey(e.target.value));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-body-2-medium text-text-primary">
                    {t('channels.channelKey')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-caption-1-regular text-text-secondary">
                      ?ch=
                    </span>
                    <Input
                      value={newChannelKey}
                      onChange={(e) =>
                        setNewChannelKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                      }
                      fullWidth
                      className="font-mono"
                    />
                  </div>
                  <Caption>{t('channels.channelKeyHint')}</Caption>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  size="sm"
                  isDisabled={!newChannelName.trim() || !newChannelKey.trim()}
                  onClick={handleAddChannel}
                >
                  {t('channels.add')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
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
  const tCommon = useTranslations('common');
  const routes = campaignRoutes(orgId);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const playerLink = buildPlayerLink(PLAY_URL, campaign.slug, channel.key);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(playerLink);
      toast.success(t('links.copied'));
    } catch {
      toast.info(playerLink);
    }
  };

  return (
    <Card
      variant="secondary"
      className="rounded-3xl border border-border-button-default bg-background-secondary-default/40 p-4 transition-colors hover:bg-background-secondary-default/70"
      data-testid={`share-channel-${channel.key}`}
    >
      <Card.Content className="space-y-3 p-0">
        {/* Channel Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-body-2-semibold text-text-primary">{channel.name}</span>
            <Chip variant="soft" color="default" size="sm" className="font-mono">
              ch={channel.key}
            </Chip>
          </div>
          {onDelete && (
            <>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label={tc('settings.delete')}
                className="size-7 p-0 text-text-error-primary hover:bg-notification-error-background"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
              </Button>
              <Modal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <Modal.Backdrop isDismissable>
                  <Modal.Container size="sm">
                    <Modal.Dialog>
                      <Modal.CloseTrigger />
                      <Modal.Header>
                        <Modal.Heading>{t('channels.deleteConfirm')}</Modal.Heading>
                      </Modal.Header>
                      <Modal.Footer>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsDeleteOpen(false)}
                        >
                          {tCommon('cancel')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            onDelete();
                            setIsDeleteOpen(false);
                          }}
                        >
                          {tc('settings.delete')}
                        </Button>
                      </Modal.Footer>
                    </Modal.Dialog>
                  </Modal.Container>
                </Modal.Backdrop>
              </Modal>
            </>
          )}
        </div>

        {/* Link and Copy */}
        <div className="flex items-center gap-2">
          <Input
            value={playerLink}
            readOnly
            className="min-w-0 flex-1 font-mono"
            data-testid={`channel-link-${channel.key}`}
          />
          <Button variant="secondary" size="sm" className="shrink-0" onClick={copyLink}>
            <Copy className="size-4" />
            {t('links.copy')}
          </Button>
        </div>

        {/* QR Code and Actions */}
        <div className="flex items-center gap-4 pt-1">
          <div
            ref={qrContainerRef}
            className="flex size-24 shrink-0 items-center justify-center rounded-2xl border border-border-button-default bg-white p-2 shadow-2xs"
          >
            <QRCodeSvg value={playerLink} size={80} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  downloadCanvasQRCode(
                    qrContainerRef.current,
                    `qr-${campaign.slug}-${channel.key}.png`,
                  )
                }
              >
                <Download className="size-3.5" />
                {t('links.downloadPng')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  downloadSvgQRCode(
                    qrContainerRef.current,
                    `qr-${campaign.slug}-${channel.key}.svg`,
                  )
                }
              >
                <Download className="size-3.5" />
                {t('links.downloadSvg')}
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <a
                href={routes.sharePrint(campaign.id, {
                  ch: channel.key,
                  format: 'standee',
                })}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="secondary" size="sm" data-testid={`print-standee-${channel.key}`}>
                  <Printer className="size-3.5" />
                  {t('links.printStandee')}
                </Button>
              </a>
              <a
                href={routes.sharePrint(campaign.id, {
                  ch: channel.key,
                  format: 'tent',
                })}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="secondary" size="sm" data-testid={`print-tent-${channel.key}`}>
                  <Printer className="size-3.5" />
                  {t('links.printTent')}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
