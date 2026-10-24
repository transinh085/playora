import { describe, expect, test } from 'bun:test';
import { createClockSync, estimateClockOffset, estimateOffset } from './index';

describe('realtime-client clock re-exports (from @playora/game-sdk)', () => {
  test('recovers a fixed offset from symmetric round trips', () => {
    const samples = [0, 100, 200].map((t0) => ({ t0, ts: t0 + 20 + 1000, t1: t0 + 40 }));
    expect(estimateClockOffset(samples)).toBe(1000);
    expect(estimateOffset(samples)).toBe(1000);
  });

  test('median ignores one slow outlier and createClockSync tracks offset', () => {
    const samples = [
      { t0: 0, ts: 1020, t1: 40 },
      { t0: 100, ts: 1120, t1: 140 },
      { t0: 200, ts: 1900, t1: 1400 },
    ];
    expect(estimateOffset(samples)).toBe(1000);

    const clock = createClockSync({ now: () => 5_000 });
    clock.recordSamples(samples);
    expect(clock.offsetMs).toBe(1000);
    expect(clock.now()).toBe(6_000);
  });

  test('no samples means no correction', () => {
    expect(estimateOffset([])).toBe(0);
  });
});
