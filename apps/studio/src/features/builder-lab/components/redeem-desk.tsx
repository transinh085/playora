'use client';

import { ApiError } from '@playora/api-client';
import { ErrorCode } from '@playora/contracts';
import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { InputBase } from '@playora/ui/components/base/input/input';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@playora/ui/components/base/modal/modal';
import { Skeleton } from '@playora/ui/components/base/skeleton/skeleton';
import { toast } from '@playora/ui/components/base/toast/toast';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Gift,
  RotateCcw,
  Search,
  Sparkles,
} from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Caption } from '@/components/caption';
import { PageHeader } from '@/components/page-header';
import { RedemptionUsageBanner } from '@/features/billing/components/usage-banner';
import { authClient, isOwnerRole } from '@/lib/auth-client';
import { useOrgMembers } from '../../members/api';
import { useRedeemVoucher, useReopenVoucher, useVoucherLookup, type VoucherLookup } from '../api';
import { campaignRoutes } from '../lib/routes';
import { normalizeCode } from './redeem/code';

interface SessionRedemption {
  code: string;
  prizeName: string;
  campaignName: string;
  redeemedAt: string;
}

function errorCode(error: unknown): string | null {
  return error instanceof ApiError ? error.code : null;
}

export function RedeemDesk({ orgId, standalone }: { orgId: string; standalone?: boolean }) {
  const t = useTranslations('builderLab.redeem');
  const tb = useTranslations('billing');
  const format = useFormatter();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = normalizeCode(searchParams.get('code') ?? '');

  const [input, setInput] = useState(initialCode);
  const [lookupCode, setLookupCode] = useState(initialCode);
  const [recent, setRecent] = useState<SessionRedemption[]>([]);
  const [justRedeemed, setJustRedeemed] = useState<VoucherLookup | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const { data: session } = authClient.useSession();
  const membersQuery = useOrgMembers(orgId);
  const currentMember = membersQuery.data?.members.find((m) => m.userId === session?.user.id);
  const isOwner = Boolean(currentMember && isOwnerRole(currentMember.role));

  const lookup = useVoucherLookup(orgId, lookupCode);
  const redeem = useRedeemVoucher(orgId);
  const reopen = useReopenVoucher(orgId);

  const submitLookup = (raw: string) => {
    const clean = normalizeCode(raw);
    setJustRedeemed(null);
    setInput(clean);
    setLookupCode(clean);
    const base = standalone ? `/orgs/${orgId}/redeem` : campaignRoutes(orgId).redeem;
    router.replace((clean ? `${base}?code=${clean}` : base) as Route);
  };

  const confirmRedeem = async (voucher: VoucherLookup) => {
    try {
      const updated = await redeem.mutateAsync(voucher.code);
      setJustRedeemed(updated);
      setRecent((prev) => [
        {
          code: updated.code,
          prizeName: updated.prize?.name ?? t('unknownPrize'),
          campaignName: updated.campaign.name,
          redeemedAt: updated.redeemedAt ?? new Date().toISOString(),
        },
        ...prev.filter((item) => item.code !== updated.code).slice(0, 9),
      ]);
      toast.success(t('successTitle'));
    } catch (err) {
      const code = errorCode(err);
      if (code === 'VOUCHER_ALREADY_REDEEMED') {
        toast.warning(t('alreadyRedeemedShort', { code: voucher.code }));
      } else if (code === ErrorCode.PLAN_REDEMPTION_LIMIT) {
        toast.warning(tb('redeemBlocked', { code: voucher.code }));
      } else {
        toast.error(t('genericError'));
      }
      lookup.refetch();
    }
  };

  const confirmReopen = async (voucher: VoucherLookup) => {
    const trimmed = reopenReason.trim();
    if (!trimmed) return;
    try {
      const updated = await reopen.mutateAsync({
        params: { orgId, code: voucher.code },
        body: { reason: trimmed },
      });
      setJustRedeemed(null);
      setRecent((prev) => prev.filter((item) => item.code !== updated.code));
      setIsReopenOpen(false);
      setReopenReason('');
      toast.success(t('reopenedSuccess', { code: voucher.code }));
      lookup.refetch();
    } catch {
      toast.error(t('genericError'));
    }
  };

  const voucher =
    justRedeemed && justRedeemed.code === lookupCode ? justRedeemed : (lookup.data ?? null);
  const notFound = lookup.isError && errorCode(lookup.error) === 'VOUCHER_NOT_FOUND';
  const redeemBlockedByPlan =
    redeem.isError && errorCode(redeem.error) === ErrorCode.PLAN_REDEMPTION_LIMIT;

  return (
    <div
      className={cx('flex flex-col gap-5', standalone && 'mx-auto max-w-xl p-4 sm:py-8')}
      data-testid="redeem-desk"
    >
      {standalone ? (
        <div>
          <h2 className="m-0 text-title-2-semibold text-text-primary">{t('title')}</h2>
          <Caption className="mt-0.5 block">{t('subtitle')}</Caption>
        </div>
      ) : (
        <PageHeader title={t('title')} description={t('subtitle')} />
      )}

      <RedemptionUsageBanner orgId={orgId} />

      {/* Lookup Input Card */}
      <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitLookup(input);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <InputBase
            aria-label={t('codeLabel')}
            value={input}
            onChange={(e) => setInput(normalizeCode(e.target.value))}
            placeholder={t('codePlaceholder')}
            maxLength={12}
            autoFocus
            fieldClassName="flex-1"
            className="font-mono text-title-3-semibold tracking-[0.22em] uppercase"
          />
          <Button
            type="submit"
            leadingIcon={Search}
            disabled={!normalizeCode(input) || lookup.isFetching}
            className="shrink-0 justify-center sm:px-6"
          >
            {t('check')}
          </Button>
        </form>
      </div>

      {lookupCode && lookup.isPending && (
        <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card">
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        </div>
      )}

      {lookupCode && notFound && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-3xl border border-rose-500/30 bg-notification-error-background p-5 text-text-error-primary shadow-card"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <div>
            <div className="text-body-semibold">{t('notFound', { code: lookupCode })}</div>
          </div>
        </div>
      )}

      {lookupCode && lookup.isError && !notFound && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-3xl border border-rose-500/30 bg-notification-error-background p-5 text-text-error-primary shadow-card"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <div>
            <div className="text-body-semibold">{t('genericError')}</div>
          </div>
        </div>
      )}

      {voucher && (
        <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card">
          <div className="flex flex-col gap-5">
            {justRedeemed?.code === voucher.code && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4 text-teal-900 dark:text-teal-200"
              >
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-teal-600 dark:text-teal-400" />
                <div>
                  <div className="text-body-semibold">{t('successTitle')}</div>
                  <div className="mt-0.5 text-body-2-regular">
                    {t('successBody', { prize: voucher.prize?.name ?? t('unknownPrize') })}
                  </div>
                </div>
              </div>
            )}

            {redeemBlockedByPlan && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200"
                data-testid="redeem-plan-blocked"
              >
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <div className="text-body-semibold">
                    {tb('redeemBlocked', { code: voucher.code })}
                  </div>
                </div>
              </div>
            )}

            {voucher.status === 'redeemed' && justRedeemed?.code !== voucher.code && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200"
              >
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <div className="text-body-semibold">
                    {voucher.redeemedAt
                      ? t('alreadyRedeemed', {
                          code: voucher.code,
                          time: format.dateTime(new Date(voucher.redeemedAt), {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }),
                        })
                      : t('alreadyRedeemedShort', { code: voucher.code })}
                  </div>
                </div>
              </div>
            )}

            {voucher.status === 'expired' && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default p-4 text-text-secondary"
              >
                <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                <div>
                  <div className="text-body-semibold">
                    {t('expiredAlert', { code: voucher.code })}
                  </div>
                </div>
              </div>
            )}

            {voucher.status === 'void' && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-notification-error-background p-4 text-text-error-primary"
              >
                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                <div>
                  <div className="text-body-semibold">{t('voidAlert', { code: voucher.code })}</div>
                </div>
              </div>
            )}

            {voucher.rehearsal && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200"
              >
                <Sparkles className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <div className="text-body-semibold">{t('rehearsalNote')}</div>
                </div>
              </div>
            )}

            {/* Prize Hero Block */}
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border-button-default bg-background-secondary-default">
                {voucher.prize?.image ? (
                  // biome-ignore lint/performance/noImgElement: dynamic prize image or data URI
                  <img
                    src={voucher.prize.image}
                    alt={voucher.prize.name}
                    className="size-11 object-contain"
                  />
                ) : (
                  <Gift className="size-7 text-accent-600 dark:text-accent-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-background-secondary-default px-2.5 py-0.5 font-mono text-body-semibold tracking-wider text-text-primary">
                    {voucher.code}
                  </code>
                  {voucher.status === 'redeemed' ? (
                    <Chip variant="subtle" color="neutral" className="m-0">
                      {t('redeemed')}
                    </Chip>
                  ) : voucher.status === 'expired' ? (
                    <Chip variant="subtle" color="neutral" className="m-0">
                      {t('expired')}
                    </Chip>
                  ) : voucher.status === 'void' ? (
                    <Chip variant="subtle" color="rose" className="m-0">
                      {t('void')}
                    </Chip>
                  ) : (
                    <Chip variant="subtle" color="lime" className="m-0">
                      {t('notRedeemed')}
                    </Chip>
                  )}
                  {voucher.rehearsal && (
                    <Chip variant="subtle" color="yellow" className="m-0">
                      {t('rehearsal')}
                    </Chip>
                  )}
                </div>
                <h3 className="m-0 mt-1.5 text-title-3-semibold text-text-primary">
                  {voucher.prize?.name ?? t('unknownPrize')}
                </h3>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-separator-border bg-background-secondary-default/40 p-4 sm:grid-cols-2">
              <div>
                <Caption className="block">{t('campaign')}</Caption>
                <span className="text-body-2-semibold text-text-primary">
                  {voucher.campaign.name}
                </span>
              </div>
              {voucher.playerName && (
                <div>
                  <Caption className="block">{t('player')}</Caption>
                  <span className="text-body-2-semibold text-text-primary">
                    {voucher.playerName}
                  </span>
                </div>
              )}
              <div>
                <Caption className="block">{t('issuedAt')}</Caption>
                <span className="text-body-2-regular text-text-primary">
                  {format.dateTime(new Date(voucher.issuedAt), {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              {voucher.expiresAt && (
                <div>
                  <Caption className="block">{t('expiresAt')}</Caption>
                  <span className="text-body-2-regular text-text-primary">
                    {format.dateTime(new Date(voucher.expiresAt), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              )}
              <div>
                <Caption className="block">{t('status')}</Caption>
                <span className="text-body-2-medium text-text-primary">
                  {voucher.status === 'redeemed' && voucher.redeemedAt
                    ? t('redeemedAt', {
                        time: format.dateTime(new Date(voucher.redeemedAt), {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }),
                      })
                    : voucher.status === 'expired'
                      ? t('expired')
                      : voucher.status === 'void'
                        ? t('void')
                        : t('notRedeemed')}
                </span>
              </div>
              {voucher.redeemedByName && (
                <div>
                  <Caption className="block">{t('redeemedBy')}</Caption>
                  <span className="text-body-2-regular text-text-primary">
                    {voucher.redeemedByName}
                  </span>
                </div>
              )}
            </div>

            {voucher.status === 'issued' ? (
              <>
                <Button
                  variant="primary"
                  leadingIcon={CheckCircle2}
                  disabled={redeem.isPending}
                  className="w-full justify-center"
                  onClick={() => setIsConfirmOpen(true)}
                >
                  {t('confirm')}
                </Button>

                <Modal isOpen={isConfirmOpen} onOpenChange={setIsConfirmOpen} size="sm">
                  <ModalHeader
                    title={t('confirmTitle', { code: voucher.code })}
                    description={t('confirmBody')}
                  />
                  <ModalFooter>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setIsConfirmOpen(false)}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        confirmRedeem(voucher);
                        setIsConfirmOpen(false);
                      }}
                    >
                      {t('confirmOk')}
                    </Button>
                  </ModalFooter>
                </Modal>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  leadingIcon={ArrowLeft}
                  className="flex-1 justify-center"
                  onClick={() => {
                    setInput('');
                    setLookupCode('');
                    setJustRedeemed(null);
                  }}
                >
                  {t('newCode')}
                </Button>

                {voucher.status === 'redeemed' && isOwner && (
                  <>
                    <Button
                      variant="secondary"
                      leadingIcon={RotateCcw}
                      disabled={reopen.isPending}
                      onClick={() => {
                        setReopenReason('');
                        setIsReopenOpen(true);
                      }}
                    >
                      {t('reopen')}
                    </Button>

                    <Modal isOpen={isReopenOpen} onOpenChange={setIsReopenOpen} size="sm">
                      <ModalHeader
                        title={t('reopenTitle', { code: voucher.code })}
                        description={t('reopenDescription')}
                      />
                      <ModalBody className="py-2">
                        <div className="space-y-1.5">
                          <label
                            htmlFor="reopen-reason-input"
                            className="text-body-2-medium text-text-primary"
                          >
                            {t('reopenReasonLabel')}
                          </label>
                          <InputBase
                            id="reopen-reason-input"
                            value={reopenReason}
                            onChange={(e) => setReopenReason(e.target.value)}
                            placeholder={t('reopenReasonPlaceholder')}
                            maxLength={240}
                            autoFocus
                          />
                        </div>
                      </ModalBody>
                      <ModalFooter>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => setIsReopenOpen(false)}
                        >
                          {t('cancel')}
                        </Button>
                        <Button
                          size="small"
                          disabled={!reopenReason.trim() || reopen.isPending}
                          onClick={() => confirmReopen(voucher)}
                        >
                          {t('reopenSubmit')}
                        </Button>
                      </ModalFooter>
                    </Modal>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Session History Card */}
      <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
        <div className="flex items-center justify-between border-b border-separator-border px-5 py-3.5">
          <h3 className="m-0 text-body-medium text-text-primary">{t('sessionTitle')}</h3>
          <span className="rounded-md border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-caption-1-medium tabular-nums text-text-secondary">
            {recent.length}
          </span>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Caption>{t('sessionEmpty')}</Caption>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-separator-border p-0">
            {recent.map((item) => (
              <li
                key={item.code}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-background-secondary-default/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Gift className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={
                          (standalone
                            ? `/orgs/${orgId}/redeem?code=${item.code}`
                            : `${campaignRoutes(orgId).redeem}?code=${item.code}`) as Route
                        }
                        onClick={() => submitLookup(item.code)}
                        className="font-mono text-body-2-semibold text-accent-600 hover:underline dark:text-accent-400"
                      >
                        {item.code}
                      </Link>
                      <span className="truncate text-body-2-medium text-text-primary">
                        {item.prizeName}
                      </span>
                    </div>
                    <Caption className="block">{item.campaignName}</Caption>
                  </div>
                </div>
                <Caption className="shrink-0 tabular-nums">
                  {format.dateTime(new Date(item.redeemedAt), { timeStyle: 'short' })}
                </Caption>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
