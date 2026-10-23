export interface ClockSample {
  /** Client time when the ping was sent. */
  t0: number;
  /** Server time in the reply. */
  ts: number;
  /** Client time when the reply arrived. */
  t1: number;
}

/**
 * NTP-lite: offset = server − client at the midpoint of each round trip; the median of a few
 * samples ignores outliers from a slow packet. `serverNow ≈ Date.now() + offset`.
 */
export function estimateOffset(samples: readonly ClockSample[]): number {
  if (samples.length === 0) return 0;
  const offsets = samples.map(({ t0, ts, t1 }) => ts - (t0 + t1) / 2).sort((a, b) => a - b);
  const mid = Math.floor(offsets.length / 2);
  const median =
    offsets.length % 2 ? offsets[mid] : ((offsets[mid - 1] ?? 0) + (offsets[mid] ?? 0)) / 2;
  return Math.round(median ?? 0);
}
