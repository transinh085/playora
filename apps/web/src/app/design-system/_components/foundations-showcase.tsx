'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  QrCode,
  Sparkles,
  Store,
  TicketCheck,
  TrendingUp,
} from '@playora/ui/icons';
import { ColorPair } from './color-pair';

const COLOR_ROLES = [
  {
    name: 'Canvas / Ground',
    role: 'Nền trang Studio & Quầy đổi quà',
    bg: 'background',
    fg: 'foreground',
  },
  {
    name: 'Card Surface',
    role: 'Thẻ số liệu, bảng, khung thiết lập',
    bg: 'card',
    fg: 'card-foreground',
  },
  {
    name: 'Floating Popover',
    role: 'Dialog, Sheet, Dropdown, Popover',
    bg: 'popover',
    fg: 'popover-foreground',
  },
  {
    name: 'Primary Brand (Teal)',
    role: 'CTA chính duy nhất trên mỗi màn hình',
    bg: 'primary',
    fg: 'primary-foreground',
  },
  {
    name: 'Secondary Surface',
    role: 'Nút phụ, chip lọc, nền tab',
    bg: 'secondary',
    fg: 'secondary-foreground',
  },
  {
    name: 'Muted Subtext',
    role: 'Nhãn phụ, chú thích, placeholder',
    bg: 'muted',
    fg: 'muted-foreground',
  },
  {
    name: 'Success (Đổi được)',
    role: 'Xác nhận trao quà, kiểm tra hợp lệ',
    bg: 'success',
    fg: 'success-foreground',
  },
  {
    name: 'Warning (Cần xử lý)',
    role: 'Quà còn < 20%, cảnh báo pre-flight',
    bg: 'warning',
    fg: 'warning-foreground',
  },
  {
    name: 'Info (Đã lên lịch)',
    role: 'Gợi ý nhịp phát quà, trạng thái chờ',
    bg: 'info',
    fg: 'info-foreground',
  },
  {
    name: 'Live (Đang chạy)',
    role: 'Chiến dịch đang mở nhận khách thật',
    bg: 'live',
    fg: 'live-foreground',
  },
  {
    name: 'Destructive (Lỗi / Chặn)',
    role: 'Mã đã đổi, vượt ngân sách, xoá',
    bg: 'destructive',
    fg: 'destructive-foreground',
  },
  {
    name: 'Sidebar Shell',
    role: 'Khung điều hướng trái của Studio',
    bg: 'sidebar',
    fg: 'sidebar-foreground',
  },
] as const;

