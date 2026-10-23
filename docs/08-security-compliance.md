# 08 — Bảo mật, chống gian lận và tuân thủ

Cập nhật: 23/10/2026

> ⚠️ Phần pháp lý dưới đây là tóm tắt để định hướng sản phẩm, **không phải tư vấn pháp lý**. Cần luật sư xác nhận trước khi pilot thương mại (ngân sách ≤ 30 triệu đ, M0–M1).

---

## 1. Chống gian lận

### 1.1 Mối đe doạ

| Mối đe doạ | Ví dụ | Ảnh hưởng |
|---|---|---|
| Sửa kết quả ở client | Sửa JS để vòng quay dừng ở giải nhất | Phát giải sai |
| Spam lượt chơi | Script tạo hàng loạt số điện thoại hoặc device | Vét giải |
| Bot / auto input | Script gửi 1.000 shake/s; auto trả lời quiz | Thắng không công bằng |
| Replay / race | Gửi lại request draw, hoặc gửi song song | Trúng nhiều lần |
| Người trong nội bộ | Operator quay lại nhiều lần để chọn người quen | Mất minh bạch |
| Chia sẻ link guest list | Người ngoài dùng mã NV của người khác | Sai đối tượng |

### 1.2 Biện pháp

| Lớp | Biện pháp |
|---|---|
| **Kiến trúc** | Server quyết định kết quả trước khi client animate; client không có xác suất hay tồn kho |
| **Danh tính** | Identity rule theo event (guest list, OTP, Zalo); `phoneHash`/`deviceId` để giới hạn lượt; OTP rate limit theo số và IP |
| **Toàn vẹn request** | `playToken` ký, có hạn; `Idempotency-Key`; unique `awards.play_id`; transaction atomic |
| **Plausibility** | Cap input realtime (vd. ≤ 8 shake/250 ms); skill game kiểm điểm ≤ max lý thuyết theo seed và thời lượng; phát hiện thời gian trả lời quiz < 150 ms liên tục |
| **Rate limit** | Redis sliding window theo IP, device, token; mềm dẻo cho NAT của wifi sự kiện (ưu tiên token hơn IP) |
| **Bot** | Cloudflare Turnstile (invisible) ở bước join cho campaign công khai; tắt được cho sự kiện kín |
| **Flagging** | Đánh dấu `players.flagged`, loại khỏi lucky draw và leaderboard; organizer duyệt lại |
| **Minh bạch draw** | Commit–reveal (seed hash công bố trước); `draw.void` bắt buộc ghi lý do, không xoá; biên bản PDF |
| **Audit** | Mọi thao tác trên giải, quay số, export và impersonate đều ghi `audit_logs` |

---

## 2. Bảo mật ứng dụng (tham chiếu OWASP ASVS L2)

