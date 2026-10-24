# 05 — Kiến trúc hệ thống

Cập nhật: 24/10/2026 · Owner: Tech Lead · v2.1: bỏ realtime/live engine ([ADR-011](./adr/011-remove-live-engine.md))

> **Trạng thái code (còn phải gỡ):** `apps/realtime`, `packages/realtime-client`, module `live` + `screens` trong `apps/api`, contract `live`/`screens`/`ws`, schema live (`live_rounds`, `round_scores`, `event_screens`), Play `/screen`, Studio `events/[eventId]/screens`, template `tap-race` và kiểu `live`/`screen`/`host` trong `game-sdk` vẫn còn trên `main`. Chore `remove live engine` ([09](./09-roadmap-plan.md) story 1.0) xoá chúng sau khi tạo tag `archive/live-engine`. Tài liệu này mô tả **kiến trúc đích**.

---

## 1. Nguyên tắc kiến trúc

1. **TypeScript end-to-end, một nguồn chân lý cho type.** Schema zod trong `packages/contracts` dùng chung cho API, Studio, Player, editor và validate config.
2. **Server-authoritative.** Mọi kết quả có giá trị (trúng giải, điểm, người thắng) do server quyết định hoặc xác thực. Client chỉ hiển thị.
3. **Template + config, không hard-code game.** Lõi nền tảng không biết chi tiết từng game; game cắm vào qua `game-sdk`.
4. **Play API stateless, scale ngang.** Play engine (`instant` + `skill`) và prize engine chạy trong `apps/api`; mọi state nằm ở Postgres (tồn kho, award) và Valkey (rate limit, bộ đếm). Không có kết nối dài hay room state.
5. **Player siêu nhẹ.** Shell player tối thiểu; game bundle lazy-load; asset qua CDN; chạy tốt trên máy cũ và in-app browser.
6. **Modular monolith trước, tách service sau.** Chỉ tách `worker` vì khác hẳn đặc tính tải. API là modular monolith (NestJS modules), gồm cả play engine và prize engine.
7. **Không vendor lock-in nặng.** Docker, PostgreSQL, Redis, S3-compatible; chạy được trên cloud VN hoặc quốc tế.

---

## 2. Sơ đồ tổng thể

```
                    ┌──────────────────── Cloudflare (DNS, CDN, WAF) ────────────────────┐
                    │                                                                    │
  Organizer/Staff   │   Player (mobile)                  Kiosk (tablet, M3)              │
   (desktop/mobile) │        │                                  │                        │
        │           │        ▼                                  ▼                        │
 ┌──────────────┐   │  ┌────────────────────────────────────────────────┐                │
 │ apps/studio  │   │  │ apps/play (Next.js)                            │                │
 │ dashboard,   │   │  │  /[slug]  player shell (?mode=kiosk ở M3)      │                │
 │ editor, giải,│   │  │  /preview iframe cho editor                    │                │
 │ bốc thăm (M2)│   │  │  game bundles (lazy, CDN)                      │                │
 │ /redeem (M2) │   │  └───────────────────────┬────────────────────────┘                │
 └──────┬───────┘   │                          │ REST (playerToken / playToken)          │
        │ REST (cookie)                        ▼                                         │
        ▼                                                                                │
 ┌────────────────────────────────────────────────────────────┐                          │
 │ apps/api (NestJS, modular monolith, stateless, N node)     │                          │
 │  auth · org · event · game · asset · player                │                          │
 │  PLAY ENGINE (instant + skill) · PRIZE ENGINE · anti-fraud │                          │
 │  draw (bốc thăm cuối chương trình) · analytics · billing   │                          │
 │  admin · webhook · public (trang công bố kết quả)          │                          │
 └───┬───────────────┬───────────────┬────────────────────────┘                          │
     │               │ enqueue       │                                                   │
     │               ▼               ▼                                                   │
     │        ┌─────────────┐   ┌───────────────────────────────────────────┐            │
     │        │ apps/worker │   │ Redis/Valkey: rate limit, idempotency,    │            │
     │        │ BullMQ jobs │──►│ cache, queues, ZSET leaderboard (skill)   │            │
     │        └──────┬──────┘   └───────────────────────────────────────────┘            │
     ▼               ▼                                                                   │
 ┌──────────────────────────┐   ┌──────────────────────┐   ┌────────────────────────────┐│
 │ PostgreSQL (Drizzle)     │   │ S3/R2 (assets,       │   │ External: PayOS/VietQR,    ││
 │ + PgBouncer              │   │ exports)             │   │ Zalo ZNS, SMS, Email (SES/ ││
 └──────────────────────────┘   └──────────────────────┘   │ Resend), PostHog, Sentry   ││
                                                           └────────────────────────────┘│
```

