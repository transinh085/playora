'use client';

import { useRouteQuery } from '@playora/api-client/react';
import { type BillingInvoice, type BillingPlan, meApi, type OrgBilling } from '@playora/contracts';
import { planLimits } from '@playora/core/billing';
import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { ProgressBar } from '@playora/ui/components/base/progress/progress';
import { Skeleton } from '@playora/ui/components/base/skeleton/skeleton';
import { toast } from '@playora/ui/components/base/toast/toast';
import { Check, Copy, Gem, Info } from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
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
        tags={
          query.data && (
            <Chip variant="subtle" color="neutral">
              {t(`plans.${query.data.plan}`)}
            </Chip>
          )
        }
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
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default p-4 text-text-primary"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-text-secondary" />
          <p className="text-sm font-medium">
            {subscription.currentPeriodEnd
              ? t('lapsed', {
                  plan: t(`plans.${subscription.plan}`),
                  date: format.dateTime(new Date(subscription.currentPeriodEnd), DAY),
                })
              : t('lapsedNoDate', { plan: t(`plans.${subscription.plan}`) })}
          </p>
        </div>
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
    <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
      <div className="border-b border-border-button-default px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">{t('currentPlan')}</h3>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <IconTile tone="primary">
            <Gem className="size-5" />
          </IconTile>
          <div>
            <h4 className="m-0 text-sm font-semibold text-text-primary" data-testid="billing-plan">
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

        <div className="space-y-2 rounded-2xl border border-border-button-default bg-background-secondary-default p-3">
          <Caption className="font-medium text-text-primary">{t('limitsTitle')}</Caption>
          <div className="divide-y divide-border-button-default text-xs">
            <div className="flex justify-between py-1.5">
              <span className="text-text-secondary">{t('limitRunning')}</span>
              <span className="font-medium text-text-primary">
                {limits.maxRunningCampaigns ?? t('unlimited')}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-text-secondary">{t('limitRedemptions')}</span>
              <span className="font-medium text-text-primary">
                {format.number(limits.redemptionsPerMonth)}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-text-secondary">{t('limitWatermark')}</span>
              <span className="font-medium text-text-primary">
                {limits.watermark ? t('yes') : t('no')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageCard({ billing }: { billing: OrgBilling }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const { usage, limits } = billing;

  return (
    <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
      <div className="border-b border-border-button-default px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">{t('usageTitle')}</h3>
      </div>
      <div className="space-y-5 p-4">
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
      </div>
    </div>
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
      ? '[&_div[class*="fill"]]:bg-rose-500'
      : level === 'warning'
        ? '[&_div[class*="fill"]]:bg-amber-500'
        : '';

  return (
    <div data-testid={testId} data-level={level} className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-text-secondary">{label}</span>
        <span className="font-semibold tabular-nums text-text-primary">
          {limit === null
            ? t('ofUnlimited', { used: format.number(used) })
            : t('ofLimit', { used: format.number(used), limit: format.number(limit) })}
        </span>
      </div>
      <ProgressBar
        value={limit === null ? 0 : usagePercent(used, limit)}
        size="sm"
        className={progressClass}
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
          <h3 className="text-base font-semibold tracking-tight text-text-primary">
            {t('upgradeTitle')}
          </h3>
          <p className="text-xs text-text-secondary">{t('upgradeHint')}</p>
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
              className={cx(
                'flex flex-col gap-3 rounded-3xl border bg-background-primary-default p-5 shadow-card transition-all',
                isSelected
                  ? 'border-teal-600 ring-2 ring-teal-600/20 dark:border-teal-400'
                  : 'border-border-button-default',
              )}
              data-testid={`plan-option-${plan}`}
            >
              <div className="flex items-center justify-between">
                <h5 className="m-0 text-sm font-semibold text-text-primary">
                  {t(`plans.${plan}`)}
                </h5>
                {plan === current && (
                  <Chip variant="bold" color="orange">
                    {t('currentTag')}
                  </Chip>
                )}
              </div>
              <div>
                <span className="text-xl font-bold tabular-nums text-text-primary">
                  {vnd(price.monthly)}
                </span>
                <span className="ml-1 text-xs text-text-secondary">{t('perMonth')}</span>
                {price.yearly > 0 && (
                  <Caption className="block text-[11px]">
                    {t('perYear', { price: vnd(price.yearly) })}
                  </Caption>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 py-2 text-xs text-text-secondary">
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
                  className="w-full"
                  size="small"
                  variant={isSelected ? 'primary' : 'secondary'}
                  onClick={() => setSelected(plan)}
                >
                  {isSelected ? t('chosen') : t('choose')}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-button-default px-5 py-3.5">
          <span className="text-sm font-semibold text-text-primary">
            {t('payTitle', { plan: t(`plans.${selected}`) })}
          </span>
          <div className="inline-flex rounded-xl border border-border-button-default bg-background-secondary-default p-0.5 text-xs">
            <button
              type="button"
              className={cx(
                'rounded-lg px-3 py-1 font-medium transition-all',
                cycle === 'monthly'
                  ? 'bg-background-primary-default text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary',
              )}
              onClick={() => setCycle('monthly')}
            >
              {t('payMonthly')}
            </button>
            <button
              type="button"
              className={cx(
                'rounded-lg px-3 py-1 font-medium transition-all',
                cycle === 'yearly'
                  ? 'bg-background-primary-default text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary',
              )}
              onClick={() => setCycle('yearly')}
            >
              {t('payYearly')}
            </button>
          </div>
        </div>

        <div
          className="divide-y divide-border-button-default px-5 text-xs"
          data-testid="manual-payment"
        >
          <div className="flex justify-between py-3">
            <span className="text-text-secondary">{t('payBank')}</span>
            <span className="font-medium text-text-primary">{MANUAL_PAYMENT.bankName}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-text-secondary">{t('payAccount')}</span>
            <div className="flex items-center gap-1.5 font-mono font-semibold text-text-primary">
              <span>{MANUAL_PAYMENT.accountNumber}</span>
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                leadingIcon={Copy}
                onClick={() => copyToClipboard(MANUAL_PAYMENT.accountNumber)}
              />
            </div>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-text-secondary">{t('payHolder')}</span>
            <span className="font-medium text-text-primary">{MANUAL_PAYMENT.accountName}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-text-secondary">{t('payAmount')}</span>
            <span className="font-semibold tabular-nums text-text-primary">
              {vnd(PLAN_PRICES[selected][cycle])}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-text-secondary">{t('payNote')}</span>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <code className="rounded bg-background-secondary-default px-1.5 py-0.5 text-text-primary">
                {MANUAL_PAYMENT.transferNote(slug, selected)}
              </code>
              <Button
                variant="ghost"
                size="xs"
                iconOnly
                leadingIcon={Copy}
                onClick={() => copyToClipboard(MANUAL_PAYMENT.transferNote(slug, selected))}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border-button-default bg-background-secondary-default p-4">
          <div className="flex items-start gap-2.5 rounded-2xl border border-border-button-default bg-background-primary-default p-3.5 text-text-primary">
            <Info className="mt-0.5 size-4 shrink-0 text-text-secondary" />
            <p className="text-xs font-medium">
              {t('payActivation', { email: MANUAL_PAYMENT.contactEmail })}
            </p>
          </div>
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
    <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
      <div className="border-b border-border-button-default px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">{t('invoicesTitle')}</h3>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="bui-table w-full">
          <thead>
            <tr>
              <th>{t('invoicePeriod')}</th>
              <th>{t('invoicePlan')}</th>
              <th className="text-right">{t('invoiceAmount')}</th>
              <th>{t('invoicePaidAt')}</th>
              <th>{t('invoiceReference')}</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-24 text-center text-xs text-text-secondary">
                  {t('invoicesEmpty')}
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="text-xs">
                    {t('periodRange', {
                      start: day(inv.periodStart),
                      end: day(inv.periodEnd),
                    })}
                  </td>
                  <td className="text-xs font-medium">{t(`plans.${inv.plan}`)}</td>
                  <td className="text-right text-xs font-semibold tabular-nums">
                    {format.number(inv.amountVnd, { style: 'currency', currency: 'VND' })}
                  </td>
                  <td className="text-xs text-text-secondary">{day(inv.paidAt)}</td>
                  <td className="text-xs">{inv.reference ?? <Caption>—</Caption>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
