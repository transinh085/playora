'use client';

import type { CampaignPrize, CampaignRules, PlayResult, VoucherStatus } from '@playora/contracts';
import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button, ButtonLink } from '@playora/ui/components/base/buttons/button';
import { Drawer, DrawerBody, DrawerHeader } from '@playora/ui/components/base/drawer/drawer';
import { Spinner } from '@playora/ui/components/base/spinner/spinner';
import { QRCodeSvg } from '@playora/ui/components/foundations/qr-code/qr-code';
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiFileCopyLine,
  RiGiftLine,
  RiInformationLine,
} from '@remixicon/react';
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
        <Chip variant="caption" color="neutral" data-status="redeemed">
          {l.redeemed}
        </Chip>
      );
    case 'expired':
      return (
        <Chip variant="caption" color="yellow" data-status="expired">
          {l.expired}
        </Chip>
      );
    case 'void':
      return (
        <Chip variant="caption" color="rose" data-status="void">
          {l.void}
        </Chip>
      );
    default:
      return (
        <Chip variant="caption" color="cyan" data-status="issued">
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
      className="inline-flex items-center gap-2 rounded-full bg-status-cyan-background px-3 py-1 text-caption-1-medium text-status-cyan-text"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-accent-600" />
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
        <Spinner size="md" />
      </div>
    );
  }
  if (vouchers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-text-tertiary">
        <RiGiftLine className="size-8 opacity-40" />
        <p className="text-body-regular">{l.empty}</p>
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
            className="flex items-center gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-3 shadow-xs"
            data-testid="voucher-row"
            data-status={status}
            style={{ opacity: status === 'issued' ? 1 : 0.6 }}
          >
            {voucher.prizeImage ? (
              <img src={voucher.prizeImage} alt="" className="size-10 rounded-lg object-cover" />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-lg bg-background-secondary-default text-icon-secondary">
                <RiGiftLine className="size-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-semibold text-text-primary">
                {voucher.prizeName ?? l.unknownPrize}
              </p>
              <div className="flex items-center gap-1.5 font-mono text-caption-1-medium">
                <span
                  className={
                    status !== 'issued' ? 'line-through text-text-tertiary' : 'text-text-primary'
                  }
                >
                  {voucher.code}
                </span>
                {status === 'issued' && (
                  <button
                    type="button"
                    onClick={() => handleCopy(voucher.code)}
                    className="text-icon-secondary hover:text-text-primary transition-colors"
                    aria-label="Copy"
                  >
                    {copiedCode === voucher.code ? (
                      <RiCheckLine className="size-3.5 text-accent-600" />
                    ) : (
                      <RiFileCopyLine className="size-3.5" />
                    )}
                  </button>
                )}
              </div>
              <p className="text-caption-1-regular text-text-tertiary">
                {l.issuedAt(voucher.issuedAt)}
              </p>
              {status === 'issued' && voucher.expiresAt && (
                <p className="text-caption-1-regular text-text-tertiary">
                  {l.expiresAt(voucher.expiresAt)}
                </p>
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
    <Drawer
      isOpen={open}
      onOpenChange={(v) => !v && onClose()}
      placement="bottom"
      aria-label={typeof title === 'string' ? title : 'Sheet'}
    >
      {title ? <DrawerHeader title={title} /> : null}
      <DrawerBody>{children}</DrawerBody>
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
      <div className="flex size-12 items-center justify-center rounded-full bg-status-cyan-background text-accent-600">
        <RiInformationLine className="size-6" />
      </div>
      <h3 className="text-title-3-semibold text-text-primary">{notice.title}</h3>
      <div className="flex flex-col items-center gap-1 text-body-regular text-text-secondary">
        <span>{notice.body}</span>
        {extraText && (
          <span
            data-testid={kind === 'noTurns' ? 'next-turn-notice' : 'open-days-notice'}
            className="text-caption-1-regular text-text-tertiary"
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
          <Chip variant="caption" color="yellow" className="w-fit">
            {l.rehearsalNote}
          </Chip>
        )}
        <ul className="m-0 flex flex-col gap-2 pl-5 text-body-regular text-text-primary">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {prizes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <h4 className="text-body-semibold text-text-primary">{l.prizes}</h4>
            <ul className="m-0 flex flex-col gap-1 pl-5 text-body-regular text-text-secondary">
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
          <details className="rounded-xl border border-separator-border bg-background-secondary-default p-3 text-body-regular">
            <summary className="cursor-pointer text-body-medium text-text-primary">
              {l.fullTerms}
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-caption-1-regular text-text-secondary">
              {terms}
            </p>
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
          <ButtonLink variant="ghost" href={pageHref} className="w-full">
            {l.openPage}
          </ButtonLink>
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
        <Button leadingIcon={RiGiftLine} className="rounded-full shadow-lg" onClick={onToggle}>
          {labels.voucher.show}
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute inset-x-3 bottom-3 z-10">
      <div className="flex flex-col items-center gap-2.5 rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-dropdown">
        <div className="flex w-full items-center justify-between">
          <span className="text-caption-1-medium text-text-secondary">{labels.voucher.title}</span>
          <button
            type="button"
            onClick={onToggle}
            aria-label={labels.voucher.collapse}
            className="rounded-full p-1 text-icon-secondary hover:bg-background-primary-hover hover:text-text-primary transition-colors"
          >
            <RiArrowDownSLine className="size-4" />
          </button>
        </div>
        <div className="rounded-xl border border-separator-border bg-white p-2 shadow-xs">
          <QRCodeSvg value={redeemUrl} size={132} />
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid="voucher-code"
            className={`font-mono text-title-2-semibold tracking-widest ${
              status && status !== 'issued'
                ? 'line-through text-text-tertiary'
                : 'text-text-primary'
            }`}
          >
            {code}
          </span>
          {(!status || status === 'issued') && (
            <button
              type="button"
              onClick={handleCopy}
              className="text-icon-secondary hover:text-text-primary transition-colors"
              aria-label="Copy"
            >
              {copied ? (
                <RiCheckLine className="size-4 text-accent-600" />
              ) : (
                <RiFileCopyLine className="size-4" />
              )}
            </button>
          )}
        </div>
        {status && status !== 'issued' ? (
          <VoucherStatusTag voucher={{ status, redeemedAt: null }} labels={labels} />
        ) : (
          <span className="text-caption-1-regular text-text-secondary">{labels.voucher.hint}</span>
        )}
        <LiveClock labels={labels} />
        <Button
          variant="secondary"
          leadingIcon={RiGiftLine}
          className="w-full rounded-full"
          onClick={onOpenPrizes}
        >
          {labels.myPrizes}
        </Button>
      </div>
    </div>
  );
}
