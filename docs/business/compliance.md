# Tuân thủ pháp lý: dữ liệu cá nhân, khuyến mại, hoá đơn

Cập nhật: 26/10/2026 · Owner: Founder · Liên quan: [engineering/security.md](../engineering/security.md), [product/prd.md](../product/prd.md), [product/specs/prizes-redemption.md](../product/specs/prizes-redemption.md), [product/specs/participation.md](../product/specs/participation.md)

> ⚠️ Đây là tóm tắt để định hướng sản phẩm, **không phải tư vấn pháp lý**. Cần luật sư xác nhận trước khi chạy chương trình có thưởng thương mại đầu tiên (ngân sách tư vấn ≤ 30 triệu đ `[GĐ]`).

Tách từ tài liệu bảo mật cũ (08) ngày 26/10/2026; phần kỹ thuật (chống gian lận, bảo mật ứng dụng) ở [engineering/security.md](../engineering/security.md).

---

## 1. Bảo vệ dữ liệu cá nhân: Luật 91/2025/QH15 (hiệu lực 01/01/2026)

Nguồn: [LuatVietnam](https://luatvietnam.vn/dan-su/luat-bao-ve-du-lieu-ca-nhan-2025-co-hieu-luc-khi-nao-568-103652-article.html), [LSVN: quyền chủ thể dữ liệu](https://lsvn.vn/06-quyen-cua-chu-the-du-lieu-theo-luat-bao-ve-du-lieu-ca-nhan-tu-01-01-2026-a162604.html)

### 1.1 Vai trò

- **Khách hàng (org)** là bên kiểm soát dữ liệu: quyết định mục đích thu thập lead.
- **Playora** là bên xử lý dữ liệu (processor) cho dữ liệu người chơi, và là bên kiểm soát với dữ liệu tài khoản organizer.
- Cần **DPA (Data Processing Agreement)** mẫu đính kèm ToS; khách lớn có thể ký DPA riêng.

### 1.2 Tính năng sản phẩm cần có

| Yêu cầu | Tính năng |
|---|---|
| Đồng ý rõ ràng, tách theo mục đích | Consent tách ô: tham gia (bắt buộc), marketing (tuỳ chọn), chia sẻ cho brand (tuỳ chọn); không tick sẵn; lưu `textVersion` và `textHash` |
| Thông báo xử lý dữ liệu | Mẫu thông báo bằng tiếng Việt, organizer chỉnh được, có link chính sách |
| Quyền chủ thể dữ liệu | `POST /p/{slug}/privacy/requests` (xem, xoá, rút consent); organizer xử lý trong Studio; SLA hiển thị |
| Tối thiểu hoá | Form mặc định chỉ có tên và SĐT; cảnh báo khi thêm field nhạy cảm |
| Hạn lưu trữ | Mặc định 12 tháng sau event, cấu hình được; job `retention` ẩn danh hoá |
| Dữ liệu nhạy cảm | **Không** hỗ trợ sinh trắc học (face check-in) trong v1 |
| Chuyển dữ liệu ra nước ngoài | Ưu tiên lưu trữ tại VN ([operations/environments-deploy.md](../operations/environments-deploy.md)); nếu dùng dịch vụ nước ngoài (email, Sentry…) thì không gửi PII, scrub dữ liệu |
| Ghi nhận xử lý | Audit log export; nhật ký truy cập PII |
| Doanh nghiệp nhỏ/khởi nghiệp | Luật cho phép lựa chọn chưa áp dụng một số điều trong 5 năm (trừ dữ liệu nhạy cảm hoặc số lượng lớn chủ thể). **Không dựa vào ngoại lệ này** vì Playora xử lý dữ liệu số lượng lớn cho khách |

---

## 2. Quy định khuyến mại (Luật Thương mại, NĐ 81/2018, sửa đổi bởi NĐ 128/2024, hiệu lực 01/12/2024)

Nguồn: [LSVN](https://lsvn.vn/nhung-diem-moi-can-luu-y-ve-hoat-dong-khuyen-mai-a148525.html), [EY Tax Update 01/2025](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/tax-update-january-2025-decree-amending-decree-vn-24-jan-2025.pdf), [Luật Việt An](https://luatvietan.vn/nghi-dinh-128-2024-nd-cp-cap-nhat-quy-dinh-moi-ve-hoat-dong-khuyen-mai.html)

### 2.1 Định hướng (cần luật sư xác nhận)

- Chương trình **may rủi gắn với mua hàng** (vd. mua hàng nhận mã để quay) thì thương nhân phải **thông báo Sở Công Thương** nơi thực hiện trước khi triển khai.
- Hoạt động gắn với **sự kiện văn hoá, nghệ thuật, giải trí** có thể thuộc diện không phải thông báo theo sửa đổi mới; cần kiểm tra từng trường hợp.
- **Minigame nội bộ** (quà tặng nhân viên, không gắn mua bán) thường không phải hoạt động khuyến mại; cần xác nhận.
- **Hệ quả cho kịch bản lõi của SME:** "mua hàng → quét QR tại quầy → quay → đổi quà" rất có thể là chương trình **may rủi gắn với mua hàng**, tức chủ quán phải thông báo Sở Công Thương trước khi chạy. Builder cần hỏi loại chương trình và nhắc việc này trước khi publish (xem §4).
- Giới hạn giá trị hàng hoá dùng để khuyến mại, quy định trích 50% giá trị giải không có người trúng nộp ngân sách (chương trình may rủi), nghĩa vụ công bố kết quả… là **trách nhiệm của thương nhân** (khách hàng), nhưng Playora nên hỗ trợ bằng công cụ.

### 2.2 Tính năng hỗ trợ tuân thủ

Xem §4. Thứ tự làm theo [product/roadmap.md](../product/roadmap.md).

### 2.3 Điều khoản dịch vụ (ToS)

- Khách hàng là "thương nhân thực hiện khuyến mại" và chịu trách nhiệm thông báo, đăng ký và trao giải.
- Playora cung cấp công cụ, không phải bên tổ chức chương trình.
- Cấm dùng nền tảng cho cờ bạc, cá cược, game đổi thưởng bằng tiền mặt hay vật phẩm quy đổi tiền.

---

## 3. Thuế, hoá đơn, thanh toán

- Xuất hoá đơn điện tử VAT cho mọi giao dịch (đầu tiên làm thủ công, tích hợp nhà cung cấp HĐĐT khi số giao dịch đủ lớn).
- Không lưu dữ liệu thẻ (PayOS/Stripe giữ); chỉ lưu `providerRef`.
- Đối soát webhook thanh toán có checksum; idempotent theo `providerRef`.

---

## 4. Playora hỗ trợ tuân thủ bằng tính năng

Pháp lý là nỗi lo thật của chủ quán nhưng đối thủ ít quan tâm. Biến nó thành tính năng là một lý do để chọn Playora. Mã yêu cầu theo [product/prd.md](../product/prd.md).

| Nghĩa vụ của chủ quán | Tính năng Playora | Yêu cầu PRD |
|---|---|---|
| Consent tách mục đích, lưu bằng chứng | Form có ô consent tách mục đích, không tick sẵn; lưu `textVersion`/`textHash` (`consents`) | EVT-05 |
| Quyền xem/xoá/rút consent của người chơi | `POST /p/{slug}/privacy/requests`, xử lý trong Studio | CMP-01 |
| Hạn lưu trữ dữ liệu | Mặc định 12 tháng, job `retention` ẩn danh hoá | CMP-02 |
| Thông báo khuyến mại may rủi với Sở Công Thương | Hỏi "loại chương trình" khi tạo; checklist pháp lý và nhắc trước publish | CMP-03 |
| Thể lệ chương trình | Sinh thể lệ từ cấu hình (thời gian, giải, số lượng, giá trị, cách xác định trúng) | CMP-04 |
| Công bố kết quả, chứng minh minh bạch | Bốc thăm commit–reveal, trang công bố kết quả; biên bản PDF | PRZ-02, PRZ-04 |
| Không định trước người trúng | Không có tính năng chọn người thắng; quà không ngẫu nhiên đi qua "Tặng quà theo danh sách" | PRZ-12 |
| Báo cáo giải không có người trúng (tổng giá trị) | Báo cáo sau chương trình | CMP-05 |
| Lưu vết thao tác | Audit log cho giải, bốc thăm, đổi quà, export | ORG-06 |
| Danh sách người trúng để công bố | Export có che PII | ANL-02 |

---

## 5. Checklist pháp lý trước chương trình thật đầu tiên

- [ ] Ý kiến luật sư về khuyến mại và PDPL cho các kịch bản: QR tại quầy gắn mua hàng (may rủi gắn mua hàng), minigame online không gắn mua hàng, minigame nội bộ, chương trình gắn hoá đơn
- [ ] ToS, Privacy Policy, DPA bản tiếng Việt
- [ ] Mẫu consent và thông báo xử lý dữ liệu
- [ ] Mẫu thể lệ và hướng dẫn thông báo Sở Công Thương cho chủ quán
- [ ] Điều khoản phân định trách nhiệm: chủ quán là thương nhân thực hiện khuyến mại

Checklist kỹ thuật tương ứng ở [operations/runbook.md §3](../operations/runbook.md#3-checklist-kỹ-thuật-trước-pilot).
