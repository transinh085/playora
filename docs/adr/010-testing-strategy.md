# ADR-010: Chiến lược test

**Trạng thái:** Accepted · 23/10/2026

## Quyết định
1. **Unit** bằng `bun test`, đặt cạnh mã nguồn.
2. **Integration API trên stack thật:** `createTestApp()` khởi động đúng `AppModule` + `configureApp` như production, trên DB `<db>_test` do `@playora/db/testing` tự tạo và migrate. Người dùng và tổ chức được tạo qua Better Auth thật.
3. Mỗi module API **bắt buộc** có test cross-tenant.
4. **Contract tại runtime:** response được kiểm theo contract trong môi trường dev/test.
5. **E2E Playwright** chạy desktop và mobile (Pixel 7). Fixture tự fail khi trình duyệt log lỗi; lỗi i18n `slugHint` đầu tiên được phát hiện theo cách này.
6. CI chạy `check` → `e2e` + `docker` song song.

## Không làm (hiện tại)
- Mock DB/ORM trong integration test.
- Snapshot test UI. Sẽ cân nhắc visual test cho Screen/LED ở M1.
