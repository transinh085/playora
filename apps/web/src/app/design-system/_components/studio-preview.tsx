'use client';

import { Alert, AlertDescription, AlertTitle } from '@playora/ui/components/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@playora/ui/components/alert-dialog';
import { Avatar, AvatarFallback } from '@playora/ui/components/avatar';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@playora/ui/components/card';
import { Checkbox } from '@playora/ui/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@playora/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@playora/ui/components/dropdown-menu';
import { Input } from '@playora/ui/components/input';
import { Label } from '@playora/ui/components/label';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@playora/ui/components/popover';
import { Progress } from '@playora/ui/components/progress';
import { RadioGroup, RadioGroupItem } from '@playora/ui/components/radio-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@playora/ui/components/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@playora/ui/components/sheet';
import { Skeleton } from '@playora/ui/components/skeleton';
import { Slider } from '@playora/ui/components/slider';
import { Toaster, toast } from '@playora/ui/components/sonner';
import { Switch } from '@playora/ui/components/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@playora/ui/components/tabs';
import { Textarea } from '@playora/ui/components/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@playora/ui/components/tooltip';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Eye,
  Info,
  Loader2,
  PauseCircle,
  Play,
  Plus,
  Rocket,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { previewState, StateMatrix } from './state-matrix';

const BUTTON_VARIANTS = [
  'default',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'link',
] as const;

const BUTTON_STATES = ['default', 'hover', 'focus', 'active', 'disabled', 'loading'] as const;

