/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { resolveLocale } from './locale';

describe('resolveLocale', () => {
  test('prefers valid cookie over Accept-Language', () => {
    expect(resolveLocale({ cookie: 'en', acceptLanguage: 'vi-VN,vi;q=0.9' })).toBe('en');
    expect(resolveLocale({ cookie: 'vi', acceptLanguage: 'en-US,en;q=0.9' })).toBe('vi');
  });

  test('falls back to Accept-Language when cookie is missing or invalid', () => {
    expect(resolveLocale({ cookie: undefined, acceptLanguage: 'en-US,en;q=0.9,vi;q=0.8' })).toBe(
      'en',
    );
    expect(resolveLocale({ cookie: 'fr', acceptLanguage: 'fr-FR,en;q=0.8,vi;q=0.9' })).toBe('vi');
  });

  test('defaults to vi when neither cookie nor Accept-Language matches', () => {
    expect(resolveLocale()).toBe('vi');
    expect(resolveLocale({ cookie: 'jp', acceptLanguage: 'ja-JP,fr;q=0.8' })).toBe('vi');
  });
});
