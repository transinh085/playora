# Bảo mật và chống gian lận

Cập nhật: 27/10/2026 · Owner: Tech Lead (founder) · Liên quan: [business/compliance.md](../business/compliance.md) (PDPL, khuyến mại, thuế), [product/specs/participation.md](../product/specs/participation.md) (preset chống gian lận), [operations/runbook.md](../operations/runbook.md)

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

### 1.3 Đã làm ở M1 (mức Thấp và Chuẩn)

Mức chống gian lận nằm trong luật chương trình (`rules.antiFraud`, mặc định `standard`), phát hành thì chép sang `events.antiFraud = { level }`. Event cũ không có mức được coi là `low`. Code: `apps/api/src/common/anti-fraud/`.

| Biện pháp | Thấp (`low`) | Chuẩn (`standard`) |
|---|---|---|
| Server quyết định kết quả, `requestId` idempotent, transaction atomic | ✅ | ✅ |
| Rate limit lượt chơi (cửa sổ cố định 1 phút trên Valkey, đếm theo chương trình) | 600/phút/IP | 20/phút/người chơi, 120/phút/IP |
| Rate limit join | 600/phút/IP | 30/phút/IP, 5/phút/thiết bị |
| Cloudflare Turnstile ở lượt chơi | ❌ | ✅ khi API có `TURNSTILE_SECRET_KEY`; giải một lần mỗi phiên người chơi (cờ `af:human:{event}:{player}` 12 giờ), kiểm phía server qua `siteverify`, lỗi mạng = từ chối |
| Một thiết bị = một người chơi | ✅ | ✅ |
| Thu hồi token phiên (`ver = players.session_ver`) | ✅ | ✅ |

- Vượt giới hạn → 429 `RATE_LIMITED`; thiếu hoặc sai token Turnstile → 403 `CAPTCHA_REQUIRED`. Lượt bị từ chối không trừ lượt.
- Giới hạn IP để lỏng vì khách một quán dùng chung một IP (NAT); giới hạn theo người chơi/thiết bị mới là lớp chính. Theo thiết bị ở lượt chơi chính là theo người chơi vì unique index `players (event_id, env, device_id)`. Join không còn khoá dòng event; `playerLimit` thành giới hạn mềm khi join đồng thời.
- Route `POST /p/{slug}/plays` vẫn đi qua throttler mặc định (`RATE_LIMIT_PER_MIN`/IP, 300) vì contract chưa gắn `rateLimit: 'public'`; đó là trần IP thực tế cho mức Thấp tới khi contract đổi.
- Chưa làm ở M1: Turnstile ở bước join (body join chưa có `captchaToken`), blacklist, gắn cờ tự động, chặn VPN/proxy, OTP (mức Cao, M2).

---

## 2. Bảo mật ứng dụng (tham chiếu OWASP ASVS L2)