const SCALES = [
  {
    name: 'teal',
    note: 'Thương hiệu (hue 192): chỉ dùng cho CTA chính, link, focus ring, mục đang chọn',
    steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
  {
    name: 'ink',
    note: 'Neutral xám lạnh (hue 255, chroma ≤ 0.017): gánh 90% bề mặt Studio yên tĩnh',
    steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  },
  {
    name: 'spotlight',
    note: 'Vàng ánh đèn (hue 75–85): nút quay thưởng, giải đặc biệt, huy hiệu nổi bật',
    steps: [300, 400, 500, 600],
  },
  {
    name: 'stage',
    note: 'Nền đêm sâu (hue 292): dành cho các skin tối và hộp quà bí ẩn',
    steps: [800, 900, 950],
  },
] as const;

const WHEEL_COLORS = [
  { n: 1, label: 'Đỏ cam · Giải Đặc Biệt' },
  { n: 2, label: 'Xanh dương · Mua 1 Tặng 1' },
  { n: 3, label: 'Vàng tươi · Topping miễn phí' },
  { n: 4, label: 'Xanh ngọc · Up size L' },
  { n: 5, label: 'Tím · Giảm 15.000đ' },
  { n: 6, label: 'Xanh băng · Thêm trân châu' },
  { n: 7, label: 'Cam hổ phách · Túi vải Tết' },
  { n: 8, label: 'Hồng đào · Chúc may mắn' },
] as const;

const TYPE_SPECIMENS = [
  {
    token: 'type-display-lg',
    spec: 'Unbounded · clamp(32–52px) / 1.15 · 700 · -0.022em',
    use: 'Hero landing, tiêu đề màn Bìa game, thông báo ĐỔI ĐƯỢC tại quầy',
    sample: 'Kéo khách về quán dịp Tết',
  },
  {
    token: 'type-display-md',
    spec: 'Unbounded · clamp(24–36px) / 1.2 · 700 · -0.018em',
    use: 'Tên giải thưởng trúng, đếm ngược, tiêu đề khối lớn',
    sample: 'Trúng 1 Ly Trà Sữa Ô Long Kem Phô Mai!',
  },
  {
    token: 'type-metric',
    spec: 'Sans · 28px / 36px (1.75rem) · 600 · -0.02em · tabular-nums',
    use: 'Số liệu chính trong MetricCard (Khách tới quầy, Chi phí quà)',
    sample: '312 khách · 1.420.000 ₫ (71%)',
  },
  {
    token: 'type-page-title',
    spec: 'Sans · 22px / 30px (1.375rem) · 600 · -0.015em',
    use: 'PageHeader & Drawer title trên Studio',
    sample: 'Vòng quay Lộc Xuân Trà Sữa Hà · Tết 2027',
  },
  {
    token: 'type-section-title',
    spec: 'Sans · 16px / 24px (1rem) · 600 · -0.01em',
    use: 'CardTitle, DialogTitle, tiêu đề khối tính năng',
    sample: 'Hiệu quả kinh doanh & Nhịp phát quà hôm nay',
  },
  {
    token: 'type-body',
    spec: 'Sans · 14px / 22px (0.875rem) · 400–500',
    use: 'Button, Input, Select, mục Sidebar, dòng bảng, menu item, nội dung chuẩn',
    sample: 'Với ngân sách 2.000.000đ, bạn phát được khoảng 400 phần quà trong 20 ngày.',
  },
  {
    token: 'type-caption',
    spec: 'Sans · 13px / 20px (0.8125rem) · 400–500',
    use: 'Tiêu đề nhóm Accordion Sidebar, chip lọc, mô tả thẻ (CardDescription), chú thích phụ',
    sample: 'Ước tính theo mốc 120 khách/ngày thường bạn nhập · Cập nhật 2 phút trước',
  },
  {
    token: 'type-micro-badge',
    spec: 'Sans · 12px / 16px (0.75rem) · 500',
    use: 'Nhãn phân loại & trạng thái pastel trong bảng dữ liệu (text-xs font-medium)',
    sample: 'Vòng quay · Đang chạy · Skin Tết',
  },
  {
    token: 'type-code-voucher',
    spec: 'Mono · 22px / 1.2 · 700 · +0.16em · tabular-nums',
    use: 'Mã đổi quà 6 ký tự trên màn Trúng thưởng và Quầy đổi quà',
    sample: 'PL94K7',
  },
] as const;

const RADIUS_STEPS = [
  {
    token: '--radius-sm',
    cls: 'rounded-sm',
    val: '4px',
    usedBy: 'Checkbox (14×14px .cbox), ô màu đại diện nhỏ trong menu chọn tổ chức',
  },
  {
    token: '--radius-md',
    cls: 'rounded-md',
    val: '6px',
    usedBy:
      'Chuẩn Control & Tag Louis CRM: Button, Input, SelectTrigger, Textarea, mục Sidebar, Badge 10px, DropdownMenuItem',
  },
  {
    token: '--radius-lg',
    cls: 'rounded-lg',
    val: '8px',
    usedBy:
      'Khung chứa & Menu nổi Louis CRM: Card, TableCard, MetricCard, DropdownMenuContent, SelectContent, Dialog, Toast',
  },
  {
    token: '--radius-xl',
    cls: 'rounded-xl',
    val: '10px',
    usedBy: 'Ô biểu tượng lớn (60×60px avatar badge trong Drawer), khung nhóm đặc biệt',
  },
  {
    token: '--radius-3xl',
    cls: 'rounded-3xl',
    val: '24px',
    usedBy: 'Khung giả lập điện thoại (Player / Quầy đổi quà)',
  },
  {
    token: '--radius-4xl',
    cls: 'rounded-full',
    val: '9999px',
    usedBy: 'Avatar tròn, chấm trạng thái, Switch, Progress, Slider',
  },
] as const;

const ELEVATION_STEPS = [
  {
    name: 'Hairline Border (0.5px)',
    cls: 'bg-background border border-neutral-200 dark:border-white/10',
    token: 'border (0.5px)',
    usedBy:
      'Viền mảnh chuẩn Louis CRM (#E5E5E5 sáng / rgba(255,255,255,0.10) tối) cho Sidebar, Header, lưới bảng và vạch ngăn',
  },
  {
    name: 'Subtle Card (shadow-xs)',
    cls: 'bg-card border border-neutral-200 dark:border-white/10 shadow-xs',
    token: '--shadow-xs',
    usedBy: 'Card, MetricCard, TableCard, Input, Button outline (rounded-md / rounded-lg)',
  },
  {
    name: 'Floating Dropdown (shadow-lg)',
    cls: 'bg-popover border border-neutral-200 dark:border-white/10 shadow-lg',
    token: '--shadow-lg',
    usedBy: 'DropdownMenu, SelectContent, Popover, Toast (nền #FFFFFF sáng / #171717 tối)',
  },
  {
    name: 'Drawer & Modal (shadow-2xl)',
    cls: 'bg-popover border border-neutral-200 dark:border-white/10 shadow-2xl',
    token: 'shadow-2xl',
    usedBy: 'Slide-over Drawer chi tiết chương trình, Dialog Phát hành',
  },
  {
    name: 'Luma Glass (luma-glass)',
    cls: 'luma-glass border border-neutral-200 dark:border-white/10 shadow-sm',
    token: 'backdrop-blur(12px)',
    usedBy: 'Thanh công cụ nổi trên Canvas Builder, Header dính trên điện thoại',
  },
] as const;

export function FoundationsShowcase() {
  return (
    <div className="grid gap-12">
      {/* 1. Color Roles with live WCAG contrast */}
      <div className="grid gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">
            1. Vai trò màu ngữ nghĩa & Độ tương phản trực tiếp (WCAG 2.1)
          </h3>
          <span className="text-xs text-muted-foreground">
            Tự động đo lại khi bấm nút Chế độ Sáng / Tối trên thanh đầu trang
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLOR_ROLES.map((pair) => (
            <ColorPair
              key={pair.name}
              name={pair.name}
              role={pair.role}
              background={pair.bg}
              foreground={pair.fg}
            />
          ))}
        </div>
      </div>

      {/* 2. Primitive OKLCH Scales */}
      <div className="grid gap-5">
        <div className="grid gap-1">
          <h3 className="text-base font-semibold text-foreground">
            2. Thang màu gốc OKLCH (Primitives & Categorical)
          </h3>
          <p className="text-xs text-muted-foreground">
            Đồng nhất độ sáng cảm nhận (perceptual lightness). Component tính năng không gọi trực
            tiếp biến gốc mà đi qua tầng ngữ nghĩa hoặc <code className="font-mono">--game-*</code>.
          </p>
        </div>
        <div className="grid gap-4">
          {SCALES.map((scale) => (
            <div key={scale.name} className="grid gap-2">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-mono text-xs font-semibold text-foreground">
                  --{scale.name}-*
                </span>
                <span className="text-xs text-muted-foreground">{scale.note}</span>
              </div>
              <div className="flex overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
                {scale.steps.map((step) => (
                  <div key={step} className="min-w-0 flex-1">
                    <div className="h-12" style={{ background: `var(--${scale.name}-${step})` }} />
                    <div className="truncate px-2 py-1 font-mono text-[11px] text-muted-foreground tabular-nums">
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="grid gap-2">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-xs font-semibold text-foreground">--team-1…8</span>
              <span className="text-xs text-muted-foreground">
                8 màu múi vòng quay / phân loại quà mặc định — luôn đi kèm nhãn chữ hoặc biểu tượng.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
              {WHEEL_COLORS.map((item) => (
                <div
                  key={item.n}
                  className="flex flex-col justify-between rounded-2xl border border-black/10 p-3 text-xs font-semibold text-stage shadow-xs"
                  style={{ background: `var(--team-${item.n})` }}
                >
                  <span className="font-mono text-[11px] opacity-75">--team-{item.n}</span>
                  <span className="mt-2 leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Typography Specimen */}
      <div className="grid gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="grid gap-1">
            <h3 className="text-base font-semibold text-foreground">
              3. Thang chữ & Kiểm thử dấu tiếng Việt (Typography Specimen)
            </h3>
            <p className="text-xs text-muted-foreground">
              Kết hợp <strong>Unbounded</strong> cho khoảnh khắc trình diễn/trúng thưởng và{' '}
              <strong>Be Vietnam Pro / Google Sans</strong> cho bàn làm việc mật độ cao.
            </p>
          </div>
          <Chip variant="caption" color="neutral" className="font-mono text-xs">
            Kiểm dấu: Ầ Ẩ Ẫ Ậ Ắ Ặ Ữ Ỹ ổ ợ ự Đ ₫
          </Chip>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/80 bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Token utility</th>
                  <th className="px-4 py-3 font-medium">Thông số kỹ thuật</th>
                  <th className="px-4 py-3 font-medium">Ngữ cảnh sử dụng (PRD)</th>
                  <th className="px-4 py-3 font-medium">Mẫu hiển thị thực tế</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {TYPE_SPECIMENS.map((row) => (
                  <tr key={row.token} className="hover:bg-muted/30">
                    <td className="px-4 py-3.5 align-middle font-mono text-xs font-medium text-primary whitespace-nowrap">
                      .{row.token}
                    </td>
                    <td className="px-4 py-3.5 align-middle font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {row.spec}
                    </td>
                    <td className="max-w-xs px-4 py-3.5 align-middle text-xs text-muted-foreground">
                      {row.use}
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <span className={`${row.token} block truncate max-w-md text-foreground`}>
                        {row.sample}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Radius, Elevation & Icons */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-3">
          <h3 className="text-base font-semibold text-foreground">
            4. Hình khối bo góc (Luma Radius Scale)
          </h3>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {RADIUS_STEPS.map((r) => (
              <div
                key={r.token}
                className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs"
              >
                <div
                  className={`size-12 shrink-0 border-2 border-primary bg-primary/10 ${r.cls}`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">{r.cls}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">({r.val})</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.usedBy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid content-start gap-3">
          <h3 className="text-base font-semibold text-foreground">
            5. Độ nổi phân tầng & Kính mờ (Elevation & Glass)
          </h3>
          <div className="grid gap-2.5">
            {ELEVATION_STEPS.map((e) => (
              <div
                key={e.name}
                className={`flex items-center justify-between gap-4 rounded-2xl p-3.5 ${e.cls}`}
              >
                <div>
                  <span className="text-xs font-semibold text-foreground">{e.name}</span>
                  <p className="text-xs text-muted-foreground">{e.usedBy}</p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                  {e.token}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-2 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                Hệ biểu tượng (Hugeicons · 16px trong nút/nhãn, 20px trong IconTile)
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                @hugeicons/react · @playora/ui/icons
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-foreground">
              {[
                { Icon: Sparkles, label: 'Playbook' },
                { Icon: CalendarDays, label: 'Chương trình' },
                { Icon: TicketCheck, label: 'Đổi quà' },
                { Icon: Store, label: 'Máy quầy' },
                { Icon: QrCode, label: 'QR Standee' },
                { Icon: TrendingUp, label: 'Kết quả' },
                { Icon: CheckCircle2, label: 'Đạt chuẩn' },
                { Icon: AlertTriangle, label: 'Cảnh báo' },
              ].map(({ Icon, label }) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-xs"
                >
                  <Icon className="size-4 text-primary" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
