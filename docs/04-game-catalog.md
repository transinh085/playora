# 04 — Danh mục game template

Cập nhật: 24/10/2026 · theo [00 v2.1](./00-product-strategy.md): chỉ làm minigame có thưởng (v2.1: bỏ game live/LED và quiz)

---

## 1. Phân loại

| Loại | `kind` | Ai quyết định kết quả | Ví dụ |
|---|---|---|---|
| **Instant-win** | `instant` | Server, *trước* khi client animate | Vòng quay, cào thẻ, mở hộp |
| **Skill (async)** | `skill` | Client chơi, server **xác thực** điểm, giải theo ngưỡng điểm hoặc hạng | Hứng quà, lật thẻ, puzzle |
| **Draw** | `draw` | Server chọn người trúng từ tập người chơi (bốc thăm cuối chương trình, M2) | Bốc thăm online, công bố kết quả |
| **Display** | `display` | Không có kết quả | Khung ảnh brand (M4) |

## 2. Danh mục và giai đoạn

Giai đoạn theo [00-product-strategy §7](./00-product-strategy.md#7-lộ-trình-mvp-theo-giai-đoạn): **M1** Tết Campaign (12/2026) · **M2** Self-serve & Agency (04/2027) · **M3** Booth & Activation (07/2027) · **M4** Scale (12/2027).

**Nguyên tắc chọn:**
1. Ưu tiên **minigame có thưởng** chạy được nhiều ngày trên điện thoại (lõi), cùng engine cho booth.
2. Cơ chế phải đáng giá ≥ 10 skin; ra skin theo mùa đều đặn quan trọng hơn ra cơ chế mới.
3. Không làm quiz/poll và game live/LED (v2.1).

### 2.1 Minigame có thưởng (Player + Kiosk) — lõi

| Template | Tên | Kind | GĐ | Độ khó | Ghi chú |
|---|---|---|---|---|---|
| `spin-wheel` | Vòng quay may mắn | instant | **M1** | S | 4–12 ô; custom widget sửa ô; ô gắn với giải hoặc "chúc may mắn" |
| `scratch-card` | Cào thẻ | instant | **M1** | S | Canvas cào, lộ ≥ 60% thì hiện kết quả |
| `gift-box` | Mở hộp quà | instant | **M1** | S | Biến thể skin: **đập trứng vàng, lì xì Tết, lưới 9 ô, hộp bí ẩn** (M1); máy xèng, gacha (M3) — cùng engine `instant` |
| `catch-items` | Hứng quà / hứng lộc | skill | **M1** | M | PixiJS; `score_threshold` → lượt draw |
| `memory-match` | Lật thẻ | skill | M2 | S | Logo/sản phẩm brand |
| `puzzle` | Ghép hình | skill | M2 | M | |
| `whack-a-mole` | Đập chuột / đập logo | skill | M2 | M | |
| `red-envelope` | Lì xì rơi | skill | M2 | M | Kịp Tết 2028 bằng skin |
| `collect-cards` | Sưu tầm thẻ (集福) | instant | M3 | M | Chiến dịch nhiều ngày |
| `photo-booth` | Khung ảnh brand | display | M4 | M | |

**Bỏ:** `live-quiz`, `quiz-async`, `live-poll` (v2.0); toàn bộ game live/LED (v2.1): `shake-race`, `tap-race`, `tug-of-war`, `launch-ceremony`, `checkin-wall`, `danmaku-wall`, `money-count`, `performance-score`, `bingo`, `charades`. Engine realtime lưu ở tag `archive/live-engine`.

**Độ khó:** S ≈ 3–5 ngày, M ≈ 1,5–2 tuần với 1 game dev (gồm editor schema, skin mặc định và test).

> **Skin thay vì template mới:** Trung Quốc có hàng trăm đến hàng nghìn "template" nhờ nhân **1 cơ chế × N skin theo mùa/ngành**. Playora làm tương tự qua skin và theme pack ([12-builder-spec §5](./12-builder-spec.md#5-skin-theme-và-brand-kit)). Gallery hiển thị theo tổ hợp cơ chế × skin. Mục tiêu: M1 có 4 minigame × (Tết + Chung + biến thể skin) ≈ 12 lựa chọn; M2 có 8 minigame × 8 theme; M4 trên 200 tổ hợp.

---

## 3. Đặc tả template M1

### 3.0 Luồng chung cho minigame `instant`

1. Player mở game → flow chuẩn: Cover (thể lệ) → Form/consent (nếu bật) → màn game.
2. Player bấm chơi → `POST /p/{slug}/plays` (kèm `deviceId`, Turnstile token theo preset). Server kiểm tra participation (lượt/ngày, tổng, khung giờ), chống gian lận, rồi gọi **prize engine** trong một transaction: chọn kết quả theo chế độ (`per_prize_probability` / `overall_win_rate` / `guaranteed`), áp pacing, giới hạn người/ngày, ngân sách; trừ tồn kho nguyên tử; cấp voucher từ pool nếu có.
3. Server trả `{ playId, outcome: { kind: 'win' | 'lose' | 'out_of_stock', prize?, voucherCode?, slotIndex? } }`. Client **chỉ animate** đến kết quả đã biết (ví dụ vòng quay dừng ở `slotIndex`), không tự quyết định.
4. Màn kết quả theo biến thể; "Quà của tôi" liệt kê giải và mã đã nhận.

**Không hỗ trợ:** định trước người trúng; client gửi kết quả.

### 3.1 `spin-wheel`

- **Cấu hình:** 4–12 ô (`label`, màu, ảnh, `prizeId` hoặc `none`); ô "chúc may mắn"; số vòng quay tối thiểu, thời lượng 3–8 s; âm thanh.
- **Map kết quả → ô:** server chọn giải trước, rồi chọn ngẫu nhiên một ô gắn với giải đó (hoặc ô `none` khi không trúng/hết quà). Nếu giải không có ô nào thì publish bị chặn (pre-flight).
- **Skin:** Tết (hoa mai, bao lì xì), Chung, theo màu brand kit.

### 3.2 `scratch-card`

- **Cấu hình:** ảnh lớp phủ, ảnh nền theo kết quả (trúng/không trúng), tỷ lệ lộ để hiện kết quả (mặc định 60%), chữ hướng dẫn.
- **Client:** canvas cào; kết quả đã được server quyết định và lượt đã được tính trước khi bắt đầu cào, nên xem trước bằng devtools không thay đổi được gì.

### 3.3 `gift-box`

- **Cấu hình:** số hộp hiển thị (1, 3, 9), hiệu ứng mở, ảnh hộp/trứng/bao lì xì theo skin.
- **Biến thể skin M1:** hộp quà, **đập trứng vàng**, **lì xì Tết**, lưới 9 ô. Kết quả do server quyết định trước khi người chơi chọn hộp; thể lệ ghi rõ điều này. Các hộp còn lại **không** lật ra "giải lẽ ra trúng" (tránh gây hiểu nhầm, nhất quán với nguyên tắc minh bạch).

### 3.4 `catch-items`

- **Cơ chế:** 20–60 s hứng vật phẩm rơi (PixiJS), tránh vật phẩm xấu; điểm theo vật phẩm.
- **Server:** cấp `playId` lúc bắt đầu; nhận `{ playId, score, durationMs, events digest }` lúc kết thúc; kiểm tra plausibility (điểm tối đa theo thời lượng và tốc độ rơi, thời lượng thực tế theo server). Đạt `score_threshold` thì được một lượt draw qua prize engine; có thể có leaderboard theo ngày.
- **Skin:** hứng lộc Tết (bao lì xì, vàng), hứng sản phẩm brand.

### 3.5 `lucky-draw`: Bốc thăm cuối chương trình (M2)

> v2.1: không còn Screen/Host. Organizer quay trong Studio; kết quả hiện trên trang công bố công khai và trong "Quà của tôi". **Cần sửa khi làm:** commit phải ràng buộc cả `poolHash` và `spinNo` (pool chốt trước khi commit), để organizer không thể đổi pool hay quay lại tới khi ra người mình muốn.

**Cấu hình (rút gọn):**

```ts
const luckyDrawConfig = z.object({
  pool: z.object({
    source: z.enum(['checked_in', 'guest_list', 'played_game']),
    gameId: z.string().optional(),            // khi source = played_game
    filters: z.array(z.object({ field: z.string(), op: z.enum(['eq', 'in']), value: z.any() })).default([]),
    excludePreviousWinners: z.boolean().default(true),
  }),
  tiers: z.array(z.object({
    prizeId: z.string(),
    label: z.string(),                        // "Giải Nhất"
    winnersPerSpin: z.number().int().min(1).max(50).default(1),
  })),
  effect: z.enum(['slot', 'name-shuffle', 'wheel']).default('slot'),
  display: z.object({ showField: z.enum(['name', 'code', 'phone_masked']).default('name') }),
  durationMs: z.number().int().min(2000).max(20000).default(6000),
});
```

**Luồng:**

1. Organizer chốt pool (snapshot ứng viên, sắp xếp theo `player_id`, tính `poolHash`), chọn tier trong Studio.
2. Server lấy snapshot tập ứng viên, sắp xếp theo `player_id` và tính `poolHash`.
3. Server sinh `serverSeed` (CSPRNG) và công bố `commit = sha256(serverSeed ‖ poolHash ‖ spinNo)` trước khi quay (trang công bố + log); `spinNo` tăng đơn điệu, lưu DB.
4. Server chọn người trúng: `index = HMAC_SHA256(serverSeed, poolHash + ":" + spinNo) mod N` (lặp cho nhiều người, loại trùng).
5. Server ghi `draw_spins` và `awards` trong 1 transaction; Studio chạy hiệu ứng `durationMs` rồi dừng ở người trúng; kết quả lên trang công bố và "Quà của tôi".
6. Sau sự kiện, biên bản công bố `serverSeed`; bất kỳ ai cũng kiểm chứng được.

**Edge cases:** pool rỗng; người trúng không liên lạc được (organizer "Quay lại" sẽ ghi `void` kèm lý do vào log, không xoá, `spinNo` tăng).

## 4. Template contract (tóm tắt)

Mỗi template là một package trong `packages/games/<key>` và export:

```ts
export default defineTemplate({
  key: 'spin-wheel',
  version: '1.0.0',
  kind: 'instant',
  meta: { name: { vi: 'Vòng quay may mắn', en: 'Spin the Wheel' }, thumbnail, tags: ['tet', 'campaign'] },
  configSchema,              // zod; nguồn chân lý cho validate server và sinh form editor
  defaultConfig,
  editor: { groups: [...] }, // gợi ý layout form và widget (color, asset, list…)
  surfaces: {
    player: () => import('./player'),   // React component, lazy
  },
  server: () => import('./server'),     // map kết quả → hiển thị (instant) hoặc validator điểm (skill)
});
```

Chi tiết interface ở [05-architecture.md §5](./05-architecture.md#5-game-runtime--template-system).

---

## 5. Quy trình làm template mới

1. **Spec 1 trang** gồm cơ chế, config, luồng server, chống gian lận, asset cần.
2. Scaffold: `bun run gen:template <key>`.
3. Viết `configSchema` và `defaultConfig`, rồi `player`, rồi `server`.
4. Test: unit cho logic server (`bun test`); Storybook-like playground (`apps/studio/dev/templates`); load test k6 cho play API.
5. QA trên thiết bị thật: iPhone SE/12, Android tầm thấp (Samsung A-series), Zalo in-app browser.
6. Review hiệu năng: bundle ≤ 300 KB gzip mỗi template (chưa tính asset); 60 fps.
7. Đăng ký vào registry, bật theo gói.
