# ADR-003: Drizzle ORM + postgres.js

| | |
|---|---|
| **Trạng thái** | Accepted |
| **Ngày** | 23/10/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | [ADR-006](./006-better-auth.md) · [../engineering/data-model.md](../engineering/data-model.md) |

## Bối cảnh

Cần ORM type-safe chạy được trên cả Bun và Node, migration là SQL đọc được để review, và PostgreSQL làm nguồn chân lý cho tồn kho giải (update có điều kiện, unique, transaction).

## Quyết định

- `drizzle-orm` **0.45.4** (bản stable mới nhất lúc chọn; 1.0 đang ở RC, đánh giá lại khi ra stable), `drizzle-kit` 0.31.11, driver `postgres` 3.4.9 (chạy trên cả Bun và Node).
- `casing: 'snake_case'`: tên cột TS dạng camelCase, DB dạng snake_case.
- **Migration:** `bun run db:generate` sinh SQL vào `packages/db/drizzle/`, review trong PR, áp bằng `db:migrate`. Không dùng `drizzle-kit push` trên staging/prod. Không sửa tay file đã sinh.
- ID nghiệp vụ là UUIDv7 sinh ở app. Bảng của Better Auth dùng text id, nên `organization_id` là `text` có FK tới `organization.id`.
- Bảng auth (`packages/db/src/schema/auth.ts`) được **sinh bằng CLI Better Auth** (`bun --cwd packages/auth run generate:schema`); không sửa tay file này.

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| Prisma | Engine riêng, client sinh code, khó viết SQL có điều kiện cho đường nóng lượt chơi |
| Kysely | Query builder tốt nhưng phải tự lo schema và migration |
| `drizzle-kit push` | Không có SQL để review; nguy hiểm trên staging/prod |

## Hệ quả

- **Tốt:** schema là TypeScript, migration là SQL review được.
- **Chi phí:** khi nhiều nhánh cùng thêm migration phải đánh số lại nhánh sau (AGENTS.md, mục Parallel agents).
- **Rủi ro:** Drizzle 1.0 có thể đổi API; nâng cấp có chủ đích, không theo `latest`.

## Kiểm chứng

- Integration test API chạy trên DB `playora_test` do `@playora/db/testing` tự tạo và migrate ([ADR-010](./010-testing-strategy.md)).

## Lịch sử

- 23/10/2026: Accepted.
- 26/10/2026: chuẩn hoá theo [mẫu ADR](./000-template.md).
