import { Badge } from '@playora/ui/components/badge';
import type { Metadata } from 'next';
import { Logo, LogoMark } from '@/components/logo';
import { FoundationsShowcase } from './_components/foundations-showcase';
import { GamePreview } from './_components/game-preview';
import { PrdRecipes } from './_components/prd-recipes';
import { StudioPreview } from './_components/studio-preview';
import { ThemeToggle } from './_components/theme-toggle';

export const metadata: Metadata = {
  title: 'Playora Design System v2.0 — shadcn/ui Luma',
  robots: { index: false },
};

function Section({
  id,
  badge,
  title,
  lead,
  children,
}: {
  id: string;
  badge: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="grid scroll-mt-20 gap-6 border-t border-border/80 py-12">
      <header className="grid max-w-3xl gap-2">
        <div>
          <Badge variant="secondary" className="font-mono text-[11px]">
            {badge}
          </Badge>
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">{lead}</p>
      </header>
      {children}
    </section>
  );
}

const NAV_ITEMS = [
  ['foundations', '1. Nền tảng (Tokens & WCAG)'],
  ['studio', '2. Thành phần Studio (shadcn/ui)'],
  ['recipes', '3. Mẫu nghiệp vụ PRD v4.3'],
  ['game', '4. Player & Skin Engine'],
  ['logo', '5. Nhận diện & White-label'],
] as const;

export default function DesignSystemPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Sticky Luma Glass Header */}
      <div className="luma-glass sticky top-0 z-40 border-b border-border/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo className="text-xl" />
            <Badge variant="outline" className="font-mono text-xs">
              v2.0 · shadcn/ui luma · ADR-016
            </Badge>
          </div>
          <nav className="hidden flex-wrap items-center gap-x-5 gap-y-1 text-xs font-medium lg:flex">
            {NAV_ITEMS.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                {label}
              </a>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
        {/* Hero Overview */}
        <header className="grid gap-6 pb-12">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">PRD v4.3 Aligned</Badge>
            <Badge variant="outline">Radix UI + Tailwind CSS v4</Badge>
            <Badge variant="outline">OKLCH Perceptual Tokens</Badge>
          </div>
          <h1 className="type-display-lg max-w-4xl text-balance text-foreground">
            Studio yên tĩnh cho chủ quán. Game rực rỡ cho khách chơi. Quầy đổi quà 3 giây.
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
            Hệ thống thiết kế Playora v2.0 dựng trên <strong>shadcn/ui (style luma)</strong>, kết
            hợp triết lý bàn làm việc SaaS/AI hiện đại (Vercel Geist/v0, Dub.co, Cal.com, Midday)
            với bộ máy skin 3 tầng cho minigame có thưởng tại quán trà sữa, cà phê và chuỗi F&amp;B.
            Đặc tả kỹ thuật đầy đủ tại{' '}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm">
              docs/engineering/design-system.md
            </code>
            .
          </p>

          {/* 4-Surface Summary Grid from PRD §3 */}
          <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                surface: '1. Studio (Desktop-first)',
                persona: 'Chị Hà (Chủ quán) · Chị Thảo (Quản lý)',
                desc: 'Nền ink-50 yên tĩnh, thẻ bo 16px (rounded-2xl), mọi control Button/Input/Select đồng bộ bo 12px (rounded-xl).',
              },
              {
                surface: '2. Builder 3 Chế độ',
                persona: 'Sửa nhanh · Tuỳ biến · Luật & Giải',
                desc: 'Toàn màn hình, thanh chuyển chế độ nổi luma-glass, mô phỏng rủi ro hết quà và hộp kiểm tra phát hành.',
              },
              {
                surface: '3. Quầy đổi quà (Mobile)',
                persona: 'Tuấn (Nhân viên quầy giờ cao điểm)',
                desc: 'Ghép máy bằng QR (ORG-10), chữ trạng thái ĐỔI ĐƯỢC cực đại, tìm theo SĐT, nút xác nhận 56px.',
              },
              {
                surface: '4. Player & Kiosk (Mobile)',
                persona: 'Khách của quán trên mạng 4G',
                desc: 'Tải ≤ 260 KB gzip, đổi da theo Skin × Brand Kit tự tính tương phản WCAG, đồng hồ thực chống chụp màn hình.',
              },
            ].map((item) => (
              <div
                key={item.surface}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs"
              >
                <div className="text-sm font-bold text-foreground">{item.surface}</div>
                <div className="mt-0.5 text-xs font-medium text-primary">{item.persona}</div>
                <p className="mt-2 text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </header>

        <Section
          id="foundations"
          badge="Foundations · Tokens & Accessibility"
          title="Nền tảng: Màu sắc OKLCH, Chữ tiếng Việt & Hình khối Luma"
          lead="Ba tầng token: Primitive (--teal-*, --ink-*, --spotlight-*) → Studio Semantic (--background, --primary, --success…) → Game Surface (--game-*). Mọi cặp màu ngữ nghĩa được đo độ tương phản WCAG 2.1 trực tiếp trên trang."
        >
          <FoundationsShowcase />
        </Section>

        <Section
          id="studio"
          badge="Components · @playora/ui/components"
          title="Thành phần Studio & Ma trận Trạng thái (shadcn/ui Luma)"
          lead="Toàn bộ primitive dùng Radix UI + Tailwind v4 với hệ bo góc đồng tâm (Concentric Radius): mọi control (Button, Input, Select, Textarea, TabsList) thống nhất bo 12px (rounded-xl), item con bên trong bo 8px (rounded-lg), thẻ và hộp thoại bo 16px (rounded-2xl)."
        >
          <StudioPreview />
        </Section>

        <Section
          id="recipes"
          badge="Domain Recipes · PRD v4.3"
          title="Mẫu nghiệp vụ chuẩn theo PRD v4.3 & Quy tắc Do / Don't"
          lead="4 bản mẫu lắp ghép trực tiếp từ bộ component của hệ thống: Luồng Playbook & Ngân sách (PLB-01/02), Màn Vận hành & Báo cáo Kết quả (PLB-03), Quầy đổi quà trên điện thoại (PRZ-10/18), và 4 cặp quy tắc bắt buộc."
        >
          <PrdRecipes />
        </Section>

        <Section
          id="game"
          badge="Player Surface · @playora/ui/game"
          title="Bề mặt Người chơi (Player), Skin theo mùa & Brand Kit tự động"
          lead="Mọi bề mặt người chơi thấy đều bọc trong GameRoot (PlayProvider + --game-*). Thứ tự áp dụng: mẫu mặc định → skin ([data-skin]) → brand kit (brandKitVars) → ghi đè từng ô ảnh. Chữ tự động chọn sáng/tối theo tương phản WCAG ≥ 3:1."
        >
          <GamePreview />
        </Section>

        <Section
          id="logo"
          badge="Brand Identity · ORG-04 & BIL-02"
          title="Logo & Quy tắc White-label"
          lead="Biểu tượng nút Play dưới một chấm đèn spotlight. Wordmark luôn viết thường bằng font Unbounded. Ở gói có quyền White-label (ORG-04), watermark và logo Playora trên Player được ẩn hoàn toàn."
        >
          <div className="flex flex-wrap items-center gap-8 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
            <Logo className="text-3xl" />
            <LogoMark className="size-16" />
            <div className="dark rounded-2xl border border-white/10 bg-background p-6 text-foreground">
              <Logo className="text-2xl" />
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
