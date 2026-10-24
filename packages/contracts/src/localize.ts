import type { LocalizedText } from './api/templates';

export function localize(text: LocalizedText | string | null | undefined, locale = 'vi'): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  if (locale === 'en' && text.en && text.en.trim().length > 0) {
    return text.en;
  }
  return text.vi;
}
