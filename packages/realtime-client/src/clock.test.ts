import { describe, expect, test } from 'bun:test';
import { estimateOffset } from './clock';

describe('estimateOffset', () => {
  test('recovers a fixed offset from symmetric round trips', () => {
    // Server is 1000 ms ahead; each round trip takes 40 ms.
    const samples = [0, 100, 200].map((t0) => ({ t0, ts: t0 + 20 + 1000, t1: t0 + 40 }));
    expect(estimateOffset(samples)).toBe(1000);
  });

  test('median ignores one slow outlier', () => {
    const samples = [
      { t0: 0, ts: 1020, t1: 40 },
      { t0: 100, ts: 1120, t1: 140 },
      { t0: 200, ts: 1900, t1: 1400 },
    ];
    expect(estimateOffset(samples)).toBe(1000);
  });

  test('no samples means no correction', () => {
    expect(estimateOffset([])).toBe(0);
  });
});
