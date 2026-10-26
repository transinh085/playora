# Kiến trúc hệ thống

Cập nhật: 26/10/2026 · Owner: Tech Lead (founder) · Liên quan: [ADR](../adr/README.md), [data-model.md](./data-model.md), [api.md](./api.md), [conventions.md](./conventions.md), [product/specs/builder.md](../product/specs/builder.md), [operations/environments-deploy.md](../operations/environments-deploy.md)

Tài liệu này mô tả **kiến trúc hiện tại** và **kiến trúc đích**. Chỗ nào chưa có trong code thì ghi rõ "(đích)". Hiện trạng chi tiết và bước tiếp theo ở §10.

---

## 1. Nguyên tắc kiến trúc

1. **TypeScript end-to-end, một nguồn chân lý cho type.** Schema zod trong `packages/contracts` dùng chung cho API, Studio, Player, editor và validate config.
2. **Server-authoritative.** Mọi kết quả có giá trị (trúng giải, điểm, người thắng) do server quyết định hoặc xác thực. Client chỉ hiển thị.
3. **Template + config, không hard-code game.** Lõi nền tảng không biết chi tiết từng game; game cắm vào qua `game-sdk`.
4. **Play API stateless, scale ngang.** Play engine (`instant` + `skill`) và prize engine chạy trong `apps/api`; mọi state nằm ở Postgres (tồn kho, award) và Valkey (rate limit, bộ đếm). Không có kết nối dài hay room state (live engine đã gỡ, [ADR-011](../adr/011-remove-live-engine.md)).
5. **Player siêu nhẹ.** Shell người chơi tối thiểu; game bundle lazy-load; asset qua CDN; chạy tốt trên máy cũ và in-app browser (Zalo, Facebook).
6. **Modular monolith trước, tách service sau.** Chỉ tách `worker` vì khác hẳn đặc tính tải.
7. **Không vendor lock-in nặng.** Docker, PostgreSQL, Redis-compatible, S3-compatible; chạy được trên cloud VN hoặc quốc tế.

---

## 2. Sơ đồ tổng thể

```
                    ┌──────────────────── Cloudflare (DNS, CDN, WAF) ────────────────────┐
                    │                                                                    │
  Chủ quán / nhân   │   Người chơi (điện thoại)            Kiosk (tablet, đích)          │
  viên quầy         │        │                                  │                        │
        │           │        ▼                                  ▼                        │
 ┌──────────────┐   │  ┌────────────────────────────────────────────────┐                │
 │ apps/studio  │   │  │ apps/play (Next.js)                            │                │
 │ builder,     │   │  │  /[slug]  player shell                         │                │
 │ vận hành,    │   │  │  /preview iframe cho editor                    │                │
 │ đổi quà      │   │  │  game bundles (lazy, CDN)                      │                │
 └──────┬───────┘   │  └───────────────────────┬────────────────────────┘                │
        │ REST (cookie)                        │ REST (player session token)             │
        ▼                                      ▼                                         │
 ┌────────────────────────────────────────────────────────────┐                          │
 │ apps/api (NestJS, modular monolith, stateless, N node)     │                          │
 │  auth · org · event · game · asset · guest · public        │                          │
 │  (đích) plays · prizes · vouchers · redeem · draw · stats  │                          │
 │  PLAY ENGINE + PRIZE ENGINE (logic thuần ở packages/core)  │                          │
 └───┬───────────────┬───────────────┬────────────────────────┘                          │
     │               │ enqueue       │                                                   │
     │               ▼               ▼                                                   │
     │        ┌─────────────┐   ┌───────────────────────────────────────────┐            │
     │        │ apps/worker │   │ Valkey: rate limit, idempotency, cache,   │            │
     │        │ BullMQ jobs │──►│ queues                                    │            │
     │        └──────┬──────┘   └───────────────────────────────────────────┘            │
     ▼               ▼                                                                   │
 ┌──────────────────────────┐   ┌──────────────────────┐   ┌────────────────────────────┐│
 │ PostgreSQL (Drizzle)     │   │ S3-compatible (asset,│   │ Ngoài: PayOS/VietQR, Zalo  ││
 │                          │   │ export); MinIO ở dev │   │ ZNS, SMTP, Sentry (đích)   ││
 └──────────────────────────┘   └──────────────────────┘   └────────────────────────────┘│
```

