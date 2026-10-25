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
import { ArrowLeft, Gift, ScanLine } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useState } from 'react';
import { LogoMark } from '@/components/logo';
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
export function RedeemDesk({ orgId }: { orgId: string }) {
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
    <div className="flex h-dvh flex-col" style={{ background: token.colorBgLayout }}>
      <Flex
        align="center"
        gap="small"
        className="px-4 py-3"
        style={{
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Link href={`/orgs/${orgId}/labs/builder` as Route} aria-label={t('backToLab')}>
          <Button type="text" icon={<ArrowLeft size={16} />} aria-label={t('backToLab')} />
        </Link>
        <LogoMark className="size-6" aria-hidden />
        <Typography.Title level={5} className="m-0">
          {t('title')}
        </Typography.Title>
      </Flex>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Flex vertical gap="large" className="mx-auto w-full max-w-[520px] p-4">
          <Card>
            <form onSubmit={submit}>
              <Flex vertical gap="middle">
                <Typography.Text type="secondary">{t('subtitle')}</Typography.Text>
                <label htmlFor="redeem-code">
                  <Typography.Text strong>{t('codeLabel')}</Typography.Text>
                </label>
                <Space.Compact className="w-full">
                  <Input
                    id="redeem-code"
                    value={input}
                    onChange={(e) => setInput(normalizeCode(e.target.value))}
                    placeholder={t('codePlaceholder')}
                    prefix={<ScanLine size={16} color={token.colorTextTertiary} />}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    autoFocus
                    allowClear
                    className="font-mono"
                    style={{ letterSpacing: 3, fontSize: token.fontSizeLG }}
                  />
                  <Button
                    type="primary"
                    htmlType="submit"
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
            <Card>
              <Result
                status="success"
                title={t('successTitle')}
                subTitle={t('successBody', { prize: justRedeemed.prizeName })}
                extra={
                  <Button type="primary" onClick={startOver}>
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
            <Card>
              <Flex vertical gap="middle">
                <Flex gap="middle" align="center">
                  {data.prize?.image ? (
                    // biome-ignore lint/performance/noImgElement: data-URL prize images
                    <img src={data.prize.image} alt="" width={64} height={64} />
                  ) : (
                    <Gift size={48} color={token.colorTextTertiary} />
                  )}
                  <Flex vertical className="min-w-0">
                    <Typography.Title level={4} className="m-0">
                      {data.prize?.name ?? t('unknownPrize')}
                    </Typography.Title>
                    <Typography.Text className="font-mono" type="secondary">
                      {data.voucher.code}
                    </Typography.Text>
                  </Flex>
                </Flex>
                {data.voucher.rehearsal && (
                  <Alert type="info" showIcon title={t('rehearsalNote')} />
                )}
                <Descriptions
                  column={1}
                  size="small"
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
                  <Button type="primary" block onClick={confirm} loading={redeem.isPending}>
                    {t('confirm')}
                  </Button>
                )}
              </Flex>
            </Card>
          ) : null}

          <Card title={t('sessionTitle')} size="small">
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
                    className="py-2"
                    style={{
                      borderTop: i ? `1px solid ${token.colorBorderSecondary}` : undefined,
                    }}
                  >
                    <Flex vertical className="min-w-0">
                      <Typography.Text strong ellipsis>
                        {entry.prizeName}
                      </Typography.Text>
                      <Typography.Text type="secondary" ellipsis>
                        {entry.campaignName}
                      </Typography.Text>
                    </Flex>
                    <Flex vertical align="end">
                      <Typography.Text className="font-mono">{entry.code}</Typography.Text>
                      <Typography.Text type="secondary">{time(entry.at)}</Typography.Text>
                    </Flex>
                  </Flex>
                ))}
              </Flex>
            )}
          </Card>
        </Flex>
      </div>
    </div>
  );
}
