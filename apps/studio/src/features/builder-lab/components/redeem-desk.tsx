'use client';

import { ApiError } from '@playora/api-client';
import { ErrorCode } from '@playora/contracts';
import {
  Alert,
  Button,
  Card,
  Chip,
  Input,
  InputGroup,
  Modal,
  Skeleton,
  toast,
} from '@playora/ui/components';
import { ArrowLeft, CheckCircle2, Gift, RotateCcw, Search, Sparkles } from '@playora/ui/icons';
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
      <Card className="p-5">
        <Card.Content>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitLookup(input);
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <InputGroup className="flex-1">
              <InputGroup.Prefix>
                <Search className="size-4 text-muted" />
              </InputGroup.Prefix>
              <InputGroup.Input
                aria-label={t('codeLabel')}
                value={input}
                onChange={(e) => setInput(normalizeCode(e.target.value))}
                placeholder={t('codePlaceholder')}
                maxLength={12}
                autoFocus
                className="font-mono text-title-3-semibold tracking-[0.22em] uppercase"
              />
            </InputGroup>
            <Button
              type="submit"
              isDisabled={!normalizeCode(input) || lookup.isFetching}
              className="shrink-0 justify-center sm:px-6"
            >
              <Search className="size-4" />
              {t('check')}
            </Button>
          </form>
        </Card.Content>
      </Card>

      {lookupCode && lookup.isPending && (
        <Card className="p-6">
          <Card.Content className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </Card.Content>
        </Card>
      )}

      {lookupCode && notFound && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('notFound', { code: lookupCode })}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}

      {lookupCode && lookup.isError && !notFound && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('genericError')}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}

      {voucher && (
        <Card className="overflow-hidden p-6" data-testid="redeem-result">
          <Card.Content className="flex flex-col gap-5">
            {justRedeemed?.code === voucher.code && (
              <Alert status="success">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>{t('successTitle')}</Alert.Title>
                  <Alert.Description>
                    {t('successBody', { prize: voucher.prize?.name ?? t('unknownPrize') })}
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            {redeemBlockedByPlan && (
              <Alert status="warning" data-testid="redeem-plan-blocked">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>{tb('redeemBlocked', { code: voucher.code })}</Alert.Title>
                </Alert.Content>
              </Alert>
            )}

            {voucher.status === 'redeemed' && justRedeemed?.code !== voucher.code && (
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>
                    {voucher.redeemedAt
                      ? t('alreadyRedeemed', {
                          code: voucher.code,
                          time: format.dateTime(new Date(voucher.redeemedAt), {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }),
                        })
                      : t('alreadyRedeemedShort', { code: voucher.code })}
                  </Alert.Title>
                </Alert.Content>
              </Alert>
            )}

            {voucher.status === 'expired' && (
              <Alert status="default">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>{t('expiredAlert', { code: voucher.code })}</Alert.Title>
                </Alert.Content>
              </Alert>
            )}

            {voucher.status === 'void' && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>{t('voidAlert', { code: voucher.code })}</Alert.Title>
                </Alert.Content>
              </Alert>
            )}

            {voucher.rehearsal && (
              <Alert status="warning">
                <Alert.Indicator>
                  <Sparkles className="size-5" />
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Title>{t('rehearsalNote')}</Alert.Title>
                </Alert.Content>
              </Alert>
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
                    <Chip variant="soft" color="default" className="m-0">
                      {t('redeemed')}
                    </Chip>
                  ) : voucher.status === 'expired' ? (
                    <Chip variant="soft" color="default" className="m-0">
                      {t('expired')}
                    </Chip>
                  ) : voucher.status === 'void' ? (
                    <Chip variant="soft" color="danger" className="m-0">
                      {t('void')}
                    </Chip>
                  ) : (
                    <Chip variant="soft" color="success" className="m-0">
                      {t('notRedeemed')}
                    </Chip>
                  )}
                  {voucher.rehearsal && (
                    <Chip variant="soft" color="warning" className="m-0">
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
                  isDisabled={redeem.isPending}
                  className="w-full justify-center"
                  onClick={() => setIsConfirmOpen(true)}
                >
                  <CheckCircle2 className="size-4" />
                  {t('confirm')}
                </Button>

                <Modal isOpen={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                  <Modal.Backdrop isDismissable>
                    <Modal.Container size="sm">
                      <Modal.Dialog>
                        <Modal.CloseTrigger />
                        <Modal.Header>
                          <Modal.Heading>{t('confirmTitle', { code: voucher.code })}</Modal.Heading>
                          <p className="mt-1 text-body-2-regular text-text-secondary">
                            {t('confirmBody')}
                          </p>
                        </Modal.Header>
                        <Modal.Footer>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsConfirmOpen(false)}
                          >
                            {t('cancel')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              confirmRedeem(voucher);
                              setIsConfirmOpen(false);
                            }}
                          >
                            {t('confirmOk')}
                          </Button>
                        </Modal.Footer>
                      </Modal.Dialog>
                    </Modal.Container>
                  </Modal.Backdrop>
                </Modal>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="flex-1 justify-center"
                  onClick={() => {
                    setInput('');
                    setLookupCode('');
                    setJustRedeemed(null);
                  }}
                >
                  <ArrowLeft className="size-4" />
                  {t('newCode')}
                </Button>

                {voucher.status === 'redeemed' && isOwner && (
                  <>
                    <Button
                      variant="secondary"
                      isDisabled={reopen.isPending}
                      onClick={() => {
                        setReopenReason('');
                        setIsReopenOpen(true);
                      }}
                    >
                      <RotateCcw className="size-4" />
                      {t('reopen')}
                    </Button>

                    <Modal isOpen={isReopenOpen} onOpenChange={setIsReopenOpen}>
                      <Modal.Backdrop isDismissable>
                        <Modal.Container size="sm">
                          <Modal.Dialog>
                            <Modal.CloseTrigger />
                            <Modal.Header>
                              <Modal.Heading>
                                {t('reopenTitle', { code: voucher.code })}
                              </Modal.Heading>
                              <p className="mt-1 text-body-2-regular text-text-secondary">
                                {t('reopenDescription')}
                              </p>
                            </Modal.Header>
                            <Modal.Body className="py-2">
                              <div className="space-y-1.5">
                                <label
                                  htmlFor="reopen-reason-input"
                                  className="text-body-2-medium text-text-primary"
                                >
                                  {t('reopenReasonLabel')}
                                </label>
                                <Input
                                  id="reopen-reason-input"
                                  value={reopenReason}
                                  onChange={(e) => setReopenReason(e.target.value)}
                                  placeholder={t('reopenReasonPlaceholder')}
                                  maxLength={240}
                                  fullWidth
                                  autoFocus
                                />
                              </div>
                            </Modal.Body>
                            <Modal.Footer>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsReopenOpen(false)}
                              >
                                {t('cancel')}
                              </Button>
                              <Button
                                size="sm"
                                isDisabled={!reopenReason.trim() || reopen.isPending}
                                onClick={() => confirmReopen(voucher)}
                              >
                                {t('reopenSubmit')}
                              </Button>
                            </Modal.Footer>
                          </Modal.Dialog>
                        </Modal.Container>
                      </Modal.Backdrop>
                    </Modal>
                  </>
                )}
              </div>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Session History Card */}
      <Card className="overflow-hidden p-0">
        <Card.Header className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
          <Card.Title className="m-0 text-body-medium text-text-primary">
            {t('sessionTitle')}
          </Card.Title>
          <Chip size="sm" variant="soft" color="default" className="tabular-nums">
            {recent.length}
          </Chip>
        </Card.Header>
        <Card.Content>
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
        </Card.Content>
      </Card>
    </div>
  );
}
