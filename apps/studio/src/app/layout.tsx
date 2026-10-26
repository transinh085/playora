import { AntdRegistry } from '@playora/ui/providers';
import type { Metadata } from 'next';
import { Google_Sans, Unbounded } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Providers } from './providers';
import './globals.css';

const font = Google_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: false,
});

// Display face for the wordmark, game titles, scores and timers (docs/engineering/design-system.md).
const display = Unbounded({ subsets: ['latin', 'vietnamese'], variable: '--font-display' });

export const metadata: Metadata = {
  title: { default: 'Playora Studio', template: '%s · Playora Studio' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${font.variable} ${display.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        <NextIntlClientProvider>
          <AntdRegistry>
            <Providers>{children}</Providers>
          </AntdRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
