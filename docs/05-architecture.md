# 05 — Kiến trúc hệ thống

Cập nhật: 23/10/2026 · Owner: Tech Lead

---

## 1. Nguyên tắc kiến trúc

1. **TypeScript end-to-end, một nguồn chân lý cho type.** Schema zod trong `packages/contracts` dùng chung cho API, realtime, editor và validate config.
2. **Server-authoritative.** Mọi kết quả có giá trị (trúng giải, điểm, người thắng) do server quyết định hoặc xác thực. Client chỉ hiển thị.
3. **Template + config, không hard-code game.** Lõi nền tảng không biết chi tiết từng game; game cắm vào qua `game-sdk`.
4. **Room affinity cho realtime.** Toàn bộ kết nối của một event nằm trên cùng một node realtime. State giữ in-memory, Redis dùng để snapshot và khôi phục. Tránh chatter giữa các node.
5. **Player siêu nhẹ.** Shell player tối thiểu; game bundle lazy-load; asset qua CDN; chạy tốt trên máy cũ và in-app browser.
6. **Modular monolith trước, tách service sau.** Chỉ tách `realtime` và `worker` vì khác hẳn đặc tính tải. API là modular monolith (NestJS modules).
7. **Không vendor lock-in nặng.** Docker, PostgreSQL, Redis, S3-compatible; chạy được trên cloud VN hoặc quốc tế.

---

## 2. Sơ đồ tổng thể

