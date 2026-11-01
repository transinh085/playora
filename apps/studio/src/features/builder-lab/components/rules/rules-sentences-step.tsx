'use client';

import {
  Card,
  Checkbox,
  Input,
  InputGroup,
  Label,
  Radio,
  RadioGroup,
  Switch,
} from '@playora/ui/components';
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
            isSelected={hours !== null}
            onChange={(on) => onChange({ openingHours: on ? DEFAULT_HOURS : null })}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
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
            isSelected={rules.openDays !== null}
            onChange={(on) => onChange({ openDays: on ? DEFAULT_OPEN_DAYS : null })}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
          {rules.openDays !== null ? (
            <div className="flex flex-wrap items-center gap-3">
              <span>{t('daysOn')}</span>
              <div className="flex flex-wrap items-center gap-2">
                {WEEKDAYS.map((d) => {
                  const isChecked = rules.openDays?.includes(d) ?? false;
                  return (
                    <Checkbox
                      key={d}
                      isSelected={isChecked}
                      onChange={(checked) => {
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
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <Label className="text-xs font-normal">{tw(weekdayKey(d))}</Label>
                      </Checkbox.Content>
                    </Checkbox>
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
            isSelected={rules.pacing}
            onChange={(pacing) => onChange({ pacing })}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
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
            isSelected={rules.budgetVnd !== null}
            onChange={(on) => onChange({ budgetVnd: on ? Math.max(totalValueVnd, 100_000) : null })}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
          {rules.budgetVnd !== null
            ? t.rich('budgetOn', {
                amount: () => (
                  <InputGroup className="inline-flex w-44">
                    <InputGroup.Input
                      aria-label={t('budgetLabel')}
                      type="text"
                      className="font-mono"
                      value={groupDigits(rules.budgetVnd ?? 0, locale)}
                      onChange={(e) => {
                        const val = parseDigits(e.target.value);
                        if (val !== null) onChange({ budgetVnd: val });
                      }}
                    />
                    <InputGroup.Suffix>đ</InputGroup.Suffix>
                  </InputGroup>
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
            isSelected={rules.collectForm}
            onChange={(collectForm) => onChange({ collectForm })}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
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
            isSelected={rules.requireRedeemBeforeReplay}
            onChange={(requireRedeemBeforeReplay) => onChange({ requireRedeemBeforeReplay })}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
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
            aria-label={t('antiFraud')}
            value={rules.antiFraud}
            onChange={(val) => onChange({ antiFraud: val as 'standard' | 'low' })}
            className="flex flex-col gap-2"
          >
            {(['standard', 'low'] as const).map((level) => (
              <Radio
                key={level}
                value={level}
                className="items-start rounded-xl border p-2.5 hover:bg-muted/30 transition-colors"
              >
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Radio.Content>
                  <div className="flex flex-col gap-0.5">
                    <Label className="font-medium text-xs">{t(`antiFraudLevels.${level}`)}</Label>
                    <Caption>{t(`antiFraudHints.${level}`)}</Caption>
                  </div>
                </Radio.Content>
              </Radio>
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
    <Card variant="secondary" className="mt-4 p-4">
      <Card.Header className="p-0">
        <Card.Title className="m-0 font-semibold text-xs text-neutral-900 dark:text-neutral-100">
          {t('title')}
        </Card.Title>
      </Card.Header>
      <Card.Content className="p-0">
        <ul className="mt-2 mb-0 flex list-disc flex-col gap-1 pl-5 text-xs text-neutral-500 dark:text-neutral-400">
          {lines.map((line) => (
            <li key={line.key}>
              <span>{t(line.key, line.values)}</span>
            </li>
          ))}
        </ul>
      </Card.Content>
    </Card>
  );
}
