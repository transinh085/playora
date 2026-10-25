import { describe, expect, test } from 'bun:test';
import { normalizeCode } from './code';

describe('normalizeCode', () => {
  test('uppercases and strips separators', () => {
    expect(normalizeCode(' k7m-2qx ')).toBe('K7M2QX');
    expect(normalizeCode('ab cd.ef')).toBe('ABCDEF');
  });

  test('caps the length', () => {
    expect(normalizeCode('a'.repeat(20))).toHaveLength(12);
  });
});
