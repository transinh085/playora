# ADR-004: Realtime bằng Socket.IO, một node ở M1

| | |
|---|---|
| **Trạng thái** | Superseded by [ADR-011](./011-remove-live-engine.md) (24/10/2026) |
| **Ngày** | 23/10/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | Spike S0-3 · code lưu ở tag `archive/live-engine` |

> Live engine đã bị gỡ khỏi sản phẩm. ADR này chỉ còn giá trị tham khảo (số liệu spike) nếu sau 2028 quay lại game màn hình lớn.

## Bối cảnh

Chiến lược v1–v2.0 có game LED/sân khấu (shake race, tap race) với hàng nghìn điện thoại gửi input cùng lúc, cần kênh realtime hai chiều độ trễ thấp (NFR p95 < 150 ms).

## Quyết định

- NestJS gateway + Socket.IO 4.8 (`perMessageDeflate: false`, payload ≤ 4 KB), namespace `/live`, room theo `evt:{eventId}` và theo vai trò.
- M1 chỉ chạy **một node** realtime; room state nằm trong bộ nhớ. Room affinity (HAProxy hash theo `eventId`) và snapshot/resume qua Redis để M2.
- Input người chơi gom ở client 250 ms; server giới hạn ≤ 8 lần lắc/input và ≥ 200 ms giữa các input.
- Broadcast: screen/host 10 Hz, player 2 Hz.

## Phương án đã cân nhắc

Không ghi lại lúc quyết định.

## Hệ quả

- Một node realtime có trạng thái trong bộ nhớ: đơn giản nhưng là điểm lỗi đơn. Bị thay bằng kiến trúc stateless khi bỏ live engine.

## Kiểm chứng

Spike (`tooling/loadtest/shake-race.ts`, MacBook arm64, client và server cùng máy):

| Người chơi | Input/s | p50 | p95 | p99 | Event-loop lag | RSS | Rớt kết nối |
|---|---|---|---|---|---|---|---|
| 300 | 1.200 | 12 ms | 22 ms | 29 ms | ≤ 1 ms | 69 MB | 0 |
| 5.000 | 20.000 | 39–51 ms | 72–101 ms | 75–132 ms | thường ≤ 8 ms, đỉnh 50 ms | 127–182 MB | 0 |

Đạt NFR (p95 < 150 ms).

Gate G1a (24/10/2026), chạy lại với M1 engine đầy đủ (`LiveRoom` actor, `RoundRunner`, `tap-race` qua `@playora/game-sdk`, snapshot Redis định kỳ 1 s có dirty flag, ownership lock, xác thực JWT/screen key):

| Người chơi | Thời lượng | Kết nối thành công | Input/s | p50 | p95 | p99 | Event-loop lag | CPU (server) | RSS | Rớt kết nối |
|---|---|---|---|---|---|---|---|---|---|---|
| 2.000 | 60 s | 2.000 / 2.000 | 8.000 (40.000 / 5 s) | 0–19 ms | 0–43 ms (thường ≤ 1 ms) | 1–51 ms (thường ≤ 3 ms) | 0–8 ms (thường 1 ms) | 17–36% (~25% TB) | 124–156 MB | 0 |

Các tối ưu giữ độ trễ không suy giảm so với spike:

- Bỏ `saveRoomSnapshot` trên từng `input`; chỉ snapshot mỗi 1 s khi `room.dirty === true` và tại mỗi bước chuyển trạng thái round.
- Cache bảng xếp hạng/điểm đội theo `WeakMap<TapRaceState, ...>` trong `tap-race` để `toPlayerView` ở 2 Hz có độ phức tạp O(1) mỗi người chơi thay vì sắp xếp lại O(N log N) mỗi socket.
- Gửi `round.view` trực tiếp qua `server.sockets.get(socketId)?.emit(...)` thay vì cấp phát mảng `[...socketIds]` và `BroadcastOperator` mỗi tick.

Chưa từng làm (không còn cần): chạy với client trên máy khác qua mạng thật (Wi-Fi/4G) trên VM 4 vCPU; đo join đồng loạt (1.000 người quét QR trong 10 giây).

## Lịch sử

- 23/10/2026: Accepted (sơ bộ) sau spike S0-3.
- 24/10/2026: thêm kết quả Gate G1a; cùng ngày Superseded by [ADR-011](./011-remove-live-engine.md).
- 26/10/2026: chuẩn hoá theo [mẫu ADR](./000-template.md).
