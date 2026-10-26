# ADR-007: Pin TypeScript 6.0

| | |
|---|---|
| **Trạng thái** | Accepted |
| **Ngày** | 23/10/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | [ADR-001](./001-monorepo-bun-turborepo.md) |

## Bối cảnh

TypeScript 7.0 (bản native) đã là `latest` nhưng không còn JS API (package không có `main`). Next.js 16 dùng JS API này để type-check và `next typegen`.

## Quyết định

Pin `typescript@6.0.3` cho toàn repo. Dùng `moduleResolution: "bundler"` và không dùng các tuỳ chọn đã deprecate ở 6.0 (ví dụ `baseUrl`).

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| TypeScript 7 | Next.js 16 không chạy được typecheck/typegen |
| TS 7 cho package, TS 6 cho app Next | Hai phiên bản trong một repo, khó hiểu, lợi ích nhỏ |

## Hệ quả

- **Tốt:** Next.js build và typegen chạy ổn định.
- **Chi phí:** chưa hưởng tốc độ typecheck của TS 7.

## Kiểm chứng

- `bun run typecheck` trong CI.
- **Đánh giá lại** khi Next.js hỗ trợ TS 7: có thể dùng `tsgo` cho typecheck nhanh hơn, giữ TS 6 cho tooling.

## Lịch sử

- 23/10/2026: Accepted.
- 26/10/2026: chuẩn hoá theo [mẫu ADR](./000-template.md).
