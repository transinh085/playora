# ADR-011: Gỡ live engine (realtime/LED) khỏi sản phẩm

| | |
|---|---|
| **Trạng thái** | Accepted · đã thực hiện |
| **Ngày** | 24/10/2026 |
| **Người quyết định** | Founder |
| **Thay thế / Liên quan** | Thay [ADR-004](./004-realtime-socketio-single-node.md) · tiếp theo: [ADR-012](./012-campaign-architecture.md) |

## Bối cảnh

Chiến lược v2.1 bỏ hẳn **Live add-on**: không game LED/sân khấu, không Host Console, không Screen, không shake/tap race, không run-of-show (xem [../product/strategy.md](../product/strategy.md) và [../product/decisions.md](../product/decisions.md)). Sản phẩm chỉ còn minigame có thưởng (async, `instant`/`skill`) + builder + prize engine. Lucky draw sân khấu được thay bằng **bốc thăm cuối chương trình** online (PRZ-02), chạy từ Studio qua REST, có trang công bố kết quả; không cần WebSocket.

Code M0/M1 đã có cho live lúc đó: `apps/realtime` (`LiveRoom`, `RoundRunner`, gateway Socket.IO `/live`), `packages/realtime-client`, module `live` và `screens` trong API, contract `live`/`screens`, schema `live_rounds`, `round_scores`, `event_screens`, screen key và live token, Play `/screen`, tab Screens trong Studio, template `tap-race`.

## Quyết định

1. Tạo tag git **`archive/live-engine`** trước khi xoá, để có thể khôi phục.
2. Gỡ khỏi `main` trong một PR riêng:
   - `apps/realtime`, `packages/realtime-client`;
   - module `live`, `screens` trong `apps/api`; contract `live.ts`, `screens.ts`, `ws.ts` (và khỏi `allRoutes`);
   - bảng `live_rounds`, `round_scores`, `event_screens` bằng migration drop mới (không sửa migration cũ), screen key, live token;
   - Play `/screen`, Studio `events/[eventId]/screens`; template `tap-race`, surface `screen`/`host` trong `game-sdk`;
   - env `REALTIME_*`, `realtimeEnvSchema`; mã lỗi và khoá i18n chỉ dùng cho live/screen.
   - Không xoá mù `packages/core/src/live` (token): đổi thành token phiên người chơi (`core/session`, `PLAYER_SESSION_SECRET`); giữ `packages/core/src/draw` (provably-fair) cho bốc thăm cuối chương trình.
3. Play engine (`instant` + `skill`) và prize engine chạy trên **API** (REST, stateless, scale ngang). Không có dịch vụ realtime riêng.
4. Dashboard chương trình "realtime" (ANL-01) dùng polling/SSE từ API, không dùng lại Socket.IO.

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| Giữ live engine làm add-on ngủ đông trên `main` | Code chết vẫn phải bảo trì, làm nhiễu SDK và contract |
| Tách live thành repo riêng | Không có ai làm; tag git đủ để khôi phục |

## Hệ quả

- **Tốt:** hạ tầng đơn giản hơn (không room affinity, sticky session hay snapshot room trên Redis); Valkey chỉ còn cho cache, rate limit, BullMQ và bộ đếm.
- **Chi phí:** mất doanh thu YEP/sân khấu (chấp nhận ở tầng sản phẩm).
- **Rủi ro:** muốn quay lại live (không trước 2028) phải khôi phục từ tag `archive/live-engine` và viết ADR mới.

## Kiểm chứng

- Load test M1 nhắm **Play API** (k6, đỉnh 500 lượt chơi/giây/campaign, p95 < 200 ms) thay vì k6 2.000 client WebSocket.
- Kiểm 26/10/2026: tag `archive/live-engine` tồn tại; `apps/realtime`, `packages/realtime-client` đã không còn; `packages/env` dùng `PLAYER_SESSION_SECRET`.

## Lịch sử

- 24/10/2026: Accepted.
- 26/10/2026: chuẩn hoá theo [mẫu ADR](./000-template.md); xác nhận đã gỡ trong code.
