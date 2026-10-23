# 10 — Dev setup, convention và CI/CD

Cập nhật: 23/10/2026 · Áp dụng từ M0 (task E0.1–E0.8)

---

## 1. Yêu cầu môi trường

- Bun (pin version trong `packageManager` của root `package.json`)
- Docker Desktop / OrbStack
- Node LTS (chỉ khi một app chạy fallback theo ADR-002)
- `gh` CLI, `k6` (load test)

---

## 2. Scaffold monorepo

> **Đã scaffold ngày 23/10/2026.** Hướng dẫn chạy thực tế nằm ở [`README.md`](../README.md) ở root. Các lệnh scaffold dưới đây chỉ để tham khảo: repo được dựng tay, không dùng `create-next-app` hay Nest CLI. Postgres dev chạy ở cổng **54329**, Valkey ở **63799** để tránh trùng dự án khác.

### Lệnh scaffold gốc (tham khảo)

```bash
# 1. Root
mkdir -p apps packages/games tooling infra docs/adr
bun init -y
bun add -d turbo @biomejs/biome typescript

# 2. Next.js apps
bunx create-next-app@latest apps/studio --ts --tailwind --app --src-dir --use-bun --no-eslint
bunx create-next-app@latest apps/play   --ts --tailwind --app --src-dir --use-bun --no-eslint
bunx create-next-app@latest apps/web    --ts --tailwind --app --src-dir --use-bun --no-eslint

# 3. NestJS apps
bunx @nestjs/cli new apps/api      --package-manager bun --skip-git --strict
bunx @nestjs/cli new apps/realtime --package-manager bun --skip-git --strict
bunx @nestjs/cli new apps/worker   --package-manager bun --skip-git --strict

# 4. Packages (tạo tay theo template package nội bộ ở mục 3)
#    db, contracts, core, game-sdk, game-registry, ui, api-client, realtime-client, auth, i18n, env, tsconfig

# 5. Xoá lockfile/node_modules con, cài từ root
rm -rf apps/*/node_modules apps/*/bun.lock apps/*/.git
bun install
```

> Sau khi scaffold: xoá ESLint/Prettier mặc định của Nest và chuyển sang Biome root; gom tsconfig về `packages/tsconfig`.

### 2.1 Root `package.json`

```json
{
  "name": "playora",
  "private": true,
  "packageManager": "bun@<pin-version>",
  "workspaces": ["apps/*", "packages/*", "packages/games/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "biome check .",
    "format": "biome format --write .",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "db:generate": "bun --cwd packages/db drizzle-kit generate",
    "db:migrate": "bun --cwd packages/db drizzle-kit migrate",
    "db:studio": "bun --cwd packages/db drizzle-kit studio",
    "db:seed": "bun packages/db/src/seed.ts",
    "gen:api-client": "bun tooling/scripts/gen-api-client.ts",
    "gen:template": "bun tooling/scripts/gen-template.ts",
    "infra:up": "docker compose -f infra/compose/docker-compose.dev.yml up -d",
    "infra:down": "docker compose -f infra/compose/docker-compose.dev.yml down"
  }
}
```

### 2.2 `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build":     { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] },
    "dev":       { "cache": false, "persistent": true },
    "typecheck": { "dependsOn": ["^typecheck"] },
    "test":      { "dependsOn": ["^build"], "outputs": [] }
  }
}
```

### 2.3 `infra/compose/docker-compose.dev.yml`

```yaml
services:
  postgres:
    image: postgres:17
    environment: { POSTGRES_USER: playora, POSTGRES_PASSWORD: playora, POSTGRES_DB: playora }
    ports: ["5432:5432"]
    volumes: [pg:/var/lib/postgresql/data]
  valkey:
    image: valkey/valkey:8
    ports: ["6379:6379"]
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment: { MINIO_ROOT_USER: playora, MINIO_ROOT_PASSWORD: playora123 }
    ports: ["9000:9000", "9001:9001"]
    volumes: [minio:/data]
  mailpit:
    image: axllent/mailpit
    ports: ["1025:1025", "8025:8025"]
