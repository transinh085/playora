# ADR-002: NestJS 12 chạy trên Bun

| | |
|---|---|
| **Trạng thái** | Accepted (sơ bộ, còn soak test) |
| **Ngày** | 23/10/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | Spike S0-2 · [ADR-001](./001-monorepo-bun-turborepo.md), [ADR-011](./011-remove-live-engine.md) |

## Bối cảnh

Stack đã chọn là Bun + NestJS. Rủi ro là decorator metadata, ESM và BullMQ khi chạy trên Bun (lúc spike còn có Socket.IO cho live engine, nay đã gỡ).

## Quyết định

- Chạy `apps/api` và `apps/worker` trên **Bun** (`realtime` đã gỡ ở [ADR-011](./011-remove-live-engine.md)).
- `experimentalDecorators` + `emitDecoratorMetadata` khai báo **trực tiếp trong `tsconfig.json` của từng app NestJS**, không để trong tsconfig kế thừa.
- Build bằng `bun build --target=bun --packages=external`; chạy `bun dist/main.js`.
- Giữ code tương thích Node (postgres.js, ioredis, `node:http`) để có thể fallback sang **Node 24 LTS** cho từng app (build bằng tsdown/SWC) mà không đổi code.
- Import class injectable bằng value (`import { X }`, không `import type`), vì Nest cần metadata lúc runtime.

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| NestJS trên Node LTS ngay từ đầu | Thêm một runtime và bước build; spike cho thấy Bun chạy được. Giữ làm phương án dự phòng |
| Framework nhẹ hơn (Hono, Elysia) | Mất DI, guard, interceptor và hệ sinh thái Nest mà pipeline contract/guard đang dựa vào |

## Hệ quả

- **Tốt:** một runtime cho cả repo; dev khởi động nhanh.
- **Chi phí:** phải nhớ quy tắc tsconfig và import value (đã ghi trong AGENTS.md).
- **Rủi ro:** rò rỉ bộ nhớ hoặc lỗi reconnect khi chạy dài chưa được đo. Nếu xảy ra: chuyển app đó sang Node.

## Kiểm chứng

Kết quả spike (đạt):

- **NestJS 12.2** (thuần ESM) chạy trên Bun 1.4.4: DI, controller, exception filter, `createApplicationContext` + BullMQ worker đều chạy (Socket.IO gateway cũng chạy, nay không còn dùng).
- `bun build --target=bun --packages=external` tạo bundle chạy được và giữ decorator metadata (đã kiểm `dist/main.js` của API).
- **Lỗi đã gặp:** Bun không áp dụng `experimentalDecorators` / `emitDecoratorMetadata` khi chúng nằm trong tsconfig kế thừa từ package (`extends: "@playora/tsconfig/nestjs.json"`). Bun rơi về decorator chuẩn TC39 và Nest báo `descriptor.value` undefined. Cách xử lý: quy tắc tsconfig ở mục Quyết định.

**Còn mở:**

- Soak test 24 h (rò rỉ bộ nhớ, reconnect Redis/Postgres).
- k6 HTTP 1.000 rps cho API.

## Lịch sử

- 23/10/2026: Accepted (sơ bộ).
- 24/10/2026: bỏ `apps/realtime` ([ADR-011](./011-remove-live-engine.md)); quyết định còn áp dụng cho `api` và `worker`.
- 26/10/2026: chuẩn hoá theo [mẫu ADR](./000-template.md).
