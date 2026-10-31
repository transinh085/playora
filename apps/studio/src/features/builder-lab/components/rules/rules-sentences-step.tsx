'use client';

import { Checkbox } from '@playora/ui/components/checkbox';
import { Input } from '@playora/ui/components/input';
import { RadioGroup, RadioGroupItem } from '@playora/ui/components/radio-group';
import { Switch } from '@playora/ui/components/switch';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Caption } from '@/components/caption';
import type { CampaignPrize, CampaignRules } from '../../api';
import {
  formatVnd,
  groupDigits,
  isoToLocalInput,
  localInputToIso,
  parseDigits,
} from '../../lib/rules-format';
import { sortWeekdays, summarizeRules, WEEKDAYS, weekdayKey } from '../../lib/rules-summary';

const DEFAULT_HOURS = { start: '07:00', end: '22:00' };
/** "Lấp ngày vắng" default: Tuesday to Thursday. */
const DEFAULT_OPEN_DAYS = [2, 3, 4];

/**
 * Step 3: each rule is one sentence with its control inline (docs/product/specs/builder.md §4.2). Dates use native
 * `datetime-local`/`time` inputs in `Input` (good pickers on phones, no extra date library).
 */
export function RulesSentencesStep({
  rules,
  prizes,
  totalValueVnd,
  onChange,
}: {
  rules: CampaignRules;
  prizes: CampaignPrize[];
  totalValueVnd: number;
  onChange: (patch: Partial<CampaignRules>) => void;
}) {
  const t = useTranslations('builderLab.rules.sentences');
  const tw = useTranslations('builderLab.weekdays');
  const locale = useLocale();
  const hours = rules.openingHours;

  const intNumber = (
    value: number,
    label: string,
    apply: (v: number) => void,
    max = 99,
  ): React.ReactNode => (
    <Input
      type="number"
      aria-label={label}
      min={1}
      max={max}
      step={1}
      className="inline-block w-20 text-center font-mono"
      value={value}
      onChange={(e) => {
        const val = parseInt(e.target.value, 10);
        if (!Number.isNaN(val) && val >= 1) apply(val);
      }}
    />
  );
  const time = (value: string, label: string, apply: (v: string) => void) => (
    <Input
      type="time"
      aria-label={label}
      className="inline-block w-32 font-mono"
      value={value}
      onChange={(e) => e.target.value && apply(e.target.value)}
    />
  );
  const dateTime = (iso: string, label: string, apply: (iso: string) => void) => (
    <Input
      type="datetime-local"
      aria-label={label}
      className="inline-block w-56 font-mono text-xs"
      value={isoToLocalInput(iso)}
      onChange={(e) => {
        const next = localInputToIso(e.target.value);
        if (next) apply(next);
      }}
    />
  );

  const rows: { key: string; node: React.ReactNode }[] = [
    {
      key: 'plays',
      node: t.rich('plays', {
        n: () => intNumber(rules.playsPerDay, t('playsLabel'), (v) => onChange({ playsPerDay: v })),
      }),
    },
    {
      key: 'maxWins',
      node: t.rich('maxWins', {
        n: () =>
          intNumber(rules.maxWinsPerPlayer, t('maxWinsLabel'), (v) =>
            onChange({ maxWinsPerPlayer: v }),
          ),
      }),
    },
    {
      key: 'window',
      node: t.rich('window', {
        start: () =>
          dateTime(rules.startsAt, t('startLabel'), (startsAt) => onChange({ startsAt })),
        end: () => dateTime(rules.endsAt, t('endLabel'), (endsAt) => onChange({ endsAt })),
      }),
    },
    {
      key: 'hours',
      node: (
        <div className="flex flex-wrap items-center gap-2">
          <Switch
            aria-label={t('hoursLabel')}
            checked={hours !== null}
            onCheckedChange={(on) => onChange({ openingHours: on ? DEFAULT_HOURS : null })}
          />
          {hours
            ? t.rich('hoursOn', {
                start: () =>
                  time(hours.start, t('hoursStartLabel'), (start) =>
                    onChange({ openingHours: { ...hours, start } }),
                  ),
                end: () =>
                  time(hours.end, t('hoursEndLabel'), (end) =>
                    onChange({ openingHours: { ...hours, end } }),
                  ),
              })
            : t('hoursOff')}
        </div>
      ),
    },
    {
      key: 'days',
      node: (
        <div className="flex flex-wrap items-center gap-2">
          <Switch
            aria-label={t('daysLabel')}
            checked={rules.openDays !== null}
            onCheckedChange={(on) => onChange({ openDays: on ? DEFAULT_OPEN_DAYS : null })}
          />
          {rules.openDays !== null ? (
            <div className="flex flex-wrap items-center gap-3">
              <span>{t('daysOn')}</span>
              <div className="flex flex-wrap items-center gap-2">
                {WEEKDAYS.map((d) => {
                  const isChecked = rules.openDays?.includes(d) ?? false;
                  return (
                    <label
                      key={d}
                      htmlFor={`rules-open-day-${d}`}
                      className="flex cursor-pointer items-center gap-1.5 text-xs"
                    >
                      <Checkbox
                        id={`rules-open-day-${d}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const current = rules.openDays ?? [];
                          let nextDays: number[];
                          if (checked) {
                            nextDays = [...current, d];
                          } else {
                            nextDays = current.filter((day) => day !== d);
                          }
                          if (nextDays.length > 0) {
                            onChange({
                              openDays: nextDays.length === 7 ? null : sortWeekdays(nextDays),
                            });
                          }
                        }}
                      />
                      <span>{tw(weekdayKey(d))}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            t('daysOff')
          )}
        </div>
      ),
    },
    {
      key: 'pacing',
      node: (
        <div className="flex items-center gap-2">
          <Switch
            aria-label={t('pacingLabel')}
            checked={rules.pacing}
            onCheckedChange={(pacing) => onChange({ pacing })}
          />
          <span>{t('pacing')}</span>
        </div>
      ),
    },
    {
      key: 'budget',
      node: (
        <div className="flex flex-wrap items-center gap-2">
          <Switch
            aria-label={t('budgetLabel')}
            checked={rules.budgetVnd !== null}
            onCheckedChange={(on) =>
              onChange({ budgetVnd: on ? Math.max(totalValueVnd, 100_000) : null })
            }
          />
          {rules.budgetVnd !== null
            ? t.rich('budgetOn', {
                amount: () => (
                  <div className="relative inline-block w-44">
                    <Input
                      aria-label={t('budgetLabel')}
                      type="text"
                      className="pr-6 font-mono"
                      value={groupDigits(rules.budgetVnd ?? 0, locale)}
                      onChange={(e) => {
                        const val = parseDigits(e.target.value);
                        if (val !== null) onChange({ budgetVnd: val });
                      }}
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                      đ
                    </span>
                  </div>
                ),
              })
            : t('budgetOff')}
        </div>
      ),
    },
    {
      key: 'form',
      node: (
        <div className="flex items-center gap-2">
          <Switch
            aria-label={t('formLabel')}
            checked={rules.collectForm}
            onCheckedChange={(collectForm) => onChange({ collectForm })}
          />
          <span>{t('form')}</span>
        </div>
      ),
    },
    {
      key: 'redeemFirst',
      node: (
        <div className="flex items-center gap-2">
          <Switch
            aria-label={t('redeemFirst')}
            checked={rules.requireRedeemBeforeReplay}
            onCheckedChange={(requireRedeemBeforeReplay) => onChange({ requireRedeemBeforeReplay })}
          />
          <span>{t('redeemFirst')}</span>
        </div>
      ),
    },
    {
      key: 'antiFraud',
      node: (
        <div className="flex flex-col gap-2 w-full">
          <span className="font-medium text-sm">{t('antiFraud')}</span>
          <RadioGroup
            value={rules.antiFraud}
            onValueChange={(val) => onChange({ antiFraud: val as 'standard' | 'low' })}
            className="flex flex-col gap-2"
          >
            {(['standard', 'low'] as const).map((level) => (
              <label
                key={level}
                htmlFor={`anti-fraud-${level}`}
                className="flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 hover:bg-muted/30 transition-colors"
              >
                <RadioGroupItem value={level} id={`anti-fraud-${level}`} className="mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-xs">{t(`antiFraudLevels.${level}`)}</span>
                  <Caption>{t(`antiFraudHints.${level}`)}</Caption>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col divide-y divide-border">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-wrap items-center gap-x-2 gap-y-2 py-3 text-sm">
          {row.node}
        </div>
      ))}
      <RulesSummary rules={rules} prizes={prizes} />
    </div>
  );
}

/** Auto-generated plain-language recap of every rule. */
export function RulesSummary({ rules, prizes }: { rules: CampaignRules; prizes: CampaignPrize[] }) {
  const t = useTranslations('builderLab.rules.summary');
  const tw = useTranslations('builderLab.weekdays');
  const format = useFormatter();
  const locale = useLocale();
  const lines = useMemo(
    () =>
      summarizeRules(rules, prizes, {
        dateTime: (iso) =>
          format.dateTime(new Date(iso), { dateStyle: 'short', timeStyle: 'short' }),
        vnd: (v) => formatVnd(v, locale),
        weekdays: (days) =>
          sortWeekdays(days)
            .map((d) => tw(weekdayKey(d)))
            .join(', '),
      }),
    [rules, prizes, format, locale, tw],
  );

  return (
    <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 shadow-xs dark:border-white/10 dark:bg-white/[0.02]">
      <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
        {t('title')}
      </span>
      <ul className="mt-2 mb-0 flex list-disc flex-col gap-1 pl-5 text-xs text-neutral-500 dark:text-neutral-400">
        {lines.map((line) => (
          <li key={line.key}>
            <span>{t(line.key, line.values)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
