'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { InputBase } from '@playora/ui/components/base/input/input';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@playora/ui/components/base/modal/modal';
import { ProgressBar } from '@playora/ui/components/base/progress/progress';
import { Skeleton } from '@playora/ui/components/base/skeleton/skeleton';
import { toast } from '@playora/ui/components/base/toast/toast';
import { QRCodeSvg } from '@playora/ui/components/foundations/qr-code/qr-code';
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
                <Button variant="secondary" size="small" leadingIcon={Play}>
                  {tc('rehearse')}
                </Button>
              </a>
            ) : (
              <a href={routes.play(campaign.slug)} target="_blank" rel="noreferrer">
                <Button size="small" leadingIcon={ExternalLink}>
                  {tc('openPlay')}
                </Button>
              </a>
            )
          }
        />
      )}

      {isDraft && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-body-2-semibold">{t('draftNotice')}</div>
              <div className="mt-0.5 text-caption-1-regular text-amber-800/90 dark:text-amber-300/80">
                {t('draft')}
              </div>
            </div>
            <a href={routes.rehearsal(campaign.id)} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="small" className="shrink-0">
                {tc('rehearse')}
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Preset and Custom Channels */}
      <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
        <div className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-4">
          <div>
            <h3 className="m-0 text-body-medium text-text-primary">{t('channels.title')}</h3>
            <Caption className="block">{t('channels.hint')}</Caption>
          </div>
          <Button size="small" leadingIcon={Plus} onClick={() => setIsAddModalOpen(true)}>
            {t('channels.add')}
          </Button>
        </div>
        <div className="p-5">
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
        </div>
      </div>

      {/* Counter Staff Card */}
      <div
        className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"
        data-testid="invite-counter-staff"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
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
            <Button variant="secondary" size="small" leadingIcon={ExternalLink}>
              {t('counterStaff.action')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Traffic by Channel Visual List (replaces table) */}
      <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
        <div className="border-b border-separator-border px-5 py-4">
          <h3 className="m-0 text-body-medium text-text-primary">{t('report.title')}</h3>
          <Caption className="block">{t('report.description')}</Caption>
        </div>
        <ul className="m-0 flex list-none flex-col divide-y divide-separator-border p-0">
          {reportTableData.map((row) => {
            const sharePercent = row.plays > 0 ? Math.round((row.plays / maxPlays) * 100) : 0;
            return (
              <li key={row.key} className="flex flex-col gap-2.5 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-body-2-semibold text-text-primary">{row.name}</span>
                    <Chip variant="caption" color="neutral" className="font-mono">
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
                    <Chip variant="subtle" color={row.visits > 0 ? 'lime' : 'neutral'}>
                      {t('report.redemptionRate')}: {row.rate}
                    </Chip>
                  </div>
                </div>
                <ProgressBar value={sharePercent} size="sm" aria-label={row.name} />
              </li>
            );
          })}
        </ul>
      </div>

      {/* Add Custom Channel Modal */}
      <Modal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} size="md">
        <ModalHeader title={t('channels.addTitle')} />
        <ModalBody className="space-y-4 py-2">
          <div className="space-y-1.5">
            <span className="text-body-2-medium text-text-primary">
              {t('channels.channelName')}
            </span>
            <InputBase
              placeholder={t('channels.channelNamePlaceholder')}
              value={newChannelName}
              onChange={(e) => {
                setNewChannelName(e.target.value);
                setNewChannelKey(slugifyChannelKey(e.target.value));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-body-2-medium text-text-primary">{t('channels.channelKey')}</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-caption-1-regular text-text-secondary">?ch=</span>
              <InputBase
                value={newChannelKey}
                onChange={(e) =>
                  setNewChannelKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                }
                fieldClassName="font-mono"
              />
            </div>
            <Caption>{t('channels.channelKeyHint')}</Caption>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="small" onClick={() => setIsAddModalOpen(false)}>
            {tCommon('cancel')}
          </Button>
          <Button
            size="small"
            disabled={!newChannelName.trim() || !newChannelKey.trim()}
            onClick={handleAddChannel}
          >
            {t('channels.add')}
          </Button>
        </ModalFooter>
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
    <div
      className="rounded-3xl border border-border-button-default bg-background-secondary-default/40 p-4 transition-colors hover:bg-background-secondary-default/70"
      data-testid={`share-channel-${channel.key}`}
    >
      <div className="space-y-3">
        {/* Channel Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-body-2-semibold text-text-primary">{channel.name}</span>
            <Chip variant="caption" color="neutral" className="font-mono">
              ch={channel.key}
            </Chip>
          </div>
          {onDelete && (
            <>
              <Button
                variant="ghost"
                size="small"
                aria-label={tc('settings.delete')}
                className="size-7 p-0 text-text-error-primary hover:bg-notification-error-background"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
              </Button>
              <Modal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen} size="sm">
                <ModalHeader title={t('channels.deleteConfirm')} />
                <ModalFooter>
                  <Button variant="secondary" size="small" onClick={() => setIsDeleteOpen(false)}>
                    {tCommon('cancel')}
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => {
                      onDelete();
                      setIsDeleteOpen(false);
                    }}
                  >
                    {tc('settings.delete')}
                  </Button>
                </ModalFooter>
              </Modal>
            </>
          )}
        </div>

        {/* Link and Copy */}
        <div className="flex items-center gap-2">
          <InputBase
            value={playerLink}
            readOnly
            size="small"
            fieldClassName="min-w-0 flex-1 font-mono"
            data-testid={`channel-link-${channel.key}`}
          />
          <Button
            variant="secondary"
            size="small"
            leadingIcon={Copy}
            className="shrink-0"
            onClick={copyLink}
          >
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
                size="xs"
                leadingIcon={Download}
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
                variant="secondary"
                size="xs"
                leadingIcon={Download}
                onClick={() =>
                  downloadSvgQRCode(
                    qrContainerRef.current,
                    `qr-${campaign.slug}-${channel.key}.svg`,
                  )
                }
              >
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
                <Button
                  variant="secondary"
                  size="xs"
                  leadingIcon={Printer}
                  data-testid={`print-standee-${channel.key}`}
                >
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
                <Button
                  variant="secondary"
                  size="xs"
                  leadingIcon={Printer}
                  data-testid={`print-tent-${channel.key}`}
                >
                  {t('links.printTent')}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
