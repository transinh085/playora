# 07 — API & Realtime

Cập nhật: 23/10/2026

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
- Rate limit (Redis, sliding window): player 30 req/10 s/token, join 10 req/phút/IP (nới cho NAT sự kiện bằng cách kết hợp deviceId), Studio 300 req/phút/user.

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
| POST/DELETE | `/orgs/{orgId}/events/{eventId}/screens[/{id}]` | Tạo / thu hồi screen key | editor |
| GET | `/templates` | Danh sách template khả dụng theo gói | viewer |
| POST | `/orgs/{orgId}/events/{eventId}/games` | Thêm game từ template | editor |
| PATCH | `/orgs/{orgId}/games/{gameId}` | Sửa draft config (validate theo `configSchema`) | editor |
| POST | `/orgs/{orgId}/games/{gameId}/publish` | Tạo `game_version` bất biến | editor |
| CRUD | `/orgs/{orgId}/games/{gameId}/prizes` | Giải thưởng | editor |
| POST | `/orgs/{orgId}/prizes/{prizeId}/vouchers/import` | Import mã voucher | editor |
| POST | `/orgs/{orgId}/events/{eventId}/rehearsal/{start\|reset}` | Rehearsal + bot | operator |
| POST | `/orgs/{orgId}/events/{eventId}/live/commands` | Lệnh host (fallback REST khi WS lỗi) | operator |
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
| POST | `/games/{gameId}/plays` | Bắt đầu lượt (kiểm quota lượt) → `playId`, `playToken` (ký, hết hạn theo thời lượng game) |
| POST | `/plays/{playId}/draw` | **Instant-win:** server chọn kết quả → `{ outcome, segmentIndex, award? }` |
| POST | `/plays/{playId}/submit` | **Skill:** gửi điểm + telemetry → validate → `{ score, rank?, award? }` |
| GET | `/games/{gameId}/leaderboard` | Leaderboard (skill) |
| GET | `/awards/{awardId}` | Chi tiết giải + QR đổi quà |
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
  │ POST /games/{g}/plays     │                                       │
  │──────────────────────────►│ check quota lượt (plays hôm nay)       │
  │                           │ INSERT plays(status=started) ─────────►│
  │◄──────── {playId} ────────│                                       │
  │ (user bấm Quay)           │                                       │
  │ POST /plays/{p}/draw      │                                       │
  │  Idempotency-Key          │ core.selectPrize(prizes, rules, rng)  │
  │──────────────────────────►│ BEGIN                                 │
  │                           │  UPDATE prizes … remaining>0 ─────────►│
  │                           │  (voucher: SKIP LOCKED)               │
  │                           │  INSERT awards; UPDATE plays=completed │
  │                           │ COMMIT                                │
  │◄─ {segmentIndex, award} ──│ enqueue notify + analytics            │
  │ animate tới segmentIndex   │                                       │
  │ hiện popup giải            │                                       │
