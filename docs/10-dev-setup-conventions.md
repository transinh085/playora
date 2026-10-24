# 10 — Kiến trúc code, convention và quy trình phát triển

Cập nhật: 24/10/2026 (v2.1: bỏ realtime, [ADR-011](./adr/011-remove-live-engine.md)) · Áp dụng cho mọi code trong repo · Quyết định nền tảng: [docs/adr/](./adr/README.md)

---

## 1. Bản đồ repo

```
apps/
  api/          NestJS 12 trên Bun — REST /v1, Better Auth /auth, OpenAPI /v1/openapi.json, play engine + prize engine
  worker/       NestJS standalone + BullMQ — xử lý job từ @playora/jobs
  studio/       Next.js 16 — builder cho organizer (đăng nhập, org, events…)
  play/         Next.js 16 — player shell /[slug] (kiosk ?mode=kiosk ở M3), preview /preview
  web/          Next.js 16 — landing
packages/
  contracts/    zod: route contracts (REST), ErrorCode — NGUỒN CHÂN LÝ
  api-client/   typed client từ contracts (+ ./react: TanStack Query hooks)
  db/           Drizzle schema, migrations, seed, ./testing (DB test)
  auth/         Better Auth options + RBAC 5 vai trò (./permissions)
  jobs/         queue + payload schema + producer
  core/         logic thuần, không I/O: prize engine, pacing, quota, provably-fair (bốc thăm cuối chương trình)
  game-sdk/     interface template game (instant / skill / draw)
  templates/    registry template (client + ./server)
  ui/           design system: tokens (./styles.css), shadcn (./components/*), game surface (./game/*), ./lib/*
  i18n/         messages vi/en (vi là chuẩn)
  env/          zod schema env theo app
  tsconfig/     base, library, nestjs, nextjs
tooling/
  e2e/          Playwright (desktop + mobile)
  loadtest/     k6 load test Play API (join, play, draw)
  scripts/      check-commit-msg…
infra/
  compose/      Postgres :54329, Valkey :63799, MinIO, Mailpit
  docker/       Dockerfile.nest, Dockerfile.next (turbo prune)
```

> **Còn phải gỡ (v2.1):** `apps/realtime`, `packages/realtime-client`, module `live` + `screens` trong `apps/api`, contract `live`/`screens`/`ws.ts`, schema live (`live_rounds`, `round_scores`, `event_screens`), Play `/screen`, Studio `events/[eventId]/screens`, template `tap-race`, `tooling/loadtest/shake-race.ts`, env `REALTIME_*`. Việc này do chore `remove live engine` ([09](./09-roadmap-plan.md) story 1.0) làm; code lưu ở tag `archive/live-engine`. Đừng thêm code mới phụ thuộc vào các phần này.

**Luật phụ thuộc:**

```
apps/*  →  packages/*               (app không import app)
contracts, i18n, env  →  không phụ thuộc package nội bộ nào (core → contracts)
db  →  (drizzle, postgres)          auth  →  db
api-client  →  contracts
ui  →  (react, radix, tailwind)     không biết gì về API
```

---

## 2. Chạy dự án

```bash
cp .env.example .env               # đặt BETTER_AUTH_SECRET=$(openssl rand -hex 32)
bun install                        # cài deps + git hooks (lefthook)
bun run infra:up
bun run db:migrate && bun run db:seed
bun run dev                        # web :3000 · studio :3001 · play :3002 · api :4000 · worker :4002
```

| Lệnh | Mục đích |
|---|---|
| `bun run lint` / `bun run format` | Biome kiểm tra / tự sửa |
| `bun run typecheck` | tsc mọi workspace |
| `bun run test` | Unit + integration (`bun test`); API dùng DB `playora_test` tự tạo |
| `bun run e2e` | Playwright (tự bật API/Studio/Play nếu chưa chạy) |
| `bun run ci` | lint + typecheck + test + build như CI |
| `bun run db:generate` | Sinh migration SQL từ schema (review trước khi commit) |
| `bun run --cwd packages/auth generate:schema` | Sinh lại bảng Better Auth khi đổi plugin |
| `bunx shadcn@4.22.1 add <component>` (trong `packages/ui`) | Thêm component UI. **Kiểm tra lại import `cn`** (xem §6.3) |
| `docker build -f infra/docker/Dockerfile.nest --build-arg APP=@playora/api --build-arg APP_DIR=apps/api .` | Build image service |

---

## 3. Quy trình thêm một tính năng (ví dụ: "games")

Module **events** là mẫu chuẩn, có đủ mọi lớp. Copy theo đúng thứ tự:

1. **Contract** — `packages/contracts/src/api/games.ts`
   - Schema zod cho request/response (`GameSummary`, `CreateGameBody`…).
   - Route bằng `defineRoute({ method, path, auth, permission, params, query, body, response })`.
   - Thêm vào `allRoutes` trong `api/index.ts` (để có OpenAPI và contract test).
