'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError } from '@playora/api-client';
import { useRouteQuery } from '@playora/api-client/react';
import { ErrorCode, meApi, ReopenVoucherBody } from '@playora/contracts';
import { Alert, AlertDescription, AlertTitle } from '@playora/ui/components/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@playora/ui/components/alert-dialog';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@playora/ui/components/form';
import { Input } from '@playora/ui/components/input';
import { toast } from '@playora/ui/components/sonner';
import { Textarea } from '@playora/ui/components/textarea';
import { applyApiErrorToRHF } from '@playora/ui/form';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Gift,
  RotateCcw,
  ScanLine,
} from '@playora/ui/icons';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Caption } from '@/components/caption';
import { useInvalidateBilling } from '@/features/billing/api';
import { billingPath } from '@/features/billing/lib/plans';
import { api } from '@/lib/api';
import { can } from '@/lib/permissions';
import { useRedeemVoucher, useReopenVoucher, useVoucherLookup } from '../api';
import { normalizeCode } from './redeem/code';

interface Redemption {
  code: string;
  prizeName: string;
  campaignName: string;
  at: string;
}

type ReopenValues = z.input<typeof ReopenVoucherBody>;

export function RedeemDesk({ orgId }: { orgId: string }) {
  const t = useTranslations('builderLab.redeem');
  const tErrors = useTranslations('errors');
  const tBilling = useTranslations('billing');
  const format = useFormatter();
  const myOrgs = useRouteQuery(api, meApi.orgs, {});
  const role = myOrgs.data?.items.find((o) => o.id === orgId)?.role;
  const canRedeem = role ? can(role, { voucher: ['redeem'] }) : true;
  const canReopen = can(role, { voucher: ['reopen'] });

  const [input, setInput] = useState('');
  const [code, setCode] = useState('');
  const [session, setSession] = useState<Redemption[]>([]);
  const [justRedeemed, setJustRedeemed] = useState<Redemption | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [planBlocked, setPlanBlocked] = useState<string | null>(null);
  const invalidateBilling = useInvalidateBilling();
  const canSeePlan = can(role, { billing: ['read'] });

  const lookup = useVoucherLookup(orgId, code);
  const redeem = useRedeemVoucher(orgId);
  const reopen = useReopenVoucher(orgId);

  const reopenForm = useForm<ReopenValues>({
    resolver: zodResolver(ReopenVoucherBody),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    const fromUrl = normalizeCode(new URLSearchParams(window.location.search).get('code') ?? '');
    if (fromUrl) {
      setInput(fromUrl);
      setCode(fromUrl);
    }
  }, []);

  const time = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'short', timeStyle: 'short' });

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const next = normalizeCode(input);
    if (!next) return;
    setJustRedeemed(null);
    setPlanBlocked(null);
    redeem.reset();
    if (next === code) void lookup.refetch();
    else setCode(next);
  };

  const handleConfirmRedeem = async () => {
    const data = lookup.data;
    if (!data) return;
    setConfirmOpen(false);
    try {
      const voucher = await redeem.mutateAsync(data.code);
      const entry: Redemption = {
        code: voucher.code,
        prizeName: voucher.prize.name,
        campaignName: voucher.campaign.name,
        at: voucher.redeemedAt ?? new Date().toISOString(),
      };
      setJustRedeemed(entry);
      void invalidateBilling();
      setSession((list) => [entry, ...list.filter((item) => item.code !== entry.code)]);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'VOUCHER_ALREADY_REDEEMED') {
          toast.error(t('alreadyRedeemedShort', { code: data.code }));
          void lookup.refetch();
          return;
        }
        if (error.code === ErrorCode.PLAN_REDEMPTION_LIMIT) {
          setPlanBlocked(data.code);
          void invalidateBilling();
          return;
        }
        if (tErrors.has(error.code)) {
          toast.error(tErrors(error.code));
          void lookup.refetch();
          return;
        }
      }
      toast.error(t('genericError'));
    }
  };

  const submitReopen = async (values: ReopenValues) => {
    const data = lookup.data;
    if (!data) return;
    try {
      const body = ReopenVoucherBody.parse(values);
      await reopen.mutateAsync({ params: { orgId, code: data.code }, body });
      setReopenOpen(false);
      reopenForm.reset();
      setSession((list) => list.filter((item) => item.code !== data.code));
      toast.success(t('reopenedSuccess', { code: data.code }));
    } catch (err) {
      if (
        !applyApiErrorToRHF(reopenForm.setError, err, (errCode) =>
          tErrors.has(errCode as never) ? tErrors(errCode as never) : t('genericError'),
        )
      ) {
        const msg =
          err instanceof ApiError && tErrors.has(err.code) ? tErrors(err.code) : t('genericError');
        toast.error(msg);
      }
    }
  };

  const startOver = () => {
    setInput('');
    setCode('');
    setJustRedeemed(null);
    setPlanBlocked(null);
  };

  const lookupError = lookup.error;
  const notFound =
    lookupError instanceof ApiError &&
    (lookupError.code === 'VOUCHER_NOT_FOUND' || lookupError.status === 404);
  const data = code && !lookupError ? lookup.data : undefined;

  return (
    <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex w-full flex-col gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
          <form onSubmit={submit} className="space-y-3">
            <label
              htmlFor="redeem-code"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
            >
              {t('codeLabel')}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="redeem-code"
                  value={input}
                  onChange={(e) => setInput(normalizeCode(e.target.value))}
                  placeholder={t('codePlaceholder')}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  autoFocus
                  className="h-10 rounded-md pl-9 font-mono text-sm tracking-widest uppercase"
                />
              </div>
              <Button
                type="submit"
                className="h-10 rounded-md px-5 text-xs font-medium"
                disabled={lookup.isFetching || input.length < 4}
              >
                {t('check')}
              </Button>
            </div>
          </form>
        </div>

        {planBlocked && (
          <Alert variant="destructive" className="rounded-lg" data-testid="redeem-plan-limit">
            <AlertCircle className="size-4" />
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <AlertTitle>{tErrors('PLAN_REDEMPTION_LIMIT')}</AlertTitle>
                <AlertDescription>
                  {tBilling('redeemBlocked', { code: planBlocked })}
                </AlertDescription>
              </div>
              {canSeePlan && (
                <Link href={billingPath(orgId)}>
                  <Button variant="outline" size="sm" className="h-8 rounded-md text-xs">
                    {tBilling('viewPlan')}
                  </Button>
                </Link>
              )}
            </div>
          </Alert>
        )}

        {justRedeemed ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {t('successTitle')}
            </h3>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {t('successBody', { prize: justRedeemed.prizeName })}
            </p>
            <Button className="mt-4 w-full h-8 rounded-md text-xs" onClick={startOver}>
              {t('newCode')}
            </Button>
          </div>
        ) : notFound ? (
          <Alert variant="destructive" className="rounded-lg">
            <AlertCircle className="size-4" />
            <AlertTitle>{t('notFound', { code })}</AlertTitle>
          </Alert>
        ) : lookupError ? (
          <Alert variant="destructive" className="rounded-lg">
            <AlertCircle className="size-4" />
            <AlertTitle>
              {lookupError instanceof ApiError && tErrors.has(lookupError.code)
                ? tErrors(lookupError.code)
                : t('genericError')}
            </AlertTitle>
          </Alert>
        ) : data ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-xs space-y-4 dark:border-white/10 dark:bg-[#0A0A0A]">
            <div className="flex items-center gap-3">
              {data.prize.image ? (
                // biome-ignore lint/performance/noImgElement: prize image
                <img
                  src={data.prize.image}
                  alt=""
                  width={56}
                  height={56}
                  className="size-14 shrink-0 rounded-md border border-neutral-200 object-cover dark:border-white/10"
                />
              ) : (
                <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
                  <Gift className="size-6" />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {data.prize.name}
                </h4>
                <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  {data.code}
                </span>
              </div>
            </div>

            {data.rehearsal && (
              <Alert className="rounded-lg">
                <AlertCircle className="size-4" />
                <AlertTitle>{t('rehearsalNote')}</AlertTitle>
              </Alert>
            )}

            <div className="divide-y divide-neutral-200 rounded-md border border-neutral-200 p-3 text-xs dark:divide-white/10 dark:border-white/10">
              <div className="flex justify-between py-1.5">
                <span className="text-neutral-500 dark:text-neutral-400">{t('campaign')}</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {data.campaign.name}
                </span>
              </div>
              {data.playerName && (
                <div className="flex justify-between py-1.5">
                  <span className="text-neutral-500 dark:text-neutral-400">{t('player')}</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {data.playerName}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1.5">
                <span className="text-neutral-500 dark:text-neutral-400">{t('issuedAt')}</span>
                <span className="text-neutral-700 dark:text-neutral-300">
                  {time(data.issuedAt)}
                </span>
              </div>
              {data.expiresAt && (
                <div className="flex justify-between py-1.5">
                  <span className="text-neutral-500 dark:text-neutral-400">{t('expiresAt')}</span>
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {time(data.expiresAt)}
                  </span>
                </div>
              )}
              {data.redeemedByName && (
                <div className="flex justify-between py-1.5">
                  <span className="text-neutral-500 dark:text-neutral-400">{t('redeemedBy')}</span>
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {data.redeemedByName}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-1.5">
                <span className="text-neutral-500 dark:text-neutral-400">{t('status')}</span>
                <div className="flex items-center gap-1.5">
                  {data.status === 'redeemed' && data.redeemedAt ? (
                    <Badge variant="secondary" className="rounded-sm text-[10px]">
                      {t('redeemedAt', { time: time(data.redeemedAt) })}
                    </Badge>
                  ) : data.status === 'expired' ? (
                    <Badge variant="secondary" className="rounded-sm text-[10px] text-amber-600">
                      {t('expired')}
                    </Badge>
                  ) : data.status === 'void' ? (
                    <Badge variant="destructive" className="rounded-sm text-[10px]">
                      {t('void')}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="rounded-sm text-[10px] border-emerald-500/30 text-emerald-600"
                    >
                      {t('notRedeemed')}
                    </Badge>
                  )}
                  {data.rehearsal && (
                    <Badge
                      variant="outline"
                      className="rounded-sm text-[10px] border-amber-500/40 text-amber-600"
                    >
                      {t('rehearsal')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {data.status === 'redeemed' ? (
              <div className="space-y-3">
                <Alert className="rounded-lg border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle>
                    {data.redeemedAt
                      ? t('alreadyRedeemed', {
                          code: data.code,
                          time: time(data.redeemedAt),
                        })
                      : t('alreadyRedeemedShort', { code: data.code })}
                  </AlertTitle>
                </Alert>
                {canReopen && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-md h-8 text-xs"
                    onClick={() => setReopenOpen(true)}
                  >
                    <RotateCcw className="size-3.5" />
                    {t('reopen')}
                  </Button>
                )}
              </div>
            ) : data.status === 'expired' ? (
              <Alert className="rounded-lg border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle>{t('expiredAlert', { code: data.code })}</AlertTitle>
              </Alert>
            ) : data.status === 'void' ? (
              <Alert variant="destructive" className="rounded-lg">
                <AlertCircle className="size-4" />
                <AlertTitle>{t('voidAlert', { code: data.code })}</AlertTitle>
              </Alert>
            ) : (
              canRedeem && (
                <Button
                  className="w-full rounded-md h-9 text-xs font-medium"
                  onClick={() => setConfirmOpen(true)}
                  disabled={redeem.isPending}
                >
                  {t('confirm')}
                </Button>
              )
            )}
          </div>
        ) : null}
      </div>

      <div>
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-white/10">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {t('sessionTitle')}
            </h3>
            <span className="rounded-sm bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
              {session.length}
            </span>
          </div>
          <div className="p-0">
            {session.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">{t('sessionEmpty')}</div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-white/10">
                {session.map((entry) => (
                  <div
                    key={entry.code}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-medium text-neutral-900 dark:text-neutral-100">
                        {entry.prizeName}
                      </span>
                      <Caption className="truncate">{entry.campaignName}</Caption>
                    </div>
                    <div className="text-right">
                      <span className="block font-mono text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                        {entry.code}
                      </span>
                      <Caption>{time(entry.at)}</Caption>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-lg border border-neutral-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-[#0A0A0A]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">
              {data && t('confirmTitle', { code: data.code })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('confirmBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="h-8 rounded-md text-xs">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction className="h-8 rounded-md text-xs" onClick={handleConfirmRedeem}>
              {t('confirmOk')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Modal */}
      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent className="sm:max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-[#0A0A0A]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {data ? t('reopenTitle', { code: data.code }) : t('reopen')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('reopenDescription')}</p>
          <Form {...reopenForm}>
            <form onSubmit={reopenForm.handleSubmit(submitReopen)} className="space-y-4 pt-1">
              <FormField
                control={reopenForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">{t('reopenReasonLabel')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        maxLength={500}
                        placeholder={t('reopenReasonPlaceholder')}
                        className="rounded-md text-xs resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md text-xs"
                  onClick={() => setReopenOpen(false)}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 rounded-md text-xs"
                  disabled={reopen.isPending}
                >
                  {t('reopenSubmit')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
