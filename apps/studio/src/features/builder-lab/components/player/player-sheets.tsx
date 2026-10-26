'use client';

import { Button, Drawer, Empty, Flex, QRCode, Result, Spin, Tag, Typography, theme } from 'antd';
import { ChevronDown, Gift } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useMyVouchers } from '../../mock/hooks';
import type { Campaign, PlayResult } from '../../mock/types';

/** Bottom sheet rendered in place, so it stays inside the phone frame (which is `relative`). */
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
}: {
  kind: 'noTurns' | 'closed' | null;
  onClose: () => void;
}) {
  const t = useTranslations('builderLab.player');
  return (
    <PhoneSheet open={kind !== null} onClose={onClose}>
      {kind && (
        <Result
          status={kind === 'noTurns' ? 'info' : 'warning'}
          title={t(`${kind}.title`)}
          subTitle={t(`${kind}.body`)}
          extra={
            <Button type="primary" onClick={onClose}>
              {t(`${kind}.ok`)}
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
  campaign,
  rehearsal,
}: {
  open: boolean;
  onClose: () => void;
  campaign: Campaign;
  rehearsal: boolean;
}) {
  const t = useTranslations('builderLab.player.rules');
  const format = useFormatter();
  const { rules, prizes } = campaign;
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'medium' });
  const lines = [
    t('window', { start: date(rules.startsAt), end: date(rules.endsAt) }),
    rules.openingHours
      ? t('hours', { start: rules.openingHours.start, end: rules.openingHours.end })
      : t('allDay'),
    t('playsPerDay', { count: rules.playsPerDay }),
    t('maxWins', { count: rules.maxWinsPerPlayer }),
    ...(rules.collectForm ? [t('form')] : []),
    t('fairness'),
    t('redeem'),
  ];
  return (
    <PhoneSheet open={open} onClose={onClose} title={t('title')}>
      <Flex vertical gap="middle">
        {rehearsal && <Tag color="gold">{t('rehearsalNote')}</Tag>}
        <ul className="m-0 flex flex-col gap-2 pl-5">
          {lines.map((line) => (
            <li key={line}>
              <Typography.Text>{line}</Typography.Text>
            </li>
          ))}
        </ul>
        {prizes.length > 0 && (
          <div>
            <Typography.Title level={5}>{t('prizes')}</Typography.Title>
            <ul className="m-0 flex flex-col gap-1 pl-5">
              {prizes.map((prize) => (
                <li key={prize.id}>
                  <Typography.Text>
                    {t('prizeLine', { name: prize.name, count: prize.quantity })}
                  </Typography.Text>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button type="primary" block onClick={onClose}>
          {t('ok')}
        </Button>
      </Flex>
    </PhoneSheet>
  );
}

/** "Quà của tôi": every voucher this player won in this run (live or rehearsal). */
export function MyPrizesSheet({
  open,
  onClose,
  campaignId,
  playerId,
  rehearsal,
}: {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  playerId: string;
  rehearsal: boolean;
}) {
  const t = useTranslations('builderLab.player.vouchers');
  const format = useFormatter();
  const { token } = theme.useToken();
  const vouchers = useMyVouchers(campaignId, playerId);
  const mine = (vouchers.data ?? []).filter((v) => v.rehearsal === rehearsal);

  return (
    <PhoneSheet open={open} onClose={onClose} title={t('title')} size="70%">
      {vouchers.isLoading ? (
        <Flex justify="center" className="py-6">
          <Spin />
        </Flex>
      ) : mine.length === 0 ? (
        <Empty description={t('empty')} />
      ) : (
        <Flex vertical gap="small">
          {mine.map((voucher) => (
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
              {voucher.prize?.image ? (
                // biome-ignore lint/performance/noImgElement: data-URL prize images
                <img src={voucher.prize.image} alt="" width={40} height={40} />
              ) : (
                <Gift size={32} color={token.colorTextTertiary} />
              )}
              <Flex vertical className="min-w-0 flex-1">
                <Typography.Text strong ellipsis>
                  {voucher.prize?.name ?? t('unknownPrize')}
                </Typography.Text>
                <Typography.Text copyable className="font-mono">
                  {voucher.code}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {t('issuedAt', {
                    time: format.dateTime(new Date(voucher.issuedAt), {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }),
                  })}
                </Typography.Text>
              </Flex>
              {voucher.redeemedAt ? (
                <Tag>{t('redeemed')}</Tag>
              ) : (
                <Tag color="success">{t('notRedeemed')}</Tag>
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
 * scan or type it at the counter). The QR opens the lab redeem desk with the code filled in.
 */
export function VoucherCard({
  result,
  redeemUrl,
  expanded,
  onToggle,
  onOpenPrizes,
}: {
  result: PlayResult;
  redeemUrl: string;
  expanded: boolean;
  onToggle: () => void;
  onOpenPrizes: () => void;
}) {
  const t = useTranslations('builderLab.player');
  const { token } = theme.useToken();
  if (!result.voucherCode) return null;

  if (!expanded) {
    return (
      <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center">
        <Button type="primary" shape="round" icon={<Gift size={16} />} onClick={onToggle}>
          {t('voucher.show')}
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
          <Typography.Text type="secondary">{t('voucher.title')}</Typography.Text>
          <Button
            type="text"
            size="small"
            icon={<ChevronDown size={16} />}
            onClick={onToggle}
            aria-label={t('voucher.collapse')}
          />
        </Flex>
        <QRCode value={redeemUrl} size={132} bordered={false} />
        <Typography.Text
          strong
          copyable
          className="font-mono"
          style={{ fontSize: token.fontSizeHeading3, letterSpacing: 4 }}
        >
          {result.voucherCode}
        </Typography.Text>
        <Typography.Text>{t('voucher.hint')}</Typography.Text>
        <Button block onClick={onOpenPrizes} icon={<Gift size={16} />}>
          {t('myPrizes')}
        </Button>
      </div>
    </div>
  );
}
