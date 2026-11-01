'use client';

import { ApiError } from '@playora/api-client';
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
import {
  ArrowLeft,
  CheckCircle2,
  Gift,
  LogOut,
  Phone,
  QrCode,
  RotateCcw,
  Search,
  Smartphone,
  Sparkles,
} from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Caption } from '@/components/caption';
import { PageHeader } from '@/components/page-header';
import { RedemptionUsageBanner } from '@/features/billing/components/usage-banner';
import { authClient, isOwnerRole } from '@/lib/auth-client';
import {
  clearCounterDeviceSession,
  getCounterDeviceMeta,
  getCounterDeviceToken,
  type StoredCounterDeviceMeta,
  saveCounterDeviceSession,
} from '@/lib/counter-device';
import { useCounterDeviceMe, useOrgMembers, usePairCounterDevice } from '../../members/api';
import {
  useRedeemVoucher,
  useReopenVoucher,
  useSearchVouchersByPhone,
  useVoucherLookup,
  type VoucherLookup,
} from '../api';
import { campaignRoutes } from '../lib/routes';
import { isValidReopenReason, normalizeCode, type ScannedRedeemPayload } from './redeem/code';
import { playRedeemFeedback } from './redeem/feedback';
import { QrScannerPanel } from './redeem/qr-scanner-panel';

interface SessionRedemption {
  code: string;
  prizeName: string;
  campaignName: string;
  redeemedAt: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function errorCode(error: unknown): string | null {
  return error instanceof ApiError ? error.code : null;
}

export function RedeemDesk({ orgId, standalone }: { orgId: string; standalone?: boolean }) {
  const t = useTranslations('builderLab.redeem');
  const format = useFormatter();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = normalizeCode(searchParams.get('code') ?? '');
  const pairParam = searchParams.get('pair')?.trim() ?? '';

  const [activeTab, setActiveTab] = useState<'code' | 'phone'>('code');
  const [input, setInput] = useState(initialCode);
  const [lookupCode, setLookupCode] = useState(initialCode);
  const [lookupVia, setLookupVia] = useState<'code' | 'qr'>('code');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneResults, setPhoneResults] = useState<VoucherLookup[] | null>(null);
  const [phoneRateLimited, setPhoneRateLimited] = useState(false);

  const [recent, setRecent] = useState<SessionRedemption[]>([]);
  const [lastHanded, setLastHanded] = useState<VoucherLookup | null>(null);
  const [reopenTarget, setReopenTarget] = useState<VoucherLookup | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  const [deviceMeta, setDeviceMeta] = useState<StoredCounterDeviceMeta | null>(null);
  const [storeLabel, setStoreLabel] = useState('');
  const [pairingError, setPairingError] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const { data: session } = authClient.useSession();
  const hasUserSession = Boolean(session?.user.id);
  const membersQuery = useOrgMembers(orgId, hasUserSession);
  const currentMember = membersQuery.data?.members.find((m) => m.userId === session?.user.id);
  const isOwner = Boolean(currentMember && isOwnerRole(currentMember.role));

  const hasDeviceToken = Boolean(deviceMeta || getCounterDeviceToken());
  const counterDeviceMe = useCounterDeviceMe(orgId, hasDeviceToken);
  const pairCounterDevice = usePairCounterDevice();

  const lookup = useVoucherLookup(orgId, lookupCode);
  const redeem = useRedeemVoucher(orgId);
  const reopen = useReopenVoucher(orgId);
  const searchByPhone = useSearchVouchersByPhone(orgId);

  const pairedOnceRef = useRef<string | null>(null);
  const lastFeedbackKeyRef = useRef<string>('');

  // Load saved counter device meta & storeLabel on mount
  useEffect(() => {
    const syncDevice = () => {
      const meta = getCounterDeviceMeta();
      setDeviceMeta(meta && meta.organizationId === orgId ? meta : null);
      if (meta?.storeLabel) {
        setStoreLabel(meta.storeLabel);
      } else {
        try {
          const savedStore = window.localStorage.getItem(`playora:redeem-store:${orgId}`) ?? '';
          setStoreLabel(savedStore);
        } catch {
          // Ignore
        }
      }
    };
    syncDevice();
    window.addEventListener('playora:counter-device-changed', syncDevice);
    return () => window.removeEventListener('playora:counter-device-changed', syncDevice);
  }, [orgId]);

