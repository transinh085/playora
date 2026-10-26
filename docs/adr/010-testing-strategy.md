# ADR-010: Chiến lược test

| | |
|---|---|
| **Trạng thái** | Accepted |
| **Ngày** | 23/10/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | [../engineering/conventions.md](../engineering/conventions.md) §7 |

## Bối cảnh

Sai sót nguy hiểm nhất của sản phẩm là phát sai giải và lộ dữ liệu giữa các tổ chức. Test phải chạy trên stack thật để bắt được hai loại lỗi này, và đủ nhanh để chạy song song nhiều worktree.

## Quyết định

1. **Unit** bằng `bun test`, đặt cạnh mã nguồn. Bắt buộc cho logic thuần (`packages/core` gồm prize engine, permissions, contracts, client).
2. **Integration API trên stack thật:** `createTestApp()` khởi động đúng `AppModule` + `configureApp` như production, trên DB `<db>_test` do `@playora/db/testing` tự tạo và migrate. Người dùng và tổ chức được tạo qua Better Auth thật. Dữ liệu test ngẫu nhiên (email, slug) nên chạy lại không cần dọn và chạy song song được.
3. Mỗi module API **bắt buộc** có test happy path, 400, 401 và **cross-tenant 403/404**.
4. **Contract tại runtime:** response được kiểm theo contract trong dev/test.
5. **E2E Playwright** chạy desktop và mobile (Pixel 7). Fixture tự fail khi trình duyệt log lỗi.
6. CI chạy `check` → `e2e` + `docker` song song.
7. **Prize engine:** mô phỏng 1 triệu lượt, 0 sai lệch tồn kho/ngân sách/giới hạn.

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| Mock DB/ORM trong integration test | Không bắt được lỗi SQL, ràng buộc unique, transaction |
| Snapshot test UI | Giòn; cân nhắc visual test cho surface Player của template ở M2 |

## Hệ quả

- **Tốt:** lỗi tenant và lỗi SQL bị bắt trước khi merge.
- **Chi phí:** test API cần Postgres/Valkey dev (`bun run infra:up`).
- **Rủi ro:** e2e dùng chung cổng dev giữa các worktree; chỉ chạy khi không worktree khác đang chạy (AGENTS.md).

## Kiểm chứng

- `bun run ci` xanh là điều kiện "xong".
- Lỗi i18n `slugHint` đầu tiên được e2e phát hiện nhờ fixture bắt lỗi console.

## Lịch sử

- 23/10/2026: Accepted.
- 26/10/2026: chuẩn hoá theo [mẫu ADR](./000-template.md); thêm mục 7 (mô phỏng prize engine, vốn đã là tiêu chí nghiệm thu trong PRD).
