# ADR-012: Kiến trúc v2: nền tảng minigame campaign

| | |
|---|---|
| **Trạng thái** | Accepted · đang thực hiện |
| **Ngày** | 24/10/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | Nối tiếp [ADR-011](./011-remove-live-engine.md) · câu hỏi lưu trữ Campaign: [ADR-015](./015-campaign-persistence.md) · [../engineering/architecture.md](../engineering/architecture.md), [../product/specs/prizes-redemption.md](../product/specs/prizes-redemption.md) |

## Bối cảnh

Sản phẩm chỉ còn minigame có thưởng (`instant`, `skill`) chạy trên điện thoại, sau này trên kiosk. Không còn sân khấu, realtime hay màn hình lớn. Đường nóng mới là **một lượt chơi**: kiểm tra điều kiện, quyết định kết quả và giải, trừ kho, rồi trả về cho client animate. Đường này phải đúng tuyệt đối (0 vượt kho, ngân sách hoặc giới hạn) và chịu được đỉnh ≥ 500 lượt/giây mỗi chương trình.

## Quyết định

### 1. Thành phần

```
apps/studio (Next)  ──REST──┐                        ┌── apps/worker (BullMQ)
apps/play   (Next)  ──REST──┼──> apps/api (Nest) ────┤   asset · import voucher · export · rollup
apps/web    (Next, landing) │      │                 └── (M2) thông báo email/ZNS
                            │      ├── Postgres  (nguồn chân lý: kho, lượt, giải)
                            │      └── Valkey    (rate limit, cache config đã publish, BullMQ)
```

Không có service mới. Play engine và prize engine chạy **trong `apps/api`**, logic thuần nằm ở `packages/core`. Đây là monolith có module, scale ngang bằng cách nhân bản API (stateless).

### 2. Package

| Package | Vai trò |
|---|---|
| `contracts` | REST contracts. Thêm `prizes`, `vouchers`, `plays`, `participation`; sau đó `channels`, `analytics`; (M2) `draws`. Đã bỏ `ws`, `live`, `screens` |
| `core` | Logic thuần, không I/O: `prize/` (quyết định kết quả, pacing, giới hạn, ngân sách), `participation/` (`isOpen(schedule, now, tz)`, quota), `session/` (token phiên người chơi có `ver` để thu hồi), `draw/` (commit ràng buộc `poolHash` + `spinNo`), `fraud/` (heuristic gắn cờ) |
| `game-sdk` v2 | Chỉ kind `instant` và `skill` (§3). Bỏ `LiveServerModule`, `RoomContext`, `createTestRoom`, `transitionRound`, `Screen`/`HostPanel`, `clock` sync |
| `templates` | Mỗi template một thư mục `src/<id>/` gồm `definition.ts` (server-safe: schema, slots, skins, server module) và `player.tsx` (client). `registry.ts` (server-safe) và `surfaces.ts` (client) |
| `db` | Bỏ `event_screens`, `live_rounds`, `round_scores`. Thêm `voucher_codes`, `plays`, `play_counters`, `prize_counters`; mở rộng `prizes`, `awards`, `events`, `players`, `guest_list_entries` (§5) |
| `ui`, `api-client`, `i18n`, `auth`, `env`, `jobs` | Giữ. `env` bỏ `REALTIME_*`; `LIVE_TOKEN_SECRET` đổi thành `PLAYER_SESSION_SECRET` |

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

- `defineTemplate` là discriminated union theo `kind`: `instant` bắt buộc `server: InstantServerModule`, `skill` bắt buộc `server: SkillServerModule`. Giữ `configSchema` + `field.*` + auto-form + skins + `hotEditable`.
- **Preview harness:** `createPreviewSession({ template, config, outcome })` chạy `present` tại chỗ với outcome giả lập (organizer chọn "trúng giải X / không trúng / hết quà"). Không gọi prize engine.
- Màn **Cover / Form / Kết quả / Quà của tôi** thuộc **shell của Play** (flow chuẩn BLD-07), không thuộc template. Template chỉ vẽ phần chơi. Bố cục các màn này do canvas soạn ([ADR-014](./014-free-canvas-screen-editor.md)).

