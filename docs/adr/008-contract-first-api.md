# ADR-008: API contract-first bằng zod, không codegen

| | |
|---|---|
| **Trạng thái** | Accepted |
| **Ngày** | 23/10/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | [ADR-005](./005-zod-contracts.md) · [../engineering/api.md](../engineering/api.md), [../engineering/conventions.md](../engineering/conventions.md) §3 |

## Bối cảnh

Tài liệu ban đầu dự định dùng zod → OpenAPI → `openapi-fetch` (codegen). Với monorepo TypeScript, codegen thêm một bước build và có thể lệch so với server.

## Quyết định

- Mỗi route định nghĩa **một lần** bằng `defineRoute()` trong `@playora/contracts`: method, path, `auth`, `permission`, schema params/query/body/response, status. Route mới phải thêm vào `allRoutes`.
- **Server:** `@Route(contract)` gắn path, method và status; `@Args()` validate bằng chính schema đó; guard đọc `auth` và `permission` từ contract; `ResponseContractInterceptor` (dev/test) bắt response lệch contract. Controller không validate hay kiểm quyền tay.
- **Client:** `@playora/api-client` suy ra kiểu input/output trực tiếp từ contract, có hook TanStack Query ở `./react` (`useRouteQuery`, `useRouteMutation`).
- **OpenAPI 3.1** sinh lúc runtime từ `allRoutes` (`/v1/openapi.json`) cho public API và đối tác.
- Form ở Studio dùng lại schema zod của contract (`useZodForm(CreateEventBody)`, [ADR-013](./013-antd-ui.md)).

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| zod → OpenAPI → codegen client | Thêm bước build, có thể lệch server |
| tRPC / ts-rest | Thêm framework; khó đưa ra public API REST chuẩn cho đối tác |

## Hệ quả

- **Tốt:** đổi contract thì typecheck báo lỗi ngay ở cả server lẫn client.
- **Chi phí:** quy trình thêm tính năng phải bắt đầu từ contract (AGENTS.md).
- **Rủi ro:** quên đưa route vào `allRoutes` thì không có trong OpenAPI; test contract bắt một phần.

## Kiểm chứng

- Test contract kiểm tính duy nhất route và việc scope theo `:orgId`.
- `ResponseContractInterceptor` bật ngoài production.

## Lịch sử

- 23/10/2026: Accepted.
- 24/10/2026: form Studio chuyển sang antd `Form` + `useZodForm` ([ADR-013](./013-antd-ui.md)).
- 26/10/2026: chuẩn hoá theo [mẫu ADR](./000-template.md).