---

## 3. Tech stack

Phiên bản lấy từ `package.json` (pin chính xác, `bunfig.toml` có `exact = true`). Không dùng `latest`.

| Lớp | Lựa chọn | Ghi chú |
|---|---|---|
| Package manager, runtime, test | **Bun 1.4.4** | [ADR-001](../adr/001-monorepo-bun-turborepo.md), [ADR-002](../adr/002-nestjs-on-bun.md) |
| Monorepo | **Turborepo 2.11** | Cache task `build/lint/test/typecheck` |
| Frontend | **Next.js 16.4** (App Router) + **React 19.3** | Studio, Play, Web; `output: 'standalone'` |
| UI | **Ant Design 6.6** + `@playora/ui/{providers,theme,form,game}`; Tailwind CSS 4.3 chỉ cho layout; icon `lucide-react` | [ADR-013](../adr/013-antd-ui.md); shadcn/Radix đã gỡ |
| Data fetching | **TanStack Query 5** qua `@playora/api-client/react` (typed từ contract, không codegen) | [ADR-008](../adr/008-contract-first-api.md) |
| Form | antd `Form` + `useZodForm(<contract schema>)`; game config dùng `AutoForm` sinh từ zod | [ADR-013](../adr/013-antd-ui.md) |
| i18n | **next-intl 4** (vi chuẩn, en) | Studio và Play |
| Game rendering | DOM/CSS + SVG cho vòng quay, cào thẻ, mở hộp; canvas 2D/PixiJS cho game skill (đích, chưa thêm dependency) | Chọn khi làm `catch-items` |
| Canvas màn chơi | Editor DOM tự viết, một renderer cho Play và Studio | [ADR-014](../adr/014-free-canvas-screen-editor.md) |
| Backend | **NestJS 12.2** (ESM) trên Bun | |
| Validation | **zod 4.6** qua `@Route(contract)` / `@Args()` | [ADR-005](../adr/005-zod-contracts.md) |
| ORM | **Drizzle ORM 0.45** + drizzle-kit 0.31, driver `postgres` 3.4 | [ADR-003](../adr/003-drizzle-postgres.md) |
| Database | **PostgreSQL 17** | JSONB cho config |
| Cache, queue | **Valkey 8** (Redis-compatible), `ioredis` 6, **BullMQ 6** | |
| Auth organizer | **Better Auth 1.7** (plugin `organization`, Google) | [ADR-006](../adr/006-better-auth.md) |
| Auth người chơi | Token phiên ký HMAC (`packages/core/src/session`, `PLAYER_SESSION_SECRET`, hạn 24 h, có `ver` để thu hồi) | [ADR-012](../adr/012-campaign-architecture.md) |
| Storage | S3-compatible qua `Bun.S3Client` (presigned upload/GET); MinIO ở dev; worker xử lý ảnh bằng **sharp** | Production: R2 hoặc S3 tại VN (xem operations) |
| Email | SMTP (Mailpit ở dev) | Nhà cung cấp production chưa chọn |
| SMS/ZNS | (đích) interface `NotificationProvider`, chọn nhà cung cấp khi bật OTP | |
| Payment | (đích) PayOS (VietQR) | |
| Lint/format | **Biome 2.6** · TypeScript **6.0.3** | [ADR-007](../adr/007-typescript-6.md) |
| Test | `bun test`, **Playwright** (e2e), k6 (đích, `tooling/loadtest` mới có README) | [ADR-010](../adr/010-testing-strategy.md) |
| Log | `nestjs-pino` | |
| Observability, analytics | (đích) Sentry, OpenTelemetry, PostHog | §11 |
| CI/CD | GitHub Actions (`check`, `e2e`, `docker`) | [operations/environments-deploy.md](../operations/environments-deploy.md) |

---

## 4. Cấu trúc monorepo

