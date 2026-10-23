import type { Locale, Messages } from '@playora/i18n';

declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
