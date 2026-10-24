# Architecture Decision Records

| ADR | Quyết định | Trạng thái | Ngày |
|---|---|---|---|
| [001](./001-monorepo-bun-turborepo.md) | Monorepo Bun workspaces + Turborepo; internal packages là TS source | Accepted | 23/10/2026 |
| [002](./002-nestjs-on-bun.md) | NestJS 12 chạy trên Bun (fallback Node LTS) | Accepted (sơ bộ, chờ soak 24h) | 23/10/2026 |
| [003](./003-drizzle-postgres.md) | Drizzle ORM 0.45 + postgres.js + drizzle-kit generate | Accepted | 23/10/2026 |
| [004](./004-realtime-socketio-single-node.md) | Socket.IO, một node realtime ở M1, room affinity sau | Superseded by [011](./011-remove-live-engine.md) | 23/10/2026 |
| [005](./005-zod-contracts.md) | Contracts bằng zod v4; validate qua @Route/@Args | Accepted (cập nhật 24/10/2026) | 23/10/2026 |
| [006](./006-better-auth.md) | Better Auth 1.7 mount trên API tại `/auth`, plugin organization | Accepted | 23/10/2026 |
| [007](./007-typescript-6.md) | Pin TypeScript 6.0, chưa lên 7 | Accepted | 23/10/2026 |
| [008](./008-contract-first-api.md) | API contract-first bằng zod, typed client không codegen, OpenAPI sinh lúc runtime | Accepted | 23/10/2026 |
| [009](./009-frontend-stack.md) | shadcn/ui trong packages/ui, TanStack Query, react-hook-form, next-intl (cookie locale) | Accepted | 23/10/2026 |
| [010](./010-testing-strategy.md) | Unit + integration trên DB thật + contract runtime + Playwright | Accepted | 23/10/2026 |
| [011](./011-remove-live-engine.md) | Gỡ live engine (realtime/LED) khỏi sản phẩm; code lưu ở tag `archive/live-engine` | Accepted | 24/10/2026 |
| [012](./012-campaign-architecture.md) | Kiến trúc v2: play engine + prize engine trên API, Game SDK v2 (`instant`/`skill`), dữ liệu campaign | Accepted | 24/10/2026 |
