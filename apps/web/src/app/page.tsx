import { Chip } from '@playora/ui/components/base/badges/chip';
import { ButtonLink } from '@playora/ui/components/base/buttons/button';
import { ProgressBar } from '@playora/ui/components/base/progress/progress';
import {
  ArrowRight,
  BarChart2,
  Calendar,
  Check,
  Gift,
  QrCode,
  Repeat,
  ShieldCheck,
  Sparkles,
  Store,
  TicketCheck,
} from '@playora/ui/icons';
import { Logo } from '@/components/logo';

const PLAYBOOKS = [
  {
    badge: 'Dịp lễ & Khai trương',
    color: 'orange' as const,
    icon: Sparkles,
    title: 'Đông khách dịp Tết & Khai trương',
    goal: 'Tăng lượng khách ghé quán trong 7–14 ngày cao điểm',
    mechanism:
      'Vòng quay may mắn theo mùa, mỗi khách 1 lượt/ngày, hệ thống tự động rải đều quà theo khung giờ mở cửa.',
    metric: 'Số lượt đổi quà tại quầy mỗi ngày & chi phí trên mỗi khách ghé quán',
  },
  {
    badge: 'Giữ chân khách hàng',
    color: 'lime' as const,
    icon: Repeat,
    title: 'Khách quay lại lần 2',
    goal: 'Biến khách vãng lai thành khách quen trong 14 ngày',
    mechanism:
      'Thẻ cào trúng thưởng; lượt chơi tiếp theo chỉ mở sau khi khách đã mang mã tới quầy đổi quà lần trước.',
    metric: 'Tỷ lệ % khách quay lại quán trong vòng 14 ngày',
  },
  {
    badge: 'Tối ưu công suất quán',
    color: 'purple' as const,
    icon: Calendar,
    title: 'Lấp khung giờ & ngày vắng',
    goal: 'Kéo khách ghé quán vào Thứ 3 – Thứ 5 hoặc khung giờ thấp điểm',
    mechanism:
      'Hộp quà bí mật chỉ mở vào ngày vắng với tỷ lệ trúng ưu đãi cao hơn, tự động khóa ngoài khung giờ.',
    metric: 'Lượt đổi quà ngày vắng so với trung bình 4 tuần trước',
  },
];

const PILLARS = [
  {
    icon: Gift,
    title: 'Builder 3 chế độ linh hoạt',
    description:
      'Sửa nhanh logo, ảnh món và màu thương hiệu trong 5 phút; hoặc mở Canvas kéo thả tự do từng màn hình Bìa, Biểu mẫu, Game, Trúng/Trượt.',
  },
  {
    icon: ShieldCheck,
    title: 'Máy chủ phát giải & Pacing tự động',
    description:
      'Tự động rải đều kho quà theo giờ mở cửa và kiểm soát trần ngân sách. Chạy mô phỏng 10.000 lượt khách ảo trước khi bấm Publish.',
  },
  {
    icon: TicketCheck,
    title: 'Đổi quà tại quầy trong 3 giây',
    description:
      'Khách đưa mã 6 ký tự (VD: K7M2QX), thu ngân nhập 1 chạm để xác nhận trao quà. Chống chụp màn hình dùng lại và có nhật ký kiểm toán.',
  },
  {
    icon: BarChart2,
    title: 'Báo cáo kết quả kinh doanh thật',
    description:
      'Không chỉ đếm lượt bấm: đo chính xác bao nhiêu khách tới quầy đổi quà, bao nhiêu khách quay lại lần 2 và giá vốn quà thực tế theo từng kênh QR.',
  },
];

