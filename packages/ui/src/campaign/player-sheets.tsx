'use client';

import type { CampaignPrize, CampaignRules, PlayResult, VoucherStatus } from '@playora/contracts';
import {
  Badge,
  Button,
  Collapse,
  Drawer,
  Empty,
  Flex,
  QRCode,
  Result,
  Spin,
  Tag,
  Typography,
  theme,
} from 'antd';
import { ChevronDown, Gift } from 'lucide-react';
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

/** Status tag: "Chưa đổi" (green), "Đã đổi", "Hết hạn", "Đã huỷ". */
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
      return <Tag data-status="redeemed">{l.redeemed}</Tag>;
    case 'expired':
      return (
        <Tag color="warning" data-status="expired">
          {l.expired}
        </Tag>
      );
    case 'void':
      return (
        <Tag color="error" data-status="void">
          {l.void}
        </Tag>
      );
    default:
      return (
        <Tag color="success" data-status="issued">
          {l.notRedeemed}
        </Tag>
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
    <Badge
      status="processing"
      data-testid="voucher-live-clock"
      text={<span className="font-mono tabular-nums">{labels.vouchers.liveClock(now)}</span>}
    />
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
  const { token } = theme.useToken();

  if (loading && vouchers.length === 0) {
    return (
      <Flex justify="center" className="py-6">
        <Spin />
      </Flex>
    );
  }
  if (vouchers.length === 0) return <Empty description={l.empty} />;
  return (
    <Flex vertical gap="small" data-testid="voucher-list">
      {vouchers.map((voucher) => {
        const status = voucherStatusOf(voucher);
        return (
          <Flex
            key={voucher.code}
            gap="middle"
            align="center"
            className="p-3"
            data-testid="voucher-row"
            data-status={status}
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              opacity: status === 'issued' ? 1 : 0.6,
            }}
          >
            {voucher.prizeImage ? (
              <img src={voucher.prizeImage} alt="" width={40} height={40} />
            ) : (
              <Gift size={32} color={token.colorTextTertiary} />
            )}
            <Flex vertical className="min-w-0 flex-1">
              <Typography.Text strong ellipsis>
                {voucher.prizeName ?? l.unknownPrize}
              </Typography.Text>
              <Typography.Text
                copyable={status === 'issued'}
                delete={status !== 'issued'}
                className="font-mono"
              >
                {voucher.code}
              </Typography.Text>
              <Typography.Text type="secondary">{l.issuedAt(voucher.issuedAt)}</Typography.Text>
              {status === 'issued' && voucher.expiresAt && (
                <Typography.Text type="secondary">{l.expiresAt(voucher.expiresAt)}</Typography.Text>
              )}
            </Flex>
            <VoucherStatusTag voucher={voucher} labels={labels} />
          </Flex>
        );
      })}
    </Flex>
  );
}

/** Bottom sheet rendered in place, so it stays inside the player box (which is `relative`). */
export function PhoneSheet({
  open,
  onClose,
  title,
  children,
  size = 'auto',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: number | string;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="bottom"
      title={title}
      size={size}
      getContainer={false}
      rootStyle={{ position: 'absolute' }}
      styles={{
        wrapper: {
          maxHeight: '85%',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
        },
      }}
      destroyOnHidden
    >
      {children}
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
    <Result
      status={kind === 'noTurns' ? 'info' : 'warning'}
      title={notice.title}
      subTitle={
        extraText ? (
          <Flex vertical gap={4} align="center">
            <span>{notice.body}</span>
            <Typography.Text
              type="secondary"
              data-testid={kind === 'noTurns' ? 'next-turn-notice' : 'open-days-notice'}
            >
              {extraText}
            </Typography.Text>
          </Flex>
        ) : (
          notice.body
        )
      }
      extra={
        <Button type="primary" onClick={onClose}>
          {notice.ok}
        </Button>
      }
    />
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
      <Flex vertical gap="middle">
        {rehearsal && <Tag color="gold">{l.rehearsalNote}</Tag>}
        <ul className="m-0 flex flex-col gap-2 pl-5">
          {lines.map((line) => (
            <li key={line}>
              <Typography.Text>{line}</Typography.Text>
            </li>
          ))}
        </ul>
        {prizes.length > 0 && (
          <div>
            <Typography.Title level={5}>{l.prizes}</Typography.Title>
            <ul className="m-0 flex flex-col gap-1 pl-5">
              {prizes.map((prize) => (
                <li key={prize.id}>
                  <Typography.Text>
                    {prize.quantity === undefined
                      ? prize.name
                      : l.prizeLine(prize.name, prize.quantity)}
                  </Typography.Text>
                </li>
              ))}
            </ul>
          </div>
        )}
        {terms && (
          <Collapse
            size="small"
            items={[
              {
                key: 'terms',
                label: l.fullTerms,
                children: (
                  <Typography.Paragraph className="m-0 whitespace-pre-wrap">
                    {terms}
                  </Typography.Paragraph>
                ),
              },
            ]}
          />
        )}
        <Button type="primary" block onClick={onClose}>
          {l.ok}
        </Button>
      </Flex>
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
    <PhoneSheet open={open} onClose={onClose} title={l.title} size="70%">
      <Flex vertical gap="middle">
        <LiveClock labels={labels} />
        <VoucherList vouchers={vouchers} loading={loading} labels={labels} />
        {pageHref && (
          <Button type="link" href={pageHref} block>
            {l.openPage}
          </Button>
        )}
      </Flex>
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
  const { token } = theme.useToken();
  const code = result.voucher?.code;
  if (!code) return null;

  if (!expanded) {
    return (
      <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center">
        <Button type="primary" shape="round" icon={<Gift size={16} />} onClick={onToggle}>
          {labels.voucher.show}
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute inset-x-3 bottom-3 z-10">
      <div
        className="flex flex-col items-center gap-2 p-4"
        style={{
          background: token.colorBgElevated,
          borderRadius: token.borderRadiusLG * 2,
          boxShadow: token.boxShadowSecondary,
        }}
      >
        <Flex justify="space-between" align="center" className="w-full">
          <Typography.Text type="secondary">{labels.voucher.title}</Typography.Text>
          <Button
            type="text"
            size="small"
            icon={<ChevronDown size={16} />}
            onClick={onToggle}
            aria-label={labels.voucher.collapse}
          />
        </Flex>
        <QRCode value={redeemUrl} size={132} bordered={false} />
        <Typography.Text
          strong
          copyable={!status || status === 'issued'}
          delete={Boolean(status && status !== 'issued')}
          className="font-mono"
          data-testid="voucher-code"
          style={{ fontSize: token.fontSizeHeading3, letterSpacing: 4 }}
        >
          {code}
        </Typography.Text>
        {status && status !== 'issued' ? (
          <VoucherStatusTag voucher={{ status, redeemedAt: null }} labels={labels} />
        ) : (
          <Typography.Text>{labels.voucher.hint}</Typography.Text>
        )}
        <LiveClock labels={labels} />
        <Button block onClick={onOpenPrizes} icon={<Gift size={16} />}>
          {labels.myPrizes}
        </Button>
      </div>
    </div>
  );
}
