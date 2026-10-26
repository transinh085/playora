# ADR-006: Better Auth cho organizer, JWT riêng cho người chơi

| | |
|---|---|
| **Trạng thái** | Accepted |
| **Ngày** | 23/10/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | [ADR-003](./003-drizzle-postgres.md), [ADR-012](./012-campaign-architecture.md) (token phiên người chơi) |

## Bối cảnh

Studio cần tài khoản, tổ chức nhiều thành viên và vai trò (multi-tenant), tự host để sở hữu dữ liệu. Người chơi không có tài khoản, chỉ cần phiên ngắn theo từng chương trình.

## Quyết định

- `better-auth` **1.7.12**, Drizzle adapter, email + mật khẩu, plugin `organization` (multi-tenant). Google và magic link bật ở M1.
- Mount trên API tại `/auth/*`. Express được tạo với `bodyParser: false` để Better Auth đọc raw body; `express.json()` gắn sau.
- Studio dùng `better-auth/react` với `baseURL = API/auth`. Ở local, cookie dùng chung host `localhost` nên đăng nhập chạy được giữa :3001 và :4000. Production đặt cookie domain `.playora.vn`.
- Tuỳ chọn dùng chung (`packages/auth/src/options.ts`) cho cả runtime và CLI sinh schema. RBAC 5 vai trò ở `packages/auth/src/permissions.ts`.
- Người chơi **không** dùng Better Auth; dùng JWT ngắn hạn theo chương trình, ký bằng `PLAYER_SESSION_SECRET` ([ADR-012](./012-campaign-architecture.md)).

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| Auth.js / NextAuth | Gắn với Next; API Nest là nơi kiểm quyền |
| Dịch vụ ngoài (Clerk, Auth0) | Chi phí theo MAU, dữ liệu nằm ngoài VN, khó với PDPL |

## Hệ quả

- **Tốt:** có sẵn tổ chức, mời thành viên, vai trò; dữ liệu ở Postgres của mình.
- **Chi phí:** bảng auth sinh bằng CLI, không sửa tay; đổi plugin phải sinh lại.
- **Rủi ro:** thư viện còn trẻ; pin chính xác phiên bản.

## Kiểm chứng

- Integration test tạo user và tổ chức qua Better Auth thật ([ADR-010](./010-testing-strategy.md)); mọi module có test cross-tenant.

## Lịch sử

- 23/10/2026: Accepted.
- 24/10/2026: token người chơi đổi từ `LIVE_TOKEN_SECRET` sang `PLAYER_SESSION_SECRET` khi gỡ live engine.
- 26/10/2026: chuẩn hoá theo [mẫu ADR](./000-template.md).
