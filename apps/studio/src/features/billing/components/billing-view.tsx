'use client';

import { useRouteQuery } from '@playora/api-client/react';
import { type BillingInvoice, type BillingPlan, meApi, type OrgBilling } from '@playora/contracts';
import { planLimits } from '@playora/core/billing';
import { Alert, AlertTitle } from '@playora/ui/components/alert';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
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
import { Check, Copy, Gem, Info } from '@playora/ui/icons';
import { cn } from '@playora/ui/lib/utils';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Caption } from '@/components/caption';
import { IconTile } from '@/components/icon-tile';
import { PageHeader } from '@/components/page-header';
import { QueryError } from '@/components/query-error';
import { api } from '@/lib/api';
import { useOrgBilling } from '../api';
import { MANUAL_PAYMENT, PLAN_ORDER, PLAN_PRICES } from '../lib/plans';
import { type UsageLevel, usageLevel, usagePercent } from '../lib/usage';
import { PlanCampaignLimitAlert } from './plan-limit';
import { RedemptionUsageAlert } from './usage-banner';

const DAY = { day: '2-digit', month: '2-digit', year: 'numeric' } as const;

/** Plan & usage page (BIL-01/02): current plan, usage bars, upgrade + manual payment, invoices. */
export function BillingView({ orgId }: { orgId: string }) {
  const t = useTranslations('billing');
  const query = useOrgBilling(orgId);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        tags={query.data && <Badge variant="secondary">{t(`plans.${query.data.plan}`)}</Badge>}
      />
      {query.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        </div>
      ) : query.isError ? (
        <QueryError onRetry={() => query.refetch()} />
      ) : (
        <BillingContent orgId={orgId} billing={query.data} />
      )}
    </div>
  );
}

function BillingContent({ orgId, billing }: { orgId: string; billing: OrgBilling }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const { subscription, plan } = billing;
  const lapsed = subscription && subscription.plan !== 'free' && plan === 'free';
  const campaignsLevel = usageLevel(
    billing.usage.runningCampaigns,
    billing.limits.maxRunningCampaigns,
  );

  return (
    <div className="space-y-5">
      {lapsed && (
        <Alert>
          <Info className="size-4" />
          <AlertTitle>
            {subscription.currentPeriodEnd
              ? t('lapsed', {
                  plan: t(`plans.${subscription.plan}`),
                  date: format.dateTime(new Date(subscription.currentPeriodEnd), DAY),
                })
              : t('lapsedNoDate', { plan: t(`plans.${subscription.plan}`) })}
          </AlertTitle>
        </Alert>
      )}
      <RedemptionUsageAlert orgId={orgId} billing={billing} />
      {campaignsLevel === 'limit' && <PlanCampaignLimitAlert orgId={orgId} />}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <CurrentPlanCard billing={billing} />
        <UsageCard billing={billing} />
      </div>
      <UpgradeCard orgId={orgId} current={plan} />
      <InvoicesCard invoices={billing.invoices} />
    </div>
  );
}

