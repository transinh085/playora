import { BILLING_TIMEZONE } from '@playora/core/billing';

/**
 * Billing dates are calendar days in Vietnam (UTC+7, no daylight saving). Forms show a native
 * `<input type="date">` (`YYYY-MM-DD`) and store the ISO instant the contract expects.
 */
const VN_OFFSET = '+07:00';
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** ISO instant → `YYYY-MM-DD` in Vietnam; '' for empty or invalid input. */
export function isoToDay(iso: string | null | undefined): string {
  if (!iso) return '';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: BILLING_TIMEZONE }).format(at);
}

/**
 * `YYYY-MM-DD` → ISO instant at the start (00:00) or the end (23:59:59.999) of that day in
 * Vietnam. Period ends use `end`, so a plan "until 30/11" stays active through the 30th.
 */
export function dayToIso(day: string | null | undefined, edge: 'start' | 'end'): string | null {
  if (!day || !DAY_RE.test(day)) return null;
  const time = edge === 'start' ? '00:00:00.000' : '23:59:59.999';
  const at = new Date(`${day}T${time}${VN_OFFSET}`);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

/** `YYYY-MM-DD` shifted by whole months (clamped to the last day of the target month). */
export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}
