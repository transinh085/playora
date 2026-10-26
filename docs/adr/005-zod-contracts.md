# ADR-005: Contracts bằng zod v4, validate qua `@Route` / `@Args`

| | |
|---|---|
| **Trạng thái** | Accepted |
| **Ngày** | 23/10/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | [ADR-008](./008-contract-first-api.md) (định nghĩa route), [ADR-013](./013-antd-ui.md) (form dùng lại schema) |

## Bối cảnh

API, Studio, Play, editor game và validate config template đều cần cùng một định nghĩa dữ liệu. `nestjs-zod` chưa hỗ trợ NestJS 12.

## Quyết định

- `packages/contracts` (**zod 4.6**) là nguồn chân lý cho REST DTO và mã lỗi (`ErrorCode`).
- Validate ở API **không** dùng pipe: decorator `@Route(contract)` + `@Args()` (`apps/api/src/common`) tự parse và validate `params`, `query`, `body` theo schema zod của route contract. Controller không validate tay.
- Lỗi trả về dạng `{ error: { code, message, details?, requestId } }` qua `ApiExceptionFilter`. Mã lỗi mới phải thêm vào `ErrorCode` **và** `packages/i18n` `errors.*` (có test bắt).
- OpenAPI 3.1 sinh từ zod (`z.toJSONSchema`) tại `/v1/openapi.json` (module `apps/api/src/modules/openapi`).

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| `nestjs-zod` | Chưa hỗ trợ Nest 12 |
| `class-validator` DTO | Hai nguồn type (class + zod cho client); không dùng chung được với form và config template |
| `ZodValidationPipe` tự viết | Đã dùng lúc đầu; bị thay vì phải gắn tay ở từng handler, dễ quên |

## Hệ quả

- **Tốt:** một schema cho server, client, form Studio và OpenAPI.
- **Chi phí:** tự bảo trì `@Route`/`@Args` cho tới khi có thư viện tương thích Nest 12.
- **Rủi ro:** zod major mới đổi API; pin chính xác.

## Kiểm chứng

- `ResponseContractInterceptor` (dev/test) bắt response lệch contract.
- Test contract kiểm tính duy nhất route và việc scope theo `:orgId`; test i18n bắt `ErrorCode` thiếu message.

## Lịch sử

- 23/10/2026: Accepted với `ZodValidationPipe` tự viết; contracts còn gồm WebSocket event.
- 24/10/2026 (refactor B6/R5): gỡ hẳn `ZodValidationPipe`; validate qua `@Route(contract)` + `@Args()`.
- 24/10/2026: bỏ contract WebSocket (`ws.ts`) cùng live engine ([ADR-011](./011-remove-live-engine.md)).
- 26/10/2026: chuẩn hoá theo [mẫu ADR](./000-template.md); ghi nhận OpenAPI đã chạy tại `/v1/openapi.json`.
