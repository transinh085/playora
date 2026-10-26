'use client';

import { applyApiError, useZodForm } from '@playora/ui/form';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Flex,
  Form,
  Input,
  InputNumber,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { ArrowLeft, Coins, Gift, Percent, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Caption } from '@/components/caption';
import { MetricCard } from '@/components/metric-card';
import { useBrandKits } from '@/features/brand-kits/api';
import { useCreateCampaign } from '../../api';
import { brandFromKit } from '../../lib/brand';
import {
  defaultSetup,
  localDate,
  PLAYBOOKS,
  type PlaybookKey,
  type PlaybookSetup,
} from '../../lib/playbooks';
import { campaignRoutes } from '../../lib/routes';
import { formatVnd, groupDigits, parseDigits, toPercent } from '../../lib/rules-format';
import { WEEKDAYS, weekdayKey } from '../../lib/rules-summary';
import { type PlaybookSuggestion, suggestPlaybook } from '../../lib/suggest';
import { RulesSummary } from '../rules/rules-sentences-step';

const DEBOUNCE_MS = 250;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The setup form's schema; messages come from i18n (`builderLab.playbooks.setup.errors`). */
type SetupErrorKey =
  | 'name'
  | 'budget'
  | 'prizes'
  | 'prizeName'
  | 'prizeCost'
  | 'date'
  | 'endBeforeStart'
  | 'endInPast'
  | 'time'
  | 'hoursOrder'
  | 'openDays'
  | 'guests';

