'use client';

import { ApiError } from '@playora/api-client';
import { Alert, App, Button, Divider, Flex, Modal, QRCode, Typography, theme } from 'antd';
import {
  CircleX,
  ExternalLink,
  Gauge,
  Gift,
  Play,
  QrCode,
  Rocket,
  TicketCheck,
  TriangleAlert,
  Users,
  Wallet,
  Wand2,
} from 'lucide-react';
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
import { campaignRoutes } from '../../lib/routes';
import type { DraftPatch } from './use-campaign-draft';

export type EditorMode = 'quick' | 'customize' | 'rules';

export const labLinks = (orgId: string, campaignId: string) => {
  const routes = campaignRoutes(orgId);
  return {
    play: routes.play(campaignId),
    rehearsal: routes.rehearsal(campaignId),
    redeem: routes.redeem,
  };
};

/**
 * Publish = pre-flight (one-click fixes, errors block) → publish → share panel with QR, links and
 * live numbers (docs/product/specs/builder.md §4.5: "PRE-FLIGHT → PUBLISH").
 */
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
  /** The working draft: what will be published. */
  campaign: Campaign;
  onFix: (patch: DraftPatch) => void;
  /** Close and open the mode where an issue can be fixed by hand. */
  onGoTo: (mode: EditorMode) => void;
  /** Saves pending draft changes before publishing. */
  flush: () => Promise<boolean>;
}) {
  const t = useTranslations('builderLab.publish');
  const tErrors = useTranslations('errors');
  const { message } = App.useApp();
  const publish = usePublishCampaign(orgId, campaign.id);
  const [published, setPublished] = useState<Campaign | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [planLimited, setPlanLimited] = useState(false);
  const invalidateBilling = useInvalidateBilling();
  const issues = useMemo(() => preflight(campaign), [campaign]);
  const blocking = hasBlockingIssues(issues);
  const fixable = issues.filter((i) => i.fix);

  useEffect(() => {
    if (open) {
      setPublished(null);
      setPublishError(null);
      setPlanLimited(false);
    }
  }, [open]);

  const applyFix = (issue: PreflightIssue) => {
    if (issue.fix) onFix(issue.fix(campaign) as DraftPatch);
  };

  // Fixes touch different parts of the campaign; apply them one after another on a running copy.
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
    const saved = await flush();
    if (!saved) return;
    try {
      const result = await publish.mutateAsync();
      setPublished(result);
      void invalidateBilling();
      message.success(t('published', { version: result.version }));
    } catch (err) {
      const text =
        err instanceof ApiError && tErrors.has(err.code) ? tErrors(err.code) : t('failed');
      setPublishError(text);
      // The plan limit gets its own alert with a way to the plan page (BIL-02), not a toast.
      if (isPlanCampaignLimit(err)) setPlanLimited(true);
      else message.error(text);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={published ? 760 : 640}
      title={published ? t('doneTitle', { version: published.version }) : t('title')}
      destroyOnHidden
      footer={
        published ? (
          <Flex justify="end" gap={8}>
            <Button
              icon={<ExternalLink className="size-4" />}
              href={labLinks(orgId, campaign.id).play}
              target="_blank"
            >
              {t('openPlay')}
            </Button>
            <Link href={campaignRoutes(orgId).detail(campaign.id)}>
              <Button type="primary" icon={<Gauge className="size-4" />} tabIndex={-1}>
                {t('openOps')}
              </Button>
            </Link>
          </Flex>
        ) : (
          <Flex justify="end" gap={8}>
            <Button onClick={onClose}>{t('cancel')}</Button>
            <Button
              type="primary"
              icon={<Rocket className="size-4" />}
              disabled={blocking}
              loading={publish.isPending}
              onClick={doPublish}
            >
              {campaign.version > 0
                ? t('publishAgain', { version: campaign.version + 1 })
                : t('publish')}
            </Button>
          </Flex>
        )
      }
    >
      {published ? (
        <PublishSuccess orgId={orgId} campaign={published} />
      ) : (
        <Flex vertical gap={16}>
          {planLimited ? (
            <PlanCampaignLimitAlert orgId={orgId} />
          ) : (
            publishError && <Alert showIcon type="error" title={publishError} />
          )}
          <Alert
            showIcon
            type={blocking ? 'error' : issues.length ? 'warning' : 'success'}
            title={
              blocking
                ? t('summaryErrors', { count: issues.filter((i) => i.level === 'error').length })
                : issues.length
                  ? t('summaryWarnings', { count: issues.length })
                  : t('summaryReady')
            }
            description={issues.length ? t('summaryHint') : t('readyHint')}
            action={
              fixable.length > 1 ? (
                <Button icon={<Wand2 className="size-4" />} onClick={fixAll}>
                  {t('fixAll', { count: fixable.length })}
                </Button>
              ) : undefined
            }
          />
          {issues.length > 0 && (
            // antd List is deprecated in 6.6; plain rows with dividers instead.
            <Flex vertical>
              {issues.map((issue, i) => (
                <div key={issue.id}>
                  {i > 0 && <Divider className="!my-0" />}
                  <IssueRow
                    issue={issue}
                    onFix={() => applyFix(issue)}
                    onGoTo={() => onGoTo(issue.where.area === 'screens' ? 'customize' : 'rules')}
                  />
                </div>
              ))}
            </Flex>
          )}
        </Flex>
      )}
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
  const { token } = theme.useToken();
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
    <Flex
      data-testid="preflight-issue"
      align="center"
      justify="space-between"
      gap={12}
      className="py-3"
    >
      <Flex gap={10} align="start" className="min-w-0">
        <span
          className="mt-0.5 shrink-0"
          style={{ color: issue.level === 'error' ? token.colorError : token.colorWarning }}
        >
          <Icon className="size-4" aria-label={t(`levels.${issue.level}`)} />
        </span>
        <div className="min-w-0">
          <Typography.Text className="block">
            {t(`issues.${issue.code}`, issue.params ?? {})}
          </Typography.Text>
          <Caption>{location}</Caption>
        </div>
      </Flex>
      {issue.fix ? (
        <Button icon={<Wand2 className="size-4" />} onClick={onFix}>
          {t('fix')}
        </Button>
      ) : (
        <Button type="link" onClick={onGoTo}>
          {t('goTo')}
        </Button>
      )}
    </Flex>
  );
}

