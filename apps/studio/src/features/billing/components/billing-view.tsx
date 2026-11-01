'use client';

import { useRouteQuery } from '@playora/api-client/react';
import { type BillingInvoice, type BillingPlan, meApi, type OrgBilling } from '@playora/contracts';
import { planLimits } from '@playora/core/billing';
import {
  Alert,
  Button,
  Card,
  Chip,
  ProgressBar,
  Skeleton,
  Tabs,
  toast,
} from '@playora/ui/components';
import { Check, Copy, Gem } from '@playora/ui/icons';
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
            <Chip variant="soft" color="default" size="sm">
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
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              {subscription.currentPeriodEnd
                ? t('lapsed', {
                    plan: t(`plans.${subscription.plan}`),
                    date: format.dateTime(new Date(subscription.currentPeriodEnd), DAY),
                  })
                : t('lapsedNoDate', { plan: t(`plans.${subscription.plan}`) })}
            </Alert.Description>
          </Alert.Content>
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
    <Card className="overflow-hidden border border-border-button-default bg-background-primary-default p-0 shadow-card">
      <Card.Header className="border-b border-border-button-default px-5 py-3.5">
        <Card.Title className="text-body-2-semibold text-text-primary">
          {t('currentPlan')}
        </Card.Title>
      </Card.Header>
      <Card.Content className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <IconTile tone="primary">
            <Gem className="size-5" />
          </IconTile>
          <div>
            <h4 className="m-0 text-body-semibold text-text-primary" data-testid="billing-plan">
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

        <Card variant="secondary" className="space-y-2 border border-border-button-default p-3.5">
          <Caption className="font-medium text-text-primary">{t('limitsTitle')}</Caption>
          <div className="divide-y divide-border-button-default text-caption-1-regular">
            <div className="flex justify-between py-2">
              <span className="text-text-secondary">{t('limitRunning')}</span>
              <span className="text-caption-1-semibold text-text-primary">
                {limits.maxRunningCampaigns ?? t('unlimited')}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-secondary">{t('limitRedemptions')}</span>
              <span className="text-caption-1-semibold text-text-primary">
                {format.number(limits.redemptionsPerMonth)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-secondary">{t('limitWatermark')}</span>
              <span className="text-caption-1-semibold text-text-primary">
                {limits.watermark ? t('yes') : t('no')}
              </span>
            </div>
          </div>
        </Card>
      </Card.Content>
    </Card>
  );
}

