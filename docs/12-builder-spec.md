# 12 — Đặc tả Game Builder (tính năng lõi)

Cập nhật: 24/10/2026 (phân kỳ theo [00](./00-product-strategy.md) v2.1) · Đầu vào: [11-game-builder-research.md](./11-game-builder-research.md) · Liên quan: [prd.md](./prd.md), [04-game-catalog.md](./04-game-catalog.md), [05-architecture.md](./05-architecture.md)

---

## 1. Mục tiêu và nguyên tắc

**Mục tiêu:** người tổ chức không cần kỹ thuật dựng được một game có thương hiệu, có giải thưởng, chống gian lận và đo lường được trong **≤ 30 phút**, chạy trên cả hai bề mặt: điện thoại và kiosk.

> **v3.0 ([00](./00-product-strategy.md)):** người dùng chính là chủ SME, **Studio mobile-first**. Mục tiêu mới: publish từ template **≤ 5 phút trên điện thoại** (M2; M1 ≤ 10 phút), cấu hình nâng cao mở theo từng lớp. Các mục bên dưới đã được đánh dấu **[v3]** ở chỗ thay đổi; tầng Client/agency (§2, §5) lùi về M4. Đầu vào: [14 §4.2](./14-guandayun-teardown.md#42-builder-sửa-12-builder-specmd).

**Nguyên tắc (rút ra từ nghiên cứu):**

1. **Engine cố định + cấu hình** (giống 凡科/Guandayun, Drimify). Template là code: cơ chế game, luật và giải là cấu hình. **[ADR-014]** Bố cục mỗi màn là **canvas tự do** do người dùng soạn; cơ chế game nằm trong khung `gameStage`.
2. **Một flow chuẩn cho mọi game** (giống Drimify, Qualifio). Học một lần, dùng cho mọi template.
3. **Prize, Participation, Anti-cheat, Data là dịch vụ nền tảng**, không nằm trong template. Template mới tự động thừa hưởng toàn bộ.
4. **Kế thừa theo tầng** Org → Client (Brand) → Event → Game (giống Qualifio). Sửa brand kit một lần thì mọi game đổi theo.
5. **Một engine, hai bề mặt.** Cùng một game version chạy trên Player (điện thoại) và Kiosk (booth); không fork logic theo bề mặt. Không có game live/Screen/Host (bỏ ở v2.1).
6. **Minh bạch thay vì "điều khiển kết quả".** Không có tính năng định trước người trúng trong cơ chế ngẫu nhiên.

---

## 2. Mô hình khái niệm

```
Organization ──► Client (Brand) ──► Event ──► Game (instance) ──► GameVersion (bất biến)
   │ brand kit mặc định │ brand kit, ngôn ngữ,   │ identity, form,   │ template@ver, config,
   │ gói, white-label   │ consent text,          │ kênh, anti-cheat, │ skin, prizes, rules
   │                    │ domain, tích hợp       │ lịch              │
   └─ thuộc tính ở tầng dưới **ghi đè** tầng trên (null = kế thừa)
```

### 2.1 Cấu tạo một Template

| Thành phần | Mô tả | Ví dụ (`catch-items`) |
|---|---|---|
| `meta` | Tên, mô tả, thumbnail, tags (dịp lễ, ngành, mục đích), `kind` | `skill`, tags `['tet', 'fnb', 'booth']` |
| `configSchema` | zod; nguồn chân lý để validate và sinh form | thời lượng, tốc độ rơi, điểm từng vật phẩm, độ khó |
| `assetSlots` | Danh sách ô asset có ràng buộc (kích thước, tỷ lệ, định dạng, nền trong suốt) | `player`, `goodItem[1..5]`, `badItem[0..3]`, `background`, `bgm`, `sfxCatch` |
| `skins` | Bộ asset và cấu hình mặc định theo chủ đề | `classic`, `tet-li-xi`, `trung-thu`, `noel` |
| `screens` | Màn riêng của game (ngoài flow chuẩn); thường chỉ có `game` | `game` |
| `surfaces` | `player` / `kiosk` | `player`, `kiosk` |
| `capabilities` | Cờ khai báo để builder bật/tắt tính năng | `{ score: true, leaderboard: true, drawAfterScore: true, teams: false }` |
| `server` | Map kết quả → hiển thị (instant) hoặc validator điểm (skill) | `validate()` |
| `editor` | Gợi ý nhóm field, widget, preset độ khó | preset Dễ/Vừa/Khó |
| `hotEditable` | Danh sách field được sửa khi campaign đang chạy (không cần version mới) | `copy.*`, `sponsor.*` |

### 2.2 Engine và renderer [v3]

Template không còn là một game riêng lẻ mà là **renderer × skin trên một engine** dùng chung logic server:

| Engine | Logic server | Renderer (template) |
|---|---|---|
| **Instant-win** | Prize engine quyết định kết quả trước, client chỉ diễn hoạt cảnh | Vòng quay, cào thẻ, mở hộp/hộp mù (M1); đập trứng, lật thẻ bốc thăm, lưới 9 ô, gacha, lắc điện thoại (M2); mưa quà, thả đèn ước, gieo xúc xắc (sau) |
| **Skill + điểm** | Khung chung: thời gian, điểm, asset slot cộng/trừ; validator điểm phía server; thắng theo `score_threshold` hoặc `rank_based` | Hứng quà (M1); đếm tiền, chạm nhanh, đập logo, lật cặp, ghép hình (M2); match-3, né trái/phải, xếp tầng (sau) |
| **Giữ chân** | Trạng thái người chơi qua nhiều ngày: chuỗi điểm danh, số dư điểm, bộ thẻ đã sưu tầm | Điểm danh, bốc mỗi ngày (M2); hub điểm thưởng, sưu tầm thẻ không rủ bạn (M3) |

Thêm một renderer mới không được đụng vào prize engine. Đây là cách 凡科 có 1.709 template trên 111 engine ([14 §1](./14-guandayun-teardown.md#1-tóm-tắt)).

---

## 3. Flow chuẩn (Screen Flow)

### 3.1 Async (campaign, booth, kiosk)

```
[Cover] → [Requirements]* → [Identity/Form]* → [Rules]? → [Game] → [Result] → [Award detail] → [Leaderboard]?
                                                                  ├─ Thắng
                                                                  ├─ Không trúng (giải an ủi?)
                                                                  ├─ Hết quà
                                                                  └─ Hết lượt / Không đủ điều kiện
* tuỳ cấu hình event/game     ? tuỳ template
```

### 3.2 Bốc thăm cuối chương trình (M2)

```
Studio (organizer): [Chốt pool (lọc AND/OR)] → [Commit công bố] → [Quay từng tier] → [Void có lý do?] → [Kết thúc]
Trang công bố:      [Commit + poolHash] → [Người trúng theo spinNo] → [serverSeed sau khi kết thúc]
Player:             "Quà của tôi" hiện giải trúng
```

Không có Screen/Host; luồng live cũ bỏ ở v2.1.

### 3.3 Cấu hình mỗi màn

Mỗi màn có: nền (ảnh/màu/video ngắn), tiêu đề, nội dung rich text, nút (text + màu), **sponsor slot** (logo hoặc banner nhà tài trợ, học từ Crowdpurr), âm thanh. Màn Result có biến thể thắng/thua/hết quà/hết lượt, mỗi biến thể chỉnh text và ảnh riêng (học từ 凡科).

---

## 4. Editor UX

### 4.1 Bố cục

```
┌───────────────┬──────────────────────────────────┬──────────────────────────┐
│ FLOW           │        PREVIEW (thật)             │ PROPERTIES               │
│ ▸ Cover        │  [📱 Mobile][🧍 Kiosk]             │ Tabs:                    │
│ ▸ Form         │                                   │ • Nội dung               │
│ ▸ Game  ●      │      ┌─────────────┐              │ • Giao diện (skin, brand)│
│ ▸ Result       │      │  iframe      │              │ • Gameplay               │
│   ├ Thắng      │      │  player      │              │ • Giải thưởng            │
│   ├ Thua       │      │  runtime     │              │ • Luật & điều kiện       │
│   └ Hết quà    │      └─────────────┘              │ • Kênh & chia sẻ         │
│ ▸ Leaderboard  │  [▶ Chơi thử] [🤖 Bot ×200]         │ • Nâng cao               │
│ ─────────────  │                                   │                          │
│ Checklist ✓ 7/9│                                   │ [Lưu nháp] [Publish ▸]   │
└───────────────┴──────────────────────────────────┴──────────────────────────┘
```

- **Preview** là player runtime thật chạy trong iframe, nhận config nháp qua `postMessage`. Không có renderer riêng cho editor, nên preview luôn khớp 100%.
- **Chơi thử** dùng dữ liệu `env=rehearsal`. **Bot** gọi `tooling/bots` để giả lập N người chơi, giống "测试机器人" của 凡科.
- **Tự lưu nháp** mỗi 2 s khi có thay đổi; có undo/redo (lịch sử patch JSON).
- **Pre-flight checklist** trước khi publish: đủ asset bắt buộc, giải có số lượng, tổng xác suất hợp lệ, consent đã cấu hình, thời gian hợp lệ, cảnh báo pháp lý theo loại chương trình, đã chơi thử ≥ 1 lần.
- **[v3] Thứ tự trong tab Giải thưởng:** chọn **cách phát giải** (`mode`, §6.2) trước, sau đó chỉ hiện các trường mà mode đó cần (học từ 派奖方式 của 凡科). Tab "Luật & điều kiện" vẫn tách riêng.
- **[v3] Link nháp chơi thử:** chia sẻ QR/link nháp cho tối đa N người thật (mặc định 20) chơi thử trước khi publish, không tính quota, dữ liệu `env=rehearsal`.

### 4.1a Canvas editor [ADR-014]

Bố cục 3 cột ở §4.1 đổi thành: **cột trái** = danh sách màn (Flow) + bảng lớp của màn đang chọn (kéo đổi thứ tự); **giữa** = canvas artboard 375 (kéo, đổi kích thước, xoay, snap); **phải** = thuộc tính phần tử đang chọn (hoặc thuộc tính màn khi không chọn gì). Thanh công cụ trên canvas: thêm phần tử (chữ, ảnh, nút, hình, đếm ngược, danh sách giải), undo/redo, zoom, xem thử. Các tab cấu hình cũ (Gameplay, Giải thưởng, Luật, Nâng cao) vẫn giữ ở cột phải khi chọn màn Game hoặc mở mục cấu hình. Chi tiết dữ liệu và loại phần tử: [ADR-014](./adr/014-free-canvas-screen-editor.md).

### 4.1b Bố cục mobile [v3]

Bố cục 3 cột ở trên chỉ dùng cho màn hình rộng. Trên điện thoại (bản chính):

```
┌─────────────────────────┐
│ ← Tên game      [Publish]│
│                          │
│   PREVIEW toàn màn hình  │   chạm vào phần tử trong preview
│   (player runtime thật)  │   → mở đúng nhóm cấu hình
│                          │
│ ‹ Cover · Game · Kết quả ›│   vuốt để đổi màn
├─────────────────────────┤
│ [Ảnh] [Giải] [Luật] [Thêm]│   thanh tab dưới
└─────────────────────────┘
   ▲ bottom sheet: form của tab đang chọn (nửa màn / toàn màn)
```

- **Ảnh:** chụp hoặc chọn ảnh cho từng asset slot, **tự xoá nền**, cắt theo tỷ lệ của slot.
- **Giải:** chọn cách phát giải → danh sách giải → số lượng → giới hạn mỗi người.
- **Luật:** lượt chơi, khung giờ, form; mỗi luật hiện bằng một câu dễ hiểu ("Mỗi khách quay 1 lần/ngày").
- **Thêm:** brand kit, kênh/QR, nâng cao.
- **[ADR-014]** Canvas trên điện thoại: chạm chọn, kéo di chuyển, sửa chữ/ảnh/màu trong bottom sheet; đổi kích thước bằng thanh trượt.

### 4.2 Auto-form từ zod

Mỗi field trong `configSchema` gắn metadata UI:

```ts
const config = z.object({
  durationSec: z.number().int().min(15).max(180).default(30)
    .meta({ group: 'gameplay', widget: 'slider', label: { vi: 'Thời gian chơi (giây)' } }),
  difficulty: z.enum(['easy', 'normal', 'hard']).default('normal')
    .meta({ group: 'gameplay', widget: 'segmented', presets: difficultyPresets }),
  items: z.array(z.object({
    asset: assetSlot({ ratio: '1:1', minPx: 256, transparent: true }),
    points: z.number().int().min(-50).max(100),
    weight: z.number().min(0).max(100),
  })).min(1).max(8)
    .meta({ group: 'gameplay', widget: 'list', itemLabel: 'Vật phẩm' }),
  copy: z.object({ title: localizedText(), cta: localizedText() })
    .meta({ group: 'content', hotEditable: true }),
});
```

Sau [ADR-012](./adr/012-campaign-architecture.md) và [ADR-013](./adr/013-antd-ui.md), giải thưởng/tồn kho/pacing, lịch/lượt chơi/chống gian lận và màn Cover/Form/Kết quả thuộc về **nền tảng**, nên khu vực cấu hình của Builder chia làm 3 phần:

- **Panel nền tảng** (viết tay, UX riêng): chọn Skin & brand kit, Giải thưởng & gắn giải vào ô, Nội dung chung.
- **Panel template (`AutoForm` trên Ant Design `Form`):** tự động render các nhóm `gameplay` / `appearance` / `content` của `configSchema` (gom theo `group` bằng `Collapse`, validate qua `zodRule(configSchema)` của `@playora/ui/form`).
- **Lối thoát (escape hatch):** template có thể khai báo `editorWidgets?: Record<string, ComponentType<WidgetProps>>` (widget riêng theo tên) và `editorPanels?: Array<{ key, label, Component }>` (panel riêng) trong `surfaces.ts` (client) khi UX không phù hợp với form tự sinh. Template mới chỉ cần khai báo `configSchema` + `assetSlots` là có form đầy đủ; panel/widget riêng là tuỳ chọn.

**Widget dùng chung** (`@playora/ui/auto-form`):
- Hỗ trợ sẵn: `text` (`Input`), `number` (`InputNumber`), `slider` (`Slider` + `InputNumber`), `switch` (`Switch`), `segmented` (`Segmented`), `select` (`Select`), `color` (`ColorPicker` kèm brand palette), `asset` / `sound` (widget chọn tài nguyên do host truyền vào kèm gợi ý kích thước/tỷ lệ), `list` (`Form.List` thêm/xoá/đổi thứ tự tôn trọng `min`/`max`), `localized` (ô `vi`/`en` trong `Space.Compact`), `object` (`Form.Item` lồng theo `path`).
- Các widget đã chuyển về nền tảng hoặc ngừng hỗ trợ trong `AutoForm` (`richtext`, `datetime-range`, `prize-picker`) được đánh dấu `@deprecated` trong `game-sdk`; khi gặp widget không hỗ trợ mà không có trong `widgets` (từ `editorWidgets`), `AutoForm` hiển thị `Alert` cảnh báo "widget chưa hỗ trợ" thay vì ném lỗi.

### 4.3 Khoá sau publish

- Publish tạo `game_version` bất biến.
- Trường `hotEditable` (copy, sponsor, mô tả) sửa được ngay khi campaign đang chạy; mọi thay đổi được ghi audit.
- Trường ảnh hưởng tính công bằng (luật trợ lực, xác suất, điều kiện) phải **tạo version mới** và có cảnh báo: "Thay đổi không ảnh hưởng người chơi đã tham gia" (đúng yêu cầu NĐ 81 khi sửa chương trình). Học từ 易企秀 và Playable.

---

## 5. Skin, theme và brand kit

| Tầng | Nội dung | Ai tạo |
|---|---|---|
| **Brand kit** | Logo (sáng/tối), palette (primary, secondary, accent, nền, chữ), font tiêu đề/nội dung, bo góc, nhạc nền mặc định, watermark | Khách hàng (org/client) |
| **Skin** của template | Bộ asset theo chủ đề cho các asset slot, kèm cấu hình mặc định (màu, nhạc) | Playora (đội art), sau này là đối tác |
| **Theme pack** (theo dịp) | Gói nhiều skin cùng chủ đề cho mọi template: **Tết, Trung thu, Noel, Black Friday, 8/3, 20/10, khai trương, sinh nhật brand** | Playora |
| **Override** | Người dùng thay từng asset slot | Khách hàng |

- **Thứ tự áp dụng:** `template default` → `skin` → `brand kit tokens` (màu, font, logo được map vào slot có `brandable: true`) → `override`.
- Đây là cách nhân bản template như Trung Quốc (1 cơ chế × N skin = N "template" trên gallery) mà không phải viết code mới.

---

## 6. Prize engine

### 6.1 Loại giải

| Loại | Mô tả | Đổi quà |
|---|---|---|
| `physical` | Hiện vật | Quét QR tại quầy / nhập mã |
| `voucher_code` | Mã từ pool (import CSV, hoặc sinh tự động theo pattern) | Hiển thị mã, gửi ZNS/email |
| `e_gift` | Topup điện thoại, e-voucher qua đối tác (UrBox/ViHat…) (M4) | Tự động |
| `digital` | Link, file, nội dung số | Tự động |
| `points` | Điểm thưởng đồng bộ hệ thống khách qua webhook (M4) | Tự động |
| `consolation` | Giải an ủi, không giới hạn hoặc có giới hạn | Tuỳ |
| `no_prize` | Không trúng | — |

### 6.2 Chế độ quyết định kết quả

| Chế độ | Mô tả | Nguồn cảm hứng | Ưu tiên |
|---|---|---|---|
| `per_prize_probability` | Mỗi giải có xác suất (thang 1/10.000); tổng ≤ 100% | 人人秀, Easypromos | M1 |
| `overall_win_rate` | Một tỷ lệ trúng tổng; khi trúng thì chọn giải theo tỷ lệ tồn kho còn lại | 凡科/Guandayun | M1 |
| `scheduled_moments` | Mỗi đơn vị giải có thời điểm mở; người đầu tiên chơi sau thời điểm đó sẽ trúng | Qualifio, Easypromos | M2 |
| `guaranteed` | Ai chơi cũng trúng một giải (theo tồn kho) | Drimify "100% winner" | M1 |
| `score_threshold` | Skill game: đạt điểm ngưỡng thì được một lượt draw (kết hợp chế độ khác) | 易企秀 | M1 |
| `rank_based` | Phát theo thứ hạng leaderboard khi kết thúc; **organizer xác nhận** trước khi phát | 凡科, 易企秀 | M2 |
| `end_draw` | **Bốc thăm cuối chương trình** từ pool người chơi đã chốt; commit–reveal ràng buộc `poolHash` + `spinNo`; trang công bố kết quả (xem [04 §3.5](./04-game-catalog.md)) | Playora | M2 |

### 6.3 Phân phối theo thời gian (pacing)

| Chiến lược | Mô tả | Ưu tiên |
|---|---|---|
| `none` | Phát đến khi hết | M1 |
| `time_uniform` | Rải đều theo thời lượng; cho phép vượt `buffer` %; **tự làm mượt**: tính lại xác suất sau mỗi lần trúng, khung thiếu người chơi thì giải dồn sang khung sau (Drimify) | M1 |
| `traffic_based` | Xác suất điều chỉnh theo lưu lượng dự kiến (凡科 "按人流量") | M3 |
| `batch_release` | Mở kho theo đợt cố định (vd. 100 giải lúc 10:00, 100 lúc 14:00) (凡科 分批放奖, 易企秀 库存释放) | M2 |
| `opening_hours` | Chỉ phát trong khung giờ hoạt động (giờ mở cửa booth) (Easypromos) | M1 |
| `end_flush` | N phút cuối: chuyển sang `guaranteed` để xả kho (Drimify) | M2 |

### 6.4 Ràng buộc

Có từ M1 (cùng tồn kho, là phần của prize engine v1).

- Tối đa giải/người (tổng, theo ngày, theo loại).
- Không trúng lặp cùng giải.
- Giới hạn theo nhóm (đội, phòng ban, cửa hàng).
- **Ngân sách tổng** theo `valueVnd`: chặn khi vượt.

### 6.5 Prize Simulator (khác biệt của Playora, M2)

Trước khi publish, organizer nhập **lưu lượng dự kiến** (vd. 3.000 người/ngày × 2 ngày, giờ cao điểm 11–13h, 17–19h). Simulator chạy Monte Carlo 1.000 lần trên `packages/core/prize`, rồi vẽ:
- Đường giải còn lại theo thời gian.
- Xác suất hết sớm.
- Tỷ lệ trúng thực tế mà người chơi trải nghiệm.
- Tổng giá trị dự kiến phát.

Không đối thủ nào có tính năng này. Nó giải trực tiếp nỗi lo "giải hết trong 2 giờ đầu".

### 6.6 Không hỗ trợ (có chủ đích)

- **Định trước người trúng** trong chế độ ngẫu nhiên. Thay vào đó là **"Tặng quà theo danh sách"** (gift list): một tính năng riêng, hiển thị công khai là "quà tặng", không chạy hiệu ứng quay số.

---

## 7. Participation và danh tính

| Điều kiện | Mô tả | Ưu tiên |
|---|---|---|
| Ẩn danh | `deviceId` (localStorage); Turnstile (chống gian lận mức Chuẩn) | M1 |
| Guest list | Import Excel (mã NV, tên, phòng ban, đội); người chơi nhập mã hoặc quét QR cá nhân | M1 |
| **Mã tham gia** | Một người một mã / một lần một mã / mã dùng chung; import tối đa 50.000 mã/lần (凡科 giới hạn 5.000/lần, cần chốt lại); sinh mã hàng loạt và in QR. **[v3]** Mỗi mã có QR riêng (quét là tự điền mã); lượt chỉ bị trừ khi người chơi thực sự chơi | M3 |
| Form bắt buộc | Field builder + consent | M1 |
| OTP SĐT / email | ZNS ưu tiên, SMS dự phòng; chặn đầu số ảo và email dùng một lần | M2 |
| Zalo | Đăng nhập Zalo / Zalo Mini App (lấy SĐT đã xác thực) | M4 |
| **Requirements** trước khi chơi | Nhập mã (nắp chai, hoá đơn), **chụp hoá đơn** (duyệt tay hoặc OCR Later), xem video, trả lời câu hỏi | M3 (mã), M4 (hoá đơn, video) |
| Vị trí | GPS (điểm + bán kính); cảnh báo vì GPS có thể bị giả | M4 |
| Thời gian | Khung giờ hoạt động, lịch theo ngày | M1 |
| Trần người chơi | Theo gói và theo cấu hình | M1 |
| Lượt chơi | Theo ngày/tổng; thêm lượt khi chia sẻ (giới hạn), khi nhập mã, khi làm nhiệm vụ | M1 (theo ngày/tổng), M3 (thêm lượt) |
| Đội | Gán theo guest list, người chơi tự chọn, hoặc chia ngẫu nhiên cân bằng | M1 |

---

## 8. Chống gian lận: preset theo mức

| Biện pháp | Thấp (minigame nội bộ, guest list) | Chuẩn (campaign M1, booth) | Cao (campaign giá trị lớn, M2 có OTP) |
|---|---|---|---|
| Server quyết định kết quả, token lượt chơi | ✅ | ✅ | ✅ |
| Rate limit IP/device/token | Lỏng (NAT văn phòng) | ✅ | ✅ chặt |
| Turnstile (captcha ẩn) | ❌ | ✅ | ✅ |
| OTP / Zalo bắt buộc | ❌ | Tuỳ | ✅ |
| Chặn VPN/proxy, email dùng một lần, đầu số ảo | ❌ | ❌ | ✅ |
| Plausibility điểm (game skill) | ✅ | ✅ | ✅ |
| Blacklist / whitelist | ✅ | ✅ | ✅ |
| Gắn cờ tự động + duyệt tay trước khi phát giải lớn | ❌ | Tuỳ | ✅ |
| Giới hạn tốc độ phát giải (giải/phút) | ❌ | ✅ | ✅ |

---

## 9. Kênh phân phối

| Kênh | Mô tả | Ưu tiên |
|---|---|---|
| Link + QR | `play.playora.vn/{slug}`; QR tải PNG/SVG/PDF in ấn | M1 |
| **Link theo kênh** | `?ch=booth-a`, `?ch=fb-ads`… thống kê theo kênh (凡科 渠道管理) | M1 |
| Poster chia sẻ | Sinh ảnh poster có QR cá nhân hoá | M4 |
| Embed | iframe / script vào website brand | M4 |
| Kiosk | Full-screen, auto-reset sau mỗi người (N giây), khoá điều hướng, chế độ offline (M4) | M3 (online), M4 (offline) |
| Zalo Mini App | Wrapper; dùng định danh Zalo | M4 |
| Custom domain | `game.brand.vn` (white-label) | M4 |

---

## 10. Builder cho sự kiện live

Bỏ ở v2.1 (run-of-show, Screen editor, Host Console, template live; xem [00 §10](./00-product-strategy.md#10-thay-đổi-so-với-v10) và [ADR-011](./adr/011-remove-live-engine.md)).

---

## 11. Đổi quà (redemption)

M1 chỉ phát giải và hiển thị mã voucher ở "Quà của tôi"; đổi quà tại quầy bắt đầu từ M2.

> **[v3]** Đổi quà tại quầy (điểm đổi, staff mode) **lên M1**, vì kịch bản lõi của SME là QR tại quầy → quay → đổi quà. Bổ sung:
> - **Vai trò "chỉ đổi quà"** trong `packages/auth/src/permissions.ts`: không xem hay sửa được campaign.
> - **Đổi quà không hoàn tác**; muốn sửa đổi nhầm thì owner phải mở lại, có ghi audit và lý do.
> - **Cập nhật vận chuyển hàng loạt** (CSV mã vận đơn) cho giải gửi bưu điện (M2).

- **Điểm đổi quà (M2):** organizer tạo "điểm đổi" (quầy/cửa hàng) và **mã PIN nhân viên** cho từng điểm.
- **Staff mode (M2)** (trên web Studio, giao diện mobile): quét QR của người trúng → xem giải → xác nhận → `redeemed`. Chống đổi hai lần.
- **Tự đổi** (self-redeem, M3): người chơi nhập PIN do nhân viên đưa (học từ 凡科 自助核销).
- **Đổi hàng loạt (M2):** upload CSV mã đã đổi.
- **Báo cáo (M2):** đã phát / đã đổi / chưa đổi / hết hạn, theo điểm đổi.

---

## 12. Vòng đời và vận hành

| Trạng thái | Hành động |
|---|---|
| Draft | Sửa tự do; chơi thử; bot |
| Published (scheduled) | Chỉ sửa `hotEditable`; muốn sửa khác thì tạo version mới |
| Live | Theo dõi dashboard; tạm dừng khẩn cấp; điều chỉnh tồn kho (có audit) |
| Ended | Báo cáo, export, biên bản; đổi quà vẫn mở đến hạn |
| Archived | Chỉ đọc |
| Deleted | **Thùng rác 14 ngày** rồi xoá cứng (học từ 凡科) |

- **[v3] Tự publish khi đến giờ bắt đầu** (Published scheduled → Live tự động).
- **[v3] Kéo dài sau khi kết thúc:** đặt lại giờ kết thúc trên campaign Ended để quay lại Live, giữ nguyên dữ liệu (có audit).
- **[v3] Không cho xoá khi đang Live**; chỉ được Pause/End, rồi mới xoá.
- **[v3] Hiển thị chống gian lận:** danh sách campaign hiện số lượt đã kiểm / đã chặn; mỗi người chơi bị gắn cờ có lý do (§8).
- **Nhân bản** event hoặc game (giữ config, skin, giải; xoá dữ liệu người chơi).
- **Lưu thành template riêng** của org/agency (M4): tái sử dụng cho khách khác.

---

## 13. Mở rộng cho developer

| Mức | Tính năng | Ưu tiên |
|---|---|---|
| **Webhook sự kiện** | `player.registered`, `play.completed`, `prize.awarded`, `prize.redeemed` | M4 |
| **Logic webhook** (học từ 易企秀) | Trước mỗi lượt chơi/draw, gọi endpoint của khách (ký HMAC, timeout 800 ms, fallback cấu hình được). Endpoint trả: `allow` / `deny{reason,link}` / `no_prize` / `prize{id}` / `restrict{prizeIds}`. **Vẫn tuân theo tồn kho và giới hạn của nền tảng** | M4 (Enterprise) |
| **Public API** | CRUD event/game/prize, export, đổi quà | M4 |
| **External identity** | SSO/JWT từ app khách để định danh người chơi (prefill) | M4 |
| **Game SDK công khai** (chưa đối thủ nào có) | Đối tác viết template mới bằng `@playora/game-sdk`. Chạy trong **iframe sandbox** với bridge `postMessage` giới hạn (`session.start/submit`, `assets`, `brand`). Logic server chỉ được khai báo bằng **scoring rules** (không chạy code tuỳ ý trên server). Có review và ký trước khi lên marketplace | Later |
| **MCP / AI draft** | Tạo bản nháp từ prompt: "Vòng quay Tết cho chuỗi cà phê, 500 giải, 3 ngày" → chọn template, skin, giải, copy, consent | M4 |

---

## 14. Phân kỳ theo giai đoạn MVP

Giai đoạn theo [00-product-strategy §7](./00-product-strategy.md#7-lộ-trình-mvp-theo-giai-đoạn).

> **[v3] Bảng dưới đây vẫn theo lộ trình v2.1 và cần làm lại.** Các thay đổi đã chốt:
> - M1: Studio mobile-first (§4.1b), khung engine instant-win và skill (§2.2), chụp ảnh → asset, **đổi quà tại quầy + vai trò nhân viên** (từ M2), link nháp chơi thử.
> - M2: renderer mới (§2.2), điểm danh và bốc mỗi ngày, chợ template lọc theo ngành.
> - M3: hub điểm thưởng, sưu tầm thẻ, **Zalo** (từ M4).
> - M4: client workspace/white-label/reseller (từ M2), up hoá đơn để được lượt.

| Hạng mục builder | M1 "Tết Campaign" (assisted) | M2 Self-serve & Agency | M3 Booth & Activation | M4 Scale & Platform | Later |
|---|---|---|---|---|---|
| Template registry + **auto-form** + **preview thật** | ✅ Mobile | Polish | Kiosk preview | | |
| Brand kit | Org/Event | **Kế thừa Org → Client → Event** | | | |
| Skin / theme pack | Tết + Chung (mỗi minigame ≥ 2 skin) | 8 (8/3, 30/4, hè…) | +Trung thu, Noel… | Tết 2028 | Marketplace |
| Publish → version bất biến + `hotEditable` | ✅ | | | | |
| Flow chuẩn chỉnh từng màn + sponsor slot | Màn mặc định | ✅ | Màn async (requirements, result biến thể) | | |
| Autosave, undo/redo, **pre-flight**, nhân bản, thùng rác | Pre-flight tối thiểu (giải/thể lệ/consent) | ✅ | | | |
| Gallery công khai + onboarding | | ✅ | | | |
| Prize: **bốc thăm cuối chương trình** (commit–reveal, trang công bố) + biên bản PDF | | ✅ | | | |
| Prize v1: `per_prize_probability`, `overall_win_rate`, `guaranteed`, `score_threshold`, tồn kho, giới hạn, ngân sách | ✅ | | | | |
| Pacing: `time_uniform`, `opening_hours` | ✅ | | | | |
| Pacing: `batch_release`, `end_flush` | | ✅ | `traffic_based` | | |
| Prize: `scheduled_moments`, `rank_based` | | ✅ | | | |
| **Prize Simulator** | | ✅ | | | |
| Voucher pool | ✅ | | | e-gift, points | |
| Đổi quà | "Quà của tôi" + mã voucher | Staff mode, đổi hàng loạt | Tự đổi, gift list | | |
| Participation: guest list, form, đội, thời gian, trần, lượt chơi theo ngày/tổng | ✅ | | | | |
| Link theo kênh `?ch=` | ✅ | | Funnel theo kênh | | |
| OTP ZNS/SMS | | ✅ | | | |
| Mã tham gia, requirements "nhập mã", thêm lượt | | | ✅ | | |
| Zalo, GPS, hoá đơn/video | | | | ✅ | OCR |
| Anti-cheat preset | Thấp/Chuẩn | | Cao | | |
| Kiosk | | | Online | Offline | |
| Client workspace, white-label cơ bản | | ✅ | | Custom domain, reseller | |
| Lưu template riêng của org | | | | ✅ | |
| Webhook / Logic webhook / API / AI draft (MCP) | | | | ✅ | |
| **Game SDK công khai** + marketplace | | | | | ✅ |

---

## 15. Thay đổi dữ liệu so với [06-data-model.md](./06-data-model.md)

| Bảng / cột mới | Mục đích |
|---|---|
| `skins` (template_key, key, manifest jsonb, assets, season, is_public) | Skin và theme pack |
| `brand_kits.parent_id` + cột nullable | Kế thừa tầng Org → Client |
| `game_versions.locked_fields`, `games.hot_config` | Khoá sau publish / sửa nóng |
| `prizes.mode`, `prizes.schedule` (jsonb: pacing, batch, opening hours, moments), `prizes.consolation` | Prize engine mở rộng |
| `prize_moments` (prize_id, opens_at, award_id) | Chế độ `scheduled_moments` |
| `participation_codes` (event_id, code_hash, type, max_uses, used) | Mã tham gia (≤ 50.000/lần import) |
| `channels` (event_id, key, name) + `plays.channel_key` | Thống kê theo kênh |
| `redeem_points` (event_id, name, staff_pin_hash) + `awards.redeem_point_id` | Đổi quà theo điểm |
| `org_templates` (org_id, source_game_version_id) | Lưu thành template riêng |
| `logic_webhooks` (org_id, url, secret, timeout_ms, fallback) | Logic webhook |

---

## 16. Tiêu chí nghiệm thu builder

**M1 (assisted):**

1. 1 PM agency đối tác dựng campaign Tết (1 minigame + brand kit + giải + voucher pool + thể lệ + link theo kênh) trong ≤ 60 phút, ≤ 2 lần hỏi hỗ trợ.
2. Preview khớp 100% với bản publish (snapshot test trên 4 template M1).
3. Template mới chỉ cần khai báo `configSchema` + `assetSlots` là editor tự sinh form đầy đủ (không sửa code Studio).
4. Sửa brand kit ở org thì mọi game chưa ghi đè đổi theo ở bản nháp, sau đó publish lại.

**M2 (self-serve):**

5. 3/3 người dùng thử (agency PM, brand marketer, HR) tạo campaign có giải và áp brand kit trong ≤ 30 phút, không cần hỗ trợ.
6. Pre-flight chặn publish khi thiếu asset bắt buộc, khi giải không có số lượng, hoặc khi chưa có consent.
7. ≥ 60% sự kiện thật trong M2 được khách tự dựng, không cần ticket hỗ trợ.
