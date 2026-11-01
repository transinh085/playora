'use client';

import { Button, buttonVariants, Chip, Drawer, Spinner } from '@heroui/react';
import type { CampaignPrize, CampaignRules, PlayResult, VoucherStatus } from '@playora/contracts';
import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckLine,
  RiDownload2Line,
  RiFileCopyLine,
  RiGiftLine,
  RiInformationLine,
  RiKey2Line,
} from '@remixicon/react';
import { type ReactNode, useEffect, useState } from 'react';
import { QRCodeSvg } from '../components/foundations/qr-code/qr-code';
import type { CampaignPlayerLabels } from './labels';

/**
 * Generates a clean PNG voucher card via `<canvas>` and shares via Web Share API (if supported)
 * or triggers a `<a download="voucher-<CODE>.png">` download (PRZ-16).
 */
export async function saveVoucherCardPng(input: {
  code: string;
  prizeName?: string | null;
  expiresText?: string | null;
  hintText: string;
}): Promise<void> {
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PHIẾU ĐỔI QUÀ PLAYORA', canvas.width / 2, 76);

    if (input.prizeName) {
      ctx.fillStyle = '#18181b';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(input.prizeName, canvas.width / 2, 136);
    }

    ctx.fillStyle = '#18181b';
    ctx.font = 'bold 64px monospace';
    ctx.fillText(input.code, canvas.width / 2, 232);

    ctx.fillStyle = '#52525b';
    ctx.font = '20px sans-serif';
    ctx.fillText(input.hintText, canvas.width / 2, 296);

    if (input.expiresText) {
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(input.expiresText, canvas.width / 2, 344);
    }
  }

  const blob: Blob | null = await new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((b) => resolve(b), 'image/png');
    } else {
      resolve(null);
    }
  });

  const fileName = `voucher-${input.code}.png`;
  if (blob && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        return;
      }
    } catch {
      // Fall back to direct download when Web Share is dismissed or unsupported.
    }
  }

  const dataUrl =
    blob && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(blob)
      : typeof canvas.toDataURL === 'function'
        ? canvas.toDataURL('image/png')
        : '';
  const a = document.createElement('a');
  a.href = dataUrl || 'data:image/png;base64,';
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * The rules the player is told about (a subset of the contract `CampaignRules`).
 * `maxWinsPerPlayer` is unknown on the public player and its line is then left out.
 */
export type CampaignPlayerRules = Pick<
  CampaignRules,
  'startsAt' | 'endsAt' | 'openingHours' | 'playsPerDay' | 'collectForm'
> & {
  maxWinsPerPlayer?: number;
  openDays?: readonly number[] | null;
};

/** A prize as the player sees it; `quantity` is unknown on the public player (stock stays private). */
export type PlayerPrize = Pick<CampaignPrize, 'id' | 'name' | 'image'> & { quantity?: number };

/** One voucher in "Quà của tôi". `prizeName` is null when the prize left the campaign. */
export interface PlayerVoucher {
  code: string;
  prizeName: string | null;
  prizeImage?: string;
  issuedAt: string;
  redeemedAt: string | null;
  /** Server status (redeemed at the counter, expired, void); derived from `redeemedAt` when absent. */
  status?: VoucherStatus;
  expiresAt?: string | null;
}

/** The voucher's status as the player should see it. */
export function voucherStatusOf(
  voucher: Pick<PlayerVoucher, 'status' | 'redeemedAt'>,
): VoucherStatus {
  return voucher.status ?? (voucher.redeemedAt ? 'redeemed' : 'issued');
}

/** Status tag: "Chưa đổi" (green/teal), "Đã đổi", "Hết hạn", "Đã huỷ". */
export function VoucherStatusTag({
  voucher,
  labels,
}: {
  voucher: Pick<PlayerVoucher, 'status' | 'redeemedAt'>;
  labels: CampaignPlayerLabels;
}) {
  const l = labels.vouchers;
  switch (voucherStatusOf(voucher)) {
    case 'redeemed':
      return (
        <Chip variant="soft" size="sm" color="default" data-status="redeemed">
          {l.redeemed}
        </Chip>
      );
    case 'expired':
      return (
        <Chip variant="soft" size="sm" color="warning" data-status="expired">
          {l.expired}
        </Chip>
      );
    case 'void':
      return (
        <Chip variant="soft" size="sm" color="danger" data-status="void">
          {l.void}
        </Chip>
      );
    default:
      return (
        <Chip variant="soft" size="sm" color="accent" data-status="issued">
          {l.notRedeemed}
        </Chip>
      );
  }
}

