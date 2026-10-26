'use client';

import { useRouteQuery } from '@playora/api-client/react';
import { type BillingInvoice, type BillingPlan, meApi, type OrgBilling } from '@playora/contracts';
import { planLimits } from '@playora/core/billing';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Flex,
  Progress,
  Segmented,
  Skeleton,
  Table,
  type TableColumnsType,
  Tag,
  Typography,
  theme,
} from 'antd';
import { Check, Gem } from 'lucide-react';
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
    <Flex vertical gap={20}>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        tags={query.data && <Tag color="processing">{t(`plans.${query.data.plan}`)}</Tag>}
      />
      {query.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : query.isError ? (
        <QueryError onRetry={() => query.refetch()} />
      ) : (
        <BillingContent orgId={orgId} billing={query.data} />
      )}
    </Flex>
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
    <>
      {lapsed && (
        <Alert
          showIcon
          type="info"
          title={
            subscription.currentPeriodEnd
              ? t('lapsed', {
                  plan: t(`plans.${subscription.plan}`),
                  date: format.dateTime(new Date(subscription.currentPeriodEnd), DAY),
                })
              : t('lapsedNoDate', { plan: t(`plans.${subscription.plan}`) })
          }
        />
      )}
      <RedemptionUsageAlert orgId={orgId} billing={billing} />
      {campaignsLevel === 'limit' && <PlanCampaignLimitAlert orgId={orgId} />}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <CurrentPlanCard billing={billing} />
        <UsageCard billing={billing} />
      </div>
      <UpgradeCard orgId={orgId} current={plan} />
      <InvoicesCard invoices={billing.invoices} />
    </>
  );
}

function useCardStyle() {
  const { token } = theme.useToken();
  return { border: `1px solid ${token.colorBorderSecondary}` };
}

function CurrentPlanCard({ billing }: { billing: OrgBilling }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const style = useCardStyle();
  const { plan, limits, subscription } = billing;
  const periodEnd =
    subscription?.status === 'active' && subscription.plan === plan
      ? subscription.currentPeriodEnd
      : null;

  return (
    <Card variant="borderless" title={t('currentPlan')} style={style}>
      <Flex vertical gap={16}>
        <Flex align="center" gap={12}>
          <IconTile tone="primary">
            <Gem className="size-5" />
          </IconTile>
          <div>
            <Typography.Title level={4} className="!m-0" data-testid="billing-plan">
              {t(`plans.${plan}`)}
            </Typography.Title>
            <Caption>
              {plan === 'free'
                ? t('freeForever')
                : periodEnd
                  ? t('periodEnd', { date: format.dateTime(new Date(periodEnd), DAY) })
                  : t('noPeriodEnd')}
            </Caption>
          </div>
        </Flex>
        <Descriptions
          column={1}
          size="small"
          bordered
          title={<Caption>{t('limitsTitle')}</Caption>}
          items={[
            {
              key: 'running',
              label: t('limitRunning'),
              children: limits.maxRunningCampaigns ?? t('unlimited'),
            },
            {
              key: 'redemptions',
              label: t('limitRedemptions'),
              children: format.number(limits.redemptionsPerMonth),
            },
            {
              key: 'watermark',
              label: t('limitWatermark'),
              children: limits.watermark ? t('yes') : t('no'),
            },
          ]}
        />
      </Flex>
    </Card>
  );
}

