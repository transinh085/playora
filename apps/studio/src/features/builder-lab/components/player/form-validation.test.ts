import { describe, expect, test } from 'bun:test';
import { isValidPhone, normalizePhone, validatePlayerForm } from './form-validation';

describe('player form', () => {
  test('normalises and validates Vietnamese mobile numbers', () => {
    expect(normalizePhone('+84 901.234-567')).toBe('0901234567');
    expect(isValidPhone('0901 234 567')).toBe(true);
    expect(isValidPhone('+84376543210')).toBe(true);
    expect(isValidPhone('0201234567')).toBe(false);
    expect(isValidPhone('090123456')).toBe(false);
  });

  test('reports every missing field', () => {
    expect(validatePlayerForm({ name: ' ', phone: '12', consent: false })).toEqual({
      name: 'nameRequired',
      phone: 'phoneInvalid',
      consent: 'consentRequired',
    });
    expect(validatePlayerForm({ name: 'An', phone: '0912345678', consent: true })).toEqual({});
  });
});
