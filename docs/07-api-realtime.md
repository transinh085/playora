# 07 — API & Realtime

Cập nhật: 24/10/2026 · v2.1: chỉ còn REST/public API; phần realtime đã bỏ (§4)

---

## 1. Quy ước REST

- Base URL: `https://api.playora.vn/v1`. OpenAPI tại `/v1/openapi.json` (sinh từ zod contracts).
- Auth: organizer dùng cookie session (Better Auth); player dùng `Authorization: Bearer <playerToken>`; public API (M4) dùng `X-Api-Key`.
- Org scope: route Studio có dạng `/v1/orgs/{orgId}/...`. Guard kiểm tra membership và role.
- Lỗi theo dạng thống nhất:

```json
{ "error": { "code": "PRIZE_OUT_OF_STOCK", "message": "…", "details": {} , "requestId": "…" } }
```

- Idempotency: header `Idempotency-Key` cho các POST có side-effect tài chính hoặc giải thưởng (draw, award, payment). Lưu trong Redis 24 h.
- Phân trang: cursor-based `?cursor=&limit=` (mặc định 50, tối đa 200).
- Rate limit (Redis, sliding window): player 30 req/10 s/token, join 10 req/phút/IP (nới cho NAT văn phòng/booth bằng cách kết hợp deviceId), Studio 300 req/phút/user.

---

## 2. Endpoint chính

### 2.1 Studio (organizer)

| Method | Path | Mô tả | Role tối thiểu |
|---|---|---|---|
| GET/POST | `/orgs/{orgId}/clients` | Danh sách / tạo client | editor |
| GET/POST/PATCH | `/orgs/{orgId}/brand-kits[/{id}]` | Brand kit | editor |
| POST | `/orgs/{orgId}/assets/uploads` | Xin presigned URL upload | editor |
| POST | `/orgs/{orgId}/assets/{id}/complete` | Xác nhận upload, enqueue xử lý ảnh | editor |
| GET/POST | `/orgs/{orgId}/events` | Danh sách / tạo event | viewer / editor |
| GET/PATCH/DELETE | `/orgs/{orgId}/events/{eventId}` | Chi tiết / sửa / xoá mềm | viewer / editor / admin |
| POST | `/orgs/{orgId}/events/{eventId}/clone` | Nhân bản | editor |
| POST | `/orgs/{orgId}/events/{eventId}/guest-list/import` | Import CSV/XLSX (async job) | editor |
| GET | `/templates` | Danh sách template khả dụng theo gói | viewer |
| POST | `/orgs/{orgId}/events/{eventId}/games` | Thêm game từ template | editor |
| PATCH | `/orgs/{orgId}/games/{gameId}` | Sửa draft config (validate theo `configSchema`) | editor |
| POST | `/orgs/{orgId}/games/{gameId}/publish` | Tạo `game_version` bất biến | editor |
| CRUD | `/orgs/{orgId}/games/{gameId}/prizes` | Giải thưởng | editor |
| POST | `/orgs/{orgId}/prizes/{prizeId}/vouchers/import` | Import mã voucher | editor |
| POST | `/orgs/{orgId}/events/{eventId}/rehearsal/{start\|reset}` | Chạy thử campaign + bot (không trừ kho thật) | operator |
| POST | `/orgs/{orgId}/events/{eventId}/draws` | **Bốc thăm cuối chương trình (M2):** chốt pool theo bộ lọc AND/OR → `{ drawId, poolSize, poolHash }` | operator |
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
| POST | `/p/{slug}/join` | Tham gia: identity + form + consents → `playerToken`, `player` |
| GET | `/p/{slug}/me` | Trạng thái người chơi: lượt còn lại, giải đã trúng |
| POST | `/p/{slug}/games/{gameId}/plays` | **Instant:** một lần gọi = một lượt; server kiểm điều kiện, quyết định giải, trừ kho → `{ playId, outcome, display, remaining }`. **Skill:** bắt đầu lượt → `{ playId, startedAt, seed }`. Header `Idempotency-Key` bắt buộc ([ADR-012 §4](./adr/012-campaign-architecture.md)) |
| POST | `/p/{slug}/games/{gameId}/plays/{playId}/submit` | **Skill:** gửi điểm + telemetry → validate → `{ outcome, display, score }` |
| GET | `/p/{slug}/games/{gameId}/leaderboard` | Leaderboard (skill, M2) |
| GET | `/p/{slug}/prizes` | "Quà của tôi": giải + mã voucher + QR đổi quà |
| GET | `/p/{slug}/draws` | **Trang công bố kết quả bốc thăm (M2):** `poolHash`, `seedCommit` theo `spinNo`, người trúng (che bớt thông tin), lần void kèm lý do; `serverSeed` sau khi kết thúc để ai cũng kiểm chứng được |
| POST | `/p/{slug}/privacy/requests` | Yêu cầu xoá hoặc xuất dữ liệu (PDPL) |

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

## 4. Realtime protocol (Socket.IO)

Bỏ ở v2.1 (không còn Host/Screen/live engine; xem [ADR-011](./adr/011-remove-live-engine.md)). Code cũ (`packages/contracts/src/ws.ts`, `apps/realtime`, `packages/realtime-client`) lưu ở tag `archive/live-engine` và **còn phải gỡ khỏi `main`** ([09](./09-roadmap-plan.md) story 1.0).

---

## 5. Contracts dùng chung (ví dụ)

Mọi endpoint khai báo bằng `defineRoute` trong `packages/contracts/src/api/<feature>.ts` ([ADR-008](./adr/008-contract-first-api.md)); controller chỉ dùng `@Route(contract)` + `@Args()`.

```ts
// packages/contracts/src/api/draws.ts (M2)
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

## 6. Webhook gửi ra (M4)

- Event: `player.registered`, `play.completed`, `prize.awarded`, `prize.redeemed`, `event.ended`.
- Header `Playora-Signature: t=<ts>,v1=<HMAC_SHA256(secret, ts + "." + body)>`; retry theo lũy thừa trong 24 h.
- Payload PII chỉ gửi khi org bật "share PII" và người chơi đã consent `share_with_brand`.
