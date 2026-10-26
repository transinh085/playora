'use client';

import { ApiError } from '@playora/api-client';
import {
  type AdminOrg,
  RecordInvoiceBody,
  type RecordInvoiceBody as RecordInvoiceInput,
  SetSubscriptionBody,
} from '@playora/contracts';
import { planLimits } from '@playora/core/billing';
import { applyApiError, useZodForm } from '@playora/ui/form';
import {
  App,
  Button,
  Empty,
  Flex,
  Form,
  type FormItemProps,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  type TableColumnsType,
  Tag,
  Typography,
} from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Caption } from '@/components/caption';
import { PageHeader } from '@/components/page-header';
import { QueryError } from '@/components/query-error';
import { TableCard } from '@/components/table-card';
import { useAdminOrgs, useRecordInvoice, useSetSubscription } from '../api';
import { addMonths, dayToIso, isoToDay } from '../lib/dates';
import { PLAN_ORDER, PLAN_PRICES } from '../lib/plans';

const DAY = { day: '2-digit', month: '2-digit', year: 'numeric' } as const;

/** Form.Item props for an ISO-datetime field edited as a Vietnamese calendar day. */
function dayField(edge: 'start' | 'end'): Pick<FormItemProps, 'getValueProps' | 'normalize'> {
  return {
    getValueProps: (value: string | null | undefined) => ({ value: isoToDay(value) }),
    normalize: (value: string) => dayToIso(value, edge),
  };
}

/** Back-office (ADM-01): search organizations, see plan and usage, change plan, record invoices. */
export function AdminView() {
  const t = useTranslations('admin');
  const tb = useTranslations('billing');
  const format = useFormatter();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminOrg | null>(null);
  const [invoicing, setInvoicing] = useState<AdminOrg | null>(null);
  const query = useAdminOrgs(search);

  const columns: TableColumnsType<AdminOrg> = [
    {
      key: 'org',
      title: t('org'),
      render: (_, org) => (
        <Flex vertical>
          <Typography.Text strong>{org.name}</Typography.Text>
          <Caption>{org.slug}</Caption>
        </Flex>
      ),
    },
    {
      key: 'owner',
      title: t('owner'),
      render: (_, org) => org.ownerEmail ?? <Caption>—</Caption>,
    },
    {
      key: 'plan',
      title: t('plan'),
      render: (_, org) => {
        const sub = org.subscription;
        const lapsed = sub && sub.plan !== 'free' && org.plan === 'free';
        return (
          <Flex vertical align="start" gap={2}>
            <Space size={4}>
              <Tag color={org.plan === 'free' ? 'default' : 'processing'}>
                {tb(`plans.${org.plan}`)}
              </Tag>
              {lapsed && <Tag color="warning">{t('expired')}</Tag>}
            </Space>
            {sub?.currentPeriodEnd && (
              <Caption>
                {t('until', { date: format.dateTime(new Date(sub.currentPeriodEnd), DAY) })}
              </Caption>
            )}
          </Flex>
        );
      },
    },
    {
      key: 'campaigns',
      title: t('campaigns'),
      render: (_, org) => {
        const limit = planLimits(org.plan).maxRunningCampaigns;
        return limit === null
          ? tb('ofUnlimited', { used: org.usage.runningCampaigns })
          : tb('ofLimit', { used: org.usage.runningCampaigns, limit });
      },
    },
    {
      key: 'redemptions',
      title: t('redemptions'),
      render: (_, org) =>
        tb('ofLimit', {
          used: format.number(org.usage.redemptionsThisMonth),
          limit: format.number(planLimits(org.plan).redemptionsPerMonth),
        }),
    },
    {
      key: 'note',
      title: t('note'),
      render: (_, org) =>
        org.note ? (
          <Typography.Text ellipsis={{ tooltip: org.note }} style={{ maxWidth: 220 }}>
            {org.note}
          </Typography.Text>
        ) : (
          <Caption>—</Caption>
        ),
    },
    {
      key: 'actions',
      align: 'right',
      render: (_, org) => (
        <Space>
          <Button onClick={() => setEditing(org)}>{t('setPlan')}</Button>
          <Button onClick={() => setInvoicing(org)}>{t('recordInvoice')}</Button>
        </Space>
      ),
    },
  ];

  return (
    <Flex vertical gap={20}>
      <PageHeader title={t('title')} description={t('subtitle')} />
      {query.isError ? (
        <QueryError onRetry={() => query.refetch()} />
      ) : (
        <TableCard
          toolbar={
            <Input.Search
              allowClear
              placeholder={t('search')}
              aria-label={t('search')}
              onSearch={(value) => setSearch(value.trim())}
              className="max-w-md"
            />
          }
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={query.data?.items ?? []}
            loading={query.isFetching}
            pagination={false}
            scroll={{ x: 960 }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty')} />,
            }}
          />
        </TableCard>
      )}
      {editing && <SetPlanModal org={editing} onClose={() => setEditing(null)} />}
      {invoicing && <RecordInvoiceModal org={invoicing} onClose={() => setInvoicing(null)} />}
    </Flex>
  );
}

function errorCode(error: unknown): string {
  return error instanceof ApiError ? error.code : '';
}

function useErrorMessage() {
  const tErrors = useTranslations('errors');
  const tCommon = useTranslations('common');
  return (code: string) =>
    tErrors.has(code as never) ? tErrors(code as never) : tCommon('unknownError');
}

