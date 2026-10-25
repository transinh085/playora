/**
 * Small formatting/parsing helpers for the "Rules & prizes" panel. Pure, no React.
 */

const MS_PER_DAY = 86_400_000;

/** `30000` → `"30.000 đ"` (vi) / `"30,000 đ"` (en). */
export function formatVnd(value: number, locale = 'vi'): string {
  return `${new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 0 }).format(Math.round(value))} đ`;
}

/** Thousands separator used by the VND inputs. */
export function groupSeparator(locale = 'vi'): string {
  return locale === 'en' ? ',' : '.';
}

/** InputNumber `formatter`: digits grouped by the locale's separator. */
export function groupDigits(value: string | number | undefined, locale = 'vi'): string {
  if (value === undefined || value === '') return '';
  const digits = String(value).replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator(locale));
}

/** InputNumber `parser`: strips everything but digits. */
export function parseDigits(value: string | undefined): number {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

/** 0..1 → percent with at most one decimal (0.355 → 35.5). */
export function toPercent(ratio: number): number {
  return Math.round(ratio * 1000) / 10;
}

/** Percent → 0..1, clamped. */
export function fromPercent(percent: number): number {
  return Math.min(1, Math.max(0, Math.round(percent * 10) / 1000));
}

/** ISO → value for `<input type="datetime-local">` in the browser's time zone. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `<input type="datetime-local">` value → ISO, or null when empty/invalid. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Campaign length in whole days, the same rounding `simulateCampaign` uses (min 1). */
export function campaignDays(startsAt: string, endsAt: string): number {
  return Math.max(1, Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / MS_PER_DAY));
}
