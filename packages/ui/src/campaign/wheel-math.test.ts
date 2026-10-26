import { describe, expect, test } from 'bun:test';
import type { CampaignPrize } from '@playora/contracts';
import {
  buildSlices,
  MIN_SLICES,
  sliceAtPointer,
  sliceCenter,
  targetRotation,
  targetSliceIndex,
} from './wheel-math';

const prize = (id: string): CampaignPrize => ({ id, name: id, quantity: 1, valueVnd: 0 });
const prizes = [prize('a'), prize('b'), prize('c')];

describe('buildSlices', () => {
  test('interleaves prizes with luck slices', () => {
    const slices = buildSlices(prizes);
    expect(slices.map((s) => (s.kind === 'prize' ? s.prize.id : '-'))).toEqual([
      'a',
      '-',
      'b',
      '-',
      'c',
      '-',
    ]);
  });

  test('repeats prizes up to the minimum slice count', () => {
    const slices = buildSlices([prize('a')]);
    expect(slices).toHaveLength(MIN_SLICES);
    expect(slices.filter((s) => s.kind === 'prize')).toHaveLength(MIN_SLICES / 2);
  });

  test('no prizes gives an all-luck wheel', () => {
    expect(buildSlices([]).every((s) => s.kind === 'luck')).toBe(true);
  });
});

describe('targetSliceIndex', () => {
  const slices = buildSlices(prizes);

  test('win lands on the won prize', () => {
    for (const rng of [() => 0, () => 0.99]) {
      const index = targetSliceIndex(slices, { outcome: 'win', prize: prizes[1] ?? null }, rng);
      const slice = slices[index];
      expect(slice?.kind === 'prize' && slice.prize.id).toBe('b');
    }
  });

  test('lose lands on a luck slice', () => {
    for (const r of [0, 0.4, 0.99]) {
      const index = targetSliceIndex(slices, { outcome: 'lose', prize: null }, () => r);
      expect(slices[index]?.kind).toBe('luck');
    }
  });
});

describe('targetRotation', () => {
  test('lands every slice under the pointer after the requested turns', () => {
    for (const count of [6, 8, 10]) {
      for (let index = 0; index < count; index++) {
        for (const current of [0, 137, -45, 1980]) {
          for (const jitter of [-0.3, 0, 0.3]) {
            const rotation = targetRotation(current, index, count, 5, jitter);
            expect(rotation - current).toBeGreaterThanOrEqual(5 * 360);
            expect(rotation - current).toBeLessThan(6 * 360);
            expect(sliceAtPointer(rotation, count)).toBe(index);
          }
        }
      }
    }
  });

  test('without jitter the slice centre ends at the top', () => {
    const rotation = targetRotation(0, 2, 6, 4);
    expect((((rotation + sliceCenter(2, 6)) % 360) + 360) % 360).toBeCloseTo(0);
  });
});
