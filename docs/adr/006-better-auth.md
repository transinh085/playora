# ADR-006: Better Auth cho organizer

**Trạng thái:** Accepted · 23/10/2026

## Quyết định
- `better-auth` 1.7.12, Drizzle adapter, email + mật khẩu, plugin `organization` (multi-tenant). Google và magic link bật ở M1.
- Mount trên API tại `/auth/*`. Express được tạo với `bodyParser: false` để Better Auth đọc raw body; `express.json()` được gắn sau.
- Studio dùng `better-auth/react` với `baseURL = API/auth`. Ở local, cookie dùng chung host `localhost` nên đăng nhập chạy được giữa :3001 và :4000. Production đặt cookie domain `.playora.vn`.
- Tuỳ chọn dùng chung (`packages/auth/src/options.ts`) được cả runtime và CLI sinh schema sử dụng.
- Player **không** dùng Better Auth; dùng JWT ngắn hạn theo event (M1).