function setupSchema(m: (key: SetupErrorKey) => string, today: string) {
  const date = z.string().regex(DATE, m('date'));
  const time = z.string().regex(TIME, m('time'));
  return z
    .object({
      name: z.string().trim().min(1, m('name')).max(120, m('name')),
      budgetVnd: z
        .number({ error: m('budget') })
        .int()
        .min(10_000, m('budget'))
        .max(10_000_000_000),
      prizes: z
        .array(
          z.object({
            name: z.string().trim().min(1, m('prizeName')).max(120, m('prizeName')),
            costVnd: z
              .number({ error: m('prizeCost') })
              .int()
              .min(1, m('prizeCost'))
              .max(1_000_000_000),
            weight: z.number().min(0),
            image: z.string().optional(),
          }),
        )
        .min(1, m('prizes'))
        .max(20),
      startDate: date,
      endDate: date,
      openingHours: z.object({ start: time, end: time }).nullable(),
      openDays: z.array(z.number().int().min(0).max(6)).min(1, m('openDays')).nullable(),
      guestsPerDay: z
        .number({ error: m('guests') })
        .int()
        .min(1, m('guests'))
        .max(100_000),
    })
    .refine((v) => v.endDate >= v.startDate, { path: ['endDate'], message: m('endBeforeStart') })
    .refine((v) => v.endDate >= today, { path: ['endDate'], message: m('endInPast') })
    .refine((v) => !v.openingHours || v.openingHours.start < v.openingHours.end, {
      path: ['openingHours', 'end'],
      message: m('hoursOrder'),
    });
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/**
 * Playbook setup (docs/product/specs/playbooks.md §2.1–§2.2): budget, prizes with their cost,
 * dates, hours and expected guests on the left; the live suggestion (quantities, win rate, the
 * plain-language sentence) and "Create" on the right. Creating lands in the editor.
 */
export function PlaybookSetupForm({
  orgId,
  playbook,
  onBack,
}: {
  orgId: string;
  playbook: PlaybookKey;
  onBack: () => void;
}) {
  const t = useTranslations('builderLab.playbooks');
  const tw = useTranslations('builderLab.weekdays');
  const locale = useLocale();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const router = useRouter();
  const create = useCreateCampaign(orgId);
  const brandKits = useBrandKits(orgId);
  const pb = PLAYBOOKS[playbook];

  const [initial] = useState(() => defaultSetup(playbook, t(`items.${playbook}.defaultName`)));
  const schema = useMemo(
    () => setupSchema((key: SetupErrorKey) => t(`setup.errors.${key}`), localDate()),
    [t],
  );
  const { form, rules, parse } = useZodForm(schema);

  const watched = Form.useWatch((values) => values, { form, preserve: true }) as
    | PlaybookSetup
    | undefined;
  // Before the form mounts (and during SSR) the watch is empty: start from the defaults.
  // Debounce the serialised values: a stable string, so typing re-runs the engine once.
  const key = useDebounced(JSON.stringify({ ...initial, ...watched }), DEBOUNCE_MS);
  const values = useMemo(() => JSON.parse(key) as PlaybookSetup, [key]);
  const suggestion = useMemo((): PlaybookSuggestion | null => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) return null;
    try {
      return suggestPlaybook(playbook, parsed.data);
    } catch {
      return null;
    }
  }, [values, schema, playbook]);

  const submit = async () => {
    const setup = parse();
    const s = suggestPlaybook(playbook, setup);
    try {
      const campaign = await create.mutateAsync({
        name: setup.name.trim(),
        templateKey: pb.templateKey,
        skinKey: pb.skinKey,
        brand: brandFromKit(brandKits.data?.items[0]),
        playbook,
        // A prize the budget cannot buy once would fail the publish check; leave it out.
        prizes: s.prizes.filter((p) => p.quantity > 0),
        rules: s.rules,
      });
      message.success(t('suggestion.created'));
      router.push(campaignRoutes(orgId).edit(campaign.id));
    } catch (error) {
      if (!applyApiError(form, error)) message.error(t('suggestion.createFailed'));
    }
  };

  const vndInput = (label: string) => (
    <InputNumber<number>
      aria-label={label}
      className="w-full"
      min={0}
      step={1_000}
      suffix="đ"
      formatter={(v) => groupDigits(v, locale)}
      parser={(v) => parseDigits(v)}
    />
  );

  return (
    <Flex vertical gap={16}>
      <div>
        <Button icon={<ArrowLeft className="size-4" />} onClick={onBack}>
          {t('backToGoals')}
        </Button>
      </div>
      <div className="grid items-start gap-4 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card
          variant="borderless"
          style={{ border: `1px solid ${token.colorBorderSecondary}` }}
          title={
            <Flex vertical className="py-3">
              <Caption>{t('setup.title')}</Caption>
              <span>{t(`items.${playbook}.title`)}</span>
            </Flex>
          }
          extra={<Tag className="!m-0">{t(`items.${playbook}.goal`)}</Tag>}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={initial}
            onFinish={submit}
            requiredMark={false}
            id="playbook-setup"
          >
            <Form.Item name="name" label={t('setup.name')} rules={rules}>
              <Input maxLength={120} />
            </Form.Item>

            <Form.Item
              name="budgetVnd"
              label={t('setup.budget')}
              extra={t('setup.budgetHint')}
              rules={rules}
            >
              {vndInput(t('setup.budget'))}
            </Form.Item>

            <Typography.Text strong className="block">
              {t('setup.prizes')}
            </Typography.Text>
            <Caption className="mb-3 block">{t('setup.prizesHint')}</Caption>
            <Form.List name="prizes">
              {(fields, { add, remove }) => (
                <Flex vertical gap={8} className="mb-6">
                  {fields.map((field, index) => {
                    const quantity = suggestion?.prizes[index]?.quantity;
                    return (
                      <Flex
                        key={field.key}
                        gap={8}
                        align="flex-start"
                        className="p-3"
                        data-testid="playbook-prize"
                        style={{
                          background: token.colorFillQuaternary,
                          borderRadius: token.borderRadiusLG,
                        }}
                      >
                        <div className="grid min-w-0 flex-1 gap-2 grid-cols-[minmax(0,1fr)_160px]">
                          <Form.Item name={[field.name, 'name']} rules={rules} className="!mb-0">
                            <Input
                              aria-label={t('setup.prizeName')}
                              placeholder={t('setup.prizeName')}
                              maxLength={120}
                            />
                          </Form.Item>
                          <Form.Item name={[field.name, 'costVnd']} rules={rules} className="!mb-0">
                            {vndInput(t('setup.prizeCost'))}
                          </Form.Item>
                        </div>
                        <Form.Item name={[field.name, 'weight']} hidden>
                          <InputNumber />
                        </Form.Item>
                        <Tag
                          className="!m-0 shrink-0 tabular-nums"
                          color={quantity === 0 ? 'warning' : 'processing'}
                          style={{ lineHeight: `${token.controlHeight - 2}px`, minWidth: 64 }}
                          data-testid="playbook-prize-quantity"
                        >
                          {quantity === undefined
                            ? '—'
                            : t('suggestion.quantity', { count: quantity })}
                        </Tag>
                        <Tooltip title={t('setup.removePrize')}>
                          <Button
                            type="text"
                            danger
                            aria-label={t('setup.removePrize')}
                            disabled={fields.length <= 1}
                            icon={<Trash2 className="size-4" />}
                            onClick={() => remove(field.name)}
                          />
                        </Tooltip>
                      </Flex>
                    );
                  })}
                  <Button
                    type="dashed"
                    block
                    icon={<Plus className="size-4" />}
                    disabled={fields.length >= 20}
                    onClick={() => {
                      const current = (form.getFieldValue('prizes') ??
                        []) as PlaybookSetup['prizes'];
                      const weight =
                        current.length > 0
                          ? current.reduce((s, p) => s + (p.weight ?? 0), 0) / current.length
                          : 1;
                      add({
                        name: t('setup.newPrize', { n: current.length + 1 }),
                        costVnd: 10_000,
                        weight,
                        image: 'gift',
                      });
                    }}
                  >
                    {t('setup.addPrize')}
                  </Button>
                </Flex>
              )}
            </Form.List>

            <div className="grid gap-x-4 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
              <Form.Item name="startDate" label={t('setup.startDate')} rules={rules}>
                <Input type="date" />
              </Form.Item>
              <Form.Item
                name="endDate"
                label={t('setup.endDate')}
                rules={rules}
                dependencies={['startDate']}
              >
                <Input type="date" />
              </Form.Item>
              <Form.Item
                name={['openingHours', 'start']}
                label={t('setup.hoursStart')}
                rules={rules}
              >
                <Input type="time" />
              </Form.Item>
              <Form.Item
                name={['openingHours', 'end']}
                label={t('setup.hoursEnd')}
                rules={rules}
                dependencies={[['openingHours', 'start']]}
              >
                <Input type="time" />
              </Form.Item>
            </div>

            {initial.openDays !== null && (
              <Form.Item name="openDays" label={t('setup.openDays')} rules={rules}>
                <Checkbox.Group
                  options={WEEKDAYS.map((d) => ({ value: d, label: tw(weekdayKey(d)) }))}
                />
              </Form.Item>
            )}

            <Form.Item
              name="guestsPerDay"
              label={t('setup.guests')}
              extra={t('setup.guestsHint')}
              rules={rules}
              className="!mb-0"
            >
              <InputNumber
                min={1}
                max={100_000}
                precision={0}
                step={10}
                suffix={t('setup.guestsSuffix')}
                style={{ width: 220 }}
              />
            </Form.Item>
          </Form>
        </Card>

        <div className="xl:sticky xl:top-4">
          <SuggestionCard
            suggestion={suggestion}
            budgetVnd={values.budgetVnd}
            pending={create.isPending}
          />
        </div>
      </div>
    </Flex>
  );
}

