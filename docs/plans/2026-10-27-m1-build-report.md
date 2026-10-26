Cập nhật: 27/10/2026 · Owner: founder · Liên quan: [roadmap](../product/roadmap.md), [prd](../product/prd.md), [runbook](../operations/runbook.md), [infra/README](../../infra/README.md)

# Báo cáo build M1: P0 → P2 (26–27/10/2026)

Mục tiêu: xây Playora tới mức sẵn sàng pilot theo [roadmap](../product/roadmap.md) P0 → P2, theo các quyết định ngày 26/10 (ADR-015 phương án A; D-16, D-17, D-20 chốt cho M1).

## 1. Đã có trong code (main)

| Phase | Việc | Trạng thái | Kiểm chứng |
|---|---|---|---|
| P0.1 | Contract `campaigns`, `plays`, `vouchers`, `report`, `billing`; ADR-015 Accepted | ✅ | `packages/contracts/src/api/*` |
| P0.2 | Bảng `plays`, `play_counters`, đổi quà trên `awards`; nối `core/prize` vào API | ✅ | `apps/api/test/plays.e2e.test.ts` (50 người tranh 5 quà → đúng 5; ngân sách và giới hạn/người dưới tải đồng thời) |
| P0.3 | API lượt chơi idempotent; Play chạy Bìa → Form → Game → Kết quả → Quà của tôi | ✅ | e2e `play-campaign.spec.ts` (mobile) |
| P0.4 | Quầy đổi quà thật; vai trò "chỉ đổi quà" (`redeemer`) | ✅ | `vouchers.e2e.test.ts` (20 yêu cầu đồng thời → đổi đúng 1 lần) |
| P0.5 | Studio bỏ backend giả, dùng API thật; e2e cross-tenant | ✅ | e2e `builder-lab.spec.ts`; cross-tenant trong mọi file `apps/api/test/*.e2e.test.ts` |
| P0.6 | 1 triệu lượt mô phỏng; k6 500 lượt/giây | ✅ | `packages/core/src/prize/acceptance.test.ts`; [loadtest REPORT](../../tooling/loadtest/REPORT.md): p95 150 ms, 0 lỗi, sổ kho khớp |
| P1.1 | Tạo chương trình bắt đầu bằng mục tiêu; 3 playbook F&B | ✅ | e2e `playbook-create.spec.ts` (3 màn tới editor) |
| P1.2 | Ngân sách, giá vốn, gợi ý cơ cấu quà, mô phỏng theo ngân sách | ✅ | `lib/suggest.ts` (Σ q·c ≤ B có test) |
| P1.3 | Tổng quan theo kết quả, báo cáo một trang in A4 | ✅ | `campaign-report.e2e.test.ts` (số khớp tuyệt đối), e2e `campaign-report.spec.ts` |
| P1.4 | Link theo kênh `?ch=`, QR từng kênh, thống kê theo kênh | ✅ | e2e `share-qr.spec.ts` |
| P1.5 | Chống gian lận Thấp/Chuẩn: rate limit, Turnstile, một thiết bị một người, thu hồi token | ✅ | `anti-fraud.e2e.test.ts` |
| P2.1 | Art thật cho 3 mẫu × skin | ⬜ việc bên ngoài | Đang dùng hình preset/SVG |
| P2.2 | Standee A5, tent card A6 in QR | ✅ | `/campaigns/:id/share/print` |
| P2.3 | Kích hoạt gói thủ công, quota lượt đổi quà/tháng, watermark Free, back-office `/admin` | ✅ | `billing.e2e.test.ts`, e2e `billing.spec.ts` |
| P2.4 | Thể lệ sinh từ cấu hình (sửa được), loại chương trình, checklist pháp lý trước phát hành | ✅ code · ⬜ ý kiến luật sư | `core/compliance/terms.ts` |
| P2.5 | Compose production 1 VM, Caddy, backup/restore/deploy, CI đẩy image GHCR | ✅ code · ⬜ hạ tầng thật | [infra/README](../../infra/README.md) |
| P2.6 | Cào thẻ, mở hộp trên API thật | ✅ | e2e `play-mechanisms.spec.ts`; hứng quà dời M2 (roadmap §1.4) |

