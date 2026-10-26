# 13 — Design system

> **v2.1:** không còn surface Screen/LED ([ADR-011](./adr/011-remove-live-engine.md)). Các mục `Stage`, `text-stage-*`, token `--stage-*` và skin `classic` (sân khấu) chỉ còn giá trị tham khảo; chore gỡ live sẽ dọn component không còn dùng. Surface chính là **Player** trên điện thoại (và Kiosk ở M3).

**Trạng thái:** v1.2 · 25/10/2026 (Studio theo admin games-vt, brand teal) · Code: `packages/ui` · Trang sống: `apps/web` → `/design-system` (noindex)

Playora có ba bề mặt với ba nhu cầu khác hẳn nhau, nên design system không phải một "theme" mà là **một bộ token chung và hai họ component**:

| Bề mặt | Người dùng | Nhu cầu | Họ component |
|---|---|---|---|
| **Studio** (`apps/studio`) | Chủ SME, nhân viên quầy (Đổi quà) | Desktop-first: dựng nhanh, ít lỗi, đọc trạng thái trong một cái liếc. Riêng màn Đổi quà phải dùng tốt trên điện thoại | `antd` trong `StudioProvider` (`@playora/ui/providers`) |
| **Player / Host / Kiosk** (`apps/play`) | Khách mời cầm điện thoại, MC | Bấm được bằng một ngón khi đang đứng, không cần đọc hướng dẫn | `@playora/ui/game/*` (dựng trên `antd` + `PlayProvider`) |
| **Screen** (LED, máy chiếu) | Cả hội trường, xem từ 25–30 m | Chữ to, tương phản cao, trình diễn | *(Đã gỡ ở v2.1 — ADR-011)* |

## 1. Tham chiếu và bài học

| Sản phẩm | Học gì | Không học gì |
|---|---|---|
| **Kahoot!** | Đáp án mã hoá bằng **màu + hình** (▲◆●■), cùng cặp trên màn lớn và điện thoại; nút to, chữ đậm | Bảng màu tím/xanh lá đặc trưng của họ |
| **Duolingo** | Nút "3D" có cạnh đáy, nhấn xuống thì lún: phản hồi xúc giác không cần animation phức tạp | Mascot, giọng điệu trẻ con (khách hàng là doanh nghiệp) |
| **Slido / Mentimeter** | Màn trình chiếu sạch, một thông tin chính mỗi lúc; mã tham gia số cho người ở xa | Giao diện quá trung tính, thiếu không khí sự kiện |
| **games-vt admin** (`../games-vt/fe-game-admin`) | **Nguồn chính cho Studio:** sidebar trắng có khối brand và menu chia nhóm, header có breadcrumb và người dùng, `PageHeader` có mô tả, hàng `MetricCard` có ô icon tô màu, `TableCard` có thanh công cụ, input dạng filled, tag trạng thái có icon | Màu xanh sky, tên/branding của sản phẩm đó |
| **Atlassian / antd design.md** | (v1.1, đã bỏ) chỉ chỉnh token và gỡ trang trí: giao diện đúng chuẩn nhưng nhạt, người dùng đánh giá "chán" | — |
| **Linear / Vercel (Geist)** | Studio yên tĩnh: neutral có chủ đích, màu thương hiệu chỉ cho hành động chính, mật độ vừa | Dark-first mặc định (người dùng Studio làm việc ban ngày) |
| **凡科互动 / Guandayun** | **1 cơ chế × N skin** theo mùa; skin là tầng token chứ không phải template mới | Trang trí dày đặc, nhiều hiệu ứng nhấp nháy |
| **Ant Design / Radix Colors** | Thang màu theo bậc, token ngữ nghĩa, OKLCH | — |

## 2. Nguyên tắc

