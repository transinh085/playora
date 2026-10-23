# 12 — Đặc tả Game Builder (tính năng lõi)

Cập nhật: 23/10/2026 · Đầu vào: [11-game-builder-research.md](./11-game-builder-research.md) · Liên quan: [prd.md](./prd.md), [04-game-catalog.md](./04-game-catalog.md), [05-architecture.md](./05-architecture.md)

---

## 1. Mục tiêu và nguyên tắc

**Mục tiêu:** người tổ chức không cần kỹ thuật dựng được một game có thương hiệu, có giải thưởng, chống gian lận và đo lường được trong **≤ 30 phút**, chạy trên mọi bề mặt: điện thoại, màn hình LED, kiosk.

**Nguyên tắc (rút ra từ nghiên cứu):**

1. **Engine cố định + cấu hình** (giống 凡科/Guandayun, Drimify). Không có canvas tự do ở v1. Template là code; người dùng chỉ đổi cấu hình, asset và skin.
2. **Một flow chuẩn cho mọi game** (giống Drimify, Qualifio). Học một lần, dùng cho mọi template.
3. **Prize, Participation, Anti-cheat, Data là dịch vụ nền tảng**, không nằm trong template. Template mới tự động thừa hưởng toàn bộ.
4. **Kế thừa theo tầng** Org → Client (Brand) → Event → Game (giống Qualifio). Sửa brand kit một lần thì mọi game đổi theo.
5. **Live và async cùng một builder.** Game live chỉ là template có `kind: live` và thêm surface Screen/Host.
6. **Minh bạch thay vì "điều khiển kết quả".** Không có tính năng định trước người trúng trong cơ chế ngẫu nhiên.

---

## 2. Mô hình khái niệm

```
Organization ──► Client (Brand) ──► Event ──► Game (instance) ──► GameVersion (bất biến)
   │ brand kit mặc định │ brand kit, ngôn ngữ,   │ identity, form,   │ template@ver, config,
   │ gói, white-label   │ consent text,          │ kênh, anti-cheat, │ skin, prizes, rules
   │                    │ domain, tích hợp       │ lịch, playlist    │
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
| `surfaces` | `player` / `screen` / `host` / `kiosk` | `player`, `kiosk` |
| `capabilities` | Cờ khai báo để builder bật/tắt tính năng | `{ score: true, leaderboard: true, drawAfterScore: true, teams: false }` |
| `server` | Validator điểm (skill) hoặc room logic (live) | `validate()` |
| `editor` | Gợi ý nhóm field, widget, preset độ khó | preset Dễ/Vừa/Khó |
| `hotEditable` | Danh sách field được sửa khi đang live (không cần version mới) | `copy.*`, `sponsor.*` |

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

### 3.2 Live (sự kiện)

```
Player: [Join (QR)] → [Identity/Form] → [Lobby/Chờ] ⇄ [Round: game] → [Round result] → … → [Award]
Screen: [Idle: QR + sponsor loop] → [Lobby: số người, tên chạy] → [Countdown] → [Round view] → [Result/Top N] → [Draw]
Host:   [Playlist (run-of-show)] → điều khiển từng vòng → [Draw] → [Kết thúc]
```

### 3.3 Cấu hình mỗi màn

Mỗi màn có: nền (ảnh/màu/video ngắn), tiêu đề, nội dung rich text, nút (text + màu), **sponsor slot** (logo hoặc banner nhà tài trợ, học từ Crowdpurr), âm thanh. Màn Result có biến thể thắng/thua/hết quà/hết lượt, mỗi biến thể chỉnh text và ảnh riêng (học từ 凡科).

---

## 4. Editor UX

### 4.1 Bố cục

```
┌───────────────┬──────────────────────────────────┬──────────────────────────┐
│ FLOW           │        PREVIEW (live)             │ PROPERTIES               │
│ ▸ Cover        │  [📱 Mobile][🖥 Screen 16:9][🧍 Kiosk] │ Tabs:                    │
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

- **Widget dùng chung** (`packages/ui/auto-form`): `text`, `richtext`, `number`, `slider`, `segmented`, `color` (kèm brand palette), `asset` (picker + crop + gợi ý kích thước), `sound`, `list` (kéo thả sắp xếp), `datetime-range`, `localized` (vi/en), `prize-picker`.
- Template có thể khai báo **custom widget** cho các trường đặc biệt (vd. trình sửa ô vòng quay có màu và nhãn từng ô).

### 4.3 Khoá sau publish

