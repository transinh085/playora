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
import { cn } from '@playora/ui/lib/utils';
import { Check, Copy, Gem, Info } from 'lucide-react';
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
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
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
    <Card className="rounded-2xl border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t('currentPlan')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <IconTile tone="primary">
            <Gem className="size-5" />
          </IconTile>
          <div>
            <h4 className="m-0 text-base font-semibold" data-testid="billing-plan">
              {t(`plans.${plan}`)}
            </h4>
            <Caption>
              {plan === 'free'
                ? t('freeForever')
                : periodEnd
                  ? t('periodEnd', { date: format.dateTime(new Date(periodEnd), DAY) })
                  : t('noPeriodEnd')}
            </Caption>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border p-3">
          <Caption className="font-medium">{t('limitsTitle')}</Caption>
          <div className="divide-y text-sm">
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">{t('limitRunning')}</span>
              <span className="font-medium">{limits.maxRunningCampaigns ?? t('unlimited')}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">{t('limitRedemptions')}</span>
              <span className="font-medium">{format.number(limits.redemptionsPerMonth)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">{t('limitWatermark')}</span>
              <span className="font-medium">{limits.watermark ? t('yes') : t('no')}</span>
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
    <Card className="rounded-2xl border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t('usageTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
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
        <div className="flex flex-col gap-1">
          <Caption>
            {t('usageSince', { date: format.dateTime(new Date(usage.monthStart), DAY) })}
          </Caption>
          <Caption>
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
      ? '[&>div]:bg-destructive'
      : level === 'warning'
        ? '[&>div]:bg-amber-500'
        : '[&>div]:bg-primary';

  return (
    <div data-testid={testId} data-level={level} className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className="font-semibold">
          {limit === null
            ? t('ofUnlimited', { used: format.number(used) })
            : t('ofLimit', { used: format.number(used), limit: format.number(limit) })}
        </span>
      </div>
      <Progress
        value={limit === null ? 0 : usagePercent(used, limit)}
        className={cn('h-2', progressClass)}
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
    <Card className="rounded-2xl border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">{t('upgradeTitle')}</CardTitle>
        <Caption>{t('upgradeHint')}</Caption>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((plan) => {
            const limits = planLimits(plan);
            const price = PLAN_PRICES[plan];
            const isSelected = plan !== 'free' && plan === selected;
            return (
              <div
                key={plan}
                className={cn(
                  'flex flex-col gap-3 rounded-2xl border p-4 transition-all',
                  isSelected ? 'border-primary ring-1 ring-primary' : 'border-border',
                )}
                data-testid={`plan-option-${plan}`}
              >
                <div className="flex items-center justify-between">
                  <h5 className="m-0 text-sm font-semibold">{t(`plans.${plan}`)}</h5>
                  {plan === current && <Badge variant="default">{t('currentTag')}</Badge>}
                </div>
                <div>
                  <span className="text-2xl font-bold">{vnd(price.monthly)}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{t('perMonth')}</span>
                  {price.yearly > 0 && (
                    <Caption className="block">
                      {t('perYear', { price: vnd(price.yearly) })}
                    </Caption>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 text-xs text-muted-foreground">
                  {[
                    limits.maxRunningCampaigns === null
                      ? t('featureCampaignsUnlimited')
                      : t('featureCampaigns', { count: limits.maxRunningCampaigns }),
                    t('featureRedemptions', { count: format.number(limits.redemptionsPerMonth) }),
                    limits.watermark ? t('featureWatermark') : t('featureNoWatermark'),
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Check className="size-3.5 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                {plan !== 'free' && (
                  <Button
                    className="w-full rounded-full"
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

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold">
              {t('payTitle', { plan: t(`plans.${selected}`) })}
            </span>
            <div className="inline-flex rounded-full border bg-muted/50 p-0.5 text-xs">
              <button
                type="button"
                className={cn(
                  'rounded-full px-3 py-1 font-medium transition-all',
                  cycle === 'monthly' ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
                onClick={() => setCycle('monthly')}
              >
                {t('payMonthly')}
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-full px-3 py-1 font-medium transition-all',
                  cycle === 'yearly' ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
                onClick={() => setCycle('yearly')}
              >
                {t('payYearly')}
              </button>
            </div>
          </div>

          <div
            className="divide-y rounded-2xl border bg-card p-4 text-sm"
            data-testid="manual-payment"
          >
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">{t('payBank')}</span>
              <span className="font-medium">{MANUAL_PAYMENT.bankName}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">{t('payAccount')}</span>
              <div className="flex items-center gap-1.5 font-mono font-semibold">
                <span>{MANUAL_PAYMENT.accountNumber}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-foreground"
                  onClick={() => copyToClipboard(MANUAL_PAYMENT.accountNumber)}
                >
                  <Copy className="size-3" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">{t('payHolder')}</span>
              <span className="font-medium">{MANUAL_PAYMENT.accountName}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">{t('payAmount')}</span>
              <span className="font-semibold">{vnd(PLAN_PRICES[selected][cycle])}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">{t('payNote')}</span>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <code className="rounded bg-muted px-1.5 py-0.5">
                  {MANUAL_PAYMENT.transferNote(slug, selected)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-foreground"
                  onClick={() => copyToClipboard(MANUAL_PAYMENT.transferNote(slug, selected))}
                >
                  <Copy className="size-3" />
                </Button>
              </div>
            </div>
          </div>

          <Alert>
            <Info className="size-4" />
            <AlertTitle>{t('payActivation', { email: MANUAL_PAYMENT.contactEmail })}</AlertTitle>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}

function InvoicesCard({ invoices }: { invoices: BillingInvoice[] }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const day = (iso: string) => format.dateTime(new Date(iso), DAY);

  return (
    <Card className="rounded-2xl border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t('invoicesTitle')}</CardTitle>
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
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t('invoicesEmpty')}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      {t('periodRange', {
                        start: day(inv.periodStart),
                        end: day(inv.periodEnd),
                      })}
                    </TableCell>
                    <TableCell>{t(`plans.${inv.plan}`)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {format.number(inv.amountVnd, { style: 'currency', currency: 'VND' })}
                    </TableCell>
                    <TableCell>{day(inv.paidAt)}</TableCell>
                    <TableCell>{inv.reference ?? <Caption>—</Caption>}</TableCell>
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
