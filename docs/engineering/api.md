# API

Cập nhật: 26/10/2026 · Owner: Tech Lead (founder) · Liên quan: [architecture.md](./architecture.md), [conventions.md §3–4](./conventions.md#3-quy-trình-thêm-một-tính-năng-ví-dụ-games), [ADR-008](../adr/008-contract-first-api.md), [ADR-012](../adr/012-campaign-architecture.md)

Nguồn chân lý là contract trong `packages/contracts/src/api/*` (OpenAPI sinh lúc chạy tại `/v1/openapi.json`). Tài liệu này mô tả quy ước và **API đích**; route chưa có trong code được đánh dấu "(đích)". Không còn WebSocket/realtime ([ADR-011](../adr/011-remove-live-engine.md)).

**Đã có (26/10/2026):** `/me/orgs`; `/orgs/:orgId/events[/:eventId]`; `/orgs/:orgId/events/:eventId/games` (+ `reorder`); `/orgs/:orgId/games/:gameId` (+ `publish`, `versions`); `/orgs/:orgId/events/:eventId/guests/**`; `/orgs/:orgId/brand-kits/**`; `/orgs/:orgId/assets/**`; `/templates`; public `/p/:slug`, `/p/:slug/join`; `/health`, `/health/ready`.

---

## 1. Quy ước REST

- Base URL: `https://api.playora.vn/v1`. OpenAPI tại `/v1/openapi.json` (sinh từ zod contracts).
- Auth: organizer dùng cookie session (Better Auth); người chơi dùng `Authorization: Bearer <token phiên>` (ký HMAC, [architecture.md §8](./architecture.md#8-xác-thực-và-phân-quyền)); public API (đích) dùng `X-Api-Key`.
- Org scope: route Studio có dạng `/v1/orgs/{orgId}/...`. Guard kiểm tra membership và role.
- Lỗi theo dạng thống nhất:

```json
{ "error": { "code": "PRIZE_OUT_OF_STOCK", "message": "…", "details": {} , "requestId": "…" } }
```

- Idempotency: header `Idempotency-Key` cho các POST có side-effect tài chính hoặc giải thưởng (draw, award, payment). Lưu trong Valkey 24 h; lượt chơi còn có `client_request_id` unique trong DB.
- Phân trang: cursor-based `?cursor=&limit=` (mặc định 50, tối đa 200).
- Rate limit: hiện có `ThrottlerGuard` theo IP trên Valkey (`RedisThrottlerStorage`). Đích `[GĐ]`: người chơi 30 req/10 s/token, join 10 req/phút/IP (nới cho NAT quán/văn phòng bằng cách kết hợp deviceId), Studio 300 req/phút/user.

---

## 2. Endpoint chính

### 2.1 Studio (organizer)

> UI gọi đối tượng chính là **Chương trình** (Campaign); API và DB giữ tên `events`. Contract cho Campaign của Builder Lab (`campaigns`/`plays`/`vouchers`/`stats`) sẽ thay hoặc bọc một phần bảng dưới, chốt bằng ADR khi làm API thật.

| Method | Path | Mô tả | Role tối thiểu |
|---|---|---|---|
| GET/POST | `/orgs/{orgId}/clients` | Danh sách / tạo client | editor |
| GET/POST/PATCH | `/orgs/{orgId}/brand-kits[/{id}]` | Brand kit | editor |
| POST | `/orgs/{orgId}/assets/uploads` | Xin presigned URL upload | editor |
| POST | `/orgs/{orgId}/assets/{id}/complete` | Xác nhận upload, enqueue xử lý ảnh | editor |
| GET/POST | `/orgs/{orgId}/events` | Danh sách / tạo event | viewer / editor |
| GET/PATCH/DELETE | `/orgs/{orgId}/events/{eventId}` | Chi tiết / sửa / xoá mềm | viewer / editor / admin |
| POST | `/orgs/{orgId}/events/{eventId}/clone` | Nhân bản | editor |
| POST | `/orgs/{orgId}/events/{eventId}/guests/import` | Import CSV/XLSX khách mời (có `guests/preview` trước) | editor |
| GET | `/templates` | Danh sách template khả dụng theo gói | viewer |
| POST | `/orgs/{orgId}/events/{eventId}/games` | Thêm game từ template | editor |
| PATCH | `/orgs/{orgId}/games/{gameId}` | Sửa draft config (validate theo `configSchema`) | editor |
| POST | `/orgs/{orgId}/games/{gameId}/publish` | Tạo `game_version` bất biến | editor |
| CRUD | `/orgs/{orgId}/games/{gameId}/prizes` | Giải thưởng | editor |
| POST | `/orgs/{orgId}/prizes/{prizeId}/vouchers/import` | Import mã voucher | editor |
| POST | `/orgs/{orgId}/events/{eventId}/rehearsal/{start\|reset}` | Chạy thử campaign + bot (không trừ kho thật) | operator |
| POST | `/orgs/{orgId}/events/{eventId}/draws` | **Bốc thăm cuối chương trình (đích):** chốt pool theo bộ lọc AND/OR → `{ drawId, poolSize, poolHash }` | operator |
| POST | `/orgs/{orgId}/draws/{drawId}/spins` | Commit một lần quay: `seedCommit = sha256(serverSeed ‖ poolHash ‖ spinNo)` công bố trên trang kết quả **trước** khi reveal | operator |
| POST | `/orgs/{orgId}/draws/{drawId}/spins/{spinId}/reveal` | Reveal: server chọn người trúng, ghi `draw_spins` + `awards` trong 1 transaction | operator |
| POST | `/orgs/{orgId}/draws/{drawId}/spins/{spinId}/void` | Huỷ kết quả có lý do (ghi log, không xoá, `spinNo` tăng) | operator |
| GET | `/orgs/{orgId}/events/{eventId}/stats` | Dashboard tổng hợp | viewer |
| POST | `/orgs/{orgId}/events/{eventId}/exports` | Yêu cầu export (`players`, `leads`, `winners`, `report_pdf`) | admin |
| GET | `/orgs/{orgId}/exports/{id}` | Trạng thái + link tải | admin |
| POST | `/orgs/{orgId}/awards/redeem` | Staff đổi quà bằng `redeemCode` | operator |
| GET | `/orgs/{orgId}/audit-logs` | Nhật ký | admin |

### 2.2 Player (public)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/p/{slug}` | Thông tin event công khai: brand, games (versionId, templateKey@version), identity rule, form |
| POST | `/p/{slug}/otp` | Gửi OTP (phone/email) |
| POST | `/p/{slug}/join` | Tham gia: identity + form + consents → token phiên, `player` |
| GET | `/p/{slug}/me` | Trạng thái người chơi: lượt còn lại, giải đã trúng |
| POST | `/p/{slug}/games/{gameId}/plays` | **Instant:** một lần gọi = một lượt; server kiểm điều kiện, quyết định giải, trừ kho → `{ playId, outcome, display, remaining }`. **Skill:** bắt đầu lượt → `{ playId, startedAt, seed }`. Header `Idempotency-Key` bắt buộc ([ADR-012 §4](../adr/012-campaign-architecture.md)) |
| POST | `/p/{slug}/games/{gameId}/plays/{playId}/submit` | **Skill:** gửi điểm + telemetry → validate → `{ outcome, display, score }` |
| GET | `/p/{slug}/games/{gameId}/leaderboard` | Leaderboard (skill, đích) |
| GET | `/p/{slug}/prizes` | "Quà của tôi": giải + mã voucher + QR đổi quà |
| GET | `/p/{slug}/draws` | **Trang công bố kết quả bốc thăm (đích):** `poolHash`, `seedCommit` theo `spinNo`, người trúng (che bớt thông tin), lần void kèm lý do; `serverSeed` sau khi kết thúc để ai cũng kiểm chứng được |
| POST | `/p/{slug}/privacy/requests` | Yêu cầu xoá hoặc xuất dữ liệu (PDPL) |

**Đã có (M1, campaign, `playsApi` trong `packages/contracts/src/api/plays.ts`):** `GET /p/{slug}/campaign` trả bản đã phát hành (không lộ xác suất, tồn kho, giá trị; `phase` tính từ `events.startsAt/endsAt/paused`), `POST /p/{slug}/plays` (body `{ requestId, channel?, captchaToken? }`; `requestId` là khoá idempotent theo người chơi thay cho header `Idempotency-Key`, chưa có `gameId` trong path vì M1 một game/chương trình) trả `PlayResult` `{ playId, outcome: win|lose|no_turns|closed, reason, prize, voucher, turnsLeftToday }`, và `GET /p/{slug}/me` (lượt còn lại hôm nay, `nextTurnAt`, voucher của người chơi) thay cho `/me` + `/prizes` ở bảng trên. Cả ba cần token phiên từ `join` (`Authorization: Bearer`); token của chương trình khác → 403. Join từ chối chương trình đã qua `endsAt` (`EVENT_NOT_LIVE`).

### 2.3 Webhook nhận vào

| Path | Nguồn |
|---|---|
| `/webhooks/payos` | Xác nhận thanh toán (verify checksum) |
| `/webhooks/zns` | Trạng thái gửi ZNS |

---

## 3. Luồng chơi campaign

### 3.1 Instant-win (vòng quay)

```
Player                       API                                   Postgres
  │ (user bấm Quay)           │ guard: session, isOpen, rate, Turnstile│
  │ POST /p/{s}/games/{g}/plays                                       │
  │  Idempotency-Key          │ BEGIN                                 │
  │──────────────────────────►│  play_counters n+1 WHERE n<limit ─────►│
  │                           │  core.prize.decide(snapshot, rules)   │
  │                           │  UPDATE prizes … remaining>0 ─────────►│
  │                           │  (voucher: SKIP LOCKED)               │
  │                           │  INSERT plays, awards                 │
  │                           │ COMMIT; template.present(outcome)     │
  │◄─ {outcome, display} ─────│ enqueue analytics                     │
  │ animate tới segmentIndex   │                                       │
  │ hiện popup giải            │                                       │
```

> Client **không bao giờ** biết xác suất hay danh sách giải còn lại theo thời gian thực. Chỉ nhận kết quả của chính mình.

### 3.2 Skill (hứng quà)

1. `POST /p/{slug}/games/{gameId}/plays` trả về `{ playId, startedAt, seed }`; lượt đã được tính (trừ quota) ngay lúc này.
2. Client chơi với `seed` (sinh vật phẩm deterministic), ghi telemetry gọn (số lần bắt mỗi giây, thời gian).
3. `POST …/plays/{playId}/submit { score, telemetry }` (phải trước `startedAt + duration + 10s`).
4. Server gọi `SkillServerModule.validate`: thời lượng hợp lệ, score ≤ max lý thuyết theo seed, phân phối input hợp lý. Nếu `qualifies(score)` thì gọi prize engine như instant.

---

## 4. Contracts dùng chung (ví dụ)

Mọi endpoint khai báo bằng `defineRoute` trong `packages/contracts/src/api/<feature>.ts` ([ADR-008](../adr/008-contract-first-api.md)); controller chỉ dùng `@Route(contract)` + `@Args()`.

```ts
// packages/contracts/src/api/draws.ts (đích)
export const spinDraw = defineRoute({
  method: 'POST',
  path: '/orgs/:orgId/draws/:drawId/spins',
  auth: 'session',
  permission: { draw: ['spin'] },          // resource mới: thêm vào packages/auth/src/permissions.ts
  params: OrgParams.extend({ drawId: Id }),
  body: z.object({ prizeId: Id, count: z.number().int().min(1).max(50) }),
  response: z.object({ spinId: Id, spinNo: z.number().int(), poolHash: z.string(), seedCommit: z.string() }),
});

export const voidSpin = defineRoute({
  method: 'POST',
  path: '/orgs/:orgId/draws/:drawId/spins/:spinId/void',
  auth: 'session',
  permission: { draw: ['spin'] },
  params: OrgParams.extend({ drawId: Id, spinId: Id }),
  body: z.object({ reason: z.string().trim().min(3).max(500) }),
  response: Ok,
});
```

---

## 5. Webhook gửi ra (đích)

- Event: `player.registered`, `play.completed`, `prize.awarded`, `prize.redeemed`, `event.ended`.
- Header `Playora-Signature: t=<ts>,v1=<HMAC_SHA256(secret, ts + "." + body)>`; retry theo lũy thừa trong 24 h.
- Payload PII chỉ gửi khi org bật "share PII" và người chơi đã consent `share_with_brand`.