const PLANS = [
  {
    name: 'Miễn phí (Free)',
    price: '0 ₫',
    period: 'mãi mãi',
    description: 'Dành cho quán mới làm quen và chạy thử chương trình đầu tiên.',
    features: [
      '1 chương trình đang chạy cùng lúc',
      'Tối đa 100 lượt đổi quà tại quầy / tháng',
      'Đầy đủ 3 Playbook & kho mẫu trò chơi',
      'Có nhãn Made with Playora nhỏ ở chân trang',
    ],
    cta: 'Bắt đầu miễn phí',
    highlighted: false,
  },
  {
    name: 'Gói Quán (Shop)',
    price: '299.000 ₫',
    period: '/ tháng',
    description: 'Dành cho quán cà phê, trà sữa và cửa hàng chạy khuyến mại thường xuyên.',
    features: [
      '3 chương trình đang chạy cùng lúc',
      '1.500 lượt đổi quà tại quầy / tháng',
      'Xoá hoàn toàn nhãn Playora (White-label)',
      'Phân quyền nhân viên thu ngân chỉ đổi quà',
    ],
    cta: 'Chọn gói Quán',
    highlighted: true,
  },
  {
    name: 'Gói Chuỗi (Pro)',
    price: '799.000 ₫',
    period: '/ tháng',
    description: 'Dành cho chuỗi nhiều chi nhánh hoặc chiến dịch lưu lượng lớn.',
    features: [
      'Không giới hạn chương trình đang chạy',
      '10.000 lượt đổi quà tại quầy / tháng',
      'Quản lý nhiều bộ nhận diện (Brand Kits)',
      'Xuất dữ liệu khách hàng & đối soát chi tiết',
    ],
    cta: 'Liên hệ tư vấn',
    highlighted: false,
  },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-background-full text-text-primary">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-border-button-default bg-background-primary-default/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <Logo className="text-xl" />
          <nav className="hidden items-center gap-6 text-body-2-medium text-text-secondary md:flex">
            <a href="#playbooks" className="transition-colors hover:text-text-primary">
              Kịch bản mẫu
            </a>
            <a href="#tinh-nang" className="transition-colors hover:text-text-primary">
              Tính năng
            </a>
            <a href="#bang-gia" className="transition-colors hover:text-text-primary">
              Bảng giá
            </a>
          </nav>
          <div className="flex items-center gap-2.5">
            <ButtonLink href="mailto:hello@playora.vn" variant="secondary" size="small">
              Đặt lịch demo
            </ButtonLink>
            <ButtonLink
              href="mailto:hello@playora.vn?subject=Dùng%20thử%20Playora"
              variant="primary"
              size="small"
              trailingIcon={ArrowRight}
            >
              Dùng thử miễn phí
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-24 px-4 py-12 sm:px-8 sm:py-20">
        {/* Hero Section */}
        <section className="grid items-center gap-10 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-2">
              <Chip variant="subtle" color="orange">
                Giải pháp Minigame cho Quán Cà Phê, Trà Sữa & Bán Lẻ
              </Chip>
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-balance text-text-primary sm:text-5xl lg:leading-[1.12]">
              Kéo khách tới quầy. Giữ khách quay lại lần hai.
            </h1>
            <p className="max-w-2xl text-body-regular text-text-secondary sm:text-lg">
              Dựng vòng quay may mắn, thẻ cào, hộp quà mang đậm thương hiệu quán chỉ trong 5 phút.
              Hệ thống tự động rải đều kho quà theo giờ mở cửa, thu ngân đổi mã tại quầy trong 3
              giây và báo cáo chính xác số khách quay lại.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <ButtonLink
                href="mailto:hello@playora.vn?subject=Khởi%20tạo%20tài%20khoản%20Playora"
                variant="primary"
                size="medium"
                trailingIcon={ArrowRight}
                className="h-11 rounded-2lg px-5"
              >
                Tạo chương trình miễn phí
              </ButtonLink>
              <ButtonLink
                href="mailto:hello@playora.vn"
                variant="secondary"
                size="medium"
                className="h-11 rounded-2lg px-5"
              >
                Đặt lịch demo
              </ButtonLink>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-border-button-default pt-6">
              <div>
                <p className="text-title-3-semibold tabular-nums text-text-primary">5 phút</p>
                <p className="text-caption-1-regular text-text-secondary">
                  Lên sóng từ Playbook dựng sẵn
                </p>
              </div>
              <div>
                <p className="text-title-3-semibold tabular-nums text-text-primary">100%</p>
                <p className="text-caption-1-regular text-text-secondary">
                  Kiểm soát trần ngân sách & tồn kho
                </p>
              </div>
              <div>
                <p className="text-title-3-semibold tabular-nums text-text-primary">3 giây</p>
                <p className="text-caption-1-regular text-text-secondary">
                  Đổi mã 6 ký tự tại quầy thu ngân
                </p>
              </div>
            </div>
          </div>

          {/* Outcome Preview Card */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card">
              <div className="flex items-center justify-between border-b border-border-button-default pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
                    <Store className="size-5" />
                  </div>
                  <div>
                    <p className="text-body-2-semibold text-text-primary">
                      Vòng quay Mùa Lễ Hội · Cà phê Mộc
                    </p>
                    <p className="text-caption-1-regular text-text-secondary">
                      Báo cáo hiệu quả thực tế tại quầy
                    </p>
                  </div>
                </div>
                <Chip variant="subtle" color="lime">
                  Đang chạy
                </Chip>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border-button-default bg-background-secondary-default/60 p-3.5">
                  <p className="text-caption-1-medium text-text-secondary">
                    Khách tới quầy đổi quà
                  </p>
                  <p className="mt-1 text-title-2-semibold tabular-nums text-text-primary">342</p>
                  <p className="mt-0.5 text-caption-1-regular text-text-tertiary">
                    68,4% tổng số mã đã phát
                  </p>
                </div>
                <div className="rounded-2xl border border-border-button-default bg-background-secondary-default/60 p-3.5">
                  <p className="text-caption-1-medium text-text-secondary">Khách quay lại lần 2</p>
                  <p className="mt-1 text-title-2-semibold tabular-nums text-text-primary">28,4%</p>
                  <p className="mt-0.5 text-caption-1-regular text-text-tertiary">
                    Quay lại trong vòng 14 ngày
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 rounded-2xl border border-border-button-default bg-background-secondary-default/40 p-4">
                <div className="flex items-center justify-between text-caption-1-medium">
                  <span className="text-text-secondary">Ngân sách quà đã đổi thực tế</span>
                  <span className="tabular-nums text-text-primary">2.450.000 ₫ / 3.500.000 ₫</span>
                </div>
                <ProgressBar value={70} size="sm" aria-label="Tiến độ ngân sách" />
                <div className="flex items-center justify-between pt-1 text-caption-1-regular text-text-tertiary">
                  <span className="inline-flex items-center gap-1">
                    <QrCode className="size-3.5" /> Kênh hiệu quả nhất: Standee bàn (74% đổi quà)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Playbooks Section */}
        <section id="playbooks" className="scroll-mt-20 space-y-8">
          <div className="max-w-2xl space-y-2">
            <Chip variant="subtle" color="blue">
              Outcome Playbooks
            </Chip>
            <h2 className="text-title-1-semibold tracking-tight text-text-primary">
              Chọn mục tiêu của quán, Playora thiết lập sẵn công thức
            </h2>
            <p className="text-body-regular text-text-secondary">
              Không cần đau đầu tính xác suất. Chỉ cần nhập ngân sách quà và lượng khách ước tính,
              hệ thống tự gợi ý cơ cấu giải thưởng và luật chơi tối ưu.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {PLAYBOOKS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex flex-col justify-between rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
                        <Icon className="size-5" />
                      </div>
                      <Chip variant="subtle" color={item.color}>
                        {item.badge}
                      </Chip>
                    </div>
                    <h3 className="text-headline-semibold text-text-primary">{item.title}</h3>
                    <div className="space-y-2.5 rounded-2xl border border-border-button-default bg-background-secondary-default/50 p-4 text-body-2-regular">
                      <div>
                        <span className="text-caption-1-semibold uppercase tracking-wider text-text-tertiary">
                          Mục tiêu
                        </span>
                        <p className="mt-0.5 text-body-2-medium text-text-primary">{item.goal}</p>
                      </div>
                      <div>
                        <span className="text-caption-1-semibold uppercase tracking-wider text-text-tertiary">
                          Cơ chế tự động
                        </span>
                        <p className="mt-0.5 text-caption-1-regular text-text-secondary">
                          {item.mechanism}
                        </p>
                      </div>
                      <div>
                        <span className="text-caption-1-semibold uppercase tracking-wider text-text-tertiary">
                          Chỉ số đo lường
                        </span>
                        <p className="mt-0.5 text-caption-1-medium text-text-primary">
                          {item.metric}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Core Pillars Section */}
        <section id="tinh-nang" className="scroll-mt-20 space-y-8">
          <div className="max-w-2xl space-y-2">
            <Chip variant="subtle" color="neutral">
              Vận hành khép kín
            </Chip>
            <h2 className="text-title-1-semibold tracking-tight text-text-primary">
              Từ mã QR tại bàn tới quầy thu ngân chỉ trong một luồng duy nhất
            </h2>
            <p className="text-body-regular text-text-secondary">
              Mọi quyết định trúng thưởng đều do máy chủ xử lý minh bạch, chống gian lận và bảo vệ
              ngân sách của chủ quán.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="flex gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-body-semibold text-text-primary">{pillar.title}</h3>
                    <p className="text-body-2-regular text-text-secondary">{pillar.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="bang-gia" className="scroll-mt-20 space-y-8">
          <div className="max-w-2xl space-y-2">
            <Chip variant="subtle" color="lime">
              Bảng giá minh bạch
            </Chip>
            <h2 className="text-title-1-semibold tracking-tight text-text-primary">
              Trả phí theo kết quả đổi quà thực tế tại quầy
            </h2>
            <p className="text-body-regular text-text-secondary">
              Bắt đầu miễn phí để kiểm chứng lượng khách tới quầy. Nâng cấp bất cứ lúc nào khi quán
              cần mở rộng quy mô.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.highlighted
                    ? 'flex flex-col justify-between rounded-3xl border-2 border-accent-500 bg-background-primary-default p-6 shadow-card'
                    : 'flex flex-col justify-between rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card'
                }
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-body-semibold text-text-primary">{plan.name}</h3>
                    {plan.highlighted && (
                      <Chip variant="bold" color="orange">
                        Phổ biến nhất
                      </Chip>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-title-1-semibold tabular-nums text-text-primary">
                      {plan.price}
                    </span>
                    <span className="text-caption-1-regular text-text-secondary">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-body-2-regular text-text-secondary">{plan.description}</p>
                  <ul className="space-y-2.5 border-t border-border-button-default pt-4 text-body-2-regular text-text-secondary">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 size-4 shrink-0 text-accent-600 dark:text-accent-400" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-6">
                  <ButtonLink
                    href="mailto:hello@playora.vn"
                    variant={plan.highlighted ? 'primary' : 'secondary'}
                    size="medium"
                    className="w-full"
                  >
                    {plan.cta}
                  </ButtonLink>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-button-default bg-background-primary-default py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-8">
          <Logo className="text-lg" />
          <p className="text-caption-1-regular text-text-secondary">
            © {new Date().getFullYear()} Playora. Nền tảng minigame trúng thưởng kéo khách tới quầy
            cho F&B và bán lẻ.
          </p>
        </div>
      </footer>
    </div>
  );
}
