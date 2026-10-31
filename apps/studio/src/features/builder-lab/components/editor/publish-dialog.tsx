'use client';

import { ApiError } from '@playora/api-client';
import { Button } from '@playora/ui/components/base/buttons/button';
import { Checkbox } from '@playora/ui/components/base/checkbox/checkbox';
import { Divider } from '@playora/ui/components/base/divider/divider';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@playora/ui/components/base/modal/modal';
import { Popover, PopoverTrigger } from '@playora/ui/components/base/popover/popover';
import { Radio, RadioGroup } from '@playora/ui/components/base/radio/radio';
import { toast } from '@playora/ui/components/base/toast/toast';
import { QRCodeSvg } from '@playora/ui/components/foundations/qr-code/qr-code';
import {
  CircleX,
  Copy,
  ExternalLink,
  Gauge,
  Gift,
  Info,
  Play,
  QrCode,
  Rocket,
  Share2,
  TicketCheck,
  TriangleAlert,
  Users,
  Wallet,
  Wand2,
} from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Caption } from '@/components/caption';
import { MetricCard } from '@/components/metric-card';
import { useInvalidateBilling } from '@/features/billing/api';
import {
  isPlanCampaignLimit,
  PlanCampaignLimitAlert,
} from '@/features/billing/components/plan-limit';
import { type Campaign, useCampaignStats, usePublishCampaign } from '../../api';
import { hasBlockingIssues, type PreflightIssue, preflight } from '../../lib/preflight';
import { canPublishCampaign } from '../../lib/publish-compliance';
import { campaignRoutes } from '../../lib/routes';
import type { DraftPatch } from './use-campaign-draft';

export type EditorMode = 'quick' | 'customize' | 'rules';

export const labLinks = (orgId: string, campaignId: string, slug?: string) => {
  const routes = campaignRoutes(orgId);
  return {
    play: routes.play(slug ?? campaignId),
    rehearsal: routes.rehearsal(campaignId),
    redeem: routes.redeem,
  };
};