export function StudioPreview() {
  const [winRate, setWinRate] = useState([25]);
  const [requireConsent, setRequireConsent] = useState(true);
  const [antiFraud, setAntiFraud] = useState('standard');

  return (
    <TooltipProvider>
      <div className="grid gap-10">
        <Toaster />

        {/* 1. Button State Matrix & Sizes */}
        <div className="grid gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                1. Nút hành động (Button · Đồng bộ bo góc rounded-xl 12px với Input &amp; Select)
              </h3>
              <p className="text-xs text-muted-foreground">
                Mỗi màn hình chỉ có <strong>một nút Primary (default)</strong>. Các trạng thái
                hover, focus, active được ghim sẵn bằng{' '}
                <code className="font-mono">data-preview</code>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="xs">Cỡ xs (24px)</Button>
              <Button size="sm">Cỡ sm (32px)</Button>
              <Button size="default">
                <Plus className="size-4" />
                Mặc định (36px)
              </Button>
              <Button size="lg">
                <Rocket className="size-4" />
                Cỡ lg (40px)
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Chơi thử">
                    <Play className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Chơi thử bản nháp (không trừ kho thật)</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <StateMatrix
            rows={BUTTON_VARIANTS}
            states={BUTTON_STATES}
            render={(variant, state) =>
              state === 'loading' ? (
                <Button variant={variant} disabled>
                  <Loader2 className="size-4 animate-spin" />
                  Đang lưu…
                </Button>
              ) : (
                <Button variant={variant} {...previewState(state)}>
                  Phát hành
                </Button>
              )
            }
          />
        </div>

        {/* 2. Semantic Status Badges */}
        <div className="grid gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              2. Nhãn trạng thái & Vòng đời chương trình (Badge · Không bao giờ chỉ dùng màu)
            </h3>
            <p className="text-xs text-muted-foreground">
              Trạng thái chương trình do hệ thống tự suy ra (PRD §3.2) và luôn đi kèm icon hoặc chấm
              chuyển động.
            </p>
          </div>
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="outline" className="gap-1.5">
                <Clock className="size-3 text-muted-foreground" />
                Nháp (Chưa phát hành)
              </Badge>
              <Badge variant="info" className="gap-1.5">
                <Clock className="size-3" />
                Đã lên lịch · Mở 25/01
              </Badge>
              <Badge variant="live" className="gap-1.5">
                <span
                  aria-hidden
                  className="inline-block size-2 animate-live-pulse rounded-full bg-current"
                />
                Đang chạy (On air)
              </Badge>
              <Badge variant="warning" className="gap-1.5">
                <PauseCircle className="size-3" />
                Tạm dừng
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                Đã kết thúc
              </Badge>
              <Badge variant="success" className="gap-1.5">
                <CheckCircle2 className="size-3" />
                Đã trao quà tại quầy
              </Badge>
              <Badge variant="warning" className="gap-1.5">
                <AlertTriangle className="size-3" />
                Quà còn 14% (&lt; 20%)
              </Badge>
              <Badge variant="destructive" className="gap-1.5">
                Đã đổi lúc 14:02 · Quán Q.1
              </Badge>
              <Badge variant="default" className="gap-1.5">
                <Sparkles className="size-3" />
                Playbook: Tết kéo khách
              </Badge>
            </div>
          </Card>
        </div>

        {/* 3. Inputs & Validation Matrix */}
        <div className="grid gap-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              3. Trường nhập liệu & Biểu mẫu (Inputs, Controls & Validation Matrix)
            </h3>
            <p className="text-xs text-muted-foreground">
              Đồng bộ hoàn toàn với <code className="font-mono">Button</code>: cùng bo góc{' '}
              <code className="font-mono">rounded-xl</code> (12px), cùng chiều cao chuẩn 36px (
              <code className="font-mono">h-9</code>) và viền focus{' '}
              <code className="font-mono">ring-ring/50</code> 3px.
            </p>
          </div>

          <StateMatrix
            rows={['input'] as const}
            states={['default', 'hover', 'focus', 'disabled', 'invalid']}
            render={(_, state) => (
              <Input
                defaultValue={state === 'invalid' ? 'tet-tra-sua-ha' : 'Vòng quay Tết Trà Sữa Hà'}
                aria-invalid={state === 'invalid' || undefined}
                className="max-w-52"
                {...previewState(state)}
              />
            )}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Thiết lập Luật & Giải (BLD-21 · PRZ-08 · EVT-13)
                </CardTitle>
                <CardDescription>
                  Cấu hình ngân sách, tỷ lệ trúng và mức chống gian lận cho chương trình.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="ds-campaign-name">Tên chương trình</Label>
                  <Input id="ds-campaign-name" defaultValue="Lộc Xuân Trà Sữa Hà 2027" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="ds-playbook-select">Mục tiêu (Playbook)</Label>
                    <Select defaultValue="tet_traffic">
                      <SelectTrigger id="ds-playbook-select" className="w-full">
                        <SelectValue placeholder="Chọn mục tiêu" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Playbook F&B (M1)</SelectLabel>
                          <SelectItem value="tet_traffic">Tết: Kéo khách về quán</SelectItem>
                          <SelectItem value="second_visit">Khách quay lại lần 2</SelectItem>
                          <SelectItem value="slow_days">Lấp ngày vắng (Thứ 3–Thứ 5)</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="ds-slug-invalid">Đường dẫn (Trạng thái lỗi trùng)</Label>
                    <Input id="ds-slug-invalid" defaultValue="loc-xuan-2027" aria-invalid />
                    <span className="text-xs text-destructive">
                      Đường dẫn này đã được chương trình khác sử dụng.
                    </span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <Label htmlFor="ds-win-rate">Tổng tỷ lệ trúng thưởng</Label>
                    <span className="font-mono text-xs font-semibold text-primary tabular-nums">
                      {winRate[0]}% (1 trong 4 khách trúng)
                    </span>
                  </div>
                  <Slider
                    id="ds-win-rate"
                    value={winRate}
                    onValueChange={setWinRate}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Mức chống gian lận (EVT-13)</Label>
                  <RadioGroup
                    value={antiFraud}
                    onValueChange={setAntiFraud}
                    className="grid gap-2 sm:grid-cols-2"
                  >
                    <Label
                      htmlFor="af-standard"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/80 p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <RadioGroupItem value="standard" id="af-standard" />
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          Chuẩn (Mặc định M1)
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          SĐT + Thiết bị + Turnstile ẩn
                        </div>
                      </div>
                    </Label>
                    <Label
                      htmlFor="af-strict"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/80 p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <RadioGroupItem value="strict" id="af-strict" />
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          Nghiêm ngặt (M2 OTP)
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Xác thực mã OTP qua SĐT/Zalo
                        </div>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="ds-rules-note">Thể lệ tóm tắt hiển thị ở màn Bìa (CMP-04)</Label>
                  <Textarea
                    id="ds-rules-note"
                    rows={2}
                    defaultValue="Mỗi khách có 1 lượt quay mỗi ngày từ 09:00–22:00. Đổi quà trực tiếp tại quầy trong 7 ngày."
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 p-3">
                  <div className="grid gap-0.5">
                    <Label htmlFor="ds-consent-switch" className="text-xs font-semibold">
                      Tách ô đồng ý nhận ưu đãi lần sau (CMP-02 / G6)
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Không gộp chung với điều khoản tham gia chương trình
                    </span>
                  </div>
                  <Switch
                    id="ds-consent-switch"
                    checked={requireConsent}
                    onCheckedChange={setRequireConsent}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox id="ds-rehearsal-check" defaultChecked />
                  <Label htmlFor="ds-rehearsal-check" className="text-xs font-normal">
                    Cho phép nhân viên quầy tập huấn bằng mã chơi thử trước giờ mở bán (PRZ-19)
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* 4. Navigation, Alerts, Progress, Overlays & Feedback */}
            <div className="grid content-start gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Điều hướng 3 chế độ Builder & Hạn mức gói (Tabs · Progress · Avatar)
                  </CardTitle>
                  <CardDescription>
                    Tabs đồng tâm (khung ngoài <code className="font-mono">rounded-xl</code> 12px,
                    nút trong <code className="font-mono">rounded-lg</code> 8px); Progress cảnh báo
                    hạn mức 80%.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <Tabs defaultValue="quick">
                    <TabsList>
                      <TabsTrigger value="quick">1. Sửa nhanh</TabsTrigger>
                      <TabsTrigger value="canvas">2. Tuỳ biến (Canvas)</TabsTrigger>
                      <TabsTrigger value="rules">3. Luật &amp; giải</TabsTrigger>
                    </TabsList>
                    <TabsContent
                      value="quick"
                      className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground"
                    >
                      Chế độ mặc định cho chủ quán: thay logo, ảnh sản phẩm trà sữa, câu khuyến mãi
                      và đổi skin giữ nguyên nội dung (BLD-19).
                    </TabsContent>
                    <TabsContent
                      value="canvas"
                      className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground"
                    >
                      Canvas tự do 5 màn hình: kéo thả, xoay, căn lề snap và khoá lớp (BLD-20).
                    </TabsContent>
                    <TabsContent
                      value="rules"
                      className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground"
                    >
                      4 bước cấu hình giải thưởng, câu luật tự nhiên, mô phỏng ngân sách và pháp lý
                      (BLD-21).
                    </TabsContent>
                  </Tabs>

                  <div className="grid gap-1.5 rounded-xl border border-border/70 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Gói Quán · Lượt đổi quà tại quầy tháng này (BIL-02)
                      </span>
                      <span className="font-mono font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                        820 / 1.000 lượt (82%)
                      </span>
                    </div>
                    <Progress value={82} />
                    <span className="text-[11px] text-muted-foreground">
                      Quầy đổi quà không bao giờ bị chặn kể cả khi vượt 100% hạn mức gói (D-23).
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
                          TH
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          Chị Hà · Trà Sữa Hà (3 cơ sở)
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Vai trò: Chủ quán (Owner)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Skeleton className="h-9 w-24 rounded-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alerts */}
              <div className="grid gap-2.5">
                <Alert variant="warning">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>Còn 1 mục cần kiểm tra trước khi phát hành (BLD-08)</AlertTitle>
                  <AlertDescription className="text-xs">
                    Quà &ldquo;Mua 1 tặng 1 Ô Long&rdquo; chưa có ảnh minh hoạ. Thêm ảnh giúp tỷ lệ
                    khách đổi quà tăng 24%.
                  </AlertDescription>
                </Alert>

                <Alert variant="info">
                  <Info className="size-4" />
                  <AlertTitle>Nhịp phát quà đang nhanh hơn dự kiến 18% (PRZ-22)</AlertTitle>
                  <AlertDescription className="text-xs">
                    Dự báo hết quà sớm 3 ngày trước Mùng 5 Tết. Đề xuất giảm tỷ lệ trúng từ 30%
                    xuống 24%.
                  </AlertDescription>
                </Alert>

                <Alert variant="success">
                  <CheckCircle2 className="size-4" />
                  <AlertTitle>Sẵn sàng mở bán tại 3 điểm bán (BLD-29)</AlertTitle>
                  <AlertDescription className="text-xs">
                    Đã ghép 3 máy quầy và nhân viên đã hoàn tất đổi thử mã tập huấn.
                  </AlertDescription>
                </Alert>
              </div>

              {/* Overlays & Sonner Triggers */}
              <Card className="p-4">
                <div className="mb-2.5 text-xs font-semibold text-foreground">
                  Hộp thoại, Ngăn kéo, Menu & Thông báo (Overlays &amp; Sonner Toast)
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Dialog: Pre-flight publish */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Rocket className="size-3.5" />
                        Hộp Phát hành (Dialog)
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Kiểm tra trước khi phát hành (BLD-08)</DialogTitle>
                        <DialogDescription>
                          Phiên bản phát hành là bất biến để bảo vệ quyền lợi người chơi và đối soát
                          giải thưởng.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-2.5 py-2 text-xs">
                        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/8 p-3 text-success">
                          <CheckCircle2 className="size-4 shrink-0" />
                          <span>Tổng ngân sách 400 phần quà khớp 1.950.000 ₫ (≤ 2.000.000 ₫).</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/40 p-3 text-foreground">
                          <CheckCircle2 className="size-4 shrink-0 text-primary" />
                          <span>
                            Đã bật thể lệ tự sinh và tách riêng ô đồng ý nhận tin khuyến mãi
                            (CMP-03).
                          </span>
                        </div>
                      </div>
                      <DialogFooter showCloseButton>
                        <Button
                          onClick={() =>
                            toast.success('Đã phát hành chương trình Lộc Xuân Trà Sữa Hà!')
                          }
                        >
                          Xác nhận phát hành
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* AlertDialog: Reopen voucher */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RotateCcw className="size-3.5" />
                        Mở lại mã (AlertDialog)
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mở lại mã PL94K7 đã đổi nhầm? (PRZ-10)</AlertDialogTitle>
                        <AlertDialogDescription>
                          Chỉ Chủ quán (Owner) mới có quyền mở lại mã. Hành động này sẽ được ghi vào
                          Nhật ký kiểm toán (Audit Log ORG-06).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Huỷ</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => toast.info('Đã mở lại mã PL94K7 và ghi Audit Log.')}
                        >
                          Xác nhận mở lại
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Sheet: Player / Play Drawer */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="size-3.5" />
                        Chi tiết khách (Sheet)
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Nguyễn Minh Anh · 090***482</SheetTitle>
                        <SheetDescription>
                          Khách quay lại lần 2 · Đã đồng ý nhận ưu đãi qua Zalo OA.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-6 grid gap-3 text-xs">
                        <div className="rounded-2xl border p-3.5">
                          <div className="font-semibold text-foreground">
                            Lượt 1 · 26/01/2027 14:02
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            Trúng: Up size L miễn phí · Mã PL94K7 · Đã đổi tại Quán Nguyễn Huệ
                          </div>
                        </div>
                        <div className="rounded-2xl border p-3.5">
                          <div className="font-semibold text-foreground">
                            Lượt 2 · 29/01/2027 19:15
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            Trúng: Giảm 15.000đ đơn từ 45k · Mã KT82M1 · Đã đổi tại Quán Cầu Giấy
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Popover: Simulation */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="secondary" size="sm">
                        Mô phỏng 1.000 khách (Popover)
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <PopoverHeader>
                        <PopoverTitle>Kết quả mô phỏng 1.000 lượt (PRZ-08)</PopoverTitle>
                        <PopoverDescription>
                          Chạy thử 500 kịch bản với lưu lượng 80 khách/ngày và cơ chế rải quà theo
                          giờ mở cửa:
                        </PopoverDescription>
                      </PopoverHeader>
                      <div className="mt-3 grid gap-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rủi ro hết quà sớm:</span>
                          <span className="font-semibold text-success">6.2% (An toàn ≤ 10%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Chi phí quà dự kiến:</span>
                          <span className="font-mono font-semibold">1.840.000 ₫</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* DropdownMenu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Thao tác
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Quản lý chương trình</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() => toast.success('Đã sao chép link ?ch=qr-ban')}
                        >
                          <Copy className="size-4" />
                          Sao chép link QR bàn
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toast.success('Đang tải file Standee A4...')}
                        >
                          <Download className="size-4" />
                          Tải mẫu in Standee &amp; Tent card
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <Trash2 className="size-4" />
                        Kết thúc chương trình ngay
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Direct Toast trigger */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toast.success('Đã xác nhận trao quà mã PL94K7!', {
                        description: 'Ghi nhận 1 khách tới quầy tại Cơ sở Nguyễn Huệ.',
                      })
                    }
                  >
                    Thử Toast (Sonner)
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
