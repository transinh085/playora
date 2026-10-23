import en from './messages/en.json';
import vi from './messages/vi.json';

export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'vi';
export const LOCALE_COOKIE = 'playora_locale';

/** Vietnamese is the source of truth; other locales must have the same keys. */
export type Messages = typeof vi;

const catalog: Record<Locale, Messages> = { vi, en };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

export function getMessages(locale: Locale): Messages {
  return catalog[locale];
}
