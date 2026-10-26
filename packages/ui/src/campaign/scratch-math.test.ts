import { describe, expect, test } from 'bun:test';
import { clearedRatio } from './scratch-math';

const pixels = (alphas: number[]) => new Uint8ClampedArray(alphas.flatMap((a) => [0, 0, 0, a]));

describe('clearedRatio', () => {
  test('counts transparent pixels', () => {
    expect(clearedRatio(pixels([255, 255, 255, 255]), 1)).toBe(0);
    expect(clearedRatio(pixels([0, 0, 255, 255]), 1)).toBe(0.5);
    expect(clearedRatio(pixels([0, 10, 100, 0]), 1)).toBe(1);
  });

  test('samples every step-th pixel', () => {
    expect(clearedRatio(pixels([0, 255, 0, 255]), 2)).toBe(1);
  });

  test('empty data is not cleared', () => {
    expect(clearedRatio(new Uint8ClampedArray(), 8)).toBe(0);
  });
});