2. **Quyền** (nếu cần resource mới) — `packages/auth/src/permissions.ts`: thêm statement, gán cho các vai trò, thêm test.
3. **DB** (nếu cần) — schema trong `packages/db/src/schema/*`, rồi `bun run db:generate` và review SQL.
4. **API** — `apps/api/src/modules/games/`
   - `games.repository.ts`: mọi method nhận `organizationId` **đầu tiên** và lọc theo nó.
   - `games.service.ts`: nghiệp vụ; map lỗi DB → `ConflictException({ code, message, details: { field } })`; ghi `AuditService` cho thao tác nhạy cảm.
   - `games.controller.ts`: chỉ có `@Route(gamesApi.x)` + `@Args()`. Không validate tay, không kiểm quyền tay.
   - `games.module.ts`, import vào `AppModule`.
5. **Integration test** — `apps/api/test/games.e2e.test.ts` dùng `createTestApp()`. **Bắt buộc** có test cross-tenant (người org khác nhận 403/404).
6. **Studio** — `apps/studio/src/app/(app)/orgs/[orgId]/games/`
   - Đọc: `useRouteQuery(api, gamesApi.list, …)`.
   - Ghi: `useRouteMutation` + `invalidateQueries({ queryKey: routePrefix(gamesApi.list) })`.
   - Form: `useForm({ resolver: zodResolver(CreateGameBody) })` dùng **chính schema** của contract; lỗi API gắn vào field bằng `applyApiError`.
   - Text qua `useTranslations`; thêm key vào **cả** `vi.json` và `en.json` (test i18n sẽ bắt thiếu).
7. **E2E** cho luồng chính — `tooling/e2e/tests/*.spec.ts`.

---

## 4. Backend (apps/api)

### 4.1 Pipeline một request

```
helmet → CORS → [/auth/* → Better Auth] → express.json
→ ThrottlerGuard (Redis, RATE_LIMIT_PER_MIN/IP)
→ SessionGuard (contract.auth: public | session | player; mặc định cần session)
→ OrgAccessGuard (contract.permission + :orgId → member.role → hasPermission)
→ @Args() validate params/query/body bằng zod của contract → handler
→ ResponseContractInterceptor (dev/test: response phải khớp contract)
→ ApiExceptionFilter → { error: { code, message, details?, requestId } }
```

### 4.2 Quy tắc

| Chủ đề | Quy tắc |
|---|---|
| Route | Luôn khai báo bằng `@Route(contract)`. Chỉ dùng `@Get()` cho endpoint kỹ thuật (vd. `openapi.json`), kèm `@Public()` nếu cần |
| Tenant | Repository nhận `organizationId` và lọc mọi truy vấn. Guard là lớp bảo vệ thứ hai, không phải duy nhất |
| Lỗi | Ném `HttpException` với `{ code: ErrorCode.X, message, details? }`. Mã mới phải thêm vào `ErrorCode` **và** i18n `errors.*` |
| Giao dịch | `repo.transaction(async (tx) => …)`; truyền `tx` vào repository và audit |
| Log | `nestjs-pino`, JSON ở production, có `x-request-id`; không log PII, cookie, token (đã redact) |
| Env | Thêm vào `packages/env` (zod) và `.env.example`; app crash ngay khi thiếu; production bắt buộc secret tường minh (từ chối secret mặc định dev) |
| DI | Import class service bằng `import { X }` (không `import type`), vì Nest cần metadata lúc runtime |
| Decorator trên Bun | `experimentalDecorators` + `emitDecoratorMetadata` phải nằm **trong tsconfig của app** (ADR-002) |

### 4.3 Job nền

- **API:** `@Inject(JOBS) jobs: Producer` → `jobs.enqueue('event.export', payload)`.
- **Worker:** thêm processor vào `apps/worker/src/processors`. TypeScript buộc mọi job đã khai báo phải có processor.
- **Job mới:** khai báo ở `packages/jobs/src/definitions.ts`.

---

## 5. Play engine và prize engine (trên API)

