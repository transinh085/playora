import { buttonVariants, Card, Chip, ProgressBar } from '@playora/ui/components';
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
    color: 'warning' as const,
    icon: Sparkles,
    title: 'Đông khách dịp Tết & Khai trương',
    goal: 'Tăng lượng khách ghé quán trong 7–14 ngày cao điểm',
    mechanism:
      'Vòng quay may mắn theo mùa, mỗi khách 1 lượt/ngày, hệ thống tự động rải đều quà theo khung giờ mở cửa.',
    metric: 'Số lượt đổi quà tại quầy mỗi ngày & chi phí trên mỗi khách ghé quán',
  },
  {
    badge: 'Giữ chân khách hàng',
    color: 'success' as const,
    icon: Repeat,
    title: 'Khách quay lại lần 2',
    goal: 'Biến khách vãng lai thành khách quen trong 14 ngày',
    mechanism:
      'Thẻ cào trúng thưởng; lượt chơi tiếp theo chỉ mở sau khi khách đã mang mã tới quầy đổi quà lần trước.',
    metric: 'Tỷ lệ % khách quay lại quán trong vòng 14 ngày',
  },
  {
    badge: 'Tối ưu công suất quán',
    color: 'accent' as const,
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
    <div className="min-h-dvh bg-background text-foreground">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <Logo className="text-xl" />
          <nav className="hidden items-center gap-6 text-body-2-medium text-muted md:flex">
            <a href="#playbooks" className="transition-colors hover:text-foreground">
              Kịch bản mẫu
            </a>
            <a href="#tinh-nang" className="transition-colors hover:text-foreground">
              Tính năng
            </a>
            <a href="#bang-gia" className="transition-colors hover:text-foreground">
              Bảng giá
            </a>
          </nav>
          <div className="flex items-center gap-2.5">
            <a
              href="mailto:hello@playora.vn"
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              Đặt lịch demo
            </a>
            <a
              href="mailto:hello@playora.vn?subject=Dùng%20thử%20Playora"
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              Dùng thử miễn phí
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-24 px-4 py-12 sm:px-8 sm:py-20">
        {/* Hero Section */}
        <section className="grid items-center gap-10 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-2">
              <Chip variant="soft" color="warning">
                Giải pháp Minigame cho Quán Cà Phê, Trà Sữa & Bán Lẻ
              </Chip>
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl lg:leading-[1.12]">
              Kéo khách tới quầy. Giữ khách quay lại lần hai.
            </h1>
            <p className="max-w-2xl text-body-regular text-muted sm:text-lg">
              Dựng vòng quay may mắn, thẻ cào, hộp quà mang đậm thương hiệu quán chỉ trong 5 phút.
              Hệ thống tự động rải đều kho quà theo giờ mở cửa, thu ngân đổi mã tại quầy trong 3
              giây và báo cáo chính xác số khách quay lại.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="mailto:hello@playora.vn?subject=Khởi%20tạo%20tài%20khoản%20Playora"
                className={buttonVariants({
                  variant: 'primary',
                  size: 'md',
                  className: 'h-11 rounded-2lg px-5',
                })}
              >
                Tạo chương trình miễn phí
                <ArrowRight className="size-4" aria-hidden />
              </a>
              <a
                href="mailto:hello@playora.vn"
                className={buttonVariants({
                  variant: 'secondary',
                  size: 'md',
                  className: 'h-11 rounded-2lg px-5',
                })}
              >
                Đặt lịch demo
              </a>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-border pt-6">
              <div>
                <p className="text-title-3-semibold text-foreground tabular-nums">5 phút</p>
                <p className="text-caption-1-regular text-muted">Lên sóng từ Playbook dựng sẵn</p>
              </div>
              <div>
                <p className="text-title-3-semibold text-foreground tabular-nums">100%</p>
                <p className="text-caption-1-regular text-muted">
                  Kiểm soát trần ngân sách & tồn kho
                </p>
              </div>
              <div>
                <p className="text-title-3-semibold text-foreground tabular-nums">3 giây</p>
                <p className="text-caption-1-regular text-muted">
                  Đổi mã 6 ký tự tại quầy thu ngân
                </p>
              </div>
            </div>
          </div>

          {/* Outcome Preview Card */}
          <div className="lg:col-span-5">
            <Card className="overflow-hidden p-6">
              <Card.Header className="flex flex-row items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Store className="size-5" />
                  </div>
                  <div>
                    <Card.Title className="text-body-2-semibold text-foreground">
                      Vòng quay Mùa Lễ Hội · Cà phê Mộc
                    </Card.Title>
                    <Card.Description className="text-caption-1-regular text-muted">
                      Báo cáo hiệu quả thực tế tại quầy
                    </Card.Description>
                  </div>
                </div>
                <Chip variant="soft" color="success">
                  Đang chạy
                </Chip>
              </Card.Header>

              <Card.Content className="p-0">
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border bg-surface-secondary/60 p-3.5">
                    <p className="text-caption-1-medium text-muted">Khách tới quầy đổi quà</p>
                    <p className="mt-1 text-title-2-semibold text-foreground tabular-nums">342</p>
                    <p className="mt-0.5 text-caption-1-regular text-muted">
                      68,4% tổng số mã đã phát
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface-secondary/60 p-3.5">
                    <p className="text-caption-1-medium text-muted">Khách quay lại lần 2</p>
                    <p className="mt-1 text-title-2-semibold text-foreground tabular-nums">28,4%</p>
                    <p className="mt-0.5 text-caption-1-regular text-muted">
                      Quay lại trong vòng 14 ngày
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 rounded-2xl border border-border bg-surface-secondary/40 p-4">
                  <div className="flex items-center justify-between text-caption-1-medium">
                    <span className="text-muted">Ngân sách quà đã đổi thực tế</span>
                    <span className="text-foreground tabular-nums">2.450.000 ₫ / 3.500.000 ₫</span>
                  </div>
                  <ProgressBar value={70} size="sm" aria-label="Tiến độ ngân sách">
                    <ProgressBar.Track>
                      <ProgressBar.Fill />
                    </ProgressBar.Track>
                  </ProgressBar>
                  <div className="flex items-center justify-between pt-1 text-caption-1-regular text-muted">
                    <span className="inline-flex items-center gap-1">
                      <QrCode className="size-3.5" /> Kênh hiệu quả nhất: Standee bàn (74% đổi quà)
                    </span>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>
        </section>

        {/* Playbooks Section */}
        <section id="playbooks" className="scroll-mt-20 space-y-8">
          <div className="max-w-2xl space-y-2">
            <Chip variant="soft" color="accent">
              Outcome Playbooks
            </Chip>
            <h2 className="text-title-1-semibold tracking-tight text-foreground">
              Chọn mục tiêu của quán, Playora thiết lập sẵn công thức
            </h2>
            <p className="text-body-regular text-muted">
              Không cần đau đầu tính xác suất. Chỉ cần nhập ngân sách quà và lượng khách ước tính,
              hệ thống tự gợi ý cơ cấu giải thưởng và luật chơi tối ưu.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {PLAYBOOKS.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="flex flex-col justify-between p-6">
                  <div className="space-y-4">
                    <Card.Header className="p-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                          <Icon className="size-5" />
                        </div>
                        <Chip variant="soft" color={item.color}>
                          {item.badge}
                        </Chip>
                      </div>
                      <Card.Title className="mt-4 text-headline-semibold text-foreground">
                        {item.title}
                      </Card.Title>
                    </Card.Header>
                    <Card.Content className="p-0">
                      <div className="space-y-2.5 rounded-2xl border border-border bg-surface-secondary/50 p-4 text-body-2-regular">
                        <div>
                          <span className="text-caption-1-semibold tracking-wider text-muted uppercase">
                            Mục tiêu
                          </span>
                          <p className="mt-0.5 text-body-2-medium text-foreground">{item.goal}</p>
                        </div>
                        <div>
                          <span className="text-caption-1-semibold tracking-wider text-muted uppercase">
                            Cơ chế tự động
                          </span>
                          <p className="mt-0.5 text-caption-1-regular text-muted">
                            {item.mechanism}
                          </p>
                        </div>
                        <div>
                          <span className="text-caption-1-semibold tracking-wider text-muted uppercase">
                            Chỉ số đo lường
                          </span>
                          <p className="mt-0.5 text-caption-1-medium text-foreground">
                            {item.metric}
                          </p>
                        </div>
                      </div>
                    </Card.Content>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Core Pillars Section */}
        <section id="tinh-nang" className="scroll-mt-20 space-y-8">
          <div className="max-w-2xl space-y-2">
            <Chip variant="soft" color="default">
              Vận hành khép kín
            </Chip>
            <h2 className="text-title-1-semibold tracking-tight text-foreground">
              Từ mã QR tại bàn tới quầy thu ngân chỉ trong một luồng duy nhất
            </h2>
            <p className="text-body-regular text-muted">
              Mọi quyết định trúng thưởng đều do máy chủ xử lý minh bạch, chống gian lận và bảo vệ
              ngân sách của chủ quán.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Card key={pillar.title} className="flex flex-row gap-4 p-6">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-1.5">
                    <Card.Header className="p-0">
                      <Card.Title className="text-body-semibold text-foreground">
                        {pillar.title}
                      </Card.Title>
                    </Card.Header>
                    <Card.Content className="p-0">
                      <Card.Description className="text-body-2-regular text-muted">
                        {pillar.description}
                      </Card.Description>
                    </Card.Content>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="bang-gia" className="scroll-mt-20 space-y-8">
          <div className="max-w-2xl space-y-2">
            <Chip variant="soft" color="success">
              Bảng giá minh bạch
            </Chip>
            <h2 className="text-title-1-semibold tracking-tight text-foreground">
              Trả phí theo kết quả đổi quà thực tế tại quầy
            </h2>
            <p className="text-body-regular text-muted">
              Bắt đầu miễn phí để kiểm chứng lượng khách tới quầy. Nâng cấp bất cứ lúc nào khi quán
              cần mở rộng quy mô.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted
                    ? 'flex flex-col justify-between border-2 border-accent p-6'
                    : 'flex flex-col justify-between p-6'
                }
              >
                <div className="space-y-4">
                  <Card.Header className="p-0">
                    <div className="flex items-center justify-between gap-2">
                      <Card.Title className="text-body-semibold text-foreground">
                        {plan.name}
                      </Card.Title>
                      {plan.highlighted && (
                        <Chip variant="primary" color="warning">
                          Phổ biến nhất
                        </Chip>
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-title-1-semibold text-foreground tabular-nums">
                        {plan.price}
                      </span>
                      <span className="text-caption-1-regular text-muted">{plan.period}</span>
                    </div>
                    <Card.Description className="mt-1 text-body-2-regular text-muted">
                      {plan.description}
                    </Card.Description>
                  </Card.Header>
                  <Card.Content className="p-0">
                    <ul className="space-y-2.5 border-t border-border pt-4 text-body-2-regular text-muted">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5">
                          <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </Card.Content>
                </div>
                <Card.Footer className="p-0 pt-6">
                  <a
                    href="mailto:hello@playora.vn"
                    className={buttonVariants({
                      variant: plan.highlighted ? 'primary' : 'secondary',
                      size: 'md',
                      fullWidth: true,
                    })}
                  >
                    {plan.cta}
                  </a>
                </Card.Footer>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-8">
          <Logo className="text-lg" />
          <p className="text-caption-1-regular text-muted">
            © {new Date().getFullYear()} Playora. Nền tảng minigame trúng thưởng kéo khách tới quầy
            cho F&B và bán lẻ.
          </p>
        </div>
      </footer>
    </div>
  );
}
