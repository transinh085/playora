# ADR-002: NestJS 12 chạy trên Bun

**Trạng thái:** Accepted (sơ bộ) · 23/10/2026 · Spike S0-2

## Bối cảnh
Stack đã chọn là Bun + NestJS. Rủi ro là decorator metadata, ESM, Socket.IO và BullMQ khi chạy trên Bun.

## Kết quả spike
- **NestJS 12.2** (thuần ESM) chạy trên Bun 1.4.4: DI, controller, exception filter, Socket.IO gateway, `createApplicationContext` + BullMQ worker đều chạy.
- `bun build --target=bun --packages=external` tạo bundle chạy được và giữ decorator metadata (đã kiểm `dist/main.js` của API).
- **Lỗi đã gặp:** Bun **không áp dụng** `experimentalDecorators` / `emitDecoratorMetadata` khi chúng nằm trong tsconfig kế thừa từ package (`extends: "@playora/tsconfig/nestjs.json"`). Bun rơi về decorator chuẩn TC39 và Nest báo `descriptor.value` undefined. **Cách xử lý:** khai báo hai cờ này trực tiếp trong `tsconfig.json` của từng app NestJS.

## Quyết định
Chạy `api`, `worker` trên Bun (`realtime` đã gỡ ở v2.1, ADR-011). Giữ code tương thích Node (postgres.js, ioredis, `node:http`) để có thể fallback sang Node 24 LTS cho từng app mà không đổi code.

## Còn phải làm
- Soak test 24h (rò rỉ bộ nhớ, reconnect Redis/Postgres).
- k6 HTTP 1.000 rps cho API.
