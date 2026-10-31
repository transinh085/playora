import { Toaster } from '@playora/ui/components/base/toast/toast';
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
      <body className="min-h-dvh font-sans antialiased bg-background-full text-text-primary selection:bg-accent-500/20 selection:text-accent-700">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
          <Toaster position="top-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
