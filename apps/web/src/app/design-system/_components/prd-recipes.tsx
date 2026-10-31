'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { IconButton } from '@playora/ui/components/base/buttons/icon-button';
import { Input } from '@playora/ui/components/base/input/input';
import { Slider } from '@playora/ui/components/base/slider/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@playora/ui/components/base/table/table';
import { Tab, TabList, TabPanel, Tabs } from '@playora/ui/components/base/tabs/tabs';
import { QRCodeSvg } from '@playora/ui/components/foundations/qr-code/qr-code';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Camera,
  CheckCircle2,
  Coins,
  Flame,
  Gift,
  Phone,
  QrCode,
  Repeat,
  Search,
  Smartphone,
  Sparkles,
  Store,
  TicketCheck,
  TrendingUp,
  Users,
  XCircle,
} from '@playora/ui/icons';
import { useState } from 'react';

const PLAYBOOKS = [
  {
    key: 'tet_traffic',
    title: 'Tết: Kéo khách về quán',
    mechanism: 'Vòng quay may mắn · Skin Tết Đỏ Vàng',
    rule: '1 lượt/ngày · Rải quà đều theo giờ mở cửa',
    metric: 'Lượt đổi quà tại quầy / ngày',
    icon: Flame,
    winRate: 25,
    avgCost: 5000,
  },
  {
    key: 'second_visit',
    title: 'Khách quay lại lần 2',
    mechanism: 'Cào thẻ bí ẩn · Skin Ban ngày (Day)',
    rule: 'Phải đổi quà lần trước tại quầy mới mở lượt chơi tiếp (30 ngày)',
    metric: '% khách quay lại trong 14 ngày',
    icon: Repeat,
    winRate: 30,
    avgCost: 6000,
  },
  {
    key: 'slow_days',
    title: 'Lấp ngày vắng (Thứ 3 – Thứ 5)',
    mechanism: 'Mở hộp quà · Chỉ mở ngày vắng',
    rule: 'Chỉ mở Thứ 3–Thứ 5 · Quà giá trị cao hơn ngày thường',
    metric: 'Lượt đổi quà ngày vắng vs ngày thường',
    icon: CalendarClock,
    winRate: 35,
    avgCost: 7500,
  },
] as const;

const PRIZE_ROWS = [
  {
    name: 'Mua 1 Tặng 1 Trà Sữa Ô Long',
    cost: '12.000 ₫',
    total: 50,
    issued: 44,
    redeemed: 38,
    remaining: 6,
    spent: '456.000 ₫',
    lowStock: true,
  },
  {
    name: 'Miễn phí Up Size L',
    cost: '4.000 ₫',
    total: 200,
    issued: 165,
    redeemed: 142,
    remaining: 35,
    spent: '568.000 ₫',
    lowStock: false,
  },
  {
    name: 'Topping Kem Phô Mai / Trân Châu Hoàng Kim',
    cost: '5.000 ₫',
    total: 150,
    issued: 112,
    redeemed: 96,
    remaining: 38,
    spent: '480.000 ₫',
    lowStock: false,
  },
] as const;

type RedeemDemoState = 'valid' | 'already_redeemed' | 'rehearsal';

