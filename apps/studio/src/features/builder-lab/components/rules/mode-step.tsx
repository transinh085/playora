'use client';

import type { PrizeMode } from '@playora/core/prize';
import { Alert, Card, InputGroup, Slider } from '@playora/ui/components';
import { Gift, ListOrdered, Percent } from '@playora/ui/icons';
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
    icon: <Percent className="size-4" />,
    tone: 'primary',
  },
  {
    key: 'per_prize_probability',
    i18n: 'perPrize',
    icon: <ListOrdered className="size-4" />,
    tone: 'info',
  },
  { key: 'guaranteed', i18n: 'guaranteed', icon: <Gift className="size-4" />, tone: 'success' },
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
              className={`cursor-pointer p-4 transition-all ${
                selected
                  ? 'border-neutral-900 bg-neutral-50/60 ring-1 ring-neutral-900/10 dark:border-white dark:bg-white/5 dark:ring-white/20'
                  : 'border-neutral-200 hover:border-neutral-300 dark:border-white/10 dark:hover:border-white/20'
              }`}
            >
              <Card.Content className="flex flex-col gap-2 p-0">
                <IconTile tone={mode.tone} size={32}>
                  {mode.icon}
                </IconTile>
                <Card.Title className="m-0 font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                  {t(`${mode.i18n}.title`)}
                </Card.Title>
                <Card.Description className="m-0 text-neutral-500 text-[11px] leading-relaxed dark:text-neutral-400">
                  {t(`${mode.i18n}.description`)}
                </Card.Description>
                <Caption italic>{t(`${mode.i18n}.example`)}</Caption>
              </Card.Content>
            </Card>
          );
        })}
      </div>

      {rules.mode === 'overall_win_rate' && (
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
            {t('overall.rateLabel')}
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-[160px] flex-1">
              <Slider
                aria-label={t('overall.rateLabel')}
                minValue={0}
                maxValue={100}
                step={1}
                value={ratePercent}
                onChange={(v) =>
                  onChange({ overallWinRate: fromPercent(Array.isArray(v) ? (v[0] ?? 0) : v) })
                }
              >
                <Slider.Track>
                  <Slider.Fill />
                  <Slider.Thumb />
                </Slider.Track>
              </Slider>
            </div>
            <InputGroup className="w-28">
              <InputGroup.Input
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
                className="text-right font-mono text-xs"
              />
              <InputGroup.Suffix>%</InputGroup.Suffix>
            </InputGroup>
          </div>
          <Caption>{t('overall.rateHint', { rate: ratePercent, lose: 100 - ratePercent })}</Caption>
        </div>
      )}

      {rules.mode === 'per_prize_probability' &&
        (probabilityPercent > 100 ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{t('perPrize.over', { total: probabilityPercent })}</Alert.Title>
              <Alert.Description>{t('perPrize.overHint')}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : (
          <Alert status="default">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>
                {t('perPrize.total', {
                  total: probabilityPercent,
                  lose: Math.round((100 - probabilityPercent) * 10) / 10,
                })}
              </Alert.Title>
              <Alert.Description>{t('perPrize.totalHint')}</Alert.Description>
            </Alert.Content>
          </Alert>
        ))}

      {rules.mode === 'guaranteed' && (
        <Alert status="default">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('guaranteed.note')}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}
    </div>
  );
}