```
playora/
├── apps/
│   ├── web/        Next.js: landing, /design-system
│   ├── studio/     Next.js: builder, vận hành chương trình, đổi quà
│   ├── play/       Next.js: /[slug] player shell, /preview cho editor
│   ├── api/        NestJS: REST /v1, Better Auth /auth, OpenAPI
│   └── worker/     NestJS standalone: BullMQ processors
├── packages/
│   ├── contracts/  zod: route contracts, ErrorCode — NGUỒN CHÂN LÝ
│   ├── api-client/ typed client + hook TanStack Query (./react)
│   ├── db/         Drizzle schema, migrations (drizzle/), seed, ./testing
│   ├── auth/       Better Auth options + RBAC (./permissions)
│   ├── jobs/       định nghĩa job BullMQ dùng chung API/worker
│   ├── core/       logic thuần, không I/O: prize/, draw/, registration/, session/
│   ├── game-sdk/   defineTemplate, kiểu instant/skill, preview harness
│   ├── templates/  registry template (client + ./server); hiện có spin-wheel
│   ├── ui/         theme, providers, form, auto-form, game components, styles.css
│   ├── i18n/       messages vi/en
│   ├── env/        zod env schema theo app
│   └── tsconfig/   base, library, nestjs, nextjs
├── tooling/        e2e (Playwright) · loadtest (k6, đích) · scripts
├── infra/          compose (dev) · docker (Dockerfile.nest, Dockerfile.next)
└── docs/
```

### 4.1 Quy tắc phụ thuộc

```
apps/*            → packages/*            (không app nào import app khác)
packages/core     → contracts             (không I/O, không framework)
packages/db       → (drizzle, postgres)   (không import Nest/Next)
templates         → game-sdk, contracts, ui (phần player), core (phần server)
game-sdk          → contracts
ui                → (react, antd, tailwind) không biết gì về API
```