---

## 3. Tech stack

| Lớp | Lựa chọn | Lý do / ghi chú |
|---|---|---|
| Package manager + runtime + test | **Bun 1.4.4** (pin trong `packageManager`) | Cài đặt nhanh, workspaces, `bun test`, chạy TS trực tiếp. Xem ADR-002 về runtime cho NestJS |
| Monorepo orchestration | **Turborepo 2.11** | Cache task, pipeline `build/lint/test/typecheck`, filter theo package bị ảnh hưởng |
| Frontend framework | **Next.js 16.4** (App Router) + React 19.3 | SSR/RSC cho Studio và marketing; `output: 'standalone'` để self-host |
| UI | **Tailwind CSS v4** + **shadcn/ui** (Radix) + lucide | Tốc độ dựng dashboard; design tokens dùng chung |
| Data fetching | **TanStack Query** + `@playora/api-client` (typed từ zod contract, không codegen; ADR-008) | Type-safe, cache, optimistic update |
| Form | **react-hook-form** + zod resolver; **form tự sinh từ zod schema** cho game config | Một schema cho validate client, server và editor |
| State (editor/runtime) | **Zustand** | Nhẹ, dùng được ngoài React (game loop) |
| Game rendering | **PixiJS v8** (game hành động: hứng quà, đập logo), DOM/CSS + **Motion** (vòng quay, cào thẻ, mở hộp, UI) | Nhẹ hơn Phaser; WebGL/WebGPU; tree-shake được |
| Backend framework | **NestJS 12.2** (thuần ESM) | Module hoá, DI, guard/interceptor, ecosystem |
| Validation | **zod 4.6** + `ZodValidationPipe` tự viết (`nestjs-zod` chưa hỗ trợ Nest 12; ADR-005) | DTO từ contracts, sinh OpenAPI |
| ORM | **Drizzle ORM 0.45** + **drizzle-kit 0.31** (migrations), driver `postgres` 3.4 (ADR-003) | Type-safe SQL, migration SQL rõ ràng; postgres.js chạy cả Bun và Node |
| Database | **PostgreSQL 17+** (managed), **PgBouncer** (transaction pooling) | JSONB cho config, partition cho analytics |
| Cache / queue | **Valkey/Redis 7+**; **BullMQ** | Rate limit, idempotency key, ZSET leaderboard (skill), job queue |
| Auth (organizer) | **Better Auth** (Drizzle adapter, plugin `organization`, magic link, Google; SSO ở M4) | Self-host, sở hữu dữ liệu, có multi-tenant |
| Auth (player) | JWT ngắn hạn theo event (jose), ký và xác thực bởi API (`playerToken`, `playToken`) | Không cần tài khoản; hợp custom domain |
| Storage | **Cloudflare R2** (S3 API), presigned upload; **sharp** trong worker để tạo biến thể ảnh | Không phí egress; CDN sẵn |
| Email | Resend hoặc AWS SES; React Email cho template | |
| SMS/ZNS | Nhà cung cấp ZNS/SMS brandname VN (chọn trước M3, khi bật OTP) qua interface `NotificationProvider` | Pass-through cost |
| Payment | **PayOS** (VietQR) trước; Stripe cho thẻ quốc tế (M4) | Phổ biến tại VN, webhook rõ ràng |
| i18n | **next-intl** (vi, en) | |
| Lint/format | **Biome 2.6** · TypeScript **6.0** (chưa lên 7, ADR-007) | Nhanh, một tool cho lint và format |
| Test | `bun test` (unit), **Playwright** (e2e), **k6** (load: Play API HTTP) | |
| Observability | **OpenTelemetry** → Grafana (Tempo/Loki/Prometheus) hoặc Grafana Cloud; **Sentry** (FE+BE); **pino** log | |
| Product analytics | **PostHog** | Funnel Studio, feature flags |
| CI/CD | **GitHub Actions** + Docker (GHCR) + deploy qua **Kamal 2** hoặc **Dokploy** lên VM | Đơn giản giai đoạn đầu; lên Kubernetes khi cần |

