# ADR-008: API contract-first bằng zod (không codegen)

**Trạng thái:** Accepted · 23/10/2026

## Bối cảnh
Tài liệu ban đầu dự định dùng zod → OpenAPI → `openapi-fetch` (codegen). Với monorepo TypeScript, codegen thêm một bước build và có thể lệch so với server.

## Quyết định
- Mỗi route định nghĩa **một lần** bằng `defineRoute()` trong `@playora/contracts`: method, path, `auth`, `permission`, schema params/query/body/response, status.
- **Server:** `@Route(contract)` gắn path, method và status; `@Args()` validate bằng chính schema đó; guard đọc `auth` và `permission` từ contract; `ResponseContractInterceptor` (dev/test) bắt response lệch contract.
- **Client:** `@playora/api-client` suy ra kiểu input/output trực tiếp từ contract, có hook TanStack Query ở `./react`.
- **OpenAPI 3.1** sinh lúc runtime từ `allRoutes` (`/v1/openapi.json`) cho public API và đối tác.
- Form ở Studio dùng lại schema zod của contract (`zodResolver(CreateEventBody)`).

## Hệ quả
- Đổi contract thì typecheck báo lỗi ngay ở cả server lẫn client.
- Thêm route mà quên đưa vào `allRoutes` sẽ không có trong OpenAPI. Test contract kiểm tra tính duy nhất và việc scope theo `:orgId`.
