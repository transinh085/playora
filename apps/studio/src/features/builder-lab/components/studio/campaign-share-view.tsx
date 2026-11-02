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
  Check,
  Copy,
  Download,
  ExternalLink,
  Play,
  Plus,
  Printer,
  Store,
  Trash2,
  Users,
} from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import type { Route } from 'next';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Caption } from '@/components/caption';
import { IconTile } from '@/components/icon-tile';
import { PageHeader } from '@/components/page-header';
import { CreateCounterDeviceDialog } from '@/features/members/components/counter-devices-card';
import { InviteMemberDialog } from '@/features/members/components/invite-member-dialog';
import { PLAY_URL } from '@/lib/env';
import { type Campaign, useCampaign, useCampaignReport, useUpdateCampaign } from '../../api';
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

type ChecklistKey = 'qrPrinted' | 'staffReady' | 'testPlayDone' | 'redeemReady';
const CHECKLIST_KEYS: readonly ChecklistKey[] = [
  'qrPrinted',
  'staffReady',
  'testPlayDone',
  'redeemReady',
];

function mergeCustomChannels(
  serverChannels: CustomChannel[] | undefined,
  localChannels: CustomChannel[],
): CustomChannel[] {
  const byKey = new Map<string, CustomChannel>();
  for (const ch of localChannels) {
    if (ch.key && ch.label) byKey.set(ch.key, ch);
  }
  for (const ch of serverChannels ?? []) {
    if (ch.key && ch.label) byKey.set(ch.key, ch);
  }
  return [...byKey.values()];
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
  const updateCampaign = useUpdateCampaign(orgId, campaignId);

  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelKey, setNewChannelKey] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<ChecklistKey, boolean>>({
    qrPrinted: false,
    staffReady: false,
    testPlayDone: false,
    redeemReady: false,
  });

  useEffect(() => {
    if (campaignQuery.data?.id) {
      const local = loadCustomChannels(campaignQuery.data.id);
      const merged = mergeCustomChannels(campaignQuery.data.rules.customChannels, local);
      setCustomChannels(merged);
      saveCustomChannels(campaignQuery.data.id, merged);

      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(
            `playora.launchChecklist.${campaignQuery.data.id}`,
          );
          if (raw) {
            const parsed = JSON.parse(raw) as Partial<Record<ChecklistKey, boolean>>;
            setCheckedItems((prev) => ({ ...prev, ...parsed }));
          }
        } catch {
          // ignore localStorage read errors
        }
      }
    }
  }, [campaignQuery.data?.id, campaignQuery.data?.rules.customChannels]);

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

  const toggleChecklistItem = (key: ChecklistKey) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            `playora.launchChecklist.${campaign.id}`,
            JSON.stringify(next),
          );
        } catch {
          // ignore localStorage write errors
        }
      }
      return next;
    });
  };

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

  const persistChannels = (updated: CustomChannel[]) => {
    setCustomChannels(updated);
    saveCustomChannels(campaign.id, updated);
    updateCampaign.mutate({
      rules: {
        ...campaign.rules,
        customChannels: updated,
      },
    });
  };

  const handleAddChannel = () => {
    const name = newChannelName.trim();
    const key = newChannelKey.trim();
    if (!name || !key) return;

    if (allChannels.some((c) => c.key === key)) {
      toast.error(t('channels.keyDuplicate'));
      return;
    }

    const updated = [...customChannels, { key, label: name }];
    persistChannels(updated);
    toast.success(t('channels.addTitle'));
    setIsAddModalOpen(false);
    setNewChannelName('');
    setNewChannelKey('');
  };

  const handleDeleteCustomChannel = (key: string) => {
    const updated = customChannels.filter((c) => c.key !== key);
    persistChannels(updated);
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
  const completedCount = CHECKLIST_KEYS.filter((k) => checkedItems[k]).length;

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

      {/* Launch Readiness Checklist (BLD-29) */}
      <Card className="overflow-hidden p-0" data-testid="launch-checklist">
        <Card.Header className="flex flex-wrap items-center justify-between gap-2 border-b border-separator-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Card.Title className="m-0 text-body-medium text-text-primary">
                {t('checklist.title')}
              </Card.Title>
              <Chip
                variant="soft"
                color={completedCount === CHECKLIST_KEYS.length ? 'success' : 'default'}
                size="sm"
              >
                {completedCount}/{CHECKLIST_KEYS.length}
              </Chip>
            </div>
            <Card.Description className="text-caption-1-regular text-text-secondary">
              {t('checklist.subtitle')}
            </Card.Description>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={routes.rehearsal(campaign.id)} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm">
                <Play className="size-3.5" />
                {tc('rehearse')}
              </Button>
            </a>
            <Link href={routes.redeem}>
              <Button variant="secondary" size="sm">
                <Store className="size-3.5" />
                {t('checklist.openRedeem')}
              </Button>
            </Link>
          </div>
        </Card.Header>
        <Card.Content className="p-0">
          <ul className="m-0 flex list-none flex-col divide-y divide-separator-border p-0">
            {CHECKLIST_KEYS.map((key) => {
              const checked = checkedItems[key];
              return (
                <li
                  key={key}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-background-secondary-default/40"
                >
                  <button
                    type="button"
                    onClick={() => toggleChecklistItem(key)}
                    className="flex flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left"
                    data-testid={`launch-checklist-item-${key}`}
                  >
                    <span
                      className={cx(
                        'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                        checked
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-border bg-surface',
                      )}
                    >
                      {checked && <Check className="size-3.5" />}
                    </span>
                    <span
                      className={cx(
                        'text-body-2-regular',
                        checked ? 'line-through text-text-secondary' : 'text-text-primary',
                      )}
                    >
                      {t(`checklist.${key}`)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card.Content>
      </Card>

      {/* Preset and Custom Channels */}
      <Card className="overflow-hidden p-0">
        <Card.Header className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-4">
          <div>
            <Card.Title className="m-0 text-body-medium text-text-primary">
              {t('channels.title')}
            </Card.Title>
            <Card.Description className="text-caption-1-regular text-text-secondary">
              {t('channels.hint')}
            </Card.Description>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            data-testid="add-custom-channel-button"
          >
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
      <Card className="overflow-hidden p-0" data-testid="invite-counter-staff">
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
          <div className="flex flex-wrap items-center gap-2">
            <CreateCounterDeviceDialog orgId={orgId} />
            <InviteMemberDialog
              orgId={orgId}
              assignableRoles={['redeemer', 'operator', 'editor', 'viewer']}
            />
            <Link href={`/orgs/${orgId}/settings` as Route}>
              <Button variant="secondary" size="sm">
                <ExternalLink className="size-4" />
                {t('counterStaff.action')}
              </Button>
            </Link>
          </div>
        </Card.Content>
      </Card>

      {/* Traffic by Channel Visual List (replaces table) */}
      <Card className="overflow-hidden p-0">
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
      className="p-4 transition-colors"
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
            <QRCodeSvg value={playerLink} size={80} color="#111827" />
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
