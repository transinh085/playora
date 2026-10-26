'use client';

import type { CampaignPrize, CampaignRules, PlayResult } from '@playora/contracts';
import { Button, Drawer, Empty, Flex, QRCode, Result, Spin, Tag, Typography, theme } from 'antd';
import { ChevronDown, Gift } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CampaignPlayerLabels } from './labels';

/** The rules the player is told about (a subset of the contract `CampaignRules`). */
export type CampaignPlayerRules = Pick<
  CampaignRules,
  'startsAt' | 'endsAt' | 'openingHours' | 'playsPerDay' | 'maxWinsPerPlayer' | 'collectForm'
>;

/** One voucher in "Quà của tôi". `prizeName` is null when the prize left the campaign. */
export interface PlayerVoucher {
  code: string;
  prizeName: string | null;
  prizeImage?: string;
  issuedAt: string;
  redeemedAt: string | null;
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

/** "Out of turns" / "closed" notice (docs/product/specs/builder.md §3.1 result branches). */
export function NoticeSheet({
  kind,
  onClose,
  labels,
}: {
  kind: 'noTurns' | 'closed' | null;
  onClose: () => void;
  labels: CampaignPlayerLabels;
}) {
  const notice = kind ? labels.notice[kind] : null;
  return (
    <PhoneSheet open={kind !== null} onClose={onClose}>
      {notice && (
        <Result
          status={kind === 'noTurns' ? 'info' : 'warning'}
          title={notice.title}
          subTitle={notice.body}
          extra={
            <Button type="primary" onClick={onClose}>
              {notice.ok}
            </Button>
          }
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
}: {
  open: boolean;
  onClose: () => void;
  rules: CampaignPlayerRules;
  prizes: readonly Pick<CampaignPrize, 'id' | 'name' | 'quantity'>[];
  rehearsal: boolean;
  labels: CampaignPlayerLabels;
}) {
  const l = labels.rules;
  const lines = [
    l.window(rules.startsAt, rules.endsAt),
    rules.openingHours ? l.hours(rules.openingHours.start, rules.openingHours.end) : l.allDay,
    l.playsPerDay(rules.playsPerDay),
    l.maxWins(rules.maxWinsPerPlayer),
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
                  <Typography.Text>{l.prizeLine(prize.name, prize.quantity)}</Typography.Text>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button type="primary" block onClick={onClose}>
          {l.ok}
        </Button>
      </Flex>
    </PhoneSheet>
  );
}

/** "Quà của tôi": every voucher this player won. */
export function MyPrizesSheet({
  open,
  onClose,
  vouchers,
  loading,
  labels,
}: {
  open: boolean;
  onClose: () => void;
  vouchers: readonly PlayerVoucher[];
  loading: boolean;
  labels: CampaignPlayerLabels;
}) {
  const l = labels.vouchers;
  const { token } = theme.useToken();

  return (
    <PhoneSheet open={open} onClose={onClose} title={l.title} size="70%">
      {loading ? (
        <Flex justify="center" className="py-6">
          <Spin />
        </Flex>
      ) : vouchers.length === 0 ? (
        <Empty description={l.empty} />
      ) : (
        <Flex vertical gap="small">
          {vouchers.map((voucher) => (
            <Flex
              key={voucher.code}
              gap="middle"
              align="center"
              className="p-3"
              style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
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
                <Typography.Text copyable className="font-mono">
                  {voucher.code}
                </Typography.Text>
                <Typography.Text type="secondary">{l.issuedAt(voucher.issuedAt)}</Typography.Text>
              </Flex>
              {voucher.redeemedAt ? (
                <Tag>{l.redeemed}</Tag>
              ) : (
                <Tag color="success">{l.notRedeemed}</Tag>
              )}
            </Flex>
          ))}
        </Flex>
      )}
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
}: {
  result: PlayResult;
  redeemUrl: string;
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
          copyable
          className="font-mono"
          style={{ fontSize: token.fontSizeHeading3, letterSpacing: 4 }}
        >
          {code}
        </Typography.Text>
        <Typography.Text>{labels.voucher.hint}</Typography.Text>
        <Button block onClick={onOpenPrizes} icon={<Gift size={16} />}>
          {labels.myPrizes}
        </Button>
      </div>
    </div>
  );
}