```
                         ┌──────────────────────── Cloudflare (DNS, CDN, WAF) ────────────────────────┐
                         │                                                                            │
   Organizer (desktop)   │   Player (mobile)          Screen (LED PC)           Host (laptop)          │
        │                │        │                        │                         │                │
        ▼                │        ▼                        ▼                         ▼                │
 ┌─────────────┐         │  ┌───────────────────────────────────┐            ┌─────────────┐         │
 │ apps/studio │ Next.js │  │ apps/play  (Next.js)              │            │ apps/studio │         │
 │ dashboard,  │         │  │  /[slug]   player shell           │            │ /live/host  │         │
 │ editor,     │         │  │  /s/[key]  screen shell           │            └──────┬──────┘         │
 │ host console│         │  │  game bundles (lazy, CDN)         │                   │                │
 └──────┬──────┘         │  └───────┬─────────────────┬─────────┘                   │                │
        │ REST (cookie)  │          │ REST (token)    │ WebSocket                   │ WebSocket      │
        ▼                │          ▼                 ▼                             ▼                │
 ┌───────────────────────────────────────┐   ┌────────────────────────────────────────────────┐     │
 │ apps/api (NestJS, modular monolith)   │   │ HAProxy: consistent hash theo eventId          │     │
 │  auth · org · event · game · asset    │   └───────────┬───────────────────┬────────────────┘     │
 │  player · play · prize · analytics    │               ▼                   ▼                      │
 │  billing · admin · webhook            │   ┌──────────────────┐ ┌──────────────────┐             │
 └───┬───────────────┬───────────────┬───┘   │ apps/realtime #1 │ │ apps/realtime #2 │  (NestJS +  │
     │               │               │       │ rooms in-memory  │ │ rooms in-memory  │   Socket.IO)│
     │               │ enqueue       │       └───┬──────────┬───┘ └───┬──────────┬───┘             │
     │               ▼               │           │          │         │          │                 │
     │        ┌─────────────┐        │           │ snapshot │ commands (Redis pub/sub API→room)    │
     │        │ apps/worker │        │           ▼          ▼         ▼          ▼                 │
     │        │ BullMQ jobs │        │     ┌────────────────────────────────────────┐              │
     │        └──────┬──────┘        └────►│ Redis/Valkey: ZSET leaderboard, pubsub,│              │
     │               │                     │ rate limit, queues, room snapshots     │              │
     ▼               ▼                     └────────────────────────────────────────┘              │
 ┌──────────────────────────┐   ┌──────────────────────┐   ┌────────────────────────────┐          │
 │ PostgreSQL (Drizzle)     │   │ S3/R2 (assets,       │   │ External: PayOS/VietQR,    │          │
 │ + PgBouncer              │   │ exports)             │   │ Zalo ZNS, SMS, Email (SES/ │          │
 └──────────────────────────┘   └──────────────────────┘   │ Resend), PostHog, Sentry   │          │
                                                           └────────────────────────────┘          │
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
| Game rendering | **PixiJS v8** (game hành động, screen LED), DOM/CSS + **Motion** (quiz, vòng quay, UI) | Nhẹ hơn Phaser; WebGL/WebGPU; tree-shake được |
| Backend framework | **NestJS 12.2** (thuần ESM) | Module hoá, DI, guard/interceptor, WebSocket gateway, ecosystem |
| Validation | **zod 4.6** + `ZodValidationPipe` tự viết (`nestjs-zod` chưa hỗ trợ Nest 12; ADR-005) | DTO từ contracts, sinh OpenAPI |
| ORM | **Drizzle ORM 0.45** + **drizzle-kit 0.31** (migrations), driver `postgres` 3.4 (ADR-003) | Type-safe SQL, migration SQL rõ ràng; postgres.js chạy cả Bun và Node |
| Database | **PostgreSQL 17+** (managed), **PgBouncer** (transaction pooling) | JSONB cho config, partition cho analytics |
| Cache / realtime state / queue | **Valkey/Redis 7+**; **BullMQ** | ZSET leaderboard, pub/sub, rate limit, job queue |
| Realtime | **Socket.IO** 4 trên NestJS gateway (`apps/realtime`); HAProxy consistent hash | Rooms, ack, reconnect, fallback; xem ADR-004 |
| Auth (organizer) | **Better Auth** (Drizzle adapter, plugin `organization`, magic link, Google; SSO ở M4) | Self-host, sở hữu dữ liệu, có multi-tenant |
| Auth (player) | JWT ngắn hạn theo event (jose), ký bởi API | Không cần tài khoản; hợp custom domain |
| Storage | **Cloudflare R2** (S3 API), presigned upload; **sharp** trong worker để tạo biến thể ảnh | Không phí egress; CDN sẵn |
| Email | Resend hoặc AWS SES; React Email cho template | |
| SMS/ZNS | Nhà cung cấp ZNS/SMS brandname VN (chọn trước M3, khi bật OTP) qua interface `NotificationProvider` | Pass-through cost |
| Payment | **PayOS** (VietQR) trước; Stripe cho thẻ quốc tế (M4) | Phổ biến tại VN, webhook rõ ràng |
| i18n | **next-intl** (vi, en) | |
| Lint/format | **Biome 2.6** · TypeScript **6.0** (chưa lên 7, ADR-007) | Nhanh, một tool cho lint và format |
| Test | `bun test` (unit), **Playwright** (e2e), **k6** (load: HTTP + WebSocket) | |
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
│   ├── studio/              # Next.js: dashboard, editor, host console, (MVP) admin
│   ├── play/                # Next.js: player shell /[slug] + screen shell /s/[screenKey]
│   ├── api/                 # NestJS: REST API, auth, prize engine, billing, webhooks
│   ├── realtime/            # NestJS: WebSocket gateway, live rooms
│   └── worker/              # NestJS standalone: BullMQ processors
├── packages/
│   ├── db/                  # Drizzle schema, migrations, seed, createDb()
│   ├── contracts/           # zod: REST DTO, WS events, enums, error codes
│   ├── core/                # domain thuần, không I/O: prize engine, pacing, quota, provably-fair, scoring
│   ├── game-sdk/            # defineTemplate, types, hooks (useGameSession, useRoom), input (shake, tap), clock sync
│   ├── game-registry/       # key@version → loader (client & server); danh sách template theo gói
│   ├── games/
│   │   ├── checkin-wall/
│   │   ├── lucky-draw/
│   │   ├── live-quiz/
│   │   ├── shake-race/
│   │   └── spin-wheel/ …
│   ├── ui/                  # shadcn/ui, tokens, components dùng chung, auto-form từ zod
│   ├── api-client/          # typed client từ zod contract + TanStack Query hooks (ADR-008)
│   ├── realtime-client/     # Socket.IO client: typed events, reconnect, resume, clock sync
│   ├── auth/                # Better Auth server config + client helpers
│   ├── i18n/                # messages vi/en
│   ├── env/                 # zod env schema theo app
│   └── tsconfig/            # base, nextjs, nestjs, library
├── tooling/
│   ├── k6/                  # kịch bản load test (join, shake-race, quiz, draw)
│   ├── bots/                # bot giả lập người chơi (dùng cho rehearsal mode và test)
│   └── scripts/             # check-commit-msg, gen:template (M1)
├── infra/
│   ├── docker/              # Dockerfile.next, Dockerfile.nest
│   ├── compose/             # docker-compose.dev.yml (postgres, redis, minio, mailpit)
│   ├── haproxy/             # haproxy.cfg (consistent hash theo eventId)
│   └── deploy/              # Kamal/Dokploy config theo môi trường
├── docs/
├── biome.json
├── turbo.json
├── bunfig.toml
└── package.json             # "workspaces": ["apps/*", "packages/*", "packages/games/*"]
```

