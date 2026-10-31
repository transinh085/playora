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
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@playora/ui/components/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@playora/ui/components/form';
import { Input } from '@playora/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@playora/ui/components/select';
import { toast } from '@playora/ui/components/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@playora/ui/components/table';
import { Textarea } from '@playora/ui/components/textarea';
import { applyApiErrorToRHF } from '@playora/ui/form';
import { Search } from '@playora/ui/icons';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('search')}
                aria-label={t('search')}
                value={search}
                onChange={(e) => setSearch(e.target.value.trim())}
                className="pl-9"
              />
            </div>
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('org')}</TableHead>
                  <TableHead>{t('owner')}</TableHead>
                  <TableHead>{t('plan')}</TableHead>
                  <TableHead>{t('campaigns')}</TableHead>
                  <TableHead>{t('redemptions')}</TableHead>
                  <TableHead>{t('note')}</TableHead>
                  <TableHead className="text-right">{tMembers('actionsColumn')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  (query.data?.items ?? []).map((org) => {
                    const sub = org.subscription;
                    const lapsed = sub && sub.plan !== 'free' && org.plan === 'free';
                    const limit = planLimits(org.plan).maxRunningCampaigns;
                    return (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{org.name}</span>
                            <Caption>{org.slug}</Caption>
                          </div>
                        </TableCell>
                        <TableCell>{org.ownerEmail ?? <Caption>—</Caption>}</TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={org.plan === 'free' ? 'secondary' : 'default'}>
                                {tb(`plans.${org.plan}`)}
                              </Badge>
                              {lapsed && <Badge variant="destructive">{t('expired')}</Badge>}
                            </div>
                            {sub?.currentPeriodEnd && (
                              <Caption>
                                {t('until', {
                                  date: format.dateTime(new Date(sub.currentPeriodEnd), DAY),
                                })}
                              </Caption>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {limit === null
                            ? tb('ofUnlimited', { used: org.usage.runningCampaigns })
                            : tb('ofLimit', { used: org.usage.runningCampaigns, limit })}
                        </TableCell>
                        <TableCell>
                          {tb('ofLimit', {
                            used: format.number(org.usage.redemptionsThisMonth),
                            limit: format.number(planLimits(org.plan).redemptionsPerMonth),
                          })}
                        </TableCell>
                        <TableCell>
                          {org.note ? (
                            <span className="line-clamp-1 max-w-[220px]" title={org.note}>
                              {org.note}
                            </span>
                          ) : (
                            <Caption>—</Caption>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditing(org)}>
                              {t('setPlan')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setInvoicing(org)}>
                              {t('recordInvoice')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('setPlanTitle', { org: org.name })}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tb('invoicePlan')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-label={tb('invoicePlan')}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PLAN_ORDER.map((plan) => (
                        <SelectItem key={plan} value={plan}>
                          {tb(`plans.${plan}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('status')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-label={t('status')}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">{t('statusActive')}</SelectItem>
                      <SelectItem value="expired">{t('statusExpired')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currentPeriodEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('periodEnd')}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={isoToDay(field.value) ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? dayToIso(e.target.value, 'end') : null)
                      }
                    />
                  </FormControl>
                  <FormDescription>{t('periodEndHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('noteLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      maxLength={1000}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {t('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('invoiceTitle', { org: org.name })}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{t('invoiceHint')}</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tb('invoicePlan')}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      if (val === 'shop' || val === 'chain') {
                        form.setValue('amountVnd', PLAN_PRICES[val].monthly);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger aria-label={tb('invoicePlan')}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(['shop', 'chain'] as const).map((value) => (
                        <SelectItem key={value} value={value}>
                          {tb(`plans.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amountVnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('amount')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="periodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('periodStart')}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={isoToDay(field.value) ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? dayToIso(e.target.value, 'start') : '')
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('periodEndInvoice')}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={isoToDay(field.value) ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? dayToIso(e.target.value, 'end') : '')
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paidAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('paidAt')}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={isoToDay(field.value) ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? dayToIso(e.target.value, 'start') : '')
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('reference')}</FormLabel>
                  <FormControl>
                    <Input
                      maxLength={200}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={record.isPending}>
                {t('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
