import type { Metadata } from 'next';
import { Logo, LogoMark } from '@/components/logo';
import { GamePreview } from './_components/game-preview';
import { StudioPreview } from './_components/studio-preview';

export const metadata: Metadata = {
  title: 'Playora Design System',
  robots: { index: false },
};

const SCALES = [
  {
    name: 'teal',
    note: 'Thương hiệu: chỉ cho hành động chính, link, focus, mục đang chọn',
    steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
  {
    name: 'ink',
    note: 'Neutral xám lạnh, gánh gần hết giao diện Studio',
    steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  },
  {
    name: 'spotlight',
    note: 'Ánh đèn sân khấu: nút chơi, điểm, top 1',
    steps: [300, 400, 500, 600],
  },
  { name: 'stage', note: 'Nền đêm cho skin sân khấu', steps: [800, 900, 950] },
  {
    name: 'violet',
    note: 'Legacy: chỉ còn cho skin classic',
    steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
];

const TEAM_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8];

const SEMANTIC = [
  { token: 'success', label: 'Thành công · đã check-in' },
  { token: 'warning', label: 'Cảnh báo · pre-flight' },
  { token: 'info', label: 'Thông tin · đã lên lịch' },
  { token: 'live', label: 'On air · đang diễn ra' },
  { token: 'destructive', label: 'Xoá, lỗi' },
];

const TYPE_STUDIO = [
  { cls: 'text-2xl font-semibold', label: 'Tiêu đề trang · 24/28 · 600' },
  { cls: 'text-xl font-semibold', label: 'Tiêu đề modal · 20/24 · 600' },
  { cls: 'text-base font-semibold', label: 'Tiêu đề khối · 16/20 · 600' },
  { cls: 'text-sm', label: 'Nội dung, bảng, form · 14/20 · 400' },
  { cls: 'text-xs text-muted-foreground', label: 'Chú thích · 12/16 · 400' },
];

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="grid scroll-mt-8 gap-6 border-t py-12">
      <header className="grid max-w-2xl gap-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{lead}</p>
      </header>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <header className="grid gap-6 pb-12">
        <Logo className="text-xl" />
        <h1 className="max-w-3xl font-display text-4xl leading-[1.15] font-bold tracking-tight text-balance sm:text-5xl">
          Một hệ thống cho bàn làm việc và bề mặt người chơi.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Studio yên tĩnh trên Ant Design v6 để agency dựng chiến dịch nhanh. Bề mặt người chơi sáng
          như sân khấu, bấm được bằng một ngón và đổi da theo từng sự kiện bằng skin cùng brand kit.
          Đặc tả đầy đủ ở docs/13-design-system.md.
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {[
            ['mau', 'Màu'],
            ['chu', 'Chữ'],
            ['studio', 'Studio'],
            ['game', 'Game & skin'],
            ['logo', 'Logo'],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <Section
        id="mau"
        title="Màu"
        lead="Ba tầng token: primitive → ThemeConfig cho Studio → --game-* cho người chơi và kiosk. Component chỉ dùng hai tầng sau."
      >
        <div className="grid gap-5">
          {SCALES.map((scale) => (
            <div key={scale.name} className="grid gap-2">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-medium">--{scale.name}-*</span>
                <span className="text-sm text-muted-foreground">{scale.note}</span>
              </div>
              <div className="flex overflow-hidden rounded-lg border">
                {scale.steps.map((step) => (
                  <div key={step} className="min-w-0 flex-1">
                    <div className="h-14" style={{ background: `var(--${scale.name}-${step})` }} />
                    <div className="truncate px-1.5 py-1 text-[11px] text-muted-foreground tabular-nums">
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="grid gap-2">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm font-medium">--team-1…8</span>
              <span className="text-sm text-muted-foreground">
                Màu đội thi đấu. Luôn đi kèm nhãn tên đội.
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {TEAM_NUMBERS.map((n) => (
                <div
                  key={n}
                  className="grid h-14 place-items-center rounded-lg text-sm font-semibold text-stage"
                  style={{ background: `var(--team-${n})` }}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-5">
          {SEMANTIC.map((s) => (
            <div key={s.token} className="grid gap-2 rounded-lg border p-3">
              <div className="h-8 rounded-md" style={{ background: `var(--${s.token})` }} />
              <span className="font-mono text-xs">{s.token}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="chu"
        title="Chữ"
        lead="Unbounded cho khoảnh khắc trình diễn: wordmark, tên game, điểm, đồng hồ. Be Vietnam Pro, do người Việt thiết kế, cho mọi nội dung và giao diện. Cả hai có đủ dấu tiếng Việt."
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="grid content-start gap-3 rounded-xl border p-6">
            <span className="text-sm text-muted-foreground">Display · Unbounded</span>
            <p className="font-display text-5xl font-bold tracking-tight">
              Cả hội trường cùng chơi
            </p>
            <p className="font-display text-4xl font-extrabold tabular-nums">00:05 · 2.210</p>
            <p className="font-display text-lg">Ầ Ẩ Ẫ Ậ Ắ Ặ Ữ Ỹ ổ ợ ự</p>
          </div>
          <div className="grid content-start gap-3 rounded-xl border p-6">
            <span className="text-sm text-muted-foreground">
              Text · Be Vietnam Pro (thang Studio)
            </span>
            {TYPE_STUDIO.map((t) => (
              <div key={t.label} className="grid gap-0.5">
                <span className={t.cls}>Year End Party Công ty ABC 2026</span>
                <span className="text-xs text-muted-foreground">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section
        id="studio"
        title="Studio (Ant Design v6)"
        lead="Công cụ làm việc dựng trên Ant Design v6 và StudioProvider: mật độ vừa, ít màu, trạng thái rõ. Màu thương hiệu chỉ dành cho hành động chính và trạng thái đang chọn."
      >
        <StudioPreview />
      </Section>

      <Section
        id="game"
        title="Game & skin"
        lead="Mọi bề mặt người chơi thấy đều bọc trong GameRoot (PlayProvider + --game-*). Skin đổi cả bộ token; brand kit của khách đè lên sau, và chữ tự đổi sáng/tối để luôn đọc được."
      >
        <GamePreview />
      </Section>

      <Section
        id="logo"
        title="Logo"
        lead="Nút play dưới một chấm đèn spotlight. Wordmark luôn viết thường. Ở chế độ white-label, logo Playora được ẩn hoàn toàn."
      >
        <div className="flex flex-wrap items-center gap-8">
          <Logo className="text-3xl" />
          <LogoMark className="size-16" />
          <div className="dark rounded-xl bg-background p-6 text-foreground">
            <Logo className="text-2xl" />
          </div>
        </div>
      </Section>
    </main>
  );
}