### 4.1 Quy tắc phụ thuộc (enforce bằng lint rule hoặc dependency-cruiser)

```
apps/*            → packages/*            (không app nào import app khác)
packages/core     → contracts             (không I/O, không framework)
packages/db       → (drizzle, postgres)   (không import Nest/Next)
packages/games/*  → game-sdk, contracts, ui (phần player/screen), core (phần server)
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
export type GameKind = 'instant' | 'skill' | 'live' | 'draw' | 'display';

export interface TemplateDefinition<C extends z.ZodTypeAny, S = unknown> {
  key: string;                      // 'shake-race'
  version: `${number}.${number}.${number}`;
  kind: GameKind;
  meta: { name: LocalizedText; description: LocalizedText; thumbnail: string; tags: string[] };
  configSchema: C;
  defaultConfig: z.infer<C>;
  editor?: EditorLayout;            // gợi ý nhóm field và widget đặc biệt (asset picker, color, list)
  surfaces: {
    player?: () => Promise<{ default: ComponentType<PlayerProps<z.infer<C>>> }>;
    screen?: () => Promise<{ default: ComponentType<ScreenProps<z.infer<C>>> }>;
    host?:   () => Promise<{ default: ComponentType<HostPanelProps<z.infer<C>>> }>;
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
  room?: RoomClient;                // chỉ live: state$, send(input), clock
  locale: 'vi' | 'en';
  quality: 'high' | 'low';          // degrade mode
}
```

```ts
// Server module cho game live (chạy trong apps/realtime)
export interface LiveServerModule<C, S> {
  kind: 'live';
  init(ctx: RoomContext<C>): S;
  onCommand(state: S, cmd: HostCommand, ctx: RoomContext<C>): void;           // start/pause/next/end…
  onInput(state: S, from: PlayerRef, input: unknown, ctx: RoomContext<C>): void; // input đã validate theo inputSchema
  inputSchema: z.ZodTypeAny;
  tickHz?: number;                  // vd. 10
  tick?(state: S, ctx: RoomContext<C>): void;
  view(state: S, audience: Audience): unknown;  // snapshot gửi screen/host/player (lọc thông tin nhạy cảm, vd. đáp án)
  finalize(state: S): RoundResult;              // ghi DB: điểm, xếp hạng, winners
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
- Player và realtime luôn load theo `game_version_id`, nên sửa nháp không ảnh hưởng sự kiện đang chạy.
- Template có breaking change thì tăng major và viết `migrate(configV1) → configV2` trong template.

### 5.3 Tải game ở player

1. `GET /p/{slug}` (SSR shell rất nhẹ) trả về event, brand kit và danh sách game kèm `templateKey@version`.
2. `game-registry` gọi `import()` động bundle của template (code-split theo template, cache CDN bất biến theo hash).
3. Asset preload theo manifest (ưu tiên ảnh nhỏ, sau đó âm thanh).

---

## 6. Realtime

### 6.1 Mô hình

- **Room = event live.** Mỗi event có một `LiveRoom` (actor) trên đúng một node. Bên trong có state machine của vòng hiện tại (`RoundRunner`) và server module của template.
- **Routing:** client kết nối `wss://rt.playora.vn/?event={eventId}`. HAProxy dùng `balance url_param event` + `hash-type consistent` nên mọi socket của event đó vào cùng node.
- **Lệnh từ API** (vd. host bấm qua REST, hoặc admin) đi qua Redis pub/sub channel `room:{eventId}:cmd`. Node sở hữu room xử lý.
- **Bền vững:** room snapshot vào Redis mỗi 1 s (`room:{eventId}:snap`) và khi chuyển trạng thái. Kết quả vòng được ghi Postgres khi `finalize`.
- **Failover:** node chết thì HAProxy chuyển hash sang node khác. Node mới load snapshot, tiếp tục; client reconnect và `resume`. Mất tối đa ~1 s input; chấp nhận được với game sự kiện.
- **Ownership lock:** node giữ `SET room:{eventId}:owner {nodeId} NX PX 5000`, gia hạn mỗi 2 s, để tránh hai node cùng chạy room (split-brain).

### 6.2 Tần suất và băng thông (ví dụ shake race 5.000 người)

| Luồng | Tần suất | Kích thước | Tổng |
|---|---|---|---|
| Player → server (delta lắc) | 4 Hz | ~20 B | 20.000 msg/s vào |
| Server → screen (top 20 + tổng đội) | 10 Hz | ~1,5 KB | không đáng kể |
| Server → player (tiến độ bản thân + đội) | 2 Hz | ~60 B | 10.000 msg/s ra |