| Hạng mục | Thực hiện |
|---|---|
| Xác thực | Better Auth; mật khẩu băm (scrypt/argon2); magic link hết hạn 15 phút; 2FA (TOTP) cho owner/admin (đích) |
| Phân quyền | RBAC theo org; mọi repository bắt buộc nhận `orgId`; test tự động "cross-tenant access" cho từng endpoint |
| Back-office nội bộ | Route `platformAdmin: true` (`/admin/*`, BIL-01): email phiên phải nằm trong env `PLATFORM_ADMIN_EMAILS` **và** đã xác minh (`PlatformAdminGuard`), mọi thay đổi ghi audit `actorType: 'admin'` |
| Session | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`; CSRF token cho mutation (Better Auth hỗ trợ) |
| Input | zod validate mọi input (REST, config) qua contract; giới hạn kích thước payload REST 1 MB `[GĐ]` |
| Upload | Presigned URL với giới hạn content-type và size; xử lý ảnh trong worker (sharp, strip EXIF); không phục vụ SVG do người dùng upload (XSS) |
| Nội dung người chơi | Escape khi render; chữ trên canvas render dạng text, không HTML tuỳ ý |
| Bí mật | Biến môi trường qua secret manager hoặc Kamal secrets; không commit `.env`; xoay key định kỳ |
| Mã hoá | TLS 1.2+; PII mã hoá cấp ứng dụng (AES-256-GCM, một key trong secret `PII_ENCRYPTION_KEY`; data key theo org + master key trong KMS là đích); hash tra cứu bằng HMAC-SHA256 (`PII_HMAC_KEY`) — chi tiết §3 |
| Phụ thuộc | Dependabot/Renovate; `bun audit` trong CI; lockfile bắt buộc |
| Header | CSP chặt cho Studio; Player cho phép CDN asset; `frame-ancestors` theo cấu hình embed |
| Sao lưu | Postgres PITR 7 ngày + snapshot hằng ngày giữ 30 ngày; diễn tập restore mỗi quý |
| Pentest | Bên thứ ba trước khi bán gói doanh nghiệp lớn |

---

## 3. Mã hoá và tra cứu PII

- PII (SĐT, email) lưu dạng mã hoá cấp ứng dụng (`players.phone_enc`) và hash HMAC để tra cứu/giới hạn lượt (`players.phone_hash`). Email: đích (chưa có cột).
- **Đã làm cho SĐT** (`@playora/core/pii`, `apps/api/src/common/pii/pii.service.ts`):
  - Khi join, trường form kiểu `phone` **không** vào `players.form_data` (`validateRegistration` trả riêng `phone`). API chuẩn hoá về dạng `84…` (bỏ `+`, `0` đầu → `84`; `normalizePhone`), rồi ghi `phone_enc` = AES-256-GCM và `phone_hash` = HMAC-SHA256 (base64url) của số đã chuẩn hoá.
  - Định dạng `phone_enc`: `<keyId>:<iv>:<ciphertext>:<tag>` (base64url, IV 12 byte ngẫu nhiên mỗi lần, tag 16 byte; `keyId` được xác thực qua AAD). Xoay key: đặt key mới + `PII_ENCRYPTION_KEY_ID` mới, chuyển key cũ vào `PII_ENCRYPTION_PREVIOUS_KEYS` (`v1:<base64>`) — bản ghi cũ vẫn giải mã được, bản ghi mới dùng key mới. `PII_HMAC_KEY` không có phiên bản: đổi nó phải tính lại mọi `phone_hash`.
  - Khoá: `PII_ENCRYPTION_KEY` (base64 đúng 32 byte) và `PII_HMAC_KEY` (base64 ≥ 32 byte), sinh bằng `openssl rand -base64 32`, chỉ nằm trong secret của môi trường ([infra/env/prod.env.example](../../infra/env/prod.env.example)). Dev/test có giá trị mặc định công khai; `NODE_ENV=production` từ chối giá trị đó khi khởi động (`packages/env`).
  - Tra cứu chỉ qua `phone_hash` (unique `(event_id, env, phone_hash)`): một SĐT = một người chơi mỗi chương trình. SĐT đã thuộc người chơi khác (thiết bị khác) → `409 CONFLICT` (`details.field = fields.<key>`), giống mã khách mời dùng trên thiết bị khác: SĐT chưa xác minh (chưa có OTP) nên không được trao phiên — và voucher trong "Quà của tôi" — của người khác cho ai gõ số đó. Cùng thiết bị đổi số thì hash đi theo.
  - Giải mã chỉ ở server (`PiiService.decrypt`). Hiện **không** màn hình/API/export nào hiển thị SĐT (Studio, tra cứu voucher, báo cáo chỉ dùng `display_name`). Khi thêm, phải giải mã ở server và chỉ cho vai trò được xem dữ liệu người chơi; `redeemer` không bao giờ thấy SĐT.
  - Dữ liệu cũ có SĐT trong `form_data`: script một lần [runbook §3.3](../operations/runbook.md#33-mã-hoá-sđt-người-chơi-khoá-pii-và-dữ-liệu-cũ).
- Không log PII, cookie hay token (`nestjs-pino` đã redact).
- Dịch vụ nước ngoài (email, Sentry…) không nhận PII; scrub trước khi gửi.

Checklist kỹ thuật trước khi chạy chương trình thật: [operations/runbook.md §3](../operations/runbook.md#3-checklist-kỹ-thuật-trước-pilot).
