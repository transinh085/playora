# ADR-005: Contracts bằng zod v4

**Trạng thái:** Accepted · 23/10/2026

## Quyết định
- `packages/contracts` (zod 4.6) là nguồn chân lý cho REST DTO, WebSocket event, mã lỗi.
- `nestjs-zod` chưa hỗ trợ NestJS 12, nên dùng `ZodValidationPipe` tự viết (`apps/api/src/common`). Lỗi trả về theo dạng `{ error: { code, message, details } }` qua `ApiExceptionFilter`.
- OpenAPI sinh từ zod (`z.toJSONSchema`) sẽ làm khi có endpoint Studio đầu tiên (M1).