| Hạng mục | Thực hiện |
|---|---|
| Xác thực | Better Auth; mật khẩu băm (scrypt/argon2); magic link hết hạn 15 phút; 2FA (TOTP) cho owner/admin (M2) |
| Phân quyền | RBAC theo org; mọi repository bắt buộc nhận `orgId`; test tự động "cross-tenant access" cho từng endpoint |
| Session | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`; CSRF token cho mutation (Better Auth hỗ trợ) |
| Input | zod validate mọi input (REST, WS, config); giới hạn kích thước payload (REST 1 MB, WS 4 KB) |
| Upload | Presigned URL với giới hạn content-type và size; xử lý ảnh trong worker (sharp, strip EXIF); không phục vụ SVG do người dùng upload (XSS) |
| Nội dung người chơi | Escape khi render; lọc từ cấm; duyệt tay trên wall |
| Bí mật | Biến môi trường qua secret manager hoặc Kamal secrets; không commit `.env`; xoay key định kỳ |
| Mã hoá | TLS 1.2+; PII mã hoá cấp ứng dụng (AES-256-GCM, data key theo org, master key trong KMS/secret); hash tra cứu bằng HMAC-SHA256 |
| Phụ thuộc | Dependabot/Renovate; `bun audit` trong CI; lockfile bắt buộc |
| Header | CSP chặt cho Studio; Player cho phép CDN asset; `frame-ancestors` theo cấu hình embed |
| Sao lưu | Postgres PITR 7 ngày + snapshot hằng ngày giữ 30 ngày; diễn tập restore mỗi quý |
| Pentest | Bên thứ ba trước khi mở Enterprise (M4) |

---

## 3. Bảo vệ dữ liệu cá nhân: Luật 91/2025/QH15 (hiệu lực 01/01/2026)

Nguồn: [LuatVietnam](https://luatvietnam.vn/dan-su/luat-bao-ve-du-lieu-ca-nhan-2025-co-hieu-luc-khi-nao-568-103652-article.html), [LSVN: quyền chủ thể dữ liệu](https://lsvn.vn/06-quyen-cua-chu-the-du-lieu-theo-luat-bao-ve-du-lieu-ca-nhan-tu-01-01-2026-a162604.html)

### 3.1 Vai trò

- **Khách hàng (org)** là bên kiểm soát dữ liệu: quyết định mục đích thu thập lead.
- **Playora** là bên xử lý dữ liệu (processor) cho dữ liệu người chơi, và là bên kiểm soát với dữ liệu tài khoản organizer.
- Cần **DPA (Data Processing Agreement)** mẫu đính kèm ToS; Enterprise có thể ký DPA riêng.

### 3.2 Tính năng sản phẩm cần có

| Yêu cầu | Tính năng |
|---|---|
| Đồng ý rõ ràng, tách theo mục đích | Consent tách ô: tham gia (bắt buộc), marketing (tuỳ chọn), chia sẻ cho brand (tuỳ chọn); không tick sẵn; lưu `textVersion` và `textHash` |
| Thông báo xử lý dữ liệu | Mẫu thông báo bằng tiếng Việt, organizer chỉnh được, có link chính sách |
| Quyền chủ thể dữ liệu | `POST /p/{slug}/privacy/requests` (xem, xoá, rút consent); organizer xử lý trong Studio; SLA hiển thị |
| Tối thiểu hoá | Form mặc định chỉ có tên và SĐT; cảnh báo khi thêm field nhạy cảm |
| Hạn lưu trữ | Mặc định 12 tháng sau event, cấu hình được; job `retention` ẩn danh hoá |
| Dữ liệu nhạy cảm | **Không** hỗ trợ sinh trắc học (face check-in) trong v1 |
| Chuyển dữ liệu ra nước ngoài | Ưu tiên lưu trữ tại VN (ADR-008); nếu dùng dịch vụ nước ngoài (email, Sentry…) thì không gửi PII, scrub dữ liệu |
| Ghi nhận xử lý | Audit log export; nhật ký truy cập PII |
| Doanh nghiệp nhỏ/khởi nghiệp | Luật cho phép lựa chọn chưa áp dụng một số điều trong 5 năm (trừ dữ liệu nhạy cảm hoặc số lượng lớn chủ thể). **Không dựa vào ngoại lệ này** vì Playora xử lý dữ liệu số lượng lớn cho khách |

---

## 4. Quy định khuyến mại (Luật Thương mại, NĐ 81/2018, sửa đổi bởi NĐ 128/2024, hiệu lực 01/12/2024)

Nguồn: [LSVN](https://lsvn.vn/nhung-diem-moi-can-luu-y-ve-hoat-dong-khuyen-mai-a148525.html), [EY Tax Update 01/2025](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/tax-update-january-2025-decree-amending-decree-vn-24-jan-2025.pdf), [Luật Việt An](https://luatvietan.vn/nghi-dinh-128-2024-nd-cp-cap-nhat-quy-dinh-moi-ve-hoat-dong-khuyen-mai.html)

### 4.1 Định hướng (cần luật sư xác nhận)

- Chương trình **may rủi gắn với mua hàng** (vd. mua hàng nhận mã để quay) thì thương nhân phải **thông báo Sở Công Thương** nơi thực hiện trước khi triển khai.
- Hoạt động gắn với **sự kiện văn hoá, nghệ thuật, giải trí** có thể thuộc diện không phải thông báo theo sửa đổi mới; cần kiểm tra từng trường hợp.
- **YEP nội bộ** (quà tặng nhân viên, không gắn mua bán) thường không phải hoạt động khuyến mại; cần xác nhận.
- Giới hạn giá trị hàng hoá dùng để khuyến mại, quy định trích 50% giá trị giải không có người trúng nộp ngân sách (chương trình may rủi), nghĩa vụ công bố kết quả… là **trách nhiệm của thương nhân** (khách hàng), nhưng Playora nên hỗ trợ bằng công cụ.

### 4.2 Tính năng hỗ trợ tuân thủ

| Tính năng | Ưu tiên |
|---|---|
| Trường "Loại chương trình" (nội bộ / sự kiện giải trí / khuyến mại may rủi gắn mua hàng) với checklist pháp lý tương ứng | M2 |
| Trình tạo **Thể lệ** từ cấu hình (thời gian, giải, số lượng, giá trị, cách xác định trúng thưởng) | M3 |
| **Biên bản quay thưởng** PDF: danh sách giải, log quay, seed commit/reveal, người chứng kiến | M2 |
| Báo cáo **giải không có người trúng** (tổng giá trị) | M3 |
| Xuất danh sách người trúng phục vụ công bố, có che PII | M2 |

### 4.3 Điều khoản dịch vụ (ToS)

- Khách hàng là "thương nhân thực hiện khuyến mại" và chịu trách nhiệm thông báo, đăng ký và trao giải.
- Playora cung cấp công cụ, không phải bên tổ chức chương trình.
- Cấm dùng nền tảng cho cờ bạc, cá cược, game đổi thưởng bằng tiền mặt hay vật phẩm quy đổi tiền.

---

## 5. Thuế, hoá đơn, thanh toán

- Xuất hoá đơn điện tử VAT cho mọi giao dịch (M1–M3 làm thủ công, M4 tích hợp nhà cung cấp HĐĐT).
- Không lưu dữ liệu thẻ (PayOS/Stripe giữ); chỉ lưu `providerRef`.
- Đối soát webhook thanh toán có checksum; idempotent theo `providerRef`.

---

## 6. Checklist trước pilot (cuối Sprint 3)

- [ ] Ý kiến luật sư về khuyến mại và PDPL cho 3 kịch bản: YEP nội bộ, booth activation không gắn mua hàng, campaign gắn hoá đơn
- [ ] ToS, Privacy Policy, DPA bản tiếng Việt
- [ ] Mẫu consent và thông báo xử lý dữ liệu
- [ ] Test cross-tenant tự động cho mọi endpoint Studio
- [ ] Mã hoá PII + HMAC lookup hoạt động; key không nằm trong repo
- [ ] Rate limit, Turnstile, cap input realtime bật
- [ ] Backup + diễn tập restore thành công
- [ ] Runbook sự cố live + kênh liên lạc khẩn cho operator