  // Listen for PWA beforeinstallprompt (PRZ-18)
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const handlePairCode = async (codeToPair: string) => {
    setPairingError(false);
    try {
      const res = await pairCounterDevice.mutateAsync({
        body: { pairingCode: codeToPair },
      });
      saveCounterDeviceSession(res.deviceToken, res.device);
      setDeviceMeta(res.device);
      if (res.device.storeLabel) setStoreLabel(res.device.storeLabel);
      toast.success(t('pairingSuccess', { label: res.device.label }));
      const base = standalone ? `/orgs/${orgId}/redeem` : campaignRoutes(orgId).redeem;
      router.replace(base as Route);
    } catch {
      setPairingError(true);
      toast.error(t('pairingError'));
    }
  };

  // Auto-exchange ?pair=<token> on mount (ORG-10)
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once per pairParam
  useEffect(() => {
    if (!pairParam || pairedOnceRef.current === pairParam) return;
    pairedOnceRef.current = pairParam;
    void handlePairCode(pairParam);
  }, [pairParam]);

  // Trigger audio + haptic feedback when lookup settles (PRZ-10)
  useEffect(() => {
    if (!lookupCode || lookup.isFetching) return;
    if (lookup.data) {
      const key = `${lookup.data.code}:${lookup.data.status}:${lookup.data.redeemedAt ?? ''}`;
      if (lastFeedbackKeyRef.current !== key) {
        lastFeedbackKeyRef.current = key;
        playRedeemFeedback(lookup.data.status === 'issued' ? 'valid' : 'invalid');
      }
    } else if (lookup.isError) {
      const key = `${lookupCode}:error`;
      if (lastFeedbackKeyRef.current !== key) {
        lastFeedbackKeyRef.current = key;
        playRedeemFeedback('invalid');
      }
    }
  }, [lookupCode, lookup.isFetching, lookup.data, lookup.isError]);

  const submitLookup = (raw: string, via: 'code' | 'qr' = 'code') => {
    const clean = normalizeCode(raw);
    setLookupVia(via);
    setInput(clean);
    setLookupCode(clean);
    const base = standalone ? `/orgs/${orgId}/redeem` : campaignRoutes(orgId).redeem;
    router.replace((clean ? `${base}?code=${clean}` : base) as Route);
  };

  const handleCodeInputChange = (raw: string) => {
    const clean = normalizeCode(raw);
    setInput(clean);
    // Auto-lookup immediately when a standard 6-character voucher code is entered (PRZ-10)
    if (clean.length === 6 && clean !== lookupCode) {
      submitLookup(clean, 'code');
    }
  };

  const handleQrScan = (payload: ScannedRedeemPayload) => {
    if (payload.type === 'pair') {
      void handlePairCode(payload.pairingCode);
      return;
    }
    setActiveTab('code');
    submitLookup(payload.code, 'qr');
  };

  const confirmRedeem = async (
    voucher: VoucherLookup,
    via: 'code' | 'phone' | 'qr' = lookupVia,
  ) => {
    const effectiveStore = activeDevice?.storeLabel ?? (storeLabel.trim() || undefined);
    try {
      const updated = await redeem.mutateAsync({
        code: voucher.code,
        via,
        storeLabel: effectiveStore,
      });
      playRedeemFeedback('redeemed');
      setLastHanded(updated);
      setRecent((prev) => [
        {
          code: updated.code,
          prizeName: updated.prize?.name ?? t('unknownPrize'),
          campaignName: updated.campaign.name,
          redeemedAt: updated.redeemedAt ?? new Date().toISOString(),
        },
        ...prev.filter((item) => item.code !== updated.code).slice(0, 9),
      ]);

      if (via === 'phone') {
        setPhoneResults((prev) =>
          prev ? prev.filter((item) => item.code !== voucher.code) : null,
        );
      } else {
        // Ready the input immediately for the next customer in line (PRZ-10)
        setInput('');
        setLookupCode('');
        const base = standalone ? `/orgs/${orgId}/redeem` : campaignRoutes(orgId).redeem;
        router.replace(base as Route);
      }

      if (updated.rehearsal) {
        toast.success(t('trainingHandedToast'));
      } else {
        toast.success(t('successTitle'));
      }
    } catch (err) {
      playRedeemFeedback('invalid');
      const code = errorCode(err);
      if (code === 'VOUCHER_ALREADY_REDEEMED') {
        toast.warning(t('alreadyRedeemedShort', { code: voucher.code }));
      } else {
        toast.error(t('genericError'));
      }
      void lookup.refetch();
    }
  };