1. **Studio yên tĩnh, sân khấu rực rỡ.** Studio nền trung tính; teal cho hành động chính, các tone nhạt chỉ trong ô icon và tag trạng thái. Sự rực rỡ dành cho bề mặt người chơi thấy.
2. **Đọc được từ cuối hội trường.** Trên Screen, chữ nội dung ≥ `text-stage-sm` (~32 px ở 1080p); điểm và đồng hồ dùng font display, `tabular-nums`.
3. **Màu không bao giờ là tín hiệu duy nhất.** Đội và đáp án luôn có hình hoặc nhãn kèm theo; trạng thái "live" có chấm nhấp nháy và chữ.
4. **Khách hàng đổi màu được, nhưng không phá được khả năng đọc.** Brand kit đi qua `brandKitVars()`, chữ tự chọn sáng/tối theo tương phản WCAG.
5. **Một khoảnh khắc chuyển động.** Chuyển động dành cho thay đổi có ý nghĩa: điểm nảy, 5 giây cuối, bảng xếp hạng hiện ra. Tôn trọng `prefers-reduced-motion`.

## 3. Token

Định nghĩa ở hai nơi đồng bộ (`packages/ui/src/theme/tokens.ts` cho `ThemeConfig` của Ant Design v6 và `packages/ui/src/styles.css` cho CSS custom properties + `@layer theme, base, antd, components, utilities;`), ba tầng:

```
Primitive  tokens.ts (teal, violet, ink, spotlight, stage, team, medal) + styles.css (--violet-*, --ink-*…)
   │
   ├─► Studio  getStudioTheme('light' | 'dark') → ThemeConfig antd (defaultAlgorithm / darkAlgorithm)
   │           bọc qua StudioProvider (StyleProvider layer + ConfigProvider + App)
   │
   └─► Game    resolveGameTheme({ skin, brand }) → ThemeConfig antd + biến CSS --game-*
               (--game-bg, --game-fg, --game-muted, --game-surface, --game-border,
                --game-primary(-fg), --game-accent(-fg), --game-urgent, --game-glow,
                --game-radius, --game-font; đổi theo [data-skin] và brandKitVars)
```

### 3.1 Màu

| Nhóm | Vai trò |
|---|---|
| `teal` (hue 192) | Màu thương hiệu. Studio: **chỉ** nút chính, link, focus ring, mục đang chọn. 600 (`#0f7c79`) trên nền sáng, 400 trên nền tối (chữ trên nút tối màu là ink-950) |
| `ink` | Neutral xám lạnh (hue 255, chroma ≤ 0.017), gánh gần hết giao diện Studio |
| `violet` (hue 293) | Legacy, chỉ còn cho skin `classic`. Không dùng ở Studio |
| `spotlight` (vàng ánh đèn) | Màu "ồn" duy nhất: nút chơi, điểm, top 1, mã tham gia |
| `stage` | Nền hội trường tối phía sau LED |
| `team-1…8` | Màu đội/đáp án, cách đều nhau trên vòng màu; chữ trên ô luôn là ink đậm |
| `success / warning / info / live / destructive` | Ngữ nghĩa ở Studio. `live` = "on air", chỉ dùng cho thứ đang diễn ra thật |

Tailwind: `bg-primary`, `text-muted-foreground`, `bg-success/12`, `bg-game-primary`, `text-game-muted`, `bg-team-3`, `bg-medal-gold`…

### 3.2 Chữ

| Vai trò | Font | Dùng cho |
|---|---|---|
| Display | **Unbounded** (`font-display`, `font-game`) | Wordmark, tên game, điểm, đồng hồ, nút game, tiêu đề lớn trên web |
| Text | **Be Vietnam Pro** (`font-sans`) | Mọi nội dung và UI. Do người Việt thiết kế, dấu chuẩn |

Cả hai nạp bằng `next/font/google` với subset `vietnamese` trong `layout.tsx` của mỗi app (biến `--font-sans`, `--font-display`).

- **Studio:** chỉ dùng Be Vietnam Pro, thang chữ mặc định của antd (14/22). Tiêu đề trang: `PageHeader` (`Title level={4}`, weight 700) + mô tả 13px; số liệu 26/700 trong `MetricCard`; tiêu đề khối `Title level={5}` hoặc `Card title`.
- **Screen:** thang `text-stage-sm | base | lg | xl | 2xl | hero` tính bằng `cqh` của `<Stage>`, nên tự co giãn theo màn LED bất kỳ.
- **Player:** `text-lg` trở lên cho mọi thứ người chơi cần bấm.

Không dùng chữ in hoa toàn bộ cho nhãn; không thêm "eyebrow" trên tiêu đề.

### 3.3 Hình khối, chuyển động

