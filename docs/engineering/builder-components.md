# Game Builder: thành phần, khả năng tuỳ biến và yêu cầu kỹ thuật

**Trạng thái:** Đề xuất · 26/10/2026 · Đầu vào: kiểm kê code nhánh `feat/studio-builder-redesign` (Builder Lab + canvas editor), [specs/builder](../product/specs/builder.md), [kế hoạch builder 25/10](../plans/2026-10-25-game-builder-plan.md), [specs/studio-ux](../product/specs/studio-ux.md), [ADR-014](../adr/014-free-canvas-screen-editor.md) · Liên quan: [specs/game-catalog](../product/specs/game-catalog.md), [design-system](./design-system.md)

> Tài liệu này **không thay** [specs/builder](../product/specs/builder.md) (đặc tả sản phẩm) hay [roadmap](../product/roadmap.md) (kế hoạch). Nó là bản đồ kỹ thuật: builder gồm những thành phần nào, mỗi thành phần đang làm được gì, người dùng tuỳ biến được tới đâu, và yêu cầu kỹ thuật để builder đạt mức "chuyên nghiệp, chỉn chu, dễ tuỳ biến". Mỗi yêu cầu có ID `GB-…` để đưa vào [prd.md](../product/prd.md) (§5.3).

---

## 0. Tóm tắt

1. **Builder hiện có 12 thành phần** (§2), phần lớn đã chạy trong Builder Lab với backend giả. Nền móng tốt: tài liệu màn dạng canvas, ô thay thế, luật dạng câu, mô phỏng giải, pre-flight sửa một chạm, quyết định giải chạy bằng `@playora/core/prize` thật.
2. **Vì sao chưa "pro":** (a) cơ chế game, thứ người chơi nhìn nhiều nhất, **gần như không tuỳ biến được**; (b) 9 mẫu (3 cơ chế × 3 skin) **dùng chung một bố cục**; (c) hệ thiết kế chỉ có 5 màu + 2 "font" logic; (d) editor thiếu thao tác cơ bản của công cụ thiết kế (chọn nhiều, copy/paste, group, phân bố đều); (e) **hai mô hình template song song** (`packages/game-sdk` + `packages/templates` vs Builder Lab) chưa hợp nhất.
3. **Đề xuất trục kiến trúc** (§4): mọi thứ người dùng chỉnh được đều là **dữ liệu có schema** ở 4 tầng — *Theme* (token) → *Template* (bố cục + cơ chế + ô thay thế) → *Mechanism config* (schema riêng từng cơ chế) → *Override* (canvas). Editor, Sửa nhanh, AI và pre-flight đều đọc/ghi cùng các schema đó.
4. **Ưu tiên làm trước** (§7): hợp nhất mô hình template → Mechanism config (vòng quay trước) → Theme token + font + brand kit → 3 bố cục/cơ chế + thư viện block → hoàn thiện editor.

---

## 1. Thuật ngữ

| Thuật ngữ | Nghĩa trong tài liệu này |
|---|---|
| **Campaign** | Một chương trình của chủ quán: 1 cơ chế, màn, giải, luật. Trong Lab là `Campaign` (`builder-lab/mock/types.ts`). |
| **Cơ chế (mechanism)** | Phần game có tương tác: vòng quay, thẻ cào, hộp quà… Vẽ trong khung `gameStage`, **không bao giờ tự quyết định kết quả**. |
| **Template** | Gói = cơ chế + bố cục màn mặc định + ô thay thế + cấu hình mặc định. |
| **Skin / Theme** | Bộ token thị giác (màu, font, bo góc, bóng, sticker, âm thanh) theo dịp. Hiện tại skin chỉ là 5 màu + 3 sticker. |
| **Brand kit** | Logo, màu, font của chính quán; ghi đè token của theme. |
| **Màn (screen)** | `cover`, `form`, `game`, `resultWin`, `resultLose`. Mỗi màn là một `ScreenDoc` (artboard 375 × 667–2000). |
| **Phần tử (element)** | Đối tượng trên canvas (13 loại, §2.4). |
| **Ô thay thế (slot)** | Nội dung template cho phép thay mà không phá bố cục (logo, ảnh SP, tiêu đề…). Nguồn của chế độ Sửa nhanh. |
| **Block** | *(đề xuất)* Nhóm phần tử thiết kế sẵn, chèn một lần (khối thể lệ, khối danh sách quà…). |

---

## 2. Kiểm kê thành phần hiện có

Ký hiệu: ✅ dùng được · ⚠️ có nhưng yếu/chưa đủ · ❌ chưa có · 🧪 chỉ trong Lab (backend giả).

### 2.1 Bản đồ tổng thể

