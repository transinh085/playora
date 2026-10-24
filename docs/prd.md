# PRD — Playora Gamified Campaign Builder

Phiên bản: v2.1 · 24/10/2026 · Owner: Product · Nhất quán với [00-product-strategy.md](./00-product-strategy.md)

**Nhãn giai đoạn:** **M1** = MVP "Tết Campaign" (12/2026) · **M2** = Self-serve & Agency (04/2027) · **M3** = Booth & Activation (07/2027) · **M4** = Scale & Platform (12/2027) · **Later** = 2028+

---

## 1. Tổng quan

### 1.1 Mục tiêu sản phẩm

| # | Mục tiêu | Đo bằng |
|---|---|---|
| G1 | Dựng minigame có thưởng, có thương hiệu nhanh, không cần kỹ thuật | Trung vị tạo → publish ≤ 60 phút (M1), ≤ 30 phút (M2) |
| G2 | Giải thưởng không phát sai, chi phí giải trong tầm kiểm soát | 0 sai lệch tồn kho / ngân sách / giới hạn; ≤ 5% campaign hết giải trước 80% thời lượng khi bật rải đều; 100% kết quả có log kiểm chứng |
| G3 | Campaign chịu tải và chống gian lận | Đỉnh ≥ 500 lượt chơi/giây/campaign (M1); lượt bị gắn cờ được loại khỏi phát giải |
| G4 | Agency tự vận hành và bán lại được | % campaign tự dựng ≥ 60% (M2); white-label (M2) |
| G5 | Dữ liệu hợp pháp, báo cáo cho client | Consent PDPL 100%; dashboard realtime; export trong ≤ 1 phút |

### 1.2 Ngoài phạm vi

