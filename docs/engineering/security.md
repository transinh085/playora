# Bảo mật và chống gian lận

Cập nhật: 26/10/2026 · Owner: Tech Lead (founder) · Liên quan: [business/compliance.md](../business/compliance.md) (PDPL, khuyến mại, thuế), [product/specs/participation.md](../product/specs/participation.md) (preset chống gian lận), [operations/runbook.md](../operations/runbook.md)

Tài liệu này chỉ gồm phần kỹ thuật. Phần pháp lý (dữ liệu cá nhân, quy định khuyến mại, hoá đơn) đã chuyển sang [business/compliance.md](../business/compliance.md).

---

## 1. Chống gian lận

### 1.1 Mối đe doạ

| Mối đe doạ | Ví dụ | Ảnh hưởng |
|---|---|---|
| Sửa kết quả ở client | Sửa JS để vòng quay dừng ở giải nhất | Phát giải sai |
| Spam lượt chơi | Script tạo hàng loạt số điện thoại hoặc device | Vét giải |
| Bot / auto input | Script gửi điểm game skill vượt mức có thể đạt | Thắng không công bằng |
| Replay / race | Gửi lại request draw, hoặc gửi song song | Trúng nhiều lần |
| Người trong nội bộ | Nhân viên bốc thăm lại nhiều lần để chọn người quen; nhân viên quầy đổi quà khống | Mất minh bạch, thất thoát quà |
| Chia sẻ mã | Người ngoài dùng mã khách mời/mã đổi quà của người khác | Sai đối tượng, đổi quà hai lần |

### 1.2 Biện pháp

| Lớp | Biện pháp |
|---|---|
| **Kiến trúc** | Server quyết định kết quả trước khi client animate; client không có xác suất hay tồn kho |
| **Danh tính** | Identity rule theo chương trình (guest list, form, OTP và Zalo là đích); `phoneHash`/`deviceId` để giới hạn lượt; OTP rate limit theo số và IP |
| **Toàn vẹn request** | Token phiên người chơi ký HMAC, có hạn và `ver` để thu hồi; `Idempotency-Key`; unique `awards.play_id`; transaction atomic |
| **Plausibility** | Skill game kiểm điểm ≤ max lý thuyết theo seed và thời lượng; thời lượng thực theo đồng hồ server; nhịp input bất thường thì gắn cờ |
| **Rate limit** | Redis sliding window theo IP, device, token; mềm dẻo cho NAT của wifi quán/văn phòng (ưu tiên token hơn IP) |
| **Bot** | Cloudflare Turnstile (invisible) ở bước join cho campaign công khai; tắt được cho chương trình nội bộ |
| **Flagging** | Đánh dấu `players.flagged`, loại khỏi bốc thăm và leaderboard; organizer duyệt lại |
| **Minh bạch draw** | Commit–reveal (seed hash công bố trước); `draw.void` bắt buộc ghi lý do, không xoá; biên bản PDF |
| **Đổi quà** | Mã đổi quà dùng một lần, đổi không hoàn tác; mở lại phải do owner, có lý do và audit |
| **Audit** | Mọi thao tác trên giải, bốc thăm, đổi quà, export và impersonate đều ghi `audit_logs` |

---

## 2. Bảo mật ứng dụng (tham chiếu OWASP ASVS L2)

| Hạng mục | Thực hiện |
|---|---|
| Xác thực | Better Auth; mật khẩu băm (scrypt/argon2); magic link hết hạn 15 phút; 2FA (TOTP) cho owner/admin (đích) |
| Phân quyền | RBAC theo org; mọi repository bắt buộc nhận `orgId`; test tự động "cross-tenant access" cho từng endpoint |
| Session | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`; CSRF token cho mutation (Better Auth hỗ trợ) |
| Input | zod validate mọi input (REST, config) qua contract; giới hạn kích thước payload REST 1 MB `[GĐ]` |
| Upload | Presigned URL với giới hạn content-type và size; xử lý ảnh trong worker (sharp, strip EXIF); không phục vụ SVG do người dùng upload (XSS) |
| Nội dung người chơi | Escape khi render; chữ trên canvas render dạng text, không HTML tuỳ ý |
| Bí mật | Biến môi trường qua secret manager hoặc Kamal secrets; không commit `.env`; xoay key định kỳ |
| Mã hoá | TLS 1.2+; PII mã hoá cấp ứng dụng (AES-256-GCM, data key theo org, master key trong KMS/secret); hash tra cứu bằng HMAC-SHA256 |
| Phụ thuộc | Dependabot/Renovate; `bun audit` trong CI; lockfile bắt buộc |
| Header | CSP chặt cho Studio; Player cho phép CDN asset; `frame-ancestors` theo cấu hình embed |
| Sao lưu | Postgres PITR 7 ngày + snapshot hằng ngày giữ 30 ngày; diễn tập restore mỗi quý |
| Pentest | Bên thứ ba trước khi bán gói doanh nghiệp lớn |

---

## 3. Mã hoá và tra cứu PII

- PII (SĐT, email) lưu dạng mã hoá cấp ứng dụng (`players.phone_enc`) và hash HMAC để tra cứu/giới hạn lượt (`players.phone_hash`).
- Không log PII, cookie hay token (`nestjs-pino` đã redact).
- Dịch vụ nước ngoài (email, Sentry…) không nhận PII; scrub trước khi gửi.

Checklist kỹ thuật trước khi chạy chương trình thật: [operations/runbook.md §3](../operations/runbook.md#3-checklist-kỹ-thuật-trước-pilot).
