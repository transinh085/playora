import { defaultLocale, getMessages, LOCALE_COOKIE } from '@playora/i18n';
import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { resolveLocale } from './locale';

/** Locale comes from the `playora_locale` cookie, then `Accept-Language`, defaulting to `vi`. */
export default getRequestConfig(async () => {
  let locale = defaultLocale;
  try {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
    locale = resolveLocale({
      cookie: cookieStore.get(LOCALE_COOKIE)?.value,
      acceptLanguage: headerStore.get('accept-language'),
    });
  } catch {
    locale = defaultLocale;
  }
  const allMessages = getMessages(locale);
  return {
    locale,
    messages: {
      play: allMessages.play,
      errors: allMessages.errors,
    },
    timeZone: 'Asia/Ho_Chi_Minh',
  };
});