```
┌──────────────────────── STUDIO (desktop-first) ────────────────────────────┐
│ ① Chợ mẫu ─► ② Editor shell (3 chế độ, autosave) ─► ⑨ Pre-flight ─► ⑩ Publish │
│                 ├─ ③ Sửa nhanh (slot, skin, màu brand)                      │
│                 ├─ ④ Tuỳ biến = canvas editor (13 loại phần tử, 5 màn)      │
│                 └─ ⑧ Luật & giải (cách phát → quà → luật câu → mô phỏng)    │
│                        │ đọc/ghi một bản nháp Campaign                       │
│ ⑤ CanvasScreen (renderer chung) ◄── ⑥ Cơ chế (wheel/scratch/giftbox)        │
│ ⑦ Template + skin (buildScreens)                                            │
└────────────────────────────────────────────────────────────────────────────┘
          │ publish (bất biến)                     │ quyết định giải
          ▼                                        ▼
⑪ Player (cover → form → game → kết quả → quà)   @playora/core/prize (decide/simulate)
⑫ Vận hành: quầy đổi quà, thống kê, tạm dừng
```

### 2.2 Bảng kiểm kê

| # | Thành phần | Vị trí code | Trạng thái | Người dùng tuỳ biến được gì | Khoảng trống chính |
|---|---|---|---|---|---|
| ① | Chợ mẫu (template gallery) | `builder-lab/components/home/template-gallery.tsx`, `mock/templates.ts` | 🧪 | Chọn cơ chế × skin, lọc theo dịp | 9 mẫu cùng **một** bố cục (`createDemoDoc`); `industries` gán chung cho mọi mẫu; không có thumbnail thật; không lọc theo ngành |
| ② | Editor shell | `builder-lab/components/builder-editor.tsx`, `editor/use-campaign-draft.ts` | 🧪 | Chuyển 3 chế độ, đổi tên, chơi thử | Autosave chỉ vào localStorage; chưa có phát hiện xung đột phiên bản |
| ③ | Sửa nhanh | `quick-edit/{quick-edit-panel,slot-card,slots}.tsx` | 🧪 | 5 slot cố định (`logo`, `productPhoto`, `title`, `promoText`, `cta`), đổi skin giữ nội dung đã sửa, 5 màu brand | `SlotKey` là enum cứng; thiếu slot nền, ảnh quà, sticker, màu chủ đạo; chưa có chạm-để-sửa trên preview |
| ④ | Canvas editor | `canvas-editor/components/{canvas-workspace,editor-canvas,properties-panel,side-panels}.tsx`, `lib/{editor-state,geometry}.ts` | ✅ (prototype) | Kéo, đổi cỡ, xoay, snap (ngưỡng 5 px) vào mép/tâm, bảng lớp kéo đổi thứ tự, khoá/ẩn, undo/redo 100 bước, zoom, menu chuột phải, phím tắt (⌘Z/⌘Y/⌘D, Delete, mũi tên) | Không chọn nhiều, không group, không copy/paste (kể cả giữa màn), không phân bố đều, không sao chép style, không đo khoảng cách, khoá 1 mức (`locked: boolean`), không neo dọc |
| ⑤ | Renderer màn `CanvasScreen` | `packages/ui/src/campaign/canvas-screen.tsx` (`@playora/ui/campaign`) | ✅ | Biến `{prize.name}`, `{player.name}`, `{event.name}`, `{turns.left}`; animation vào (5) + lặp (3); nhãn truyền vào qua `CanvasLabels` (namespace i18n `campaignPlayer`) | Dùng chung Studio + Play; chữ do người dùng soạn chưa đa ngôn ngữ |
| ⑥ | Cơ chế game | `packages/ui/src/campaign/{spin-wheel,scratch-card,gift-box}.tsx` (`Mechanism`) | 🧪 | **Chỉ gián tiếp qua 5 màu brand** và danh sách giải | Không có config riêng; trong khi `packages/templates/src/spin-wheel/definition.ts` đã có `segments[].color`, `spins`, `durationMs`, `centerLogo`, `backgroundImage` → **hai nguồn sự thật** |
| ⑦ | Template + skin | `builder-lab/mock/templates.ts` (`buildScreens`, `SKINS`) | 🧪 | — | Skin = 5 màu + 3 sticker + câu chữ; vá bố cục bằng **tên phần tử** (`patch(cover, 'Tiêu đề', …)`) nên giòn khi đổi tên; tự co chữ bằng công thức đoán `0.95em/glyph` |
| ⑧ | Luật & giải | `components/rules/*`, `rules-prizes-panel.tsx`, `lib/{rules-summary,rules-sim}.ts` | 🧪 (engine thật) | 3 mode (`per_prize_probability`, `overall_win_rate`, `guaranteed`), quà (tên, ảnh, SL, giá trị, xác suất), lượt/ngày, tối đa trúng/người, thời gian, giờ mở cửa, rải đều, ngân sách, bật/tắt form; mô phỏng | Form người chơi cố định (tên + SĐT); chưa có giải an ủi, loại giải (voucher pool…) |
| ⑨ | Pre-flight | `lib/preflight.ts` | ✅ | Sửa một chạm cho 11 mã lỗi (`noPrizes`, `zeroQuantity`, `probabilitySum`, `endInPast`, `endBeforeStart`, `lowStock`, `smallText`, `smallButton`, `offCanvas`, `lowContrast`, `emptyTitle`) | Chưa kiểm ảnh độ phân giải thấp, số phần tử > 60, chữ tràn khung, link sai định dạng, bố cục trên máy ngắn |
| ⑩ | Publish | `editor/publish-dialog.tsx` | 🧪 | Link chơi, link tập dượt, link quầy, QR, số liệu | Chưa có version bất biến thật / `hotEditable` trong Lab |
| ⑪ | Player | `CampaignPlayer` trong `@playora/ui/campaign` (thuần, không gọi API); `components/lab-player.tsx` là adapter mock + toolbar Lab | 🧪 | — | Play app chưa nối API (story riêng) |
| ⑫ | Vận hành | `redeem-desk.tsx`, `studio/campaign-ops.tsx`, `campaign-home.tsx` | 🧪 | Tạm dừng, đổi quà một lần | — |