### 4. Đường nóng một lượt chơi

`instant`: `POST /p/:slug/games/:gameId/plays` → `{ playId, outcome, display, remaining }`.
`skill`: `POST …/plays` (start, trả `playId` + `startedAt` + `seed`; lượt được tính ngay), rồi `POST …/plays/:playId/submit`.

Trình tự trong API (module `plays`):

1. **Guard ngoài transaction:** session token hợp lệ (`ver` khớp), chương trình mở (`core/participation.isOpen`), game đã publish, rate bucket Valkey (IP, device, player, campaign) theo preset chống gian lận, Turnstile (preset Chuẩn trở lên), blacklist.
2. **Một transaction, không khoá dòng event:**
   1. Giành lượt: `INSERT INTO play_counters (player_id, game_id, day, n) … ON CONFLICT DO UPDATE SET n = n + 1 WHERE play_counters.n < $limit RETURNING n`. Không trả dòng nào nghĩa là hết lượt.
   2. Đọc snapshot giải của game: tồn kho, đã phát hôm nay/khung giờ (`prize_counters`), ngân sách, số giải người này đã nhận.
   3. `core/prize.decide(snapshot, rules, now, rng)` trả về `prizeId | null`. Hàm thuần, test bằng mô phỏng 1 triệu lượt.
   4. Trừ kho có điều kiện: `UPDATE prizes SET remaining = remaining - 1 … WHERE id = $1 AND remaining > 0`, cộng `prize_counters` và ngân sách cũng có điều kiện. Thất bại thì coi là `out_of_stock`/`lose`, **không** chọn lại giải khác trong cùng lượt.
   5. Voucher: `SELECT … FROM voucher_codes WHERE prize_id = $1 AND award_id IS NULL LIMIT 1 FOR UPDATE SKIP LOCKED`.
   6. Ghi `plays` (kèm `rng_proof`, `channel_key`, `client_request_id` unique để idempotent) và `awards`.
3. `present()` của template tạo `display`, trả về client.

Tranh chấp chỉ nằm trên dòng `prizes` khi có người trúng (tỷ lệ trúng ~20% ở 500 lượt/s thì khoảng 100 update/s/chương trình). Nếu Gate G1a cho thấy nghẽn, chia kho thành N bucket. RNG dùng `crypto.randomInt` trên server; mọi kết quả có log.

### 5. Dữ liệu

- `events`: giữ tên `events` trong DB, API path và code (UI gọi là **"Chương trình"**). Bỏ `mode`. Thêm `schedule` jsonb (khung giờ theo thứ, ngày nghỉ), `participation` jsonb (lượt/ngày, tổng, theo game), `antiFraud` jsonb (preset + tuỳ chỉnh). `playerLimit` lấy từ gói của org (server clamp), không nhận từ client.
- `players`: unique partial `(event_id, device_id)` cho danh tính ẩn danh, và `(event_id, phone_hash)` khi form có SĐT. Bỏ khoá `FOR UPDATE` dòng event khi join. Thêm `session_ver` để thu hồi token.
- `guest_list_entries`: thêm `code_norm` (`lower(btrim)`) và unique `(event_id, code_norm)`.
- `prizes`: thêm `rules` jsonb (chế độ, trọng số/xác suất, giới hạn/người/ngày, pacing) và `weight`. `game_id` bắt buộc cho giải của minigame.
- Bảng mới: `voucher_codes(prize_id, code, award_id)` · `plays(event_id, game_id, game_version_id, player_id, channel_key, status, score, outcome, rng_proof, client_request_id, started_at, ended_at)` · `play_counters(player_id, game_id, day, n)` · `prize_counters(prize_id, bucket_start, issued)`.
- `awards`: thêm `play_id`, `voucher_code_id`. `draw_spin_id` giữ cho bốc thăm cuối chương trình (M2).

