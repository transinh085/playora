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
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
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
import { AlertCircle, AlertTriangle, CheckCircle2, Gift, RotateCcw, ScanLine } from 'lucide-react';
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
    <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex w-full flex-col gap-4">
        <Card className="rounded-2xl border">
          <CardContent className="p-4 sm:p-5">
            <form onSubmit={submit} className="space-y-3">
              <label htmlFor="redeem-code" className="block text-sm font-semibold">
                {t('codeLabel')}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="redeem-code"
                    value={input}
                    onChange={(e) => setInput(normalizeCode(e.target.value))}
                    placeholder={t('codePlaceholder')}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    autoFocus
                    className="h-11 pl-9 font-mono text-base tracking-widest uppercase"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="rounded-full px-6"
                  disabled={lookup.isFetching || input.length < 4}
                >
                  {t('check')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {planBlocked && (
          <Alert variant="destructive" data-testid="redeem-plan-limit">
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
                  <Button variant="outline" size="sm">
                    {tBilling('viewPlan')}
                  </Button>
                </Link>
              )}
            </div>
          </Alert>
        )}

        {justRedeemed ? (
          <Card className="rounded-2xl border p-6 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="text-lg font-bold">{t('successTitle')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('successBody', { prize: justRedeemed.prizeName })}
            </p>
            <Button size="lg" className="mt-5 w-full rounded-full" onClick={startOver}>
              {t('newCode')}
            </Button>
          </Card>
        ) : notFound ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>{t('notFound', { code })}</AlertTitle>
          </Alert>
        ) : lookupError ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>
              {lookupError instanceof ApiError && tErrors.has(lookupError.code)
                ? tErrors(lookupError.code)
                : t('genericError')}
            </AlertTitle>
          </Alert>
        ) : data ? (
          <Card className="rounded-2xl border">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                {data.prize.image ? (
                  // biome-ignore lint/performance/noImgElement: prize image
                  <img
                    src={data.prize.image}
                    alt=""
                    width={64}
                    height={64}
                    className="size-16 shrink-0 rounded-xl border object-cover"
                  />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                    <Gift className="size-8" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="truncate text-base font-bold">{data.prize.name}</h4>
                  <span className="font-mono text-sm text-muted-foreground">{data.code}</span>
                </div>
              </div>

              {data.rehearsal && (
                <Alert>
                  <AlertCircle className="size-4" />
                  <AlertTitle>{t('rehearsalNote')}</AlertTitle>
                </Alert>
              )}

              <div className="divide-y rounded-xl border p-3 text-xs">
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">{t('campaign')}</span>
                  <span className="font-medium">{data.campaign.name}</span>
                </div>
                {data.playerName && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">{t('player')}</span>
                    <span className="font-medium">{data.playerName}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">{t('issuedAt')}</span>
                  <span>{time(data.issuedAt)}</span>
                </div>
                {data.expiresAt && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">{t('expiresAt')}</span>
                    <span>{time(data.expiresAt)}</span>
                  </div>
                )}
                {data.redeemedByName && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">{t('redeemedBy')}</span>
                    <span>{data.redeemedByName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground">{t('status')}</span>
                  <div className="flex items-center gap-1.5">
                    {data.status === 'redeemed' && data.redeemedAt ? (
                      <Badge variant="secondary">
                        {t('redeemedAt', { time: time(data.redeemedAt) })}
                      </Badge>
                    ) : data.status === 'expired' ? (
                      <Badge variant="secondary" className="text-amber-600">
                        {t('expired')}
                      </Badge>
                    ) : data.status === 'void' ? (
                      <Badge variant="destructive">{t('void')}</Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
                        {t('notRedeemed')}
                      </Badge>
                    )}
                    {data.rehearsal && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                        {t('rehearsal')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {data.status === 'redeemed' ? (
                <div className="space-y-3">
                  <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
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
                      className="w-full gap-2 rounded-full"
                      onClick={() => setReopenOpen(true)}
                    >
                      <RotateCcw className="size-4" />
                      {t('reopen')}
                    </Button>
                  )}
                </div>
              ) : data.status === 'expired' ? (
                <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle>{t('expiredAlert', { code: data.code })}</AlertTitle>
                </Alert>
              ) : data.status === 'void' ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>{t('voidAlert', { code: data.code })}</AlertTitle>
                </Alert>
              ) : (
                canRedeem && (
                  <Button
                    size="lg"
                    className="w-full rounded-full"
                    onClick={() => setConfirmOpen(true)}
                    disabled={redeem.isPending}
                  >
                    {t('confirm')}
                  </Button>
                )
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div>
        <Card className="rounded-2xl border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">{t('sessionTitle')}</CardTitle>
            <Caption>{session.length}</Caption>
          </CardHeader>
          <CardContent className="p-4">
            {session.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                {t('sessionEmpty')}
              </div>
            ) : (
              <div className="divide-y">
                {session.map((entry) => (
                  <div key={entry.code} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {entry.prizeName}
                      </span>
                      <Caption className="truncate">{entry.campaignName}</Caption>
                    </div>
                    <div className="text-right">
                      <span className="block font-mono text-xs font-semibold">{entry.code}</span>
                      <Caption>{time(entry.at)}</Caption>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{data && t('confirmTitle', { code: data.code })}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRedeem}>{t('confirmOk')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Modal */}
      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{data ? t('reopenTitle', { code: data.code }) : t('reopen')}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{t('reopenDescription')}</p>
          <Form {...reopenForm}>
            <form onSubmit={reopenForm.handleSubmit(submitReopen)} className="space-y-4">
              <FormField
                control={reopenForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('reopenReasonLabel')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        maxLength={500}
                        placeholder={t('reopenReasonPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setReopenOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={reopen.isPending}>
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
