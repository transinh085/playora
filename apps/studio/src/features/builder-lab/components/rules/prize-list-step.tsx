'use client';

import { Button } from '@playora/ui/components/button';
import { Card, CardContent } from '@playora/ui/components/card';
import { Input } from '@playora/ui/components/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@playora/ui/components/tooltip';
import { ArrowDown, ArrowUp, Gift, Plus, Trash2 } from 'lucide-react';
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

/** Step 2: the prize list, one card per prize. */
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-8 text-center text-muted-foreground text-sm">
          <Gift className="mb-2 size-8 stroke-1 text-muted-foreground/60" />
          <span>{t('empty')}</span>
        </div>
      ) : (
        <TooltipProvider>
          {prizes.map((prize, index) => (
            <Card key={prize.id} className="rounded-2xl border bg-muted/20">
              <CardContent className="flex items-start gap-3 p-3">
                <PrizeImagePicker
                  orgId={orgId}
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
                      className={!prize.name.trim() ? 'border-destructive' : ''}
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
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!Number.isNaN(val)) update(index, { quantity: val });
                      }}
                    />
                  </Field>
                  <Field label={t('value')}>
                    <div className="relative">
                      <Input
                        type="text"
                        value={groupDigits(prize.valueVnd, locale)}
                        onChange={(e) => {
                          const val = parseDigits(e.target.value);
                          if (val !== null) update(index, { valueVnd: val });
                        }}
                        className="pr-6"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                        đ
                      </span>
                    </div>
                  </Field>
                  {perPrize && (
                    <Field label={t('probability')}>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={toPercent(prize.probability ?? 0)}
                          className={
                            totals.probabilityPercent > 100 ? 'border-destructive pr-6' : 'pr-6'
                          }
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!Number.isNaN(val))
                              update(index, { probability: fromPercent(val) });
                          }}
                        />
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                          %
                        </span>
                      </div>
                    </Field>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 rounded-full"
                        aria-label={t('moveUp')}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('moveUp')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 rounded-full"
                        aria-label={t('moveDown')}
                        disabled={index === prizes.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('moveDown')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t('remove')}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('remove')}</TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          ))}
        </TooltipProvider>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={add}
        className="w-full border-dashed rounded-full"
      >
        <Plus className="mr-1.5 size-4" />
        {t('add')}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-3 px-1 text-sm">
        <span>
          {t.rich('totalStock', {
            count: totals.stock,
            b: (chunks) => <strong className="font-semibold">{chunks}</strong>,
          })}
        </span>
        <span>
          {t.rich('totalValue', {
            value: formatVnd(totals.valueVnd, locale),
            b: (chunks) => <strong className="font-semibold">{chunks}</strong>,
          })}
        </span>
        {perPrize && (
          <span className={totals.probabilityPercent > 100 ? 'text-destructive font-medium' : ''}>
            {t.rich('totalProbability', {
              total: totals.probabilityPercent,
              b: (chunks) => <strong className="font-semibold">{chunks}</strong>,
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
