/**
 * Formats campaign open weekdays (0 = Sunday ... 6 = Saturday) in order.
 */
export function formatOpenDays(
  openDays: readonly number[] | null | undefined,
  getWeekdayName: (day: number) => string,
): string | null {
  if (!openDays || openDays.length === 0 || openDays.length >= 7) return null;
  // Sort with Monday (1) to Saturday (6), then Sunday (0) at the end, or 0..6
  const sorted = [...openDays].sort((a, b) => {
    const orderA = a === 0 ? 7 : a;
    const orderB = b === 0 ? 7 : b;
    return orderA - orderB;
  });
  return sorted.map((d) => getWeekdayName(d)).join(', ');
}
