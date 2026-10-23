# ADR-004: Realtime bằng Socket.IO, một node ở M1

**Trạng thái:** Accepted (sơ bộ) · 23/10/2026 · Spike S0-3

## Quyết định
- NestJS gateway + Socket.IO 4.8 (`perMessageDeflate: false`, payload ≤ 4 KB), namespace `/live`, room theo `evt:{eventId}` và theo vai trò.
- M1 chỉ chạy **một node** realtime; room state nằm trong bộ nhớ. Room affinity (HAProxy hash theo `eventId`) và snapshot/resume qua Redis làm ở M2 (docs/05 §6, §14).
- Input người chơi được gom ở client 250 ms; server giới hạn ≤ 8 lần lắc/input và ≥ 200 ms giữa các input.
- Broadcast: screen/host 10 Hz, player 2 Hz.

## Kết quả spike (tooling/loadtest/shake-race.ts, MacBook arm64, client và server cùng máy)

| Người chơi | Input/s | p50 | p95 | p99 | Event-loop lag | RSS | Rớt kết nối |
|---|---|---|---|---|---|---|---|
| 300 | 1.200 | 12 ms | 22 ms | 29 ms | ≤ 1 ms | 69 MB | 0 |
| 5.000 | 20.000 | 39–51 ms | 72–101 ms | 75–132 ms | thường ≤ 8 ms, đỉnh 50 ms | 127–182 MB | 0 |

Đạt NFR (p95 < 150 ms).

## Còn phải làm
- Chạy lại với client trên máy khác và qua mạng thật (Wi-Fi/4G), server trên VM 4 vCPU giống production.
- Đo thêm lúc join đồng loạt (1.000 người quét QR trong 10 giây).
