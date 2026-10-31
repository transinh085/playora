'use client';

import type { PrizeMode } from '@playora/core/prize';
import { Alert, AlertDescription, AlertTitle } from '@playora/ui/components/alert';
import { Card, CardContent } from '@playora/ui/components/card';
import { Input } from '@playora/ui/components/input';
import { Slider } from '@playora/ui/components/slider';
import { Gift, ListOrdered, Percent } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { IconTile, type Tone } from '@/components/icon-tile';
import type { CampaignRules } from '../../api';
import { fromPercent, toPercent } from '../../lib/rules-format';

const MODES: {
  key: PrizeMode;
  i18n: 'overall' | 'perPrize' | 'guaranteed';
  icon: React.ReactNode;
  tone: Tone;
}[] = [
  {
    key: 'overall_win_rate',
    i18n: 'overall',
    icon: <Percent className="size-5" />,
    tone: 'primary',
  },
  {
    key: 'per_prize_probability',
    i18n: 'perPrize',
    icon: <ListOrdered className="size-5" />,
    tone: 'info',
  },
  { key: 'guaranteed', i18n: 'guaranteed', icon: <Gift className="size-5" />, tone: 'success' },
];

/** Step 1: choose HOW prizes are given before anything else (docs/research/guandayun-teardown.md §3.2 派奖方式). */
export function ModeStep({
  rules,
  probabilityPercent,
  onChange,
}: {
  rules: CampaignRules;
  /** Running total of per-prize probabilities, in percent. */
  probabilityPercent: number;
  onChange: (patch: Partial<CampaignRules>) => void;
}) {
  const t = useTranslations('builderLab.rules.mode');
  const ratePercent = toPercent(rules.overallWinRate);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="radiogroup"
        aria-label={t('label')}
        className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]"
      >
        {MODES.map((mode) => {
          const selected = rules.mode === mode.key;
          return (
            <Card
              key={mode.key}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              onClick={() => onChange({ mode: mode.key })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange({ mode: mode.key });
                }
              }}
              className={`cursor-pointer rounded-2xl transition-all ${
                selected
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                  : 'border-border hover:border-foreground/30'
              }`}
            >
              <CardContent className="flex flex-col gap-2 p-4">
                <IconTile tone={mode.tone} size={36}>
                  {mode.icon}
                </IconTile>
                <span className="font-semibold text-sm">{t(`${mode.i18n}.title`)}</span>
                <span className="text-muted-foreground text-xs">
                  {t(`${mode.i18n}.description`)}
                </span>
                <Caption italic>{t(`${mode.i18n}.example`)}</Caption>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {rules.mode === 'overall_win_rate' && (
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">{t('overall.rateLabel')}</span>
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-[160px] flex-1">
              <Slider
                min={0}
                max={100}
                step={1}
                value={[ratePercent]}
                onValueChange={([v]) =>
                  v !== undefined && onChange({ overallWinRate: fromPercent(v) })
                }
              />
            </div>
            <div className="relative w-28">
              <Input
                aria-label={t('overall.rateLabel')}
                type="number"
                min={0}
                max={100}
                step={1}
                value={ratePercent}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!Number.isNaN(val)) onChange({ overallWinRate: fromPercent(val) });
                }}
                className="pr-6 text-right font-mono"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                %
              </span>
            </div>
          </div>
          <Caption>{t('overall.rateHint', { rate: ratePercent, lose: 100 - ratePercent })}</Caption>
        </div>
      )}

      {rules.mode === 'per_prize_probability' &&
        (probabilityPercent > 100 ? (
          <Alert variant="destructive">
            <AlertTitle>{t('perPrize.over', { total: probabilityPercent })}</AlertTitle>
            <AlertDescription>{t('perPrize.overHint')}</AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertTitle>
              {t('perPrize.total', {
                total: probabilityPercent,
                lose: Math.round((100 - probabilityPercent) * 10) / 10,
              })}
            </AlertTitle>
            <AlertDescription>{t('perPrize.totalHint')}</AlertDescription>
          </Alert>
        ))}

      {rules.mode === 'guaranteed' && (
        <Alert>
          <AlertTitle>{t('guaranteed.note')}</AlertTitle>
        </Alert>
      )}
    </div>
  );
}
