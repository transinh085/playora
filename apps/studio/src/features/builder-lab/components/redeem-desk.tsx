'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Flex,
  Input,
  Result,
  Space,
  Tag,
  Typography,
  theme,
} from 'antd';
import { Gift, ScanLine } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useState } from 'react';
import { Caption } from '@/components/caption';
import { LabApiError, lookupVoucher } from '../mock/api';
import { useLabSync, useRedeemVoucher } from '../mock/hooks';
import { normalizeCode } from './redeem/code';

interface Redemption {
  code: string;
  prizeName: string;
  campaignName: string;
  at: string;
}

/**
 * Staff redemption desk (docs/14 §3.4 核销): type or scan the customer's code, check it, then
 * confirm. Redeeming is final, so it always goes through a confirm dialog.
 */
/** Counter screen for staff (docs/12 §11), inside the app shell; works one-handed on a phone. */
export function RedeemDesk() {
  useLabSync();
  const t = useTranslations('builderLab.redeem');
  const format = useFormatter();
  const { modal, message } = App.useApp();
  const { token } = theme.useToken();
  const [input, setInput] = useState('');
  const [code, setCode] = useState('');
  const [session, setSession] = useState<Redemption[]>([]);
  const [justRedeemed, setJustRedeemed] = useState<Redemption | null>(null);
  const redeem = useRedeemVoucher();

  // The player's QR links here with `?code=` filled in.
  useEffect(() => {
    const fromUrl = normalizeCode(new URLSearchParams(window.location.search).get('code') ?? '');
    if (fromUrl) {
      setInput(fromUrl);
      setCode(fromUrl);
    }
  }, []);

  // A query (not a one-off call) so another tab's redemption refreshes the card via `useLabSync`.
  const lookup = useQuery({
    queryKey: ['builder-lab', 'redeem-lookup', code],
    queryFn: () => lookupVoucher(code),
    enabled: code.length > 0,
    retry: false,
  });

  const time = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'short', timeStyle: 'short' });

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const next = normalizeCode(input);
    if (!next) return;
    setJustRedeemed(null);
    redeem.reset();
    if (next === code) void lookup.refetch();
    else setCode(next);
  };

  const confirm = () => {
    const data = lookup.data;
    if (!data) return;
    modal.confirm({
      title: t('confirmTitle', { code: data.voucher.code }),
      content: t('confirmBody'),
      okText: t('confirmOk'),
      cancelText: t('cancel'),
      onOk: async () => {
        try {
          const voucher = await redeem.mutateAsync(data.voucher.code);
          const entry: Redemption = {
            code: voucher.code,
            prizeName: data.prize?.name ?? t('unknownPrize'),
            campaignName: data.campaignName,
            at: voucher.redeemedAt ?? new Date().toISOString(),
          };
          setJustRedeemed(entry);
          setSession((list) => [entry, ...list]);
        } catch (error) {
          message.error(
            error instanceof LabApiError && error.code === 'VOUCHER_REDEEMED'
              ? t('alreadyRedeemedShort', { code: data.voucher.code })
              : t('genericError'),
          );
        }
      },
    });
  };

  const startOver = () => {
    setInput('');
    setCode('');
    setJustRedeemed(null);
  };

  const lookupError = lookup.error;
  const notFound = lookupError instanceof LabApiError && lookupError.code === 'VOUCHER_NOT_FOUND';
  const data = code && !lookupError ? lookup.data : undefined;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Flex vertical gap="large" className="w-full">
        <Card
          variant="borderless"
          style={{
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadiusLG,
          }}
        >
          <form onSubmit={submit}>
            <Flex vertical gap="middle">
              <label htmlFor="redeem-code">
                <Typography.Text strong style={{ fontSize: 15 }}>
                  {t('codeLabel')}
                </Typography.Text>
              </label>
              <Space.Compact className="w-full">
                <Input
                  id="redeem-code"
                  value={input}
                  onChange={(e) => setInput(normalizeCode(e.target.value))}
                  placeholder={t('codePlaceholder')}
                  prefix={<ScanLine size={18} color={token.colorTextTertiary} />}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  autoFocus
                  allowClear
                  size="large"
                  className="font-mono"
                  style={{ letterSpacing: 3, fontSize: token.fontSizeLG }}
                />
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={lookup.isFetching}
                  disabled={!input}
                >
                  {t('check')}
                </Button>
              </Space.Compact>
            </Flex>
          </form>
        </Card>

        {justRedeemed ? (
          <Card
            variant="borderless"
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
            }}
          >
            <Result
              status="success"
              title={t('successTitle')}
              subTitle={t('successBody', { prize: justRedeemed.prizeName })}
              extra={
                <Button type="primary" size="large" onClick={startOver}>
                  {t('newCode')}
                </Button>
              }
            />
          </Card>
        ) : notFound ? (
          <Alert type="error" showIcon title={t('notFound', { code })} />
        ) : lookupError ? (
          <Alert type="error" showIcon title={t('genericError')} />
        ) : data ? (
          <Card
            variant="borderless"
            style={{
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
            }}
          >
            <Flex vertical gap="middle">
              <Flex gap="middle" align="center">
                {data.prize?.image ? (
                  // biome-ignore lint/performance/noImgElement: data-URL prize images
                  <img
                    src={data.prize.image}
                    alt=""
                    width={64}
                    height={64}
                    className="rounded-lg border object-cover"
                  />
                ) : (
                  <div
                    className="flex items-center justify-center rounded-lg"
                    style={{ width: 64, height: 64, background: token.colorFillSecondary }}
                  >
                    <Gift size={36} color={token.colorPrimary} />
                  </div>
                )}
                <Flex vertical className="min-w-0">
                  <Typography.Title level={4} className="!m-0">
                    {data.prize?.name ?? t('unknownPrize')}
                  </Typography.Title>
                  <Typography.Text className="font-mono text-base" type="secondary">
                    {data.voucher.code}
                  </Typography.Text>
                </Flex>
              </Flex>
              {data.voucher.rehearsal && <Alert type="info" showIcon title={t('rehearsalNote')} />}
              <Descriptions
                column={1}
                size="small"
                bordered
                items={[
                  { key: 'campaign', label: t('campaign'), children: data.campaignName },
                  { key: 'issued', label: t('issuedAt'), children: time(data.voucher.issuedAt) },
                  {
                    key: 'status',
                    label: t('status'),
                    children: (
                      <Space size="small" wrap>
                        {data.voucher.redeemedAt ? (
                          <Tag>{t('redeemedAt', { time: time(data.voucher.redeemedAt) })}</Tag>
                        ) : (
                          <Tag color="success">{t('notRedeemed')}</Tag>
                        )}
                        {data.voucher.rehearsal && <Tag color="gold">{t('rehearsal')}</Tag>}
                      </Space>
                    ),
                  },
                ]}
              />
              {data.voucher.redeemedAt ? (
                <Alert
                  type="warning"
                  showIcon
                  title={t('alreadyRedeemed', {
                    code: data.voucher.code,
                    time: time(data.voucher.redeemedAt),
                  })}
                />
              ) : (
                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={confirm}
                  loading={redeem.isPending}
                >
                  {t('confirm')}
                </Button>
              )}
            </Flex>
          </Card>
        ) : null}
      </Flex>

      <div>
        <Card
          variant="borderless"
          title={t('sessionTitle')}
          style={{
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadiusLG,
          }}
          extra={<Caption>{session.length}</Caption>}
        >
          {session.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('sessionEmpty')} />
          ) : (
            <Flex vertical>
              {session.map((entry, i) => (
                <Flex
                  key={entry.code}
                  justify="space-between"
                  align="center"
                  gap="middle"
                  className="py-2.5"
                  style={{
                    borderTop: i ? `1px solid ${token.colorBorderSecondary}` : undefined,
                  }}
                >
                  <Flex vertical className="min-w-0">
                    <Typography.Text strong ellipsis>
                      {entry.prizeName}
                    </Typography.Text>
                    <Typography.Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                      {entry.campaignName}
                    </Typography.Text>
                  </Flex>
                  <Flex vertical align="end">
                    <Typography.Text className="font-mono text-xs font-semibold">
                      {entry.code}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {time(entry.at)}
                    </Typography.Text>
                  </Flex>
                </Flex>
              ))}
            </Flex>
          )}
        </Card>
      </div>
    </div>
  );
}
