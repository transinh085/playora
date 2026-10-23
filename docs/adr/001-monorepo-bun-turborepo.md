# ADR-001: Monorepo Bun workspaces + Turborepo

**Trạng thái:** Accepted · 23/10/2026

## Bối cảnh
Sáu app (3 Next.js, 3 NestJS) dùng chung schema DB, contracts zod, logic thuần và SDK game.

## Quyết định
- **Bun 1.4.4** làm package manager (`packageManager` pin trong root `package.json`; `bunfig.toml` đặt `exact = true`). Bun dùng isolated linker (`node_modules/.bun`), nên mỗi workspace phải khai báo đúng dependency của mình.
- **Turborepo 2.11** điều phối `dev/build/typecheck/test`.
- **Internal packages export TypeScript source** (`"exports": { ".": "./src/index.ts" }`), không có bước build riêng. Next.js dùng `transpilePackages`; Bun chạy TS trực tiếp; `bun build` gộp package nội bộ vào bundle của app NestJS.
- **Biome 2.6** cho lint và format (không dùng ESLint/Prettier).
- Một file `.env` ở root. App NestJS nạp bằng `bun --env-file=../../.env`, app Next nạp trong `next.config.ts`, drizzle-kit nạp trong `drizzle.config.ts`.

## Hệ quả
- Next.js cần `typescript` và `@types/node` trong chính app (isolated linker). Nếu thiếu, `next typegen` sẽ cố chạy `npm install` và lỗi vì `workspace:*`.
- Spike S0-1 đạt: `bun install`, lint, typecheck, test và build của 14 workspace đều xanh.