volumes: { pg: {}, minio: {} }
```

> Pin tag image theo digest hoặc patch version khi đưa lên staging/prod.

### 2.4 Cổng dev

| App | Port |
|---|---|
| web | 3000 |
| studio | 3001 |
| play | 3002 |
| api | 4000 |
| realtime | 4001 |
| worker (health) | 4002 |

---

## 3. Internal package template

```json
// packages/core/package.json
{
  "name": "@playora/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts", "./prize": "./src/prize/index.ts" },
  "scripts": { "typecheck": "tsc --noEmit", "test": "bun test" },
  "dependencies": { "@playora/contracts": "workspace:*" },
  "devDependencies": { "@playora/tsconfig": "workspace:*" }
}
```

- Next.js: `transpilePackages: ['@playora/ui', '@playora/game-sdk', '@playora/contracts', …]` trong `next.config.ts`.
- NestJS: `tsconfig` bật `experimentalDecorators` và `emitDecoratorMetadata`. Bun đọc được. Nếu fallback Node thì build bằng tsdown/SWC.

---

## 4. Convention

### 4.1 Code

| Hạng mục | Quy ước |
|---|---|
| Ngôn ngữ | TypeScript `strict`, `noUncheckedIndexedAccess` |
| Lint/format | Biome (root `biome.json`); pre-commit bằng `lefthook` chạy `biome check --staged` |
| Đặt tên | File `kebab-case.ts`; React component `PascalCase.tsx`; Nest `xxx.module.ts`/`xxx.service.ts`/`xxx.controller.ts` |
| Package scope | `@playora/*`; game: `@playora/game-<key>` |
| Import | Không import sâu vào package khác ngoài `exports`; không import chéo app |
| Lỗi | Domain error có `code` (enum trong `contracts/errors.ts`); Nest exception filter map sang HTTP |
| Env | Mỗi app parse env bằng zod (`@playora/env`) lúc khởi động, sai thì crash sớm |
| Thời gian | Server dùng UTC; hiển thị theo `event.timezone` |
| Tiền | Số nguyên VND |
| Log | pino JSON; luôn kèm `requestId`, `orgId`, `eventId`; không log PII |

### 4.2 NestJS module layout (`apps/api/src`)

```
modules/
  auth/        org/        client/      brand-kit/   asset/
  event/       game/       template/    player/      play/
  prize/       award/      analytics/   export/      billing/
  admin/       audit/      webhook/     privacy/
common/        # guards (OrgGuard, RolesGuard, PlayerGuard), interceptors, filters, pipes (ZodValidationPipe)
infra/         # db.provider.ts, redis.provider.ts, queue.provider.ts, storage.provider.ts
main.ts
```

Mỗi module chia: `*.controller.ts` (mỏng) → `*.service.ts` (orchestration) → `*.repository.ts` (Drizzle, nhận `orgId`) và gọi `@playora/core` cho logic thuần.

### 4.3 Next.js layout (`apps/studio/src`)

```
app/
  (auth)/login/
  (app)/[orgSlug]/events/            # danh sách
  (app)/[orgSlug]/events/[eventId]/  # tổng quan, games, prizes, players, reports
  (app)/[orgSlug]/events/[eventId]/games/[gameId]/edit/
  (live)/live/[eventId]/host/        # Host Console (layout tối giản)
  (admin)/admin/                     # MVP admin
components/   features/   lib/   hooks/
```

### 4.4 Git

- Trunk-based: nhánh ngắn `feat/LIV-06-shake-race`, `fix/…`; squash merge vào `main`.
- Commit theo Conventional Commits (`feat(realtime): …`).
- PR template: liên kết ID PRD, ảnh hoặc video với UI, checklist test thiết bị, ghi chú migration.
- `main` luôn deploy được lên staging; production deploy bằng tag `vYYYY.MM.DD-N`.

---

## 5. Testing

| Loại | Công cụ | Phạm vi | Chạy khi |
|---|---|---|---|
| Unit | `bun test` | `packages/core` (prize, pacing, provably-fair), server module của template, validators | Mọi PR |
| Integration | `bun test` + Postgres/Valkey (service container CI) | Repository, prize award atomic (test song song 100 request), cross-tenant guard | Mọi PR |
| E2E | Playwright | Luồng tạo event → publish → player join → chơi → award; Host điều khiển vòng | PR vào `main` (subset), nightly (full) |
| Realtime | `bun test` + socket.io-client | RoundRunner, resume, ownership lock | Mọi PR |
| Load | k6 (`tooling/k6`) | 5.000 WS shake race; 1.000 rps draw | Trước mỗi pilot lớn, nightly tuần |
| Thiết bị thật | Device lab + checklist | Player/Screen | Mỗi release có UI thay đổi |

**Test bắt buộc cho prize engine:** property-based (fast-check). Với mọi chuỗi request song song, tổng `issued` ≤ `quantity` và không có `play` nào có 2 award.

---

## 6. CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml (rút gọn)
name: ci
on: [pull_request, push]
jobs:
  check:
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:17, env: { POSTGRES_PASSWORD: test }, ports: ['5432:5432'] }
      valkey:   { image: valkey/valkey:8, ports: ['6379:6379'] }
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bunx turbo run typecheck test build --filter='...[origin/main]'
        env: { DATABASE_URL: postgres://postgres:test@localhost:5432/postgres, REDIS_URL: redis://localhost:6379 }
  docker:
    if: github.ref == 'refs/heads/main'
    needs: check
    # build & push image cho từng app thay đổi → GHCR; deploy staging qua Kamal/Dokploy
```

- **Docker:** `infra/docker/Dockerfile.next` (multi-stage, `output: 'standalone'`), `infra/docker/Dockerfile.nest` (runtime Bun, hoặc Node khi fallback). Dùng `turbo prune <app> --docker` để image nhỏ.
- **Migration:** job riêng chạy `db:migrate` trước khi deploy app; migration phải tương thích ngược.
- **Freeze:** workflow production kiểm tra API "event calendar". Có sự kiện `isCritical` trong khung freeze thì chặn deploy (override cần 2 người duyệt).

---

## 7. Checklist "Day 1" cho dev mới

1. `bun install && bun run infra:up && bun run db:migrate && bun run db:seed`
2. `bun run dev`, mở Studio `localhost:3001` (tài khoản seed `demo@playora.local`)
3. Mở event demo, rồi Screen `localhost:3002/s/<demo-key>`, rồi Player `localhost:3002/demo-yep` trên điện thoại cùng LAN
4. Chạy bot: `bun tooling/bots/run.ts --event demo-yep --n 200`
5. Đọc [05-architecture.md](./05-architecture.md), [07-api-realtime.md](./07-api-realtime.md), và ADR trong `docs/adr/`