| Token | Giá trị | Ghi chú |
|---|---|---|
| `--radius` | 0.5rem | Studio: antd `borderRadius` 8 (nút, input, tag dùng mặc định antd); card 12 (`Card.borderRadiusLG`); ô icon 10 |
| `--game-radius` / `rounded-game` | 1.25rem | Mềm, "đồ chơi"; brand kit chọn `square / soft / round` |
| `--duration-fast/base/slow/stage` | 120 / 200 / 320 / 640 ms | |
| `ease-out`, `ease-in-out`, `ease-spring` | | `ease-spring` có một nhịp nảy, cho điểm và reveal |
| `animate-live-pulse`, `animate-score-pop`, `animate-rise-in` | | |

### 3.4 Luật Studio (theo games-vt)

**Thứ tự layer CSS:** mỗi app khai báo `@layer properties, theme, base, antd, components, utilities;` **trước** `@import "tailwindcss"` trong `globals.css`; nếu không, antd đứng cuối và đè utilities của Tailwind.

Cấu hình ở `packages/ui/src/theme/studio-theme.ts` + `StudioProvider` (`variant="filled"`): màu chính teal, success/warning/error `#10b981 / #f59e0b / #ef4444`, `borderRadius` 8, nút cao 36 weight 500, card bo 12 không shadow (viền `colorBorderSecondary`), neutral và thang chữ mặc định của antd, sidebar và header nền trắng.

- **Khung:** sidebar 250 px (thu gọn được; Drawer trên mobile) gồm khối brand cao 64, chọn tổ chức, menu chia nhóm có nhãn in hoa; header 64 gồm nút thu gọn, breadcrumb, nút sáng/tối, avatar + tên + email. Nội dung cách mép 24 px, dùng full chiều rộng.
- **Trang danh sách:** `PageHeader` (tiêu đề + mô tả + hành động chính) → `MetricGrid` nếu có số đếm có ý nghĩa → `TableCard` (thanh công cụ tìm kiếm/lọc + bảng sát mép).
- **Trang chi tiết:** `PageHeader` có nút quay lại và tag trạng thái → `Tabs` → các `Card` có `title`.
- **Cỡ control:** mọi phần tử form (`Input`, `InputNumber`, `Select`, `Segmented`, `Switch`, `ColorPicker`, `DatePicker`…) dùng cỡ mặc định (medium), kể cả trong panel hẹp. `size="small"` chỉ dành cho nút icon trong hàng dày (dòng bảng lớp, thanh thao tác của phần tử).
- **Màu có chủ đích:** ô icon tô nhạt (tone primary/success/warning/error/info qua token) cho số liệu và lối tắt; tag trạng thái luôn có icon. Một nút `type="primary"` cho mỗi màn hình.
- **Không:** màu hex viết tay trong component (ngoại lệ: swatch màu người dùng nhập, preview game/brand kit), `max-w-*` căn giữa cho trang Studio, gradient.

## 4. Skin và brand kit