export function PublishDialog({
  open,
  onClose,
  orgId,
  campaign,
  onFix,
  onGoTo,
  flush,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
  campaign: Campaign;
  onFix: (patch: DraftPatch) => void;
  onGoTo: (mode: EditorMode) => void;
  flush: () => Promise<boolean>;
}) {
  const t = useTranslations('builderLab.publish');
  const tErrors = useTranslations('errors');
  const publish = usePublishCampaign(orgId, campaign.id);
  const [published, setPublished] = useState<Campaign | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [planLimited, setPlanLimited] = useState(false);
  const invalidateBilling = useInvalidateBilling();
  const issues = useMemo(() => preflight(campaign), [campaign]);
  const blocking = hasBlockingIssues(issues);
  const fixable = issues.filter((i) => i.fix);

  const alreadyAcknowledged = Boolean(campaign.compliance?.checklistAcknowledgedAt);
  const [ackOrganizer, setAckOrganizer] = useState(alreadyAcknowledged);
  const [ackDepartment, setAckDepartment] = useState(alreadyAcknowledged);
  const [ackTerms, setAckTerms] = useState(alreadyAcknowledged);

  useEffect(() => {
    if (open) {
      setPublished(null);
      setPublishError(null);
      setPlanLimited(false);
      const acked = Boolean(campaign.compliance?.checklistAcknowledgedAt);
      setAckOrganizer(acked);
      setAckDepartment(acked);
      setAckTerms(acked);
    }
  }, [open, campaign.compliance?.checklistAcknowledgedAt]);

  const canPublish = canPublishCampaign({
    blocking,
    checklist: {
      promotionType: campaign.compliance?.promotionType ?? null,
      ackOrganizer,
      ackDepartment,
      ackTerms,
    },
  });

  const applyFix = (issue: PreflightIssue) => {
    if (issue.fix) onFix(issue.fix(campaign) as DraftPatch);
  };

  const fixAll = () => {
    let current = campaign;
    let patch: DraftPatch = {};
    for (const issue of fixable) {
      const change = issue.fix?.(current) as DraftPatch;
      current = { ...current, ...change };
      patch = { ...patch, ...change };
    }
    onFix(patch);
  };

  const doPublish = async () => {
    setPublishError(null);
    setPlanLimited(false);
    const now = new Date().toISOString();
    onFix({
      compliance: {
        ...campaign.compliance,
        checklistAcknowledgedAt: campaign.compliance?.checklistAcknowledgedAt ?? now,
      },
    });
    const saved = await flush();
    if (!saved) return;
    try {
      const result = await publish.mutateAsync();
      setPublished(result);
      void invalidateBilling();
      toast.success(t('published', { version: result.version }));
    } catch (err) {
      const text =
        err instanceof ApiError && tErrors.has(err.code) ? tErrors(err.code) : t('failed');
      setPublishError(text);
      if (isPlanCampaignLimit(err)) setPlanLimited(true);
      else toast.error(text);
    }
  };

  return (
    <Modal
      isOpen={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      size={published ? 'xl' : 'lg'}
    >
      <ModalHeader
        title={published ? t('doneTitle', { version: published.version }) : t('title')}
      />
      <ModalBody>
        {published ? (
          <PublishSuccess orgId={orgId} campaign={published} />
        ) : (
          <div className="flex flex-col gap-4 py-1">
            {planLimited ? (
              <PlanCampaignLimitAlert orgId={orgId} />
            ) : (
              publishError && (
                <div
                  role="alert"
                  className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-xs font-semibold text-destructive"
                >
                  {publishError}
                </div>
              )
            )}

            <div
              role="alert"
              className={cx(
                'rounded-2xl border p-4',
                blocking
                  ? 'border-destructive/40 bg-destructive/10 text-destructive'
                  : issues.length
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200',
              )}
            >
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {blocking
                      ? t('summaryErrors', {
                          count: issues.filter((i) => i.level === 'error').length,
                        })
                      : issues.length
                        ? t('summaryWarnings', { count: issues.length })
                        : t('summaryReady')}
                  </div>
                  <div className="text-xs opacity-90">
                    {issues.length ? t('summaryHint') : t('readyHint')}
                  </div>
                </div>
                {fixable.length > 1 && (
                  <Button
                    variant="secondary"
                    size="small"
                    className="gap-1.5 shrink-0 text-xs"
                    onClick={fixAll}
                  >
                    <Wand2 className="size-3.5" />
                    {t('fixAll', { count: fixable.length })}
                  </Button>
                )}
              </div>
            </div>

            {issues.length > 0 && (
              <div className="divide-y rounded-xl border">
                {issues.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    onFix={() => applyFix(issue)}
                    onGoTo={() => onGoTo(issue.where.area === 'screens' ? 'customize' : 'rules')}
                  />
                ))}
              </div>
            )}

            <Divider className="my-1" />

            {/* Legal / Compliance Checklist */}
            {campaign.compliance?.promotionType === null && (
              <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                <span className="block text-xs font-semibold text-amber-900 dark:text-amber-200">
                  {t('promotionTypeQuestion')}
                </span>
                <Caption className="block text-amber-800/90 dark:text-amber-300/80">
                  {t('promotionTypeQuestionHint')}
                </Caption>
                <RadioGroup
                  aria-label={t('promotionTypeQuestion')}
                  value={campaign.compliance?.promotionType ?? ''}
                  onChange={(val) =>
                    onFix({
                      compliance: {
                        ...campaign.compliance,
                        promotionType: val as 'purchase_linked' | 'not_linked',
                      },
                    })
                  }
                  className="flex flex-wrap gap-3 pt-1"
                >
                  <Radio value="purchase_linked">{t('purchaseLinkedOption')}</Radio>
                  <Radio value="not_linked">{t('notLinkedOption')}</Radio>
                </RadioGroup>
              </div>
            )}

            <div className="space-y-3 rounded-xl border bg-muted/30 p-3.5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('checklistTitle')}
              </span>

              <Checkbox
                isSelected={ackOrganizer}
                onChange={setAckOrganizer}
                className="items-start text-xs"
              >
                {t('ackOrganizer')}
              </Checkbox>

              {campaign.compliance?.promotionType === 'purchase_linked' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Checkbox
                    isSelected={ackDepartment}
                    onChange={setAckDepartment}
                    className="items-start text-xs"
                  >
                    {t('ackDepartment')}
                  </Checkbox>
                  <PopoverTrigger>
                    <button
                      type="button"
                      className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                    >
                      <Info className="size-3" />
                      <span>{t('legalHelpLink')}</span>
                    </button>
                    <Popover aria-label={t('legalHelpTitle')} className="w-80 p-3 text-xs">
                      <span className="font-semibold">{t('legalHelpTitle')}</span>
                      <p className="mt-1 text-muted-foreground">{t('legalHelpContent')}</p>
                    </Popover>
                  </PopoverTrigger>
                </div>
              )}

              <Checkbox
                isSelected={ackTerms}
                onChange={setAckTerms}
                className="items-start text-xs"
              >
                {t('ackTerms')}
              </Checkbox>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {published ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Link href={campaignRoutes(orgId).share(campaign.id)}>
              <Button variant="secondary" size="small" className="gap-2">
                <Share2 className="size-4" />
                {t('openShare')}
              </Button>
            </Link>
            <a
              href={labLinks(orgId, published.id, published.slug).play}
              target="_blank"
              rel="noreferrer"
              data-testid="publish-open-play"
            >
              <Button variant="secondary" size="small" className="gap-2">
                <ExternalLink className="size-4" />
                {t('openPlay')}
              </Button>
            </a>
            <Link href={campaignRoutes(orgId).detail(campaign.id)}>
              <Button size="small" className="gap-2">
                <Gauge className="size-4" />
                {t('openOps')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="small"
              className="h-8 rounded-md text-xs"
              onClick={onClose}
            >
              {t('cancel')}
            </Button>
            <Button
              size="small"
              className="h-8 gap-1.5 rounded-md text-xs font-medium shadow-xs"
              disabled={!canPublish || publish.isPending}
              onClick={doPublish}
            >
              <Rocket className="size-3.5" />
              {campaign.version > 0
                ? t('publishAgain', { version: campaign.version + 1 })
                : t('publish')}
            </Button>
          </div>
        )}
      </ModalFooter>
    </Modal>
  );
}