- Payload gọn: key ngắn, số nguyên; xem xét MessagePack parser của Socket.IO nếu benchmark cần.
- **Degrade mode:** khi event-loop lag > 50 ms hoặc CPU > 80%, giảm player xuống 1 Hz và gộp input 500 ms.

### 6.3 Đồng bộ thời gian

- Client ping 5 lần lúc join, lấy offset trung vị (`serverNow ≈ Date.now() + offset`). Đếm ngược và deadline theo server time.
- Server chấp nhận câu trả lời trễ ≤ 300 ms so với deadline để bù độ trễ mạng; chỉ tính điểm theo `serverReceivedAt`.

---

## 7. Prize engine (`packages/core/prize`)

> Danh sách đầy đủ chế độ quyết định, pacing và Prize Simulator ở [12-builder-spec §6](./12-builder-spec.md#6-prize-engine).

### 7.1 Chế độ chọn giải cho instant-win

| Chế độ | Mô tả |
|---|---|
| `weighted` | Mỗi giải (gồm "không trúng") có trọng số. Xác suất = w / Σw |
| `win_rate` | Tỷ lệ trúng tổng (vd. 30%); khi trúng, chọn giải theo tỷ lệ số lượng còn lại |
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
- **Player:** `POST /p/{slug}/join` trả `playerToken` (JWT, 12 h, claims `{ sub: playerId, evt: eventId, ver }`). Gửi qua header `Authorization` (REST) và `auth` (Socket.IO handshake).
- **Screen:** `screenKey` ngẫu nhiên 32 byte, tạo hoặc thu hồi được trong Studio; chỉ có quyền đọc state và nhận broadcast.
- **Host:** organizer session có quyền `operator` trên event.

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
| **MVP (≤ 5.000 CCU)** | 1 VM app (api, worker, studio, play, web: Docker), 2 VM realtime (4 vCPU/8 GB), Postgres managed (2 vCPU/4 GB + backup PITR), Valkey managed/VM, R2 + Cloudflare. Deploy bằng Kamal/Dokploy |
| **Scale (≤ 20.000 CCU)** | Thêm node realtime theo lịch sự kiện (scale trước sự kiện lớn dựa trên lịch ADM-02); read replica; tách worker |
| **Sau** | Kubernetes managed, autoscale; ClickHouse cho analytics; multi-region SEA |

### 10.3 Vị trí hạ tầng

- **Khuyến nghị:** đặt DB chứa PII và dịch vụ chính **tại Việt Nam** (VNG Cloud / Viettel Cloud / FPT Cloud…). Độ trễ thấp cho live, và giảm nghĩa vụ hồ sơ chuyển dữ liệu ra nước ngoài theo Luật 91/2025 (cần luật sư xác nhận).
- Asset tĩnh (không PII) phân phối qua Cloudflare CDN.
- Phương án thay thế: AWS `ap-southeast-1` (Singapore, ~30–50 ms) nếu cần managed services phong phú, kèm hồ sơ chuyển dữ liệu xuyên biên giới.

### 10.4 Vận hành sự kiện

- **Event calendar:** admin xem sự kiện ≥ 1.000 người trong 7 ngày tới để pre-scale node realtime và gán operator.
- **Freeze window:** không deploy production từ 2 giờ trước đến 1 giờ sau sự kiện được đánh dấu "critical".
- **Runbook:** mất mạng tại venue (khuyến nghị 4G backup cho máy Screen), node realtime chết, Postgres chậm, giải hết sớm.

---

## 11. Observability

- **Trace:** OpenTelemetry auto-instrument cho Nest (HTTP, pg, ioredis), propagate tới worker.
- **Metric chính:** `rt_connections{event}`, `rt_msg_in_rate`, `rt_broadcast_latency_ms`, `event_loop_lag_ms`, `draw_latency_ms`, `prize_stock_remaining`, `job_failed_total`.
- **Live dashboard nội bộ** cho từng event đang chạy: số kết nối, lag, lỗi. Alert qua Telegram/Slack.
- **Sentry** cho Studio, Play và backend; source map upload trong CI.

---

## 12. Architecture Decision Records (tóm tắt)

Mỗi ADR đầy đủ nằm ở `docs/adr/NNN-title.md` (tạo trong M0).

| ADR | Quyết định | Trạng thái |
|---|---|---|
| 001 | Monorepo Bun workspaces + Turborepo; internal packages là TS source | Đề xuất |
| 002 | **Bun là runtime mặc định** cho các app NestJS. Spike S0-2 kiểm chứng Nest 11 + Socket.IO + BullMQ trên Bun (decorator metadata, `ws` upgrade, ổn định khi chạy dài). Nếu lỗi hoặc không ổn định, app đó chạy **Node LTS** (build bằng tsdown/SWC) mà không đổi code | Cần spike |
| 003 | Drizzle + postgres.js; migration bằng `drizzle-kit generate` (SQL review được), không dùng `push` trên staging/prod | Đề xuất |
| 004 | Realtime: Socket.IO + room affinity (HAProxy consistent hash) thay vì Redis adapter fan-out. Spike S0-3 benchmark 5.000 client × 4 Hz trên node 4 vCPU; nếu không đạt, đánh giá `uWebSockets.js` hoặc Bun native WebSocket cho riêng `apps/realtime` | Cần spike |
| 005 | Contracts bằng zod v4 → OpenAPI → `openapi-fetch`; WS events typed qua `contracts/ws` | Đề xuất |
| 006 | Better Auth cho organizer (multi-tenant qua plugin organization); JWT riêng cho player | Đề xuất |
| 007 | PixiJS v8 cho game canvas; không dùng Phaser (bundle lớn) | Đề xuất |
| 008 | Hạ tầng tại VN cho dữ liệu PII; CDN Cloudflare cho asset | Cần tư vấn luật |
| 009 | Modular monolith cho API; chỉ tách realtime và worker | Đề xuất |

---

## 13. Spike kỹ thuật ở M0

| Spike | Câu hỏi | Tiêu chí pass | Timebox |
|---|---|---|---|
| S0-1 | Turborepo + Bun workspaces + Next 16 + Nest 11 chạy dev/build/test ổn định? | `bun install && bun run build && bun test` xanh trong CI < 5 phút | 1 ngày |
| S0-2 | NestJS (HTTP + Socket.IO + BullMQ) trên Bun ổn định? | Chạy 24 h, không leak; k6 HTTP 1.000 rps p95 < 100 ms | 2 ngày |
| S0-3 | Realtime 5.000 client shake race trên 1 node 4 vCPU? | p95 broadcast < 150 ms, CPU < 70% | 3 ngày |
| S0-4 | DeviceMotion trên iOS Safari, Zalo in-app, FB in-app | Xin quyền được, đếm lắc chính xác; fallback tap | 1 ngày |
| S0-5 | PixiJS screen 1080p/4K với 500 sprite tên chạy | ≥ 50 fps trên mini PC phổ thông | 1 ngày |

---

## 14. Đơn giản hoá cho M1 (YEP Live)

Kiến trúc trên là đích đến. M1 chỉ có 5 tuần, nên **cố ý làm tối giản** những phần dưới đây, nhưng không đổi interface để nâng cấp không phải viết lại.

| Thành phần | Đích (M2–M4) | M1 | Nâng cấp ở |
|---|---|---|---|
| Realtime routing | HAProxy consistent hash, nhiều node, ownership lock | **1 node realtime** (4–8 vCPU); vẫn ghi snapshot Redis và giữ lock để sẵn sàng scale | M2 (2 node), M4 (20k CCU) |
| Lệnh host | WS + fallback REST qua Redis pub/sub | Chỉ WS (host nối thẳng node duy nhất) | M2 |
| Worker | Nhiều queue (media, export, notify, webhook, analytics, billing, retention) | Chỉ `media` + `export` | M2–M3 |
| Analytics | `analytics_events` partition + rollup | Đếm trực tiếp từ bảng nghiệp vụ + log; dashboard live đọc từ room state | M2 |
| Prize engine | Đầy đủ chế độ + pacing + simulator | Chỉ `live_draw` (lucky draw) | M3 |
| Auth player | Anonymous / guest list / form / OTP / Zalo | Anonymous / guest list / form | M3 (OTP), M4 (Zalo) |
| Billing | PayOS self-serve | Admin kích hoạt thủ công + quota | M2 |
| Template loading | Registry động theo gói, marketplace | Registry tĩnh, build cùng `apps/play` | M2 |
| Hạ tầng | Kamal/Dokploy, nhiều VM, Postgres managed | 1 VM app + 1 VM realtime + Postgres managed + Valkey | M2 |
| Builder | Flow chuẩn đầy đủ, pre-flight, autosave/undo | Auto-form + preview + run-of-show + publish/version | M2 |

**Những thứ không được đơn giản hoá ngay từ M1** (nợ kỹ thuật ở đây là rủi ro sân khấu hoặc pháp lý):
- Server-authoritative.
- Commit–reveal cho lucky draw.
- Snapshot và resume.
- Degrade mode.
- Rehearsal + bot.
- Consent PDPL.
- Audit log cho quay số.
- Test cross-tenant.