- Publish tạo `game_version` bất biến.
- Trường `hotEditable` (copy, sponsor, mô tả) sửa được ngay khi đang live; mọi thay đổi được ghi audit.
- Trường ảnh hưởng tính công bằng (luật trợ lực, xác suất, điều kiện) phải **tạo version mới** và có cảnh báo: "Thay đổi không ảnh hưởng người chơi đã tham gia" (đúng yêu cầu NĐ 81 khi sửa chương trình). Học từ 易企秀 và Playable.

---

## 5. Skin, theme và brand kit

| Tầng | Nội dung | Ai tạo |
|---|---|---|
| **Brand kit** | Logo (sáng/tối), palette (primary, secondary, accent, nền, chữ), font tiêu đề/nội dung, bo góc, nhạc nền mặc định, watermark | Khách hàng (org/client) |
| **Skin** của template | Bộ asset theo chủ đề cho các asset slot, kèm cấu hình mặc định (màu, nhạc) | Playora (đội art), sau này là đối tác |
| **Theme pack** (theo dịp) | Gói nhiều skin cùng chủ đề cho mọi template: **Tết, YEP, Trung thu, Noel, Black Friday, 8/3, 20/10, khai trương** | Playora |
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

| Chế độ | Mô tả | Nguồn cảm hứng |
|---|---|---|
| `per_prize_probability` | Mỗi giải có xác suất (thang 1/10.000); tổng ≤ 100% | 人人秀, Easypromos |
| `overall_win_rate` | Một tỷ lệ trúng tổng; khi trúng thì chọn giải theo tỷ lệ tồn kho còn lại | 凡科/Guandayun |
| `scheduled_moments` | Mỗi đơn vị giải có thời điểm mở; người đầu tiên chơi sau thời điểm đó sẽ trúng | Qualifio, Easypromos |
| `guaranteed` | Ai chơi cũng trúng một giải (theo tồn kho) | Drimify "100% winner" |
| `score_threshold` | Skill game: đạt điểm ngưỡng thì được một lượt draw (kết hợp chế độ khác) | 易企秀 |
| `rank_based` | Phát theo thứ hạng leaderboard khi kết thúc; **organizer xác nhận** trước khi phát | 凡科, 易企秀 |
| `live_draw` | Lucky draw từ pool người chơi (commit–reveal) | Playora |

### 6.3 Phân phối theo thời gian (pacing)

| Chiến lược | Mô tả |
|---|---|
| `none` | Phát đến khi hết |
| `time_uniform` | Rải đều theo thời lượng; cho phép vượt `buffer` %; **tự làm mượt**: tính lại xác suất sau mỗi lần trúng, khung thiếu người chơi thì giải dồn sang khung sau (Drimify) |
| `traffic_based` | Xác suất điều chỉnh theo lưu lượng dự kiến (凡科 "按人流量") |
| `batch_release` | Mở kho theo đợt cố định (vd. 100 giải lúc 10:00, 100 lúc 14:00) (凡科 分批放奖, 易企秀 库存释放) |
| `opening_hours` | Chỉ phát trong khung giờ hoạt động (giờ mở cửa booth) (Easypromos) |
| `end_flush` | N phút cuối: chuyển sang `guaranteed` để xả kho (Drimify) |

### 6.4 Ràng buộc

- Tối đa giải/người (tổng, theo ngày, theo loại).
- Không trúng lặp cùng giải.
- Giới hạn theo nhóm (đội, phòng ban, cửa hàng).
- **Ngân sách tổng** theo `valueVnd`: chặn khi vượt.

### 6.5 Prize Simulator (khác biệt của Playora)

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
| Ẩn danh | `deviceId` (localStorage); Turnstile từ M3 | M1 |
| Guest list | Import Excel (mã NV, tên, phòng ban, đội); người chơi nhập mã hoặc quét QR cá nhân | M1 |
| **Mã tham gia** | Một người một mã / một lần một mã / mã dùng chung; import tối đa 50.000 mã/lần; sinh mã hàng loạt và in QR | M3 |
| Form bắt buộc | Field builder + consent | M1 |
| OTP SĐT / email | ZNS ưu tiên, SMS dự phòng; chặn đầu số ảo và email dùng một lần | M3 |
| Zalo | Đăng nhập Zalo / Zalo Mini App (lấy SĐT đã xác thực) | M4 |
| **Requirements** trước khi chơi | Nhập mã (nắp chai, hoá đơn), **chụp hoá đơn** (duyệt tay hoặc OCR Later), xem video, trả lời câu hỏi | M3 (mã), M4 (hoá đơn, video) |
| Vị trí | GPS (điểm + bán kính); cảnh báo vì GPS có thể bị giả | M4 |
| Thời gian | Khung giờ hoạt động, lịch theo ngày | M1 |
| Trần người chơi | Theo gói và theo cấu hình | M1 |
| Lượt chơi | Theo ngày/tổng; thêm lượt khi chia sẻ (giới hạn), khi nhập mã, khi làm nhiệm vụ | M3 |
| Đội | Gán theo guest list, người chơi tự chọn, hoặc chia ngẫu nhiên cân bằng | M1 |

