# 13 — Design system

> **v2.1:** không còn surface Screen/LED ([ADR-011](./adr/011-remove-live-engine.md)). Các mục `Stage`, `text-stage-*`, token `--stage-*` và skin `classic` (sân khấu) chỉ còn giá trị tham khảo; chore gỡ live sẽ dọn component không còn dùng. Surface chính là **Player** trên điện thoại (và Kiosk ở M3).

**Trạng thái:** v1 · 23/10/2026 · Code: `packages/ui` · Trang sống: `apps/web` → `/design-system` (noindex)

Playora có ba bề mặt với ba nhu cầu khác hẳn nhau, nên design system không phải một "theme" mà là **một bộ token chung và hai họ component**:

| Bề mặt | Người dùng | Nhu cầu | Họ component |
|---|---|---|---|
| **Studio** (`apps/studio`) | PM agency, HR, marketer | Dựng nhanh, ít lỗi, đọc trạng thái trong một cái liếc | `@playora/ui/components/*` (shadcn) |
| **Player / Host / Kiosk** (`apps/play`) | Khách mời cầm điện thoại, MC | Bấm được bằng một ngón khi đang đứng, không cần đọc hướng dẫn | `@playora/ui/game/*` |
| **Screen** (LED, máy chiếu) | Cả hội trường, xem từ 25–30 m | Chữ to, tương phản cao, trình diễn | `@playora/ui/game/*` trong `<Stage>` |

## 1. Tham chiếu và bài học

| Sản phẩm | Học gì | Không học gì |
|---|---|---|
| **Kahoot!** | Đáp án mã hoá bằng **màu + hình** (▲◆●■), cùng cặp trên màn lớn và điện thoại; nút to, chữ đậm | Bảng màu tím/xanh lá đặc trưng của họ |
| **Duolingo** | Nút "3D" có cạnh đáy, nhấn xuống thì lún: phản hồi xúc giác không cần animation phức tạp | Mascot, giọng điệu trẻ con (khách hàng là doanh nghiệp) |
| **Slido / Mentimeter** | Màn trình chiếu sạch, một thông tin chính mỗi lúc; mã tham gia số cho người ở xa | Giao diện quá trung tính, thiếu không khí sự kiện |
| **Linear / Vercel (Geist)** | Studio yên tĩnh: neutral có chủ đích, màu thương hiệu chỉ cho hành động chính, mật độ vừa | Dark-first mặc định (người dùng Studio làm việc ban ngày) |
| **凡科互动 / Guandayun** | **1 cơ chế × N skin** theo mùa; skin là tầng token chứ không phải template mới | Trang trí dày đặc, nhiều hiệu ứng nhấp nháy |
| **Radix Colors / shadcn** | Thang màu theo bậc, token ngữ nghĩa, OKLCH | — |

## 2. Nguyên tắc

1. **Studio yên tĩnh, sân khấu rực rỡ.** Studio gần như chỉ dùng neutral và violet. Sự rực rỡ dành cho bề mặt người chơi thấy.
2. **Đọc được từ cuối hội trường.** Trên Screen, chữ nội dung ≥ `text-stage-sm` (~32 px ở 1080p); điểm và đồng hồ dùng font display, `tabular-nums`.
3. **Màu không bao giờ là tín hiệu duy nhất.** Đội và đáp án luôn có hình hoặc nhãn kèm theo; trạng thái "live" có chấm nhấp nháy và chữ.
4. **Khách hàng đổi màu được, nhưng không phá được khả năng đọc.** Brand kit đi qua `brandKitVars()`, chữ tự chọn sáng/tối theo tương phản WCAG.
5. **Một khoảnh khắc chuyển động.** Chuyển động dành cho thay đổi có ý nghĩa: điểm nảy, 5 giây cuối, bảng xếp hạng hiện ra. Tôn trọng `prefers-reduced-motion`.

## 3. Token

Định nghĩa trong `packages/ui/src/styles.css`, ba tầng:

```
Primitive  --violet-*, --ink-*, --spotlight-*, --stage-*, --team-1…8, --medal-*   (không dùng trực tiếp)
   │
   ├─► Studio  --background, --primary, --muted-foreground, --success, --warning, --info, --live …
   │           (tên theo shadcn; light ở :root, dark ở .dark)
   │
   └─► Game    --game-bg, --game-fg, --game-muted, --game-surface, --game-border,
               --game-primary(-fg), --game-accent(-fg), --game-urgent, --game-glow,
               --game-radius, --game-font
               (đổi theo [data-skin], rồi brand kit ghi đè bằng inline style)
```

### 3.1 Màu

| Nhóm | Vai trò |
|---|---|
| `violet` (hue 293) | Màu thương hiệu. Studio: nút chính, focus ring, mục đang chọn |
| `ink` | Neutral ngả tím nhẹ (chroma 0.003–0.022) để xám "thuộc về" thương hiệu |
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

