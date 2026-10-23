import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Unbounded } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Providers } from './providers';
import './globals.css';

const font = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

// Display face for the wordmark, game titles, scores and timers (docs/13-design-system.md).
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
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