---

## 8. Chống gian lận: preset theo mức

| Biện pháp | Thấp (YEP nội bộ) | Chuẩn (booth) | Cao (campaign online) |
|---|---|---|---|
| Server quyết định kết quả, token lượt chơi | ✅ | ✅ | ✅ |
| Rate limit IP/device/token | Lỏng (NAT hội trường) | ✅ | ✅ chặt |
| Turnstile (captcha ẩn) | ❌ | ✅ | ✅ |
| OTP / Zalo bắt buộc | ❌ | Tuỳ | ✅ |
| Chặn VPN/proxy, email dùng một lần, đầu số ảo | ❌ | ❌ | ✅ |
| Plausibility điểm / cap input realtime | ✅ | ✅ | ✅ |
| Blacklist / whitelist | ✅ | ✅ | ✅ |
| Gắn cờ tự động + duyệt tay trước khi phát giải lớn | ❌ | Tuỳ | ✅ |
| Giới hạn tốc độ phát giải (giải/phút) | ❌ | ✅ | ✅ |

---

## 9. Kênh phân phối

| Kênh | Mô tả | Ưu tiên |
|---|---|---|
| Link + QR | `play.playora.vn/{slug}`; QR tải PNG/SVG/PDF in ấn | M1 |
| **Link theo kênh** | `?ch=booth-a`, `?ch=fb-ads`… thống kê theo kênh (凡科 渠道管理) | M3 |
| Poster chia sẻ | Sinh ảnh poster có QR cá nhân hoá | M4 |
| Embed | iframe / script vào website brand | M4 |
| Kiosk | Full-screen, auto-reset sau mỗi người (N giây), khoá điều hướng, chế độ offline (M4) | M3 (online), M4 (offline) |
| Màn hình lớn | `/s/{screenKey}`; nhiều màn trên một event | M1 |
| Zalo Mini App | Wrapper; dùng định danh Zalo | M4 |
| Custom domain | `game.brand.vn` (white-label) | M4 |

---

## 10. Builder cho sự kiện live

### 10.1 Run-of-show (playlist)

Organizer dựng **kịch bản chương trình** dạng danh sách vòng. Ví dụ:

```
1. Check-in wall (từ 18:00)
2. Quiz "Hiểu ABC" — 10 câu
3. Shake Race — theo phòng ban — 60 s
4. Lucky Draw — Giải Ba ×10 (pool: đã check-in, chưa trúng)
5. Chấm điểm tiết mục văn nghệ
6. Lucky Draw — Giải Nhì ×3 → Giải Nhất ×1
```

- Mỗi vòng có các tuỳ chọn: tự chuyển hoặc chờ MC, nhạc chờ, màn idle.
- Lucky draw lọc pool bằng điều kiện **AND/OR**: đã check-in, chưa trúng, top N vòng X, phòng ban, hạng vé (học từ EDC Tech).
- **Loại top N khỏi vòng sau** (học từ 趣现场).

### 10.2 Screen editor

- Layout theo tỷ lệ màn (16:9, 32:9, màn dọc, độ phân giải tuỳ ý cho LED).
- Vùng an toàn; nền (ảnh/video); vị trí QR; sponsor loop.
- Preview đúng tỷ lệ.

### 10.3 Host Console

- **Mobile-first** để MC cầm điện thoại điều khiển (học từ Hi现场 手机控台).
- Nút lớn: Bắt đầu / Tạm dừng / Tiếp / Kết thúc / Quay.
- Hiển thị số người online và cảnh báo.
- Duyệt tin nhắn cho check-in wall và bình luận.
- "Chế độ khẩn": đóng băng màn hình, hiện màn chờ thương hiệu.

### 10.4 Template live bổ sung từ nghiên cứu