export function PrdRecipes() {
  const [selectedPlaybook, setSelectedPlaybook] =
    useState<(typeof PLAYBOOKS)[number]['key']>('tet_traffic');
  const [budgetTrieu, setBudgetTrieu] = useState(2);
  const [redeemState, setRedeemState] = useState<RedeemDemoState>('valid');
  const [voucherInput, setVoucherInput] = useState('PL94K7');

  const activePlaybook = PLAYBOOKS.find((p) => p.key === selectedPlaybook) ?? PLAYBOOKS[0];
  const budgetVnd = budgetTrieu * 1_000_000;
  const estimatedGifts = Math.floor(budgetVnd / activePlaybook.avgCost);

  return (
    <div className="grid gap-12">
      {/* RECIPE 1: Playbook & Budget Suggestion (PLB-01, PLB-02) */}
      <div className="grid gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <Chip variant="caption" color="neutral" className="mb-1.5 font-mono text-[11px]">
              Recipe 01 · PLB-01 &amp; PLB-02
            </Chip>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Luồng tạo từ Mục tiêu &ldquo;Bạn muốn gì?&rdquo; &amp; Đề xuất Ngân sách
            </h3>
            <p className="text-xs text-muted-foreground">
              Tham khảo pattern AI Copilot / Onboarding của Vercel v0 &amp; Dub: bắt đầu từ kết quả
              kinh doanh, tự tính số lượng quà sao cho Σ q_i·c_i ≤ B và rủi ro hết quà sớm ≤ 10%.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {PLAYBOOKS.map((pb) => {
            const Icon = pb.icon;
            const active = pb.key === selectedPlaybook;
            return (
              <button
                key={pb.key}
                type="button"
                onClick={() => setSelectedPlaybook(pb.key)}
                className={`group flex flex-col justify-between rounded-2xl border p-5 text-left transition-all ${
                  active
                    ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                    : 'border-border/80 bg-card shadow-xs hover:border-primary/40 hover:shadow-md'
                }`}
              >
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <Icon className="size-5" />
                    </div>
                    {active && (
                      <Chip variant="caption" color="blue">
                        Đang chọn
                      </Chip>
                    )}
                  </div>
                  <div>
                    <div className="text-base font-bold text-foreground">{pb.title}</div>
                    <div className="mt-1 text-xs font-medium text-primary">{pb.mechanism}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">{pb.rule}</p>
                </div>
                <div className="mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                  Chỉ số đo chính: <strong className="text-foreground">{pb.metric}</strong>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl border border-primary/25 bg-background-primary-default p-5 shadow-card">
          <div className="grid items-center gap-6 lg:grid-cols-12">
            <div className="grid gap-3 lg:col-span-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Ngân sách quà tối đa (B):
                </span>
                <span className="font-mono text-base font-bold text-primary tabular-nums">
                  {budgetVnd.toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <Slider
                value={budgetTrieu}
                onChange={setBudgetTrieu}
                minValue={1}
                maxValue={10}
                step={0.5}
                aria-label="Ngân sách quà tối đa"
              />
              <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                <span>1.000.000 ₫</span>
                <span>5.000.000 ₫</span>
                <span>10.000.000 ₫</span>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/6 p-4 lg:col-span-7 sm:flex-row sm:items-center">
              <div className="grid gap-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="size-4" />
                  Đề xuất tự động từ Playbook ({activePlaybook.title})
                </div>
                <p className="text-sm font-medium text-foreground">
                  Với <strong>{budgetVnd.toLocaleString('vi-VN')} ₫</strong>, bạn phát được khoảng{' '}
                  <strong className="text-primary tabular-nums">{estimatedGifts} phần quà</strong>,
                  đủ cho <strong>{activePlaybook.winRate}%</strong> khách trúng trong 20 ngày.
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Rủi ro hết quà trước 90% thời gian: <strong>6.4% (An toàn ≤ 10%)</strong> · Không
                  bao giờ vượt ngân sách.
                </span>
              </div>
              <Button className="shrink-0">Tạo vào Builder</Button>
            </div>
          </div>
        </div>
      </div>

      {/* RECIPE 2: Studio Campaign Operation & Outcome Report (PLB-03, PRZ-09, TableCard) */}
      <div className="grid gap-4">
        <div>
          <Chip variant="caption" color="neutral" className="mb-1.5 font-mono text-[11px]">
            Recipe 02 · PLB-03, PLB-08 &amp; PRZ-09
          </Chip>
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            Màn Vận hành Chương trình: Kết quả Kinh doanh đứng trước Lượt chơi
          </h3>
          <p className="text-xs text-muted-foreground">
            Bố cục chuẩn Studio (`PageHeader` → `MetricGrid` 4 thẻ kết quả → `TableCard` tồn kho
            quà). Chỉ tính chi phí khi khách thực sự tới quầy đổi quà (`redeemed`).
          </p>
        </div>

        <div className="grid gap-5 rounded-3xl border border-border/90 bg-background p-5 shadow-sm sm:p-6">
          {/* PageHeader Recipe */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <IconButton icon={ArrowLeft} size="small" aria-label="Quay lại danh sách" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="type-page-title text-foreground">
                    Lộc Xuân Trà Sữa Hà · Tết Ất Tỵ
                  </h4>
                  <Chip variant="caption" color="lime" className="gap-1.5">
                    <span className="inline-block size-2 animate-live-pulse rounded-full bg-current" />
                    Đang chạy
                  </Chip>
                  <Chip variant="caption" color="neutral">
                    Tết kéo khách
                  </Chip>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  20/01/2027 – 10/02/2027 · Mở 09:00–22:00 · 3 cơ sở (Nguyễn Huệ, Cầu Giấy, Thảo
                  Điền)
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="small" leadingIcon={QrCode}>
                Chia sẻ &amp; In QR
              </Button>
              <Button variant="secondary" size="small">
                Xem báo cáo A4
              </Button>
              <Button size="small" leadingIcon={TicketCheck}>
                Mở Quầy đổi quà
              </Button>
            </div>
          </div>

          {/* MetricGrid Recipe (4 core outcome numbers from PRD §5.2 PLB-03) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: '1. Khách tới quầy (Đã đổi quà)',
                value: '276 khách',
                subtext: '+22% so với ngày thường (ước tính PLB-08)',
                icon: Store,
                tone: 'bg-primary/12 text-primary',
                highlighted: true,
              },
              {
                label: '2. Khách quay lại lần 2',
                value: '64 khách (23.2%)',
                subtext: 'Đổi quà ở ≥ 2 ngày khác nhau (Mục tiêu ≥ 20%)',
                icon: Users,
                tone: 'bg-success/12 text-success',
                highlighted: false,
              },
              {
                label: '3. Chi phí quà đã đổi / Ngân sách',
                value: '1.504.000 ₫',
                subtext: '75.2% ngân sách 2.000.000 ₫ · Còn 496.000 ₫',
                icon: Coins,
                tone: 'bg-warning/15 text-amber-600 dark:text-amber-400',
                highlighted: false,
              },
              {
                label: '4. Chi phí quà mỗi khách tới quầy',
                value: '5.450 ₫ / khách',
                subtext: 'Tổng 1.140 lượt quay · Tỷ lệ đổi đạt 86%',
                icon: TrendingUp,
                tone: 'bg-info/12 text-info',
                highlighted: false,
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className={`rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-card transition-shadow hover:shadow-md ${
                    m.highlighted ? 'border-primary ring-1 ring-primary/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-muted-foreground">
                        {m.label}
                      </span>
                      <p className="type-metric mt-1.5 text-foreground">{m.value}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{m.subtext}</p>
                    </div>
                    <div
                      className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${m.tone}`}
                    >
                      <Icon className="size-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TableCard Recipe */}
          <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-0 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Tồn kho giải thưởng &amp; Đối soát tại quầy (PRZ-09)
                </div>
                <div className="text-xs text-muted-foreground">
                  Khoá hàng tồn kho nguyên tử (atomic row lock), không bao giờ phát vượt tổng số
                  lượng.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  size="small"
                  leadingIcon={Search}
                  placeholder="Tìm tên quà hoặc mã…"
                  aria-label="Tìm tên quà hoặc mã"
                  className="w-52"
                />
                <Button variant="secondary" size="small">
                  + Thêm tồn kho (PRZ-01)
                </Button>
              </div>
            </div>
            <Table aria-label="Tồn kho giải thưởng">
              <TableHeader className="bg-muted/40">
                <TableColumn isRowHeader className="px-4">
                  Tên phần quà
                </TableColumn>
                <TableColumn className="text-right">Giá vốn</TableColumn>
                <TableColumn className="text-right">Tổng kho</TableColumn>
                <TableColumn className="text-right">Đã phát</TableColumn>
                <TableColumn className="text-right">Đã đổi tại quầy</TableColumn>
                <TableColumn className="text-right">Còn lại</TableColumn>
                <TableColumn className="px-4 text-right">Chi phí thực tế</TableColumn>
              </TableHeader>
              <TableBody>
                {PRIZE_ROWS.map((row) => (
                  <TableRow key={row.name} id={row.name}>
                    <TableCell className="px-4 font-medium">
                      <div className="flex items-center gap-2">
                        <Gift className="size-4 text-primary" />
                        <span>{row.name}</span>
                        {row.lowStock && (
                          <Chip variant="caption" color="yellow">
                            Còn 12% (&lt; 20%)
                          </Chip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {row.cost}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {row.total}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {row.issued}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-success tabular-nums">
                      {row.redeemed}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {row.remaining}
                    </TableCell>
                    <TableCell className="px-4 text-right font-mono text-xs font-semibold tabular-nums">
                      {row.spent}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* RECIPE 3: Counter Redemption Mobile UI (PRZ-10, PRZ-15, PRZ-18, ORG-10) */}
      <div className="grid gap-4">
        <div>
          <Chip variant="caption" color="neutral" className="mb-1.5 font-mono text-[11px]">
            Recipe 03 · PRZ-10, PRZ-15, PRZ-18, PRZ-19 &amp; ORG-10
          </Chip>
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            Quầy đổi quà trên điện thoại (Mobile Counter Redemption · Thao tác 1 tay trong 3 giây)
          </h3>
          <p className="text-xs text-muted-foreground">
            Thiết kế riêng cho nhân viên quầy (&ldquo;Tuấn&rdquo;) giờ cao điểm: ghép máy bằng QR
            không cần tài khoản email, chữ trạng thái cực lớn, tìm theo SĐT khi khách quên mã, và
            nút xác nhận cao 56px ở nửa dưới màn hình.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-12">
          {/* Left controls & QR Pairing explanation */}
          <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-card lg:col-span-5">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">
                  Chuyển trạng thái kiểm thử Quầy đổi quà
                </span>
                <Chip variant="caption" color="cyan">
                  PWA Ready
                </Chip>
              </div>

              <div className="grid gap-2">
                {(
                  [
                    {
                      id: 'valid',
                      label: '1. Mã hợp lệ — ĐỔI ĐƯỢC (Màu xanh Success + Rung nhẹ)',
                    },
                    {
                      id: 'already_redeemed',
                      label: '2. Mã đã sử dụng — ĐÃ ĐỔI LÚC 14:02 (Chặn đổi trùng)',
                    },
                    {
                      id: 'rehearsal',
                      label: '3. Mã chơi thử — CHẾ ĐỘ TẬP HUẤN (PRZ-19 · Không ghi số liệu)',
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRedeemState(item.id)}
                    className={`rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition-all ${
                      redeemState === item.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/80 bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-border/80 bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border bg-white p-2">
                    <QRCodeSvg value="https://studio.playora.vn/pair/DEV-9921" size={72} />
                  </div>
                  <div className="grid gap-1 text-xs">
                    <div className="font-semibold text-foreground">
                      Ghép máy quầy bằng QR (ORG-10)
                    </div>
                    <p className="text-muted-foreground">
                      Chủ quán mở <strong>Cài đặt → Máy quầy</strong> hiện mã QR 10 phút. Nhân viên
                      quét là vào thẳng màn Đổi quà, thu hồi quyền 1 chạm khi đổi ca.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Phone Frame: Mobile Counter Redemption */}
          <div className="mx-auto w-full max-w-md rounded-3xl border-4 border-foreground/15 bg-card p-5 shadow-lg lg:col-span-7">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Quầy đổi quà · Trà Sữa Hà</span>
              </div>
              <Chip variant="caption" color="neutral" className="text-[11px]">
                Máy Tuấn · Cơ sở Nguyễn Huệ
              </Chip>
            </div>

            <Tabs defaultSelectedKey="code" className="mt-4">
              <TabList aria-label="Chế độ tra cứu">
                <Tab id="code" icon={Camera}>
                  Quét QR / Nhập mã
                </Tab>
                <Tab id="phone" icon={Phone}>
                  Tìm theo SĐT (PRZ-15)
                </Tab>
              </TabList>

              <TabPanel id="code" className="mt-3 grid gap-3">
                <div className="flex gap-2">
                  <Input
                    value={voucherInput}
                    onChange={(val) => setVoucherInput(val.toUpperCase())}
                    maxLength={6}
                    aria-label="Mã đổi quà 6 ký tự"
                    inputClassName="type-code-voucher text-center uppercase"
                    className="flex-1"
                  />
                  <Button variant="secondary" className="px-4">
                    Tra cứu
                  </Button>
                </div>
              </TabPanel>

              <TabPanel id="phone" className="mt-3 grid gap-2">
                <div className="flex gap-2">
                  <Input
                    defaultValue="0903819482"
                    placeholder="Nhập SĐT khách hàng…"
                    aria-label="Số điện thoại khách hàng"
                    inputClassName="font-mono"
                    className="flex-1"
                  />
                  <Button variant="secondary">Tìm mã</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Liệt kê các mã chưa đổi của SĐT trong tổ chức; nhân viên đối chiếu tên khách rồi
                  trao quà.
                </p>
              </TabPanel>
            </Tabs>

            {/* Giant High-Contrast Verification Banner (PRZ-18) */}
            <div className="mt-4">
              {redeemState === 'valid' && (
                <div className="rounded-2xl border-2 border-success bg-success/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl font-extrabold tracking-tight text-success">
                      ĐỔI ĐƯỢC
                    </span>
                    <Chip variant="caption" color="lime">
                      Chưa sử dụng
                    </Chip>
                  </div>
                  <div className="mt-3 rounded-xl bg-card p-3 shadow-xs">
                    <div className="text-base font-bold text-foreground">
                      1× Miễn phí Up Size L (Giá vốn 4.000đ)
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Khách: <strong>Nguyễn Minh Anh</strong> (090***482) · Hạn: 05/02/2027
                    </div>
                  </div>
                  <Button
                    leadingIcon={CheckCircle2}
                    className="mt-4 h-14 w-full text-base font-bold shadow-sm"
                  >
                    Xác nhận đã trao quà (PL94K7)
                  </Button>
                </div>
              )}

              {redeemState === 'already_redeemed' && (
                <div className="rounded-2xl border-2 border-destructive bg-destructive/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg font-extrabold tracking-tight text-destructive">
                      ĐÃ ĐỔI LÚC 14:02 HÔM NAY
                    </span>
                    <Chip variant="caption" color="rose">
                      Không thể đổi lại
                    </Chip>
                  </div>
                  <p className="mt-2 text-xs text-foreground">
                    Mã <strong>PL94K7</strong> đã được trao bởi <strong>Máy Tuấn</strong> tại{' '}
                    <strong>Cơ sở Nguyễn Huệ</strong>. Nếu bấm nhầm, chỉ Chủ quán (Owner) mới mở lại
                    được.
                  </p>
                  <Button variant="secondary" className="mt-4 h-12 w-full">
                    Quét mã tiếp theo
                  </Button>
                </div>
              )}

              {redeemState === 'rehearsal' && (
                <div className="rounded-2xl border-2 border-warning bg-warning/15 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg font-extrabold tracking-tight text-amber-800 dark:text-amber-300">
                      MÃ CHƠI THỬ · TẬP HUẤN
                    </span>
                    <Chip variant="caption" color="yellow">
                      PRZ-19
                    </Chip>
                  </div>
                  <p className="mt-2 text-xs text-foreground">
                    Đây là mã từ lượt chơi thử trong Studio. Bạn có thể bấm xác nhận để làm quen
                    thao tác — <strong>không trừ kho thật và không tính vào báo cáo</strong>.
                  </p>
                  <Button variant="secondary" className="mt-4 h-14 w-full text-base font-bold">
                    Xác nhận tập huấn (Không ghi sổ)
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DO & DON'T PAIRS */}
      <div className="grid gap-4">
        <div>
          <Chip variant="caption" color="neutral" className="mb-1.5 font-mono text-[11px]">
            Quy tắc bắt buộc · Do &amp; Don&apos;t
          </Chip>
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            4 Nguyên tắc Thiết kế Cốt lõi của Playora
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Pair 1: One primary CTA */}
          <div className="rounded-3xl border border-success/30 bg-background-primary-default p-5 shadow-card">
            <div className="flex items-center gap-2 text-xs font-bold text-success">
              <CheckCircle2 className="size-4" />
              NÊN LÀM (DO) — Chỉ một nút Primary (Teal) cho hành động đích mỗi màn hình
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 p-4">
              <Button variant="ghost" size="small">
                Huỷ
              </Button>
              <Button variant="secondary" size="small">
                Chơi thử bản nháp
              </Button>
              <Button size="small">Phát hành chương trình</Button>
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground">
              Chủ quán nhìn vào biết ngay bước tiếp theo là &ldquo;Phát hành chương trình&rdquo;.
            </p>
          </div>

          <div className="rounded-3xl border border-destructive/30 bg-background-primary-default p-5 shadow-card">
            <div className="flex items-center gap-2 text-xs font-bold text-destructive">
              <XCircle className="size-4" />
              KHÔNG LÀM (DON&apos;T) — Đặt nhiều nút Primary cạnh nhau gây nhiễu thị giác
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 p-4">
              <Button size="small">Lưu nháp</Button>
              <Button size="small">Chơi thử</Button>
              <Button size="small">Phát hành</Button>
            </div>
            <p className="mt-2.5 text-xs text-destructive">
              Vi phạm nguyên tắc &ldquo;Studio yên tĩnh&rdquo; — khi mọi nút đều nổi bật thì không
              nút nào nổi bật.
            </p>
          </div>

          {/* Pair 2: Status never relies on color alone */}
          <div className="rounded-3xl border border-success/30 bg-background-primary-default p-5 shadow-card">
            <div className="flex items-center gap-2 text-xs font-bold text-success">
              <CheckCircle2 className="size-4" />
              NÊN LÀM (DO) — Trạng thái luôn đi kèm Icon/Chấm và Nhãn hành động rõ nghĩa
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-xl bg-muted/40 p-4">
              <Chip variant="caption" color="lime" className="gap-1.5">
                <span className="inline-block size-2 animate-live-pulse rounded-full bg-current" />
                Đang chạy · 276 khách đã đổi
              </Chip>
              <Chip variant="caption" color="yellow" className="gap-1.5">
                <AlertTriangle className="size-3" />
                Quà còn 12% (&lt; 20%)
              </Chip>
            </div>
            <p className="mt-2.5 text-xs text-muted-foreground">
              Người mù màu hoặc nhìn ngoài nắng vẫn phân biệt được ngay trạng thái.
            </p>
          </div>

          <div className="rounded-3xl border border-destructive/30 bg-background-primary-default p-5 shadow-card">
            <div className="flex items-center gap-2 text-xs font-bold text-destructive">
              <XCircle className="size-4" />
              KHÔNG LÀM (DON&apos;T) — Chỉ dùng chấm màu trống hoặc nhãn kỹ thuật mơ hồ
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 p-4">
              <span className="inline-block size-3 rounded-full bg-red-500" />
              <span className="inline-block size-3 rounded-full bg-amber-500" />
              <Chip variant="caption" color="neutral">
                STATUS_ACTIVE_01
              </Chip>
            </div>
            <p className="mt-2.5 text-xs text-destructive">
              Vi phạm quy tắc Accessibility &amp; Copywriting: không bao giờ dùng màu làm tín hiệu
              duy nhất.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