```

> Client **không bao giờ** biết xác suất hay danh sách giải còn lại theo thời gian thực. Chỉ nhận kết quả của chính mình.

### 3.2 Skill (hứng quà)

1. `POST /plays` trả về `playToken` (JWT gồm `playId`, `seed`, `exp = now + duration + 10s`).
2. Client chơi với `seed` (sinh vật phẩm deterministic), ghi telemetry gọn (số lần bắt mỗi giây, thời gian).
3. `POST /plays/{id}/submit { score, telemetry, playToken }`.
4. Server gọi `SkillServerModule.validate`: thời lượng hợp lệ, score ≤ max lý thuyết theo seed, phân phối input hợp lý. Sau đó chọn giải theo ngưỡng điểm.

---

## 4. Realtime protocol (Socket.IO)

### 4.1 Kết nối

```
wss://rt.playora.vn/socket.io/?event={eventId}&role={player|screen|host}
handshake.auth = { token }  // playerToken | screenKey | organizer session ticket (ngắn hạn, lấy từ API)
```

- Namespace `/live`. Mỗi socket join các room `evt:{eventId}`, `evt:{eventId}:{role}`; nếu là player có team thì join thêm `evt:{eventId}:team:{team}`.
- Server từ chối nếu event không ở trạng thái `live` hoặc rehearsal, hoặc vượt `playerLimit`.

### 4.2 Event typed (khai báo trong `packages/contracts/src/ws.ts`)

**Client → Server**

| Event | Từ | Payload | Ack |
|---|---|---|---|
| `clock.ping` | all | `{ t0 }` | `{ t0, ts }` |
| `session.resume` | all | `{ lastSeq }` | `{ snapshot }` |
| `host.command` | host | `{ cmd: 'round.open' \| 'round.start' \| 'round.pause' \| 'round.next' \| 'round.end' \| 'draw.spin' \| 'draw.void' \| 'wall.approve' \| 'wall.reject', gameId?, args? }` | `{ ok, error? }` |
| `input` | player | `{ roundId, seq, data }` (data theo `inputSchema` của template) | không (fire-and-forget) |
| `answer.submit` | player | `{ roundId, questionId, choice }` | `{ accepted }` |
| `wall.post` | player | `{ text, avatarAssetId? }` | `{ ok, pending }` |

**Server → Client**

| Event | Tới | Payload |
|---|---|---|
| `event.state` | all | `{ status, activeGameId, round: { id, status, endsAt? }, onlineCount }` |
| `round.view` | theo role | `view(state, audience)` của template; có `seq` tăng dần |
| `round.result` | all | Kết quả vòng (top N, đội thắng, của bản thân nếu là player) |
| `draw.committed` | host, screen | `{ spinId, seedCommit, poolSize }` |
| `draw.result` | screen, host | `{ spinId, winners: [{ playerId, displayName }], effect, durationMs }` |
| `award.you` | player (riêng) | `{ awardId, prizeName, redeemCode }` |
| `wall.item` | screen | `{ id, name, text, avatarUrl }` |
| `system.degrade` | all | `{ level: 0 \| 1 \| 2 }` |
| `system.notice` | all | Thông báo từ host |

### 4.3 State machine của vòng (`RoundRunner`)

```
          round.open           round.start        (timer/goal)          round.end
  idle ───────────────► lobby ─────────────► countdown(3s) ─► playing ─────────────► result ──► closed
    ▲                     │                                     │  ▲ round.pause/resume   │
    └─────────────────────┴──────────── round.next (sang game kế) ┴─────────────────────────┘
```

- Mọi chuyển trạng thái được ghi `live_rounds.status` và gửi `event.state`.
- `finalize()` chạy khi vào `result`: ghi `round_scores`, cập nhật `live_rounds.result`, enqueue analytics.

### 4.4 Khôi phục và độ tin cậy

- Mỗi message `round.view` có `seq`. Khi reconnect, client gửi `session.resume { lastSeq }` và server trả snapshot đầy đủ (không replay delta).
- Player mất kết nối > 30 s vẫn giữ điểm. Input khi offline bị bỏ (không xếp hàng ở client cho game realtime).
- Screen hiển thị overlay "Đang kết nối lại…" sau 2 s mất kết nối; host nhận cảnh báo.

---

## 5. Contracts dùng chung (ví dụ)

```ts
// packages/contracts/src/ws.ts
export const HostCommand = z.discriminatedUnion('cmd', [
  z.object({ cmd: z.literal('round.open'), gameId: z.uuid() }),
  z.object({ cmd: z.literal('round.start') }),
  z.object({ cmd: z.literal('round.pause') }),
  z.object({ cmd: z.literal('round.end') }),
  z.object({ cmd: z.literal('round.next') }),
  z.object({ cmd: z.literal('draw.spin'), prizeId: z.uuid(), count: z.number().int().min(1).max(50) }),
  z.object({ cmd: z.literal('draw.void'), spinId: z.uuid(), reason: z.string().min(3) }),
]);

export interface ServerToClient {
  'event.state': (s: EventState) => void;
  'round.view': (v: { seq: number; roundId: string; view: unknown }) => void;
  'draw.result': (r: DrawResult) => void;
  'award.you': (a: AwardNotice) => void;
  'system.degrade': (d: { level: 0 | 1 | 2 }) => void;
}
export interface ClientToServer {
  'clock.ping': (p: { t0: number }, ack: (r: { t0: number; ts: number }) => void) => void;
  'host.command': (c: z.infer<typeof HostCommand>, ack: (r: CommandAck) => void) => void;
  'input': (i: { roundId: string; seq: number; data: unknown }) => void;
}
```

---

## 6. Webhook gửi ra (M4)

- Event: `player.registered`, `play.completed`, `prize.awarded`, `prize.redeemed`, `event.ended`.
- Header `Playora-Signature: t=<ts>,v1=<HMAC_SHA256(secret, ts + "." + body)>`; retry theo lũy thừa trong 24 h.
- Payload PII chỉ gửi khi org bật "share PII" và người chơi đã consent `share_with_brand`.
