'use client';

import { Checkbox, Flex, Input, InputNumber, Radio, Switch, Typography, theme } from 'antd';
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
 * `datetime-local`/`time` inputs in antd `Input` (good pickers on phones, no extra date library).
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
  const { token } = theme.useToken();
  const locale = useLocale();
  const hours = rules.openingHours;

  const intNumber = (
    value: number,
    label: string,
    apply: (v: number) => void,
    max = 99,
  ): React.ReactNode => (
    <InputNumber
      aria-label={label}
      min={1}
      max={max}
      precision={0}
      style={{ width: 72 }}
      value={value}
      onChange={(v) => v !== null && apply(v)}
    />
  );
  const time = (value: string, label: string, apply: (v: string) => void) => (
    <Input
      type="time"
      aria-label={label}
      style={{ width: 120 }}
      value={value}
      onChange={(e) => e.target.value && apply(e.target.value)}
    />
  );
  const dateTime = (iso: string, label: string, apply: (iso: string) => void) => (
    <Input
      type="datetime-local"
      aria-label={label}
      style={{ width: 220 }}
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
        <>
          <Switch
            aria-label={t('hoursLabel')}
            checked={hours !== null}
            onChange={(on) => onChange({ openingHours: on ? DEFAULT_HOURS : null })}
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
        </>
      ),
    },
    {
      key: 'days',
      node: (
        <>
          <Switch
            aria-label={t('daysLabel')}
            checked={rules.openDays !== null}
            onChange={(on) => onChange({ openDays: on ? DEFAULT_OPEN_DAYS : null })}
          />
          {rules.openDays !== null ? (
            <>
              {t('daysOn')}
              <Checkbox.Group
                aria-label={t('daysLabel')}
                value={rules.openDays}
                options={WEEKDAYS.map((d) => ({ value: d, label: tw(weekdayKey(d)) }))}
                onChange={(days) =>
                  days.length > 0 &&
                  onChange({ openDays: days.length === 7 ? null : sortWeekdays(days) })
                }
              />
            </>
          ) : (
            t('daysOff')
          )}
        </>
      ),
    },
    {
      key: 'pacing',
      node: (
        <>
          <Switch
            aria-label={t('pacingLabel')}
            checked={rules.pacing}
            onChange={(pacing) => onChange({ pacing })}
          />
          {t('pacing')}
        </>
      ),
    },
    {
      key: 'budget',
      node: (
        <>
          <Switch
            aria-label={t('budgetLabel')}
            checked={rules.budgetVnd !== null}
            onChange={(on) => onChange({ budgetVnd: on ? Math.max(totalValueVnd, 100_000) : null })}
          />
          {rules.budgetVnd !== null
            ? t.rich('budgetOn', {
                amount: () => (
                  <InputNumber
                    aria-label={t('budgetLabel')}
                    min={0}
                    max={10_000_000_000}
                    step={100_000}
                    suffix="đ"
                    style={{ width: 180 }}
                    value={rules.budgetVnd}
                    formatter={(v) => groupDigits(v, locale)}
                    parser={(v) => parseDigits(v)}
                    onChange={(v) => v !== null && onChange({ budgetVnd: v })}
                  />
                ),
              })
            : t('budgetOff')}
        </>
      ),
    },
    {
      key: 'form',
      node: (
        <>
          <Switch
            aria-label={t('formLabel')}
            checked={rules.collectForm}
            onChange={(collectForm) => onChange({ collectForm })}
          />
          {t('form')}
        </>
      ),
    },
    {
      key: 'redeemFirst',
      node: (
        <>
          <Switch
            aria-label={t('redeemFirst')}
            checked={rules.requireRedeemBeforeReplay}
            onChange={(requireRedeemBeforeReplay) => onChange({ requireRedeemBeforeReplay })}
          />
          {t('redeemFirst')}
        </>
      ),
    },
    {
      key: 'antiFraud',
      node: (
        <Flex vertical gap={4}>
          <span>{t('antiFraud')}</span>
          <Radio.Group
            aria-label={t('antiFraud')}
            value={rules.antiFraud}
            onChange={(e) => onChange({ antiFraud: e.target.value })}
          >
            <Flex vertical gap={4}>
              {(['standard', 'low'] as const).map((level) => (
                <Radio key={level} value={level}>
                  {t(`antiFraudLevels.${level}`)}
                  <Caption className="block">{t(`antiFraudHints.${level}`)}</Caption>
                </Radio>
              ))}
            </Flex>
          </Radio.Group>
        </Flex>
      ),
    },
  ];

  return (
    <Flex vertical gap={0}>
      {rows.map((row, i) => (
        <div
          key={row.key}
          className="flex flex-wrap items-center gap-x-2 gap-y-2 py-3"
          style={{
            borderTop: i === 0 ? undefined : `1px solid ${token.colorBorderSecondary}`,
            fontSize: token.fontSize,
            lineHeight: `${token.controlHeight}px`,
            color: token.colorText,
          }}
        >
          {row.node}
        </div>
      ))}
      <RulesSummary rules={rules} prizes={prizes} />
    </Flex>
  );
}

/** Auto-generated plain-language recap of every rule. */
export function RulesSummary({ rules, prizes }: { rules: CampaignRules; prizes: CampaignPrize[] }) {
  const t = useTranslations('builderLab.rules.summary');
  const tw = useTranslations('builderLab.weekdays');
  const format = useFormatter();
  const locale = useLocale();
  const { token } = theme.useToken();
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
    <div
      className="mt-2 p-4"
      style={{ background: token.colorFillQuaternary, borderRadius: token.borderRadiusLG }}
    >
      <Typography.Text strong>{t('title')}</Typography.Text>
      <ul className="mt-2 mb-0 flex list-disc flex-col gap-1 pl-5">
        {lines.map((line) => (
          <li key={line.key}>
            <Typography.Text>{t(line.key, line.values)}</Typography.Text>
          </li>
        ))}
      </ul>
    </div>
  );
}