function IssueRow({
  issue,
  onFix,
  onGoTo,
}: {
  issue: PreflightIssue;
  onFix: () => void;
  onGoTo: () => void;
}) {
  const t = useTranslations('builderLab.publish');
  const tScreen = useTranslations('builderLab.editor.screens');
  const Icon = issue.level === 'error' ? CircleX : TriangleAlert;
  const { where } = issue;
  const location = [
    t(`areas.${where.area}`),
    where.screen ? tScreen(where.screen) : null,
    where.elementName ?? null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      data-testid="preflight-issue"
      className="flex items-center justify-between gap-3 p-3 text-xs"
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <Icon
          className={cx(
            'size-4 shrink-0 mt-0.5',
            issue.level === 'error' ? 'text-destructive' : 'text-amber-500',
          )}
          aria-label={t(`levels.${issue.level}`)}
        />
        <div className="min-w-0">
          <span className="block font-medium">{t(`issues.${issue.code}`, issue.params ?? {})}</span>
          <Caption>{location}</Caption>
        </div>
      </div>
      {issue.fix ? (
        <Button
          variant="secondary"
          size="xs"
          className="h-7 gap-1.5 text-xs shrink-0"
          onClick={onFix}
        >
          <Wand2 className="size-3" />
          {t('fix')}
        </Button>
      ) : (
        <Button variant="ghost" size="xs" className="h-7 text-xs shrink-0" onClick={onGoTo}>
          {t('goTo')}
        </Button>
      )}
    </div>
  );
}

function PublishSuccess({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('builderLab.publish');
  return (
    <div className="flex flex-col gap-5 py-2" data-testid="publish-success">
      <div className="flex items-center justify-between">
        <Caption>{t('liveHint')}</Caption>
        <Link href={campaignRoutes(orgId).share(campaign.id)}>
          <Button variant="secondary" size="small" className="gap-2">
            <Share2 className="size-4" />
            {t('openShare')}
          </Button>
        </Link>
      </div>
      <ShareLinks orgId={orgId} campaign={campaign} />
      <CampaignMetrics orgId={orgId} campaignId={campaign.id} />
    </div>
  );
}

export function CampaignMetrics({ orgId, campaignId }: { orgId: string; campaignId: string }) {
  const t = useTranslations('builderLab.publish');
  const format = useFormatter();
  const stats = useCampaignStats(orgId, campaignId);
  const s = stats.data;

  const metrics = [
    {
      label: t('stats.plays'),
      value: s?.plays ?? 0,
      icon: <Play className="size-5" />,
      tone: 'primary',
    },
    {
      label: t('stats.players'),
      value: s?.players ?? 0,
      icon: <Users className="size-5" />,
      tone: 'info',
    },
    {
      label: t('stats.wins'),
      value: s?.wins ?? 0,
      icon: <Gift className="size-5" />,
      tone: 'success',
    },
    {
      label: t('stats.redeemed'),
      value: s?.redeemed ?? 0,
      icon: <TicketCheck className="size-5" />,
      tone: 'warning',
    },
    {
      label: t('stats.budget'),
      value: format.number(s?.budgetUsedVnd ?? 0, { style: 'currency', currency: 'VND' }),
      icon: <Wallet className="size-5" />,
      tone: 'error',
    },
  ] as const;

  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
      {metrics.map((m) => (
        <MetricCard key={m.label} {...m} loading={stats.isLoading} />
      ))}
    </div>
  );
}

export function ShareLinks({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('builderLab.publish');
  const links = labLinks(orgId, campaign.id, campaign.slug);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  return (
    <div className="flex flex-wrap items-start gap-5">
      <div className="flex shrink-0 items-center justify-center rounded-2xl border bg-white p-3 shadow-xs">
        <QRCodeSvg value={links.play} size={168} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <LinkRow
          icon={<QrCode className="size-4" />}
          label={t('liveLink')}
          hint={t('liveHint')}
          href={links.play}
          copy={links.play}
        />
        <LinkRow
          icon={<Play className="size-4" />}
          label={t('rehearsalLink')}
          hint={t('rehearsalHint')}
          href={links.rehearsal}
          copy={`${origin}${links.rehearsal}`}
        />
        <LinkRow
          icon={<TicketCheck className="size-4" />}
          label={t('redeemLink')}
          hint={t('redeemHint')}
          href={links.redeem}
          copy={`${origin}${links.redeem}`}
        />
      </div>
    </div>
  );
}

function LinkRow({
  icon,
  label,
  hint,
  href,
  copy,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  href: string;
  copy: string;
}) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(copy);
    toast.success('Đã sao chép');
  };

  return (
    <div className="min-w-0 space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="truncate font-mono text-xs text-primary hover:underline"
        >
          {copy}
        </a>
        <Button
          variant="ghost"
          size="xs"
          className="size-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={copyToClipboard}
        >
          <Copy className="size-3" />
        </Button>
      </div>
      <Caption>{hint}</Caption>
    </div>
  );
}
