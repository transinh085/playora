'use client';

import { Button, Card, Empty, Flex, Input, InputNumber, Tooltip, Typography, theme } from 'antd';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { presetSrc } from '@/features/canvas-editor/lib/model';
import {
  formatVnd,
  fromPercent,
  groupDigits,
  parseDigits,
  toPercent,
} from '../../lib/rules-format';
import type { PrizeTotals } from '../../lib/rules-summary';
import type { LabPrize, LabRules } from '../../mock/types';
import { PrizeImagePicker } from './prize-image-picker';

/** Step 2: the prize list, one card per prize. */
export function PrizeListStep({
  prizes,
  mode,
  totals,
  onChange,
}: {
  prizes: LabPrize[];
  mode: LabRules['mode'];
  totals: PrizeTotals;
  onChange: (prizes: LabPrize[]) => void;
}) {
  const t = useTranslations('builderLab.rules.prizes');
  const locale = useLocale();
  const { token } = theme.useToken();
  const perPrize = mode === 'per_prize_probability';

  const update = (index: number, patch: Partial<LabPrize>) =>
    onChange(prizes.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  const move = (index: number, delta: -1 | 1) => {
    const next = [...prizes];
    const target = index + delta;
    const [item] = next.splice(index, 1);
    if (!item || target < 0 || target > next.length) return;
    next.splice(target, 0, item);
    onChange(next);
  };
  const remove = (index: number) => onChange(prizes.filter((_, i) => i !== index));
  const add = () =>
    onChange([
      ...prizes,
      {
        id: crypto.randomUUID(),
        name: t('newName', { n: prizes.length + 1 }),
        image: presetSrc('gift'),
        quantity: 10,
        valueVnd: 0,
        probability: perPrize ? 0 : undefined,
      },
    ]);

  return (
    <Flex vertical gap={12}>
      {prizes.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty')} />
      ) : (
        prizes.map((prize, index) => (
          <Card
            key={prize.id}
            styles={{ body: { padding: 12 } }}
            style={{ background: token.colorFillQuaternary }}
          >
            <Flex gap={12} align="flex-start">
              <PrizeImagePicker
                value={prize.image}
                name={prize.name}
                onChange={(image) => update(index, { image })}
              />
              <div className="grid min-w-0 flex-1 gap-3 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
                <Field label={t('name')} className="col-span-full">
                  <Input
                    value={prize.name}
                    maxLength={60}
                    placeholder={t('namePlaceholder')}
                    status={prize.name.trim() ? undefined : 'error'}
                    onChange={(e) => update(index, { name: e.target.value })}
                  />
                </Field>
                <Field label={t('quantity')}>
                  <InputNumber
                    className="w-full"
                    min={0}
                    max={1_000_000}
                    precision={0}
                    value={prize.quantity}
                    onChange={(v) => v !== null && update(index, { quantity: v })}
                  />
                </Field>
                <Field label={t('value')}>
                  <InputNumber
                    className="w-full"
                    min={0}
                    max={1_000_000_000}
                    step={10_000}
                    suffix="đ"
                    value={prize.valueVnd}
                    formatter={(v) => groupDigits(v, locale)}
                    parser={(v) => parseDigits(v)}
                    onChange={(v) => v !== null && update(index, { valueVnd: v })}
                  />
                </Field>
                {perPrize && (
                  <Field label={t('probability')}>
                    <InputNumber
                      className="w-full"
                      min={0}
                      max={100}
                      step={0.5}
                      precision={1}
                      suffix="%"
                      status={totals.probabilityPercent > 100 ? 'error' : undefined}
                      value={toPercent(prize.probability ?? 0)}
                      onChange={(v) => v !== null && update(index, { probability: fromPercent(v) })}
                    />
                  </Field>
                )}
              </div>
              <Flex vertical gap={2}>
                <Tooltip title={t('moveUp')}>
                  <Button
                    size="small"
                    type="text"
                    aria-label={t('moveUp')}
                    disabled={index === 0}
                    icon={<ArrowUp className="size-4" />}
                    onClick={() => move(index, -1)}
                  />
                </Tooltip>
                <Tooltip title={t('moveDown')}>
                  <Button
                    size="small"
                    type="text"
                    aria-label={t('moveDown')}
                    disabled={index === prizes.length - 1}
                    icon={<ArrowDown className="size-4" />}
                    onClick={() => move(index, 1)}
                  />
                </Tooltip>
                <Tooltip title={t('remove')}>
                  <Button
                    size="small"
                    type="text"
                    danger
                    aria-label={t('remove')}
                    icon={<Trash2 className="size-4" />}
                    onClick={() => remove(index)}
                  />
                </Tooltip>
              </Flex>
            </Flex>
          </Card>
        ))
      )}

      <Button type="dashed" block icon={<Plus className="size-4" />} onClick={add}>
        {t('add')}
      </Button>

      <Flex
        wrap
        gap={16}
        justify="space-between"
        className="px-1"
        style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 12 }}
      >
        <Typography.Text>
          {t.rich('totalStock', {
            count: totals.stock,
            b: (chunks) => <Typography.Text strong>{chunks}</Typography.Text>,
          })}
        </Typography.Text>
        <Typography.Text>
          {t.rich('totalValue', {
            value: formatVnd(totals.valueVnd, locale),
            b: (chunks) => <Typography.Text strong>{chunks}</Typography.Text>,
          })}
        </Typography.Text>
        {perPrize && (
          <Typography.Text type={totals.probabilityPercent > 100 ? 'danger' : undefined}>
            {t.rich('totalProbability', {
              total: totals.probabilityPercent,
              b: (chunks) => <Typography.Text strong>{chunks}</Typography.Text>,
            })}
          </Typography.Text>
        )}
      </Flex>
    </Flex>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is the child
    <label className={`flex min-w-0 flex-col gap-1 ${className ?? ''}`}>
      <Caption>{label}</Caption>
      {children}
    </label>
  );
}
