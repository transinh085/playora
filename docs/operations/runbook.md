# Runbook vận hành

Cập nhật: 26/10/2026 · Owner: Tech Lead (founder) · Liên quan: [environments-deploy.md](./environments-deploy.md), [engineering/security.md](../engineering/security.md), [engineering/architecture.md §11](../engineering/architecture.md#11-observability-đích), [business/compliance.md](../business/compliance.md)

Viết cho **một người** vừa code vừa trực. Mục tiêu: chương trình của khách không phát sai giải, và khi có sự cố thì biết làm gì trong 5 phút đầu. Nhiều bước ở đây phụ thuộc dashboard và alert chưa có (đích); trước khi có, kiểm tra bằng truy vấn SQL và log.

---

## 1. Vận hành chương trình

### 1.1 Lịch hằng tuần

- Xem danh sách chương trình bắt đầu hoặc có mốc quan trọng trong **7 ngày tới**: chương trình lớn, mùa cao điểm (Tết, 8/3, Trung thu…), bốc thăm cuối chương trình.
- Với chương trình lớn: chạy load test Play API theo lưu lượng dự kiến của khách; tăng tài nguyên trước ngày mở nếu cần ([environments-deploy.md §2](./environments-deploy.md#2-production-theo-giai-đoạn)).
- Đánh dấu mốc quan trọng (`events.is_critical`) để áp cửa sổ đóng băng ([environments-deploy.md §8](./environments-deploy.md#8-cửa-sổ-đóng-băng-freeze-window)).

### 1.2 Trước giờ mở một chương trình (chương trình dựng hộ hoặc khách mới)

- [ ] Đã chơi thử bằng link nháp (dữ liệu `rehearsal`, không trừ kho thật).
- [ ] Giải: số lượng, ngân sách, giới hạn mỗi người khớp với điều chủ quán nói; mô phỏng phát giải không cho thấy hết quà sớm.
- [ ] QR in ra quét được, mở đúng chương trình, trên ít nhất một máy Android tầm thấp và Zalo in-app.
- [ ] Nhân viên quầy đã đăng nhập được màn Đổi quà trên điện thoại và đổi thử một mã chạy thử.
- [ ] Chủ quán đã xác nhận loại chương trình và nghĩa vụ thông báo khuyến mại ([business/compliance.md §2](../business/compliance.md#2-quy-định-khuyến-mại-luật-thương-mại-nđ-812018-sửa-đổi-bởi-nđ-1282024-hiệu-lực-01122024)).

### 1.3 Trong lúc chạy

Theo dõi: lượt chơi/giây, lỗi 5xx, độ trễ p95 của lượt chơi, giải còn lại so với đường kế hoạch, tỷ lệ lượt bị gắn cờ, số mã đã đổi.

## 2. Sự cố

Nguyên tắc chung: **ưu tiên không phát sai giải hơn là giữ game chạy.** Khi nghi ngờ tính đúng của giải, tạm dừng chương trình trước, điều tra sau. Mọi thao tác chỉnh tay (tồn kho, mở lại mã đổi) phải qua Studio/API có audit, không sửa thẳng DB trừ khi bắt buộc; nếu buộc phải sửa DB thì ghi lại câu lệnh và lý do.

| Sự cố | Dấu hiệu | Làm ngay | Sau đó |
|---|---|---|---|
| **Giải phát lệch đường kế hoạch** | Giải còn lại thấp hơn nhiều so với pacing; khách báo "hết quà" sớm | Kiểm tra cấu hình pacing và giờ mở; nếu sai cấu hình → tạm dừng, báo chủ quán, sửa bằng version mới | So sánh `awards` theo giờ với kế hoạch; thêm test mô phỏng cho trường hợp này |
| **Nghi phát vượt tồn kho/ngân sách** | `issued > quantity`, `remaining < 0`, tổng giá trị vượt ngân sách | **Tạm dừng chương trình ngay** | Đây là lỗi nghiêm trọng nhất: tìm nguyên nhân, viết test tái hiện trước khi mở lại; báo chủ quán bằng văn bản |
| **Tỷ lệ gắn cờ tăng đột biến** | Nhiều lượt bị chặn từ một IP/thiết bị; nhiều người chơi mới trong vài phút | Siết preset chống gian lận (lên Chuẩn/Cao), chặn IP/thiết bị cụ thể | Xem lại người trúng trong khoảng thời gian đó; void giải gian lận có lý do |
| **Khách thật bị chặn nhầm** | Quán báo khách không chơi được; nhiều khách sau cùng một wifi quán | Nới rate limit theo IP cho chương trình đó (ưu tiên token/thiết bị hơn IP) | Ghi lại để chỉnh mặc định |
| **Postgres chậm** | p95 lượt chơi > 200 ms, timeout, lỗi 5xx | Kiểm tra kết nối đang mở, truy vấn chậm, khoá chờ trên dòng `prizes` | Thêm index; nếu tranh chấp kho cao thì chia kho thành bucket ([engineering/architecture.md §7.3](../engineering/architecture.md#73-cấp-giải-nguyên-tử)) |
| **API sập / 5xx hàng loạt** | Health `/v1/health/ready` lỗi | Khởi động lại container; nếu do bản deploy mới thì rollback về SHA trước đó bằng `./infra/scripts/deploy.sh <prev-sha>` | Postmortem ngắn trong runbook |
| **Valkey mất** | Rate limit và cache lỗi | Giải vẫn đúng vì tính đúng nằm ở Postgres ([ADR-012](../adr/012-campaign-architecture.md)); khởi động lại `valkey` (`docker compose -f infra/compose/docker-compose.prod.yml --env-file infra/env/.env.prod restart valkey`) | Theo dõi gian lận tăng trong khoảng mất Valkey |
| **Mất mạng tại quầy** | Nhân viên không mở được màn Đổi quà | Nhân viên ghi mã đổi quà ra giấy, đổi lại khi có mạng; khuyên quán dùng 4G dự phòng | Mã đổi quà dùng một lần, nên đổi bù không tạo ra đổi trùng |
| **Đổi nhầm quà** | Nhân viên báo đổi sai mã | Owner mở lại mã trong Studio, có lý do (audit) | |

## 3. Checklist kỹ thuật trước pilot

### 3.1 Ứng dụng, tải và bảo mật

- [x] Test cross-tenant tự động cho mọi endpoint Studio đều xanh (27/10/2026, `apps/api/test/*.e2e.test.ts`).
- [x] Test mô phỏng 1 triệu lượt: 0 vượt tồn kho, 0 vượt ngân sách, 0 vượt giới hạn/người (`acceptance.test.ts`; `PRIZE_SIM_FULL=1` chạy 4 triệu).
- [ ] k6 Play API ở đỉnh dự kiến: p95 < 200 ms, 0 lỗi 5xx, kết quả khớp DB. Đã đạt trên laptop 26/10 (p95 150 ms, [REPORT](../../tooling/loadtest/REPORT.md)); chạy lại trên VM production.
- [ ] Mã hoá PII + HMAC lookup hoạt động; key không nằm trong repo.
- [ ] Rate limit, Turnstile, giới hạn tốc độ phát giải đã bật. Code xong (mức Chuẩn mặc định); cần `TURNSTILE_*` thật trên production.
- [ ] Đã thử trên thiết bị thật: iPhone SE, iPhone đời gần, Samsung A-series, Xiaomi tầm thấp, Zalo/Facebook in-app.

### 3.2 Hạ tầng, sao lưu và giám sát (P2.5)

- [ ] **Backup đã chạy thử (`backup tested`):** chạy `./infra/scripts/backup.sh` trên VM production, xác nhận file `.dump` và `.dump.sha256` xuất hiện trên bucket S3 (`BACKUP_S3_BUCKET`) và cron hằng ngày đã bật.
- [ ] **Diễn tập khôi phục (`restore drill`):** chạy `TARGET_DATABASE_URL=<db-drill> RESTORE_CONFIRM=yes ./infra/scripts/restore.sh <latest-dump>`, kiểm tra số dòng `events`, `prizes`, `awards`, `voucher_codes` khớp và ghi thời gian khôi phục thực tế (RTO: `___ giây`, ngày diễn tập: `___/___/2026`).
- [ ] **Uptime monitor:** đã cấu hình kiểm tra định kỳ (mỗi 60 giây) cho `https://api.playora.vn/v1/health/ready` (kỳ vọng HTTP 200 và `"status":"ok"`), `https://studio.playora.vn/login`, `https://play.playora.vn` và `https://playora.vn`.
- [ ] **Kênh cảnh báo (`alert channel`):** cảnh báo khi `/v1/health/ready` lỗi liên tiếp ≥ 2 lần, chứng chỉ TLS sắp hết hạn, lỗi 5xx hoặc độ trễ tăng cao đã gửi thử thành công về điện thoại founder (Telegram / Zalo / cuộc gọi khẩn).

Checklist pháp lý tương ứng: [business/compliance.md §5](../business/compliance.md#5-checklist-pháp-lý-trước-chương-trình-thật-đầu-tiên).

## 4. Liên lạc khẩn

- Mỗi chương trình có **một đầu mối của quán** (tên, số điện thoại, Zalo) lưu trong ghi chú chương trình trước khi mở.
- Playora có một số điện thoại/Zalo trực cho chủ quán; trong mùa cao điểm, ghi rõ khung giờ trực.
- Khi tạm dừng một chương trình đang chạy: gọi đầu mối của quán trước, sau đó gửi tin nhắn ghi lý do và thời gian dự kiến mở lại.

## 5. Nhật ký sự cố

Ghi mỗi sự cố một dòng: ngày, chương trình, triệu chứng, nguyên nhân, cách xử lý, việc cần làm để không lặp lại.

| Ngày | Chương trình | Sự cố | Nguyên nhân | Xử lý | Việc tiếp theo |
|---|---|---|---|---|---|
| | | | | | |
