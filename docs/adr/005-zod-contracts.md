# ADR-005: Contracts bằng zod v4

**Trạng thái:** Accepted · 23/10/2026 (cập nhật 24/10/2026)

## Quyết định
- `packages/contracts` (zod 4.6) là nguồn chân lý cho REST DTO, WebSocket event, mã lỗi.
- `nestjs-zod` chưa hỗ trợ NestJS 12, nên dùng `ZodValidationPipe` tự viết (`apps/api/src/common`). Lỗi trả về theo dạng `{ error: { code, message, details } }` qua `ApiExceptionFilter`.
- OpenAPI sinh từ zod (`z.toJSONSchema`) sẽ làm khi có endpoint Studio đầu tiên (M1).

> [!NOTE] Cập nhật 24/10/2026 (B6/R5):
> `ZodValidationPipe` đã được gỡ bỏ hoàn toàn. Validation ở tầng API được tích hợp trực tiếp qua decorator `@Route(contract)` và `@Args()`, tự động parse và validate request `params`, `query`, `body` theo schema zod của từng route contract.
