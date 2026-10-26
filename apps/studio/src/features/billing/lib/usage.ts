/**
 * Usage thresholds shown in the Studio (D-21): warn at 80% and at 100% of the plan; redemptions
 * keep working through a 10% grace and are refused only from the hard limit on.
 */
export const WARNING_RATIO = 0.8;

/**
 * - `ok`: under 80%.
 * - `warning`: 80% or more.
 * - `limit`: the plan limit is reached (for redemptions: inside the grace, still redeeming).
 * - `blocked`: redemptions only, the hard limit is reached and the counter refuses codes.
 */
export type UsageLevel = 'ok' | 'warning' | 'limit' | 'blocked';

export function usageLevel(
  used: number,
  limit: number | null,
  hardLimit: number | null = limit,
): UsageLevel {
  if (limit === null || limit <= 0) return 'ok';
  if (hardLimit !== null && hardLimit > limit && used >= hardLimit) return 'blocked';
  if (used >= limit) return 'limit';
  if (used >= limit * WARNING_RATIO) return 'warning';
  return 'ok';
}

/** Share of the limit used, 0–100 (capped), for progress bars; 0 when unlimited. */
export function usagePercent(used: number, limit: number | null): number {
  if (limit === null || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

/** Redemptions still allowed before the counter refuses (grace included). */
export function redemptionsLeft(used: number, hardLimit: number): number {
  return Math.max(0, hardLimit - used);
}
