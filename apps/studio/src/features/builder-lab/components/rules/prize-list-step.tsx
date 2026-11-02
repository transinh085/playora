'use client';

import { Button, Card, Input, InputGroup, Tooltip } from '@playora/ui/components';
import { ArrowDown, ArrowUp, Gift, Plus, Trash2 } from '@playora/ui/icons';
import { useLocale, useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { presetSrc } from '@/features/canvas-editor/lib/model';
import type { CampaignPrize, CampaignRules } from '../../api';
import {
  formatVnd,
  fromPercent,
  groupDigits,
  parseDigits,
  toPercent,
} from '../../lib/rules-format';
import type { PrizeTotals } from '../../lib/rules-summary';
import { PrizeImagePicker } from './prize-image-picker';

/** Step 2: the prize list, displayed in a unified list container. */
export function PrizeListStep({
  orgId,
  prizes,
  mode,
  totals,
  onChange,
}: {
  orgId: string;
  prizes: CampaignPrize[];
  mode: CampaignRules['mode'];
  totals: PrizeTotals;
  onChange: (prizes: CampaignPrize[]) => void;
}) {
  const t = useTranslations('builderLab.rules.prizes');
  const locale = useLocale();
  const perPrize = mode === 'per_prize_probability';

  const update = (index: number, patch: Partial<CampaignPrize>) =>
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
    <div className="flex flex-col gap-3">
      {prizes.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed py-8 text-center text-muted text-xs">
          <Card.Content className="flex flex-col items-center p-0">
            <Gift className="mb-2 size-7 stroke-1 text-muted/60" />
            <span>{t('empty')}</span>
          </Card.Content>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 divide-y divide-border">
          {prizes.map((prize, index) => (
            <div
              key={prize.id}
              data-testid={`prize-row-${index}`}
              className="flex items-start gap-3 p-3.5 hover:bg-default/40"
            >
              <PrizeImagePicker
                orgId={orgId}
                value={prize.image}
                name={prize.name}
                onChange={(image) => update(index, { image })}
              />
              <div className="grid min-w-0 flex-1 gap-2.5 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
                <Field label={t('name')} className="col-span-full">
                  <Input
                    value={prize.name}
                    maxLength={60}
                    placeholder={t('namePlaceholder')}
                    aria-invalid={!prize.name.trim() || undefined}
                    fullWidth
                    className="text-xs"
                    onChange={(e) => update(index, { name: e.target.value })}
                  />
                </Field>
                <Field label={t('quantity')}>
                  <Input
                    type="number"
                    min={0}
                    max={1_000_000}
                    step={1}
                    value={prize.quantity}
                    fullWidth
                    className="text-xs"
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val)) update(index, { quantity: val });
                    }}
                  />
                </Field>
                <Field label={t('value')}>
                  <InputGroup fullWidth>
                    <InputGroup.Input
                      type="text"
                      value={groupDigits(prize.valueVnd, locale)}
                      onChange={(e) => {
                        const val = parseDigits(e.target.value);
                        if (val !== null) update(index, { valueVnd: val });
                      }}
                      className="text-xs"
                    />
                    <InputGroup.Suffix>đ</InputGroup.Suffix>
                  </InputGroup>
                </Field>
                {perPrize && (
                  <Field label={t('probability')}>
                    <InputGroup fullWidth>
                      <InputGroup.Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={toPercent(prize.probability ?? 0)}
                        aria-invalid={totals.probabilityPercent > 100 || undefined}
                        className="text-xs"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isNaN(val)) update(index, { probability: fromPercent(val) });
                        }}
                      />
                      <InputGroup.Suffix>%</InputGroup.Suffix>
                    </InputGroup>
                  </Field>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Tooltip delay={150}>
                  <Tooltip.Trigger>
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      className="size-7 rounded-md p-0"
                      aria-label={t('moveUp')}
                      isDisabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('moveUp')}</Tooltip.Content>
                </Tooltip>
                <Tooltip delay={150}>
                  <Tooltip.Trigger>
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      className="size-7 rounded-md p-0"
                      aria-label={t('moveDown')}
                      isDisabled={index === prizes.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('moveDown')}</Tooltip.Content>
                </Tooltip>
                <Tooltip delay={150}>
                  <Tooltip.Trigger>
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      className="size-7 rounded-md p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t('remove')}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('remove')}</Tooltip.Content>
                </Tooltip>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={add}
        className="h-8 w-full border-dashed rounded-md text-xs font-medium"
      >
        <Plus className="mr-1.5 size-3.5" />
        {t('add')}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-3 px-1 text-xs text-muted">
        <span>
          {t.rich('totalStock', {
            count: totals.stock,
            b: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
          })}
        </span>
        <span>
          {t.rich('totalValue', {
            value: formatVnd(totals.valueVnd, locale),
            b: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
          })}
        </span>
        {perPrize && (
          <span className={totals.probabilityPercent > 100 ? 'text-destructive font-medium' : ''}>
            {t.rich('totalProbability', {
              total: totals.probabilityPercent,
              b: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
            })}
          </span>
        )}
      </div>
    </div>
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
