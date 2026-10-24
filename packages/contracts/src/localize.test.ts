import { describe, expect, test } from 'bun:test';
import { localize } from './localize';

describe('localize', () => {
  test('returns Vietnamese text by default or when locale is vi', () => {
    expect(localize({ vi: 'Vòng quay', en: 'Spin Wheel' })).toBe('Vòng quay');
    expect(localize({ vi: 'Vòng quay', en: 'Spin Wheel' }, 'vi')).toBe('Vòng quay');
  });

  test('returns English text when locale is en and non-empty en is present', () => {
    expect(localize({ vi: 'Vòng quay', en: 'Spin Wheel' }, 'en')).toBe('Spin Wheel');
  });

  test('falls back to Vietnamese when en is missing or blank', () => {
    expect(localize({ vi: 'Vòng quay' }, 'en')).toBe('Vòng quay');
    expect(localize({ vi: 'Vòng quay', en: '' }, 'en')).toBe('Vòng quay');
    expect(localize({ vi: 'Vòng quay', en: '   ' }, 'en')).toBe('Vòng quay');
  });

  test('handles plain strings and nullish values gracefully', () => {
    expect(localize('Plain text', 'en')).toBe('Plain text');
    expect(localize(null, 'vi')).toBe('');
    expect(localize(undefined, 'en')).toBe('');
  });
});