Song song có **builder thế hệ cũ** `apps/studio/src/features/games/**` (AutoForm từ `configSchema`, iframe preview, skin panel) chạy trên API thật. Builder Lab là hướng đích (16 phase A).

### 2.3 Màn

| Màn | Phần tử bắt buộc | Biến thể cần có (specs/builder §3.1) | Hiện có |
|---|---|---|---|
| `cover` | — | — | ✅ |
| `form` | `form` (singleton) | — | ✅ (trường cố định) |
| `game` | `gameStage` (singleton) | — | ✅ |
| `resultWin` | — | thắng / giải an ủi | ✅ thắng |
| `resultLose` | — | thua / **hết quà** / **hết lượt** / **ngoài giờ** | ⚠️ một màn chung |
| `rules` (thể lệ) | — | — | ❌ (nút `rules` mở sheet cố định) |
| `myPrizes` (quà của tôi) | — | — | ❌ không chỉnh được giao diện |

### 2.4 Loại phần tử và thuộc tính chỉnh được

| Loại | Thuộc tính hiện có | Thiếu để "pro" |
|---|---|---|
| `text` | nội dung, font `heading/body`, cỡ, đậm 400/600/800, màu, căn lề, giãn dòng, giãn chữ, hiệu ứng (`soft`, `retro3d`, `glow`, `outline`), viết hoa | Chọn font thật, gradient chữ, tự giãn chiều cao, co-cho-vừa có cỡ tối thiểu, đa ngôn ngữ, rich text (đậm/màu một phần) |
| `image` | src (preset/upload/URL), fit, bo góc, bóng, viền | Cắt khung (crop), mặt nạ hình (tròn, sao, blob), xoá nền, lật, bộ lọc, khung ảnh trang trí |
| `button` | nhãn, hành động (`start`, `rules`, `link`, `zalo`, `phone`, `next`), kiểu (`game3d`, `flat`, `glow`, `gradient`), icon, nền, màu chữ, bo góc, cỡ chữ | Trạng thái nhấn/hover, animation "mời bấm" riêng, nút ghost/outline |
| `shape` | `rect`, `ellipse`, `pill`, `ribbon`, `card`; nền + gradient 2 điểm; viền; bóng | Gradient nhiều điểm/góc, pattern, blur nền (glass), SVG shape tuỳ ý |
| `badge` | chữ, kiểu, icon, màu, nhấp nháy | — |
| `marquee` | chữ, tốc độ, icon | **Đang chứa người trúng bịa** (`model.ts` → `createElement('marquee')`), cần nguồn dữ liệu thật |
| `divider` | kiểu (`solid`…`ornament`), hoa văn, độ dày | — |
| `countdown` | kiểu, tiêu đề, ngày/giây | Chọn mốc (kết thúc / bắt đầu / tuỳ chọn) |
| `prizeList` | lưới/danh sách, hiện số còn lại, nền thẻ | Chọn giải nào hiện, kiểu thẻ |
| `audio` | màu, nền, nhãn | Chọn nhạc (thư viện + upload), tự phát sau tương tác đầu |
| `social` | kênh (`zalo`, `phone`, `facebook`, `website`), nhãn, URL | Kiểm tra định dạng URL/SĐT |
| `gameStage` | vị trí, kích thước | **Toàn bộ config cơ chế** (§5.2) |
| `form` | màu | Trường form, nhãn, đồng ý điều khoản |

Thuộc tính chung (`BaseElement`): `x, y, w, h, rotation, opacity, locked, hidden, animation{enter, delayMs, loop}`, `slot?`.

---

## 3. Chẩn đoán: vì sao builder chưa chuyên nghiệp và khó tuỳ biến

