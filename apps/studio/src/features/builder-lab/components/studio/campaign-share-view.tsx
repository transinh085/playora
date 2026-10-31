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
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Caption } from '@/components/caption';
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
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (campaignQuery.isError || !campaignQuery.data) {
    return <div className="py-12 text-center text-muted-foreground">{tc('notFound')}</div>;
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
                <Button variant="secondary" className="gap-2">
                  <Play className="size-4" />
                  {tc('rehearse')}
                </Button>
              </a>
            ) : (
              <a href={routes.play(campaign.slug)} target="_blank" rel="noreferrer">
                <Button className="gap-2">
                  <ExternalLink className="size-4" />
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
              <div className="font-medium leading-none tracking-tight">{t('draftNotice')}</div>
              <div className="mt-1 text-sm text-amber-800/90 dark:text-amber-300/80">
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
      <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
        <div className="flex flex-row items-center justify-between border-b border-border-button-default px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
              {t('channels.title')}
            </h3>
            <Caption className="text-[11px]">{t('channels.hint')}</Caption>
          </div>
          <Button
            className="gap-1.5 rounded-md h-8 text-xs shadow-xs"
            size="small"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="size-3.5" />
            {t('channels.add')}
          </Button>
        </div>
        <div className="p-4">
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
      <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
        <div className="flex flex-row items-center justify-between p-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
              <Users className="size-4 text-teal-600 dark:text-teal-400" />
              {t('counterStaff.title')}
            </h3>
            <Caption className="text-[11px]">{t('counterStaff.description')}</Caption>
          </div>
          <Link href={`/orgs/${orgId}/members` as Route}>
            <Button
              variant="secondary"
              size="small"
              className="gap-2 h-8 rounded-md text-xs shadow-xs"
            >
              <ExternalLink className="size-3.5" />
              {t('counterStaff.action')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Traffic by Channel Table */}
      <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
        <div className="border-b border-border-button-default px-4 py-3">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
            {t('report.title')}
          </h3>
          <Caption className="text-[11px]">{t('report.description')}</Caption>
        </div>
        <div className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="bui-table w-full">
              <thead>
                <tr>
                  <th>{t('report.channel')}</th>
                  <th className="text-right">{t('report.plays')}</th>
                  <th className="text-right">{t('report.wins')}</th>
                  <th className="text-right">{t('report.visits')}</th>
                  <th className="text-right">{t('report.redemptionRate')}</th>
                </tr>
              </thead>
              <tbody>
                {reportTableData.map((row) => (
                  <tr key={row.key}>
                    <td className="text-xs font-medium">{row.name}</td>
                    <td className="text-right text-xs tabular-nums text-neutral-600 dark:text-[#A3A3A3]">
                      {row.plays}
                    </td>
                    <td className="text-right text-xs tabular-nums text-neutral-600 dark:text-[#A3A3A3]">
                      {row.wins}
                    </td>
                    <td className="text-right text-xs tabular-nums text-neutral-600 dark:text-[#A3A3A3]">
                      {row.visits}
                    </td>
                    <td className="text-right text-xs font-semibold tabular-nums text-neutral-900 dark:text-[#FAFAFA]">
                      {row.rate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Custom Channel Modal */}
      <Modal isOpen={isAddModalOpen} onOpenChange={setIsAddModalOpen} size="md">
        <ModalHeader title={t('channels.addTitle')} />
        <ModalBody className="space-y-4 py-2">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-neutral-700 dark:text-[#D4D4D4]">
              {t('channels.channelName')}
            </span>
            <InputBase
              placeholder={t('channels.channelNamePlaceholder')}
              value={newChannelName}
              onChange={(e) => {
                setNewChannelName(e.target.value);
                setNewChannelKey(slugifyChannelKey(e.target.value));
              }}
              fieldClassName="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-neutral-700 dark:text-[#D4D4D4]">
              {t('channels.channelKey')}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-muted-foreground">?ch=</span>
              <InputBase
                value={newChannelKey}
                onChange={(e) =>
                  setNewChannelKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                }
                fieldClassName="h-8 text-xs font-mono"
              />
            </div>
            <Caption className="text-[11px]">{t('channels.channelKeyHint')}</Caption>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="small"
            className="h-8 rounded-md text-xs"
            onClick={() => setIsAddModalOpen(false)}
          >
            {tc('settings.pause')}
          </Button>
          <Button
            size="small"
            className="h-8 rounded-md text-xs shadow-xs"
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
  const _tCommon = useTranslations('common');
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
      className="rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"
      data-testid={`share-channel-${channel.key}`}
    >
      <div className="space-y-3 p-4">
        {/* Channel Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
              {channel.name}
            </span>
            <Chip variant="caption" color="neutral" className="font-mono text-[10px]">
              ch={channel.key}
            </Chip>
          </div>
          {onDelete && (
            <>
              <Button
                variant="ghost"
                size="small"
                aria-label={tc('settings.delete')}
                className="size-7 rounded-md p-0 text-destructive hover:bg-destructive/10"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
              </Button>
              <Modal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen} size="sm">
                <ModalHeader title={t('channels.deleteConfirm')} />
                <ModalFooter>
                  <Button
                    variant="secondary"
                    size="small"
                    className="h-8 rounded-md text-xs"
                    onClick={() => setIsDeleteOpen(false)}
                  >
                    {t('links.copy')}
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => {
                      onDelete();
                      setIsDeleteOpen(false);
                    }}
                    className="h-8 rounded-md text-xs"
                  >
                    {tc('settings.delete')}
                  </Button>
                </ModalFooter>
              </Modal>
            </>
          )}
        </div>

        {/* Link and Copy */}
        <div className="flex items-center gap-1.5">
          <InputBase
            value={playerLink}
            readOnly
            fieldClassName="min-w-0 flex-1 h-8 font-mono text-xs"
            data-testid={`channel-link-${channel.key}`}
          />
          <Button
            variant="secondary"
            size="small"
            className="h-8 rounded-md gap-1.5 shrink-0 text-xs shadow-xs"
            onClick={copyLink}
          >
            <Copy className="size-3.5" />
            {t('links.copy')}
          </Button>
        </div>

        {/* QR Code and Actions */}
        <div className="flex items-center gap-4 pt-1">
          <div
            ref={qrContainerRef}
            className="flex size-24 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white p-2 shadow-xs dark:border-white/10 dark:bg-white"
          >
            <QRCodeSvg value={playerLink} size={80} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="secondary"
                size="small"
                className="h-7 rounded-md gap-1 text-[11px] shadow-xs"
                onClick={() =>
                  downloadCanvasQRCode(
                    qrContainerRef.current,
                    `qr-${campaign.slug}-${channel.key}.png`,
                  )
                }
              >
                <Download className="size-3" />
                {t('links.downloadPng')}
              </Button>
              <Button
                variant="secondary"
                size="small"
                className="h-7 rounded-md gap-1 text-[11px] shadow-xs"
                onClick={() =>
                  downloadSvgQRCode(
                    qrContainerRef.current,
                    `qr-${campaign.slug}-${channel.key}.svg`,
                  )
                }
              >
                <Download className="size-3" />
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
                  size="small"
                  className="h-7 rounded-md gap-1 text-[11px] shadow-xs"
                  data-testid={`print-standee-${channel.key}`}
                >
                  <Printer className="size-3" />
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
                  size="small"
                  className="h-7 rounded-md gap-1 text-[11px] shadow-xs"
                  data-testid={`print-tent-${channel.key}`}
                >
                  <Printer className="size-3" />
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
