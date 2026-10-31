'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@playora/api-client';
import {
  type AdminOrg,
  RecordInvoiceBody,
  type RecordInvoiceBody as RecordInvoiceInput,
  SetSubscriptionBody,
} from '@playora/contracts';
import { planLimits } from '@playora/core/billing';
import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { HintText } from '@playora/ui/components/base/input/hint-text';
import { Input } from '@playora/ui/components/base/input/input';
import { Label } from '@playora/ui/components/base/input/label';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@playora/ui/components/base/modal/modal';
import { Select, SelectItem } from '@playora/ui/components/base/select/select';
import { Textarea } from '@playora/ui/components/base/textarea/textarea';
import { toast } from '@playora/ui/components/base/toast/toast';
import { applyApiErrorToRHF } from '@playora/ui/form';
import { Search } from '@playora/ui/icons';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Caption } from '@/components/caption';
import { PageHeader } from '@/components/page-header';
import { QueryError } from '@/components/query-error';
import { TableCard } from '@/components/table-card';
import { useAdminOrgs, useRecordInvoice, useSetSubscription } from '../api';
import { addMonths, dayToIso, isoToDay } from '../lib/dates';
import { PLAN_ORDER, PLAN_PRICES } from '../lib/plans';

const DAY = { day: '2-digit', month: '2-digit', year: 'numeric' } as const;