### 6. Bề mặt

- **Play:** `/[slug]` Cover + thể lệ → Form/consent → game; `/[slug]/g/[gameId]` chơi → kết quả chuẩn; `/[slug]/prizes` Quà của tôi; `/preview` cho builder; (M3) `?mode=kiosk`. next-intl cho Play.
- **Studio:** theo chương trình (chi tiết UX ở [../product/specs/studio-ux.md](../product/specs/studio-ux.md)): Tổng quan · Builder · Giải & đổi quà · Người chơi · Chia sẻ & QR · Cài đặt. Bỏ "Màn hình".

### 7. Thứ tự thực hiện

1. **Chore gỡ live + SDK v2** (một nhánh): tag `archive/live-engine`, xoá thành phần live, migration bỏ 3 bảng live, SDK v2, thay `tap-race` bằng `spin-wheel` v0 để builder, preview và E2E vẫn chạy.
2. **Song song:** prize engine core (`core/prize`, thuần); nền dữ liệu campaign (story **duy nhất** thêm migration §5); `scratch-card` + skin Tết cho `spin-wheel`; gia cố API.
3. **Sau đó:** API lượt chơi (§4), UI giải + voucher, flow Play (§6), `gift-box` + `catch-items`.

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| Service play engine riêng | Thêm deploy và vận hành cho một người; API stateless scale ngang là đủ ở 500 lượt/s |
| Trừ kho bằng Valkey (DECR + outbox) | Nhanh hơn nhưng Postgres không còn là nguồn chân lý duy nhất; để dành cho tối ưu M4 |
| Đổi tên `events` → `campaigns` trong DB/API | Tốn công, không có giá trị; UI tự gọi là "Chương trình" |

## Hệ quả

- **Tốt:** ít service hơn; không còn rủi ro split brain hay reconnect. Template viết đơn giản hơn: không state machine hay tick; logic giải nằm ở nền tảng.
- **Chi phí:** tính đúng dựa vào Postgres (update có điều kiện + unique), cần test tải.
- **Rủi ro:** mất Valkey thì giảm khả năng chống gian lận, nhưng không phát sai giải.

## Kiểm chứng

- Mô phỏng 1 triệu lượt trên `core/prize`: 0 vượt kho/ngân sách/giới hạn ([ADR-010](./010-testing-strategy.md)).
- Load test k6 Play API đỉnh 500 lượt/giây, p95 < 200 ms (Gate G1a).
- Trạng thái code 26/10/2026: bước 1 **xong** (live đã gỡ, `PLAYER_SESSION_SECRET`); `packages/core/src/prize` có `decide`, `simulate`, `schedule` và test nhưng **chưa có app nào gọi qua API**; §5 **chưa làm** (chưa có `plays`, `play_counters`, `voucher_codes`, `prize_counters`, `prizes.rules`, `events.schedule/participation/antiFraud`); §4 chưa có endpoint.

## Lịch sử

- 24/10/2026: Accepted.
- 25/10/2026: Builder Lab (`apps/studio/src/features/builder-lab`, backend giả trong `mock/`) dựng toàn bộ luồng Campaign (mẫu, skin, màu, màn canvas, giải, luật, lịch, chơi, đổi quà) và gọi thật `decide()`/`simulate()` của `@playora/core/prize`. Đây là prototype hiện hành của mô hình Campaign; UI gọi đối tượng là **"Chương trình"** (en: *Campaign*). Cách lưu Campaign thật trên `events` + `games` + `game_versions` hay bảng mới được tách sang [ADR-015](./015-campaign-persistence.md).
- 26/10/2026: chuẩn hoá theo [mẫu ADR](./000-template.md); ghi trạng thái thực hiện.
