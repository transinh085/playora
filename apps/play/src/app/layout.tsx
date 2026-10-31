import { Toaster } from '@playora/ui/components/base/toast/toast';
import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Unbounded } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

const font = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '800'],
  variable: '--font-sans',
});

// Display face for the wordmark, game titles, scores and timers (docs/engineering/design-system.md).
const display = Unbounded({ subsets: ['latin', 'vietnamese'], variable: '--font-display' });

export const metadata: Metadata = { title: 'Playora', description: 'Cả hội trường cùng chơi.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  const playMessages = {
    play: messages.play,
    errors: messages.errors,
    campaignPlayer: messages.campaignPlayer,
  };
  return (
    <html lang={locale} className={`${font.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={playMessages}>
          {children}
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