function UsageCard({ billing }: { billing: OrgBilling }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const style = useCardStyle();
  const { usage, limits } = billing;

  return (
    <Card variant="borderless" title={t('usageTitle')} style={style}>
      <Flex vertical gap={20}>
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
        <Flex vertical gap={4}>
          <Caption>
            {t('usageSince', { date: format.dateTime(new Date(usage.monthStart), DAY) })}
          </Caption>
          <Caption>
            {t('graceNote', { hardLimit: format.number(limits.redemptionsHardLimit) })}
          </Caption>
        </Flex>
      </Flex>
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
  const { token } = theme.useToken();
  const color =
    level === 'blocked' || level === 'limit'
      ? token.colorError
      : level === 'warning'
        ? token.colorWarning
        : token.colorPrimary;

  return (
    <div data-testid={testId} data-level={level}>
      <Flex justify="space-between" align="baseline" gap={8}>
        <Typography.Text>{label}</Typography.Text>
        <Typography.Text strong>
          {limit === null
            ? t('ofUnlimited', { used: format.number(used) })
            : t('ofLimit', { used: format.number(used), limit: format.number(limit) })}
        </Typography.Text>
      </Flex>
      <Progress
        percent={limit === null ? 0 : usagePercent(used, limit)}
        showInfo={false}
        strokeColor={color}
        aria-label={label}
      />
    </div>
  );
}

function UpgradeCard({ orgId, current }: { orgId: string; current: BillingPlan }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const style = useCardStyle();
  const { token } = theme.useToken();
  const myOrgs = useRouteQuery(api, meApi.orgs, {});
  const slug = myOrgs.data?.items.find((o) => o.id === orgId)?.slug ?? orgId;
  const [selected, setSelected] = useState<Exclude<BillingPlan, 'free'>>(
    current === 'free' ? 'shop' : current,
  );
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const vnd = (amount: number) => format.number(amount, { style: 'currency', currency: 'VND' });

  return (
    <Card
      variant="borderless"
      title={t('upgradeTitle')}
      extra={<Caption>{t('upgradeHint')}</Caption>}
      style={style}
    >
      <Flex vertical gap={20}>
        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((plan) => {
            const limits = planLimits(plan);
            const price = PLAN_PRICES[plan];
            const isSelected = plan !== 'free' && plan === selected;
            return (
              <Flex
                key={plan}
                vertical
                gap={12}
                className="rounded-xl p-4"
                data-testid={`plan-option-${plan}`}
                style={{
                  border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                }}
              >
                <Flex justify="space-between" align="center">
                  <Typography.Title level={5} className="!m-0">
                    {t(`plans.${plan}`)}
                  </Typography.Title>
                  {plan === current && <Tag color="success">{t('currentTag')}</Tag>}
                </Flex>
                <div>
                  <Typography.Text strong style={{ fontSize: 22 }}>
                    {vnd(price.monthly)}
                  </Typography.Text>
                  <Typography.Text type="secondary">{t('perMonth')}</Typography.Text>
                  {price.yearly > 0 && (
                    <Caption className="block">
                      {t('perYear', { price: vnd(price.yearly) })}
                    </Caption>
                  )}
                </div>
                <Flex vertical gap={6} className="flex-1">
                  {[
                    limits.maxRunningCampaigns === null
                      ? t('featureCampaignsUnlimited')
                      : t('featureCampaigns', { count: limits.maxRunningCampaigns }),
                    t('featureRedemptions', { count: format.number(limits.redemptionsPerMonth) }),
                    limits.watermark ? t('featureWatermark') : t('featureNoWatermark'),
                  ].map((feature) => (
                    <Flex key={feature} gap={8} align="center">
                      <Check className="size-4 shrink-0" style={{ color: token.colorSuccess }} />
                      <Typography.Text>{feature}</Typography.Text>
                    </Flex>
                  ))}
                </Flex>
                {plan !== 'free' && (
                  <Button
                    block
                    type={isSelected ? 'primary' : 'default'}
                    onClick={() => setSelected(plan)}
                  >
                    {isSelected ? t('chosen') : t('choose')}
                  </Button>
                )}
              </Flex>
            );
          })}
        </div>

        <Flex vertical gap={12}>
          <Flex justify="space-between" align="center" gap={12} wrap>
            <Typography.Text strong>
              {t('payTitle', { plan: t(`plans.${selected}`) })}
            </Typography.Text>
            <Segmented
              value={cycle}
              onChange={(value) => setCycle(value as 'monthly' | 'yearly')}
              options={[
                { value: 'monthly', label: t('payMonthly') },
                { value: 'yearly', label: t('payYearly') },
              ]}
            />
          </Flex>
          <Descriptions
            column={1}
            size="small"
            bordered
            data-testid="manual-payment"
            items={[
              { key: 'bank', label: t('payBank'), children: MANUAL_PAYMENT.bankName },
              {
                key: 'account',
                label: t('payAccount'),
                children: (
                  <Typography.Text copyable strong>
                    {MANUAL_PAYMENT.accountNumber}
                  </Typography.Text>
                ),
              },
              { key: 'holder', label: t('payHolder'), children: MANUAL_PAYMENT.accountName },
              {
                key: 'amount',
                label: t('payAmount'),
                children: (
                  <Typography.Text strong>{vnd(PLAN_PRICES[selected][cycle])}</Typography.Text>
                ),
              },
              {
                key: 'note',
                label: t('payNote'),
                children: (
                  <Typography.Text copyable code>
                    {MANUAL_PAYMENT.transferNote(slug, selected)}
                  </Typography.Text>
                ),
              },
            ]}
          />
          <Alert
            showIcon
            type="info"
            title={t('payActivation', { email: MANUAL_PAYMENT.contactEmail })}
          />
        </Flex>
      </Flex>
    </Card>
  );
}

function InvoicesCard({ invoices }: { invoices: BillingInvoice[] }) {
  const t = useTranslations('billing');
  const format = useFormatter();
  const style = useCardStyle();
  const day = (iso: string) => format.dateTime(new Date(iso), DAY);

  const columns: TableColumnsType<BillingInvoice> = [
    {
      key: 'period',
      title: t('invoicePeriod'),
      render: (_, row) =>
        t('periodRange', { start: day(row.periodStart), end: day(row.periodEnd) }),
    },
    { key: 'plan', title: t('invoicePlan'), render: (_, row) => t(`plans.${row.plan}`) },
    {
      key: 'amount',
      title: t('invoiceAmount'),
      align: 'right',
      render: (_, row) => format.number(row.amountVnd, { style: 'currency', currency: 'VND' }),
    },
    { key: 'paidAt', title: t('invoicePaidAt'), render: (_, row) => day(row.paidAt) },
    {
      key: 'reference',
      title: t('invoiceReference'),
      render: (_, row) => row.reference ?? <Caption>—</Caption>,
    },
  ];

  return (
    <Card
      variant="borderless"
      title={t('invoicesTitle')}
      style={style}
      styles={{ body: { padding: 0 } }}
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={invoices}
        pagination={false}
        scroll={{ x: 640 }}
        locale={{
          emptyText: (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('invoicesEmpty')} />
          ),
        }}
      />
    </Card>
  );
}
