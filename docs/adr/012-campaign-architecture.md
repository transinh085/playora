# ADR-012: Kiến trúc v2 — nền tảng minigame campaign

**Trạng thái:** Accepted · 24/10/2026 · Nối tiếp [011](./011-remove-live-engine.md) · Theo [00 v2.1](../00-product-strategy.md)

## Bối cảnh

Sản phẩm chỉ còn minigame có thưởng (`instant`, `skill`) chạy trên điện thoại, sau này trên kiosk. Không còn sân khấu, realtime hay màn hình lớn. Đường nóng mới là **một lượt chơi**: kiểm tra điều kiện, quyết định kết quả và giải, trừ kho, rồi trả về cho client animate. Đường này phải đúng tuyệt đối (0 vượt kho, ngân sách hoặc giới hạn) và chịu được đỉnh ≥ 500 lượt/giây mỗi campaign.

## Quyết định

### 1. Thành phần

```
apps/studio (Next)  ──REST──┐                        ┌── apps/worker (BullMQ)
apps/play   (Next)  ──REST──┼──> apps/api (Nest) ────┤   asset · import voucher · export · rollup
apps/web    (Next, landing) │      │                 └── (M2) thông báo email/ZNS
                            │      ├── Postgres  (nguồn chân lý: kho, lượt, giải)
                            │      └── Valkey    (rate limit, cache config đã publish, BullMQ)
```

- **Bỏ:** `apps/realtime`, `packages/realtime-client`, `contracts/ws.ts`, `contracts/api/live.ts`, `contracts/api/screens.ts`, module API `live`/`screens`, Play `/screen`, Studio "Màn hình".
- Không có service mới. Play engine và prize engine chạy **trong `apps/api`**, logic thuần nằm ở `packages/core`. Đây là monolith có module, scale ngang bằng cách nhân bản API (stateless).

### 2. Package

| Package | Vai trò sau v2 |
|---|---|
| `contracts` | REST contracts. Thêm `prizes`, `vouchers`, `plays`, `participation`; (M1 muộn) `channels`, `analytics`; (M2) `draws`. Bỏ `ws`, `live`, `screens` |
| `core` | Logic thuần, không I/O: `prize/` (quyết định kết quả, pacing, giới hạn, ngân sách), `participation/` (`isOpen(schedule, now, tz)`, quota), `session/` (token phiên người chơi, có `ver` để thu hồi; thay `live/token`), `draw/` (sửa commit ràng buộc `poolHash` + `spinNo`), `fraud/` (heuristic gắn cờ) |
| `game-sdk` v2 | Chỉ kind `instant` và `skill` (§3). Bỏ `LiveServerModule`, `RoomContext`, `createTestRoom`, `transitionRound`, `Screen`/`HostPanel`, `clock` sync |
| `templates` | Mỗi template một thư mục `src/<id>/` gồm `definition.ts` (server-safe: schema, slots, skins, server module) và `player.tsx` (client). `registry.ts` (server-safe) và `surfaces.ts` (client) |
| `db` | Bỏ `event_screens`, `live_rounds`, `round_scores`. Thêm `voucher_codes`, `plays`, `play_counters`, `prize_counters`; mở rộng `prizes`, `awards`, `events`, `players`, `guest_list_entries` (§5) |
| `ui`, `api-client`, `i18n`, `auth`, `env`, `jobs` | Giữ. `env` bỏ `REALTIME_*`; `LIVE_TOKEN_SECRET` đổi tên thành `PLAYER_SESSION_SECRET` |

### 3. Game SDK v2