export function AdminView() {
  const t = useTranslations('admin');
  const tb = useTranslations('billing');
  const tMembers = useTranslations('members');
  const format = useFormatter();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminOrg | null>(null);
  const [invoicing, setInvoicing] = useState<AdminOrg | null>(null);
  const query = useAdminOrgs(search);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('title')} description={t('subtitle')} />
      {query.isError ? (
        <QueryError onRetry={() => query.refetch()} />
      ) : (
        <TableCard
          toolbar={
            <div className="max-w-md flex-1">
              <Input
                type="search"
                placeholder={t('search')}
                aria-label={t('search')}
                leadingIcon={Search}
                value={search}
                onChange={(val) => setSearch(val.trim())}
              />
            </div>
          }
        >
          <div className="w-full overflow-x-auto">
            <table className="bui-table w-full">
              <thead>
                <tr>
                  <th>{t('org')}</th>
                  <th>{t('owner')}</th>
                  <th>{t('plan')}</th>
                  <th>{t('campaigns')}</th>
                  <th>{t('redemptions')}</th>
                  <th>{t('note')}</th>
                  <th className="text-right">{tMembers('actionsColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {(query.data?.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="h-24 text-center text-text-secondary">
                      {t('empty')}
                    </td>
                  </tr>
                ) : (
                  (query.data?.items ?? []).map((org) => {
                    const sub = org.subscription;
                    const lapsed = sub && sub.plan !== 'free' && org.plan === 'free';
                    const limit = planLimits(org.plan).maxRunningCampaigns;
                    return (
                      <tr key={org.id}>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-medium text-text-primary">{org.name}</span>
                            <Caption>{org.slug}</Caption>
                          </div>
                        </td>
                        <td>{org.ownerEmail ?? <Caption>—</Caption>}</td>
                        <td>
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-1.5">
                              <Chip
                                variant={org.plan === 'free' ? 'subtle' : 'bold'}
                                color={org.plan === 'free' ? 'neutral' : 'orange'}
                              >
                                {tb(`plans.${org.plan}`)}
                              </Chip>
                              {lapsed && (
                                <Chip variant="subtle" color="rose">
                                  {t('expired')}
                                </Chip>
                              )}
                            </div>
                            {sub?.currentPeriodEnd && (
                              <Caption>
                                {t('until', {
                                  date: format.dateTime(new Date(sub.currentPeriodEnd), DAY),
                                })}
                              </Caption>
                            )}
                          </div>
                        </td>
                        <td>
                          {limit === null
                            ? tb('ofUnlimited', { used: org.usage.runningCampaigns })
                            : tb('ofLimit', { used: org.usage.runningCampaigns, limit })}
                        </td>
                        <td>
                          {tb('ofLimit', {
                            used: format.number(org.usage.redemptionsThisMonth),
                            limit: format.number(planLimits(org.plan).redemptionsPerMonth),
                          })}
                        </td>
                        <td>
                          {org.note ? (
                            <span className="line-clamp-1 max-w-[220px]" title={org.note}>
                              {org.note}
                            </span>
                          ) : (
                            <Caption>—</Caption>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={() => setEditing(org)}
                            >
                              {t('setPlan')}
                            </Button>
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={() => setInvoicing(org)}
                            >
                              {t('recordInvoice')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TableCard>
      )}
      {editing && <SetPlanModal org={editing} onClose={() => setEditing(null)} />}
      {invoicing && <RecordInvoiceModal org={invoicing} onClose={() => setInvoicing(null)} />}
    </div>
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

type SetSubscriptionValues = z.input<typeof SetSubscriptionBody>;

function SetPlanModal({ org, onClose }: { org: AdminOrg; onClose: () => void }) {
  const t = useTranslations('admin');
  const tb = useTranslations('billing');
  const messageFor = useErrorMessage();
  const save = useSetSubscription();

  const form = useForm<SetSubscriptionValues>({
    resolver: zodResolver(SetSubscriptionBody),
    defaultValues: {
      plan: org.subscription?.plan ?? org.plan,
      status: org.subscription?.status ?? 'active',
      currentPeriodEnd: org.subscription?.currentPeriodEnd ?? null,
      note: org.note,
    },
  });

  const onSubmit = async (values: SetSubscriptionValues) => {
    try {
      const body = SetSubscriptionBody.parse(values);
      await save.mutateAsync({ params: { orgId: org.id }, body });
      toast.success(t('saved', { org: org.name }));
      onClose();
    } catch (error) {
      if (!applyApiErrorToRHF(form.setError, error, messageFor)) {
        toast.error(messageFor(errorCode(error)));
      }
    }
  };

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="sm">
      <ModalHeader title={t('setPlanTitle', { org: org.name })} />
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ModalBody className="space-y-4">
          <Controller
            control={form.control}
            name="plan"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1">
                <Label>{tb('invoicePlan')}</Label>
                <Select
                  aria-label={tb('invoicePlan')}
                  selectedKey={field.value}
                  onSelectionChange={(key) => {
                    if (key) field.onChange(String(key));
                  }}
                  isInvalid={!!fieldState.error}
                >
                  {PLAN_ORDER.map((plan) => (
                    <SelectItem key={plan} id={plan}>
                      {tb(`plans.${plan}`)}
                    </SelectItem>
                  ))}
                </Select>
                {fieldState.error?.message && (
                  <HintText isInvalid>{fieldState.error.message}</HintText>
                )}
              </div>
            )}
          />

          <Controller
            control={form.control}
            name="status"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1">
                <Label>{t('status')}</Label>
                <Select
                  aria-label={t('status')}
                  selectedKey={field.value}
                  onSelectionChange={(key) => {
                    if (key) field.onChange(String(key));
                  }}
                  isInvalid={!!fieldState.error}
                >
                  <SelectItem id="active">{t('statusActive')}</SelectItem>
                  <SelectItem id="expired">{t('statusExpired')}</SelectItem>
                </Select>
                {fieldState.error?.message && (
                  <HintText isInvalid>{fieldState.error.message}</HintText>
                )}
              </div>
            )}
          />

          <Controller
            control={form.control}
            name="currentPeriodEnd"
            render={({ field, fieldState }) => (
              <Input
                label={t('periodEnd')}
                type="date"
                value={isoToDay(field.value) ?? ''}
                onChange={(val) => field.onChange(val ? dayToIso(val, 'end') : null)}
                isInvalid={!!fieldState.error}
                hint={fieldState.error?.message ?? t('periodEndHint')}
              />
            )}
          />

          <Controller
            control={form.control}
            name="note"
            render={({ field, fieldState }) => (
              <Textarea
                label={t('noteLabel')}
                rows={3}
                maxLength={1000}
                value={field.value ?? ''}
                onChange={(val) => field.onChange(val || null)}
                isInvalid={!!fieldState.error}
                hint={fieldState.error?.message}
              />
            )}
          />
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {t('save')}
          </Button>
        </ModalFooter>
      </form>
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

type RecordInvoiceValues = z.input<typeof RecordInvoiceBody>;

function RecordInvoiceModal({ org, onClose }: { org: AdminOrg; onClose: () => void }) {
  const t = useTranslations('admin');
  const tb = useTranslations('billing');
  const messageFor = useErrorMessage();
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

  const form = useForm<RecordInvoiceValues>({
    resolver: zodResolver(RecordInvoiceBody),
    defaultValues: initialValues as RecordInvoiceValues,
  });

  const onSubmit = async (values: RecordInvoiceValues) => {
    try {
      const body = RecordInvoiceBody.parse(values);
      await record.mutateAsync({ params: { orgId: org.id }, body });
      toast.success(t('invoiceSaved', { org: org.name }));
      onClose();
    } catch (error) {
      if (!applyApiErrorToRHF(form.setError, error, messageFor)) {
        toast.error(messageFor(errorCode(error)));
      }
    }
  };

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="sm">
      <ModalHeader title={t('invoiceTitle', { org: org.name })} description={t('invoiceHint')} />
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ModalBody className="space-y-4">
          <Controller
            control={form.control}
            name="plan"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1">
                <Label>{tb('invoicePlan')}</Label>
                <Select
                  aria-label={tb('invoicePlan')}
                  selectedKey={field.value}
                  onSelectionChange={(key) => {
                    if (!key) return;
                    const val = String(key);
                    field.onChange(val);
                    if (val === 'shop' || val === 'chain') {
                      form.setValue('amountVnd', PLAN_PRICES[val].monthly);
                    }
                  }}
                  isInvalid={!!fieldState.error}
                >
                  {(['shop', 'chain'] as const).map((value) => (
                    <SelectItem key={value} id={value}>
                      {tb(`plans.${value}`)}
                    </SelectItem>
                  ))}
                </Select>
                {fieldState.error?.message && (
                  <HintText isInvalid>{fieldState.error.message}</HintText>
                )}
              </div>
            )}
          />

          <Controller
            control={form.control}
            name="amountVnd"
            render={({ field, fieldState }) => (
              <Input
                label={t('amount')}
                type="number"
                value={String(field.value ?? '')}
                onChange={(val) => field.onChange(Number(val))}
                isInvalid={!!fieldState.error}
                hint={fieldState.error?.message}
              />
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="periodStart"
              render={({ field, fieldState }) => (
                <Input
                  label={t('periodStart')}
                  type="date"
                  value={isoToDay(field.value) ?? ''}
                  onChange={(val) => field.onChange(val ? dayToIso(val, 'start') : '')}
                  isInvalid={!!fieldState.error}
                  hint={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={form.control}
              name="periodEnd"
              render={({ field, fieldState }) => (
                <Input
                  label={t('periodEndInvoice')}
                  type="date"
                  value={isoToDay(field.value) ?? ''}
                  onChange={(val) => field.onChange(val ? dayToIso(val, 'end') : '')}
                  isInvalid={!!fieldState.error}
                  hint={fieldState.error?.message}
                />
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="paidAt"
            render={({ field, fieldState }) => (
              <Input
                label={t('paidAt')}
                type="date"
                value={isoToDay(field.value) ?? ''}
                onChange={(val) => field.onChange(val ? dayToIso(val, 'start') : '')}
                isInvalid={!!fieldState.error}
                hint={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="reference"
            render={({ field, fieldState }) => (
              <Input
                label={t('reference')}
                maxLength={200}
                value={field.value ?? ''}
                onChange={(val) => field.onChange(val || null)}
                isInvalid={!!fieldState.error}
                hint={fieldState.error?.message}
              />
            )}
          />
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={record.isPending}>
            {t('save')}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
