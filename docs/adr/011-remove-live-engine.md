# ADR-011: Gỡ live engine (realtime/LED) khỏi sản phẩm

**Trạng thái:** Accepted · 24/10/2026 · Thay thế [ADR-004](./004-realtime-socketio-single-node.md)

## Bối cảnh
[Chiến lược v2.1](../00-product-strategy.md) (§6, ghi chú v2.1 ở cuối §10) bỏ hẳn **Live add-on**: không game LED/sân khấu, không Host Console, không Screen, không shake/tap race, không run-of-show. Sản phẩm chỉ còn minigame có thưởng (async, `instant`/`skill`) + builder + prize engine + lớp agency + booth/kiosk (M3). Lucky draw sân khấu được thay bằng **bốc thăm cuối chương trình** online (PRZ-02, M2), chạy từ Studio qua REST, có trang công bố kết quả; không cần WebSocket.

Code M0/M1 đã có cho live: `apps/realtime` (`LiveRoom`, `RoundRunner`, gateway Socket.IO `/live`), `packages/realtime-client`, module `live` và `screens` trong API, contract `live`/`screens`, schema `packages/db/src/schema/live.ts` (`live_rounds`, `round_scores`, `event_screens`), screen key và live token, Play `/screen`, tab Screens trong Studio, template `tap-race` trong `packages/templates`.

## Quyết định
1. Tạo tag git **`archive/live-engine`** trên commit hiện tại của `main` trước khi xoá, để có thể khôi phục.
2. Gỡ khỏi `main` trong một PR riêng (`chore: remove live engine`, Sprint 1 story 1.0, [09](../09-roadmap-plan.md)):
   - `apps/realtime`, `packages/realtime-client`;
   - module `live`, `screens` trong `apps/api`; contract `live.ts`, `screens.ts` (và khỏi `allRoutes`);
   - bảng `live_rounds`, `round_scores`, `event_screens` (migration drop mới, không sửa migration cũ), screen key, live token;
   - Play `/screen`, Studio `events/[eventId]/screens`; template `tap-race`, surface `screen`/`host` trong `game-sdk`;
   - `packages/contracts/src/ws.ts`, env `REALTIME_*`, `realtimeEnvSchema`;
   - mã lỗi và khoá i18n chỉ dùng cho live/screen.
   - **Không xoá mù** `packages/core/src/live` (token): player join (`public.service.ts`) đang ký `playerToken` bằng `signLiveToken`/`LIVE_TOKEN_SECRET`. Đổi thành token phiên người chơi của Play API (`core/session`, `PLAYER_SESSION_SECRET`, xem ADR-012) trong cùng PR hoặc ngay sau; `packages/core/src/draw` (provably-fair) giữ lại cho bốc thăm cuối chương trình.
3. Play engine (`instant` + `skill`) và prize engine chạy trên **API** (REST, stateless, scale ngang). Không có dịch vụ realtime riêng.
4. Dashboard campaign "realtime" (ANL-01) dùng polling/SSE từ API, không dùng lại Socket.IO.

## Hệ quả
- **Load test M1 nhắm Play API** (k6, đỉnh 500 lượt chơi/giây/campaign, p95 < 200 ms, PRD §8.3) thay vì k6 2.000 client WebSocket. Gate G1a không còn tiêu chí Live.
- **ADR-004 bị thay thế** (Superseded by ADR-011). Số liệu spike vẫn giữ trong ADR-004 làm tham khảo.
- Hạ tầng đơn giản hơn: không cần room affinity, sticky session hay snapshot room trên Redis; Valkey chỉ còn cho cache, rate limit, BullMQ và bộ đếm prize engine.
- Socket.IO không còn là dependency cần thiết; ADR-002 vẫn đúng cho `api` và `worker`.
- Khi nào quay lại live (không trước 2028, xem 00 §6), khôi phục từ tag `archive/live-engine` và viết ADR mới.