function CurrentPlanCard({ billing }: { billing: OrgBilling }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const { plan, limits, subscription } = billing;
  const periodEnd =
    subscription?.status === 'active' && subscription.plan === plan
      ? subscription.currentPeriodEnd
      : null;

  return (
    <Card className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
      <CardHeader className="border-b border-neutral-200 px-4 py-3 dark:border-white/10">
        <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
          {t('currentPlan')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <IconTile tone="primary">
            <Gem className="size-5" />
          </IconTile>
          <div>
            <h4
              className="m-0 text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]"
              data-testid="billing-plan"
            >
              {t(`plans.${plan}`)}
            </h4>
            <Caption className="text-[11px]">
              {plan === 'free'
                ? t('freeForever')
                : periodEnd
                  ? t('periodEnd', { date: format.dateTime(new Date(periodEnd), DAY) })
                  : t('noPeriodEnd')}
            </Caption>
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50/50 p-3 dark:border-white/10 dark:bg-white/5">
          <Caption className="font-medium text-neutral-700 dark:text-[#D4D4D4]">
            {t('limitsTitle')}
          </Caption>
          <div className="divide-y divide-neutral-200 text-xs dark:divide-white/10">
            <div className="flex justify-between py-1.5">
              <span className="text-neutral-500 dark:text-[#A3A3A3]">{t('limitRunning')}</span>
              <span className="font-medium text-neutral-900 dark:text-[#FAFAFA]">
                {limits.maxRunningCampaigns ?? t('unlimited')}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-neutral-500 dark:text-[#A3A3A3]">{t('limitRedemptions')}</span>
              <span className="font-medium text-neutral-900 dark:text-[#FAFAFA]">
                {format.number(limits.redemptionsPerMonth)}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-neutral-500 dark:text-[#A3A3A3]">{t('limitWatermark')}</span>
              <span className="font-medium text-neutral-900 dark:text-[#FAFAFA]">
                {limits.watermark ? t('yes') : t('no')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UsageCard({ billing }: { billing: OrgBilling }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const { usage, limits } = billing;

  return (
    <Card className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
      <CardHeader className="border-b border-neutral-200 px-4 py-3 dark:border-white/10">
        <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
          {t('usageTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-4">
        <UsageBar
          testId="usage-campaigns"
          label={t('runningCampaigns')}
          used={usage.runningCampaigns}
          limit={limits.maxRunningCampaigns}
          level={usageLevel(usage.runningCampaigns, limits.maxRunningCampaigns)}
        />
        <UsageBar
          testId="usage-redemptions"
          label={t('redemptions')}
          used={usage.redemptionsThisMonth}
          limit={limits.redemptionsPerMonth}
          level={usageLevel(
            usage.redemptionsThisMonth,
            limits.redemptionsPerMonth,
            limits.redemptionsHardLimit,
          )}
        />
        <div className="flex flex-col gap-1 pt-1">
          <Caption className="text-[11px]">
            {t('usageSince', { date: format.dateTime(new Date(usage.monthStart), DAY) })}
          </Caption>
          <Caption className="text-[11px]">
            {t('graceNote', { hardLimit: format.number(limits.redemptionsHardLimit) })}
          </Caption>
        </div>
      </CardContent>
    </Card>
  );
}

function UsageBar({
  label,
  used,
  limit,
  level,
  testId,
}: {
  label: string;
  used: number;
  limit: number | null;
  level: UsageLevel;
  testId: string;
}) {
  const t = useTranslations('billing');
  const format = useFormatter();

  const progressClass =
    level === 'blocked' || level === 'limit'
      ? '[&>div]:bg-rose-500'
      : level === 'warning'
        ? '[&>div]:bg-amber-500'
        : '[&>div]:bg-teal-600 dark:[&>div]:bg-teal-500';

  return (
    <div data-testid={testId} data-level={level} className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-neutral-700 dark:text-[#D4D4D4]">{label}</span>
        <span className="font-semibold tabular-nums text-neutral-900 dark:text-[#FAFAFA]">
          {limit === null
            ? t('ofUnlimited', { used: format.number(used) })
            : t('ofLimit', { used: format.number(used), limit: format.number(limit) })}
        </span>
      </div>
      <Progress
        value={limit === null ? 0 : usagePercent(used, limit)}
        className={cn('h-1.5', progressClass)}
        aria-label={label}
      />
    </div>
  );
}

function UpgradeCard({ orgId, current }: { orgId: string; current: BillingPlan }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const myOrgs = useRouteQuery(api, meApi.orgs, {});
  const slug = myOrgs.data?.items.find((o) => o.id === orgId)?.slug ?? orgId;
  const [selected, setSelected] = useState<Exclude<BillingPlan, 'free'>>(
    current === 'free' ? 'shop' : current,
  );
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const vnd = (amount: number) => format.number(amount, { style: 'currency', currency: 'VND' });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép');
  };

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-[#FAFAFA]">
            {t('upgradeTitle')}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-[#A3A3A3]">{t('upgradeHint')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
          const limits = planLimits(plan);
          const price = PLAN_PRICES[plan];
          const isSelected = plan !== 'free' && plan === selected;
          return (
            <div
              key={plan}
              className={cn(
                'flex flex-col gap-3 rounded-lg border bg-white p-5 shadow-xs transition-all dark:bg-[#0A0A0A]',
                isSelected
                  ? 'border-teal-600 ring-2 ring-teal-600/20 dark:border-teal-400'
                  : 'border-neutral-200 dark:border-white/10',
              )}
              data-testid={`plan-option-${plan}`}
            >
              <div className="flex items-center justify-between">
                <h5 className="m-0 text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
                  {t(`plans.${plan}`)}
                </h5>
                {plan === current && (
                  <Badge variant="default" className="text-[10px]">
                    {t('currentTag')}
                  </Badge>
                )}
              </div>
              <div>
                <span className="text-xl font-bold tabular-nums text-neutral-900 dark:text-[#FAFAFA]">
                  {vnd(price.monthly)}
                </span>
                <span className="ml-1 text-xs text-neutral-500 dark:text-[#A3A3A3]">
                  {t('perMonth')}
                </span>
                {price.yearly > 0 && (
                  <Caption className="block text-[11px]">
                    {t('perYear', { price: vnd(price.yearly) })}
                  </Caption>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 text-xs text-neutral-600 dark:text-[#A3A3A3] py-2">
                {[
                  limits.maxRunningCampaigns === null
                    ? t('featureCampaignsUnlimited')
                    : t('featureCampaigns', { count: limits.maxRunningCampaigns }),
                  t('featureRedemptions', { count: format.number(limits.redemptionsPerMonth) }),
                  limits.watermark ? t('featureWatermark') : t('featureNoWatermark'),
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <Check className="size-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              {plan !== 'free' && (
                <Button
                  className="w-full rounded-md h-8 text-xs font-medium shadow-xs"
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => setSelected(plan)}
                >
                  {isSelected ? t('chosen') : t('choose')}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3.5 dark:border-white/10">
          <span className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
            {t('payTitle', { plan: t(`plans.${selected}`) })}
          </span>
          <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100/70 p-0.5 text-xs dark:border-white/10 dark:bg-white/5">
            <button
              type="button"
              className={cn(
                'rounded-md px-3 py-1 font-medium transition-all',
                cycle === 'monthly'
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#171717] dark:text-[#FAFAFA]'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:text-[#FAFAFA]',
              )}
              onClick={() => setCycle('monthly')}
            >
              {t('payMonthly')}
            </button>
            <button
              type="button"
              className={cn(
                'rounded-md px-3 py-1 font-medium transition-all',
                cycle === 'yearly'
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#171717] dark:text-[#FAFAFA]'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:text-[#FAFAFA]',
              )}
              onClick={() => setCycle('yearly')}
            >
              {t('payYearly')}
            </button>
          </div>
        </div>

        <div
          className="divide-y divide-neutral-200 px-5 text-xs dark:divide-white/10"
          data-testid="manual-payment"
        >
          <div className="flex justify-between py-3">
            <span className="text-neutral-500 dark:text-[#A3A3A3]">{t('payBank')}</span>
            <span className="font-medium text-neutral-900 dark:text-[#FAFAFA]">
              {MANUAL_PAYMENT.bankName}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-neutral-500 dark:text-[#A3A3A3]">{t('payAccount')}</span>
            <div className="flex items-center gap-1.5 font-mono font-semibold text-neutral-900 dark:text-[#FAFAFA]">
              <span>{MANUAL_PAYMENT.accountNumber}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-neutral-400 hover:text-neutral-700 dark:hover:text-[#FAFAFA]"
                onClick={() => copyToClipboard(MANUAL_PAYMENT.accountNumber)}
              >
                <Copy className="size-3" />
              </Button>
            </div>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-neutral-500 dark:text-[#A3A3A3]">{t('payHolder')}</span>
            <span className="font-medium text-neutral-900 dark:text-[#FAFAFA]">
              {MANUAL_PAYMENT.accountName}
            </span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-neutral-500 dark:text-[#A3A3A3]">{t('payAmount')}</span>
            <span className="font-semibold text-neutral-900 dark:text-[#FAFAFA] tabular-nums">
              {vnd(PLAN_PRICES[selected][cycle])}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-neutral-500 dark:text-[#A3A3A3]">{t('payNote')}</span>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-900 dark:bg-white/10 dark:text-[#FAFAFA]">
                {MANUAL_PAYMENT.transferNote(slug, selected)}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-neutral-400 hover:text-neutral-700 dark:hover:text-[#FAFAFA]"
                onClick={() => copyToClipboard(MANUAL_PAYMENT.transferNote(slug, selected))}
              >
                <Copy className="size-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-200 bg-neutral-50/50 dark:border-white/10 dark:bg-white/5">
          <Alert className="border-neutral-200 dark:border-white/10">
            <Info className="size-4" />
            <AlertTitle className="text-xs">
              {t('payActivation', { email: MANUAL_PAYMENT.contactEmail })}
            </AlertTitle>
          </Alert>
        </div>
      </div>
    </div>
  );
}

function InvoicesCard({ invoices }: { invoices: BillingInvoice[] }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const day = (iso: string) => format.dateTime(new Date(iso), DAY);

  return (
    <Card className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
      <CardHeader className="border-b border-neutral-200 px-4 py-3 dark:border-white/10">
        <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
          {t('invoicesTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('invoicePeriod')}</TableHead>
                <TableHead>{t('invoicePlan')}</TableHead>
                <TableHead className="text-right">{t('invoiceAmount')}</TableHead>
                <TableHead>{t('invoicePaidAt')}</TableHead>
                <TableHead>{t('invoiceReference')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-xs text-neutral-400 dark:text-[#737373]"
                  >
                    {t('invoicesEmpty')}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-xs">
                      {t('periodRange', {
                        start: day(inv.periodStart),
                        end: day(inv.periodEnd),
                      })}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{t(`plans.${inv.plan}`)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums">
                      {format.number(inv.amountVnd, { style: 'currency', currency: 'VND' })}
                    </TableCell>
                    <TableCell className="text-xs text-neutral-500 dark:text-[#A3A3A3]">
                      {day(inv.paidAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {inv.reference ?? <Caption>—</Caption>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
