# ADR-001: Monorepo Bun workspaces + Turborepo

| | |
|---|---|
| **Trạng thái** | Accepted |
| **Ngày** | 23/10/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | [ADR-002](./002-nestjs-on-bun.md), [ADR-007](./007-typescript-6.md) |

## Bối cảnh

Lúc scaffold có sáu app (3 Next.js, 3 NestJS; `realtime` đã gỡ ở [ADR-011](./011-remove-live-engine.md)) dùng chung schema DB, contracts zod, logic thuần và SDK game. Cần một repo, một lần cài đặt, type chạy xuyên suốt và build có cache.

## Quyết định

- **Bun 1.4.4** làm package manager (`packageManager` pin trong root `package.json`; `bunfig.toml` đặt `exact = true`). Bun dùng isolated linker (`node_modules/.bun`), nên mỗi workspace phải khai báo đúng dependency của mình.
- **Turborepo 2.11** điều phối `dev/build/typecheck/test`.
- **Internal packages export TypeScript source** (`"exports": { ".": "./src/index.ts" }`), không có bước build riêng. Next.js dùng `transpilePackages`; Bun chạy TS trực tiếp; `bun build` gộp package nội bộ vào bundle của app NestJS.
- **Biome 2.6** cho lint và format (không dùng ESLint/Prettier).
- Một file `.env` ở root. App NestJS nạp bằng `bun --env-file=../../.env`, app Next nạp trong `next.config.ts`, drizzle-kit nạp trong `drizzle.config.ts`.

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| pnpm + Turborepo | Ổn định hơn nhưng thêm một runtime/tool; Bun vừa là package manager, test runner vừa là runtime cho Nest ([ADR-002](./002-nestjs-on-bun.md)) |
| Nx | Nặng, nhiều quy ước riêng; Turborepo đủ cho cache task |
| Package nội bộ build ra `dist` | Thêm bước build và lệch nguồn; Next và Bun đều đọc được TS trực tiếp |

## Hệ quả

- **Tốt:** cài nhanh, một lockfile, đổi type ở package thì mọi app báo lỗi ngay.
- **Chi phí:** Next.js cần `typescript` và `@types/node` trong chính app (isolated linker). Nếu thiếu, `next typegen` sẽ cố chạy `npm install` và lỗi vì `workspace:*`.
- **Rủi ro:** Bun chặn postinstall của một số package (`@swc/core`, `@parcel/watcher`); giữ chặn, dùng binary prebuilt ([../engineering/conventions.md](../engineering/conventions.md) §9).

## Kiểm chứng

- Spike S0-1 **đạt**: `bun install`, lint, typecheck, test và build của 14 workspace đều xanh.
- `bun run ci` trong CI là kiểm chứng liên tục.

## Lịch sử

- 23/10/2026: Accepted.
- 26/10/2026: chuẩn hoá theo [mẫu ADR](./000-template.md); ghi chú `realtime` đã gỡ.
