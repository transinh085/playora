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
import {
  Avatar,
  Button,
  Chip,
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  Modal,
  SearchField,
  Select,
  Tabs,
  TextArea,
  TextField,
  toast,
} from '@playora/ui/components';
import { applyApiErrorToRHF } from '@playora/ui/form';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Caption } from '@/components/caption';
import { PageHeader } from '@/components/page-header';
import { QueryError } from '@/components/query-error';
import { TableCard } from '@/components/table-card';
import {
  useAdminInspectOrg,
  useAdminOrgs,
  useAdminUpcomingCampaigns,
  useRecordInvoice,
  useSetSubscription,
} from '../api';
import { addMonths, dayToIso, isoToDay } from '../lib/dates';
import { PLAN_ORDER, PLAN_PRICES } from '../lib/plans';

const DAY = { day: '2-digit', month: '2-digit', year: 'numeric' } as const;

export function AdminView() {
  const t = useTranslations('admin');
  const tb = useTranslations('billing');
  const tMembers = useTranslations('members');
  const format = useFormatter();
  const router = useRouter();
  const [tab, setTab] = useState<'orgs' | 'upcoming'>('orgs');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editing, setEditing] = useState<AdminOrg | null>(null);
  const [invoicing, setInvoicing] = useState<AdminOrg | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const query = useAdminOrgs(debouncedSearch);
  const upcomingQuery = useAdminUpcomingCampaigns();
  const inspectOrg = useAdminInspectOrg();

  const handleInspectOrg = async (org: AdminOrg) => {
    await inspectOrg.mutateAsync({ params: { orgId: org.id } });
    toast.success(t('inspectedToast', { org: org.name }));
    router.push(`/orgs/${org.id}/campaigns` as Route);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) => setTab(String(key) as 'orgs' | 'upcoming')}
        className="w-full"
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('title')} className="w-fit">
            <Tabs.Tab id="orgs">
              {t('tabs.orgs', { count: query.data?.items.length ?? 0 })}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="upcoming">
              {t('tabs.upcoming', { count: upcomingQuery.data?.items.length ?? 0 })}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      {tab === 'upcoming' ? (
        upcomingQuery.isError ? (
          <QueryError onRetry={() => upcomingQuery.refetch()} />
        ) : (
          <TableCard>
            <div className="w-full overflow-x-auto" data-testid="admin-upcoming-campaigns">
              <table className="w-full border-collapse text-left text-body-2-regular">
                <thead>
                  <tr className="border-b border-separator-border text-caption-1-semibold text-text-secondary">
                    <th className="px-4 py-3">{t('upcomingCampaign')}</th>
                    <th className="px-4 py-3">{t('org')}</th>
                    <th className="px-4 py-3">{t('status')}</th>
                    <th className="px-4 py-3">{t('upcomingSchedule')}</th>
                    <th className="px-4 py-3">{t('upcomingTraffic')}</th>
                    <th className="px-4 py-3">{t('upcomingStock')}</th>
                    <th className="px-4 py-3">{t('upcomingPlays')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-separator-border">
                  {(upcomingQuery.data?.items ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="h-24 text-center text-text-secondary">
                        {t('upcomingEmpty')}
                      </td>
                    </tr>
                  ) : (
                    (upcomingQuery.data?.items ?? []).map((item) => (
                      <tr key={item.id} className="hover:bg-background-secondary-default/40">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-text-primary">{item.name}</span>
                            <Caption className="font-mono">{item.slug}</Caption>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-text-primary">
                              {item.organizationName}
                            </span>
                            <Caption>{item.organizationSlug}</Caption>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            variant={item.phase === 'live' ? 'primary' : 'soft'}
                            color={item.phase === 'live' ? 'success' : 'default'}
                            size="sm"
                          >
                            {item.phase}
                          </Chip>
                        </td>
                        <td className="px-4 py-3 text-caption-1-regular text-text-secondary">
                          {item.startsAt ? format.dateTime(new Date(item.startsAt), DAY) : '—'} –{' '}
                          {item.endsAt ? format.dateTime(new Date(item.endsAt), DAY) : '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {item.expectedDailyPlays ? format.number(item.expectedDailyPlays) : '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {format.number(item.remainingStock)} / {format.number(item.totalStock)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{format.number(item.plays)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TableCard>
        )
      ) : query.isError ? (
        <QueryError onRetry={() => query.refetch()} />
      ) : (
        <TableCard
          toolbar={
            <SearchField
              className="max-w-md flex-1"
              value={searchInput}
              onChange={(val) => setSearchInput(val)}
              aria-label={t('search')}
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={t('search')} />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          }
        >
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-body-2-regular">
              <thead>
                <tr className="border-b border-separator-border text-caption-1-semibold text-text-secondary">
                  <th className="px-4 py-3">{t('org')}</th>
                  <th className="px-4 py-3">{t('owner')}</th>
                  <th className="px-4 py-3">{t('plan')}</th>
                  <th className="px-4 py-3">{t('campaigns')}</th>
                  <th className="px-4 py-3">{t('redemptions')}</th>
                  <th className="px-4 py-3">{t('note')}</th>
                  <th className="px-4 py-3 text-right">{tMembers('actionsColumn')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-separator-border">
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
                      <tr key={org.id} className="hover:bg-background-secondary-default/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar size="sm" color="accent">
                              <Avatar.Fallback>
                                {org.name.slice(0, 1).toUpperCase()}
                              </Avatar.Fallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-text-primary">{org.name}</span>
                              <Caption>{org.slug}</Caption>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{org.ownerEmail ?? <Caption>—</Caption>}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-1.5">
                              <Chip
                                variant={org.plan === 'free' ? 'soft' : 'primary'}
                                color={org.plan === 'free' ? 'default' : 'warning'}
                                size="sm"
                              >
                                {tb(`plans.${org.plan}`)}
                              </Chip>
                              {lapsed && (
                                <Chip variant="soft" color="danger" size="sm">
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
                        <td className="px-4 py-3">
                          {limit === null
                            ? tb('ofUnlimited', { used: org.usage.runningCampaigns })
                            : tb('ofLimit', { used: org.usage.runningCampaigns, limit })}
                        </td>
                        <td className="px-4 py-3">
                          {tb('ofLimit', {
                            used: format.number(org.usage.redemptionsThisMonth),
                            limit: format.number(planLimits(org.plan).redemptionsPerMonth),
                          })}
                        </td>
                        <td className="px-4 py-3">
                          {org.note ? (
                            <span className="line-clamp-1 max-w-[220px]" title={org.note}>
                              {org.note}
                            </span>
                          ) : (
                            <Caption>—</Caption>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              isDisabled={inspectOrg.isPending}
                              onPress={() => handleInspectOrg(org)}
                              data-testid="admin-inspect-org"
                            >
                              {t('inspectOrg')}
                            </Button>
                            <Button variant="secondary" size="sm" onPress={() => setEditing(org)}>
                              {t('setPlan')}
                            </Button>
                            <Button variant="secondary" size="sm" onPress={() => setInvoicing(org)}>
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
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('setPlanTitle', { org: org.name })}</Modal.Heading>
            </Modal.Header>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Modal.Body className="space-y-4">
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
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {PLAN_ORDER.map((plan) => (
                              <ListBox.Item key={plan} id={plan} textValue={tb(`plans.${plan}`)}>
                                {tb(`plans.${plan}`)}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      {fieldState.error?.message && (
                        <FieldError>{fieldState.error.message}</FieldError>
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
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            <ListBox.Item id="active" textValue={t('statusActive')}>
                              {t('statusActive')}
                            </ListBox.Item>
                            <ListBox.Item id="expired" textValue={t('statusExpired')}>
                              {t('statusExpired')}
                            </ListBox.Item>
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      {fieldState.error?.message && (
                        <FieldError>{fieldState.error.message}</FieldError>
                      )}
                    </div>
                  )}
                />

                <Controller
                  control={form.control}
                  name="currentPeriodEnd"
                  render={({ field, fieldState }) => (
                    <TextField
                      type="date"
                      value={isoToDay(field.value) ?? ''}
                      onChange={(val) => field.onChange(val ? dayToIso(val, 'end') : null)}
                      isInvalid={!!fieldState.error}
                      fullWidth
                    >
                      <Label>{t('periodEnd')}</Label>
                      <Input />
                      {fieldState.error?.message ? (
                        <FieldError>{fieldState.error.message}</FieldError>
                      ) : (
                        <Description>{t('periodEndHint')}</Description>
                      )}
                    </TextField>
                  )}
                />

                <Controller
                  control={form.control}
                  name="note"
                  render={({ field, fieldState }) => (
                    <TextField
                      value={field.value ?? ''}
                      onChange={(val) => field.onChange(val || null)}
                      isInvalid={!!fieldState.error}
                      fullWidth
                    >
                      <Label>{t('noteLabel')}</Label>
                      <TextArea rows={3} maxLength={1000} />
                      {fieldState.error?.message && (
                        <FieldError>{fieldState.error.message}</FieldError>
                      )}
                    </TextField>
                  )}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={onClose}>
                  {t('cancel')}
                </Button>
                <Button type="submit" isDisabled={save.isPending}>
                  {t('save')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
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
    <Modal isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('invoiceTitle', { org: org.name })}</Modal.Heading>
              <p className="mt-1 text-caption-1-regular text-text-secondary">{t('invoiceHint')}</p>
            </Modal.Header>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Modal.Body className="space-y-4">
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
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {(['shop', 'chain'] as const).map((value) => (
                              <ListBox.Item key={value} id={value} textValue={tb(`plans.${value}`)}>
                                {tb(`plans.${value}`)}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      {fieldState.error?.message && (
                        <FieldError>{fieldState.error.message}</FieldError>
                      )}
                    </div>
                  )}
                />

                <Controller
                  control={form.control}
                  name="amountVnd"
                  render={({ field, fieldState }) => (
                    <TextField
                      type="number"
                      value={String(field.value ?? '')}
                      onChange={(val) => field.onChange(Number(val))}
                      isInvalid={!!fieldState.error}
                      fullWidth
                    >
                      <Label>{t('amount')}</Label>
                      <Input />
                      {fieldState.error?.message && (
                        <FieldError>{fieldState.error.message}</FieldError>
                      )}
                    </TextField>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="periodStart"
                    render={({ field, fieldState }) => (
                      <TextField
                        type="date"
                        value={isoToDay(field.value) ?? ''}
                        onChange={(val) => field.onChange(val ? dayToIso(val, 'start') : '')}
                        isInvalid={!!fieldState.error}
                        fullWidth
                      >
                        <Label>{t('periodStart')}</Label>
                        <Input />
                        {fieldState.error?.message && (
                          <FieldError>{fieldState.error.message}</FieldError>
                        )}
                      </TextField>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="periodEnd"
                    render={({ field, fieldState }) => (
                      <TextField
                        type="date"
                        value={isoToDay(field.value) ?? ''}
                        onChange={(val) => field.onChange(val ? dayToIso(val, 'end') : '')}
                        isInvalid={!!fieldState.error}
                        fullWidth
                      >
                        <Label>{t('periodEndInvoice')}</Label>
                        <Input />
                        {fieldState.error?.message && (
                          <FieldError>{fieldState.error.message}</FieldError>
                        )}
                      </TextField>
                    )}
                  />
                </div>

                <Controller
                  control={form.control}
                  name="paidAt"
                  render={({ field, fieldState }) => (
                    <TextField
                      type="date"
                      value={isoToDay(field.value) ?? ''}
                      onChange={(val) => field.onChange(val ? dayToIso(val, 'start') : '')}
                      isInvalid={!!fieldState.error}
                      fullWidth
                    >
                      <Label>{t('paidAt')}</Label>
                      <Input />
                      {fieldState.error?.message && (
                        <FieldError>{fieldState.error.message}</FieldError>
                      )}
                    </TextField>
                  )}
                />

                <Controller
                  control={form.control}
                  name="reference"
                  render={({ field, fieldState }) => (
                    <TextField
                      maxLength={200}
                      value={field.value ?? ''}
                      onChange={(val) => field.onChange(val || null)}
                      isInvalid={!!fieldState.error}
                      fullWidth
                    >
                      <Label>{t('reference')}</Label>
                      <Input />
                      {fieldState.error?.message && (
                        <FieldError>{fieldState.error.message}</FieldError>
                      )}
                    </TextField>
                  )}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={onClose}>
                  {t('cancel')}
                </Button>
                <Button type="submit" isDisabled={record.isPending}>
                  {t('save')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