- **Studio:** chỉ dùng Be Vietnam Pro. Thang: 30/600 tiêu đề trang · 20/600 tiêu đề khối · 16 nội dung · 14 bảng/form · 12 chú thích.
- **Screen:** thang `text-stage-sm | base | lg | xl | 2xl | hero` tính bằng `cqh` của `<Stage>`, nên tự co giãn theo màn LED bất kỳ.
- **Player:** `text-lg` trở lên cho mọi thứ người chơi cần bấm.

Không dùng chữ in hoa toàn bộ cho nhãn; không thêm "eyebrow" trên tiêu đề.

### 3.3 Hình khối, chuyển động

| Token | Giá trị | Ghi chú |
|---|---|---|
| `--radius` | 0.625rem | Studio (shadcn `rounded-md/lg/xl`) |
| `--game-radius` / `rounded-game` | 1.25rem | Mềm, "đồ chơi"; brand kit chọn `square / soft / round` |
| `--duration-fast/base/slow/stage` | 120 / 200 / 320 / 640 ms | |
| `ease-out`, `ease-in-out`, `ease-spring` | | `ease-spring` có một nhịp nảy, cho điểm và reveal |
| `animate-live-pulse`, `animate-score-pop`, `animate-rise-in` | | |

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
| `day` | Booth, kiosk, H5 ngoài trời | sáng | violet |

Thêm skin mới: thêm một khối `[data-skin="…"]` định nghĩa **đủ** các `--game-*`, thêm key vào `skins` trong `lib/game-theme.ts`, kiểm tra trên `/design-system` (cả màn LED và điện thoại).

Brand kit:

```tsx
<GameRoot skin="tet" brand={{ primary: '#e30613', background: '#fff', radius: 'soft' }}>…</GameRoot>
```

`brandKitVars()` bỏ qua màu không hợp lệ (skin hiện ra), tự tính `--game-primary-fg`/`--game-accent-fg`, và thay `text` nếu tương phản với nền < 3:1. Màu dẫn xuất (cạnh nút 3D) tính bằng `color-mix()` ngay tại component, nên đổi `--game-primary` là đủ.

## 5. Component

### Studio (`@playora/ui/components/*`)

shadcn/ui new-york, thêm:

| Component | Bổ sung |
|---|---|
| `Badge` | variant `success`, `warning`, `info`, `live`; `<LiveDot />` |
| `Alert` | variant `warning`, `success` (pre-flight checklist, kết quả chơi thử) |
| `Logo`, `LogoMark` | Nút play dưới chấm spotlight; wordmark viết thường. Ẩn khi white-label |

Trạng thái event map trong `apps/studio/src/components/event-status-badge.tsx`: draft → outline · scheduled → info · **live → live + chấm** · ended → secondary · archived → ghost.

### Game (`@playora/ui/game/*`)

| Component | Dùng ở | Ghi chú |
|---|---|---|
| `GameRoot` | Player, Host, Kiosk | Gắn skin + brand kit, nền `game-backdrop` |
| `Stage` | Screen | Khung tỉ lệ cố định (mặc định 16:9), size container cho `text-stage-*`, vùng an toàn 5%. `fit="container"` cho preview trong builder |
| `GameButton` | Player, Host | `primary | accent | surface`; `md | lg | tap` (nút tròn 192 px cho game chạm/lắc) |
| `AnswerTile` | Quiz (cả hai màn) | Màu `team-1…4` + hình ▲◆●■; trạng thái `idle | selected | correct | wrong | muted` |
| `TeamBar` | Screen | Thanh tiến độ đội, đội dẫn đầu phát sáng |
| `Leaderboard` | Screen, kết quả trên Player | Top 3 huy chương; `highlightId` cho dòng của chính người chơi |
| `Countdown` | Screen, Player | Đổi sang `--game-urgent` và nảy mỗi giây ở 5 giây cuối |
| `JoinPanel` | Screen idle/lobby | QR (truyền vào), URL ngắn, mã tham gia số |

Kích thước component game theo `font-size` của cha (đơn vị `em`), nên cùng một `Leaderboard` dùng được trong `text-stage-lg` trên LED và `text-base` trên điện thoại.

## 6. Quy tắc khi code

- Không hard-code màu. Studio dùng token shadcn; bề mặt người chơi chỉ dùng `--game-*` và `--team-*`. Primitive (`--violet-500`…) chỉ dùng trong `styles.css`.
- Bề mặt game luôn nằm trong `GameRoot` hoặc `Stage`.
- Thêm class theme mới (cỡ chữ, radius, font) thì khai báo luôn trong `extendTailwindMerge` ở `lib/utils.ts`, nếu không `cn()` sẽ âm thầm xoá class.
- Nút cho người chơi cao ≥ 56 px (`GameButton md`); vùng chạm chính đặt ở nửa dưới màn hình.
- Copy: động từ rõ ("Tham gia", "Chơi thử", "Publish" → toast "Đã publish"); lỗi nói rõ chuyện gì xảy ra và cách sửa.
- Kiểm tra mọi thay đổi token ở `/design-system` với cả 4 skin và bật brand kit mẫu.
