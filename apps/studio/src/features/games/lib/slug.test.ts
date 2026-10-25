/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { Slug } from '@playora/contracts';
import { slugFromName } from './slug';

describe('slugFromName', () => {
  test('strips Vietnamese diacritics and đ', () => {
    expect(slugFromName('Vòng quay Tết Đinh Mùi 2027', 'ab12')).toBe(
      'vong-quay-tet-dinh-mui-2027-ab12',
    );
  });

  test('falls back when the name has no letters or digits', () => {
    expect(slugFromName('!!!', 'ab12')).toBe('chuong-trinh-ab12');
  });

  test('always satisfies the Slug contract', () => {
    for (const name of ['A', 'x'.repeat(200), '  Quà --- tặng  ', 'Khai trương!']) {
      expect(Slug.safeParse(slugFromName(name)).success).toBe(true);
    }
  });
});
