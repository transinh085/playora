# API

Cập nhật: 31/10/2026 · Owner: Tech Lead (founder) · Liên quan: [architecture.md](./architecture.md), [conventions.md §3–4](./conventions.md#3-quy-trình-thêm-một-tính-năng-ví-dụ-games), [ADR-008](../adr/008-contract-first-api.md), [ADR-012](../adr/012-campaign-architecture.md)

Nguồn chân lý là contract trong `packages/contracts/src/api/*` (OpenAPI sinh lúc chạy tại `/v1/openapi.json`). Tài liệu này mô tả quy ước và **API đích**; route chưa có trong code được đánh dấu "(đích)". Không còn WebSocket/realtime ([ADR-011](../adr/011-remove-live-engine.md)).

**Đã có (31/10/2026):** `/me/orgs`; `/orgs/:orgId/campaigns/**` (CRUD, `publish`/`pause`/`resume`/`end`, `plays`, `vouchers`, `stats`, `report`, `rehearsal-plays`); `/orgs/:orgId/vouchers/:code[/redeem|/reopen]`; `/orgs/:orgId/billing`; `/admin/orgs/**`; `/orgs/:orgId/brand-kits/**`; `/orgs/:orgId/assets/**`; `/templates`; public `/p/:slug`, `/p/:slug/join`, `/p/:slug/campaign`, `/p/:slug/plays`, `/p/:slug/me`; `/health`, `/health/ready`. Route cũ `/orgs/:orgId/events/**`, `/orgs/:orgId/games/**`, `/orgs/:orgId/events/:eventId/guests/**` vẫn còn (Campaign lưu trên các bảng đó, [ADR-015](../adr/015-campaign-persistence.md)) nhưng UI đã gỡ 27/10.

---

## 1. Quy ước REST

- Base URL: `https://api.playora.vn/v1`. OpenAPI tại `/v1/openapi.json` (sinh từ zod contracts).
- Auth: organizer dùng cookie session (Better Auth); người chơi dùng `Authorization: Bearer <token phiên>` (ký HMAC, [architecture.md §8](./architecture.md#8-xác-thực-và-phân-quyền)); public API (đích) dùng `X-Api-Key`; máy quầy (đích, ORG-10, [ADR-017](../adr/017-counter-device-pairing.md) Proposed) dùng token thiết bị trong cookie httpOnly, chế độ auth `device`, chỉ có quyền tra/đổi mã.
- Org scope: route Studio có dạng `/v1/orgs/{orgId}/...`. Guard kiểm tra membership và role.
- Lỗi theo dạng thống nhất:

```json
{ "error": { "code": "PRIZE_OUT_OF_STOCK", "message": "…", "details": {} , "requestId": "…" } }
```

- Idempotency: header `Idempotency-Key` cho các POST có side-effect tài chính hoặc giải thưởng (draw, award, payment). Lưu trong Valkey 24 h; lượt chơi dùng `requestId` trong body, unique `(player_id, request_id)` trên `plays`.
- Phân trang: cursor-based `?cursor=&limit=` (mặc định 50, tối đa 200).
- Rate limit: `ThrottlerGuard` theo IP trên Valkey (`RedisThrottlerStorage`): mặc định `RATE_LIMIT_PER_MIN`/IP, route public `PUBLIC_RATE_LIMIT_PER_MIN`/IP, join thêm 20/phút theo IP + deviceId. Trên đó, chương trình có thêm giới hạn theo mức chống gian lận (`AntiFraudService`, cửa sổ cố định 1 phút, đếm theo chương trình; số cụ thể ở `ANTI_FRAUD_LIMITS` và [security §1.3](security.md#13-đã-làm-ở-m1-mức-thấp-và-chuẩn)); vượt → 429 `RATE_LIMITED`. Studio 300 req/phút/user vẫn là đích.

---

## 2. Endpoint chính

### 2.1 Studio (organizer)

> UI gọi đối tượng chính là **Chương trình** (Campaign); DB giữ tên `events`. Studio chỉ dùng contract `campaigns`/`vouchers`/`billing` ([ADR-015](../adr/015-campaign-persistence.md)); bảng dưới là route cũ và route đích, route nào chưa có ghi "(đích)".

| Method | Path | Mô tả | Role tối thiểu |
|---|---|---|---|
| GET/POST | `/orgs/{orgId}/clients` | Danh sách / tạo client (đích, M4 — ORG-03) | editor |
| GET/POST/PATCH | `/orgs/{orgId}/brand-kits[/{id}]` | Brand kit | editor |
| POST | `/orgs/{orgId}/assets/uploads` | Xin presigned URL upload | editor |
| POST | `/orgs/{orgId}/assets/{id}/complete` | Xác nhận upload, enqueue xử lý ảnh | editor |
| GET/POST | `/orgs/{orgId}/events` | Danh sách / tạo event | viewer / editor |
| GET/PATCH/DELETE | `/orgs/{orgId}/events/{eventId}` | Chi tiết / sửa / xoá mềm | viewer / editor / admin |
| POST | `/orgs/{orgId}/events/{eventId}/clone` | Nhân bản (đích, BLD-15 M2) | editor |
| POST | `/orgs/{orgId}/events/{eventId}/guests/import` | Import CSV/XLSX khách mời (có `guests/preview` trước) | editor |
| GET | `/templates` | Danh sách template khả dụng theo gói | viewer |
| POST | `/orgs/{orgId}/events/{eventId}/games` | Thêm game từ template | editor |
| PATCH | `/orgs/{orgId}/games/{gameId}` | Sửa draft config (validate theo `configSchema`) | editor |
| POST | `/orgs/{orgId}/games/{gameId}/publish` | Tạo `game_version` bất biến | editor |
| CRUD | `/orgs/{orgId}/games/{gameId}/prizes` | Giải thưởng (đích; M1 sửa giải qua `PATCH …/campaigns/{id}` rồi phát hành lại; thêm tồn kho khi đang chạy: PRZ-01, M1 Should) | editor |
| POST | `/orgs/{orgId}/prizes/{prizeId}/vouchers/import` | Import mã voucher (đích, PRZ-09 M2) | editor |
| POST | `/orgs/{orgId}/campaigns/{campaignId}/rehearsal-plays` | Một lượt chơi thử trên bản nháp, kho riêng, không vào báo cáo/quota (đã có). Chạy bot N lượt: đích, EVT-09 | `campaign:read` |
| POST | `/orgs/{orgId}/events/{eventId}/draws` | **Bốc thăm cuối chương trình (đích):** chốt pool theo bộ lọc AND/OR → `{ drawId, poolSize, poolHash }` | operator |
| POST | `/orgs/{orgId}/draws/{drawId}/spins` | Commit một lần quay: `seedCommit = sha256(serverSeed ‖ poolHash ‖ spinNo)` công bố trên trang kết quả **trước** khi reveal | operator |
| POST | `/orgs/{orgId}/draws/{drawId}/spins/{spinId}/reveal` | Reveal: server chọn người trúng, ghi `draw_spins` + `awards` trong 1 transaction | operator |
| POST | `/orgs/{orgId}/draws/{drawId}/spins/{spinId}/void` | Huỷ kết quả có lý do (ghi log, không xoá, `spinNo` tăng) | operator |
| GET | `/orgs/{orgId}/campaigns/{campaignId}/stats` | Số liệu chương trình (đã có) | `campaign:read` |
| POST | `/orgs/{orgId}/events/{eventId}/exports` | Yêu cầu export (`players`, `leads`, `winners`, `report_pdf`) (đích, ANL-02) | admin |
| GET | `/orgs/{orgId}/exports/{id}` | Trạng thái + link tải (đích, ANL-02) | admin |
| GET | `/orgs/{orgId}/vouchers/{code}` | Tra mã ở quầy | `voucher:read` (redeemer, operator, viewer…) |
| POST | `/orgs/{orgId}/vouchers/{code}/redeem` | Xác nhận đã trao, một lần, không hoàn tác | `voucher:redeem` |
| POST | `/orgs/{orgId}/vouchers/{code}/reopen` | Mở lại mã đổi nhầm, body `{ reason }` 3–500 ký tự, audit `voucher.reopen` | `voucher:reopen` (chỉ owner) |
| GET | `/orgs/{orgId}/audit-logs` | Nhật ký (đích, ORG-06) | admin |

**Đã có (M1, campaign, `campaignsApi` trong `packages/contracts/src/api/campaigns.ts`):** CRUD `/orgs/{orgId}/campaigns[/{campaignId}]` (draft lưu `playbook` và luật, kể cả `openDays`, `requireRedeemBeforeReplay`, `antiFraud`), `publish`/`pause`/`resume`/`end`, `plays`, `vouchers`, `stats`, `rehearsal-plays` và:

| Method | Path | Mô tả | Quyền |
|---|---|---|---|
| GET | `/orgs/{orgId}/campaigns/{campaignId}/report` | Báo cáo kết quả (PLB-03, [playbooks §3.2](../product/specs/playbooks.md#32-định-nghĩa-chỉ-số)), chỉ dữ liệu live: `visits` (award đã đổi, không void), `uniqueVisitors`, `returningVisitors` (đổi quà ở ≥ 2 ngày địa phương khác nhau), `prizeCostVnd` (Σ giá vốn đã đổi), `outstandingCostVnd` (đã phát, chưa đổi, chưa hết hạn, không void), `costPerVisitVnd`, `redemptionRate` (đã đổi / đã phát không void); `byDay` (mọi ngày từ ngày bắt đầu tới min(hôm nay, ngày kết thúc), ngày trống = 0, tối đa 120 ngày gần nhất; plays/wins theo ngày chơi, visits theo ngày đổi), `byChannel` (`plays.channel_key`; wins/visits qua `awards.play_id`), `byPrize` | `campaign:read` |

**Đích M1 Must ([D-24, D-25](../product/decisions.md); tên route chốt trong PR):**

| Method | Path | Mô tả | Quyền |
|---|---|---|---|
| GET/POST | tra mã theo SĐT trong tổ chức (đích, PRZ-15) | Chỉ trả mã chưa đổi, còn hạn, kèm tên quà, chương trình, `display_name`, không trả SĐT; rate limit theo người/máy; audit `via=phone` | `voucher:redeem` hoặc máy quầy |
| POST | khôi phục "Quà của tôi" (đích, PRZ-16) | SĐT + 4 ký tự cuối của mã; sai → 400 chung; 429 sau 5 lần/giờ theo SĐT hoặc thiết bị | công khai |
| POST | `/orgs/{orgId}/counter-devices` (đích, ORG-10) | Tạo máy quầy, trả mã ghép QR ([ADR-017](../adr/017-counter-device-pairing.md) Proposed) | owner/admin |
| POST | `/counter-devices/pair` (đích, ORG-10) | Đổi mã ghép lấy token thiết bị (cookie httpOnly) | công khai, mã ghép dùng một lần |

**Gói và quota (BIL-01/02, `billingApi` + `adminApi` trong `packages/contracts/src/api/billing.ts`):** hạn mức nằm trong code (`@playora/core/billing`: Free 1 chương trình chạy / 100 lượt đổi quà mỗi tháng / watermark; Quán 3 / 2.000; Chuỗi không giới hạn / 10.000). Tháng = tháng dương lịch theo `Asia/Ho_Chi_Minh`. Không có `org_subscriptions`, `status = expired` hoặc đã qua `currentPeriodEnd` → Free.

| Method | Path | Mô tả | Quyền |
|---|---|---|---|
| GET | `/orgs/{orgId}/billing` | `{ plan, subscription, limits: { maxRunningCampaigns, redemptionsPerMonth, redemptionsHardLimit, watermark }, usage: { runningCampaigns, redemptionsThisMonth, monthStart }, invoices }`; Studio cảnh báo ở 80% và 100% `redemptionsPerMonth` | `billing:read` (mọi vai trò trừ `redeemer`) |
| GET | `/admin/orgs?query=&limit=` | Back-office: tìm tổ chức theo tên, slug, email owner; kèm gói và usage | nhân viên Playora |
| PUT | `/admin/orgs/{orgId}/subscription` | Kích hoạt / đổi gói thủ công `{ plan, status, currentPeriodEnd, note }`; audit `billing.subscription.set` | nhân viên Playora |
| POST | `/admin/orgs/{orgId}/invoices` | Ghi nhận thanh toán thủ công `{ plan, amountVnd, periodStart, periodEnd, paidAt, reference }` → 201; kích hoạt gói tới `periodEnd` (không rút ngắn kỳ dài hơn của cùng gói); audit `billing.invoice.record` | nhân viên Playora |

- **Nhân viên Playora:** route có cờ `platformAdmin: true` trong contract; `PlatformAdminGuard` (sau `SessionGuard`) cho qua khi email của phiên nằm trong env `PLATFORM_ADMIN_EMAILS` (danh sách phân tách bằng dấu phẩy, không phân biệt hoa thường) **và** đã xác minh (`emailVerified`; đăng nhập một lần bằng magic link hoặc Google là xác minh), để không ai đăng ký trước email nhân viên mà hưởng quyền. Khác → 403 `FORBIDDEN`. Audit ghi `actorType: 'admin'`.
- **Chặn số chương trình chạy:** `publish` (khi chương trình sẽ live/scheduled: chưa tạm dừng, `endsAt` trong tương lai) và `resume` → 409 `PLAN_CAMPAIGN_LIMIT` nếu tổ chức đã có đủ `maxRunningCampaigns` chương trình đã phát hành, không tạm dừng, chưa kết thúc (không tính chính nó). Kiểm tra trong transaction phát hành, có advisory lock theo tổ chức.
- **Chặn lượt đổi quà:** `POST …/vouchers/{code}/redeem` cho mã live đang `issued` → 409 `PLAN_REDEMPTION_LIMIT` khi số lượt đổi live trong tháng ≥ `redemptionsHardLimit` = hạn mức + 10% ân hạn ([D-21](../product/decisions.md), nay đã thay bởi D-23). Mã bị chặn giữ nguyên, đổi được ngay khi nâng gói hoặc sang tháng; mã đã đổi / void / hết hạn vẫn trả lỗi của chính nó. Không khoá: hai quầy bấm cùng lúc có thể vượt 1–2 lượt, ân hạn đã bao. Lượt chơi và rehearsal không bao giờ bị giới hạn. **Sẽ thay theo [D-23](../product/decisions.md) (31/10):** bỏ chặn ở `redeem`; chuyển trần cứng sang lúc phát giải (mã còn hiệu lực đã phát + lượt đã đổi trong tháng), xem PRD BIL-02. Mô tả này giữ đúng code hiện tại cho tới khi PR đó merge.

### 2.2 Player (public)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/p/{slug}` | Thông tin event công khai: brand, games (versionId, templateKey@version), identity rule, form |
| POST | `/p/{slug}/otp` | Gửi OTP (phone/email) (đích, EVT-03 M2) |
| POST | `/p/{slug}/join` | Tham gia: identity + form + consents → token phiên, `player` |
| GET | `/p/{slug}/me` | Trạng thái người chơi: lượt còn lại, giải đã trúng |
| POST | `/p/{slug}/games/{gameId}/plays` (đích) | **Instant:** một lần gọi = một lượt; server kiểm điều kiện, quyết định giải, trừ kho → `{ playId, outcome, display, remaining }`. **Skill:** bắt đầu lượt → `{ playId, startedAt, seed }`. Header `Idempotency-Key` bắt buộc ([ADR-012 §4](../adr/012-campaign-architecture.md)) |
| POST | `/p/{slug}/games/{gameId}/plays/{playId}/submit` (đích) | **Skill:** gửi điểm + telemetry → validate → `{ outcome, display, score }` |
| GET | `/p/{slug}/games/{gameId}/leaderboard` (đích) | Leaderboard (skill, đích) |
| GET | `/p/{slug}/prizes` | "Quà của tôi" (đã thay bằng `GET /p/{slug}/me`) |
| GET | `/p/{slug}/draws` | **Trang công bố kết quả bốc thăm (đích):** `poolHash`, `seedCommit` theo `spinNo`, người trúng (che bớt thông tin), lần void kèm lý do; `serverSeed` sau khi kết thúc để ai cũng kiểm chứng được |
| POST | `/p/{slug}/privacy/requests` | Yêu cầu xoá hoặc xuất dữ liệu (đích, CMP-01 M2) |

**Đã có (M1, campaign, `playsApi` trong `packages/contracts/src/api/plays.ts`):** `GET /p/{slug}/campaign` trả bản đã phát hành (không lộ xác suất, tồn kho, giá trị; `phase` tính từ `events.startsAt/endsAt/paused`), `POST /p/{slug}/plays` (body `{ requestId, channel?, captchaToken? }`; `requestId` là khoá idempotent theo người chơi thay cho header `Idempotency-Key`, chưa có `gameId` trong path vì M1 một game/chương trình) trả `PlayResult` `{ playId, outcome: win|lose|no_turns|closed, reason, prize, voucher, turnsLeftToday }`, và `GET /p/{slug}/me` (lượt còn lại hôm nay, `nextTurnAt`, voucher của người chơi) thay cho `/me` + `/prizes` ở bảng trên. Cả ba cần token phiên từ `join` (`Authorization: Bearer`); token của chương trình khác → 403. Join từ chối chương trình đã qua `endsAt` (`EVENT_NOT_LIVE`).

BIL-02: `PublicCampaign.watermark` (true ở gói Free) → Play hiện badge "Tạo bằng Playora" dẫn tới `https://playora.vn/?ref=watermark`.

P1: `PublicCampaign` có thêm `openDays`, `requireRedeemBeforeReplay` và `captchaSiteKey` (khác null khi mức `standard` và API cấu hình Turnstile). Ngày không mở → `closed`, không trừ lượt. Luật "đổi quà trước khi chơi tiếp": người chơi còn voucher chưa đổi (không void, chưa hết hạn) → `no_turns` + `reason: 'redeem_first'`, không trừ lượt; `GET /me` trả `blockedReason: 'redeem_first'`. Mức `standard` cần `captchaToken` (Turnstile) ở lượt chơi đầu của phiên: thiếu/sai → 403 `CAPTCHA_REQUIRED`; giải xong được nhớ 12 giờ theo người chơi. Token phiên ký `ver = players.session_ver`; tăng `session_ver` thu hồi mọi token cũ (401).

### 2.3 Webhook nhận vào (đích)

| Path | Nguồn |
|---|---|
| `/webhooks/payos` | Xác nhận thanh toán (verify checksum) — BIL-03, M2 |
| `/webhooks/zns` | Trạng thái gửi ZNS — M3 |

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