| # | Nguyên nhân gốc | Bằng chứng | Hệ quả người dùng thấy |
|---|---|---|---|
| D1 | Cơ chế game là hộp đen | `GameStageElement` không có thuộc tính; `SpinWheel({ brand, prizes, play })` | Mọi vòng quay trông như nhau; không gắn được logo tâm, không đổi màu ô |
| D2 | Hai mô hình template | `packages/templates/spin-wheel` có `configSchema` đầy đủ; Lab mechanisms bỏ qua | Làm hai lần; AutoForm và AI không áp được vào Lab |
| D3 | Một bố cục cho mọi mẫu | `buildScreens()` vá `createDemoDoc()` | Chợ mẫu "nhìn như nhau", cảm giác ít lựa chọn |
| D4 | Hệ token mỏng | `BrandPalette` 5 màu; `font: 'heading' \| 'body'`; không token bo góc/bóng | Đổi skin chỉ đổi màu; không giữ được bản sắc thương hiệu |
| D5 | Vá bố cục theo tên phần tử | `patch(elements, 'Tiêu đề', …)` | Đổi tên lớp là mất liên kết; khó thêm template |
| D6 | Thiếu thao tác editor chuẩn | Không có multi-select/group/paste/distribute | Người quen Canva thấy "chưa xong" |
| D7 | Chữ không đo thật | Công thức `335 / (longest * 0.95)` | Tiêu đề tiếng Việt có dấu dễ tràn/bé bất thường |
| D8 | Bố cục không thích ứng máy dài/ngắn | Toạ độ tuyệt đối, chưa có `anchor` | CTA trôi khỏi đáy hoặc bị che trên máy 16:9 |
| D9 | Thiếu "độ bóng" khi chơi | Không có âm thanh, rung, hiệu ứng ăn mừng cấu hình được | Game "đúng" nhưng không "đã" |
| D10 | Dữ liệu giả trong mẫu | Marquee người trúng bịa | Rủi ro pháp lý khuyến mại, mất uy tín |

---

## 4. Kiến trúc đích: 4 tầng tuỳ biến

```
  Tầng            Ai chỉnh                   Ở đâu trong editor          Nguồn sự thật (zod, packages/contracts)
  ───────────────────────────────────────────────────────────────────────────────────────────────────────
  T1 Theme        Playora art · Brand kit    Sửa nhanh › Giao diện       ThemeTokens
  T2 Template     Playora (code + JSON)      Chợ mẫu · đổi bố cục        TemplateManifest (layouts, slots, blocks)
  T3 Mechanism    Chủ quán (form tự sinh)    Chọn gameStage / Sửa nhanh  MechanismConfig[template] (configSchema)
  T4 Override     Chủ quán nâng cao, agency  Tuỳ biến (canvas)           ScreenDoc (phần tử, tham chiếu token)
```

**Quy tắc phân giải giá trị** (giống specs/builder §5): `template default` → `theme` → `brand kit` → `override`. Phần tử luôn lưu **tham chiếu token** (`brand.primary`, `font.heading`, `radius.md`) khi có thể; chỉ lưu giá trị cứng khi người dùng chọn "Tuỳ chỉnh". Nhờ vậy đổi theme/brand kit thì cả campaign đổi theo mà không ghi đè chỉnh sửa riêng.

**Một schema, bốn người dùng:** form tự sinh (AutoForm), Sửa nhanh, AI (xuất JSON theo `toConfigJsonSchema`) và pre-flight đều đọc cùng schema của T1–T4. Không viết UI tay cho từng template.

---

## 5. Yêu cầu kỹ thuật theo thành phần

Mức ưu tiên: **P0** = trước pilot Tết (≤ 15/01/2027) · **P1** = M2 · **P2** = sau.

### 5.1 Mô hình dữ liệu

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| GB-D01 | `ScreenDoc`, `CanvasElement`, `ThemeTokens`, `MechanismConfig` chuyển thành **zod** trong `packages/contracts`; type TS suy ra từ zod (`model.ts` chỉ còn re-export) | P0 |
| GB-D02 | Mọi tài liệu có `schemaVersion`; có hàm `migrate(doc)` thuần + test cho từng bước nâng version | P0 |
| GB-D03 | `ColorValue` mở rộng: `brand.*` \| `theme.*` \| hex \| `{ gradient: { type: 'linear'\|'radial', angle, stops[] } }` | P1 |
| GB-D04 | `locked: 'none' \| 'position' \| 'all'` (khoá 2 mức, ADR-014) — template khoá vị trí ô, chỉ cho thay nội dung | P0 |
| GB-D05 | `anchor: 'top' \| 'center' \| 'bottom'` trên phần tử; renderer dịch phần tử theo chênh lệch chiều cao viewport | P0 |
| GB-D06 | `slot` là **chuỗi do template khai báo** (không còn enum `SlotKey` cố định), kèm `SlotDef { key, kind, label, constraints }` | P0 |
| GB-D07 | Phần tử có `role` ổn định (vd. `cover.title`) thay cho vá theo `name`; `name` chỉ để hiển thị | P0 |
| GB-D08 | Chữ dùng `LocalizedText { vi, en? }` | P1 |
| GB-D09 | `group` (phần tử con có toạ độ tương đối) để hỗ trợ group và block | P1 |
| GB-D10 | Giới hạn kích thước: ≤ 60 phần tử/màn, ≤ 2.000 px chiều cao, tài liệu JSON ≤ 256 KB (không nhúng data URL; ảnh là asset id) | P0 |

### 5.2 Cơ chế game có thể tuỳ biến (Mechanism config)

