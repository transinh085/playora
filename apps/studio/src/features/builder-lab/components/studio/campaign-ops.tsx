'use client';

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
import { Input } from '@playora/ui/components/input';
import { Progress } from '@playora/ui/components/progress';
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
import { Tabs, TabsList, TabsTrigger } from '@playora/ui/components/tabs';
import { cn } from '@playora/ui/lib/utils';
import {
  CircleX,
  ExternalLink,
  FileText,
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
import { QueryError } from '@/components/query-error';
import { useCampaignActionError } from '@/features/billing/components/plan-limit';
import {
  type Campaign,
  useCampaign,
  useCampaignPlays,
  useCampaignReport,
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
import { campaignPeriod } from './campaign-period';
import {
  ChannelsTableCard,
  DailyOutcomeCard,
  OutcomeMetricGrid,
  PlaybookGoalBanner,
  PrizesOutcomeCard,
} from './campaign-report';
import { CampaignShareView } from './campaign-share-view';
import { PhaseTag } from './phase-tag';
import { PlaybookTag } from './playbook-tag';

const TABS = ['overview', 'share', 'prizes', 'players', 'settings'] as const;
type TabKey = (typeof TABS)[number];

export function CampaignOps({ orgId, campaignId }: { orgId: string; campaignId: string }) {
  const t = useTranslations('campaigns');
  const _tCommon = useTranslations('common');
  const tl = useTranslations('builderLab.home');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 }).getTime();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = useCampaign(orgId, campaignId);
  const routes = campaignRoutes(orgId);

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="mb-4">{t('notFound')}</p>
        <Link href={routes.list}>
          <Button>{t('backToList')}</Button>
        </Link>
      </div>
    );
  }

  const campaign = query.data;
  const phase = campaignPhase(campaign, now);
  const requested = params.get('tab') as TabKey | null;
  const tab: TabKey = requested && TABS.includes(requested) ? requested : 'overview';
  const setTab = (key: string) => router.replace(`${pathname}?tab=${key}` as never);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={campaign.name}
        tags={
          <div className="flex items-center gap-1.5">
            <PhaseTag phase={phase} />
            <PlaybookTag playbook={campaign.playbook} />
          </div>
        }
        description={`${tl(`templates.${campaign.templateKey}`)} · ${tl(`skins.${campaign.skinKey}`)} · ${campaignPeriod(format, campaign)}${campaign.version ? ` · v${campaign.version}` : ''}`}
        backHref={routes.list}
        backLabel={t('backToList')}
        extra={<HeaderActions orgId={orgId} campaign={campaign} />}
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="h-10 rounded-full border bg-muted/50 p-1">
          {TABS.map((key) => (
            <TabsTrigger key={key} value={key} className="rounded-full text-xs">
              {t(`tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === 'overview' && <OverviewTab orgId={orgId} campaign={campaign} />}
      {tab === 'share' && <ShareTab orgId={orgId} campaign={campaign} />}
      {tab === 'prizes' && <PrizesTab orgId={orgId} campaign={campaign} />}
      {tab === 'players' && <PlayersTab orgId={orgId} campaign={campaign} />}
      {tab === 'settings' && <SettingsTab orgId={orgId} campaign={campaign} />}
    </div>
  );
}

function HeaderActions({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const phase = campaignPhase(campaign);
  const routes = campaignRoutes(orgId);
  const resume = useResumeCampaign(orgId);
  const onActionError = useCampaignActionError(orgId);

  const reportLink = (
    <Link href={routes.report(campaign.id)}>
      <Button variant="outline" size="sm" className="gap-2">
        <FileText className="size-4" />
        {t('viewReport')}
      </Button>
    </Link>
  );

  const edit = (
    <Link href={routes.edit(campaign.id)}>
      <Button variant={phase === 'draft' ? 'default' : 'outline'} size="sm" className="gap-2">
        <Pencil className="size-4" />
        {phase === 'draft' ? t('continueEditing') : t('editDesign')}
      </Button>
    </Link>
  );

  const share = (
    <Link href={routes.share(campaign.id)}>
      <Button variant="outline" size="sm" className="gap-2">
        <Share2 className="size-4" />
        {t('share.action')}
      </Button>
    </Link>
  );

  if (phase === 'draft') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {edit}
        {share}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {reportLink}
      {edit}
      {share}
      {phase === 'paused' ? (
        <Button
          size="sm"
          className="gap-2"
          disabled={resume.isPending}
          onClick={() => resume.mutate(campaign.id, { onError: onActionError })}
        >
          <Play className="size-4" />
          {t('resume')}
        </Button>
      ) : (
        <a href={routes.play(campaign.id)} target="_blank" rel="noreferrer">
          <Button size="sm" className="gap-2">
            <ExternalLink className="size-4" />
            {t('openPlay')}
          </Button>
        </a>
      )}
    </div>
  );
}

function OverviewTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const tr = useTranslations('campaigns.report');
  const phase = campaignPhase(campaign);
  const isLive = phase === 'live';
  const report = useCampaignReport(orgId, campaign.id, {
    refetchInterval: isLive ? 30_000 : undefined,
  });

  return (
    <div className="flex flex-col gap-5">
      {campaign.status === 'draft' && <DraftChecklist orgId={orgId} campaign={campaign} />}
      {report.isError && <QueryError onRetry={() => report.refetch()} />}
      <PlaybookGoalBanner campaign={campaign} report={report.data} />
      <OutcomeMetricGrid campaign={campaign} report={report.data} loading={report.isPending} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <DailyOutcomeCard
          report={report.data}
          loading={report.isPending}
          extra={isLive ? <Caption>{tr('autoRefreshHint')}</Caption> : undefined}
        />
        <ChannelsTableCard report={report.data} loading={report.isPending} />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <PrizesOutcomeCard
          orgId={orgId}
          campaign={campaign}
          report={report.data}
          loading={report.isPending}
        />
        <RecentPlays orgId={orgId} campaign={campaign} />
      </div>
    </div>
  );
}

function DraftChecklist({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const tp = useTranslations('builderLab.publish');
  const issues = preflight(campaign);
  const errors = issues.filter((issue) => issue.level === 'error');
  const routes = campaignRoutes(orgId);

  return (
    <Card className="rounded-2xl border" data-testid="draft-checklist">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {errors.length ? t('draft.blocked', { count: errors.length }) : t('draft.ready')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Caption>{t('draft.hint')}</Caption>
        {issues.map((issue) => {
          const Icon = issue.level === 'error' ? CircleX : TriangleAlert;
          return (
            <div key={issue.id} className="flex items-center gap-2.5 text-sm">
              <Icon
                className={cn(
                  'size-4 shrink-0',
                  issue.level === 'error' ? 'text-destructive' : 'text-amber-500',
                )}
              />
              <span className="flex-1">{tp(`issues.${issue.code}`, issue.params)}</span>
              <Link
                href={routes.edit(campaign.id, issue.where.area === 'screens' ? 'quick' : 'rules')}
                className="text-xs text-primary hover:underline font-medium"
              >
                {t('draft.fix')}
              </Link>
            </div>
          );
        })}
        <div className="pt-2">
          <a href={routes.rehearsal(campaign.id)} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              {t('rehearse')}
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentPlays({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const isLive = campaignPhase(campaign) === 'live';
  const plays = useCampaignPlays(orgId, campaign.id, {
    refetchInterval: isLive ? 30_000 : undefined,
  });
  const recent = (plays.data ?? []).slice(0, 8);

  return (
    <Card className="rounded-2xl border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t('recent.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {plays.isPending ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : recent.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">{t('recent.empty')}</div>
        ) : (
          <PlaysTable campaign={campaign} rows={recent} compact />
        )}
      </CardContent>
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

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('players.time')}</TableHead>
            {!compact && <TableHead>{t('players.player')}</TableHead>}
            <TableHead>{t('players.outcome')}</TableHead>
            <TableHead>{t('players.prize')}</TableHead>
            {!compact && <TableHead>{t('players.code')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-xs">
                {format.dateTime(new Date(row.at), { dateStyle: 'short', timeStyle: 'short' })}
              </TableCell>
              {!compact && (
                <TableCell className="font-mono text-xs">{row.playerId.slice(0, 8)}</TableCell>
              )}
              <TableCell>
                <Badge
                  variant={row.outcome === 'win' ? 'default' : 'secondary'}
                  className="text-[10px]"
                >
                  {t(`outcome.${row.outcome}`)}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{prizeName(row.prizeId)}</TableCell>
              {!compact && (
                <TableCell className="font-mono text-xs">{row.voucherCode ?? '—'}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ShareTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  return <CampaignShareView orgId={orgId} campaignId={campaign.id} embedded />;
}

function PrizeStock({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const stats = useCampaignStats(orgId, campaign.id);
  const vouchers = useCampaignVouchers(orgId, campaign.id).data ?? [];

  return (
    <Card className="rounded-2xl border" data-testid="prize-stock">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">{t('stock.title')}</CardTitle>
        <Link
          href={campaignRoutes(orgId).edit(campaign.id, 'rules')}
          className="text-xs text-primary hover:underline"
        >
          {t('stock.edit')}
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {campaign.prizes.map((prize) => {
          const left = stats.data?.remainingByPrize[prize.id] ?? prize.quantity;
          const issued = vouchers.filter((v) => v.prizeId === prize.id);
          const redeemed = issued.filter((v) => v.redeemedAt).length;
          const percent = prize.quantity ? Math.round((left / prize.quantity) * 100) : 0;
          return (
            <div key={prize.id} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{prize.name}</span>
                <Caption className="tabular-nums">
                  {t('stock.left', { left, total: prize.quantity })}
                </Caption>
              </div>
              <Progress
                value={percent}
                className={cn('h-1.5', percent < 20 && '[&>div]:bg-destructive')}
              />
              <Caption>{t('stock.issued', { issued: issued.length, redeemed })}</Caption>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function PrizesTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const format = useFormatter();
  const vouchers = useCampaignVouchers(orgId, campaign.id);
  const prizeName = (id: string) => campaign.prizes.find((p) => p.id === id)?.name ?? '—';

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <PrizeStock orgId={orgId} campaign={campaign} />
      <Card className="rounded-2xl border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">{t('vouchers.title')}</CardTitle>
          <Link
            href={campaignRoutes(orgId).redeem}
            className="text-xs text-primary hover:underline"
          >
            {t('vouchers.desk')}
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {vouchers.isPending ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (vouchers.data ?? []).length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {t('vouchers.empty')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('vouchers.code')}</TableHead>
                    <TableHead>{t('players.prize')}</TableHead>
                    <TableHead>{t('vouchers.issued')}</TableHead>
                    <TableHead>{t('vouchers.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(vouchers.data ?? []).map((row) => (
                    <TableRow key={row.code}>
                      <TableCell className="font-mono text-xs">{row.code}</TableCell>
                      <TableCell className="text-xs">{prizeName(row.prizeId)}</TableCell>
                      <TableCell className="text-xs">
                        {format.dateTime(new Date(row.issuedAt), {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={row.redeemedAt ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {row.redeemedAt ? t('vouchers.redeemed') : t('vouchers.pending')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PlayersTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const plays = useCampaignPlays(orgId, campaign.id);
  return (
    <Card className="rounded-2xl border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {t('players.title', { count: plays.data?.length ?? 0 })}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {plays.isPending ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (plays.data ?? []).length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">{t('recent.empty')}</div>
        ) : (
          <PlaysTable campaign={campaign} rows={plays.data ?? []} />
        )}
      </CardContent>
    </Card>
  );
}

function SettingsTab({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('campaigns');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const phase = campaignPhase(campaign);
  const update = useUpdateCampaign(orgId, campaign.id);
  const pause = usePauseCampaign(orgId);
  const resume = useResumeCampaign(orgId);
  const onActionError = useCampaignActionError(orgId);
  const end = useEndCampaign(orgId);
  const remove = useDeleteCampaign(orgId);

  const extend = (value: string) => {
    const endsAt = localInputToIso(value);
    if (!endsAt || endsAt <= campaign.rules.startsAt) return;
    update.mutate(
      { rules: { ...campaign.rules, endsAt } },
      { onSuccess: () => toast.success(t('settings.extended')) },
    );
  };

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Card className="rounded-2xl border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{t('settings.scheduleTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Caption>{t('settings.scheduleHint')}</Caption>
          <Input
            type="datetime-local"
            aria-label={t('settings.endsAt')}
            defaultValue={isoToLocalInput(campaign.rules.endsAt)}
            min={isoToLocalInput(campaign.rules.startsAt)}
            onBlur={(e) => extend(e.target.value)}
            className="w-64"
          />
        </CardContent>
      </Card>

      {campaign.status === 'published' && phase !== 'ended' && (
        <Card className="rounded-2xl border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{t('settings.runTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              {phase === 'paused' ? (
                <Button
                  className="gap-2 rounded-full"
                  onClick={() => resume.mutate(campaign.id, { onError: onActionError })}
                >
                  <Play className="size-4" />
                  {t('resume')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="gap-2 rounded-full"
                  onClick={() => pause.mutate(campaign.id)}
                >
                  <Pause className="size-4" />
                  {t('settings.pause')}
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2 rounded-full">
                    <Square className="size-4" />
                    {t('settings.end')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('settings.endConfirm')}</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground"
                      onClick={() => end.mutate(campaign.id)}
                    >
                      {t('settings.end')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Caption>{t('settings.runHint')}</Caption>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{t('settings.deleteTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="gap-2 rounded-full"
                  disabled={isRunning(phase)}
                >
                  <Trash2 className="size-4" />
                  {t('settings.delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('settings.deleteConfirm', { name: campaign.name })}
                  </AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground"
                    onClick={async () => {
                      await remove.mutateAsync(campaign.id);
                      toast.success(t('settings.deleted'));
                      router.push(campaignRoutes(orgId).list);
                    }}
                  >
                    {t('settings.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Caption>
              {isRunning(phase) ? t('settings.deleteBlocked') : t('settings.deleteHint')}
            </Caption>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
