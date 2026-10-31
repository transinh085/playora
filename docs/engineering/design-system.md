# Design System — Playora v2.0 (shadcn/ui Luma)

Cập nhật: 31/10/2026 · Owner: Tech Lead (founder) · Trạng thái: **v2.0** (shadcn/ui preset `luma`, brand teal, đồng bộ [PRD v4.3](../product/prd.md)) · Code: `packages/ui` · Trang sống: `apps/web` → `/design-system` (noindex) · Liên quan: [ADR-016](../adr/016-shadcn-luma-ui.md) (thay thế [ADR-013](../adr/013-antd-ui.md)), [product/specs/studio-ux.md](../product/specs/studio-ux.md), [product/specs/builder.md](../product/specs/builder.md), [product/specs/playbooks.md](../product/specs/playbooks.md), [product/specs/prizes-redemption.md](../product/specs/prizes-redemption.md)

> **Di sản sân khấu:** surface Screen/LED đã gỡ ([ADR-011](../adr/011-remove-live-engine.md)). Token `violet`, `spotlight`, `stage`, `team`, `medal`, skin `classic`/`yep` và component `TeamBar`, `Leaderboard`, `JoinPanel` vẫn còn trong `packages/ui` để giữ tương thích cho các mẫu vòng quay và đối chiếu skin; bề mặt trọng tâm của M1–M2 là **Studio**, **Quầy đổi quà trên điện thoại**, và **Player trên điện thoại**.

