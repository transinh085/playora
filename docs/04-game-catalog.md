# 04 — Danh mục game template

Cập nhật: 23/10/2026

---

## 1. Phân loại

| Loại | `kind` | Ai quyết định kết quả | Ví dụ |
|---|---|---|---|
| **Instant-win** | `instant` | Server, *trước* khi client animate | Vòng quay, cào thẻ, mở hộp |
| **Skill (async)** | `skill` | Client chơi, server **xác thực** điểm, giải theo ngưỡng điểm hoặc hạng | Hứng quà, lật thẻ, puzzle, quiz async |
| **Live (realtime)** | `live` | Server giữ state vòng; client gửi input; server tính điểm | Quiz live, shake race, kéo co, poll |
| **Live draw** | `draw` | Server chọn người trúng từ tập người chơi | Quay số LED, xổ số tên |
| **Display** | `display` | Không có kết quả | Check-in wall, tường lời chúc, slideshow |

## 2. Danh mục và giai đoạn

Giai đoạn theo [00-product-strategy §7](./00-product-strategy.md#7-lộ-trình-mvp-theo-giai-đoạn): **M1** YEP Live (12/2026) · **M2** Live Self-serve & Agency (04/2027) · **M3** Booth & Activation (07/2027) · **M4** Scale (12/2027).

**Nguyên tắc chọn:**
1. Ưu tiên game **nhiều người trên LED** (wedge).
2. Cơ chế phải đáng giá ≥ 10 skin.
3. Game instant-win (thị trường đã có nhiều) làm sau, khi đã có prize engine đầy đủ.

### 2.1 Game live (sân khấu: Screen + Host + Player)

| Template | Tên | Kind | GĐ | Độ khó | Vì sao |
|---|---|---|---|---|---|
| `checkin-wall` | Tường check-in | display | **M1** | S | Mở màn mọi sự kiện; nguồn pool cho lucky draw |
| `live-quiz` | Quiz trực tiếp (cá nhân/đội) | live | **M1** | M | Nhu cầu số 1 ở hội nghị và YEP |
| `shake-race` (+ fallback `tap`) | Lắc điện thoại đua (đội/phòng ban) | live | **M1** | M | **Game "wow" của wedge** (Hi现场 摇一摇/赛马) |
| `lucky-draw` | Quay số minh bạch | draw | **M1** | M | Bắt buộc phải có; khác biệt ở lọc pool + commit–reveal + biên bản |
| `performance-score` | Chấm điểm tiết mục văn nghệ | live | **M1 stretch → M2** | S | YEP nào cũng có văn nghệ; chưa ai ở VN làm tốt |
| `tug-of-war` | Kéo co theo đội | live | M2 | M | Team game mạnh (Hi现场 拔河) |
| `money-count` | Đếm tiền lì xì | live | M2 | S | Vuốt đếm tiền (数钱); skin Tết |
| `launch-ceremony` | Nghi thức khởi động | live | M2 | S | Cả hội trường nạp năng lượng để kích hoạt video; dùng cho ra mắt, khai trương, ký kết |
| `live-poll` (+ word cloud) | Bình chọn trực tiếp | live | M2 | S | Hội nghị |
| `danmaku-wall` | Bình luận chạy / tường tin nhắn | display | M2 | S | Rẻ, vui; chung moderation với check-in |
| `bingo` | Bingo sự kiện | live | M4 | M | Team building |
| `charades` | Đoán chữ (你演我猜) | live | Later | S | |

### 2.2 Game booth / async (Player + Kiosk)

| Template | Tên | Kind | GĐ | Độ khó | Ghi chú |
|---|---|---|---|---|---|
| `spin-wheel` | Vòng quay may mắn | instant | M3 | S | 4–12 ô; custom widget sửa ô |
| `scratch-card` | Cào thẻ | instant | M3 | S | |
| `gift-box` | Mở hộp quà | instant | M3 | S | Biến thể skin: **đập trứng vàng, lưới 9 ô, máy xèng, gacha, hộp bí ẩn** (cùng engine `instant`) |
| `catch-items` | Hứng quà | skill | M3 | M | PixiJS; score_threshold → draw |
| `memory-match` | Lật thẻ | skill | M3 | S | Logo/sản phẩm brand |
| `quiz-async` | Quiz tự chơi | skill | M3 | S | Tái dùng engine quiz |
| `red-envelope` | Lì xì rơi (Tết) | skill | M4 | M | Kịp Tết 2028 |
| `collect-cards` | Sưu tầm thẻ (集福) | instant | M4 | M | Chiến dịch nhiều ngày |
| `puzzle` | Ghép hình | skill | M4 | M | |
| `whack-a-mole` | Đập chuột / đập logo | skill | M4 | M | |
| `photo-booth` | Khung ảnh brand lên tường | display | M4 | M | |

**Độ khó:** S ≈ 3–5 ngày, M ≈ 1,5–2 tuần với 1 game dev (gồm editor schema, skin mặc định và test).

> **Skin thay vì template mới:** Trung Quốc có hàng trăm đến hàng nghìn "template" nhờ nhân **1 cơ chế × N skin theo mùa/ngành**. Playora làm tương tự qua skin và theme pack ([12-builder-spec §5](./12-builder-spec.md#5-skin-theme-và-brand-kit)). Gallery hiển thị theo tổ hợp cơ chế × skin. Mục tiêu: M1 có 4 cơ chế × 2 theme = 8 lựa chọn; M2 có 10 cơ chế × 8 theme; M4 trên 200 tổ hợp.

---

## 3. Đặc tả template M1

### 3.1 `lucky-draw`: Quay số trúng thưởng

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

1. Host chọn tier và bấm "Quay".
2. Server lấy snapshot tập ứng viên, sắp xếp theo `player_id` và tính `poolHash`.
3. Server sinh `serverSeed` (CSPRNG) và công bố `commit = sha256(serverSeed)` trước khi quay (hiện trên Host Console và log).
4. Server chọn người trúng: `index = HMAC_SHA256(serverSeed, poolHash + ":" + spinNo) mod N` (lặp cho nhiều người, loại trùng).
5. Server ghi `draw_spins` và `awards` trong 1 transaction, rồi broadcast `draw.result` đến Screen. Screen chạy hiệu ứng `durationMs` rồi dừng ở người trúng.
6. Sau sự kiện, biên bản công bố `serverSeed`; bất kỳ ai cũng kiểm chứng được.

**Edge cases:** pool rỗng; người trúng không có mặt (host bấm "Quay lại" sẽ ghi `void` kèm lý do vào log, không xoá); mất kết nối Screen giữa chừng (Screen reconnect sẽ nhận state `result`).

### 3.2 `live-quiz`

- **Cấu hình:** danh sách câu hỏi (`single`/`multi`/`true_false`/`poll`), ảnh/video, `timeLimitSec` (5–60), điểm cơ sở 1.000, công thức tốc độ `score = base × (1 − 0.5 × t / T)`, có hoặc không streak bonus, hiển thị leaderboard sau N câu.
- **Server:** gửi câu hỏi (không kèm đáp án) lúc `question.open`. Nhận `answer.submit` (chỉ lần đầu, phải trước deadline có tính bù trễ ≤ 300 ms). Lúc `question.close` mới công bố đáp án và điểm.
- **Thời gian:** dùng thời gian server. Client đồng bộ đồng hồ (NTP-lite qua ping) để đếm ngược chính xác.
- **Leaderboard:** Redis ZSET `lb:{roundId}`.

### 3.3 `shake-race`

- **Input:** `DeviceMotionEvent`, đếm "shake" khi |a| vượt ngưỡng có hysteresis. iOS cần xin quyền `DeviceMotionEvent.requestPermission()` qua một nút bấm. Nếu bị từ chối thì fallback sang **tap**.
- **Gửi lên:** client gom delta mỗi 250 ms: `{ d: number, seq }`. Server cap `d ≤ 8` mỗi 250 ms (tối đa ~32 shake/s) để chặn script.
- **Server:** cộng dồn trong bộ nhớ của room (node sở hữu room), flush Redis mỗi 1 s. Broadcast snapshot top-N cho Screen 10 Hz, tiến độ cá nhân và đội cho Player 2 Hz.
- **Kết thúc:** theo thời gian (30–90 s) hoặc khi người hoặc đội đầu tiên đạt đích.
- **Skin:** ngựa, thuyền rồng, xe đua, tên lửa, cá chép hoá rồng (Tết).

### 3.4 `checkin-wall`

- Player gửi tên hoặc lời chúc (≤ 80 ký tự) và avatar tuỳ chọn.
- Kiểm duyệt: lọc từ cấm tiếng Việt (có danh sách mặc định, org bổ sung được) và chế độ duyệt tay trên Host Console.
- Screen hiển thị theo layout (bay ngang, lưới, đám mây). Tối đa 30 item mới mỗi giây, còn lại xếp hàng đợi.

---

## 4. Template contract (tóm tắt)

Mỗi template là một package trong `packages/games/<key>` và export:

```ts
export default defineTemplate({
  key: 'shake-race',
  version: '1.0.0',
  kind: 'live',
  meta: { name: { vi: 'Lắc điện thoại đua', en: 'Shake Race' }, thumbnail, tags: ['yep', 'team'] },
  configSchema,              // zod; nguồn chân lý cho validate server và sinh form editor
  defaultConfig,
  editor: { groups: [...] }, // gợi ý layout form và widget (color, asset, list…)
  surfaces: {
    player: () => import('./player'),   // React component, lazy
    screen: () => import('./screen'),
  },
  server: () => import('./server'),     // logic room phía server (live) hoặc validator điểm (skill)
});
```

Chi tiết interface ở [05-architecture.md §5](./05-architecture.md#5-game-runtime--template-system).

---

## 5. Quy trình làm template mới

1. **Spec 1 trang** gồm cơ chế, config, luồng server, chống gian lận, asset cần.
2. Scaffold: `bun run gen:template <key>`.
3. Viết `configSchema` và `defaultConfig`, rồi `player`/`screen`, rồi `server`.
4. Test: unit cho logic server (`bun test`); Storybook-like playground (`apps/studio/dev/templates`); load test kịch bản k6 nếu là live.
5. QA trên thiết bị thật: iPhone SE/12, Android tầm thấp (Samsung A-series), Zalo in-app browser.
6. Review hiệu năng: bundle ≤ 300 KB gzip mỗi template (chưa tính asset); 60 fps.
7. Đăng ký vào registry, bật theo gói.
