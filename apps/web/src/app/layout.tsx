import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Unbounded } from 'next/font/google';
import './globals.css';

const font = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '800'],
  variable: '--font-sans',
});

// Display face for the wordmark, game titles, scores and timers (docs/13-design-system.md).
const display = Unbounded({ subsets: ['latin', 'vietnamese'], variable: '--font-display' });

export const metadata: Metadata = { title: 'Playora — Cả hội trường cùng chơi' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${font.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