> **Phiên bản:** đã pin chính xác lúc scaffold (23/10/2026). Xem `docs/adr/` và `package.json` từng app. Không dùng `latest`.

---

## 4. Cấu trúc monorepo

```
playora/
├── apps/
│   ├── web/                 # Next.js: marketing, bảng giá, template gallery (demo chơi thử)
│   ├── studio/              # Next.js: dashboard, editor, giải, bốc thăm (M2), staff đổi quà (M2), (MVP) admin
│   ├── play/                # Next.js: player shell /[slug] (kiosk ?mode=kiosk ở M3), /preview cho editor
│   ├── api/                 # NestJS: REST API, auth, play engine, prize engine, anti-fraud, draw, billing, webhooks
│   └── worker/              # NestJS standalone: BullMQ processors
├── packages/
│   ├── db/                  # Drizzle schema, migrations, seed, createDb()
│   ├── contracts/           # zod: REST DTO, enums, error codes
│   ├── core/                # domain thuần, không I/O: prize engine, pacing, quota, provably-fair (draw), scoring
│   ├── game-sdk/            # defineTemplate, types, hooks (useGameSession), harness
│   ├── templates/           # registry key@version → loader (client & server); danh sách template theo gói
│   ├── games/               # (đích) mỗi template một package
│   │   ├── spin-wheel/
│   │   ├── scratch-card/
│   │   ├── gift-box/
│   │   ├── catch-items/
│   │   └── lucky-draw/ …    # bốc thăm cuối chương trình (M2)
│   ├── ui/                  # shadcn/ui, tokens, components dùng chung, auto-form từ zod
│   ├── api-client/          # typed client từ zod contract + TanStack Query hooks (ADR-008)
│   ├── auth/                # Better Auth server config + client helpers
│   ├── jobs/                # định nghĩa job BullMQ dùng chung API/worker
│   ├── i18n/                # messages vi/en
│   ├── env/                 # zod env schema theo app
│   └── tsconfig/            # base, nextjs, nestjs, library
├── tooling/
│   ├── loadtest/            # k6: join, play instant/skill, draw (Play API)
│   ├── bots/                # bot giả lập người chơi (chạy thử campaign và test)
│   ├── e2e/                 # Playwright
│   └── scripts/             # check-commit-msg, gen:template (M1)
├── infra/
│   ├── docker/              # Dockerfile.next, Dockerfile.nest
│   ├── compose/             # docker-compose.dev.yml (postgres, redis, minio, mailpit)
│   └── deploy/              # Kamal/Dokploy config theo môi trường
├── docs/
├── biome.json
├── turbo.json
├── bunfig.toml
└── package.json             # "workspaces": ["apps/*", "packages/*", "packages/games/*"]
```

> Còn phải gỡ khỏi cây hiện tại: `apps/realtime/`, `packages/realtime-client/`, `packages/templates/src/tap-race.tsx` (xem đầu file).

### 4.1 Quy tắc phụ thuộc (enforce bằng lint rule hoặc dependency-cruiser)

```
apps/*            → packages/*            (không app nào import app khác)
packages/core     → contracts             (không I/O, không framework)
packages/db       → (drizzle, postgres)   (không import Nest/Next)
packages/games/*  → game-sdk, contracts, ui (phần player), core (phần server)
game-sdk          → contracts
ui                → (react, radix, tailwind)
```

### 4.2 Internal packages

- Package nội bộ export trực tiếp TypeScript source (`"exports": { ".": "./src/index.ts" }`), không build riêng. Next.js dùng `transpilePackages`, Bun chạy TS trực tiếp.
- Nếu một app NestJS phải chạy trên Node (ADR-002), app đó build bằng `tsdown`/SWC thành một bundle. Package nội bộ được bundle vào.

---

## 5. Game runtime & template system

> Đặc tả nghiệp vụ của builder (flow chuẩn, asset slots, skin, khoá sau publish, extension) ở [12-builder-spec.md](./12-builder-spec.md). Phần dưới là interface kỹ thuật.

### 5.1 `game-sdk`: interface chính