function SetPlanModal({ org, onClose }: { org: AdminOrg; onClose: () => void }) {
  const t = useTranslations('admin');
  const tb = useTranslations('billing');
  const { message } = App.useApp();
  const messageFor = useErrorMessage();
  const { form, rules, parse } = useZodForm(SetSubscriptionBody);
  const save = useSetSubscription();

  const submit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await save.mutateAsync({ params: { orgId: org.id }, body: parse(values) });
      message.success(t('saved', { org: org.name }));
      onClose();
    } catch (error) {
      if (!applyApiError(form, error, messageFor)) message.error(messageFor(errorCode(error)));
    }
  };

  return (
    <Modal
      open
      title={t('setPlanTitle', { org: org.name })}
      okText={t('save')}
      cancelText={t('cancel')}
      onOk={() => void submit()}
      onCancel={onClose}
      confirmLoading={save.isPending}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          plan: org.subscription?.plan ?? org.plan,
          status: org.subscription?.status ?? 'active',
          currentPeriodEnd: org.subscription?.currentPeriodEnd ?? null,
          note: org.note,
        }}
      >
        <Form.Item name="plan" label={tb('invoicePlan')} rules={rules}>
          <Select
            aria-label={tb('invoicePlan')}
            options={PLAN_ORDER.map((plan) => ({ value: plan, label: tb(`plans.${plan}`) }))}
          />
        </Form.Item>
        <Form.Item name="status" label={t('status')} rules={rules}>
          <Select
            aria-label={t('status')}
            options={[
              { value: 'active', label: t('statusActive') },
              { value: 'expired', label: t('statusExpired') },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="currentPeriodEnd"
          label={t('periodEnd')}
          extra={t('periodEndHint')}
          rules={rules}
          {...dayField('end')}
        >
          <Input type="date" />
        </Form.Item>
        <Form.Item name="note" label={t('noteLabel')} rules={rules}>
          <Input.TextArea rows={3} maxLength={1000} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/** First day not yet paid for: the day after the current period, or today. */
function nextPeriodStart(org: AdminOrg): string {
  const today = isoToDay(new Date().toISOString());
  const end = org.plan !== 'free' ? org.subscription?.currentPeriodEnd : null;
  if (!end) return today;
  const after = isoToDay(new Date(Date.parse(end) + 1).toISOString());
  // `YYYY-MM-DD` strings compare like dates.
  if (after > today) return after;
  return today;
}

function RecordInvoiceModal({ org, onClose }: { org: AdminOrg; onClose: () => void }) {
  const t = useTranslations('admin');
  const tb = useTranslations('billing');
  const { message } = App.useApp();
  const messageFor = useErrorMessage();
  const { form, rules, parse } = useZodForm(RecordInvoiceBody);
  const record = useRecordInvoice();

  const plan = org.plan === 'free' ? 'shop' : org.plan;
  const start = nextPeriodStart(org);
  const nextStart = dayToIso(addMonths(start, 1), 'start') ?? '';
  const initialValues: Partial<RecordInvoiceInput> = {
    plan,
    amountVnd: PLAN_PRICES[plan].monthly,
    periodStart: dayToIso(start, 'start') ?? undefined,
    periodEnd: new Date(Date.parse(nextStart) - 1).toISOString(),
    paidAt: dayToIso(isoToDay(new Date().toISOString()), 'start') ?? undefined,
    reference: null,
  };

  const submit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await record.mutateAsync({ params: { orgId: org.id }, body: parse(values) });
      message.success(t('invoiceSaved', { org: org.name }));
      onClose();
    } catch (error) {
      if (!applyApiError(form, error, messageFor)) message.error(messageFor(errorCode(error)));
    }
  };

  return (
    <Modal
      open
      title={t('invoiceTitle', { org: org.name })}
      okText={t('save')}
      cancelText={t('cancel')}
      onOk={() => void submit()}
      onCancel={onClose}
      confirmLoading={record.isPending}
      destroyOnHidden
    >
      <Flex vertical gap={12}>
        <Typography.Text type="secondary">{t('invoiceHint')}</Typography.Text>
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={initialValues}
          onValuesChange={(changed: Partial<RecordInvoiceInput>) => {
            if (changed.plan) form.setFieldValue('amountVnd', PLAN_PRICES[changed.plan].monthly);
          }}
        >
          <Form.Item name="plan" label={tb('invoicePlan')} rules={rules}>
            <Select
              aria-label={tb('invoicePlan')}
              options={(['shop', 'chain'] as const).map((value) => ({
                value,
                label: tb(`plans.${value}`),
              }))}
            />
          </Form.Item>
          <Form.Item name="amountVnd" label={t('amount')} rules={rules}>
            <InputNumber<number>
              className="!w-full"
              min={0}
              step={1000}
              formatter={(value) =>
                value == null ? '' : String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
              }
              parser={(value) => Number((value ?? '').replace(/\D/g, ''))}
            />
          </Form.Item>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item
              name="periodStart"
              label={t('periodStart')}
              rules={rules}
              {...dayField('start')}
            >
              <Input type="date" />
            </Form.Item>
            <Form.Item
              name="periodEnd"
              label={t('periodEndInvoice')}
              rules={rules}
              dependencies={['periodStart']}
              {...dayField('end')}
            >
              <Input type="date" />
            </Form.Item>
          </div>
          <Form.Item name="paidAt" label={t('paidAt')} rules={rules} {...dayField('start')}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="reference" label={t('reference')} rules={rules} className="!mb-0">
            <Input maxLength={200} />
          </Form.Item>
        </Form>
      </Flex>
    </Modal>
  );
}
