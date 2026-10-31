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
} from '@playora/ui/icons';
import { cn } from '@playora/ui/lib/utils';
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
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
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
        <TabsList className="h-9 rounded-lg border border-neutral-200 bg-neutral-100/70 p-1 dark:border-white/10 dark:bg-white/5">
          {TABS.map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              className="rounded-md px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-xs dark:data-[state=active]:bg-[#171717] dark:data-[state=active]:text-[#FAFAFA]"
            >
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
    <Card
      className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]"
      data-testid="draft-checklist"
    >
      <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-white/10">
        <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
          {errors.length ? t('draft.blocked', { count: errors.length }) : t('draft.ready')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <Caption>{t('draft.hint')}</Caption>
        {issues.map((issue) => {
          const Icon = issue.level === 'error' ? CircleX : TriangleAlert;
          return (
            <div key={issue.id} className="flex items-center gap-2.5 text-xs">
              <Icon
                className={cn(
                  'size-3.5 shrink-0',
                  issue.level === 'error' ? 'text-rose-500' : 'text-amber-500',
                )}
              />
              <span className="flex-1 text-neutral-700 dark:text-[#D4D4D4]">
                {tp(`issues.${issue.code}`, issue.params)}
              </span>
              <Link
                href={routes.edit(campaign.id, issue.where.area === 'screens' ? 'quick' : 'rules')}
                className="text-xs font-medium text-teal-600 hover:underline dark:text-teal-400"
              >
                {t('draft.fix')}
              </Link>
            </div>
          );
        })}
        <div className="pt-1">
          <a href={routes.rehearsal(campaign.id)} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="h-7 rounded-md px-2.5 text-xs shadow-xs">
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
    <Card className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-white/10">
        <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
          {t('recent.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {plays.isPending ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : recent.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400 dark:text-[#737373]">
            {t('recent.empty')}
          </div>
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
    <Card
      className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]"
      data-testid="prize-stock"
    >
      <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-white/10">
        <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
          {t('stock.title')}
        </CardTitle>
        <Link
          href={campaignRoutes(orgId).edit(campaign.id, 'rules')}
          className="text-xs font-medium text-teal-600 hover:underline dark:text-teal-400"
        >
          {t('stock.edit')}
        </Link>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {campaign.prizes.map((prize) => {
          const left = stats.data?.remainingByPrize[prize.id] ?? prize.quantity;
          const issued = vouchers.filter((v) => v.prizeId === prize.id);
          const redeemed = issued.filter((v) => v.redeemedAt).length;
          const percent = prize.quantity ? Math.round((left / prize.quantity) * 100) : 0;
          return (
            <div key={prize.id} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-neutral-900 dark:text-[#FAFAFA]">
                  {prize.name}
                </span>
                <Caption className="tabular-nums text-[11px]">
                  {t('stock.left', { left, total: prize.quantity })}
                </Caption>
              </div>
              <Progress
                value={percent}
                className={cn('h-1.5', percent < 20 && '[&>div]:bg-rose-500')}
              />
              <Caption className="text-[11px]">
                {t('stock.issued', { issued: issued.length, redeemed })}
              </Caption>
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
      <Card className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
        <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-white/10">
          <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
            {t('vouchers.title')}
          </CardTitle>
          <Link
            href={campaignRoutes(orgId).redeem}
            className="text-xs font-medium text-teal-600 hover:underline dark:text-teal-400"
          >
            {t('vouchers.desk')}
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {vouchers.isPending ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (vouchers.data ?? []).length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400 dark:text-[#737373]">
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
                      <TableCell className="font-mono text-xs font-medium">{row.code}</TableCell>
                      <TableCell className="text-xs">{prizeName(row.prizeId)}</TableCell>
                      <TableCell className="text-xs text-neutral-500 dark:text-[#A3A3A3]">
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
    <Card className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-white/10">
        <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
          {t('players.title', { count: plays.data?.length ?? 0 })}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {plays.isPending ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (plays.data ?? []).length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400 dark:text-[#737373]">
            {t('recent.empty')}
          </div>
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
    <div className="flex max-w-4xl flex-col">
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs divide-y divide-neutral-200 dark:border-white/10 dark:bg-[#0A0A0A] dark:divide-white/10">
        {/* Schedule Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
          <div className="max-w-md">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
              {t('settings.scheduleTitle')}
            </h3>
            <p className="mt-1 text-xs text-neutral-500 dark:text-[#A3A3A3]">
              {t('settings.scheduleHint')}
            </p>
          </div>
          <Input
            type="datetime-local"
            aria-label={t('settings.endsAt')}
            defaultValue={isoToLocalInput(campaign.rules.endsAt)}
            min={isoToLocalInput(campaign.rules.startsAt)}
            onBlur={(e) => extend(e.target.value)}
            className="h-8 w-56 rounded-md text-xs font-mono"
          />
        </div>

        {/* Lifecycle Status Section */}
        {campaign.status === 'published' && phase !== 'ended' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
            <div className="max-w-md">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
                {t('settings.runTitle')}
              </h3>
              <p className="mt-1 text-xs text-neutral-500 dark:text-[#A3A3A3]">
                {t('settings.runHint')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {phase === 'paused' ? (
                <Button
                  size="sm"
                  className="gap-2 rounded-md h-8 text-xs shadow-xs"
                  onClick={() => resume.mutate(campaign.id, { onError: onActionError })}
                >
                  <Play className="size-3.5" />
                  {t('resume')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-md h-8 text-xs shadow-xs"
                  onClick={() => pause.mutate(campaign.id)}
                >
                  <Pause className="size-3.5" />
                  {t('settings.pause')}
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-md h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/30 dark:hover:bg-rose-950/20 shadow-xs"
                  >
                    <Square className="size-3.5" />
                    {t('settings.end')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-lg border border-neutral-200 dark:border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-sm font-semibold">
                      {t('settings.endConfirm')}
                    </AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="h-8 rounded-md text-xs">
                      {tCommon('cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="h-8 rounded-md bg-destructive text-destructive-foreground text-xs"
                      onClick={() => end.mutate(campaign.id)}
                    >
                      {t('settings.end')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* Danger Zone: Delete Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-rose-50/20 dark:bg-rose-950/10">
          <div className="max-w-md">
            <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400">
              {t('settings.deleteTitle')}
            </h3>
            <p className="mt-1 text-xs text-neutral-500 dark:text-[#A3A3A3]">
              {isRunning(phase) ? t('settings.deleteBlocked') : t('settings.deleteHint')}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 rounded-md h-8 text-xs shadow-xs"
                disabled={isRunning(phase)}
              >
                <Trash2 className="size-3.5" />
                {t('settings.delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-lg border border-neutral-200 dark:border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm font-semibold">
                  {t('settings.deleteConfirm', { name: campaign.name })}
                </AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-8 rounded-md text-xs">
                  {tCommon('cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="h-8 rounded-md bg-destructive text-destructive-foreground text-xs"
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
        </div>
      </div>
    </div>
  );
}