Thứ tự áp dụng (khớp [12-builder-spec §5](./12-builder-spec.md#5-skin-theme-và-brand-kit)):

```
template default → skin ([data-skin]) → brand kit (brandKitVars) → override từng asset slot
```

| Skin | Không khí | Nền | Primary |
|---|---|---|---|
| `classic` | Sân khấu Playora | stage tím đêm, đèn spotlight từ trên | vàng spotlight |
| `yep` | Gala cuối năm | navy nửa đêm | champagne |
| `tet` | Tết | đỏ lì xì | vàng lá vàng, phụ hồng hoa đào |
| `day` | Booth, kiosk, H5 ngoài trời | sáng | teal |

Thêm skin mới: thêm một khối `[data-skin="…"]` định nghĩa **đủ** các `--game-*`, thêm key vào `skins` trong `lib/game-theme.ts`, kiểm tra trên `/design-system` (cả màn LED và điện thoại).

Brand kit:

```tsx
<GameRoot skin="tet" brand={{ primary: '#e30613', background: '#fff', radius: 'soft' }}>…</GameRoot>
```

`brandKitVars()` bỏ qua màu không hợp lệ (skin hiện ra), tự tính `--game-primary-fg`/`--game-accent-fg`, và thay `text` nếu tương phản với nền < 3:1. Màu dẫn xuất (cạnh nút 3D) tính bằng `color-mix()` ngay tại component, nên đổi `--game-primary` là đủ.

## 5. Component

### Studio (`antd` + `@playora/ui/{providers,form,theme}`)

Sử dụng trực tiếp component từ `antd` (`Button`, `Table`, `Form`, `Input`, `Select`, `Modal`, `Tabs`, `Collapse`, `Tag`, `Alert`, `Upload`, `ColorPicker`, `Popconfirm`…) bên trong `AntdRegistry` + `StudioProvider` ([ADR-013](./adr/013-antd-ui.md)):

| Thành phần | Quy ước |
|---|---|
| `Form` | Kết hợp `useZodForm(<contract schema>)` + `zodRule` + `applyApiError(form, err, messageFor)` từ `@playora/ui/form` |
| Toast / Confirm | `const { message, notification, modal } = App.useApp()` (không gọi static `message.*`) |
| `Tag` / `Badge` | Trạng thái sự kiện (`event-status-badge.tsx`): draft → default · scheduled → processing/info · **live → error + chấm** · ended → default · archived → default |
| `Logo`, `LogoMark` | Nút play dưới chấm spotlight; wordmark viết thường. Ẩn khi white-label |

**Component dùng chung của Studio** (`apps/studio/src/components`, port từ games-vt `src/shared/components/common`):

| Cần | Dùng |
|---|---|
| Tiêu đề trang, mô tả, nút quay lại, hành động | `PageHeader` |
| Số liệu tổng quan | `MetricGrid` / `MetricCard` (`tone`, `icon`, `subtext`, `tooltip`) |
| Bảng có tìm kiếm/lọc | `TableCard` (`toolbar`, `header`) + `Table` |
| Trạng thái sự kiện | `EventStatusBadge` (Tag có icon) |
| Query lỗi | `QueryError` (`Alert` + Thử lại) |
| Chữ phụ 12 px | `Caption` |
| Danh sách rỗng | `Empty image={Empty.PRESENTED_IMAGE_SIMPLE}` |

### Game (`@playora/ui/game/*`)

| Component | Dùng ở | Ghi chú |
|---|---|---|
| `GameRoot` | Player, Kiosk | Bọc `PlayProvider` + gắn skin & brand kit (`resolveGameTheme`), nền `game-backdrop` |
| `GameButton` | Player | `primary \| accent \| surface`; `md \| lg \| tap` (cảm giác nút 3D qua token/styles, không hard-code màu) |
| `TeamBar` | Player | Thanh tiến độ đội, đội dẫn đầu phát sáng |
| `Leaderboard` | Kết quả trên Player | Top 3 huy chương; `highlightId` cho dòng của chính người chơi |
| `Countdown` | Player | Đổi sang `--game-urgent` và nảy mỗi giây ở 5 giây cuối |
| `JoinPanel` | Player / Kiosk lobby | QR (truyền vào), URL ngắn, mã tham gia |

Kích thước component game theo `font-size` của cha (đơn vị `em`). Trên `apps/play`, chỉ dùng các component antd nhẹ (`Button`, `Input`, `Form`, `Checkbox`, `Result`, `Modal`…), **không** dùng `DatePicker`, `Table`, `ColorPicker`.

## 6. Quy tắc khi code

- Không hard-code màu. Component lấy màu/radius/font từ `ThemeConfig` của antd (`@playora/ui/theme`); phần template tự vẽ (SVG/canvas) dùng `--game-*` và `--team-*`. Tailwind CSS chỉ dùng cho layout/spacing (`flex`, `grid`, `gap`, `p-*`).
- Bề mặt game luôn nằm trong `GameRoot`.
- Thêm class theme mới (cỡ chữ, radius, font) thì khai báo luôn trong `extendTailwindMerge` ở `lib/utils.ts`, nếu không `cn()` sẽ âm thầm xoá class.
- Nút cho người chơi cao ≥ 56 px (`GameButton md` / `controlHeightLG: 56`); vùng chạm chính đặt ở nửa dưới màn hình.
- Copy: động từ rõ ("Tham gia", "Chơi thử", "Publish" → toast "Đã publish"); lỗi nói rõ chuyện gì xảy ra và cách sửa.
- Kiểm tra mọi thay đổi token ở `/design-system` với cả 4 skin và bật brand kit mẫu.