Quiz/poll/slide tương tác; game LED/sân khấu realtime, Host Console, màn hình lớn; canvas kéo-thả tự do; cash/red packet, cá cược; bán vé/agenda/seating; check-in khuôn mặt; app native. Xem lý do ở [00 §6](./00-product-strategy.md#6-nguyên-tắc-sản-phẩm).

---

## 2. Persona

| Persona | Bối cảnh | Cần | Thất vọng hiện tại |
|---|---|---|---|
| **Linh, PM agency** (ICP #1) | 3–10 campaign/tháng cho nhiều brand | Dựng nhanh theo mùa; logo khách; giải không hết sớm; báo cáo gửi client; bán dưới thương hiệu agency | Dev minigame chậm và đắt; không kiểm soát được giải; mỗi campaign làm lại từ đầu |
| **Minh, Brand Marketing** (ICP #2) | Campaign Tết, 8/3, sinh nhật brand, ra mắt sản phẩm; booth | Lead hợp pháp, kiểm soát chi phí giải, ROI theo kênh | Giải hết trong ngày đầu; bị bot/gian lận vét giải; không đo được hiệu quả |
| **Hà, HR Manager** (ICP #3) | Minigame nội bộ: lì xì đầu năm, Family Day, tri ân nhân viên | Tự làm theo template, dùng guest list nội bộ | Tự làm form + quay số bằng Excel bị nghi gian lận |
| **Người chơi** | Điện thoại phổ thông, mở link từ Zalo/FB/QR; 4G chập chờn | Vào trong ≤ 10 s, chơi vui, biết ngay mình trúng gì và nhận quà ở đâu | Cài app, form dài, load chậm, trúng rồi không nhận được quà |

---

## 3. Bề mặt sản phẩm

| Surface | URL | Thiết bị | Giai đoạn |
|---|---|---|---|
| **Studio (Builder)** | `studio.playora.vn` | Desktop | M1 (assisted) → M2 (self-serve) |
| **Player** | `play.playora.vn/{slug}` (custom domain ở M4) | Điện thoại, PWA | M1 |
| **Kiosk** | `play.playora.vn/{slug}?mode=kiosk` | Tablet/màn cảm ứng | M3 (online), M4 (offline) |
| **Staff (đổi quà)** | `studio.playora.vn/redeem` | Điện thoại | M2 |
| **Marketing site + gallery** | `playora.vn` | Mọi thiết bị | M1 (landing), M2 (gallery chơi thử) |
| **Back-office** | `admin.playora.vn` | Desktop | M1 (tối giản) |

---

## 4. Thuật ngữ

| Thuật ngữ | Định nghĩa |
|---|---|
| Organization | Tenant (agency, doanh nghiệp) |
| Client | Khách hàng con của agency, có brand kit và báo cáo riêng (M2) |
| Event / Campaign | Một chiến dịch: thời gian chạy (một ngày đến nhiều tuần), khung giờ, identity rule, các game, giải |
| Template | Cơ chế game có phiên bản, gồm config schema, asset slots, surfaces, server logic |
| Skin / Theme pack | Bộ asset theo chủ đề cho template / gói skin theo dịp cho mọi template |
| Game / Game version | Instance của template trong event / snapshot bất biến khi publish |
| Prize / Award | Giải thưởng / kết quả trúng một giải |
| Lượt chơi hợp lệ | Một lượt chơi đã qua kiểm tra participation và chống gian lận; đơn vị của North Star |
| Campaign Pass | Gói trả theo campaign (xem 02) |

---

## 5. User journey

### J1: Agency dựng campaign Tết (M1 assisted → M2 self-serve)

1. Tạo campaign "Tết ABC 2027" từ gallery "Tết", chọn cơ chế "Mở hộp quà" với skin "Đập trứng vàng".
2. Áp brand kit ABC; sửa thể lệ, màn Cover/Kết quả trong auto-form; preview trên điện thoại.
3. Cấu hình giải: 5.000 voucher (import CSV), 50 giải hiện vật, giải an ủi; tỷ lệ trúng tổng 20%; **rải đều** 21 ngày, chỉ 8h–22h; tối đa 3 lượt/ngày và 1 giải hiện vật/người; ngân sách 150 triệu.
4. Bật chống gian lận mức Chuẩn; tạo link theo kênh (`?ch=zalo-oa`, `?ch=fb-ads`, `?ch=pos`) và QR in POSM.
5. Chạy campaign: dashboard realtime (lượt chơi, giải còn lại, theo kênh); export người trúng gửi client hằng tuần.

### J2: Người chơi campaign (M1)

Mở link từ Zalo/FB hoặc quét QR → Cover + thể lệ → form (tên, SĐT) + consent → chơi → **server quyết định kết quả trước khi animate** → màn kết quả (trúng / không trúng / hết quà) → "Quà của tôi" xem mã voucher. Hết lượt thì báo lượt tiếp theo vào ngày mai.

### J3: Booth activation (M3)

Vòng quay trên kiosk tại booth 3 ngày, dùng chung game version và kho giải với campaign online; staff đổi quà tại quầy bằng quét QR.

---

## 6. Yêu cầu chức năng

### 6.1 Tài khoản và tổ chức (ORG)

| ID | Yêu cầu | GĐ |
|---|---|---|
| ORG-01 | Đăng nhập email + mật khẩu, magic link, Google | M1 |
| ORG-02 | Organization, mời thành viên, vai trò `owner/admin/editor/operator/viewer` | M1 |
| ORG-03 | Client workspace cho agency (brand kit, event, báo cáo theo client) | M2 |
| ORG-04 | White-label cơ bản: logo agency, ẩn branding Playora, email gửi báo cáo theo tên agency | M2 |
| ORG-05 | Custom domain + SSL tự động cho Player | M4 |
| ORG-06 | Audit log (giải, quay số, export, impersonate) | M1 |
| ORG-07 | 2FA cho owner/admin | M2 |
| ORG-08 | SSO (OIDC/SAML) | M4 |
| ORG-09 | Reseller/OEM: agency bán lại gói dưới thương hiệu riêng | M4 |

### 6.2 Builder: Studio (BLD)

> Đặc tả chi tiết: [12-builder-spec.md](./12-builder-spec.md)

| ID | Yêu cầu | GĐ |
|---|---|---|
| BLD-01 | Template gallery: lọc theo cơ chế, dịp, mục đích; preview chơi thử | M1 (nội bộ), M2 (công khai) |
| BLD-02 | **Auto-form** sinh từ `configSchema` (zod + metadata UI); widget chuẩn (slider, color, asset, list, localized) | M1 |
| BLD-03 | **Preview thật** (player runtime trong iframe nhận config nháp, kết quả giả lập chọn được), chuyển Mobile/Kiosk | M1 (Mobile), M3 (Kiosk) |
| BLD-04 | Brand kit (logo, palette, font, nền, nhạc) áp cho mọi game | M1 |
| BLD-05 | Kế thừa brand kit theo tầng Org → Client → Event → Game | M2 |
| BLD-06 | Skin và theme pack: M1 có Tết + Chung (mỗi cơ chế ≥ 2 skin); M2 thêm theme pack 8/3, 30/4, hè, Trung thu, khai trương, sinh nhật brand | M1/M2 |
| BLD-07 | **Flow chuẩn** campaign: Cover (thể lệ) → Form → Game → Kết quả (trúng/không trúng/hết quà/hết lượt) → Quà của tôi (M1); chỉnh từng màn, sponsor slot (M2) | M1/M2 |
| BLD-08 | Publish tạo version bất biến; trường `hotEditable` sửa được khi campaign đang chạy; trường khác phải tạo version mới | M1 |
| BLD-09 | **Pre-flight checklist** chặn publish khi thiếu asset, giải, thể lệ, consent, thời gian (M1: giải/thể lệ/consent; M2: đầy đủ) | M1/M2 |
| ~~BLD-10~~ | ~~Run-of-show editor~~ — **bỏ ở v2.1** (không làm game sân khấu) | — |
| ~~BLD-11~~ | ~~Screen layout editor~~ — **bỏ ở v2.1** | — |
| ~~BLD-12~~ | ~~Quiz builder~~ — **bỏ ở v2.0** (không làm quiz, xem 00 §6) | — |
| BLD-13 | Asset manager: upload, tối ưu ảnh tự động, crop theo asset slot | M1 |
| BLD-14 | Tự lưu nháp, undo/redo | M2 |
| BLD-15 | Nhân bản event/game; thùng rác 14 ngày | M2 |
| BLD-16 | Lưu thành template riêng của org (agency tái sử dụng) | M4 |
| BLD-17 | AI draft từ prompt (MCP/tích hợp): chọn template, skin, giải, thể lệ, copy | M4 |
| BLD-18 | Game SDK công khai + marketplace template/skin | Later |

### 6.3 Sự kiện và tham gia (EVT)

| ID | Yêu cầu | GĐ |
|---|---|---|
| EVT-01 | CRUD campaign: slug, thời gian bắt đầu/kết thúc, timezone, khung giờ hoạt động, trạng thái `draft → scheduled → live → ended → archived` | M1 |
| EVT-02 | Identity: `anonymous`, `guest_list` (import CSV/XLSX), `form_only` | M1 |
| EVT-03 | Identity: `phone_otp` (ZNS ưu tiên, SMS dự phòng), `email_otp` | M2 |
| EVT-04 | Identity: Zalo login / Zalo Mini App | M4 |
| EVT-05 | Form đăng ký (field builder) + consent tách mục đích | M1 |
| EVT-06 | Đội/nhóm: theo guest list (dùng cho giới hạn giải theo nhóm, báo cáo) | M2 |
| EVT-07 | Mã tham gia (một người một mã / dùng chung; import ≤ 50.000; in QR hàng loạt) | M3 |
| EVT-08 | Requirements trước khi chơi: nhập mã (M3); chụp hoá đơn, xem video (M4) | M3/M4 |
| EVT-09 | **Chạy thử campaign**: bot N lượt chơi, không trừ kho thật, reset | M1 |
| EVT-10 | QR tham gia (tải PNG/SVG/PDF in POSM); QR theo kênh/điểm bán | M1 |
| EVT-11 | Link theo kênh (`?ch=`) và thống kê theo kênh | M1 |
| EVT-12 | Giới hạn khu vực GPS (điểm + bán kính) | M4 |
| EVT-13 | **Chống gian lận theo preset** Thấp/Chuẩn/Cao (12 §8): token lượt chơi, rate limit IP/thiết bị, Turnstile, blacklist, gắn cờ tự động (M1: Thấp + Chuẩn; M2: Cao với OTP) | M1/M2 |
| EVT-14 | **Lượt chơi**: theo ngày / tổng / theo khung giờ (M1); thêm lượt khi chia sẻ có giới hạn, khi nhập mã (M2) | M1/M2 |

### 6.4 Live engine (LIV) — bỏ ở v2.1

Toàn bộ LIV-01…LIV-09 (Host Console, Screen, state machine vòng, degrade mode, kiểm duyệt nội dung live, sponsor slot trên Screen, scale CCU) **bỏ** theo [00 v2.1](./00-product-strategy.md). Code realtime được lưu ở tag `archive/live-engine`.

### 6.5 Template game

Danh mục và giai đoạn: [04-game-catalog.md](./04-game-catalog.md). Tóm tắt:

| GĐ | Minigame |
|---|---|
| **M1** | `spin-wheel`, `scratch-card`, `gift-box` (skin đập trứng vàng, lì xì, hộp bí ẩn), `catch-items` (skill → draw) |
| **M2** | `memory-match`, `puzzle`, `whack-a-mole`, `red-envelope` |
| **M3** | `collect-cards`, `slot-machine`/`gacha` (skin của `gift-box`) |
| **M4** | `photo-booth` |

**Bỏ:** `live-quiz`, `quiz-async`, `live-poll` (v2.0); mọi game live/LED: `shake-race`, `tap-race`, `tug-of-war`, `launch-ceremony`, `checkin-wall`, `danmaku-wall`, `money-count`, `performance-score`, `bingo` (v2.1). Xem 00 §6.

| ID | Yêu cầu | GĐ |
|---|---|---|
| GAM-01 | **Play engine async**: token lượt chơi dùng một lần; với `instant`, server quyết định kết quả (gồm giải) trước khi client animate | M1 |
| GAM-02 | Game `skill`: server xác thực điểm (thời lượng, tốc độ tối đa, plausibility) trước khi xét giải | M1 |
| GAM-03 | Cùng một game version chạy trên Player (campaign) và Kiosk (booth) | M1/M3 |

### 6.6 Giải thưởng (PRZ)

| ID | Yêu cầu | GĐ |
|---|---|---|
| PRZ-01 | CRUD giải: tên, ảnh, loại, số lượng, giá trị | M1 |
| PRZ-02 | **Bốc thăm cuối chương trình** (online): pool lọc AND/OR (đã chơi, đã trúng/chưa trúng, kênh, nhóm, đạt điểm), commit–reveal có ràng buộc `poolHash`, `void` có lý do, log, trang công bố kết quả | M2 |
| PRZ-03 | Thông báo trúng trên Player (màn kết quả, "Quà của tôi") | M1 |
| PRZ-04 | Biên bản PDF: thể lệ, cấu hình giải, danh sách trúng, log, seed (bốc thăm) | M2 |
| PRZ-05 | **Instant-win**: `per_prize_probability`, `overall_win_rate`, `guaranteed`; tồn kho trừ nguyên tử; server quyết định trước khi client animate | M1 |
| PRZ-06 | `score_threshold` cho game skill (M1); `scheduled_moments`, `rank_based` có xác nhận tay (M2) | M1/M2 |
| PRZ-07 | Pacing: `time_uniform` (tự làm mượt), `opening_hours` (M1); `batch_release`, `end_flush` (M2) | M1/M2 |
| PRZ-08 | **Prize Simulator** trước khi publish | M2 |
| PRZ-09 | Voucher pool (import CSV/sinh mã), giải an ủi, **ngân sách tổng**, giới hạn giải/người (tổng, ngày, loại) | M1 |
| PRZ-10 | Nhận quà: "Quà của tôi" + mã voucher (M1); đổi quà staff mode: PIN nhân viên, quét QR, đổi hàng loạt (M2) | M1/M2 |
| PRZ-11 | Thông báo trúng qua email (M2), ZNS (M2, cần Zalo OA) | M2 |
| PRZ-12 | "Tặng quà theo danh sách" (không ngẫu nhiên, ghi rõ). **Không** hỗ trợ định trước người trúng | M3 |
| PRZ-13 | e-gift (topup, e-voucher qua UrBox/ViHat), điểm thưởng qua webhook | M4 |

### 6.7 Báo cáo và tích hợp (ANL)

| ID | Yêu cầu | GĐ |
|---|---|---|
| ANL-01 | Dashboard realtime: lượt chơi, người chơi, giải đã phát/còn lại, theo ngày, theo kênh | M1 |
| ANL-02 | Export CSV/XLSX: người chơi, lượt chơi, form (kèm consent), người trúng, voucher đã phát | M1 |
| ANL-03 | Báo cáo PDF sau sự kiện (white-label theo agency/client) | M2 |
| ANL-04 | Funnel: mở link → form → chơi → trúng → nhận/đổi; theo kênh | M2 |
| ANL-05 | Webhook (`player.registered`, `play.completed`, `prize.awarded`, `prize.redeemed`) | M4 |
| ANL-06 | Public API; Logic webhook (Enterprise) | M4 |

### 6.8 Thanh toán và quota (BIL)

| ID | Yêu cầu | GĐ |
|---|---|---|
| BIL-01 | Kích hoạt gói thủ công (admin), hoá đơn VAT thủ công | M1 |
| BIL-02 | Quota lượt chơi/người chơi theo campaign + watermark gói Free | M1 |
| BIL-03 | Self-serve: Campaign Pass, gói Agency; thanh toán PayOS (VietQR) | M2 |
| BIL-04 | Gói Campaign Pro; credit OTP/ZNS | M3 |
| BIL-05 | Hoá đơn điện tử tự động; Stripe cho thẻ quốc tế | M4 |

### 6.9 Back-office (ADM)

| ID | Yêu cầu | GĐ |
|---|---|---|
| ADM-01 | Danh sách org, gói, usage; impersonate có log | M1 |
| ADM-02 | Lịch sự kiện sắp diễn ra (pre-scale, gán operator) | M1 |
| ADM-03 | Quản lý template/skin (bật/tắt, phiên bản, gán gói) | M2 |

---

## 7. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
|---|---|
| Hiệu năng Player | First load ≤ 2 s trên 4G; JS ban đầu ≤ 200 KB gzip; game bundle lazy-load ≤ 300 KB; ≥ 30 fps máy cũ |
| Play API | Đỉnh ≥ 500 lượt chơi/giây/campaign (M1), 2.000 (M4); quyết định kết quả + trừ kho p95 < 200 ms |
| API | p95 < 200 ms; draw < 300 ms |
| Khả dụng | 99,9%/tháng; 99,95% trong khung giờ sự kiện; freeze window quanh sự kiện critical |
| Tính đúng | 0 sai lệch tồn kho; mọi award có audit trail |
| Bảo mật | OWASP ASVS L2; mã hoá PII; RBAC; test cross-tenant tự động |
| Riêng tư | Luật 91/2025/QH15: consent tách mục đích, quyền xoá/xuất, retention 12 tháng |
| Trình duyệt | iOS Safari ≥ 16, Chrome Android ≥ 100, Zalo/FB in-app; Kiosk: Chrome tablet (M3) |
| i18n | vi/en từ đầu |

---

## 8. Tiêu chí nghiệm thu M1 (Definition of Ready for Pilot)

1. **Builder:** 1 PM agency đối tác (không phải người của Playora) dựng được campaign Tết (1 minigame + brand kit + giải + voucher pool + thể lệ + link theo kênh) trong ≤ 60 phút, có ≤ 2 lần hỏi hỗ trợ.
2. **Prize engine:** 1.000.000 lượt mô phỏng với 50 luồng đồng thời: **0** vượt tồn kho, **0** vượt ngân sách, **0** vượt giới hạn giải/người; khi bật `time_uniform`, giải còn lại bám đường kế hoạch ± 10%.
3. **Tải campaign:** k6 đỉnh 500 lượt chơi/giây trong 10 phút: p95 API < 200 ms, 0 lỗi 5xx, kết quả nhất quán với DB.
4. **Chống gian lận:** script chơi lặp từ 1 thiết bị/IP bị chặn theo preset; lượt bị gắn cờ không nhận giải.
5. **Thiết bị:** chạy được trên iPhone SE, iPhone 12, Samsung A-series, Xiaomi tầm thấp, Zalo/FB in-app.
6. **Dữ liệu:** export người chơi, người trúng và voucher đã phát đúng 100% so với DB.

---

## 9. Câu hỏi mở

1. Tính phí campaign theo lượt chơi hợp lệ hay theo người chơi duy nhất? *Đề xuất:* người chơi duy nhất (dễ hiểu với brand), quota lượt làm trần chống lạm dụng.
2. Zalo OA cho ZNS cần duyệt trước: đăng ký từ M1 để có ở M2?
3. Gói Free có gây "ăn mòn" Campaign S không? Theo dõi tỷ lệ nâng cấp ở M2.
4. Thời điểm mở gallery template công khai (SEO) là M2 hay sớm hơn để bắt đầu mùa YEP 2027?