function PublishSuccess({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  return (
    <Flex vertical gap={20} data-testid="publish-success">
      <ShareLinks orgId={orgId} campaign={campaign} />
      <CampaignMetrics orgId={orgId} campaignId={campaign.id} />
    </Flex>
  );
}

/** Live numbers of a campaign; rehearsal plays are never counted. */
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
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
    >
      {metrics.map((m) => (
        <MetricCard key={m.label} {...m} loading={stats.isLoading} />
      ))}
    </div>
  );
}

/** QR and the three links of a published campaign: play, rehearsal, redeem desk. */
export function ShareLinks({ orgId, campaign }: { orgId: string; campaign: Campaign }) {
  const t = useTranslations('builderLab.publish');
  const { token } = theme.useToken();
  const links = labLinks(orgId, campaign.id);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  return (
    <Flex gap={20} wrap align="start">
      <div
        className="shrink-0"
        style={{
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
        }}
      >
        <QRCode value={`${origin}${links.play}`} size={168} bordered={false} />
      </div>
      <Flex vertical gap={14} className="min-w-0 flex-1">
        <LinkRow
          icon={<QrCode className="size-4" />}
          label={t('liveLink')}
          hint={t('liveHint')}
          href={links.play}
          copy={`${origin}${links.play}`}
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
      </Flex>
    </Flex>
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
  return (
    <div className="min-w-0">
      <Flex align="center" gap={6}>
        {icon}
        <Typography.Text strong>{label}</Typography.Text>
      </Flex>
      <Typography.Link
        href={href}
        target="_blank"
        copyable={{ text: copy }}
        ellipsis
        className="block"
      >
        {copy}
      </Typography.Link>
      <Caption>{hint}</Caption>
    </div>
  );
}
