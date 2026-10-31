# Đặc tả Tham gia, Giữ chân và Chống gian lận

Cập nhật: 31/10/2026 · Owner: PO · PRD: EVT-*, RET-* ([prd §5.4–5.5](../prd.md#54-tham-gia-và-chương-trình-evt)) · Kỹ thuật: [security §1](../../engineering/security.md) · Pháp lý dữ liệu: [compliance](../../business/compliance.md)

---

## 1. Danh tính người chơi

| Cách | Mô tả | GĐ |
|---|---|---|
| Ẩn danh | `deviceId` lưu trên trình duyệt; kèm chống gian lận mức Chuẩn | M1 |
| Form | Tên, SĐT (mặc định); trường thêm do quán chọn; consent tách mục đích (`participation` bắt buộc, `marketing` tuỳ chọn) | M1 |
| Danh sách khách mời | Import Excel (mã, tên, nhóm); khách nhập mã hoặc quét QR cá nhân | Chưa lên lịch (có ở module sự kiện cũ, không có trong mô hình Chương trình — EVT-02) |
| Chơi trước, SĐT sau | Chỉ người trúng nhập tên + SĐT + consent trước khi thấy mã (EVT-17) | M2 |
| OTP SĐT | ZNS ưu tiên, SMS dự phòng; chặn đầu số ảo (EVT-03) | M2 |
| Zalo | Đăng nhập Zalo / Zalo Mini App, lấy SĐT đã xác thực (EVT-04) | M3 |

Mặc định của playbook F&B: **form tên + SĐT**, vì quán cần liên hệ để nhắc quay lại ([playbooks](./playbooks.md)). Một SĐT là một người chơi trong mỗi chương trình; SĐT đã gắn thiết bị khác thì báo trùng (409 `PHONE_ALREADY_REGISTERED`), không gộp phiên ([D-22](../decisions.md)). Khách đổi trình duyệt cứu mã quà bằng tra theo SĐT ở quầy hoặc khôi phục Quà của tôi ([D-25](../decisions.md), PRZ-15, PRZ-16). Form tối thiểu hoá dữ liệu: cảnh báo khi quán thêm trường nhạy cảm.

## 2. Điều kiện tham gia

| Điều kiện | Mô tả | GĐ |
|---|---|---|
| Thời gian | Ngày bắt đầu/kết thúc; ngày mở trong tuần (`openDays`); giờ mở cửa một khung mỗi ngày (`openingHours`) | M1 |
| Lượt chơi | Lượt/ngày (1–100); phải đổi quà trước khi chơi tiếp (`requireRedeemBeforeReplay`); lượt chỉ bị trừ khi lượt chơi thật sự được tạo (tổng/khung giờ: chưa lên lịch) | M1 |
| Hạn mức gói | Không giới hạn lượt chơi/người chơi; chạm trần cứng lượt đổi quà (hạn mức + 10%) thì ngừng phát giải mới, lượt chơi vẫn chạy ([D-23](../decisions.md)) | M1 |
| Mã tại quầy | Máy quầy hiện mã 4 số đổi mỗi 30 phút; bật thì phải nhập mã mới mở lượt (EVT-16); dễ bị coi là gắn mua hàng → CMP-03 | M2 |
| Thêm lượt khi chia sẻ | Có giới hạn N lượt/ngày; lượt thêm chỉ cộng khi người được mời ghé quán và đổi quà; không ép rủ bạn ([strategy §7](../strategy.md#7-nguyên-tắc-sản-phẩm), EVT-14) | M2 |
| Mã tham gia | Một người một mã / một lần một mã / dùng chung; in trên hoá đơn hoặc nắp ly; mỗi mã có QR tự điền (EVT-07) | M3 |
| Up hoá đơn | Chụp hoá đơn để được lượt; duyệt tay, OCR về sau (EVT-08) | M4 |
| Vị trí | GPS (điểm + bán kính), cảnh báo vì GPS giả được | M4 |

Luật hiện cho chủ quán bằng **câu dễ hiểu**: "Mỗi khách quay 1 lần mỗi ngày, từ 8h đến 22h, từ 20/01 đến 10/02."

## 3. Giữ chân

Engine thứ ba ([builder §2.2](./builder.md#22-engine-và-renderer)): trạng thái người chơi qua nhiều ngày.

| Tính năng | Mô tả | Chỉ số | GĐ |
|---|---|---|---|
| Bốc mỗi ngày (RET-02) | Mỗi ngày một lượt mới; màn Kết quả nói rõ "Mai quay tiếp" | % khách chơi ≥ 2 ngày | M2 (M1 đã có lượt theo ngày) |
| Quà lần sau (RET-06) | Đổi quà xong tặng voucher cố định, dùng từ ngày mai, hạn 14 ngày; quà tặng không ngẫu nhiên, ghi trong thể lệ | Khách quay lại | M1 (Could) / M2 |
| Nút Zalo OA (RET-07) | Kết quả và Quà của tôi có nút "Quan tâm quán trên Zalo" (link do quán nhập) | — | M1 (Should) |
| Điểm danh (RET-01) | Chuỗi ngày ghé quán (xác thực bằng mã tại quầy); quà theo mốc 3/7/14 ngày | Chuỗi trung bình | M2 |
| Thẻ thành viên QR (RET-08) | QR cá nhân trong Quà của tôi; quầy quét khi khách không có quà → ghi lượt ghé (cần hồ sơ khách ANL-08) | Lượt ghé đã xác thực | M2 |
| Nhắc quay lại (RET-05) | ZNS: "Hôm nay bạn còn 1 lượt", "Voucher sắp hết hạn" (cần consent marketing) | % quay lại sau tin | M3 |
| Hub điểm thưởng (RET-03) | Mỗi lượt đổi quà/điểm danh cộng điểm; đổi điểm lấy quà của quán | Số dư điểm hoạt động | M3 |
| Sưu tầm thẻ (RET-04) | Gom đủ bộ thẻ để đổi quà lớn; không có cơ chế xin thẻ từ bạn | % hoàn thành bộ | M3 |

## 4. Chống gian lận theo mức

| Biện pháp | Thấp (danh sách khách mời) | Chuẩn (mặc định quán) | Cao (giải giá trị lớn, M2 — chưa có) |
|---|---|---|---|
| Server quyết định kết quả, token lượt dùng một lần | ✅ | ✅ | ✅ |
| Một thiết bị một người chơi | ✅ | ✅ | ✅ |
| Rate limit IP / thiết bị / token | Lỏng (wifi chung) | ✅ | ✅ chặt |
| Turnstile (captcha ẩn) | ❌ | ✅ | ✅ |
| Thu hồi token khi bất thường (`session_ver`) | ❌ | ✅ | ✅ |
| OTP / Zalo bắt buộc | ❌ | Tuỳ (từ M2) | ✅ |
| Chặn VPN/proxy, đầu số ảo | ❌ | ❌ | ✅ |
| Plausibility điểm (skill) | ✅ | ✅ | ✅ |
| Blacklist | ❌ | ❌ | ✅ |
| Gắn cờ tự động + duyệt tay trước khi phát giải lớn | ❌ | ❌ | ✅ |
| Giới hạn tốc độ phát giải | ❌ | ❌ | ✅ |

Từ M2 (cùng mức Cao): Tổng quan hiện số lượt bị chặn bởi chống gian lận; mỗi người bị gắn cờ có lý do ([D-28](../decisions.md)). Chi tiết mối đe doạ và biện pháp kỹ thuật: [security §1](../../engineering/security.md).

## 5. Kênh phân phối

| Kênh | Mô tả | GĐ |
|---|---|---|
| Link + QR | `play.playora.vn/{slug}`; tải QR PNG/SVG; trang in standee, tent card để bàn (`/share/print`, in/PDF bằng trình duyệt) | M1 |
| Link theo kênh | `?ch=qr-ban`, `?ch=fanpage`, `?ch=zalo-oa`; thống kê theo kênh | M1 |
| Poster chia sẻ | Ảnh poster có QR | M2 |
| Kiosk | Tablet tại quầy, tự reset sau mỗi người, khoá điều hướng | M3 |
| Zalo Mini App | Wrapper, định danh Zalo | M3 |
| Embed, custom domain | iframe/script vào web của quán; `game.tenquan.vn` | M4 |