Ranh giới được Biome `noRestrictedImports` cưỡng chế; danh sách đầy đủ ở [conventions.md §1](./conventions.md#1-bản-đồ-repo).

### 4.2 Internal packages

- Package nội bộ export trực tiếp TypeScript source (`"exports": { ".": "./src/index.ts" }`), không build riêng. Next.js dùng `transpilePackages`, Bun chạy TS trực tiếp.
- App NestJS build bằng `bun build`; package nội bộ được gộp vào bundle. Nếu phải chạy trên Node ([ADR-002](../adr/002-nestjs-on-bun.md)), không đổi code.

---

## 5. Game runtime và template system

> Đặc tả nghiệp vụ của builder (flow chuẩn, ô thay thế, skin, canvas, khoá sau publish) ở [product/specs/builder.md](../product/specs/builder.md). Phần dưới là interface kỹ thuật; nguồn chân lý là `packages/game-sdk/src`.

### 5.1 `game-sdk`

Theo [ADR-012 §3](../adr/012-campaign-architecture.md):

- `GameKind = 'instant' | 'skill'`. Bốc thăm cuối chương trình là tính năng nền tảng (`packages/core/src/draw`), không phải template.
- `defineTemplate` là union theo `kind`: `instant` có `InstantServerModule.present(outcome, config, rng)` để biến kết quả của prize engine thành dữ liệu hiển thị (ví dụ ô dừng của vòng quay); `skill` có `SkillServerModule` (`submissionSchema`, `validate`, `qualifies`).
- Player surface chỉ nói chuyện với `PlaySession` (`start`, `submit`, `result`, `remaining`, `blockedReason`), không biết API.
- Màn Cover / Form / Kết quả / Quà của tôi thuộc **shell của Play**, không thuộc template. Với canvas ([ADR-014](../adr/014-free-canvas-screen-editor.md)), template chỉ vẽ cơ chế bên trong khung `gameStage`.
- `configSchema` (zod + metadata UI) sinh form editor; `hotEditable` đánh dấu field sửa được khi đang chạy.

### 5.2 Versioning và publish

- `games.draft_config` là bản nháp; **publish** tạo bản ghi bất biến `game_versions` (config snapshot, `template_key@version`, `config_hash`). `games.hot_config` giữ phần sửa nóng.
- Player, Kiosk và Play API luôn load theo `game_version_id`, nên sửa nháp không ảnh hưởng chương trình đang chạy.
- Template có breaking change thì tăng major và viết `migrate(configV1) → configV2` trong template.

### 5.3 Tải game ở player

1. `GET /v1/p/{slug}` trả về chương trình, brand kit và danh sách game kèm `templateKey@version`.
2. Registry (`packages/templates`) gọi `import()` động bundle của template (lazy, `Suspense`).
3. Asset preload theo manifest (ảnh nhỏ trước, âm thanh sau).

---

## 6. Play engine (trên `apps/api`)

> **Đã có (instant-win):** module `apps/api/src/modules/plays/` cài đường nóng của [ADR-012 §4](../adr/012-campaign-architecture.md) cho campaign (một game/chương trình, ADR-015): `GET /p/:slug/campaign`, `POST /p/:slug/plays`, `GET /p/:slug/me` và `POST /orgs/:orgId/campaigns/:id/rehearsal-plays`. Ngoài transaction: token người chơi (`SessionGuard`, `auth: 'player'`) phải thuộc đúng chương trình, chỗ móc chống gian lận `checkAntiFraud` (EVT-13, chưa làm), pha tạm dừng/chưa mở/đã kết thúc trả `closed` mà không trừ lượt. Trong một transaction: khoá dòng `players` (tuần tự hoá lượt của một người, giữ giới hạn/người và idempotency theo `requestId`), giành lượt bằng upsert có điều kiện trên `play_counters`, snapshot, `decide()` với `crypto.randomInt` (ghi `rngProof`), trừ kho `UPDATE … WHERE remaining > 0`; khi có ngân sách, người trúng khoá `games` (`FOR NO KEY UPDATE`) rồi đọc lại Σ issued×valueVnd trước khi trừ kho. Thua race → `out_of_stock`/`budget`, không chọn lại. Lịch chạy lấy từ `events.startsAt/endsAt` (End dời `endsAt`). Chạy thử dùng bản nháp, kho riêng (số lượng nháp − award `rehearsal`), không đổi số liệu live. Chưa có: skill (`submit`), `voucher_codes`, `prize_counters`, `session_ver`. Luồng chi tiết theo request ở [api.md §3](./api.md#3-luồng-chơi-campaign).

### 6.1 Mô hình

- **Instant:** `POST /v1/p/{slug}/games/{gameId}/plays` (header `Idempotency-Key`). Một lần gọi = một lượt: kiểm tra điều kiện, gọi prize engine, trừ kho trong một transaction, trả `{ playId, outcome, display, remaining }` **trước** khi client animate.
- **Skill:** `POST …/plays` bắt đầu lượt (lượt được tính ngay, trả `seed`), rồi `POST …/plays/{playId}/submit`; server gọi `SkillServerModule.validate` (thời lượng theo server, điểm tối đa, plausibility) rồi mới xét giải.
- **Stateless:** API không giữ state theo chương trình trong bộ nhớ; scale bằng cách thêm node. Tranh chấp tồn kho giải bằng update có điều kiện trên Postgres (§7.3).
- **Lượt bị gắn cờ** (chống gian lận) không được phát giải; ghi lý do vào `plays`.

### 6.2 Tải mục tiêu

| Chỉ số | Pilot | Sau |
|---|---|---|
| Đỉnh lượt chơi/giây/chương trình | 500 `[GĐ]` | 2.000 `[GĐ]` |
| p95 quyết định kết quả + trừ kho | < 200 ms | < 200 ms |
| Lỗi 5xx khi đỉnh | 0 | 0 |

Kiểm bằng k6 nhắm Play API (`tooling/loadtest`, chưa viết).

### 6.3 Đồng hồ server

Thời lượng game skill, khung giờ và pacing tính theo giờ server và timezone của chương trình (`events.timezone`, mặc định `Asia/Ho_Chi_Minh`); client chỉ dùng để hiển thị đếm ngược.

---

## 7. Prize engine (`packages/core/src/prize`)

> Đã có: `decide.ts`, `schedule.ts`, `simulate.ts`, có test. Danh sách đầy đủ chế độ, pacing và Prize Simulator ở [product/specs/prizes-redemption.md](../product/specs/prizes-redemption.md).

### 7.1 Chế độ chọn giải cho instant-win

| Chế độ | Mô tả |
|---|---|
| `per_prize_probability` | Mỗi giải có xác suất riêng (tổng ≤ 100%) |
| `overall_win_rate` | Tỷ lệ trúng tổng; khi trúng, chọn giải theo tỷ lệ số lượng còn lại |
| `guaranteed` | Mỗi người chắc chắn trúng một giải (theo tồn kho) |

### 7.2 Ràng buộc áp trước khi chọn

1. **Tồn kho:** `remaining > 0`.
2. **Pacing:** với giải tổng Q trong khoảng [start, end], tại thời điểm t chỉ cho phép `issued < ceil(Q × progress(t)) + buffer`.
3. **Giới hạn người chơi:** tối đa N giải/người; tối đa M giải loại X/người.
4. **Ngân sách tổng** theo `valueVnd`.
5. **Ngưỡng điểm** (skill): giải chỉ mở khi `score ≥ threshold`.

### 7.3 Cấp giải nguyên tử

```sql
-- trong transaction
UPDATE prizes
   SET remaining = remaining - 1, issued = issued + 1
 WHERE id = $1 AND remaining > 0
RETURNING id;
-- 0 rows → coi là out_of_stock/lose; KHÔNG chọn lại giải khác trong cùng lượt (ADR-012 §4)
INSERT INTO awards (...) VALUES (...);
-- voucher: SELECT … FROM voucher_codes WHERE prize_id = $1 AND award_id IS NULL LIMIT 1 FOR UPDATE SKIP LOCKED
```

- **Idempotency:** mỗi lượt có `client_request_id` unique; mỗi `play` chỉ có tối đa một award.
- **RNG:** `crypto.randomInt` trên server; ghi `rng_proof` cho từng lượt để audit.
- **Tối ưu khi nóng:** nếu tranh chấp dòng `prizes` quá cao, chia kho thành N bucket hoặc dùng bộ đếm Valkey + outbox. Chỉ làm khi load test cho thấy cần.

---

## 8. Xác thực và phân quyền

- **Organizer:** Better Auth mount trong `apps/api` tại `/auth/*`. Production: session cookie domain `.playora.vn`, `SameSite=Lax`, `Secure`. Studio gọi API qua cùng domain cha.
- **RBAC:** vai trò `owner`, `admin`, `editor`, `operator`, `viewer` (`packages/auth/src/permissions.ts`). Contract khai báo `permission`; `OrgAccessGuard` kiểm tra membership và quyền. (đích) vai trò "chỉ đổi quà" cho nhân viên quầy.
- **Cô lập tenant:** mọi repository nhận `organizationId` **đầu tiên** và lọc mọi truy vấn theo nó; guard là lớp bảo vệ thứ hai, không phải duy nhất. Mỗi module API có test cross-tenant. Cân nhắc Postgres RLS cho bảng PII về sau.
- **Người chơi:** `POST /v1/p/{slug}/join` trả token phiên ký HMAC (`signPlayerSession`, claims `{ kind, organizationId, eventId, sub, displayName, ver, exp }`, hạn 24 h), gửi qua header `Authorization`. `ver` dùng để thu hồi (đích: cột `players.session_ver`).
- **Nhân viên:** organizer session có quyền trên chương trình (bốc thăm, chạy thử, đổi quà).

---

## 9. Background jobs (`apps/worker`)

Khai báo ở `packages/jobs/src/definitions.ts`; TypeScript buộc mọi job có processor.

| Job | Trạng thái | Ghi chú |
|---|---|---|
| `asset.process` | Có | Resize, nén, sinh biến thể ảnh (sharp) |
| `event.export` | Khai báo | Export CSV/XLSX, upload storage, link hết hạn |
| Thông báo (email, ZNS, SMS) | Đích | Retry có backoff; DLQ |
| Webhook gửi ra | Đích | Ký HMAC, retry 24 h |
| Rollup analytics | Đích | Cron |
| Billing | Đích | Đối soát thanh toán, hết hạn gói |
| Retention | Đích | Xoá hoặc ẩn danh PII hết hạn lưu trữ |

---

## 10. Hiện trạng và bước tiếp theo (26/10/2026)

| Mảng | Hiện trạng |
|---|---|
| API | Module `assets`, `brand-kits`, `campaigns`, `events`, `games`, `guests`, `health`, `me`, `openapi`, `plays`, `public`, `templates`, `vouchers`. Public API: `GET /p/:slug`, `POST /p/:slug/join`, `GET /p/:slug/campaign`, `POST /p/:slug/plays`, `GET /p/:slug/me` (token người chơi `Authorization: Bearer`); Studio chạy thử `POST /orgs/:orgId/campaigns/:id/rehearsal-plays` |
| DB | Bảng `clients`, `brand_kits`, `events`, `games`, `game_versions`, `guest_list_entries`, `players`, `consents`, `prizes`, `draw_spins`, `awards`, `assets`, `audit_logs` + bảng Better Auth. Chưa có `plays`, `play_counters`, `voucher_codes` |
| Core | Prize engine, draw provably-fair, registration/consent, player session: có test, **chưa được API gọi** |
| Templates | `spin-wheel` |
| Studio | Một mô hình **Campaign** trên API thật (`features/builder-lab`, hook ở `api.ts`): chương trình, editor 3 chế độ (Sửa nhanh, Tuỳ biến canvas, Luật & giải), chạy thử, trang vận hành, quầy đổi quà. Gói & sử dụng ở `/orgs/:orgId/settings/billing` (cảnh báo 80%/100% trên Trang chủ, quầy đổi quà, publish/tiếp tục) và back-office nội bộ `/admin` (`features/billing`). UI sự kiện/trò chơi/khách mời cũ (`/events/**`, `features/events|games|guests`) **đã gỡ** (27/10); module API `events`/`games`/`guests` vẫn giữ vì Campaign lưu trên các bảng đó (ADR-015) |
| Play | `/`, `/preview`, `/[slug]` (dừng ở phòng chờ sau khi join) |

**Bước tiếp theo** (theo [product/roadmap.md](../product/roadmap.md)):

1. Contract + API thật cho chương trình, lượt chơi, voucher, đổi quà, thống kê (`campaigns`/`plays`/`vouchers`/`stats`), thay `mock/api.ts` bằng `useRouteQuery`/`useRouteMutation`. Cần ADR chốt cách lưu Campaign (trên `events` + `games` + `game_versions` hay bảng mới).
2. Migration `plays`, `play_counters`, `voucher_codes`, `players.session_ver`.
3. Play runtime thật: Game → Kết quả → Quà của tôi.
4. Test 1 triệu lượt mô phỏng + k6 Play API trước pilot.

---

## 11. Observability (đích)

- **Trace:** OpenTelemetry cho Nest (HTTP, pg, ioredis), propagate tới worker.
- **Metric chính:** `play_rate{event}`, `play_draw_latency_ms`, `play_rejected_total{reason}`, `prize_stock_remaining`, `prize_pacing_deviation`, `event_loop_lag_ms`, `job_failed_total`.
- **Dashboard nội bộ** cho từng chương trình đang chạy: lượt/giây, độ trễ, lỗi, giải còn lại so với kế hoạch, tỷ lệ gắn cờ. Alert qua Telegram.
- **Sentry** cho Studio, Play và backend.

Hiện có: log JSON `nestjs-pino` kèm `x-request-id`, health `/health` và `/health/ready`.

---

## 12. Bất biến không được đơn giản hoá

Dù làm tối giản tới đâu, những thứ sau phải có ngay từ chương trình thật đầu tiên (nợ kỹ thuật ở đây là rủi ro uy tín hoặc pháp lý):

- Server-authoritative: client không bao giờ quyết định kết quả.
- Trừ tồn kho/ngân sách nguyên tử; idempotency cho mỗi lượt.
- Chống gian lận mức Chuẩn ([security.md §1](./security.md#1-chống-gian-lận)).
- Chạy thử chương trình bằng dữ liệu `rehearsal`, không trừ kho thật.
- Consent theo PDPL ([business/compliance.md](../business/compliance.md)).
- Audit log cho thao tác trên giải, bốc thăm, export.
- Test cross-tenant cho mọi module API.

---

## 13. Quyết định kiến trúc

Xem [adr/README.md](../adr/README.md).