Mỗi cơ chế khai báo `configSchema` bằng `field.*` của `@playora/game-sdk` (đã có), gom theo nhóm `appearance` / `gameplay` / `feedback`. Editor sinh form trong panel khi chọn `gameStage`, và Sửa nhanh hiện các field có `quick: true`.

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| GB-M01 | **Hợp nhất**: cơ chế trong Lab nhận `config: MechanismConfig` từ `packages/templates/<id>/definition.ts`; bỏ tham số chỉ có `brand` | P0 |
| GB-M02 | Cơ chế là **renderer thuần**: chỉ vẽ trong `gameStage`, nhận `{ config, theme, prizes, play }`, không tự vẽ tiêu đề/CTA, không chứa chữ cứng vi/en | P0 |
| GB-M03 | Màu trong config mặc định là tham chiếu token (`theme.accent`) để đổi theme vẫn khớp | P0 |
| GB-M04 | Mỗi cơ chế có **2–4 preset phong cách** (`styles: Record<string, Partial<Config>>`), áp một chạm | P0 |
| GB-M05 | Hiệu ứng phản hồi chung (`feedback`): âm thanh (bật/tắt, bộ âm), rung (`navigator.vibrate`), ăn mừng khi trúng (`confetti` \| `envelopeRain` \| `coinBurst` \| `none`) | P1 |
| GB-M06 | Tôn trọng `prefers-reduced-motion` (đã có `useReducedMotion`) cho mọi hiệu ứng mới | P0 |
| GB-M07 | Không field nào ảnh hưởng xác suất/kết quả; ô vòng quay chỉ là hiển thị, kết quả vẫn từ server (`targetSliceIndex`) | P0 |

**Field đề xuất cho từng cơ chế:**

| Cơ chế | Appearance | Gameplay | Quick edit |
|---|---|---|---|
| Vòng quay | kiểu ô (`alternate` 2 màu \| `perPrize` \| `image`), màu ô, màu/kiểu chữ ô, viền (`plain` \| `gold` \| `led` nhấp nháy), kim chỉ (5 preset + upload), nút tâm (`logo` \| `text` \| `image`), bóng đổ, ảnh nền sau vòng | số vòng quay 3–10, thời lượng 3–8 s, đường cong giảm tốc (`ease` \| `bounce`), số ô "chúc may mắn" xen kẽ | logo tâm, màu ô, kiểu viền |
| Thẻ cào | ảnh/màu lớp phủ, hoa văn lớp phủ, chữ mời cào, kiểu thẻ (vé số, thẻ cào điện thoại, phong bao), ảnh dưới lớp phủ khi trúng/trượt | độ dày nét cào, % cào để tự mở (30–80%), có nút "mở hết" | ảnh lớp phủ, chữ mời cào |
| Hộp quà | số hộp (3/6/9), kiểu hộp (preset + upload ảnh đóng/mở), màu nắp/thân/nơ, cách xếp (hàng \| lưới \| vòng) | xáo hộp trước khi chọn (bật/tắt, tốc độ) | kiểu hộp, màu |

### 5.3 Theme và brand kit

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| GB-T01 | `ThemeTokens` gồm: `color` (primary, accent, background, surface, text, textMuted, success, danger), `font` (heading, body, display), `radius` (sm, md, lg, pill), `shadow` (soft, card, glow), `button` (kiểu mặc định), `stickers[]`, `sound` (bgm, sfx) | P0 |
| GB-T02 | Thư viện font **hỗ trợ đầy đủ tiếng Việt** (8–10 cặp, ví dụ Be Vietnam Pro, Lexend, Baloo 2, Bungee, Pacifico, Playfair Display), tải qua `next/font` hoặc self-host; chỉ tải subset `vietnamese` + `latin` của font đang dùng | P0 |
| GB-T03 | Brand kit ở cấp org: logo sáng/tối, màu, font; tạo campaign mới thì tự áp. Sửa brand kit thì bản nháp chưa ghi đè đổi theo (specs/builder §9 tiêu chí 4) | P1 |
| GB-T04 | Gợi ý palette từ logo (lượng tử hoá màu phía client, 5 màu, đảm bảo tương phản chữ/nền ≥ 4.5:1 cho `text` trên `background`) | P1 |
| GB-T05 | Bộ chọn màu luôn hiện swatch token trước, "Tuỳ chỉnh" sau; cảnh báo tương phản ngay khi chọn | P0 |
| GB-T06 | Theme pack theo dịp (Tết, khai trương, quanh năm, 8/3, 20/10, Trung thu, Noel, Black Friday): mỗi pack có token + sticker + nhạc + ảnh nền | P0 (3 pack) · P1 (8) |