| Template | Lý do |
|---|---|
| `performance-score` (chấm điểm tiết mục) | Nhu cầu phổ biến ở YEP; đơn giản; không ai ở VN làm tốt |
| `launch-ceremony` (nghi thức khởi động) | Khán giả cùng lắc/chạm để nạp đầy thanh năng lượng, rồi kích hoạt video khai trương; dùng cho ra mắt, khai trương, ký kết |
| `money-count` (đếm tiền lì xì) | Game "数钱" rất phổ biến ở TQ; hợp mùa Tết |
| `danmaku-wall` (bình luận chạy) | Rẻ, vui, phù hợp hội nghị |

---

## 11. Đổi quà (redemption)

- **Điểm đổi quà:** organizer tạo "điểm đổi" (quầy/cửa hàng) và **mã PIN nhân viên** cho từng điểm.
- **Staff mode** (trên web Studio, giao diện mobile): quét QR của người trúng → xem giải → xác nhận → `redeemed`. Chống đổi hai lần.
- **Tự đổi** (self-redeem): người chơi nhập PIN do nhân viên đưa (học từ 凡科 自助核销).
- **Đổi hàng loạt:** upload CSV mã đã đổi.
- **Báo cáo:** đã phát / đã đổi / chưa đổi / hết hạn, theo điểm đổi.

---

## 12. Vòng đời và vận hành

| Trạng thái | Hành động |
|---|---|
| Draft | Sửa tự do; chơi thử; bot |
| Published (scheduled) | Chỉ sửa `hotEditable`; muốn sửa khác thì tạo version mới |
| Live | Theo dõi realtime; tạm dừng khẩn cấp; điều chỉnh tồn kho (có audit) |
| Ended | Báo cáo, export, biên bản; đổi quà vẫn mở đến hạn |
| Archived | Chỉ đọc |
| Deleted | **Thùng rác 14 ngày** rồi xoá cứng (học từ 凡科) |

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

| Hạng mục builder | M1 "YEP Live" (assisted) | M2 Live Self-serve & Agency | M3 Booth & Activation | M4 Scale & Platform | Later |
|---|---|---|---|---|---|
| Template registry + **auto-form** + **preview thật** | ✅ Mobile/Screen | Polish | Kiosk preview | | |
| Brand kit | Org/Event | **Kế thừa Org → Client → Event** | | | |
| Skin / theme pack | 2 (YEP, Tết) | 8 | +Trung thu, Noel… | YEP 2027 (4 theme) | Marketplace |
| Publish → version bất biến + `hotEditable` | ✅ | | | | |
| **Run-of-show** + Screen layout | ✅ preset | Tuỳ chỉnh layout | | | |
| Flow chuẩn chỉnh từng màn + sponsor slot | Màn mặc định | ✅ | Màn async (requirements, result biến thể) | | |
| Autosave, undo/redo, **pre-flight**, nhân bản, thùng rác | | ✅ | | | |
| Gallery công khai + onboarding | | ✅ | | | |
| Prize: lucky draw minh bạch | ✅ | Biên bản PDF | | | |
| Prize: instant-win, pacing, scheduled, score_threshold, rank | | | ✅ | | |
| **Prize Simulator** | | | ✅ | | |
| Voucher pool, đổi quà staff mode, gift list | | | ✅ | e-gift, points | |
| Participation: guest list, form, đội, thời gian, trần | ✅ | | | | |
| Mã tham gia, OTP ZNS, requirements "nhập mã", link theo kênh | | | ✅ | | |
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
| `run_of_show` (event_id, items jsonb) | Playlist live |
| `org_templates` (org_id, source_game_version_id) | Lưu thành template riêng |
| `logic_webhooks` (org_id, url, secret, timeout_ms, fallback) | Logic webhook |

---

## 16. Tiêu chí nghiệm thu builder

**M1 (assisted):**

1. 1 PM agency đối tác dựng event YEP 4 game + brand kit + guest list trong ≤ 60 phút, ≤ 2 lần hỏi hỗ trợ.
2. Preview khớp 100% với bản publish (snapshot test trên 4 template M1).
3. Template mới chỉ cần khai báo `configSchema` + `assetSlots` là editor tự sinh form đầy đủ (không sửa code Studio).
4. Sửa brand kit ở org thì mọi game chưa ghi đè đổi theo ở bản nháp, sau đó publish lại.

**M2 (self-serve):**

5. 3/3 người dùng thử (agency PM, HR, marketer) tạo event live và áp brand kit trong ≤ 30 phút, không cần hỗ trợ.
6. Pre-flight chặn publish khi thiếu asset bắt buộc, khi giải không có số lượng, hoặc khi chưa có consent.
7. ≥ 60% sự kiện thật trong M2 được khách tự dựng, không cần ticket hỗ trợ.