- Không có dịch vụ realtime (bỏ ở v2.1). Play engine (`instant` + `skill`) và prize engine chạy trong `apps/api`, theo đúng mẫu module như `events` (contract → repository có `organizationId` → service → controller) ([05 §6–7](./05-architecture.md#6-play-engine-trên-appsapi)).
- Logic chọn giải, pacing, giới hạn và provably-fair nằm trong `packages/core` (thuần, không I/O, test unit bắt buộc); module API chỉ lo transaction, khoá tồn kho và ghi `plays`/`awards`.
- Server module của template lấy từ `@playora/templates/server`: `instant` map kết quả → hiển thị, `skill` validate điểm. Client chỉ animate kết quả server trả về.
- Bốc thăm cuối chương trình (M2) là REST từ Studio + trang công bố công khai; commit ràng buộc `poolHash` và `spinNo` ([07 §2](./07-api-realtime.md#2-endpoint-chính)).

---

## 6. Frontend

### 6.1 Studio

| Phần | Cách làm |
|---|---|
| Xác thực | `src/proxy.ts` chặn khi không có cookie phiên (kiểm tra lạc quan). `(app)/layout.tsx` gọi `/me/orgs`; 401 thì chuyển về `/login` |
| Data | Client component: `useRouteQuery` / `useRouteMutation` với `api` (`src/lib/api.ts`). Server component: `await serverApi()` (chuyển tiếp cookie) |
| Form | react-hook-form + `zodResolver(<schema từ contracts>)`; `applyApiError` gắn lỗi server vào field |
| UI | Chỉ dùng `@playora/ui/components/*` và token màu (`bg-primary`, `text-muted-foreground`…); không hard-code màu. Xem [13-design-system.md](./13-design-system.md) |
| i18n | next-intl, locale lấy từ cookie `playora_locale` (mặc định `vi`); key có type sinh từ `vi.json` |
| Thông báo | `toast` từ `sonner` |
| Route có type | `typedRoutes: true`; link động cần `as Route` |

### 6.2 Play (Player / Kiosk)

- Ưu tiên nhẹ: shell người chơi chưa dùng TanStack Query hay next-intl cho tới M1, để giữ bundle nhỏ.
- Game surface được lazy-load theo template (M1).
- Bề mặt người chơi (và kiosk ở M3) bọc trong `GameRoot` (`@playora/ui/game/*`); chỉ dùng token `--game-*` để skin và brand kit đổi được ([13-design-system.md](./13-design-system.md)).

### 6.3 Thêm component shadcn

```bash
cd packages/ui && bunx shadcn@4.22.1 add <name> --yes
grep -rl 'from "cn"' src/components | xargs sed -i '' 's#from "cn"#from "@playora/ui/lib/utils"#'
```

CLI hiện ghi sai alias `utils` thành package npm `cn` và tự cài package đó. Phải sửa import như trên, đồng thời gỡ `cn` khỏi `packages/ui/package.json` nếu nó xuất hiện.

---

## 7. Testing

| Lớp | Công cụ | Ở đâu | Bắt buộc khi |
|---|---|---|---|
| Unit | `bun test` | Cạnh file (`*.test.ts`) | Logic thuần (core, permissions, contracts, client) |
| Integration API | `bun test` + `createTestApp()` + DB `playora_test` | `apps/api/test/*.e2e.test.ts` | Mọi module API: happy path, validate 400, 401, **cross-tenant 403/404**, conflict |
| Contract | `ResponseContractInterceptor` (tự bật trong test) | — | Luôn bật ngoài production |
| E2E | Playwright (desktop + Pixel 7) | `tooling/e2e/tests` | Luồng chính của người dùng; fixture fail khi trình duyệt có lỗi console |
| Tải | k6 Play API (`tooling/loadtest`; script `loadtest:shake` cũ sẽ gỡ cùng live engine) | `tooling/loadtest` | Trước mỗi pilot lớn; Gate G1a |

DB test được tạo và migrate tự động (`@playora/db/testing`). Dữ liệu test dùng email và slug ngẫu nhiên, nên chạy lại không cần dọn.

---

## 8. Git, review, CI/CD

- **Nhánh:** `feat/…`, `fix/…`, `chore/…` tách từ `main`; squash merge.
- **Commit message:** theo Conventional Commits, lefthook kiểm tra tự động. Ví dụ: `feat(api): add games module`.
- **pre-commit:** Biome tự format các file đã stage.
- **CI** (`.github/workflows/ci.yml`):
  1. `check`: lint, migrate, typecheck, test, build.
  2. `e2e`: Playwright trên stack thật.
  3. `docker`: build image cả 5 app (api, worker, studio, play, web).
- **Docker:** `turbo prune` → cài deps → build → runtime. Service NestJS chạy `bun dist/main.js`; app Next.js chạy standalone trên Node 24. Biến `NEXT_PUBLIC_*` truyền vào bằng build-arg.

---

## 9. Lưu ý đã biết

| Vấn đề | Cách xử lý |
|---|---|
| Bun bỏ qua cờ decorator trong tsconfig kế thừa | Khai báo trong tsconfig của từng app NestJS |
| TypeScript 7 không có JS API cho Next.js | Pin TS 6.0.3 (ADR-007) |
| `nestjs-zod` chưa hỗ trợ Nest 12 | Dùng `@Route` / `@Args` + `ZodValidationPipe` tự viết |
| `@nest-lab/throttler-storage-redis` chưa hỗ trợ Nest 12 | `RedisThrottlerStorage` tự viết (Lua, atomic) |
| Next.js trong Bun isolated linker | App Next phải tự khai báo `typescript` và `@types/node` |
| Postinstall của `@swc/core`, `@parcel/watcher` bị Bun chặn | Giữ chặn; dùng binary prebuilt |
| Cổng 5432/6379 hay trùng dự án khác | Dev dùng 54329/63799 |
