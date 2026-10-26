# Đặc tả Tham gia, Giữ chân và Chống gian lận

Cập nhật: 26/10/2026 · Owner: PO · PRD: EVT-*, RET-* ([prd §5.4–5.5](../prd.md#54-tham-gia-và-chương-trình-evt)) · Kỹ thuật: [security §1](../../engineering/security.md) · Pháp lý dữ liệu: [compliance](../../business/compliance.md)

---

## 1. Danh tính người chơi

| Cách | Mô tả | GĐ |
|---|---|---|
| Ẩn danh | `deviceId` lưu trên trình duyệt; kèm chống gian lận mức Chuẩn | M1 |
| Form | Tên, SĐT (mặc định); trường thêm do quán chọn; consent tách mục đích | M1 |
| Danh sách khách mời | Import Excel (mã, tên, nhóm); khách nhập mã hoặc quét QR cá nhân | M1 |
| OTP SĐT | ZNS ưu tiên, SMS dự phòng; chặn đầu số ảo | M2 |
| Zalo | Đăng nhập Zalo / Zalo Mini App, lấy SĐT đã xác thực | M3 |

Mặc định của playbook F&B: **form tên + SĐT**, vì quán cần liên hệ để nhắc quay lại ([playbooks](./playbooks.md)). Form tối thiểu hoá dữ liệu: cảnh báo khi quán thêm trường nhạy cảm.

## 2. Điều kiện tham gia

| Điều kiện | Mô tả | GĐ |
|---|---|---|
| Thời gian | Ngày bắt đầu/kết thúc, khung giờ theo thứ, theo giờ quán | M1 |
| Lượt chơi | Theo ngày / tổng / khung giờ; lượt chỉ bị trừ khi thật sự chơi | M1 |
| Trần người chơi | Theo gói và theo cấu hình | M1 |
| Thêm lượt khi chia sẻ | Có giới hạn; không ép rủ bạn ([strategy §7](../strategy.md#7-nguyên-tắc-sản-phẩm)) | M2 |
| Mã tham gia | Một người một mã / một lần một mã / dùng chung; in trên hoá đơn hoặc nắp ly; mỗi mã có QR tự điền | M3 |
| Up hoá đơn | Chụp hoá đơn để được lượt; duyệt tay, OCR về sau | M4 |
| Vị trí | GPS (điểm + bán kính), cảnh báo vì GPS giả được | M4 |

Luật hiện cho chủ quán bằng **câu dễ hiểu**: "Mỗi khách quay 1 lần mỗi ngày, từ 8h đến 22h, từ 20/01 đến 10/02."

## 3. Giữ chân

Engine thứ ba ([builder §2.2](./builder.md#22-engine-và-renderer)): trạng thái người chơi qua nhiều ngày.

| Tính năng | Mô tả | Chỉ số | GĐ |
|---|---|---|---|
| Bốc mỗi ngày | Mỗi ngày một lượt mới; màn Kết quả nói rõ "Mai quay tiếp" | % khách chơi ≥ 2 ngày | M1 (lượt theo ngày) |
| Điểm danh | Chuỗi ngày ghé quán (xác thực bằng mã tại quầy); quà theo mốc 3/7/14 ngày | Chuỗi trung bình | M2 |
| Nhắc quay lại | ZNS: "Hôm nay bạn còn 1 lượt", "Voucher sắp hết hạn" (cần consent marketing) | % quay lại sau tin | M3 |
| Hub điểm thưởng | Mỗi lượt đổi quà/điểm danh cộng điểm; đổi điểm lấy quà của quán | Số dư điểm hoạt động | M3 |
| Sưu tầm thẻ | Gom đủ bộ thẻ để đổi quà lớn; không có cơ chế xin thẻ từ bạn | % hoàn thành bộ | M3 |

## 4. Chống gian lận theo mức

| Biện pháp | Thấp (danh sách khách mời) | Chuẩn (mặc định quán) | Cao (giải giá trị lớn, M2) |
|---|---|---|---|
| Server quyết định kết quả, token lượt dùng một lần | ✅ | ✅ | ✅ |
| Rate limit IP / thiết bị / token | Lỏng (wifi chung) | ✅ | ✅ chặt |
| Turnstile (captcha ẩn) | ❌ | ✅ | ✅ |
| OTP / Zalo bắt buộc | ❌ | Tuỳ | ✅ |
| Chặn VPN/proxy, đầu số ảo | ❌ | ❌ | ✅ |
| Plausibility điểm (skill) | ✅ | ✅ | ✅ |
| Blacklist | ✅ | ✅ | ✅ |
| Gắn cờ tự động + duyệt tay trước khi phát giải lớn | ❌ | Tuỳ | ✅ |
| Giới hạn tốc độ phát giải | ❌ | ✅ | ✅ |

Danh sách chương trình hiện số lượt đã kiểm / đã chặn; mỗi người bị gắn cờ có lý do. Chi tiết mối đe doạ và biện pháp kỹ thuật: [security §1](../../engineering/security.md).

## 5. Kênh phân phối

| Kênh | Mô tả | GĐ |
|---|---|---|
| Link + QR | `play.playora.vn/{slug}`; tải PNG/SVG/PDF; mẫu standee, tent card để bàn | M1 |
| Link theo kênh | `?ch=qr-ban`, `?ch=fanpage`, `?ch=zalo-oa`; thống kê theo kênh | M1 |
| Poster chia sẻ | Ảnh poster có QR | M2 |
| Kiosk | Tablet tại quầy, tự reset sau mỗi người, khoá điều hướng | M3 |
| Zalo Mini App | Wrapper, định danh Zalo | M3 |
| Embed, custom domain | iframe/script vào web của quán; `game.tenquan.vn` | M4 |