### 5.4 Template, bố cục và block

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| GB-L01 | **Một thư mục = một template** (`packages/templates/src/<id>/`): `definition.ts` (schema, server), `mechanism.tsx`, `layouts/*.json` (ScreenDoc theo vai trò), `slots.ts`, `thumbnail.webp`. Registry tự sinh; lệnh `bun run gen:template` (specs/builder §2.1) | P0 |
| GB-L02 | Mỗi cơ chế có **≥ 3 bố cục** khác biệt rõ (vd. *Hero ảnh lớn*, *Poster chữ to*, *Thẻ nổi*). Chợ mẫu = bố cục × theme pack | P0 |
| GB-L03 | Đổi bố cục/theme **giữ nội dung slot** (mở rộng `switchSkin` hiện có sang `switchLayout`) | P0 |
| GB-L04 | Thư viện **block** (~8 block khởi đầu): Thể lệ ngắn, Danh sách quà, Đếm ngược + CTA, Thông tin quán + Zalo/gọi, Huy hiệu khuyến mãi, Footer nhà tài trợ, Người trúng gần đây (dữ liệu thật), Hướng dẫn 3 bước | P1 |
| GB-L05 | Block và bố cục chỉ dùng token, không màu cứng → tự khớp mọi theme | P0 |
| GB-L06 | Thumbnail chợ mẫu render tự động từ `CanvasScreen` (script build), không vẽ tay | P1 |
| GB-L07 | Mẫu được gắn `industries` và `occasions` riêng; chợ mẫu lọc theo ngành × dịp (kế hoạch builder §2.2 ý 4) | P1 |
| GB-L08 | Copy mặc định viết theo ngành (cà phê, spa, gym, bán lẻ), không chỉ "Cà phê Mộc" | P1 |

### 5.5 Canvas editor (chế độ Tuỳ biến)

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| GB-E01 | Chọn nhiều: Shift+click, kéo vùng chọn (marquee select), ⌘A; di chuyển/xoá/khoá nhiều phần tử cùng lúc | P0 |
| GB-E02 | Căn và phân bố đều cho nhiều phần tử (trái/giữa/phải/trên/giữa/dưới; phân bố ngang/dọc) | P0 |
| GB-E03 | Copy/cut/paste (⌘C/⌘X/⌘V) trong màn và **giữa các màn**; dán lệch 10 px; dán ảnh từ clipboard tạo phần tử ảnh | P0 |
| GB-E04 | Group/ungroup (⌘G / ⇧⌘G) theo GB-D09 | P1 |
| GB-E05 | Sao chép/dán style (⌥⌘C / ⌥⌘V) | P1 |
| GB-E06 | Đo khoảng cách khi giữ ⌥ (kiểu Figma); hiện khoảng cách bằng nhau khi kéo (smart spacing) | P1 |
| GB-E07 | Mũi tên = 1 px, Shift+mũi tên = 10 px; giữ Shift khi xoay = bước 15°; giữ Shift khi đổi cỡ = khoá tỉ lệ | P0 |
| GB-E08 | Chỉnh chữ trực tiếp trên canvas (double-click), không chỉ ở panel | P0 |
| GB-E09 | Overlay vùng an toàn + đường chia tỉ lệ 16:9 / 19.5:9 / 20:9; xem trước nhanh 3 kích thước máy | P0 |
| GB-E10 | Thanh lệnh ⌘K: thêm phần tử, nhảy màn, chạy lệnh | P2 |
| GB-E11 | Bảng lớp: đổi tên inline, thu gọn group, hiện slot/khoá bằng icon | P1 |
| GB-E12 | Undo/redo theo **lệnh** (không chỉ snapshot) để làm nền cho autosave diff và phát hiện xung đột | P1 |
| GB-E13 | Hiệu năng: kéo 60 phần tử vẫn ≥ 50 fps trên MacBook Air M1; không re-render toàn màn khi đổi một phần tử (memo theo id) | P0 |
| GB-E14 | Mọi thao tác chuột có phím tắt tương đương; bảng phím tắt mở bằng `?` | P1 |

### 5.6 Sửa nhanh

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| GB-Q01 | Danh sách slot sinh từ template (GB-D06); nhóm: Thương hiệu (logo, màu) · Nội dung (tiêu đề, khuyến mãi, CTA) · Hình ảnh (ảnh SP, nền, ảnh quà) · Game (field `quick` của cơ chế) | P0 |
| GB-Q02 | **Chạm-để-sửa trên preview**: bấm vào phần tử có slot → focus thẻ tương ứng/mở trình chọn ảnh | P0 |
| GB-Q03 | Thẻ slot hiện ràng buộc (tỉ lệ, kích thước tối thiểu, độ dài chữ tối đa) và cảnh báo khi vượt | P0 |
| GB-Q04 | Chạy tốt trên điện thoại (bottom sheet), vì đây là chế độ mặc định (specs/builder §4.2) | P1 |
| GB-Q05 | "Xem với nội dung dài nhất": thử tên quà/tiêu đề dài nhất để phát hiện tràn | P1 |

### 5.7 Ảnh và tài nguyên

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| GB-A01 | Upload qua API asset (không lưu data URL trong tài liệu); nén phía client về WebP, cạnh dài ≤ 1.600 px (ảnh nền) / 800 px (phần tử), giữ PNG/SVG có nền trong suốt | P0 |
| GB-A02 | Cắt ảnh theo tỉ lệ slot (crop + zoom) ngay khi upload | P0 |
| GB-A03 | Xoá nền ảnh sản phẩm (dịch vụ hoặc model tự host; **kiểm license**, kế hoạch builder §4.4) | P1 |
| GB-A04 | Thư viện sticker/ảnh theo theme pack (SVG/WebP, do Playora sở hữu bản quyền) | P0 |
| GB-A05 | SVG upload phải sanitize (bỏ script, `foreignObject`, event handler) trước khi lưu | P0 |
| GB-A06 | Không hotlink ảnh ngoài khi publish (ADR-014 §3); trường "URL ảnh" phải tải về thành asset | P0 |
| GB-A07 | Cảnh báo ảnh độ phân giải thấp khi hiển thị > 1.5× kích thước gốc (theo DPR 2) | P1 |