```ts
// packages/game-sdk/src/define.ts
export type GameKind = 'instant' | 'skill';   // v2.1: bỏ 'live'; bốc thăm là tính năng nền tảng; 'display' thêm ở M4 (ADR-012 §3)

export interface TemplateDefinition<C extends z.ZodTypeAny, S = unknown> {
  key: string;                      // 'spin-wheel'
  version: `${number}.${number}.${number}`;
  kind: GameKind;
  meta: { name: LocalizedText; description: LocalizedText; thumbnail: string; tags: string[] };
  configSchema: C;
  defaultConfig: z.infer<C>;
  editor?: EditorLayout;            // gợi ý nhóm field và widget đặc biệt (asset picker, color, list)
  surfaces: {
    player?: () => Promise<{ default: ComponentType<PlayerProps<z.infer<C>>> }>;  // dùng cho cả Player và Kiosk
  };
  server?: () => Promise<{ default: ServerModule<z.infer<C>, S> }>;
}

export const defineTemplate = <C extends z.ZodTypeAny, S>(d: TemplateDefinition<C, S>) => d;
```

```ts
// Props cho surface player
export interface PlayerProps<C> {
  config: C;                        // snapshot bất biến của game version đã publish
  brand: BrandKit;
  assets: AssetResolver;            // assetId → URL CDN theo kích thước
  session: GameSession;             // start(), draw(), submit(), onAward(cb)
  locale: 'vi' | 'en';
  quality: 'high' | 'low';          // máy yếu: giảm hiệu ứng
}
```

```ts
// Server module cho instant game (chạy trong apps/api): chỉ map kết quả prize engine → hiển thị
export interface InstantServerModule<C> {
  kind: 'instant';
  present(input: { config: C; outcome: PrizeOutcome }): { slotIndex?: number; variant?: string };
}

// Server module cho skill game (chạy trong apps/api)
export interface SkillServerModule<C> {
  kind: 'skill';
  submissionSchema: z.ZodTypeAny;
  validate(input: { config: C; play: PlayRecord; submission: unknown; serverNow: number }):
    { ok: true; score: number } | { ok: false; reason: CheatReason };
}
```

### 5.2 Versioning và publish

- `games.config` là bản nháp; **publish** tạo bản ghi bất biến `game_versions` (config snapshot, `template_key@version`, hash).
- Player, Kiosk và Play API luôn load theo `game_version_id`, nên sửa nháp không ảnh hưởng campaign đang chạy.
- Template có breaking change thì tăng major và viết `migrate(configV1) → configV2` trong template.

### 5.3 Tải game ở player

1. `GET /p/{slug}` (SSR shell rất nhẹ) trả về event, brand kit và danh sách game kèm `templateKey@version`.
2. Registry (`packages/templates`) gọi `import()` động bundle của template (code-split theo template, cache CDN bất biến theo hash).
3. Asset preload theo manifest (ưu tiên ảnh nhỏ, sau đó âm thanh).

---

## 6. Play engine (trên `apps/api`)

> v2.1: thay cho mục "Realtime" cũ. Live engine (room, Socket.IO, HAProxy hash) đã bỏ, xem [ADR-011](./adr/011-remove-live-engine.md).

### 6.1 Mô hình