```ts
type GameKind = 'instant' | 'skill';   // bốc thăm (`draw`) là tính năng nền tảng, không phải template; `display` (photo-booth, M4) thêm sau

/** Kết quả do server quyết định, client chỉ hiển thị. */
type PlayOutcome =
  | { kind: 'win'; prize: { id: string; name: LocalizedText; type: PrizeType; imageUrl?: string }; voucherCode?: string }
  | { kind: 'lose' }
  | { kind: 'out_of_stock' };

/** instant: biến outcome thành dữ liệu hiển thị (vd. ô dừng của vòng quay). Chạy trên server. */
interface InstantServerModule<C, D> {
  present(outcome: PlayOutcome, config: C, rng: () => number): D;
}

/** skill: xác thực bài nộp (điểm, thời lượng) trước khi xét giải. Chạy trên server. */
interface SkillServerModule<C, Sub, D = undefined> {
  submissionSchema: z.ZodType<Sub>;
  validate(sub: Sub, ctx: { config: C; startedAt: number; endedAt: number }):
    | { ok: true; score: number }
    | { ok: false; reason: string };
  /** Điểm ≥ ngưỡng thì được một lượt xét giải (`score_threshold`). */
  qualifies(score: number, config: C): boolean;
  present?(outcome: PlayOutcome, config: C, rng: () => number): D;
}

/** Player surface chỉ nói chuyện với session, không biết API. */
interface PlaySession<D, Sub = never> {
  state: 'ready' | 'starting' | 'playing' | 'submitting' | 'done' | 'blocked' | 'error';
  remaining: { today: number | null; total: number | null };
  start(): Promise<void>;                 // instant: start = chơi luôn, nhận result
  submit(sub: Sub): Promise<void>;        // chỉ skill
  result: { outcome: PlayOutcome; display: D } | null;
  blockedReason?: 'not_open' | 'no_plays_left' | 'ended' | 'flagged';
}

interface PlayerProps<C, D, Sub = never> {
  config: C; brand: BrandKit; assets: AssetResolver; skin?: string;
  locale: Locale; quality: 'high' | 'low';
  session: PlaySession<D, Sub>;
  onFinished(): void;                     // shell chuyển sang màn kết quả chuẩn
}
```

- `defineTemplate` là discriminated union theo `kind`: `instant` bắt buộc `server: InstantServerModule`, còn `skill` bắt buộc `server: SkillServerModule`. Giữ `configSchema` + `field.*` + auto-form + skins + `hotEditable` như hiện tại.
- **Preview harness:** `createPreviewSession({ template, config, outcome })` chạy `present` tại chỗ với outcome giả lập (organizer chọn "trúng giải X / không trúng / hết quà" trong builder). Không gọi prize engine.
- Màn **Cover / Form / Kết quả / Quà của tôi** thuộc **shell của Play** (flow chuẩn BLD-07), không thuộc template. Template chỉ vẽ phần chơi.

### 4. Đường nóng một lượt chơi

`instant`: `POST /p/:slug/games/:gameId/plays` → `{ playId, outcome, display, remaining }`.
`skill`: `POST …/plays` (start, trả `playId` + `startedAt` + `seed`; lượt được tính ngay), rồi `POST …/plays/:playId/submit`.

Trình tự trong API (module `plays`):

1. **Guard ngoài transaction:** session token hợp lệ (`ver` khớp), campaign mở (`core/participation.isOpen`), game đã publish, rate bucket Valkey (IP, device, player, campaign) theo preset chống gian lận, Turnstile (preset Chuẩn+), blacklist.
2. **Một transaction, không khoá dòng event:**
   1. Giành lượt: `INSERT INTO play_counters (player_id, game_id, day, n) … ON CONFLICT DO UPDATE SET n = n + 1 WHERE play_counters.n < $limit RETURNING n`. Không trả dòng nào nghĩa là hết lượt.
   2. Đọc snapshot giải của game: tồn kho, đã phát hôm nay/khung giờ (`prize_counters`), ngân sách, số giải người này đã nhận.
   3. `core/prize.decide(snapshot, rules, now, rng)` trả về `prizeId | null`. Hàm thuần, test bằng mô phỏng 1 triệu lượt.
   4. Trừ kho có điều kiện: `UPDATE prizes SET remaining = remaining - 1 … WHERE id = $1 AND remaining > 0`, cộng `prize_counters` và ngân sách cũng có điều kiện. Thất bại thì coi là `out_of_stock`/`lose`, **không** chọn lại giải khác trong cùng lượt.
   5. Voucher: `SELECT … FROM voucher_codes WHERE prize_id = $1 AND award_id IS NULL LIMIT 1 FOR UPDATE SKIP LOCKED`.
   6. Ghi `plays` (kèm `rng_proof`, `channel_key`, `client_request_id` unique để idempotent) và `awards`.
3. `present()` của template tạo `display`, trả về client.