/**
 * A clock ticking every second next to the vouchers (docs/product/specs/prizes-redemption.md §6.2):
 * staff can tell a live screen from a screenshot. Client-only, so it never mismatches on hydration.
 */
export function LiveClock({ labels }: { labels: CampaignPlayerLabels }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;
  return (
    <div
      data-testid="voucher-live-clock"
      className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-caption-1-medium text-accent-soft-foreground"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-accent" />
      </span>
      <span className="font-mono tabular-nums">{labels.vouchers.liveClock(now)}</span>
    </div>
  );
}

/** Every voucher this player won, with its live server status. */
export function VoucherList({
  vouchers,
  loading,
  labels,
  redeemUrl,
}: {
  vouchers: readonly PlayerVoucher[];
  loading: boolean;
  labels: CampaignPlayerLabels;
  redeemUrl?: (code: string) => string;
}) {
  const l = labels.vouchers;
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  if (loading && vouchers.length === 0) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="md" />
      </div>
    );
  }
  if (vouchers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted">
        <RiGiftLine className="size-8 opacity-40" />
        <p className="text-body-regular">{l.empty}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5" data-testid="voucher-list">
      {vouchers.map((voucher) => {
        const status = voucherStatusOf(voucher);
        const qrValue = redeemUrl ? redeemUrl(voucher.code) : voucher.code;
        const expiresText = voucher.expiresAt ? l.expiresAt(voucher.expiresAt) : null;
        return (
          <div
            key={voucher.code}
            className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3 shadow-xs"
            data-testid="voucher-row"
            data-status={status}
            style={{ opacity: status === 'issued' ? 1 : 0.6 }}
          >
            <div className="flex items-center gap-3">
              {voucher.prizeImage ? (
                <img src={voucher.prizeImage} alt="" className="size-10 rounded-lg object-cover" />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-lg bg-surface-secondary text-muted">
                  <RiGiftLine className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-semibold text-foreground">
                  {voucher.prizeName ?? l.unknownPrize}
                </p>
                <div className="flex items-center gap-1.5 font-mono text-caption-1-medium">
                  <span
                    className={status !== 'issued' ? 'text-muted line-through' : 'text-foreground'}
                  >
                    {voucher.code}
                  </span>
                  {status === 'issued' && (
                    <button
                      type="button"
                      onClick={() => handleCopy(voucher.code)}
                      className="text-muted transition-colors hover:text-foreground"
                      aria-label="Copy"
                    >
                      {copiedCode === voucher.code ? (
                        <RiCheckLine className="size-3.5 text-accent" />
                      ) : (
                        <RiFileCopyLine className="size-3.5" />
                      )}
                    </button>
                  )}
                </div>
                <p className="text-caption-1-regular text-muted">{l.issuedAt(voucher.issuedAt)}</p>
                {status === 'issued' && expiresText && (
                  <p className="text-caption-1-regular text-muted">{expiresText}</p>
                )}
              </div>
              <VoucherStatusTag voucher={voucher} labels={labels} />
            </div>
            {status === 'issued' && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-secondary p-2.5">
                <div className="rounded-lg border border-separator bg-white p-1.5 shadow-xs">
                  <QRCodeSvg value={qrValue} size={76} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-end gap-1.5 text-right">
                  <span className="text-caption-1-regular text-muted">{labels.voucher.hint}</span>
                  <button
                    type="button"
                    onClick={() =>
                      void saveVoucherCardPng({
                        code: voucher.code,
                        prizeName: voucher.prizeName,
                        expiresText,
                        hintText: labels.voucher.hint,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-caption-1-medium text-foreground shadow-xs hover:bg-surface-secondary"
                  >
                    <RiDownload2Line className="size-3.5" />
                    {labels.voucher.saveImage ?? 'Lưu mã'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Self-service voucher restoration box (`POST /p/:slug/prizes/restore`, PRZ-16). */
export function VoucherRestoreBox({
  labels,
  onRestorePrizes,
  defaultOpen = false,
}: {
  labels: CampaignPlayerLabels;
  onRestorePrizes: (phone: string, codeSuffix: string) => Promise<void>;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [phone, setPhone] = useState('');
  const [codeSuffix, setCodeSuffix] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const submit = async () => {
    if (phone.trim().length < 8 || codeSuffix.trim().length < 4 || busy) return;
    setBusy(true);
    setError(null);
    setRestored(false);
    try {
      await onRestorePrizes(phone.trim(), codeSuffix.trim().slice(-4).toUpperCase());
      setRestored(true);
      setCodeSuffix('');
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : (labels.vouchers.restoreNotFound ??
              'Không tìm thấy mã quà khớp với số điện thoại và 4 ký tự cuối đã nhập'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="voucher-restore-box"
      className="rounded-2xl border border-border bg-surface-secondary/60 p-3"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left text-caption-1-medium text-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <RiKey2Line className="size-4 text-accent" />
          {labels.vouchers.restoreTitle ?? 'Không thấy quà? Khôi phục'}
        </span>
        {open ? <RiArrowUpSLine className="size-4" /> : <RiArrowDownSLine className="size-4" />}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2.5">
          <p className="text-caption-1-regular text-muted">
            {labels.vouchers.restoreHint ??
              'Nhập số điện thoại đã đăng ký và 4 ký tự cuối của một mã quà bạn đã trúng.'}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-caption-1-medium text-foreground">
                {labels.vouchers.restorePhoneLabel ?? labels.canvas.phone}
              </span>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={labels.form.phonePlaceholder}
                className="h-9 rounded-lg border border-border bg-surface px-2.5 text-caption-1-regular text-foreground outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-caption-1-medium text-foreground">
                {labels.vouchers.restoreSuffixLabel ?? '4 ký tự cuối mã quà'}
              </span>
              <input
                type="text"
                maxLength={6}
                value={codeSuffix}
                onChange={(e) => setCodeSuffix(e.target.value.toUpperCase())}
                placeholder={labels.vouchers.restoreSuffixPlaceholder ?? 'VD: M2QX'}
                className="h-9 rounded-lg border border-border bg-surface px-2.5 font-mono text-caption-1-medium uppercase tracking-widest text-foreground outline-none focus:border-accent"
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="text-caption-1-medium text-danger">
              {error}
            </p>
          )}
          {restored && (
            <p className="text-caption-1-medium text-accent">
              {labels.vouchers.restoreSuccess ?? 'Đã khôi phục mã quà của bạn'}
            </p>
          )}
          <Button
            size="sm"
            fullWidth
            isDisabled={busy || phone.trim().length < 8 || codeSuffix.trim().length < 4}
            onPress={() => void submit()}
          >
            {labels.vouchers.restoreSubmit ?? 'Khôi phục mã quà'}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Bottom sheet rendered inside the player box. */
export function PhoneSheet({
  open,
  onClose,
  title,
  children,
  size: _size,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: number | string;
}) {
  return (
    <Drawer isOpen={open} onOpenChange={(v) => !v && onClose()}>
      <Drawer.Backdrop isDismissable>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog aria-label={typeof title === 'string' ? title : 'Sheet'}>
            <Drawer.CloseTrigger />
            {title ? (
              <Drawer.Header>
                <Drawer.Heading>{title}</Drawer.Heading>
              </Drawer.Header>
            ) : null}
            <Drawer.Body>{children}</Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

/** Content rendered inside NoticeSheet, exported for direct testing without portal requirements. */
export function NoticeContent({
  kind,
  onClose,
  labels,
  nextTurnAtFormatted,
  openDaysFormatted,
}: {
  kind: 'noTurns' | 'closed';
  onClose: () => void;
  labels: CampaignPlayerLabels;
  nextTurnAtFormatted?: string | null;
  openDaysFormatted?: string | null;
}) {
  const notice = labels.notice[kind];
  const extraText =
    kind === 'noTurns' && nextTurnAtFormatted
      ? notice?.nextTurn
        ? notice.nextTurn(nextTurnAtFormatted)
        : `Lượt tiếp theo: ${nextTurnAtFormatted}`
      : kind === 'closed' && openDaysFormatted
        ? notice?.openDays
          ? notice.openDays(openDaysFormatted)
          : `Ngày mở: ${openDaysFormatted}`
        : null;

  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <RiInformationLine className="size-6" />
      </div>
      <h3 className="text-title-3-semibold text-foreground">{notice.title}</h3>
      <div className="flex flex-col items-center gap-1 text-body-regular text-muted">
        <span>{notice.body}</span>
        {extraText && (
          <span
            data-testid={kind === 'noTurns' ? 'next-turn-notice' : 'open-days-notice'}
            className="text-caption-1-regular text-muted"
          >
            {extraText}
          </span>
        )}
      </div>
      <Button fullWidth className="mt-2 rounded-full" onPress={onClose}>
        {notice.ok}
      </Button>
    </div>
  );
}

/** "Out of turns" / "closed" notice (docs/product/specs/builder.md §3.1 result branches). */
export function NoticeSheet({
  kind,
  onClose,
  labels,
  nextTurnAtFormatted,
  openDaysFormatted,
}: {
  kind: 'noTurns' | 'closed' | null;
  onClose: () => void;
  labels: CampaignPlayerLabels;
  nextTurnAtFormatted?: string | null;
  openDaysFormatted?: string | null;
}) {
  return (
    <PhoneSheet open={kind !== null} onClose={onClose}>
      {kind && (
        <NoticeContent
          kind={kind}
          onClose={onClose}
          labels={labels}
          nextTurnAtFormatted={nextTurnAtFormatted}
          openDaysFormatted={openDaysFormatted}
        />
      )}
    </PhoneSheet>
  );
}

/** Plain-language rules generated from the campaign's settings. */
export function RulesSheet({
  open,
  onClose,
  rules,
  prizes,
  rehearsal,
  labels,
  openDaysFormatted,
  terms,
}: {
  open: boolean;
  onClose: () => void;
  rules: CampaignPlayerRules;
  prizes: readonly PlayerPrize[];
  terms?: string;
  rehearsal: boolean;
  labels: CampaignPlayerLabels;
  openDaysFormatted?: string | null;
}) {
  const l = labels.rules;
  const lines = [
    l.window(rules.startsAt, rules.endsAt),
    rules.openingHours ? l.hours(rules.openingHours.start, rules.openingHours.end) : l.allDay,
    ...(openDaysFormatted && l.openDays ? [l.openDays(openDaysFormatted)] : []),
    l.playsPerDay(rules.playsPerDay),
    ...(rules.maxWinsPerPlayer === undefined ? [] : [l.maxWins(rules.maxWinsPerPlayer)]),
    ...(rules.collectForm ? [l.form] : []),
    l.fairness,
    l.redeem,
  ];
  return (
    <PhoneSheet open={open} onClose={onClose} title={l.title}>
      <div className="flex flex-col gap-4">
        {rehearsal && (
          <Chip variant="soft" size="sm" color="warning" className="w-fit">
            {l.rehearsalNote}
          </Chip>
        )}
        <ul className="m-0 flex flex-col gap-2 pl-5 text-body-regular text-foreground">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {prizes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <h4 className="text-body-semibold text-foreground">{l.prizes}</h4>
            <ul className="m-0 flex flex-col gap-1 pl-5 text-body-regular text-muted">
              {prizes.map((prize) => (
                <li key={prize.id}>
                  {prize.quantity === undefined
                    ? prize.name
                    : l.prizeLine(prize.name, prize.quantity)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {terms && (
          <details className="rounded-xl border border-separator bg-surface-secondary p-3 text-body-regular">
            <summary className="cursor-pointer text-body-medium text-foreground">
              {l.fullTerms}
            </summary>
            <p className="mt-2 text-caption-1-regular whitespace-pre-wrap text-muted">{terms}</p>
          </details>
        )}
        <Button fullWidth className="rounded-full" onPress={onClose}>
          {l.ok}
        </Button>
      </div>
    </PhoneSheet>
  );
}

/** "Quà của tôi": every voucher this player won, with a live clock (anti-screenshot). */
export function MyPrizesSheet({
  open,
  onClose,
  vouchers,
  loading,
  labels,
  pageHref,
  redeemUrl,
  onRestorePrizes,
  defaultOpenRestore = false,
}: {
  open: boolean;
  onClose: () => void;
  vouchers: readonly PlayerVoucher[];
  loading: boolean;
  labels: CampaignPlayerLabels;
  /** Link to a standalone "Quà của tôi" page (Play `/[slug]/prizes`). */
  pageHref?: string;
  redeemUrl?: (code: string) => string;
  onRestorePrizes?: (phone: string, codeSuffix: string) => Promise<void>;
  defaultOpenRestore?: boolean;
}) {
  const l = labels.vouchers;
  return (
    <PhoneSheet open={open} onClose={onClose} title={l.title}>
      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          <LiveClock labels={labels} />
        </div>
        <VoucherList vouchers={vouchers} loading={loading} labels={labels} redeemUrl={redeemUrl} />
        {onRestorePrizes && (
          <VoucherRestoreBox
            labels={labels}
            onRestorePrizes={onRestorePrizes}
            defaultOpen={defaultOpenRestore}
          />
        )}
        {pageHref && (
          <a href={pageHref} className={buttonVariants({ variant: 'ghost', fullWidth: true })}>
            {l.openPage}
          </a>
        )}
      </div>
    </PhoneSheet>
  );
}

/**
 * Floating card over the win screen with the voucher code and its QR (docs/research/guandayun-teardown.md §3.4: staff
 * scan or type it at the counter). The QR encodes `redeemUrl`.
 */
export function VoucherCard({
  result,
  redeemUrl,
  expanded,
  onToggle,
  onOpenPrizes,
  labels,
  status,
}: {
  result: PlayResult;
  redeemUrl: string;
  /** Live server status of this voucher, once "Quà của tôi" knows it. */
  status?: VoucherStatus;
  expanded: boolean;
  onToggle: () => void;
  onOpenPrizes: () => void;
  labels: CampaignPlayerLabels;
}) {
  const [copied, setCopied] = useState(false);
  const code = result.voucher?.code;
  if (!code) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!expanded) {
    return (
      <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center">
        <Button className="rounded-full shadow-lg" onPress={onToggle}>
          <RiGiftLine className="size-4" aria-hidden />
          {labels.voucher.show}
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute inset-x-3 bottom-3 z-10">
      <div className="flex flex-col items-center gap-2.5 rounded-3xl border border-border bg-surface p-4 shadow-overlay">
        <div className="flex w-full items-center justify-between">
          <span className="text-caption-1-medium text-muted">{labels.voucher.title}</span>
          <button
            type="button"
            onClick={onToggle}
            aria-label={labels.voucher.collapse}
            className="rounded-full p-1 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <RiArrowDownSLine className="size-4" />
          </button>
        </div>
        <div className="rounded-xl border border-separator bg-white p-2 shadow-xs">
          <QRCodeSvg value={redeemUrl} size={132} />
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid="voucher-code"
            className={`font-mono text-title-2-semibold tracking-widest ${
              status && status !== 'issued' ? 'text-muted line-through' : 'text-foreground'
            }`}
          >
            {code}
          </span>
          {(!status || status === 'issued') && (
            <button
              type="button"
              onClick={handleCopy}
              className="text-muted transition-colors hover:text-foreground"
              aria-label="Copy"
            >
              {copied ? (
                <RiCheckLine className="size-4 text-accent" />
              ) : (
                <RiFileCopyLine className="size-4" />
              )}
            </button>
          )}
        </div>
        {status && status !== 'issued' ? (
          <VoucherStatusTag voucher={{ status, redeemedAt: null }} labels={labels} />
        ) : (
          <span className="text-caption-1-regular text-muted">{labels.voucher.hint}</span>
        )}
        <LiveClock labels={labels} />
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            variant="secondary"
            fullWidth
            className="rounded-full"
            onPress={() =>
              void saveVoucherCardPng({
                code,
                prizeName: result.prize?.name ?? null,
                expiresText: result.voucher?.expiresAt
                  ? labels.vouchers.expiresAt(result.voucher.expiresAt)
                  : null,
                hintText: labels.voucher.hint,
              })
            }
          >
            <RiDownload2Line className="size-4" aria-hidden />
            {labels.voucher.saveImage ?? 'Lưu mã'}
          </Button>
          <Button variant="secondary" fullWidth className="rounded-full" onPress={onOpenPrizes}>
            <RiGiftLine className="size-4" aria-hidden />
            {labels.myPrizes}
          </Button>
        </div>
      </div>
    </div>
  );
}