export function SuggestionCard({
  suggestion,
  budgetVnd,
  pending,
}: {
  suggestion: PlaybookSuggestion | null;
  budgetVnd: number;
  pending: boolean;
}) {
  const t = useTranslations('builderLab.playbooks.suggestion');
  const locale = useLocale();
  const { token } = theme.useToken();
  const zero = suggestion?.prizes.filter((p) => p.quantity === 0) ?? [];

  return (
    <Card
      variant="borderless"
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      title={t('title')}
    >
      {suggestion === null ? (
        <Alert type="info" showIcon title={t('invalid')} />
      ) : (
        <Flex vertical gap={16} data-testid="playbook-suggestion">
          <Typography.Paragraph strong className="!m-0" style={{ fontSize: 15 }}>
            {t('sentence', {
              budget: formatVnd(budgetVnd, locale),
              count: suggestion.totalPrizes,
              oneIn: suggestion.oneIn,
              days: suggestion.openDays,
            })}
          </Typography.Paragraph>
          <div className="grid gap-3">
            <MetricCard
              label={t('prizes')}
              value={suggestion.totalPrizes}
              subtext={t('prizesSub', { plays: suggestion.expectedPlays })}
              icon={<Gift className="size-5" />}
              tone="success"
            />
            <MetricCard
              label={t('winRate')}
              value={`${toPercent(suggestion.winRate)}%`}
              subtext={t('winRateSub', { oneIn: suggestion.oneIn })}
              icon={<Percent className="size-5" />}
              tone="primary"
            />
            <MetricCard
              label={t('cost')}
              value={formatVnd(suggestion.totalCostVnd, locale)}
              subtext={t('costSub', { budget: formatVnd(budgetVnd, locale) })}
              icon={<Coins className="size-5" />}
              tone="warning"
            />
          </div>
          {suggestion.tooFewPrizes ? (
            <Alert type="warning" showIcon title={t('tooFew')} />
          ) : (
            <Caption>{t('risk', { percent: Math.round(suggestion.risk * 100) })}</Caption>
          )}
          {zero.map((p) => (
            <Alert key={p.id} type="warning" showIcon title={t('zeroPrize', { name: p.name })} />
          ))}
          <RulesSummary rules={suggestion.rules} prizes={suggestion.prizes} />
        </Flex>
      )}
      <Flex vertical gap={8} className="mt-4">
        <Button
          type="primary"
          size="large"
          block
          htmlType="submit"
          form="playbook-setup"
          loading={pending}
          disabled={suggestion === null || suggestion.totalPrizes === 0}
        >
          {t('create')}
        </Button>
        <Caption>{t('editLater')}</Caption>
      </Flex>
    </Card>
  );
}
