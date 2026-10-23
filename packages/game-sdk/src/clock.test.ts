import { describe, expect, test } from 'bun:test';
import { createClockSync, estimateClockOffset, sampleOffset, sampleRtt } from './clock';

describe('clock sync utilities', () => {
  test('recovers a fixed offset from symmetric round trips', () => {
    const firstSample = { t0: 0, ts: 1_020, t1: 40 };
    const samples = [0, 100, 200].map((t0) => ({ t0, ts: t0 + 20 + 1_000, t1: t0 + 40 }));
    expect(estimateClockOffset(samples)).toBe(1_000);
    expect(sampleRtt(firstSample)).toBe(40);
    expect(sampleOffset(firstSample)).toBe(1_000);
  });

  test('median filtering ignores slow outlier packets for odd and even sample counts', () => {
    const oddSamples = [
      { t0: 0, ts: 1_020, t1: 40 }, // +1000
      { t0: 100, ts: 1_120, t1: 140 }, // +1000
      { t0: 200, ts: 2_500, t1: 1_800 }, // +1500 outlier
    ];
    expect(estimateClockOffset(oddSamples)).toBe(1_000);

    const evenSamples = [
      { t0: 0, ts: 1_010, t1: 40 }, // +990
      { t0: 100, ts: 1_130, t1: 140 }, // +1010
      { t0: 200, ts: 1_220, t1: 240 }, // +1000
      { t0: 300, ts: 4_000, t1: 2_300 }, // +2700 outlier
    ];
    // Sorted offsets: [990, 1000, 1010, 2700] -> average of 1000 and 1010 = 1005
    expect(estimateClockOffset(evenSamples)).toBe(1_005);
  });

  test('returns 0 for empty or invalid samples', () => {
    expect(estimateClockOffset([])).toBe(0);
    expect(estimateClockOffset([{ t0: 500, ts: 1_000, t1: 400 }])).toBe(0);
  });

  test('createClockSync maintains a rolling window and computes serverNow and remainingMs', () => {
    let fakeNow = 10_000;
    const clock = createClockSync({ maxSamples: 3, now: () => fakeNow });

    expect(clock.offsetMs).toBe(0);
    expect(clock.now()).toBe(10_000);

    clock.recordSamples([
      { t0: 100, ts: 620, t1: 140 }, // +500
      { t0: 200, ts: 720, t1: 240 }, // +500
      { t0: 300, ts: 2_000, t1: 500 }, // +1600 outlier
    ]);
    expect(clock.offsetMs).toBe(500);
    expect(clock.now()).toBe(10_500);
    expect(clock.remainingMs(15_500)).toBe(5_000);
    expect(clock.remainingMs(9_000)).toBe(0);

    // Push two new samples (+800) so the window [500, 800, 800] shifts median to 800
    clock.recordSample({ t0: 400, ts: 1_220, t1: 440 });
    clock.recordSample({ t0: 500, ts: 1_320, t1: 540 });
    expect(clock.samples).toHaveLength(3);
    expect(clock.offsetMs).toBe(800);

    fakeNow = 11_000;
    expect(clock.now()).toBe(11_800);

    clock.reset();
    expect(clock.offsetMs).toBe(0);
    expect(clock.samples).toHaveLength(0);
  });
});
