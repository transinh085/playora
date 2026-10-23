import { defaultLocale, getMessages, isLocale, LOCALE_COOKIE } from '@playora/i18n';
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

/** Locale comes from a cookie (no /vi, /en URL prefix in Studio). */
export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value) ? value : defaultLocale;
  return { locale, messages: getMessages(locale), timeZone: 'Asia/Ho_Chi_Minh' };
});
