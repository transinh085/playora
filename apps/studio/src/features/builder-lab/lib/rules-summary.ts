import type { CampaignPrize, CampaignRules } from '@playora/contracts';
import { campaignDays, formatVnd, toPercent } from './rules-format';

/**
 * Plain-language view of the prize rules (docs/product/specs/builder.md §4.2: "mỗi luật là một câu"). Returns i18n keys
 * under `builderLab.rules.summary.*` plus their ICU values, so it stays pure and testable.
 */

export type SummaryKey =
  | 'modeOverall'
  | 'modePerPrize'
  | 'modeGuaranteed'
  | 'noPrizes'
  | 'prizes'
  | 'plays'
  | 'maxWins'
  | 'window'
  | 'hours'
  | 'hoursAllDay'
  | 'openDays'
  | 'redeemFirst'
  | 'antiFraudLow'
  | 'pacingOn'
  | 'pacingOff'
  | 'budget'
  | 'budgetOff'
  | 'formOn'
  | 'formOff';

export interface SummaryLine {
  key: SummaryKey;
  values?: Record<string, string | number>;
}

export interface PrizeTotals {
  count: number;
  stock: number;
  valueVnd: number;
  /** Sum of per-prize probabilities as a percent (only meaningful in per-prize mode). */
  probabilityPercent: number;
}

export function prizeTotals(prizes: readonly CampaignPrize[]): PrizeTotals {
  let stock = 0;
  let valueVnd = 0;
  let probability = 0;
  for (const p of prizes) {
    stock += Math.max(0, p.quantity);
    valueVnd += Math.max(0, p.quantity) * Math.max(0, p.valueVnd);
    probability += p.probability ?? 0;
  }
  return {
    count: prizes.length,
    stock,
    valueVnd,
    probabilityPercent: toPercent(probability),
  };
}

export interface SummaryFormatters {
  dateTime: (iso: string) => string;
  vnd: (value: number) => string;
  /** Weekday list (0 = Sunday … 6 = Saturday) as text, e.g. "T3, T4, T5". */
  weekdays: (days: readonly number[]) => string;
}

const defaultFormatters: SummaryFormatters = {
  dateTime: (iso) =>
    new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(iso)),
  vnd: (value) => formatVnd(value),
  weekdays: (days) =>
    sortWeekdays(days)
      .map((d) => (d === 0 ? 'CN' : `T${d + 1}`))
      .join(', '),
};

/** Weekdays Monday first (0 = Sunday), the way Vietnamese calendars list the week. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const;

export type WeekdayKey = '0' | '1' | '2' | '3' | '4' | '5' | '6';
/** i18n key under `builderLab.weekdays` for a weekday number. */
export const weekdayKey = (day: number) => String(day) as WeekdayKey;

/** Monday-first order, the way Vietnamese calendars list the week. */
export function sortWeekdays(days: readonly number[]): number[] {
  return [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
}

export function summarizeRules(
  rules: CampaignRules,
  prizes: readonly CampaignPrize[],
  fmt: SummaryFormatters = defaultFormatters,
): SummaryLine[] {
  const totals = prizeTotals(prizes);
  const lines: SummaryLine[] = [];

  if (rules.mode === 'overall_win_rate') {
    lines.push({ key: 'modeOverall', values: { rate: toPercent(rules.overallWinRate) } });
  } else if (rules.mode === 'per_prize_probability') {
    const total = Math.min(100, totals.probabilityPercent);
    lines.push({
      key: 'modePerPrize',
      values: { total, lose: Math.round((100 - total) * 10) / 10 },
    });
  } else {
    lines.push({ key: 'modeGuaranteed' });
  }

  lines.push(
    totals.count === 0
      ? { key: 'noPrizes' }
      : {
          key: 'prizes',
          values: { count: totals.count, stock: totals.stock, value: fmt.vnd(totals.valueVnd) },
        },
  );
  lines.push({ key: 'plays', values: { count: rules.playsPerDay } });
  lines.push({ key: 'maxWins', values: { count: rules.maxWinsPerPlayer } });
  lines.push({
    key: 'window',
    values: {
      start: fmt.dateTime(rules.startsAt),
      end: fmt.dateTime(rules.endsAt),
      days: campaignDays(rules.startsAt, rules.endsAt),
    },
  });
  lines.push(
    rules.openingHours
      ? { key: 'hours', values: { start: rules.openingHours.start, end: rules.openingHours.end } }
      : { key: 'hoursAllDay' },
  );
  if (rules.openDays?.length && rules.openDays.length < 7) {
    lines.push({ key: 'openDays', values: { days: fmt.weekdays(rules.openDays) } });
  }
  lines.push({ key: rules.pacing ? 'pacingOn' : 'pacingOff' });
  lines.push(
    rules.budgetVnd !== null
      ? { key: 'budget', values: { amount: fmt.vnd(rules.budgetVnd) } }
      : { key: 'budgetOff' },
  );
  lines.push({ key: rules.collectForm ? 'formOn' : 'formOff' });
  if (rules.requireRedeemBeforeReplay) lines.push({ key: 'redeemFirst' });
  if (rules.antiFraud === 'low') lines.push({ key: 'antiFraudLow' });
  return lines;
}

export type RuleIssueKey =
  | 'noPrizes'
  | 'noStock'
  | 'probabilityOver'
  | 'windowOrder'
  | 'hoursOrder'
  | 'budgetBelowCheapest';

export interface RuleIssue {
  key: RuleIssueKey;
  values?: Record<string, string | number>;
}

/** Problems that block publishing or make the simulation meaningless. */
export function ruleIssues(rules: CampaignRules, prizes: readonly CampaignPrize[]): RuleIssue[] {
  const totals = prizeTotals(prizes);
  const issues: RuleIssue[] = [];
  if (totals.count === 0) issues.push({ key: 'noPrizes' });
  else if (totals.stock === 0) issues.push({ key: 'noStock' });
  if (rules.mode === 'per_prize_probability' && totals.probabilityPercent > 100) {
    issues.push({ key: 'probabilityOver', values: { total: totals.probabilityPercent } });
  }
  if (!(Date.parse(rules.endsAt) > Date.parse(rules.startsAt))) issues.push({ key: 'windowOrder' });
  if (rules.openingHours && !(rules.openingHours.start < rules.openingHours.end)) {
    issues.push({ key: 'hoursOrder' });
  }
  if (rules.budgetVnd !== null && prizes.length > 0) {
    const cheapest = Math.min(...prizes.map((p) => p.valueVnd));
    if (rules.budgetVnd < cheapest) issues.push({ key: 'budgetBelowCheapest' });
  }
  return issues;
}