Ghi chú:
- Tranh chấp chỉ nằm trên dòng `prizes` khi có người trúng (tỷ lệ trúng ~20% ở 500 lượt/s thì khoảng 100 update/s/campaign). Nếu G1a cho thấy nghẽn, chia kho thành N bucket.
- RNG dùng `crypto.randomInt` trên server; mọi kết quả có log.

### 5. Dữ liệu (thay đổi chính)

- `events`:
  - Giữ tên `events` trong DB, API path và code. UI gọi là **"Chiến dịch"**: PRD coi Event và Campaign là một khái niệm; đổi tên toàn bộ tốn công mà không có giá trị.
  - Bỏ `mode` (chỉ còn campaign). Thêm `schedule` jsonb (khung giờ theo thứ, ngày nghỉ), `participation` jsonb (lượt/ngày, tổng, theo game), `antiFraud` jsonb (preset + tuỳ chỉnh).
  - `playerLimit` lấy từ gói của org (server clamp), không nhận từ client.
- `players`:
  - Unique partial `(event_id, device_id)` cho danh tính ẩn danh, và `(event_id, phone_hash)` khi form có SĐT. Bỏ kiểu khoá `FOR UPDATE` dòng event khi join.
  - Thêm `session_ver` để thu hồi token.
- `guest_list_entries`: thêm `code_norm` (`lower(btrim)`) và unique `(event_id, code_norm)`.
- `prizes`: thêm `rules` jsonb (chế độ, trọng số/xác suất, giới hạn/người/ngày, pacing) và `weight`. `game_id` bắt buộc cho giải của minigame.
- Bảng mới:
  - `voucher_codes(prize_id, code, award_id)`
  - `plays(event_id, game_id, game_version_id, player_id, channel_key, status, score, outcome, rng_proof, client_request_id, started_at, ended_at)`
  - `play_counters(player_id, game_id, day, n)`
  - `prize_counters(prize_id, bucket_start, issued)`
- `awards`: thêm `play_id`, `voucher_code_id`. `draw_spin_id` giữ cho bốc thăm cuối chương trình (M2).

### 6. Bề mặt

- **Play:**
  - `/[slug]`: Cover + thể lệ → Form/consent → danh sách game.
  - `/[slug]/g/[gameId]`: chơi → màn kết quả chuẩn.
  - `/[slug]/prizes`: Quà của tôi.
  - `/preview`: builder.
  - (M3) `?mode=kiosk`.
  - next-intl cho Play.
- **Studio**, theo campaign:
  - **Tổng quan** (dashboard)
  - **Trò chơi** (builder)
  - **Giải thưởng** (giải, voucher, quy tắc)
  - **Người chơi** (guest list, form, export)
  - **Kênh** (M1 muộn)
  - **Cài đặt** (danh tính, lịch, lượt chơi, chống gian lận, brand kit)
  - Bỏ "Màn hình".

### 7. Thứ tự thực hiện

1. **Chore gỡ live + SDK v2** (một nhánh, không chạy song song với story khác đụng cùng file):
   - Gắn tag `archive/live-engine`.
   - Xoá thành phần live (§1).
   - Migration bỏ 3 bảng live.
   - SDK v2.
   - Thay `tap-race` bằng `spin-wheel` v0 để builder, preview và E2E vẫn chạy.
2. **Đợt 3 song song:**
   - Prize engine core (`core/prize`, thuần, có thể chạy song song ngay với bước 1).
   - Nền dữ liệu campaign: story **duy nhất** thêm migration (§5).
   - `scratch-card` + skin Tết cho `spin-wheel`.
   - Gia cố API.
3. **Đợt 4:** API lượt chơi (§4), UI giải + voucher, flow Play (§6), `gift-box` + `catch-items`.

## Hệ quả

- Ít service hơn (bỏ realtime): deploy và vận hành đơn giản; không còn rủi ro split brain hay reconnect.
- Load test M1 chuyển sang play API (k6, đỉnh 500 lượt/s). Gate G1a đo tính đúng của kho dưới tải.
- Tính đúng dựa vào Postgres (update có điều kiện + unique), không dựa vào khoá phân tán. Valkey chỉ dùng cho rate limit/cache: mất Valkey thì giảm khả năng chống gian lận, nhưng không phát sai giải.
- Template viết đơn giản hơn: không có state machine hay tick; logic giải nằm ở nền tảng, không nằm trong template.