### 5.8 Chữ và font

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| GB-F01 | Chữ **tự giãn chiều cao** mặc định; tiêu đề có chế độ "co cho vừa" đo bằng DOM thật (thay công thức `0.95em/glyph`), có cỡ tối thiểu | P0 |
| GB-F02 | Kiểm tra hiển thị dấu tiếng Việt (không cắt dấu trên/dưới do `line-height` thấp): `lineHeight` tối thiểu 1.15 với font display | P0 |
| GB-F03 | Font tải trước khi đo/hiển thị (`document.fonts.ready`) để không nhảy bố cục | P0 |
| GB-F04 | Rich text tối giản: đậm, màu, xuống dòng trong một khối chữ | P2 |

### 5.9 Animation, âm thanh và cảm giác chơi

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| GB-X01 | Chuyển màn có hiệu ứng (fade/slide) cấu hình ở cấp campaign | P1 |
| GB-X02 | Nhạc nền + SFX theo theme; chỉ phát sau tương tác đầu; nút tắt tiếng luôn có | P1 |
| GB-X03 | Hiệu ứng ăn mừng khi trúng (GB-M05) chạy bằng CSS/canvas nhẹ, không thêm thư viện > 10 KB gzip nếu chưa nói lý do (AGENTS.md) | P1 |
| GB-X04 | Preview trong editor chạy đúng animation như Play (một renderer — ADR-014 §5) | P0 |

### 5.10 Pre-flight

Giữ cơ chế "cảnh báo + sửa một chạm" hiện có; bổ sung:

| ID | Mã lỗi mới | Mức | Sửa một chạm |
|---|---|---|---|
| GB-P01 | `tooManyElements` (> 60/màn) | warning | — |
| GB-P02 | `textOverflow` (chữ tràn khung với nội dung dài nhất) | warning | bật "co cho vừa" |
| GB-P03 | `lowResImage` | warning | — |
| GB-P04 | `invalidLink` (URL/SĐT/Zalo sai định dạng) | error | mở trường |
| GB-P05 | `ctaBelowFold` (nút bắt đầu nằm dưới màn hình 16:9) | warning | neo đáy |
| GB-P06 | `missingSlotContent` (slot bắt buộc còn mặc định, vd. logo mẫu) | warning | mở thẻ slot |
| GB-P07 | `fakeSocialProof` (marquee/huy hiệu chứa số ĐT/người trúng không lấy từ dữ liệu thật) | error | đổi sang nguồn dữ liệu thật |

### 5.11 Renderer và hiệu năng Play

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| GB-R01 | `CanvasScreen` + cơ chế chuyển sang `@playora/ui/game`, dùng chung cho Studio preview và Play | P0 |
| GB-R02 | Ngân sách Play trên 4G, máy Android tầm trung: JS ≤ 150 KB gzip cho màn đầu, LCP ≤ 2,5 s, tương tác cơ chế 60 fps | P0 |
| GB-R03 | Lazy-load ảnh các màn sau; preload ảnh màn `game` khi người chơi đang ở `cover`/`form` | P0 |
| GB-R04 | Snapshot test: render từng bố cục × theme ở 3 kích thước máy, so ảnh (Playwright) — đảm bảo "preview khớp 100% bản publish" (specs/builder §9) | P1 |

### 5.12 Truy cập, đa ngôn ngữ

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| GB-I01 | Mọi chữ giao diện editor qua next-intl, khoá có trong cả `vi.json` và `en.json` (AGENTS.md) | P0 |
| GB-I02 | Play: nút ≥ 44 px, tương phản ≥ 3:1 cho chữ lớn / 4.5:1 cho chữ thường, cơ chế điều khiển được bằng bàn phím và có `aria-label` | P0 |
| GB-I03 | Nội dung campaign đa ngôn ngữ (vi/en) theo GB-D08 | P1 |

### 5.13 An toàn, công bằng, pháp lý

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| GB-S01 | Không phần tử, config, AI hay block nào có đường gọi tới quyết định giải; cơ chế chỉ diễn kết quả server trả (AGENTS.md, specs/builder §1) | P0 |
| GB-S02 | **Bỏ dữ liệu người trúng bịa** khỏi mẫu (`marquee` mặc định); khối "Người trúng gần đây" chỉ đọc từ engine, che số, ẩn khi rỗng | P0 |
| GB-S03 | Link do người dùng nhập chỉ cho `https:`, `tel:`, `zalo.me`; render với `rel="noopener noreferrer"` | P0 |
| GB-S04 | Sau publish: chỉ field `hotEditable` (chữ, nhãn) được sửa, có audit; đổi config cơ chế/bố cục = version mới (specs/builder §4.3) | P0 |
| GB-S05 | Mọi truy vấn template/asset/brand kit theo `organizationId` (tenant isolation) | P0 |

### 5.14 Kiểm thử