Playora có các bề mặt với nhu cầu và ngữ cảnh sử dụng khác hẳn nhau ([PRD §2–§3](../product/prd.md#2-persona)), nên design system không phải một "theme" đồng phục mà là **một kiến trúc token 3 tầng và hai họ component**:

| Bề mặt | Người dùng (Persona) | Nhu cầu & Bối cảnh | Họ component |
|---|---|---|---|
| **Studio** (`apps/studio`) | **Chị Hà** (chủ quán trà sữa/cà phê), **Chị Thảo** (quản lý cửa hàng chuỗi) | Desktop-first: chọn Playbook theo mục tiêu (`PLB-01`), dựng nhanh qua Builder 3 chế độ (`BLD-03`), đọc ngay kết quả kinh doanh (*Khách tới quầy · Khách quay lại · Chi phí quà* `PLB-03`) trong một cái liếc | `@playora/ui/components/*` (shadcn/ui `luma` style) trong `StudioProvider` (`@playora/ui/providers`) |
| **Quầy đổi quà** (`/orgs/{orgId}/redeem`) | **Tuấn** (nhân viên đứng quầy giờ cao điểm, cầm điện thoại 1 tay) | Mobile-first: ghép bằng QR không cần tài khoản (`ORG-10`), quét QR / gõ mã 6 ký tự / tìm theo SĐT (`PRZ-15`), thấy chữ **ĐỔI ĐƯỢC** / **ĐÃ ĐỔI LÚC 14:02** cực lớn (`PRZ-18`), có chế độ tập huấn (`PRZ-19`) | `@playora/ui/components/*` tối ưu vùng ngón cái (nút xác nhận cao `56px`, chữ mã `.type-code-voucher`) |
| **Player / Kiosk** (`apps/play`; Play giả lập trong Studio Builder) | **Khách của quán** cầm điện thoại trên mạng 4G | Bấm được bằng một ngón khi đang đứng, tải nhẹ (`≤ 260 KB gzip`), thấy số quà còn lại minh bạch (`BLD-25`), lưu mã vào Zalo + đồng hồ thực chống ảnh chụp màn hình (`PRZ-03`, `PRZ-16`) | `@playora/ui/game/*` + `@playora/ui/campaign` (bọc trong `GameRoot` + `PlayProvider`) |

---

## 1. Tham chiếu và bài học (Open-source SaaS / AI dùng shadcn/ui)

| Sản phẩm / Dự án Open-source | Học gì | Không học gì |
|---|---|---|
| **shadcn/ui `luma` preset & Vercel Geist / v0** | Hình khối mềm mại và đồng tâm (Concentric Radius): mọi phần tử điều khiển (`Button`, `Input`, `Select`, `Textarea`, `TabsList`, `Popover`, `Alert`, `IconTile`) thống nhất bo góc `rounded-xl` (`12px`); thành phần con bên trong (`TabsTrigger`, `SelectItem`, `DropdownMenuItem`) bo `rounded-lg` (`8px`); khung chứa lớn (`Card`, `Dialog`, `TableCard`) bo `rounded-2xl` (`16px`); viền mảnh `border-border/80` đi cùng bóng đổ đa tầng nhẹ (`--shadow-xs`, `--shadow-sm`), lớp kính mờ `luma-glass` (`backdrop-blur-md`) | Giao diện trắng-đen đơn sắc 100% thiếu điểm nhấn cảm xúc cho ngành F&B; dark-first mặc định (chủ quán làm việc ban ngày) |
| **Dub.co (`dubinc/dub`) & Cal.com (`calcom/cal.com`)** | Bàn làm việc SaaS yên tĩnh: nền canvas xám lạnh `--ink-50` làm nổi bật các thẻ trắng `#ffffff`; badge trạng thái luôn có icon hoặc chấm động (`animate-live-pulse`); bảng dữ liệu sát mép thẻ có thanh lọc phía trên (`TableCard`); trạng thái rỗng (`EmptyState`) dẫn thẳng tới hành động tạo mới | Các bảng cấu hình kỹ thuật nhiều thuật ngữ developer (webhook, regex…) — chủ quán chỉ đọc câu tự nhiên |
| **Midday (`midday-ai/midday`) & Langfuse** | Tư duy **Outcome-first / ROI Dashboard**: đặt 4 chỉ số tài chính & khách thực (*Khách tới quầy · Khách quay lại · Chi phí quà / ngân sách · Chi phí mỗi khách*) lên đầu trang Tổng quan (`PLB-03`) kèm so sánh ước tính với ngày thường (`PLB-08`) thay vì chỉ đếm lượt xem/lượt quay ảo | Biểu đồ kế toán phức tạp nhiều trục |
| **Open-source AI Copilots (Vercel AI / Prompt Builders)** | Luồng khởi tạo từ mục tiêu **"Bạn muốn gì?"** (`PLB-01`), thanh trượt ngân sách tự động tính cơ cấu quà & mô phỏng rủi ro hết quà sớm (`PLB-02`, `PRZ-08`), câu luật điền chỗ trống bằng ngôn ngữ tự nhiên (`BLD-21`), và hộp kiểm tra tự động một chạm trước khi phát hành (`BLD-08`) | Giao diện chat hội thoại tự do bắt chủ quán phải tự gõ prompt dài |
| **games-vt admin** (`../games-vt/fe-game-admin`) | **Nguồn bố cục cho Studio:** sidebar trắng có khối brand và menu chia nhóm, header có breadcrumb và người dùng, `PageHeader` có mô tả, hàng `MetricCard` có ô icon tô màu (`IconTile`), `TableCard` có thanh công cụ, tag trạng thái có icon | Màu xanh sky, tên/branding của sản phẩm đó, runtime Ant Design v6 nặng nề (đã thay bằng `shadcn/ui` ở [ADR-016](../adr/016-shadcn-luma-ui.md)) |
| **Duolingo / Kahoot! / 凡科互动** | Nút `GameButton` "3D" có cạnh đáy, nhấn xuống thì lún; **1 cơ chế × N skin** theo mùa (`[data-skin]`); skin là tầng token chứ không phải template mới | Mascot trẻ con, trang trí nhấp nháy dày đặc |

---

## 2. Nguyên tắc

1. **Studio yên tĩnh, Game rực rỡ, Quầy đổi quà dứt khoát.** Studio dùng nền trung tính lạnh (`--ink-50`); `teal` chỉ cho hành động chính (`Primary CTA`), liên kết, focus ring và mục đang chọn; các tone nhạt chỉ nằm trong `IconTile` và `Badge` trạng thái. Sự rực rỡ dành cho bề mặt Player; sự tương phản cực đại dành cho Quầy đổi quà.
2. **Kết quả kinh doanh đứng trước số liệu ảo.** Mọi trang báo cáo và thẻ chương trình ưu tiên hiển thị **Khách tới quầy (đã đổi quà)**, **Khách quay lại**, và **Chi phí quà thực tế** trước số lượt chơi (`PLB-03`).
3. **Đọc được trên điện thoại khi đang đứng.** Điểm, số tiền, đồng hồ và mã đổi quà 6 ký tự (`.type-code-voucher`) dùng `tabular-nums`; chữ trên canvas ≥ 12 px (pre-flight cảnh báo `BLD-08`).
4. **Màu không bao giờ là tín hiệu duy nhất.** Trạng thái luôn có icon hoặc nhãn kèm theo; `"Đang chạy"` có chấm `animate-live-pulse` và chữ.
5. **Khách hàng đổi màu được, nhưng không phá được khả năng đọc.** Brand kit đi qua `brandKitVars()`, chữ tự chọn sáng/tối theo tương phản WCAG 2.1 (`readableOn()`), tự nâng cấp màu chữ nếu tương phản với nền `< 3:1`.
6. **Một khoảnh khắc chuyển động.** Chuyển động dành cho thay đổi có ý nghĩa: nút lún nhẹ (`active:scale-[0.99]`), vòng quay mở thưởng, 5 giây cuối đếm ngược. Tôn trọng `prefers-reduced-motion: reduce`.

---

## 3. Token

Định nghĩa đồng bộ ở `packages/ui/src/styles.css` (CSS custom properties OKLCH + `@theme inline` của Tailwind CSS v4) và `packages/ui/src/theme/tokens.ts`, gồm ba tầng:

```text
Primitive  tokens.ts (teal, violet, ink, spotlight, stage, team, medal) + styles.css (--teal-*, --ink-*…)
   │
   ├─► Studio & Redeem  shadcn/ui luma semantic tokens (:root & .dark)
   │                    --background, --foreground, --card, --popover, --primary(-active),
   │                    --secondary, --muted, --accent, --success, --warning, --info, --live, --destructive,
   │                    --border, --input, --ring, --sidebar-*, --chart-1..5
   │
   └─► Game             resolveGameTheme({ skin, brand }) → biến CSS --game-*
                        (--game-bg, --game-fg, --game-muted, --game-surface, --game-border,
                         --game-primary(-fg), --game-accent(-fg), --game-urgent, --game-glow,
                         --game-radius, --game-font; đổi theo [data-skin] và brandKitVars)
```

### 3.1 Màu

| Nhóm | Vai trò |
|---|---|
| `teal` (hue 192) | Màu thương hiệu. Studio: **chỉ** nút chính (`default`), link, focus ring, mục đang chọn. 600 (`#0f7c79`) trên nền sáng, 400 trên nền tối (chữ trên nút tối màu là `ink-950`) |
| `ink` | Neutral xám lạnh (hue 255, chroma ≤ 0.017), gánh gần hết giao diện Studio (`--ink-50` cho `--background`, `#ffffff` cho `--card`) |
| `violet` (hue 293) | Legacy, chỉ còn cho skin `classic`. Không dùng ở Studio |
| `spotlight` (vàng ánh đèn) | Màu nhấn nổi bật cho nút chơi, giải đặc biệt, huy hiệu |
| `stage` | Nền đêm sâu cho skin tối (`classic`) |
| `team-1…8` | 8 màu phân biệt cho múi vòng quay / phân loại quà mặc định; luôn đi kèm nhãn chữ |
| `success / warning / info / live / destructive` | Token ngữ nghĩa ở Studio và Quầy đổi quà. `live` = `"on air"`, chỉ dùng cho chương trình đang diễn ra thật |

Tailwind: `bg-primary`, `text-muted-foreground`, `bg-success/12`, `bg-game-primary`, `text-game-muted`, `bg-team-3`, `bg-medal-gold`…

### 3.2 Chữ

| Vai trò | Font | Dùng cho |
|---|---|---|
| Display | **Unbounded** (`font-display`, `font-game`) | Wordmark, tên game, tên giải trúng, đồng hồ, nút game, băng rôn **ĐỔI ĐƯỢC** tại quầy, tiêu đề lớn trên web |
| Text | **Be Vietnam Pro** (`font-sans`) ở Play và Web; **Google Sans** ở Studio | Mọi nội dung và UI; cả hai có dấu tiếng Việt chuẩn (`Ầ Ẩ Ẫ Ậ Ắ Ặ Ữ Ỹ ổ ợ ự ₫`) |
| Mono | `ui-monospace` | Mã đổi quà 6 ký tự (`.type-code-voucher`), đường dẫn slug, mã ghép máy quầy |

Cả hai nạp bằng `next/font/google` với subset `vietnamese` trong `layout.tsx` của mỗi app (biến `--font-sans`, `--font-display`).

Hệ thống cung cấp bộ `@utility type-*` trong `packages/ui/src/styles.css` (tối ưu khả năng đọc dấu tiếng Việt trên `Google Sans` / `Be Vietnam Pro`):
- `.type-display-lg` (`clamp(32px, 3.2vw+16px, 52px)`, weight 700, lh 1.15)
- `.type-display-md` (`clamp(24px, 2vw+12px, 36px)`, weight 700, lh 1.2)
- `.type-metric` (`28px / 36px`, weight 600, tracking `-0.02em`, `tabular-nums`) — số liệu chính trong `MetricCard`
- `.type-page-title` (`22px / 30px`, weight 600, tracking `-0.015em`) — tiêu đề trong `PageHeader` & Drawer
- `.type-section-title` (`16px / 24px`, weight 600, tracking `-0.01em`) — `CardTitle`, `DialogTitle`, tiêu đề khối
- `.type-body` (`14px / 22px`, weight 400–500) — `Button`, `Input`, `Select`, mục Sidebar, dòng bảng, menu item
- `.type-caption` (`13px / 20px`, weight 400–500) — tiêu đề nhóm Accordion Sidebar (`font-medium`), chip lọc, `CardDescription`, chú thích dưới ô nhập (`text-[13px]`)
- `.type-micro-badge` (`12px / 16px`, weight 500) — nhãn phân loại và trạng thái pastel trong bảng (`text-xs font-medium`)
- `.type-code-voucher` (`22px`, mono, weight 700, tracking `0.16em`, `tabular-nums`) — mã đổi quà 6 ký tự

Không dùng chữ in hoa toàn bộ cho nhãn thường; không thêm "eyebrow" trang trí thừa trên tiêu đề.

### 3.3 Hệ thống Viền mảnh `0.5px`, Bo góc & Độ nổi (Louis CRM Hairline Border & Radius Scale)

Toàn bộ giao diện Studio áp dụng **viền mảnh `0.5px` (hairline border)** và thang bo góc sắc nét chuẩn `louis-crm-filter.vercel.app`:

| Token / Class | Giá trị | Ghi chú & Thành phần áp dụng |
|---|---|---|
| `border` / `border-{t,r,b,l,x,y}` / `divide-{x,y}` | `0.5px` (`#E5E5E5` sáng / `rgba(255,255,255,0.10)` tối) | Viền mặc định cho mọi khung bảng, Sidebar, Header, Card, Input, Button outline và vạch ngăn (`w-[0.5px] h-[18px]`, `h-[0.5px]`) |
| `--border-hover` / `--ring` | `#D4D4D4` / `#A3A3A3` (sáng) · `rgba(255,255,255,0.30)` (tối) | Viền khi hover hoặc focus vào ô nhập (`focus-visible:border-neutral-400 dark:focus-visible:border-white/30`); bàn phím focus dùng `outline: 1.5px solid #3b82f6` |
| `rounded-sm` (`--radius-sm`) | `4px` (`0.25rem`) | `Checkbox` (`size-3.5 rounded-[4px]`), ô màu đại diện nhỏ trong menu chọn tổ chức |
| `rounded-md` (`--radius-md`) | `6px` (`0.375rem`) | **Bán kính Control & Tag chuẩn:** `Button` (`h-8`), `Input` (`h-8`), `Textarea`, `SelectTrigger` (`h-8`), `TabsTrigger`, mục Sidebar, chip lọc, `Badge` (`10px`), `DropdownMenuItem`, `SelectItem` |
| `rounded-lg` (`--radius-lg`) | `8px` (`0.5rem`) | **Bán kính Khung chứa & Menu nổi:** `Card`, `MetricCard`, `TableCard`, `DropdownMenuContent`, `SelectContent`, `PopoverContent`, `DialogContent`, `TabsList`, `Toast` |
| `rounded-xl` (`--radius-xl`) | `10px` (`0.625rem`) | Ô biểu tượng lớn (`60×60px` avatar badge), khung nhóm đặc biệt |
| `rounded-3xl` (`--radius-3xl`) | `24px` (`1.5rem`) | Khung giả lập điện thoại trong Builder & Quầy đổi quà |
| `rounded-full` (`--radius-4xl`) | `9999px` (Pill) | Avatar tròn, chấm trạng thái, `Switch`, `Progress`, `Slider` |
| `--game-radius` / `rounded-game` | `1.25rem` (20px) | Mềm, "đồ chơi"; brand kit chọn `square (4px) / soft (12px) / round (24px)` |
| `--shadow-xs / sm / md / lg` | Bóng phân tầng nhẹ | `shadow-xs` cho `Card`, `Input`, `Button`; `shadow-lg` cho `Dialog`, `Sheet` |
| `luma-glass` | `backdrop-blur(12px)` | Thanh chuyển chế độ nổi trên Builder, thanh dính đầu trang |
| `--duration-fast/base/slow/stage` | `120 / 200 / 320 / 640 ms` | Đi kèm `ease-out`, `ease-in-out`, `ease-spring`, `animate-live-pulse` |

### 3.4 Luật Studio (1-to-1 Louis CRM / Attio Workspace & shadcn/ui luma)

- **Khung (`AppShell`):** sidebar mặc định `208px` (thu gọn `68px`, kéo giãn biên phải `180px–450px`; `Sheet` trên mobile) dùng nền `--sidebar` (`#fafafa` sáng / `#0a0a0a` tối) tách biệt với vùng làm việc trắng tinh `--background` (`#ffffff` sáng / `#0a0a0a` tối). Đỉnh sidebar (`h-[48px]`) đặt bộ chọn Tổ chức kèm ô gradient `4x4` và nút thu gọn (`PanelLeft`). Nhóm điều hướng đầu tiên gồm `Trang chủ`, `Đổi quà` và `Thao tác nhanh` (`Quick Actions`, phím tắt `J` / `⌘K`). Các nhóm bên dưới (`Minigame · Thương hiệu · Tổ chức`) là các khối Accordion thu/mở có mũi tên xoay `ChevronDown`; mục đang chọn dùng nền `--sidebar-accent` (`bg-neutral-200/80` sáng / `#171717` tối) và chữ đậm `--sidebar-accent-foreground`. Đáy sidebar (`h-[44px]`) là thanh hồ sơ người dùng nền `bg-neutral-100` / `#171717` kèm menu `MoreHorizontal`. Header vùng nội dung (`h-[48px]`) hiển thị icon mục + tên trang ở bên trái, bên phải gồm nút tạo nhanh (`+ Chương trình`), `Share`, vạch ngăn mảnh `0.5px`, cụm avatar chồng nhau, chuyển chế độ sáng/tối và nút trợ giúp. Vai trò `"chỉ đổi quà"` (`ORG-02a`) chỉ thấy mục **Đổi quà**.
- **Trang danh sách & Bảng dữ liệu (`TableCard` + `Table`):** Thanh công cụ thứ cấp cao `48px` đặt nút `Filter (n)` + dải chip lọc trạng thái + nút `+` ở bên trái; bên phải gồm ô tìm kiếm, `Layout` (Bảng/Thẻ), `Sort`, `View Settings`, vạch ngăn `0.5px` và nút `Save` có chấm xanh dương. Header bảng (`h-[44px]`, nền `bg-neutral-50` / `#0a0a0a`) có cột `#` đánh số thứ tự đầu tiên, mỗi cột tiếp theo đều có icon đại diện + tên cột + thanh kéo giãn xanh dương (`group-hover:bg-blue-500`) ở mép phải. Các dòng bảng (`h-[44px]`) hiển thị số thứ tự (chuyển thành `GripVertical` khi hover), ô màu gradient đại diện chương trình, nhãn phân loại pastel `10px` (`rounded-md border`) và thanh tổng kết dính đáy bảng (`TableFooter` cao `44px`, nền `bg-neutral-100` / `#171717`, hiển thị `Total: N` và `Count`).
- **Ngăn chi tiết cạnh phải (`Drawer` · 1-to-1 Louis CRM Side-Drawer Pattern):** Kích thước mặc định `612px`, kéo giãn biên trái tự do bằng chuột qua resizer handle (`w-[6px] cursor-col-resize hover:bg-blue-500/50`, `minWidth: 380px`, `maxWidth: innerWidth - 180px`), hiệu ứng trượt mượt mà `translate-x-full` sang `translate-x-0` với đường cong `--ease-drawer` (`cubic-bezier(0.32, 0.72, 0, 1)`). Header dính (`DrawerHeader`, cao `48px`) hiển thị Breadcrumbs (`Khách hàng / [Tên]`), nút hành động (`+ Hợp đồng`), vạch ngăn `0.5px`, nút phóng to và nút đóng `X`. Khối tóm tắt (`DrawerSummary`) có huy hiệu đại diện `60×60px` (`rounded-[10px]`, gradient + viền mảnh + đổ bóng), tiêu đề `20px font-medium`, cụm avatar thành viên xếp chồng `-space-x-1.5`, tag pastel `10px` và hàng nút thao tác nhanh (`Gọi điện`, `Gửi email`, `Website`). Hệ thống tab dính (`DrawerTabs` cao `48px`) với vạch chỉ báo trượt dưới đáy chia làm 3 tab chuẩn:
  - *Chi tiết (Details):* Danh sách thuộc tính Key-Value (`DrawerPropertyList` + `DrawerPropertyRow`, nhãn cố định `120px` có icon, hover nhẹ `hover:bg-muted/50`, giá trị hiển thị dạng liên kết hoặc avatar đại diện) và lưới 4 thẻ chỉ số hiệu quả (`DrawerMetricGrid` + `DrawerMetricCard`, cao `142px`, giá trị số lớn `24px tabular-nums`, badge pill đánh giá `Xuất sắc/Cao/Tốt`, đoạn mô tả ngắn 2 dòng `line-clamp-2`).
  - *Ghi chú (Notes):* Danh sách thẻ ghi chú hoạt động (`DrawerNoteCard`, cao `142px`, icon tile `28×28px`, tiêu đề, ngày tháng, tên tác giả, đoạn trích 2 dòng và nút menu).
  - *Tài liệu (Files):* Thanh công cụ tạo thư mục / tải lên và lưới 2 cột thẻ tệp (`DrawerFileCard`, phân nhóm theo năm, icon tệp, dung lượng và nút tải về).
  - *Tương tác dòng bảng:* Khi mở Drawer cho một dòng, dòng đó được ghim trạng thái active (`row-active ring-1 ring-neutral-300 dark:ring-white/20 bg-neutral-100 dark:bg-white/10`).
- **Trang chi tiết:** `PageHeader` có nút quay lại (`rounded-xl`) và `Badge` trạng thái → `Tabs` → các `Card` bo `rounded-2xl`.
- **Quầy đổi quà trên điện thoại (`/redeem`):** Tối ưu thao tác 1 tay của nhân viên quầy (`PRZ-10`, `PRZ-18`): ô nhập mã 6 ký tự `.type-code-voucher`, tab chuyển sang **Tìm theo SĐT** (`PRZ-15`), băng rôn kết quả cực lớn (**ĐỔI ĐƯỢC** xanh `success` / **ĐÃ ĐỔI LÚC 14:02** đỏ `destructive` / **MÃ CHƠI THỬ · TẬP HUẤN** vàng `warning` `PRZ-19`), nút xác nhận cao `56px` (`h-14`).
- **Cỡ control đồng bộ:** mọi phần tử form (`Button`, `Input`, `SelectTrigger`, `TabsList`) dùng cỡ mặc định cao `36px` (`h-9`). `size="sm"` (`h-8`) hoặc `size="xs"` (`h-7`) chỉ dành cho thanh công cụ phụ hoặc dòng bảng dày. Riêng `Button` tuân thủ chuẩn **Wensity UI Primitive (`ui.wensity.com/primitives/button`)**: 7 surface roles (`default`, `secondary`, `outline`, `ghost`, `white`, `destructive`, `link`), cơ chế lún vật lý 1px (`active:translate-y-px`), viền kép bắt sáng (rim & top catchlight), tích hợp `loading` (spinner + aria-busy), và micro-interaction icon motions (`arrow`, `download`, `trash`, `mail`).
- **Màu có chủ đích:** `IconTile` tô nhạt (tone `primary/success/warning/error/info`) cho số liệu và lối tắt; `Badge` trạng thái và phân loại dùng nền pastel viền mảnh (`rounded-lg`, hỗ trợ `success/warning/info/live` và dải màu phân loại `orange/teal/blue/cyan/purple/pink/rose/indigo`), luôn có icon hoặc nhãn chữ rõ nghĩa. **Chỉ một nút `variant="default"` (Primary) cho mỗi màn hình.**
- **Không:** màu hex viết tay trong component (ngoại lệ: swatch màu người dùng nhập, preview game/brand kit), `max-w-*` căn giữa làm hẹp trang Studio, gradient loè loẹt trên nền Studio.

---

## 4. Skin và brand kit

Thứ tự áp dụng (khớp [product/specs/builder.md](../product/specs/builder.md)):

```text
template default → skin ([data-skin]) → brand kit (brandKitVars) → override từng asset slot
```

| Skin | Không khí | Nền | Primary |
|---|---|---|---|
| `tet` | Tết / Lễ hội | đỏ lì xì (`#6f000b`) | vàng lá vàng (`#facf4e`), phụ hồng hoa đào |
| `day` | Quán sáng, booth, kiosk, H5 ngoài trời | sáng (`--ink-50`) | teal (`#0f7c79`) |
| `yep` | (di sản) Gala cuối năm | navy nửa đêm | champagne |
| `classic` | (di sản) Sân khấu Playora | stage tím đêm | vàng spotlight |

Thêm skin mới: thêm một khối `[data-skin="…"]` định nghĩa **đủ** các `--game-*` trong `packages/ui/src/styles.css`, thêm key vào `skins` trong `packages/ui/src/theme/game-theme.ts`, kiểm tra trên `/design-system` ở khung điện thoại.

Brand kit:

```tsx
<GameRoot skin="tet" brand={{ primary: '#e30613', background: '#ffffff', radius: 'soft' }}>
  …
</GameRoot>
```

`brandKitVars()` bỏ qua màu không hợp lệ (để skin hiện ra), tự tính `--game-primary-fg`/`--game-accent-fg` bằng `readableOn()`, và thay `text` nếu tương phản với nền `< 3:1`. Màu dẫn xuất (cạnh nút 3D) tính bằng `color-mix()` ngay tại component, nên chỉ cần đổi `--game-primary`.

---

## 5. Component

### Studio (`@playora/ui/components/*` + `@playora/ui/{providers,form,theme}`)

Sử dụng trực tiếp các component `shadcn/ui` (dựng trên `radix-ui` primitives + Tailwind v4) tại `packages/ui/src/components/*` theo [ADR-016](../adr/016-shadcn-luma-ui.md):

| Thành phần | Quy ước |
|---|---|
| `Button` | Bo góc `rounded-md` (`6px`) đồng bộ với `Input`/`Select`, `variant`: `default \| secondary \| outline \| ghost \| destructive \| link`, `size`: `default (h-8) \| sm (h-7) \| xs (h-6) \| lg (h-9) \| icon (size-8)` |
| `Badge` | Bo góc `rounded-md` (`6px`, viền mảnh `0.5px`, chữ `10px/14px font-normal`), `variant`: `default \| secondary \| outline \| destructive \| success \| warning \| info \| live` + pastel phân loại `orange \| teal \| blue \| sky \| cyan \| purple \| pink \| rose \| indigo` |
| `Card`, `Dialog`, `AlertDialog`, `DropdownMenuContent`, `SelectContent` | Khung chứa & menu nổi bo góc `rounded-lg` (`8px`), viền `0.5px` (`border-neutral-200 dark:border-white/10`), bóng nhẹ `shadow-xs` (`Dialog`/`DropdownMenu` dùng `shadow-lg`) |
| `Input`, `Textarea`, `SelectTrigger` | Bo góc `rounded-md` (`6px`), chiều cao control `h-8` (`32px`) đồng bộ tuyệt đối với `Button`, viền focus `focus-visible:border-neutral-400 dark:focus-visible:border-white/30`, báo lỗi qua `aria-invalid` |
| `Checkbox` | Bo góc `rounded-[4px]` (`size-3.5`), viền `#D4D4D4` / `dark:border-white/[0.22]`, khi chọn đổi sang `#171717` / `dark:#FAFAFA` |
| `TabsTrigger`, `SelectItem`, `DropdownMenuItem` | Bo góc `rounded-md` (`6px`), chữ `14px` (`text-sm`) |
| `Form` | Kết hợp `react-hook-form` + `@hookform/resolvers/zod` + contract schema từ `@playora/contracts` |
| Toast / Thông báo | `toast.success()` / `toast.error()` từ `sonner` (`@playora/ui/components/sonner`) |
| `Logo`, `LogoMark` | Nút play dưới chấm spotlight; wordmark viết thường bằng font `Unbounded`. Ẩn khi white-label (`ORG-04`) |

**Component dùng chung của Studio** (`apps/studio/src/components`):

| Cần | Dùng |
|---|---|
| Khung ứng dụng (Sidebar + Header + RBAC) | `AppShell` |
| Tiêu đề trang, mô tả, nút quay lại, hành động | `PageHeader` |
| Số liệu kết quả tổng quan | `MetricGrid` / `MetricCard` (`tone`, `icon`, `subtext`, `tooltip`, `highlighted`) + `IconTile` |
| Bảng có thanh công cụ tìm kiếm/lọc | `TableCard` (`toolbar`, `header`) + `Table` |
| Tiến độ bắt đầu & Checklist mở bán | `Checklist` |
| Biểu đồ kết quả theo ngày | `DailyOutcomeChart` |
| Trạng thái chương trình | `PhaseTag` (`Badge` có icon/chấm động) |
| Query lỗi / Danh sách rỗng / Chữ phụ | `QueryError` (`Alert` + Thử lại) · `EmptyState` · `Caption` |

### Game (`@playora/ui/game/*` & `@playora/ui/campaign`)

| Component | Dùng ở | Ghi chú |
|---|---|---|
| `GameRoot` | Player, Kiosk, Builder Preview | Bọc `PlayProvider` + gắn skin & brand kit (`resolveGameTheme`), nền `game-backdrop` |
| `GameButton` | Player | `primary \| accent \| surface`; `md \| lg \| tap` (cảm giác nút 3D qua token/styles, cao ≥ `56px`) |
| `GameResult` | Player | Màn kết quả chuẩn (`win \| lose \| empty`) |
| `Countdown` | Player | Đổi sang `--game-urgent` và nảy mỗi giây ở 5 giây cuối |
| `Leaderboard`, `TeamBar`, `JoinPanel` | Player / Kiosk / Showcase | Các khối hiển thị bảng vinh danh, thanh tiến độ phần quà và mã QR tham gia |
| `CampaignPlayer`, `CanvasScreen`, `Mechanism` (`@playora/ui/campaign`) | Play, Studio (Builder, Chơi thử) | Renderer chiến dịch 5 màn canvas ([ADR-014](../adr/014-free-canvas-screen-editor.md)): màu lấy từ brand/tài liệu canvas; không tự gọi API, kết quả đến từ `onPlay` |

---

## 6. Quy tắc khi code

- **Không hard-code màu.** Component Studio lấy màu từ semantic token (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `Badge variant="success"…`); bề mặt game và SVG tự vẽ dùng `--game-*` và `--team-*`.
- **Bề mặt game luôn nằm trong `GameRoot`.**
- **Mở rộng class tuỳ biến:** Khi thêm class theme mới (cỡ chữ, radius, font) trong `styles.css`, khai báo luôn trong `extendTailwindMerge` ở `packages/ui/src/lib/utils.ts` để `cn()` không xoá nhầm class.
- **Vùng chạm trên điện thoại:** Nút chính cho người chơi (`GameButton`) và nút xác nhận tại Quầy đổi quà cao ≥ `56px` (`h-14`), đặt ở nửa dưới màn hình.
- **Copywriting:** Động từ chủ động, rõ nghĩa (*"Phát hành chương trình"*, *"Chơi thử bản nháp"*, *"Xác nhận đã trao quà"*); thông báo lỗi chỉ rõ nguyên nhân và cách khắc phục, không dùng mã kỹ thuật.
- **Kiểm chứng trực quan:** Kiểm tra mọi thay đổi token và component trên trang sống `/design-system` (`apps/web`) ở cả hai chế độ **Light / Dark**, thử chuyển đổi các skin (`tet`, `day`) và bật Brand Kit mẫu.