  const handlePhoneSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phoneInput.trim();
    if (!trimmed) return;
    setPhoneRateLimited(false);
    try {
      const res = await searchByPhone.mutateAsync(trimmed);
      setPhoneResults(res.items);
      playRedeemFeedback(res.items.length > 0 ? 'valid' : 'invalid');
    } catch (err) {
      playRedeemFeedback('invalid');
      if (err instanceof ApiError && err.status === 429) {
        setPhoneRateLimited(true);
      } else {
        toast.error(t('genericError'));
      }
    }
  };

  const confirmReopen = async () => {
    if (!reopenTarget || !isValidReopenReason(reopenReason)) return;
    const trimmed = reopenReason.trim();
    try {
      const updated = await reopen.mutateAsync({
        params: { orgId, code: reopenTarget.code },
        body: { reason: trimmed },
      });
      if (lastHanded?.code === updated.code) {
        setLastHanded(null);
      }
      setRecent((prev) => prev.filter((item) => item.code !== updated.code));
      setReopenTarget(null);
      setReopenReason('');
      toast.success(t('reopenedSuccess', { code: updated.code }));
      if (lookupCode === updated.code) {
        void lookup.refetch();
      }
    } catch {
      toast.error(t('genericError'));
    }
  };

  const activeDevice = counterDeviceMe.data?.device ?? deviceMeta;
  const voucher = lookup.data ?? null;
  const notFound = lookup.isError && errorCode(lookup.error) === 'VOUCHER_NOT_FOUND';
  const reopenTargetExpired = Boolean(
    reopenTarget?.expiresAt && new Date(reopenTarget.expiresAt).getTime() <= Date.now(),
  );

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

      {hasUserSession && <RedemptionUsageBanner orgId={orgId} />}

      {/* Active Counter Device Banner (ORG-10) */}
      {activeDevice && (
        <Card
          className="border border-teal-500/30 bg-teal-500/10 p-4"
          data-testid="active-counter-device-banner"
        >
          <Card.Content className="flex flex-wrap items-center justify-between gap-3 p-0">
            <div className="flex items-center gap-2.5">
              <Smartphone className="size-5 text-teal-600 dark:text-teal-400" />
              <span className="text-body-2-semibold text-text-primary">
                {t('counterDeviceActive', { label: activeDevice.label })}
              </span>
              {activeDevice.storeLabel && (
                <Chip size="sm" variant="soft" color="success">
                  {activeDevice.storeLabel}
                </Chip>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                clearCounterDeviceSession();
                setDeviceMeta(null);
              }}
              data-testid="disconnect-counter-device-btn"
            >
              <LogOut className="size-3.5" />
              {t('disconnectCounterDevice')}
            </Button>
          </Card.Content>
        </Card>
      )}

      {pairCounterDevice.isPending && (
        <Alert status="default">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('pairingInProgress')}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}

      {pairingError && (
        <Alert status="danger" data-testid="pairing-error-alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('pairingError')}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}

      {/* Compact "Vừa trao" Strip after 1-tap handover (PRZ-10) */}
      {lastHanded && (
        <Alert status="success" data-testid="just-redeemed-strip">
          <Alert.Indicator />
          <Alert.Content className="flex flex-1 flex-wrap items-center justify-between gap-3">
            <div>
              <Alert.Title>{t('successTitle')}</Alert.Title>
              <Alert.Description>
                {t('justHandedLabel', {
                  code: lastHanded.code,
                  prize: lastHanded.prize?.name ?? t('unknownPrize'),
                })}
              </Alert.Description>
            </div>
            {isOwner && !lastHanded.rehearsal && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setReopenReason('');
                  setReopenTarget(lastHanded);
                }}
                data-testid="just-redeemed-reopen-btn"
              >
                <RotateCcw className="size-3.5" />
                {t('reopen')}
              </Button>
            )}
          </Alert.Content>
        </Alert>
      )}

      {/* Counter Input & Mode Tabs Card */}
      <Card className="p-5">
        <Card.Content className="flex flex-col gap-4 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex rounded-xl bg-background-secondary-default p-1"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'code'}
                onClick={() => setActiveTab('code')}
                data-testid="redeem-tab-code"
                className={cx(
                  'flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-body-2-medium transition-colors',
                  activeTab === 'code'
                    ? 'bg-background-primary-default text-text-primary shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                <QrCode className="size-4" />
                {t('tabScanCode')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'phone'}
                onClick={() => setActiveTab('phone')}
                data-testid="redeem-tab-phone"
                className={cx(
                  'flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-body-2-medium transition-colors',
                  activeTab === 'phone'
                    ? 'bg-background-primary-default text-text-primary shadow-2xs'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                <Phone className="size-4" />
                {t('tabPhoneLookup')}
              </button>
            </div>

            {!activeDevice && (
              <div className="flex items-center gap-2">
                <Input
                  aria-label={t('storeLabelField')}
                  value={storeLabel}
                  onChange={(e) => {
                    const next = e.target.value;
                    setStoreLabel(next);
                    try {
                      window.localStorage.setItem(`playora:redeem-store:${orgId}`, next);
                    } catch {
                      // Ignore
                    }
                  }}
                  placeholder={t('storeLabelPlaceholder')}
                  maxLength={120}
                  className="w-44 text-xs"
                  data-testid="redeem-store-label-input"
                />
              </div>
            )}
          </div>

          {activeTab === 'code' ? (
            <div className="flex flex-col gap-3">
              <QrScannerPanel
                openLabel={t('openCamera')}
                closeLabel={t('closeCamera')}
                hintLabel={t('cameraHint')}
                permissionDeniedLabel={t('cameraPermissionDenied')}
                onScan={handleQrScan}
              />

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitLookup(input, 'code');
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
                    onChange={(e) => handleCodeInputChange(e.target.value)}
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
            </div>
          ) : (
            <div className="flex flex-col gap-4" data-testid="phone-lookup-panel">
              <form onSubmit={handlePhoneSearch} className="flex flex-col gap-3 sm:flex-row">
                <InputGroup className="flex-1">
                  <InputGroup.Prefix>
                    <Phone className="size-4 text-muted" />
                  </InputGroup.Prefix>
                  <InputGroup.Input
                    type="tel"
                    aria-label={t('phoneLabel')}
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder={t('phonePlaceholder')}
                    maxLength={20}
                    autoFocus
                  />
                </InputGroup>
                <Button
                  type="submit"
                  isDisabled={phoneInput.trim().length < 8 || searchByPhone.isPending}
                  className="shrink-0 justify-center sm:px-6"
                  data-testid="phone-search-submit"
                >
                  <Search className="size-4" />
                  {t('searchPhoneCta')}
                </Button>
              </form>

              {phoneRateLimited && (
                <Alert status="danger" data-testid="phone-rate-limited-alert">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{t('phoneRateLimited')}</Alert.Title>
                  </Alert.Content>
                </Alert>
              )}

              {phoneResults !== null &&
                (phoneResults.length === 0 ? (
                  <Alert status="default" data-testid="phone-empty-alert">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>{t('phoneEmpty')}</Alert.Title>
                    </Alert.Content>
                  </Alert>
                ) : (
                  <ul
                    className="m-0 flex list-none flex-col gap-3 p-0"
                    data-testid="phone-results-list"
                  >
                    {phoneResults.map((item) => (
                      <li
                        key={item.code}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4"
                        data-testid={`phone-result-${item.code}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-button-default bg-background-secondary-default">
                            {item.prize?.image ? (
                              // biome-ignore lint/performance/noImgElement: dynamic prize image
                              <img
                                src={item.prize.image}
                                alt={item.prize.name}
                                className="size-9 object-contain"
                              />
                            ) : (
                              <Gift className="size-6 text-emerald-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <code className="rounded-md bg-background-secondary-default px-2 py-0.5 font-mono text-body-2-semibold tracking-wider text-text-primary">
                                {item.code}
                              </code>
                              <span className="text-body-semibold text-text-primary">
                                {item.prize?.name ?? t('unknownPrize')}
                              </span>
                            </div>
                            <Caption className="block">
                              {item.campaign.name}
                              {item.playerName ? ` · ${item.playerName}` : ''}
                            </Caption>
                          </div>
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          isDisabled={redeem.isPending}
                          onClick={() => confirmRedeem(item, 'phone')}
                          data-testid={`phone-redeem-${item.code}`}
                        >
                          <CheckCircle2 className="size-4" />
                          {t('confirmHandover')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
          )}
        </Card.Content>
      </Card>

      {activeTab === 'code' && lookupCode && lookup.isPending && (
        <Card className="p-6">
          <Card.Content className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </Card.Content>
        </Card>
      )}

      {activeTab === 'code' && lookupCode && notFound && (
        <Alert status="danger" data-testid="redeem-not-found">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('notFound', { code: lookupCode })}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}

      {activeTab === 'code' && lookupCode && lookup.isError && !notFound && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('genericError')}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}

      {activeTab === 'code' && voucher && (
        <Card className="overflow-hidden p-6" data-testid="redeem-result">
          <Card.Content className="flex flex-col gap-5 p-0">
            {/* Training Mode Banner for rehearsal vouchers (PRZ-19) */}
            {voucher.rehearsal && (
              <div
                className="flex items-start gap-3 rounded-2xl border-2 border-amber-400 bg-amber-500/15 p-4 text-amber-950 dark:text-amber-100"
                data-testid="redeem-banner-training"
              >
                <Sparkles className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <div className="text-body-semibold tracking-wide uppercase">
                    {t('bannerTraining')}
                  </div>
                  <p className="m-0 mt-1 text-caption-1-regular opacity-90">
                    {t('bannerTrainingHint')}
                  </p>
                </div>
              </div>
            )}

            {/* Giant High-Contrast Counter Status Banner (PRZ-10) */}
            <div
              data-testid="redeem-status-banner"
              data-status={voucher.status}
              className={cx(
                'flex flex-col items-center justify-center rounded-2xl px-6 py-5 text-center shadow-sm',
                voucher.status === 'issued' && 'bg-emerald-600 text-white',
                voucher.status === 'redeemed' && 'bg-red-600 text-white',
                voucher.status === 'expired' && 'bg-amber-500 text-neutral-950',
                voucher.status === 'void' && 'bg-red-800 text-white',
              )}
            >
              <div className="text-title-2-semibold tracking-wider uppercase sm:text-title-1-semibold">
                {voucher.status === 'issued'
                  ? t('bannerRedeemable')
                  : voucher.status === 'redeemed'
                    ? voucher.redeemedAt
                      ? t('bannerAlreadyRedeemed', {
                          time: format.dateTime(new Date(voucher.redeemedAt), {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }),
                        })
                      : t('bannerAlreadyRedeemedShort')
                    : voucher.status === 'expired'
                      ? t('bannerExpired')
                      : t('bannerVoid')}
              </div>
            </div>

            {/* Prize Hero Block */}
            <div className="flex items-center gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border-button-default bg-background-secondary-default">
                {voucher.prize?.image ? (
                  // biome-ignore lint/performance/noImgElement: dynamic prize image or data URI
                  <img
                    src={voucher.prize.image}
                    alt={voucher.prize.name}
                    className="size-14 object-contain"
                  />
                ) : (
                  <Gift className="size-8 text-accent-600 dark:text-accent-400" />
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
                <h3 className="m-0 mt-1.5 text-title-2-semibold text-text-primary">
                  {voucher.prize?.name ?? t('unknownPrize')}
                </h3>
                {voucher.playerName && (
                  <p className="m-0 mt-0.5 text-body-2-semibold text-text-secondary">
                    {t('player')}: {voucher.playerName}
                  </p>
                )}
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
                    {voucher.storeLabel ? ` (${voucher.storeLabel})` : ''}
                  </span>
                </div>
              )}
            </div>

            {voucher.status === 'issued' ? (
              <Button
                variant="primary"
                size="lg"
                isDisabled={redeem.isPending}
                aria-label={`${t('confirmHandover')} · ${t('confirm')}`}
                className="min-h-13 w-full justify-center text-body-semibold"
                onClick={() => confirmRedeem(voucher, lookupVia)}
                data-testid="confirm-redeem-btn"
              >
                <CheckCircle2 className="size-5" />
                {t('confirmHandover')}
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="flex-1 justify-center"
                  onClick={() => {
                    setInput('');
                    setLookupCode('');
                  }}
                >
                  <ArrowLeft className="size-4" />
                  {t('newCode')}
                </Button>

                {voucher.status === 'redeemed' && isOwner && (
                  <Button
                    variant="secondary"
                    isDisabled={reopen.isPending}
                    onClick={() => {
                      setReopenReason('');
                      setReopenTarget(voucher);
                    }}
                    data-testid="open-reopen-modal-btn"
                  >
                    <RotateCcw className="size-4" />
                    {t('reopen')}
                  </Button>
                )}
              </div>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Owner Reopen Modal with 3..500 char validation & expiry warning (PRZ-11) */}
      <Modal
        isOpen={Boolean(reopenTarget)}
        onOpenChange={(open) => {
          if (!open) setReopenTarget(null);
        }}
      >
        <Modal.Backdrop isDismissable>
          <Modal.Container size="sm">
            <Modal.Dialog data-testid="reopen-voucher-modal">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>
                  {t('reopenTitle', { code: reopenTarget?.code ?? '' })}
                </Modal.Heading>
                <p className="mt-1 text-body-2-regular text-text-secondary">
                  {t('reopenDescription')}
                </p>
              </Modal.Header>
              <Modal.Body className="space-y-3 py-2">
                {reopenTargetExpired && reopenTarget?.expiresAt && (
                  <Alert status="warning" data-testid="reopen-expired-warning">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>
                        {t('reopenExpiredWarning', {
                          time: format.dateTime(new Date(reopenTarget.expiresAt), {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }),
                        })}
                      </Alert.Title>
                    </Alert.Content>
                  </Alert>
                )}
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
                    maxLength={500}
                    fullWidth
                    autoFocus
                  />
                  <Caption className="block">{t('reopenReasonMinHint')}</Caption>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" onClick={() => setReopenTarget(null)}>
                  {t('cancel')}
                </Button>
                <Button
                  size="sm"
                  isDisabled={!isValidReopenReason(reopenReason) || reopen.isPending}
                  onClick={confirmReopen}
                  data-testid="submit-reopen-btn"
                >
                  {t('reopenSubmit')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

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
                          onClick={() => {
                            setActiveTab('code');
                            submitLookup(item.code, 'code');
                          }}
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

      {/* PWA Add to Home Screen Hint (PRZ-18) */}
      <Card
        className="border border-separator-border bg-background-secondary-default/30 p-4"
        data-testid="pwa-install-card"
      >
        <Card.Content className="flex flex-wrap items-center justify-between gap-3 p-0">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 size-5 shrink-0 text-accent-600 dark:text-accent-400" />
            <div>
              <div className="text-body-2-semibold text-text-primary">{t('pwaInstallTitle')}</div>
              <Caption className="mt-0.5 block">{t('pwaInstallIosHint')}</Caption>
            </div>
          </div>
          {installPrompt && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void installPrompt.prompt();
                setInstallPrompt(null);
              }}
            >
              {t('pwaInstallAndroidCta')}
            </Button>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