- **Phiên chơi:** `POST /games/{gameId}/plays` kiểm participation (lượt theo ngày/tổng, khung giờ, trần người chơi) và anti-fraud (rate limit, Turnstile, thiết bị), rồi ghi `plays(status=started)` và trả `playToken` (JWT ngắn hạn, dùng một lần). Luồng chi tiết ở [07 §3](./07-api-realtime.md#3-luồng-chơi-campaign).
- **Instant:** `POST /plays/{id}/draw` gọi prize engine trong một transaction, trả kết quả **trước** khi client animate.
- **Skill:** `POST /plays/{id}/submit` gọi `SkillServerModule.validate` (thời lượng theo server, điểm tối đa theo seed, plausibility), rồi mới xét giải (`score_threshold`).
- **Stateless:** API không giữ state theo campaign trong bộ nhớ; scale bằng cách thêm node sau load balancer (round-robin). Tranh chấp tồn kho được giải bằng row lock Postgres (§7.3).
- **Lượt bị gắn cờ** (anti-fraud) không được phát giải; ghi `plays.reject_reason`.

### 6.2 Tải mục tiêu

| Chỉ số | M1 | M4 |
|---|---|---|
| Đỉnh lượt chơi/giây/campaign | 500 | 2.000 |
| p95 quyết định kết quả + trừ kho | < 200 ms | < 200 ms |
| Lỗi 5xx khi đỉnh | 0 | 0 |

Kiểm bằng k6 (`tooling/loadtest`) nhắm Play API (PRD §8.3), không còn k6 WebSocket.

### 6.3 Đồng hồ server

- Thời lượng game skill, khung giờ và pacing tính theo giờ server (`serverNow`) và timezone của campaign; client chỉ dùng để hiển thị đếm ngược.

---

## 7. Prize engine (`packages/core/prize`)

> Danh sách đầy đủ chế độ quyết định, pacing và Prize Simulator ở [12-builder-spec §6](./12-builder-spec.md#6-prize-engine).

### 7.1 Chế độ chọn giải cho instant-win

| Chế độ | Mô tả |
|---|---|
| `per_prize_probability` | Mỗi giải có xác suất riêng (tổng ≤ 100%) |
| `overall_win_rate` | Tỷ lệ trúng tổng (vd. 30%); khi trúng, chọn giải theo tỷ lệ số lượng còn lại |
| `guaranteed` | Mỗi người chắc chắn trúng một giải (dùng cho gift box sự kiện nhỏ) |

### 7.2 Ràng buộc áp trước khi chọn

1. **Tồn kho:** `remaining > 0`.
2. **Pacing:** với giải tổng Q trong khoảng [start, end], tại thời điểm t chỉ cho phép `issued < ceil(Q × progress(t)) + buffer`. `progress` có thể tuyến tính hoặc theo đường cong giờ cao điểm do người dùng chọn.
3. **Giới hạn người chơi:** tối đa N giải/người/event; tối đa M giải loại X/người.
4. **Ngưỡng điểm** (skill game): giải chỉ mở khi `score ≥ threshold`.

### 7.3 Cấp giải atomic

```sql
-- trong transaction
UPDATE prizes
   SET remaining = remaining - 1, issued = issued + 1
 WHERE id = $1 AND remaining > 0
RETURNING id;
-- 0 rows → hết; loại giải này khỏi tập và chọn lại (tối đa 3 lần) → fallback 'no_prize'
INSERT INTO awards (...) VALUES (...);
-- voucher: UPDATE voucher_codes SET award_id=$a WHERE id = (SELECT id FROM voucher_codes WHERE prize_id=$1 AND award_id IS NULL LIMIT 1 FOR UPDATE SKIP LOCKED)
```

- **Idempotency:** `POST /plays/{id}/draw` có `Idempotency-Key`. Mỗi `play` chỉ draw một lần (unique `awards.play_id`).
- **RNG:** `crypto.getRandomValues`. Ghi `rng_proof` (seed hash) cho từng draw để audit.
- **Hot event:** nếu tranh chấp row giải quá cao (hàng nghìn draw/giây), chuyển sang "token bucket" trong Redis (`DECR prize:{id}:stock`) rồi ghi Postgres bất đồng bộ qua outbox. Đây là tối ưu M4; M1–M3 dùng Postgres trực tiếp.

---

## 8. Xác thực và phân quyền

- **Organizer:** Better Auth mount trong `apps/api` tại `/auth/*`. Session cookie domain `.playora.vn`, `SameSite=Lax`, `Secure`. Studio gọi API qua cùng domain cha.
- **RBAC:** guard NestJS `@Roles('editor')`; mọi query đều scope theo `organization_id` (repository nhận `tenantId` bắt buộc). Cân nhắc **Postgres RLS** cho các bảng PII ở M4.
- **Player:** `POST /p/{slug}/join` trả `playerToken` (JWT, 12 h, claims `{ sub: playerId, evt: eventId, ver }`), ký và xác thực bởi API; gửi qua header `Authorization`. (Hiện code ký bằng `signLiveToken`/`LIVE_TOKEN_SECRET` trong `packages/core/src/live`; khi gỡ live engine đổi thành `core/session` + `PLAYER_SESSION_SECRET`, có `ver` để thu hồi, theo [ADR-012](./adr/012-campaign-architecture.md).)
- **Operator/staff:** organizer session có quyền `operator` trên event (bốc thăm, chạy thử, đổi quà).
- v2.1: không còn screen key hay live token cho Screen/Host.

---

## 9. Background jobs (`apps/worker`)

| Queue | Job | Ghi chú |
|---|---|---|
| `media` | Resize, nén, sinh WebP/AVIF, blurhash | sharp |
| `export` | Export CSV/XLSX/PDF báo cáo | Stream, upload R2, link hết hạn 24 h |
| `notify` | Email, ZNS, SMS (trúng giải, OTP) | Retry với backoff; DLQ |
| `webhook` | Gửi webhook có chữ ký HMAC | Retry 24 h |
| `analytics` | Rollup theo giờ/ngày từ `analytics_events` | Cron |
| `billing` | Đối soát thanh toán, hết hạn gói, nhắc gia hạn | Cron |
| `retention` | Xoá hoặc ẩn danh PII hết hạn lưu trữ | Cron hằng ngày |

---

## 10. Môi trường và triển khai

### 10.1 Môi trường

| Env | Mục đích | Hạ tầng |
|---|---|---|
| `local` | Dev | `docker compose` (Postgres, Valkey, MinIO, Mailpit) + `bun dev` (turbo) |
| `staging` | QA, demo, rehearsal | 1 VM nhỏ, dữ liệu giả |
| `production` | Khách hàng | Xem 10.2 |
| `loadtest` | Dựng theo yêu cầu | Clone cấu hình production, xoá sau khi test |

### 10.2 Production theo giai đoạn

| Giai đoạn | Cấu hình |
|---|---|
| **MVP (≤ 500 lượt chơi/giây)** | 2 VM app (api ×2 sau load balancer, worker, studio, play, web: Docker; 4 vCPU/8 GB), Postgres managed (2 vCPU/4 GB + backup PITR), Valkey managed/VM, R2 + Cloudflare. Deploy bằng Kamal/Dokploy |
| **Scale (≤ 2.000 lượt chơi/giây)** | Thêm node API theo lịch campaign (pre-scale dựa trên lịch ADM-02); read replica; tách worker; Redis token bucket cho tồn kho nếu cần (§7.3) |
| **Sau** | Kubernetes managed, autoscale; ClickHouse cho analytics; multi-region SEA |

### 10.3 Vị trí hạ tầng

- **Khuyến nghị:** đặt DB chứa PII và dịch vụ chính **tại Việt Nam** (VNG Cloud / Viettel Cloud / FPT Cloud…). Độ trễ thấp cho người chơi, và giảm nghĩa vụ hồ sơ chuyển dữ liệu ra nước ngoài theo Luật 91/2025 (cần luật sư xác nhận).
- Asset tĩnh (không PII) phân phối qua Cloudflare CDN.
- Phương án thay thế: AWS `ap-southeast-1` (Singapore, ~30–50 ms) nếu cần managed services phong phú, kèm hồ sơ chuyển dữ liệu xuyên biên giới.

### 10.4 Vận hành campaign

- **Campaign calendar:** admin xem campaign lớn (Campaign L, mùa Tết) trong 7 ngày tới để pre-scale node API và gán operator.
- **Freeze window:** không deploy production từ 2 giờ trước đến 1 giờ sau mốc được đánh dấu "critical" (giờ mở campaign, bốc thăm cuối chương trình).
- **Runbook:** giải phát lệch đường kế hoạch, tỷ lệ gắn cờ tăng đột biến, Postgres chậm, mất mạng tại booth (khuyến nghị 4G cho kiosk).

---

## 11. Observability

- **Trace:** OpenTelemetry auto-instrument cho Nest (HTTP, pg, ioredis), propagate tới worker.
- **Metric chính:** `play_rate{event}`, `play_draw_latency_ms`, `play_rejected_total{reason}`, `prize_stock_remaining`, `prize_pacing_deviation`, `event_loop_lag_ms`, `job_failed_total`.
- **Dashboard nội bộ** cho từng campaign đang chạy: lượt chơi/giây, độ trễ, lỗi, giải còn lại so với kế hoạch, tỷ lệ gắn cờ. Alert qua Telegram/Slack.
- **Sentry** cho Studio, Play và backend; source map upload trong CI.

---

## 12. Architecture Decision Records (tóm tắt)

Mỗi ADR đầy đủ nằm ở `docs/adr/NNN-title.md` (tạo trong M0).

| ADR | Quyết định | Trạng thái |
|---|---|---|
| 001 | Monorepo Bun workspaces + Turborepo; internal packages là TS source | Đề xuất |
| 002 | **Bun là runtime mặc định** cho các app NestJS. Spike S0-2 kiểm chứng Nest + BullMQ trên Bun (decorator metadata, ổn định khi chạy dài). Nếu lỗi hoặc không ổn định, app đó chạy **Node LTS** (build bằng tsdown/SWC) mà không đổi code | Cần spike |
| 003 | Drizzle + postgres.js; migration bằng `drizzle-kit generate` (SQL review được), không dùng `push` trên staging/prod | Đề xuất |
| 004 | ~~Realtime: Socket.IO + room affinity~~ | Superseded bởi ADR-011 |
| 005 | Contracts bằng zod v4 → OpenAPI → typed client | Đề xuất |
| 006 | Better Auth cho organizer (multi-tenant qua plugin organization); JWT riêng cho player | Đề xuất |
| 007 | PixiJS v8 cho game canvas; không dùng Phaser (bundle lớn) | Đề xuất |
| 008 | Hạ tầng tại VN cho dữ liệu PII; CDN Cloudflare cho asset | Cần tư vấn luật |
| 009 | Modular monolith cho API (gồm play + prize engine); chỉ tách worker | Đề xuất |
| 011 | Gỡ live engine (realtime/LED) khỏi sản phẩm; code ở tag `archive/live-engine` | Accepted |

---

## 13. Spike kỹ thuật ở M0

| Spike | Câu hỏi | Tiêu chí pass | Timebox |
|---|---|---|---|
| S0-1 | Turborepo + Bun workspaces + Next 16 + Nest 11 chạy dev/build/test ổn định? | `bun install && bun run build && bun test` xanh trong CI < 5 phút | 1 ngày |
| S0-2 | NestJS (HTTP + BullMQ) trên Bun ổn định? | Chạy 24 h, không leak; k6 HTTP 1.000 rps p95 < 100 ms | 2 ngày |
| ~~S0-3…S0-5~~ | ~~Realtime 5.000 client, DeviceMotion, PixiJS trên LED~~ | Bỏ ở v2.1 (S0-3 đã đạt, kết quả lưu ở ADR-004) | — |
| S0-6 | Trừ tồn kho/ngân sách nguyên tử dưới tải (Postgres vs Valkey Lua) | 0 sai lệch ở 500 lượt/giây | 1 ngày |

---

## 14. Đơn giản hoá cho M1 (Tết Campaign)

Kiến trúc trên là đích đến. M1 chỉ có 5 tuần, nên **cố ý làm tối giản** những phần dưới đây, nhưng không đổi interface để nâng cấp không phải viết lại.

| Thành phần | Đích (M2–M4) | M1 | Nâng cấp ở |
|---|---|---|---|
| Play API | Nhiều node sau load balancer, pre-scale theo lịch | 1–2 node API; đạt 500 lượt chơi/giây | M4 (2.000 lượt/giây) |
| Worker | Nhiều queue (media, export, notify, webhook, analytics, billing, retention) | `media` + `export` + job pacing | M2–M3 |
| Analytics | `analytics_events` partition + rollup | Đếm trực tiếp từ bảng nghiệp vụ + log; dashboard polling | M2 |
| Prize engine | Đầy đủ chế độ + pacing + simulator + bốc thăm cuối chương trình | `per_prize_probability`, `overall_win_rate`, `guaranteed`, `score_threshold`; tồn kho, giới hạn, ngân sách; `time_uniform`, `opening_hours` | M2 (Simulator, `batch_release`, `end_flush`, bốc thăm), M3 (`traffic_based`) |
| Anti-fraud | Preset Thấp/Chuẩn/Cao | Thấp/Chuẩn (Turnstile, rate limit, thiết bị, gắn cờ) | M2 (OTP), M3 (Cao) |
| Auth player | Anonymous / guest list / form / OTP / Zalo | Anonymous / guest list / form | M2 (OTP), M4 (Zalo) |
| Billing | PayOS self-serve | Admin kích hoạt thủ công + quota | M2 |
| Template loading | Registry động theo gói, marketplace | Registry tĩnh, build cùng `apps/play` | M2 |
| Hạ tầng | Kamal/Dokploy, nhiều VM, Postgres managed | 1–2 VM app + Postgres managed + Valkey | M2 |
| Builder | Flow chuẩn đầy đủ, pre-flight, autosave/undo | Auto-form + preview + publish/version + flow màn mặc định | M2 |

**Những thứ không được đơn giản hoá ngay từ M1** (nợ kỹ thuật ở đây là rủi ro uy tín hoặc pháp lý):
- Server-authoritative.
- Trừ tồn kho/ngân sách nguyên tử; idempotency cho mỗi lượt.
- Chống gian lận mức Chuẩn.
- Chạy thử campaign + bot.
- Consent PDPL.
- Audit log cho quay số.
- Test cross-tenant.
