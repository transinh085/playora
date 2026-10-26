'use client';

import { ApiError } from '@playora/api-client';
import { useRouteQuery } from '@playora/api-client/react';
import { ErrorCode, meApi, ReopenVoucherBody } from '@playora/contracts';
import { applyApiError, useZodForm } from '@playora/ui/form';
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Result,
  Space,
  Tag,
  Typography,
  theme,
} from 'antd';
import { Gift, RotateCcw, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useState } from 'react';
import { Caption } from '@/components/caption';
import { useInvalidateBilling } from '@/features/billing/api';
import { billingPath } from '@/features/billing/lib/plans';
import { api } from '@/lib/api';
import { can } from '@/lib/permissions';
import { useRedeemVoucher, useReopenVoucher, useVoucherLookup } from '../api';
import { normalizeCode } from './redeem/code';

interface Redemption {
  code: string;
  prizeName: string;
  campaignName: string;
  at: string;
}

/**
 * Staff redemption desk (docs/product/specs/prizes-redemption.md §6): type or scan the customer's code,
 * check it, then confirm. Designed to work one-handed on a phone at the counter ("Quầy đổi quà").
 * Owners can reopen a redeemed voucher with an audit reason.
 */
export function RedeemDesk({ orgId }: { orgId: string }) {
  const t = useTranslations('builderLab.redeem');
  const tErrors = useTranslations('errors');
  const tBilling = useTranslations('billing');
  const format = useFormatter();
  const { modal, message } = App.useApp();
  const { token } = theme.useToken();
  const myOrgs = useRouteQuery(api, meApi.orgs, {});
  const role = myOrgs.data?.items.find((o) => o.id === orgId)?.role;
  const canRedeem = role ? can(role, { voucher: ['redeem'] }) : true;
  const canReopen = can(role, { voucher: ['reopen'] });

  const [input, setInput] = useState('');
  const [code, setCode] = useState('');
  const [session, setSession] = useState<Redemption[]>([]);
  const [justRedeemed, setJustRedeemed] = useState<Redemption | null>(null);
  const [reopenOpen, setReopenOpen] = useState(false);
  /** Code refused because the plan's monthly redemptions are used up (D-21); it stays valid. */
  const [planBlocked, setPlanBlocked] = useState<string | null>(null);
  const invalidateBilling = useInvalidateBilling();
  const canSeePlan = can(role, { billing: ['read'] });

  const lookup = useVoucherLookup(orgId, code);
  const redeem = useRedeemVoucher(orgId);
  const reopen = useReopenVoucher(orgId);
  const reopenForm = useZodForm(ReopenVoucherBody);

  // The player's QR links here with `?code=` filled in.
  useEffect(() => {
    const fromUrl = normalizeCode(new URLSearchParams(window.location.search).get('code') ?? '');
    if (fromUrl) {
      setInput(fromUrl);
      setCode(fromUrl);
    }
  }, []);

  const time = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'short', timeStyle: 'short' });

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const next = normalizeCode(input);
    if (!next) return;
    setJustRedeemed(null);
    setPlanBlocked(null);
    redeem.reset();
    if (next === code) void lookup.refetch();
    else setCode(next);
  };

  const confirm = () => {
    const data = lookup.data;
    if (!data) return;
    modal.confirm({
      title: t('confirmTitle', { code: data.code }),
      content: t('confirmBody'),
      okText: t('confirmOk'),
      cancelText: t('cancel'),
      onOk: async () => {
        try {
          const voucher = await redeem.mutateAsync(data.code);
          const entry: Redemption = {
            code: voucher.code,
            prizeName: voucher.prize.name,
            campaignName: voucher.campaign.name,
            at: voucher.redeemedAt ?? new Date().toISOString(),
          };
          setJustRedeemed(entry);
          void invalidateBilling();
          setSession((list) => [entry, ...list.filter((item) => item.code !== entry.code)]);
        } catch (error) {
          if (error instanceof ApiError) {
            if (error.code === 'VOUCHER_ALREADY_REDEEMED') {
              message.error(t('alreadyRedeemedShort', { code: data.code }));
              void lookup.refetch();
              return;
            }
            if (error.code === ErrorCode.PLAN_REDEMPTION_LIMIT) {
              setPlanBlocked(data.code);
              void invalidateBilling();
              return;
            }
            if (tErrors.has(error.code)) {
              message.error(tErrors(error.code));
              void lookup.refetch();
              return;
            }
          }
          message.error(t('genericError'));
        }
      },
    });
  };

  const submitReopen = async () => {
    const data = lookup.data;
    if (!data) return;
    const raw = await reopenForm.form.validateFields().catch(() => null);
    if (!raw) return;
    const body = reopenForm.parse(raw);
    try {
      await reopen.mutateAsync({ params: { orgId, code: data.code }, body });
      setReopenOpen(false);
      reopenForm.form.resetFields();
      setSession((list) => list.filter((item) => item.code !== data.code));
      message.success(t('reopenedSuccess', { code: data.code }));
    } catch (err) {
      if (
        !applyApiError(reopenForm.form, err, (errCode) =>
          tErrors.has(errCode as never) ? tErrors(errCode as never) : t('genericError'),
        )
      ) {
        const msg =
          err instanceof ApiError && tErrors.has(err.code) ? tErrors(err.code) : t('genericError');
        message.error(msg);
      }
    }
  };

  const startOver = () => {
    setInput('');
    setCode('');
    setJustRedeemed(null);
    setPlanBlocked(null);
  };

  const lookupError = lookup.error;
  const notFound =
    lookupError instanceof ApiError &&
    (lookupError.code === 'VOUCHER_NOT_FOUND' || lookupError.status === 404);
  const data = code && !lookupError ? lookup.data : undefined;

  return (
    <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Flex vertical gap="middle" className="w-full">
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
                  disabled={input.length < 4}
                >
                  {t('check')}
                </Button>
              </Space.Compact>
            </Flex>
          </form>
        </Card>

        {planBlocked && (
          <Alert
            type="error"
            showIcon
            data-testid="redeem-plan-limit"
            title={tErrors('PLAN_REDEMPTION_LIMIT')}
            description={tBilling('redeemBlocked', { code: planBlocked })}
            action={
              canSeePlan ? (
                <Link href={billingPath(orgId)}>
                  <Button tabIndex={-1}>{tBilling('viewPlan')}</Button>
                </Link>
              ) : undefined
            }
          />
        )}
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
                <Button type="primary" size="large" block onClick={startOver}>
                  {t('newCode')}
                </Button>
              }
            />
          </Card>
        ) : notFound ? (
          <Alert type="error" showIcon title={t('notFound', { code })} />
        ) : lookupError ? (
          <Alert
            type="error"
            showIcon
            title={
              lookupError instanceof ApiError && tErrors.has(lookupError.code)
                ? tErrors(lookupError.code)
                : t('genericError')
            }
          />
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
                {data.prize.image ? (
                  // biome-ignore lint/performance/noImgElement: prize image or preset SVG
                  <img
                    src={data.prize.image}
                    alt=""
                    width={64}
                    height={64}
                    className="shrink-0 rounded-lg border object-cover"
                  />
                ) : (
                  <div
                    className="flex shrink-0 items-center justify-center rounded-lg"
                    style={{ width: 64, height: 64, background: token.colorFillSecondary }}
                  >
                    <Gift size={36} color={token.colorPrimary} />
                  </div>
                )}
                <Flex vertical className="min-w-0">
                  <Typography.Title level={4} className="!m-0">
                    {data.prize.name}
                  </Typography.Title>
                  <Typography.Text className="font-mono text-base" type="secondary">
                    {data.code}
                  </Typography.Text>
                </Flex>
              </Flex>

              {data.rehearsal && <Alert type="info" showIcon title={t('rehearsalNote')} />}

              <Descriptions
                column={1}
                size="small"
                bordered
                items={[
                  { key: 'campaign', label: t('campaign'), children: data.campaign.name },
                  ...(data.playerName
                    ? [{ key: 'player', label: t('player'), children: data.playerName }]
                    : []),
                  { key: 'issued', label: t('issuedAt'), children: time(data.issuedAt) },
                  ...(data.expiresAt
                    ? [{ key: 'expires', label: t('expiresAt'), children: time(data.expiresAt) }]
                    : []),
                  ...(data.redeemedByName
                    ? [
                        {
                          key: 'redeemedBy',
                          label: t('redeemedBy'),
                          children: data.redeemedByName,
                        },
                      ]
                    : []),
                  {
                    key: 'status',
                    label: t('status'),
                    children: (
                      <Space size="small" wrap>
                        {data.status === 'redeemed' && data.redeemedAt ? (
                          <Tag>{t('redeemedAt', { time: time(data.redeemedAt) })}</Tag>
                        ) : data.status === 'expired' ? (
                          <Tag color="warning">{t('expired')}</Tag>
                        ) : data.status === 'void' ? (
                          <Tag color="error">{t('void')}</Tag>
                        ) : (
                          <Tag color="success">{t('notRedeemed')}</Tag>
                        )}
                        {data.rehearsal && <Tag color="gold">{t('rehearsal')}</Tag>}
                      </Space>
                    ),
                  },
                ]}
              />

              {data.status === 'redeemed' ? (
                <Flex vertical gap="small">
                  <Alert
                    type="warning"
                    showIcon
                    title={
                      data.redeemedAt
                        ? t('alreadyRedeemed', {
                            code: data.code,
                            time: time(data.redeemedAt),
                          })
                        : t('alreadyRedeemedShort', { code: data.code })
                    }
                  />
                  {canReopen && (
                    <Button
                      icon={<RotateCcw className="size-4" />}
                      onClick={() => setReopenOpen(true)}
                      block
                    >
                      {t('reopen')}
                    </Button>
                  )}
                </Flex>
              ) : data.status === 'expired' ? (
                <Alert type="warning" showIcon title={t('expiredAlert', { code: data.code })} />
              ) : data.status === 'void' ? (
                <Alert type="error" showIcon title={t('voidAlert', { code: data.code })} />
              ) : (
                canRedeem && (
                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={confirm}
                    loading={redeem.isPending}
                  >
                    {t('confirm')}
                  </Button>
                )
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

      <Modal
        open={reopenOpen}
        title={data ? t('reopenTitle', { code: data.code }) : t('reopen')}
        onCancel={() => {
          setReopenOpen(false);
          reopenForm.form.resetFields();
        }}
        onOk={() => void submitReopen()}
        okText={t('reopenSubmit')}
        cancelText={t('cancel')}
        confirmLoading={reopen.isPending}
        destroyOnHidden
      >
        <Flex vertical gap="middle">
          <Typography.Text type="secondary">{t('reopenDescription')}</Typography.Text>
          <Form form={reopenForm.form} layout="vertical" requiredMark={false}>
            <Form.Item
              name="reason"
              label={t('reopenReasonLabel')}
              rules={reopenForm.rules}
              className="!mb-0"
            >
              <Input.TextArea
                rows={3}
                maxLength={500}
                showCount
                placeholder={t('reopenReasonPlaceholder')}
              />
            </Form.Item>
          </Form>
        </Flex>
      </Modal>
    </div>
  );
}
