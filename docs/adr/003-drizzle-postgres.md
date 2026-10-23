# ADR-003: Drizzle ORM + postgres.js

**Trạng thái:** Accepted · 23/10/2026

## Quyết định
- `drizzle-orm` **0.45.4** (bản stable mới nhất; 1.0 đang ở RC, sẽ đánh giá lại khi ra stable), `drizzle-kit` 0.31.11, driver `postgres` 3.4.9 (chạy trên cả Bun và Node).
- `casing: 'snake_case'`: tên cột TS dạng camelCase, DB dạng snake_case.
- **Migration:** `bun run db:generate` sinh SQL vào `packages/db/drizzle/`, review trong PR, áp bằng `db:migrate`. Không dùng `drizzle-kit push` trên staging/prod.
- ID nghiệp vụ là UUIDv7 sinh ở app. Bảng của Better Auth dùng text id, nên `organization_id` là `text` có FK tới `organization.id`.
- Bảng auth (`packages/db/src/schema/auth.ts`) được **sinh bằng CLI Better Auth** (`bun --cwd packages/auth run generate:schema`); không sửa tay file này.
