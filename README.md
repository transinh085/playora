# Playora

> Minigame có thưởng giúp quán nhỏ kéo khách tới và giữ khách quay lại: dựng trong vài phút, giải không phát sai, đổi quà tại quầy, báo cáo bằng kết quả. **"Minigame kéo khách về quán."**

Tài liệu sản phẩm và kỹ thuật: [`docs/`](./docs/README.md). Bắt đầu từ [`docs/product/strategy.md`](./docs/product/strategy.md); hướng dẫn cho AI agent ở [`AGENTS.md`](./AGENTS.md).

## Yêu cầu

- [Bun](https://bun.sh) 1.4.x (`npm i -g bun` hoặc installer chính thức)
- Docker (OrbStack / Docker Desktop)
- Node 24 (Next.js CLI chạy trên Node)

## Chạy lần đầu

```bash
cp .env.example .env                 # rồi đặt BETTER_AUTH_SECRET=$(openssl rand -hex 32)
bun install
bun run infra:up                     # Postgres :54329, Valkey :63799, MinIO :9000/:9001, Mailpit :8025
bun run db:migrate
bun run db:seed                      # org demo + event "demo-yep" + 500 khách mời
bun run dev                          # mọi app qua Turborepo
```

| App           | URL                      | Mô tả                                        |
| ------------- | ------------------------ | -------------------------------------------- |
| `apps/web`    | http://localhost:3000    | Landing                                      |
| `apps/studio` | http://localhost:3001    | Studio (builder); `/login` đăng nhập/đăng ký |
| `apps/play`   | http://localhost:3002    | Player (`/demo-yep`)                         |
| `apps/api`    | http://localhost:4000/v1 | REST API (NestJS); Better Auth tại `/auth/*` |
| `apps/worker` | http://localhost:4002    | BullMQ worker (health)                       |

## Lệnh thường dùng

```bash
bun run lint            # Biome (lint + format check); bun run format để tự sửa
bun run typecheck       # tsc trên mọi workspace
bun run test            # unit + integration (API dùng DB playora_test tự tạo)
bun run e2e             # Playwright; lần đầu: bun --cwd tooling/e2e run e2e:install
bun run ci              # như CI: lint + typecheck + test + build
bun run build
bun run db:generate     # sinh migration SQL từ schema Drizzle (review trước khi commit)
bun --cwd packages/auth run generate:schema   # sinh lại bảng Better Auth khi đổi plugin
```

Thêm tính năng mới: làm theo [`docs/engineering/conventions.md` §3](./docs/engineering/conventions.md#3-quy-trình-thêm-một-tính-năng-ví-dụ-games). Module `events` là mẫu chuẩn từ contract đến API, test và Studio.

## Cấu trúc

```
apps/       web · studio · play (Next.js 16)  |  api · worker (NestJS 12 trên Bun)
packages/   contracts (zod) · api-client · db (Drizzle) · auth (Better Auth + RBAC) · jobs (BullMQ)
            core · game-sdk · templates · ui (antd) · i18n · env · tsconfig
tooling/    e2e (Playwright) · loadtest · scripts
infra/      compose (dev) · docker (Dockerfile.nest, Dockerfile.next)
docs/       product · business · research · engineering · operations · adr (xem docs/README.md)
```