| Lớp | Phạm vi |
|---|---|
| Unit (bun test) | `migrate`, phân giải token, `switchSkin`/`switchLayout` giữ slot, geometry (snap, phân bố, group), pre-flight từng mã lỗi, map kết quả → ô vòng quay |
| Component | AutoForm sinh đúng field cho từng `MechanismConfig`; cơ chế render với mọi preset phong cách |
| E2E (`tooling/e2e`) | Chọn mẫu → Sửa nhanh (logo, tiêu đề, logo tâm vòng quay) → publish → chơi trên viewport điện thoại → đổi quà; copy/paste giữa màn; đổi theme giữ nội dung |
| Visual | GB-R04 |

---

## 6. Ma trận tuỳ biến theo vai trò

| Có thể chỉnh | Chủ quán (Sửa nhanh) | Chủ quán / agency (Tuỳ biến) | Playora art team | Dev |
|---|---|---|---|---|
| Logo, ảnh SP, chữ chính, CTA | ✅ | ✅ | — | — |
| Màu/font thương hiệu | ✅ (brand kit, swatch) | ✅ | — | — |
| Đổi theme / bố cục | ✅ | ✅ | tạo mới | — |
| Field `quick` của cơ chế (logo tâm, màu ô, lớp phủ) | ✅ | ✅ | — | — |
| Toàn bộ config cơ chế | — | ✅ | preset phong cách | schema |
| Thêm/xoá/di chuyển phần tử, block | — | ✅ (trừ phần tử khoá `all`) | — | — |
| Bố cục mẫu, slot, khoá | — | — | ✅ (JSON) | — |
| Cơ chế mới | — | — | — | ✅ (`gen:template`) |
| Kết quả, xác suất trúng | chỉ qua Luật & giải (engine) | như trên | — | — |

---

## 7. Lộ trình đề xuất (khớp roadmap P0–P2)

| Bước | Nội dung | ID chính | Ước lượng (1 dev) |
|---|---|---|---|
| B1 | Hợp nhất mô hình template; cơ chế thuần nhận config; vòng quay có config đầy đủ + 3 preset phong cách | GB-M01…M04, GB-L01, GB-D06/D07 | 1,5 tuần |
| B2 | Theme token + thư viện font + swatch/tương phản; 3 theme pack | GB-T01, T02, T05, T06, GB-F01…F03 | 1 tuần |
| B3 | 3 bố cục/cơ chế, đổi bố cục giữ nội dung; bỏ marquee giả | GB-L02, L03, L05, GB-S02 | 1,5 tuần |
| B4 | Editor: chọn nhiều, căn/phân bố, copy/paste, sửa chữ trực tiếp, phím tắt chuẩn, vùng an toàn, neo dọc, khoá 2 mức | GB-E01…E03, E07…E09, GB-D04/D05 | 1,5 tuần |
| B5 | Sửa nhanh chạm-để-sửa; ảnh: crop, nén, asset API | GB-Q01…Q03, GB-A01, A02, A05, A06 | 1 tuần |
| B6 (M2) | Thẻ cào/hộp quà config đầy đủ, hiệu ứng ăn mừng + âm thanh, block, group, brand kit org, xoá nền | GB-M05, GB-X*, GB-L04, GB-E04, GB-T03/T04, GB-A03 | 3–4 tuần |

B1–B5 (~6,5 tuần) chạy **sau hoặc xen kẽ P0 vòng lõi chơi được** ([roadmap](../product/roadmap.md)) — không đẩy lùi gate pilot.

### Tiêu chí nghiệm thu

1. Với cùng một cơ chế, 3 bố cục × 3 theme cho ra 9 màn **khác nhau rõ** (đánh giá mù bởi 3 người ngoài: ≥ 7/9 được nhận ra là khác).
2. Chủ quán không biết thiết kế đổi logo, tiêu đề, logo tâm vòng quay, theme trong **≤ 3 phút** ở chế độ Sửa nhanh.
3. Thêm một cơ chế mới **không sửa code Studio**: chỉ thêm thư mục template; form config tự sinh.
4. Đổi theme/bố cục không làm mất nội dung slot đã sửa (unit + e2e).
5. 0 phần tử nào trên mẫu chứa dữ liệu người trúng không lấy từ engine.
6. `bun run ci` và e2e builder xanh; ảnh snapshot ổn định.

---

## 8. Câu hỏi cần chốt

1. **Nguồn sự thật cho template:** chuyển cơ chế Lab vào `packages/templates` ngay ở B1 (đề xuất), hay giữ trong Studio tới khi API P0 xong?
2. **Font:** self-host (ổn định, không phụ thuộc Google) hay `next/font/google`? Danh sách 8–10 cặp font cuối cùng.
3. **Art:** ai vẽ sticker/khung/ảnh nền cho 3 theme pack đầu (thuê ngoài, mua bộ có license, hay AI + chỉnh tay)?
4. **Âm thanh:** có đưa vào P0 không (tăng "độ đã" rõ rệt nhưng cần nguồn có license)?
5. **Block "Người trúng gần đây":** hiện tên hay chỉ số điện thoại che (cần đối chiếu đồng ý dữ liệu cá nhân — NĐ 13)?