Dọn dẹp: UI events/games/guests cũ đã gỡ (API giữ nguyên vì Campaign dựng trên các bảng đó).

## 2. Gate

| Gate | Tiêu chí | Kết quả |
|---|---|---|
| **P0** | Trên điện thoại thật: quét QR → quay → nhận mã → đổi tại quầy → số hiện ở Tổng quan; 0 sai lệch mô phỏng | Luồng đầy đủ chạy bằng e2e trên viewport mobile với API thật; 0 sai lệch ở 1 triệu (và 4 triệu) lượt. **Còn:** thử trên điện thoại thật (founder). |
| **P1** | 5 người không làm thiết kế dựng chương trình Tết từ playbook trong ≤ 10 phút | Luồng 3 màn, mặc định chỉ cần nhập ngân sách. **Còn:** test với 5 người thật (founder). |
| **P2** | Checklist kỹ thuật trong runbook xanh; ≥ 5 quán đã hẹn ngày chạy | Phần code xanh (CI 36/36, e2e 18/18). **Còn:** hạ tầng thật, backup/restore drill, thiết bị thật, quán pilot (founder). |

## 3. Quyết định chờ founder duyệt

- **D-21** (`docs/product/decisions.md`): cho vượt quota lượt đổi quà 10% trước khi chặn ở quầy, để không làm quán mất mặt với khách đã trúng.
- **D-22**: một SĐT chỉ là một người chơi mỗi chương trình; đổi thiết bị với cùng SĐT bị báo trùng (an toàn hơn khi chưa có OTP, nhưng khách đổi trình duyệt sẽ bị chặn).
- Thông tin chuyển khoản trên trang "Gói & sử dụng" đang là placeholder: `apps/studio/src/features/billing/lib/plans.ts`.

## 4. Việc bên ngoài cần mua hoặc đăng ký

Chi tiết cấu hình ở [infra/README](../../infra/README.md) và [runbook §3](../operations/runbook.md).

| # | Việc | Để làm gì |
|---|---|---|
| 1 | Tên miền `playora.vn` (nhà đăng ký được VNNIC công nhận) | Studio, Play, API, landing |
| 2 | Tài khoản Cloudflare: DNS, proxy, WAF; tạo **Turnstile site** lấy site key + secret | Chống bot mức Chuẩn (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`) |
| 3 | 1 VM tại Việt Nam (4 vCPU / 8 GB, VNG/FPT/Viettel Cloud) | Chạy compose production |
| 4 | PostgreSQL 17 managed có PITR (cùng vùng) | Dữ liệu chính |
| 5 | Object storage S3-compatible: bucket asset + bucket backup | Ảnh quán, backup |
| 6 | SMTP gửi mail (magic link, mời thành viên) | Đăng nhập, mời nhân viên quầy |
| 7 | Google OAuth client (tuỳ chọn) | Đăng nhập Google |
| 8 | Uptime monitor (Better Stack/UptimeRobot) + kênh cảnh báo (Telegram) | Giám sát |
| 9 | Tài khoản ngân hàng/VietQR thật cho trang gói | Thu tiền thủ công (M2 mới có PayOS) |
| 10 | Art thật cho 3 mẫu × skin Tết/quanh năm/khai trương (thuê ngoài hoặc mua bộ hình) | P2.1 |
| 11 | Ý kiến luật sư: khuyến mại may rủi gắn mua hàng, PDPL; ToS, Privacy Policy, DPA tiếng Việt | P2.4, compliance §5 |
| 12 | Sinh khoá bí mật production (`openssl rand -base64 32`): `BETTER_AUTH_SECRET`, khoá ký token người chơi, `PII_ENCRYPTION_KEY`, `PII_HMAC_KEY` | Production từ chối giá trị dev |
| 13 | Thiết bị thử: iPhone SE, iPhone mới, Samsung A, Xiaomi tầm thấp; mở trong Zalo/Facebook in-app | Gate P0 |
| 14 | 5–10 quán pilot có ngày chạy; 5 người thử dựng chương trình | Gate M0, P1, P2 |
