import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Unbounded } from 'next/font/google';
import './globals.css';

const font = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '800'],
  variable: '--font-sans',
});

// Display face for the wordmark, game titles, scores and timers (docs/engineering/design-system.md).
const display = Unbounded({ subsets: ['latin', 'vietnamese'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Playora — Minigame trúng thưởng kéo khách tới quầy & quay lại cho quán',
  description:
    'Tạo vòng quay, thẻ cào, hộp quà mang thương hiệu quán trong 5 phút. Tự động rải đều kho quà theo giờ mở cửa, đổi mã 6 ký tự tại quầy và đo lường khách quay lại.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${font.variable} ${display.variable}`}>
      <body className="min-h-dvh bg-background-full font-sans text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
