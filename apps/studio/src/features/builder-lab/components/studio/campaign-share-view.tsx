'use client';

import { Alert, AlertDescription, AlertTitle } from '@playora/ui/components/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@playora/ui/components/alert-dialog';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@playora/ui/components/dialog';
import { Input } from '@playora/ui/components/input';
import { QRCodeSvg } from '@playora/ui/components/qr-code';
import { Skeleton } from '@playora/ui/components/skeleton';
import { toast } from '@playora/ui/components/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@playora/ui/components/table';
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
} from 'lucide-react';
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
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
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
                <Button variant="outline" className="gap-2">
                  <Play className="size-4" />
                  {tc('rehearse')}
                </Button>
              </a>
            ) : (
              <a href={routes.play(campaign.id)} target="_blank" rel="noreferrer">
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
        <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AlertTitle>{t('draftNotice')}</AlertTitle>
              <AlertDescription className="text-amber-800/90 dark:text-amber-300/80">
                {t('draft')}
              </AlertDescription>
            </div>
            <a href={routes.rehearsal(campaign.id)} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="shrink-0">
                {tc('rehearse')}
              </Button>
            </a>
          </div>
        </Alert>
      )}

      {/* Preset and Custom Channels */}
      <Card className="rounded-2xl border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">{t('channels.title')}</CardTitle>
            <Caption>{t('channels.hint')}</Caption>
          </div>
          <Button
            className="gap-1.5 rounded-full"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="size-4" />
            {t('channels.add')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-2">
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
        </CardContent>
      </Card>

      {/* Counter Staff Card */}
      <Card className="rounded-2xl border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="size-4" />
              {t('counterStaff.title')}
            </CardTitle>
            <Caption>{t('counterStaff.description')}</Caption>
          </div>
          <Link href={`/orgs/${orgId}/members` as Route}>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="size-3.5" />
              {t('counterStaff.action')}
            </Button>
          </Link>
        </CardHeader>
      </Card>

      {/* Traffic by Channel Table */}
      <Card className="rounded-2xl border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{t('report.title')}</CardTitle>
          <Caption>{t('report.description')}</Caption>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('report.channel')}</TableHead>
                  <TableHead className="text-right">{t('report.plays')}</TableHead>
                  <TableHead className="text-right">{t('report.wins')}</TableHead>
                  <TableHead className="text-right">{t('report.visits')}</TableHead>
                  <TableHead className="text-right">{t('report.redemptionRate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportTableData.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.plays}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.wins}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.visits}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {row.rate}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Custom Channel Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('channels.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold">{t('channels.channelName')}</span>
              <Input
                placeholder={t('channels.channelNamePlaceholder')}
                value={newChannelName}
                onChange={(e) => {
                  setNewChannelName(e.target.value);
                  setNewChannelKey(slugifyChannelKey(e.target.value));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold">{t('channels.channelKey')}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-muted-foreground">?ch=</span>
                <Input
                  value={newChannelKey}
                  onChange={(e) =>
                    setNewChannelKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                  }
                />
              </div>
              <Caption>{t('channels.channelKeyHint')}</Caption>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              {tc('settings.pause')}
            </Button>
            <Button
              className="rounded-full"
              disabled={!newChannelName.trim() || !newChannelKey.trim()}
              onClick={handleAddChannel}
            >
              {t('channels.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    <Card className="rounded-2xl border" data-testid={`share-channel-${channel.key}`}>
      <CardContent className="space-y-3 p-4">
        {/* Channel Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{channel.name}</span>
            <Badge variant="secondary" className="font-mono text-[10px]">
              ch={channel.key}
            </Badge>
          </div>
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('channels.deleteConfirm')}</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('links.copy')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground"
                  >
                    {tc('settings.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Link and Copy */}
        <div className="flex items-center gap-1.5">
          <Input
            value={playerLink}
            readOnly
            className="h-8 font-mono text-xs"
            data-testid={`channel-link-${channel.key}`}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 shrink-0 text-xs"
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
            className="flex size-28 shrink-0 items-center justify-center rounded-xl border bg-white p-2 shadow-xs"
          >
            <QRCodeSvg value={playerLink} size={96} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-[11px]"
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
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-[11px]"
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
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
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
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
                  data-testid={`print-tent-${channel.key}`}
                >
                  <Printer className="size-3" />
                  {t('links.printTent')}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
