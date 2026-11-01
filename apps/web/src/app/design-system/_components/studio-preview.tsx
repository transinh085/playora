'use client';

import {
  Alert,
  AlertDialog,
  Avatar,
  Button,
  Card,
  Checkbox,
  Chip,
  Description,
  Drawer,
  Dropdown,
  FieldError,
  Input,
  Label,
  ListBox,
  Modal,
  Popover,
  ProgressBar,
  Radio,
  RadioGroup,
  Select,
  Skeleton,
  Slider,
  Switch,
  TextArea,
  TextField,
  Toaster,
  Tooltip,
  toast,
} from '@playora/ui/components';
import {
  Copy,
  Eye,
  HelpCircle,
  MoreHorizontal,
  Plus,
  Rocket,
  Save,
  Settings,
  Share,
  Sparkles,
  Trash2,
} from '@playora/ui/icons';
import { useState } from 'react';
import { previewState, StateMatrix } from './state-matrix';

const BUTTON_VARIANTS = ['primary', 'secondary', 'tertiary', 'outline', 'ghost', 'danger'] as const;
const BUTTON_STATES = ['default', 'hover', 'focus', 'active', 'disabled'] as const;

export function StudioPreview() {
  const [winRate, setWinRate] = useState(25);
  const [requireConsent, setRequireConsent] = useState(true);
  const [antiFraud, setAntiFraud] = useState('standard');
  const [selectedPlaybook, setSelectedPlaybook] = useState('tet');

  return (
    <div className="grid gap-10">
      <Toaster placement="bottom end" />

      {/* 1. Button Variant × State Matrix */}
      <div className="grid gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            1. Button — Ma trận Biến thể × Trạng thái tương tác (HeroUI v3)
          </h3>
          <p className="text-xs text-muted-foreground">
            Các biến thể <code className="font-mono">primary</code>,{' '}
            <code className="font-mono">secondary</code>,{' '}
            <code className="font-mono">tertiary</code>, <code className="font-mono">outline</code>,{' '}
            <code className="font-mono">ghost</code>, <code className="font-mono">danger</code> từ{' '}
            <code className="font-mono">@heroui/react</code>.
          </p>
        </div>

        <StateMatrix
          rows={BUTTON_VARIANTS}
          states={BUTTON_STATES}
          render={(variant, state) => (
            <Button
              variant={variant as (typeof BUTTON_VARIANTS)[number]}
              size="sm"
              isDisabled={state === 'disabled'}
              {...previewState(state)}
            >
              {variant === 'primary' ? 'Phát hành' : 'Thao tác'}
            </Button>
          )}
        />

        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-surface">
          <span className="text-xs font-medium text-muted">Kích thước &amp; Biểu tượng:</span>
          <Button size="sm" variant="secondary">
            Small (sm)
          </Button>
          <Button size="md" variant="secondary">
            Medium (md)
          </Button>
          <Button size="lg">
            <Rocket className="size-4" />
            Large CTA (lg)
          </Button>
          <Button variant="secondary" isIconOnly aria-label="Chia sẻ QR">
            <Share className="size-4" />
          </Button>
          <Button variant="ghost" isIconOnly aria-label="Cài đặt">
            <Settings className="size-4" />
          </Button>
        </div>
      </div>

      {/* 2. Form Controls & Validation States */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <Card.Header>
            <Card.Title>2. Trường nhập liệu &amp; Trạng thái hợp lệ (TextField, Select)</Card.Title>
            <Card.Description>
              Compound pattern của HeroUI v3: TextField + Label + Input + Description + FieldError.
            </Card.Description>
          </Card.Header>
          <Card.Content className="mt-4 grid gap-4">
            <TextField defaultValue="Vòng quay Lộc Xuân Trà Sữa Hà">
              <Label>Tên chương trình (Default)</Label>
              <Input />
            </TextField>

            <TextField isInvalid defaultValue="15.000.000 ₫">
              <Label>Trạng thái lỗi (Invalid / Error)</Label>
              <Input />
              <FieldError>
                Tổng giá vốn quà (15.000.000 ₫) vượt trần ngân sách bạn đặt (2.000.000 ₫).
              </FieldError>
            </TextField>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                selectedKey={selectedPlaybook}
                onSelectionChange={(key) => key && setSelectedPlaybook(String(key))}
                aria-label="Playbook mục tiêu"
              >
                <Label>Playbook mục tiêu</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="tet" textValue="Tết: Kéo khách về quán">
                      Tết: Kéo khách về quán
                    </ListBox.Item>
                    <ListBox.Item id="return" textValue="Khách quay lại lần 2">
                      Khách quay lại lần 2
                    </ListBox.Item>
                    <ListBox.Item id="slow" textValue="Lấp ngày vắng (Thứ 3–5)">
                      Lấp ngày vắng (Thứ 3–5)
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              <TextField isDisabled defaultValue="play.playora.vn/tra-sua-ha">
                <Label>Trạng thái khoá (Disabled)</Label>
                <Input />
              </TextField>
            </div>

            <TextField defaultValue="Áp dụng tại 3 cơ sở TP.HCM. Mỗi mã đổi 1 phần quà tại quầy, không quy đổi tiền mặt.">
              <Label>Thể lệ chương trình (TextArea)</Label>
              <TextArea rows={2} />
              <Description>Hiển thị trong bảng thể lệ trên điện thoại khách chơi.</Description>
            </TextField>
          </Card.Content>
        </Card>

        {/* 3. Selection Controls */}
        <Card className="p-5">
          <Card.Header>
            <Card.Title>
              3. Điều khiển chọn &amp; Nhịp phát quà (Switch, Checkbox, Radio, Slider)
            </Card.Title>
            <Card.Description>
              Dùng trong chế độ Luật &amp; Giải của Builder (PRZ-02 đến PRZ-08).
            </Card.Description>
          </Card.Header>
          <Card.Content className="mt-4 grid gap-5">
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs">
                <Label>Tỷ lệ trúng tổng mục tiêu (PRZ-02)</Label>
                <span className="font-mono font-bold text-primary tabular-nums">{winRate}%</span>
              </div>
              <Slider
                value={winRate}
                onChange={(v) => setWinRate(Array.isArray(v) ? (v[0] ?? 25) : v)}
                minValue={5}
                maxValue={100}
                step={5}
                aria-label="Tỷ lệ trúng tổng mục tiêu"
              >
                <Slider.Track>
                  <Slider.Fill />
                  <Slider.Thumb />
                </Slider.Track>
              </Slider>
            </div>

            <Switch isSelected={requireConsent} onChange={setRequireConsent}>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Content>
                <div className="grid gap-0.5">
                  <span className="text-xs font-semibold text-foreground">
                    Rải quà đều theo giờ mở cửa (Pacing · PRZ-04)
                  </span>
                  <span className="text-[11px] text-muted">
                    Tránh hết sạch giải lớn ngay buổi sáng ngày đầu khai trương
                  </span>
                </div>
              </Switch.Content>
            </Switch>

            <Checkbox defaultSelected>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <span className="text-xs leading-snug text-foreground">
                  Bắt buộc khách tích đồng ý điều khoản bảo vệ dữ liệu cá nhân (NĐ 13/2023)
                </span>
              </Checkbox.Content>
            </Checkbox>

            <RadioGroup
              value={antiFraud}
              onChange={setAntiFraud}
              aria-label="Mức bảo vệ chống gian lận"
            >
              <Label>Mức bảo vệ chống gian lận (SEC-02)</Label>
              <Radio value="standard">
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Radio.Content>
                  <span className="text-xs">
                    Tiêu chuẩn — Khoá thiết bị + SĐT + Cloudflare Turnstile tự động
                  </span>
                </Radio.Content>
              </Radio>
              <Radio value="strict">
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Radio.Content>
                  <span className="text-xs">
                    Khắt khe — Phải đổi quà tại quầy mới mở lượt chơi tiếp theo
                  </span>
                </Radio.Content>
              </Radio>
            </RadioGroup>
          </Card.Content>
        </Card>
      </div>

      {/* 4. Badges, Status Pills, Avatars & Progress */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <Card.Header>
            <Card.Title>4. Chip trạng thái chương trình &amp; Voucher (HeroUI Chip)</Card.Title>
          </Card.Header>
          <Card.Content className="mt-4 grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Chip variant="soft" color="success" size="sm" className="gap-1.5">
                <span className="inline-block size-2 animate-live-pulse rounded-full bg-current" />
                Đang chạy (Live)
              </Chip>
              <Chip variant="soft" color="accent" size="sm">
                Đã lên lịch (Scheduled)
              </Chip>
              <Chip variant="soft" color="warning" size="sm">
                Tạm dừng (Paused)
              </Chip>
              <Chip variant="soft" color="default" size="sm">
                Bản nháp (Draft)
              </Chip>
              <Chip variant="soft" color="danger" size="sm">
                Đã huỷ / Chặn (Void)
              </Chip>
            </div>

            <div className="flex items-center justify-between border-t border-separator pt-3">
              <div className="flex items-center gap-2.5">
                <Avatar size="sm" color="accent">
                  <Avatar.Fallback>TH</Avatar.Fallback>
                </Avatar>
                <div className="text-xs">
                  <div className="font-semibold text-foreground">Trà Sữa Hà · Quận 1</div>
                  <div className="text-muted">Gói Quán (299.000 ₫/tháng · BIL-01)</div>
                </div>
              </div>
              <Chip variant="soft" color="accent" size="sm">
                Chủ quán (Owner)
              </Chip>
            </div>
          </Card.Content>
        </Card>

        <Card className="p-5">
          <Card.Header>
            <Card.Title>5. Hạn mức gói, Skeleton &amp; Cảnh báo (ProgressBar, Alert)</Card.Title>
          </Card.Header>
          <Card.Content className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">
                  Lượt đổi quà trong tháng (Gói Quán: 1.320 / 1.500)
                </span>
                <span className="font-mono font-semibold text-warning tabular-nums">88%</span>
              </div>
              <ProgressBar value={88} size="sm" color="warning" aria-label="Hạn mức gói">
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
            </div>

            <Alert status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Sắp chạm hạn mức đổi quà tháng (88%)</Alert.Title>
                <Alert.Description>
                  Khách đã có mã vẫn đổi được tại quầy; nâng lên Gói Chuỗi để mở 10.000 lượt/tháng.
                </Alert.Description>
              </Alert.Content>
            </Alert>

            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-xl" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-3.5 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-1/3 rounded-md" />
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* 6. Overlays: Modal, Drawer, AlertDialog, Dropdown, Popover, Tooltip, Toast */}
      <Card className="p-5">
        <Card.Header>
          <Card.Title>
            6. Hộp thoại, Ngăn kéo &amp; Phản hồi nổi (Modal, Drawer, AlertDialog, Dropdown,
            Popover, Tooltip, Toast)
          </Card.Title>
          <Card.Description>
            Bấm trực tiếp vào từng nút bên dưới để kiểm tra focus trap, đóng bằng phím ESC và hiệu
            ứng mở của HeroUI v3.
          </Card.Description>
        </Card.Header>
        <Card.Content className="mt-4 flex flex-wrap items-center gap-2.5">
          {/* Publish Preflight Modal */}
          <Modal>
            <Button size="sm">
              <Rocket className="size-4" />
              Mở Modal Kiểm tra Phát hành
            </Button>
            <Modal.Backdrop isDismissable>
              <Modal.Container size="md">
                <Modal.Dialog>
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>Kiểm tra trước khi phát hành (BLD-22)</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <p className="mb-3 text-body-2-regular text-muted">
                      Hệ thống tự động rà soát 4 mục bắt buộc để chương trình không gặp sự cố khi
                      khách quét QR tại quầy:
                    </p>
                    <div className="grid gap-2 text-xs">
                      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary/50 p-3">
                        <span className="font-medium text-foreground">
                          1. Tổng xác suất &amp; Kho quà (400 phần · 2.000.000 ₫)
                        </span>
                        <Chip variant="soft" color="success" size="sm">
                          Đạt
                        </Chip>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-secondary/50 p-3">
                        <span className="font-medium text-foreground">
                          2. Khung giờ mở cửa &amp; Ngày áp dụng
                        </span>
                        <Chip variant="soft" color="success" size="sm">
                          Đạt
                        </Chip>
                      </div>
                    </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button slot="close" variant="ghost">
                      Để sau
                    </Button>
                    <Button
                      slot="close"
                      onPress={() => toast.success('Đã phát hành chương trình & tạo mã QR!')}
                    >
                      Phát hành ngay
                    </Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>

          {/* Slide-over Drawer */}
          <Drawer>
            <Button variant="secondary" size="sm">
              <Eye className="size-4" />
              Mở Drawer Chi tiết
            </Button>
            <Drawer.Backdrop isDismissable>
              <Drawer.Content placement="right">
                <Drawer.Dialog>
                  <Drawer.CloseTrigger />
                  <Drawer.Header>
                    <Drawer.Heading>Lộc Xuân Trà Sữa Hà 2027</Drawer.Heading>
                  </Drawer.Header>
                  <Drawer.Body>
                    <div className="grid gap-4 text-sm">
                      <p className="text-muted">
                        Thống kê chi tiết tỷ lệ khách tới quầy đổi quà và danh sách phần thưởng đang
                        mở.
                      </p>
                      <div className="rounded-2xl border border-border bg-surface-secondary p-4">
                        <div className="text-xs text-muted">Tỷ lệ khách tới quầy</div>
                        <div className="mt-1 text-2xl font-bold text-foreground">92.4%</div>
                      </div>
                    </div>
                  </Drawer.Body>
                  <Drawer.Footer>
                    <Button slot="close" variant="secondary" fullWidth>
                      Đóng
                    </Button>
                  </Drawer.Footer>
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </Drawer>

          {/* Destructive AlertDialog */}
          <AlertDialog>
            <Button variant="danger-soft" size="sm">
              <Trash2 className="size-4" />
              Mở AlertDialog Xác nhận dừng
            </Button>
            <AlertDialog.Backdrop isDismissable>
              <AlertDialog.Container>
                <AlertDialog.Dialog>
                  <AlertDialog.CloseTrigger />
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Heading>Kết thúc sớm chương trình đang chạy?</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    Khách quét mã QR mới sẽ thấy thông báo chương trình đã kết thúc. Các mã thưởng
                    đã phát cho khách trước đó vẫn đổi được tại quầy cho tới hết hạn.
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button slot="close" variant="tertiary">
                      Giữ chương trình chạy
                    </Button>
                    <Button
                      slot="close"
                      variant="danger"
                      onPress={() => toast.warning('Đã kết thúc chương trình.')}
                    >
                      Kết thúc chương trình
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>

          {/* Dropdown Menu */}
          <Dropdown>
            <Button variant="secondary" size="sm">
              <MoreHorizontal className="size-4" />
              Menu Hành động (Dropdown)
            </Button>
            <Dropdown.Popover placement="bottom start">
              <Dropdown.Menu aria-label="Thao tác chương trình">
                <Dropdown.Section>
                  <Dropdown.Item id="preview" textValue="Chơi thử bản nháp">
                    <Eye className="size-4 text-muted" />
                    <Label>Chơi thử bản nháp</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="duplicate" textValue="Nhân bản cho đợt sau">
                    <Copy className="size-4 text-muted" />
                    <Label>Nhân bản cho đợt sau</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="delete" textValue="Xoá bản nháp" variant="danger">
                    <Trash2 className="size-4" />
                    <Label>Xoá bản nháp</Label>
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>

          {/* Popover */}
          <Popover>
            <Button variant="secondary" size="sm">
              <HelpCircle className="size-4" />
              Giải thích Pacing (Popover)
            </Button>
            <Popover.Content placement="bottom start" className="max-w-xs">
              <Popover.Dialog>
                <Popover.Heading className="text-body-semibold">
                  Nhịp phát quà tự động (PRZ-04)
                </Popover.Heading>
                <p className="mt-1 text-caption-1-regular text-muted">
                  Máy chủ chia đều quỹ quà theo số giờ mở cửa còn lại trong ngày. Nếu buổi sáng đã
                  phát nhanh, xác suất tự giảm nhẹ để buổi tối vẫn còn quà cho khách.
                </p>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>

          {/* Tooltip */}
          <Tooltip delay={150}>
            <Tooltip.Trigger>
              <Button variant="ghost" size="sm">
                Di chuột xem Tooltip
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>
              Mọi nút chỉ có biểu tượng đều bắt buộc có Tooltip + aria-label
            </Tooltip.Content>
          </Tooltip>

          {/* Toast triggers */}
          <Button
            variant="secondary"
            size="sm"
            onPress={() => toast.success('Đã lưu thiết lập chương trình (240ms trước)')}
          >
            <Save className="size-4" />
            Bắn Toast Thành công
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() =>
              toast.danger('Không thể đổi mã PL94K7 — Mã này đã được sử dụng lúc 14:02')
            }
          >
            <Sparkles className="size-4" />
            Bắn Toast Lỗi
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => toast.info('Đã tạo liên kết chơi thử cho nhân viên')}
          >
            <Plus className="size-4" />
            Bắn Toast Thông tin
          </Button>
        </Card.Content>
      </Card>
    </div>
  );
}
