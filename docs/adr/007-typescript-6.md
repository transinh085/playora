# ADR-007: Pin TypeScript 6.0

**Trạng thái:** Accepted · 23/10/2026

## Bối cảnh
TypeScript 7.0 (bản native) đã là `latest` nhưng không còn JS API (package không có `main`). Next.js 16 dùng JS API này để type-check và `next typegen`.

## Quyết định
Pin `typescript@6.0.3` cho toàn repo. Dùng `moduleResolution: "bundler"` và không dùng các tuỳ chọn đã deprecate ở 6.0 (vd. `baseUrl`).

## Đánh giá lại
Khi Next.js hỗ trợ TS 7: có thể dùng `tsgo` cho typecheck nhanh hơn, giữ TS 6 cho tooling.