function UsageCard({ billing }: { billing: OrgBilling }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const { usage, limits } = billing;

  return (
    <Card className="overflow-hidden border border-border-button-default bg-background-primary-default p-0 shadow-card">
      <Card.Header className="border-b border-border-button-default px-5 py-3.5">
        <Card.Title className="text-body-2-semibold text-text-primary">
          {t('usageTitle')}
        </Card.Title>
      </Card.Header>
      <Card.Content className="space-y-5 p-5">
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
          <Caption>
            {t('usageSince', { date: format.dateTime(new Date(usage.monthStart), DAY) })}
          </Caption>
          <Caption>
            {t('graceNote', { hardLimit: format.number(limits.redemptionsHardLimit) })}
          </Caption>
        </div>
      </Card.Content>
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

  const progressColor =
    level === 'blocked' || level === 'limit'
      ? 'danger'
      : level === 'warning'
        ? 'warning'
        : 'accent';

  return (
    <div data-testid={testId} data-level={level} className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-caption-1-medium text-text-secondary">{label}</span>
        <span className="text-caption-1-semibold tabular-nums text-text-primary">
          {limit === null
            ? t('ofUnlimited', { used: format.number(used) })
            : t('ofLimit', { used: format.number(used), limit: format.number(limit) })}
        </span>
      </div>
      <ProgressBar
        value={limit === null ? 0 : usagePercent(used, limit)}
        size="sm"
        color={progressColor}
        aria-label={label}
      >
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
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
          <h3 className="text-headline-semibold tracking-tight text-text-primary">
            {t('upgradeTitle')}
          </h3>
          <p className="text-body-2-regular text-text-secondary">{t('upgradeHint')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
          const limits = planLimits(plan);
          const price = PLAN_PRICES[plan];
          const isSelected = plan !== 'free' && plan === selected;
          return (
            <Card
              key={plan}
              className={cx(
                'flex flex-col gap-3 border bg-background-primary-default p-5 shadow-card transition-all',
                isSelected
                  ? 'border-accent-500 ring-2 ring-accent-500/20'
                  : 'border-border-button-default',
              )}
              data-testid={`plan-option-${plan}`}
            >
              <Card.Header className="flex-row items-center justify-between p-0">
                <Card.Title className="m-0 text-body-semibold text-text-primary">
                  {t(`plans.${plan}`)}
                </Card.Title>
                {plan === current && (
                  <Chip variant="primary" color="warning" size="sm">
                    {t('currentTag')}
                  </Chip>
                )}
              </Card.Header>
              <Card.Content className="flex flex-1 flex-col gap-3 p-0">
                <div>
                  <span className="text-title-2-semibold tabular-nums text-text-primary">
                    {vnd(price.monthly)}
                  </span>
                  <span className="ml-1 text-caption-1-regular text-text-secondary">
                    {t('perMonth')}
                  </span>
                  {price.yearly > 0 && (
                    <Caption className="block">
                      {t('perYear', { price: vnd(price.yearly) })}
                    </Caption>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 py-2 text-caption-1-regular text-text-secondary">
                  {[
                    limits.maxRunningCampaigns === null
                      ? t('featureCampaignsUnlimited')
                      : t('featureCampaigns', { count: limits.maxRunningCampaigns }),
                    t('featureRedemptions', { count: format.number(limits.redemptionsPerMonth) }),
                    limits.watermark ? t('featureWatermark') : t('featureNoWatermark'),
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Check className="size-3.5 shrink-0 text-accent-600 dark:text-accent-400" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </Card.Content>
              {plan !== 'free' && (
                <Card.Footer className="p-0">
                  <Button
                    className="w-full"
                    size="sm"
                    variant={isSelected ? 'primary' : 'secondary'}
                    onPress={() => setSelected(plan)}
                  >
                    {isSelected ? t('chosen') : t('choose')}
                  </Button>
                </Card.Footer>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden border border-border-button-default bg-background-primary-default p-0 shadow-card">
        <Card.Header className="flex-row flex-wrap items-center justify-between gap-3 border-b border-border-button-default px-5 py-3.5">
          <Card.Title className="text-body-2-semibold text-text-primary">
            {t('payTitle', { plan: t(`plans.${selected}`) })}
          </Card.Title>
          <Tabs
            selectedKey={cycle}
            onSelectionChange={(key) => setCycle(String(key) as 'monthly' | 'yearly')}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label={t('payTitle', { plan: t(`plans.${selected}`) })}>
                <Tabs.Tab id="monthly">
                  {t('payMonthly')}
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="yearly">
                  {t('payYearly')}
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </Card.Header>

        <Card.Content
          className="divide-y divide-border-button-default px-5 py-0 text-caption-1-regular"
          data-testid="manual-payment"
        >
          <div className="flex justify-between py-3">
            <span className="text-text-secondary">{t('payBank')}</span>
            <span className="text-caption-1-medium text-text-primary">
              {MANUAL_PAYMENT.bankName}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-text-secondary">{t('payAccount')}</span>
            <div className="flex items-center gap-1.5 font-mono text-caption-1-semibold text-text-primary">
              <span>{MANUAL_PAYMENT.accountNumber}</span>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label="Copy account number"
                onPress={() => copyToClipboard(MANUAL_PAYMENT.accountNumber)}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-text-secondary">{t('payHolder')}</span>
            <span className="text-caption-1-medium text-text-primary">
              {MANUAL_PAYMENT.accountName}
            </span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-text-secondary">{t('payAmount')}</span>
            <span className="text-caption-1-semibold tabular-nums text-text-primary">
              {vnd(PLAN_PRICES[selected][cycle])}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-text-secondary">{t('payNote')}</span>
            <div className="flex items-center gap-1.5 font-mono text-caption-1-regular">
              <code className="rounded bg-background-secondary-default px-1.5 py-0.5 text-text-primary">
                {MANUAL_PAYMENT.transferNote(slug, selected)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label="Copy transfer note"
                onPress={() => copyToClipboard(MANUAL_PAYMENT.transferNote(slug, selected))}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          </div>
        </Card.Content>

        <Card.Footer className="border-t border-border-button-default bg-background-secondary-default p-4">
          <Alert status="accent" className="w-full">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                {t('payActivation', { email: MANUAL_PAYMENT.contactEmail })}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </Card.Footer>
      </Card>
    </div>
  );
}

function InvoicesCard({ invoices }: { invoices: BillingInvoice[] }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const day = (iso: string) => format.dateTime(new Date(iso), DAY);

  return (
    <Card className="overflow-hidden border border-border-button-default bg-background-primary-default p-0 shadow-card">
      <Card.Header className="border-b border-border-button-default px-5 py-3.5">
        <Card.Title className="text-body-2-semibold text-text-primary">
          {t('invoicesTitle')}
        </Card.Title>
      </Card.Header>
      <Card.Content className="p-0">
        {invoices.length === 0 ? (
          <div className="flex h-24 items-center justify-center px-5 text-center text-body-2-regular text-text-secondary">
            {t('invoicesEmpty')}
          </div>
        ) : (
          <ul className="divide-y divide-border-button-default">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-background-secondary-default/40"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-body-2-semibold text-text-primary">
                      {t('periodRange', {
                        start: day(inv.periodStart),
                        end: day(inv.periodEnd),
                      })}
                    </span>
                    <Chip variant="soft" color="default" size="sm">
                      {t(`plans.${inv.plan}`)}
                    </Chip>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-caption-1-regular text-text-secondary">
                    <span>
                      {t('invoicePaidAt')}: {day(inv.paidAt)}
                    </span>
                    {inv.reference && (
                      <span className="font-mono text-text-tertiary">#{inv.reference}</span>
                    )}
                  </div>
                </div>
                <span className="text-body-semibold tabular-nums text-text-primary">
                  {format.number(inv.amountVnd, { style: 'currency', currency: 'VND' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
}
