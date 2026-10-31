'use client';

import type { CampaignPrize, CampaignRules, PlayResult, VoucherStatus } from '@playora/contracts';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { QRCodeSvg } from '@playora/ui/components/qr-code';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@playora/ui/components/sheet';
import { Check, ChevronDown, Copy, Gift, Info, Loader2 } from '@playora/ui/icons';
import { type ReactNode, useEffect, useState } from 'react';
import type { CampaignPlayerLabels } from './labels';

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
        <Badge variant="secondary" data-status="redeemed" className="font-normal text-xs">
          {l.redeemed}
        </Badge>
      );
    case 'expired':
      return (
        <Badge
          variant="outline"
          data-status="expired"
          className="border-amber-500/50 text-amber-600 dark:text-amber-400 font-normal text-xs"
        >
          {l.expired}
        </Badge>
      );
    case 'void':
      return (
        <Badge variant="destructive" data-status="void" className="font-normal text-xs">
          {l.void}
        </Badge>
      );
    default:
      return (
        <Badge
          variant="default"
          data-status="issued"
          className="bg-teal-600 hover:bg-teal-600 text-white font-normal text-xs"
        >
          {l.notRedeemed}
        </Badge>
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
      className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-50/50 px-3 py-1 text-xs text-teal-800 dark:border-teal-400/20 dark:bg-teal-950/40 dark:text-teal-200"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-teal-500" />
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
}: {
  vouchers: readonly PlayerVoucher[];
  loading: boolean;
  labels: CampaignPlayerLabels;
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
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (vouchers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
        <Gift className="size-8 opacity-40" />
        <p className="text-sm">{l.empty}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5" data-testid="voucher-list">
      {vouchers.map((voucher) => {
        const status = voucherStatusOf(voucher);
        return (
          <div
            key={voucher.code}
            className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-xs"
            data-testid="voucher-row"
            data-status={status}
            style={{ opacity: status === 'issued' ? 1 : 0.6 }}
          >
            {voucher.prizeImage ? (
              <img src={voucher.prizeImage} alt="" className="size-10 rounded-lg object-cover" />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Gift className="size-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {voucher.prizeName ?? l.unknownPrize}
              </p>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span
                  className={
                    status !== 'issued'
                      ? 'line-through text-muted-foreground'
                      : 'font-medium text-foreground'
                  }
                >
                  {voucher.code}
                </span>
                {status === 'issued' && (
                  <button
                    type="button"
                    onClick={() => handleCopy(voucher.code)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Copy"
                  >
                    {copiedCode === voucher.code ? (
                      <Check className="size-3 text-teal-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{l.issuedAt(voucher.issuedAt)}</p>
              {status === 'issued' && voucher.expiresAt && (
                <p className="text-xs text-muted-foreground">{l.expiresAt(voucher.expiresAt)}</p>
              )}
            </div>
            <VoucherStatusTag voucher={voucher} labels={labels} />
          </div>
        );
      })}
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
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-3xl border-t border-border bg-card px-4 pb-6 pt-4 overflow-y-auto"
      >
        {title ? (
          <SheetHeader className="mb-3 text-left">
            <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          </SheetHeader>
        ) : (
          <SheetHeader className="sr-only">
            <SheetTitle>Sheet</SheetTitle>
          </SheetHeader>
        )}
        {children}
      </SheetContent>
    </Sheet>
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
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Info className="size-6" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{notice.title}</h3>
      <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
        <span>{notice.body}</span>
        {extraText && (
          <span
            data-testid={kind === 'noTurns' ? 'next-turn-notice' : 'open-days-notice'}
            className="text-xs text-muted-foreground"
          >
            {extraText}
          </span>
        )}
      </div>
      <Button className="mt-2 w-full rounded-full" onClick={onClose}>
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
          <Badge
            variant="outline"
            className="w-fit border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            {l.rehearsalNote}
          </Badge>
        )}
        <ul className="m-0 flex flex-col gap-2 pl-5 text-sm text-foreground">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {prizes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <h4 className="text-sm font-semibold text-foreground">{l.prizes}</h4>
            <ul className="m-0 flex flex-col gap-1 pl-5 text-sm text-muted-foreground">
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
          <details className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-foreground">{l.fullTerms}</summary>
            <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{terms}</p>
          </details>
        )}
        <Button className="w-full rounded-full" onClick={onClose}>
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
}: {
  open: boolean;
  onClose: () => void;
  vouchers: readonly PlayerVoucher[];
  loading: boolean;
  labels: CampaignPlayerLabels;
  /** Link to a standalone "Quà của tôi" page (Play `/[slug]/prizes`). */
  pageHref?: string;
}) {
  const l = labels.vouchers;
  return (
    <PhoneSheet open={open} onClose={onClose} title={l.title}>
      <div className="flex flex-col gap-4">
        <div className="flex justify-center">
          <LiveClock labels={labels} />
        </div>
        <VoucherList vouchers={vouchers} loading={loading} labels={labels} />
        {pageHref && (
          <Button variant="link" asChild className="w-full">
            <a href={pageHref}>{l.openPage}</a>
          </Button>
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
        <Button className="rounded-full gap-2 shadow-lg" onClick={onToggle}>
          <Gift size={16} />
          {labels.voucher.show}
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute inset-x-3 bottom-3 z-10">
      <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-xl">
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-muted-foreground">{labels.voucher.title}</span>
          <button
            type="button"
            onClick={onToggle}
            aria-label={labels.voucher.collapse}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronDown size={16} />
          </button>
        </div>
        <div className="rounded-xl border border-border/80 bg-white p-2 shadow-xs">
          <QRCodeSvg value={redeemUrl} size={132} />
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid="voucher-code"
            className={`font-mono text-xl font-bold tracking-widest ${
              status && status !== 'issued'
                ? 'line-through text-muted-foreground'
                : 'text-foreground'
            }`}
          >
            {code}
          </span>
          {(!status || status === 'issued') && (
            <button
              type="button"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Copy"
            >
              {copied ? <Check size={14} className="text-teal-600" /> : <Copy size={14} />}
            </button>
          )}
        </div>
        {status && status !== 'issued' ? (
          <VoucherStatusTag voucher={{ status, redeemedAt: null }} labels={labels} />
        ) : (
          <span className="text-xs text-muted-foreground">{labels.voucher.hint}</span>
        )}
        <LiveClock labels={labels} />
        <Button variant="outline" className="w-full rounded-full gap-2" onClick={onOpenPrizes}>
          <Gift size={16} />
          {labels.myPrizes}
        </Button>
      </div>
    </div>
  );
}
