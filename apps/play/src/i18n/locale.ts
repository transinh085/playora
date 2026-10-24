import { defaultLocale, isLocale, type Locale } from '@playora/i18n';

export interface ResolveLocaleInput {
  cookie?: string | null;
  acceptLanguage?: string | null;
}

/**
 * Resolves the player locale from cookie (`playora_locale`), then `Accept-Language`,
 * defaulting to `'vi'`.
 */
export function resolveLocale(input: ResolveLocaleInput = {}): Locale {
  if (isLocale(input.cookie)) {
    return input.cookie;
  }

  if (input.acceptLanguage) {
    const candidates = input.acceptLanguage
      .split(',')
      .map((part, index) => {
        const [rawTag = '', ...params] = part.trim().split(';');
        let q = 1;
        for (const param of params) {
          const [key, val] = param.trim().split('=');
          if (key === 'q' && val !== undefined) {
            const parsed = Number.parseFloat(val);
            if (!Number.isNaN(parsed)) {
              q = parsed;
            }
          }
        }
        const primary = rawTag.trim().split('-')[0]?.toLowerCase() ?? '';
        return { primary, q, index };
      })
      .filter((c) => c.primary.length > 0 && c.q > 0)
      .sort((a, b) => b.q - a.q || a.index - b.index);

    for (const candidate of candidates) {
      if (isLocale(candidate.primary)) {
        return candidate.primary;
      }
    }
  }

  return defaultLocale;
}
