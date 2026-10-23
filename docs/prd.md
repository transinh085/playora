# PRD — Playora Event Game Builder

Phiên bản: v1.0 · 23/10/2026 · Owner: Product · Nhất quán với [00-product-strategy.md](./00-product-strategy.md)

**Nhãn giai đoạn:** **M1** = MVP "YEP Live" (12/2026) · **M2** = Live Self-serve & Agency (04/2027) · **M3** = Booth & Activation (07/2027) · **M4** = Scale & Platform (12/2027) · **Later** = 2028+

---

## 1. Tổng quan

### 1.1 Mục tiêu sản phẩm

| # | Mục tiêu | Đo bằng |
|---|---|---|
| G1 | Dựng game sự kiện có thương hiệu nhanh, không cần kỹ thuật | Trung vị tạo → publish ≤ 60 phút (M1), ≤ 30 phút (M2) |
| G2 | Cả hội trường cùng chơi, không sập | ≥ 5.000 CCU/event (M1), 20.000 (M4); p95 < 150 ms; 0 sự cố P1 |
| G3 | Giải thưởng minh bạch, không phát sai | 0 sai lệch tồn kho; 100% draw có log kiểm chứng |
| G4 | Agency tự vận hành và bán lại được | % sự kiện tự dựng ≥ 60% (M2); white-label (M2) |
| G5 | Dữ liệu hợp pháp, báo cáo ngay sau sự kiện | Consent PDPL 100%; báo cáo xuất trong ≤ 1 phút |

### 1.2 Ngoài phạm vi

Canvas kéo-thả tự do; minigame online thuần cho bán lẻ; cash/red packet, cá cược; bán vé/agenda/seating; check-in khuôn mặt; app native. Xem lý do ở [00 §6](./00-product-strategy.md#6-nguyên-tắc-sản-phẩm).

---

## 2. Persona

| Persona | Bối cảnh | Cần | Thất vọng hiện tại |
|---|---|---|---|
| **Linh, PM agency** (ICP #1) | 3–5 sự kiện/tháng cho nhiều brand | Dựng nhanh; không sập; logo khách; báo cáo gửi client; bán dưới thương hiệu agency | Dev game chậm và đắt; ghép 3 nhà cung cấp; sập khi đông |
| **Hà, HR Manager** (ICP #2) | YEP 300–1.500 người, một lần/năm | Vui, minh bạch, tự làm theo template | Quay số bằng Excel bị nghi gian lận; game nhàm |
| **Minh, Brand Marketing** (qua agency) | Activation, roadshow, booth | Lead hợp pháp, kiểm soát chi phí giải, ROI | Không đo được hiệu quả booth |
| **Người chơi** | Điện thoại phổ thông, Wi-Fi/4G hội trường chập chờn | Vào trong ≤ 10 s, chơi vui, biết mình trúng | Cài app, form dài, load chậm |
| **MC / Operator** | Đứng trên sân khấu, cầm điện thoại | Nút to, ít bước, có nút cứu hộ | Thao tác laptop phức tạp, sợ lỗi |

---

## 3. Bề mặt sản phẩm

| Surface | URL | Thiết bị | Giai đoạn |
|---|---|---|---|
| **Studio (Builder)** | `studio.playora.vn` | Desktop | M1 (assisted) → M2 (self-serve) |
| **Host Console** | `studio.playora.vn/live/{eventId}/host` | **Điện thoại** (mobile-first), tablet, laptop | M1 |
| **Screen** | `screen.playora.vn/{screenKey}` | PC nối LED/máy chiếu | M1 |
| **Player** | `play.playora.vn/{slug}` (custom domain ở M4) | Điện thoại, PWA | M1 |
| **Kiosk** | `play.playora.vn/{slug}?mode=kiosk` | Tablet/màn cảm ứng | M3 (online), M4 (offline) |
| **Staff (đổi quà)** | `studio.playora.vn/redeem` | Điện thoại | M3 |
| **Marketing site + gallery** | `playora.vn` | Mọi thiết bị | M1 (landing), M2 (gallery chơi thử) |
| **Back-office** | `admin.playora.vn` | Desktop | M1 (tối giản) |

---

## 4. Thuật ngữ

| Thuật ngữ | Định nghĩa |
|---|---|
| Organization | Tenant (agency, doanh nghiệp) |
| Client | Khách hàng con của agency, có brand kit và báo cáo riêng (M2) |
| Event | Một sự kiện: thời gian, identity rule, run-of-show, các game |
| Template | Cơ chế game có phiên bản, gồm config schema, asset slots, surfaces, server logic |
| Skin / Theme pack | Bộ asset theo chủ đề cho template / gói skin theo dịp cho mọi template |
| Game / Game version | Instance của template trong event / snapshot bất biến khi publish |
| Run-of-show | Kịch bản các vòng chơi live theo thứ tự |
| Round | Một vòng chơi live do MC điều khiển |
| Prize / Award | Giải thưởng / kết quả trúng một giải |
| Live Pass | Gói trả theo sự kiện, tính theo số người chơi |

---

## 5. User journey

### J1: Agency dựng YEP (M1 assisted → M2 self-serve)

1. Tạo event "YEP ABC 2026" từ template gallery "YEP", chọn theme "Tết Đinh Mùi".
2. Import guest list (mã NV, tên, phòng ban). Phòng ban tự trở thành đội.
3. Run-of-show: Check-in wall → Quiz "Hiểu ABC" → Shake race theo phòng ban → Lucky draw giải Ba/Nhì/Nhất (pool: đã check-in, chưa trúng).
4. Áp brand kit ABC, preview trên Screen/Player, **rehearsal với 600 bot**, reset.
5. Đêm sự kiện: Screen trên máy nối LED; MC điều khiển bằng điện thoại.
6. Sau sự kiện: export danh sách và (M2) báo cáo PDF + biên bản quay thưởng gửi client.

### J2: Người chơi live (M1)

Quét QR → nhập mã NV (hoặc tên + SĐT) → đồng ý điều khoản → màn chờ → chơi theo vòng → kết quả cá nhân/đội → nhận thông báo trúng giải. Mất mạng thì tự kết nối lại và khôi phục trạng thái.

### J3: Booth activation (M3)

Agency dựng "Vòng quay Tết" cho brand: 2.000 giải, 3 ngày, rải đều theo giờ mở cửa. **Prize Simulator** xác nhận không hết sớm. Người chơi quét QR, OTP ZNS, quay, nhận voucher qua ZNS. Staff quét QR đổi quà tại quầy; dashboard realtime cho brand.

---

## 6. Yêu cầu chức năng

### 6.1 Tài khoản và tổ chức (ORG)

| ID | Yêu cầu | GĐ |
|---|---|---|
| ORG-01 | Đăng nhập email + mật khẩu, magic link, Google | M1 |
| ORG-02 | Organization, mời thành viên, vai trò `owner/admin/editor/operator/viewer` | M1 |
| ORG-03 | Client workspace cho agency (brand kit, event, báo cáo theo client) | M2 |
| ORG-04 | White-label cơ bản: logo agency, ẩn branding Playora, email gửi báo cáo theo tên agency | M2 |
| ORG-05 | Custom domain + SSL tự động cho Player/Screen | M4 |
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
| BLD-03 | **Preview thật** (player runtime trong iframe nhận config nháp), chuyển Mobile/Screen/Kiosk | M1 (Mobile/Screen), M3 (Kiosk) |
| BLD-04 | Brand kit (logo, palette, font, nền, nhạc) áp cho mọi game | M1 |
| BLD-05 | Kế thừa brand kit theo tầng Org → Client → Event → Game | M2 |
| BLD-06 | Skin và theme pack: M1 có 2 (YEP, Tết); M2 có 6 (hội nghị, ra mắt, Trung thu, Noel, 8/3, khai trương) | M1/M2 |
| BLD-07 | **Flow chuẩn** chỉnh từng màn (Cover, Form, Lobby, Result các biến thể, Award), có sponsor slot | M2 |
| BLD-08 | Publish tạo version bất biến; trường `hotEditable` sửa được khi live; trường khác phải tạo version mới | M1 |
| BLD-09 | **Pre-flight checklist** chặn publish khi thiếu asset, giải, consent, thời gian | M2 |
| BLD-10 | **Run-of-show editor** (danh sách vòng, tự chuyển/chờ MC, màn chờ) | M1 |
| BLD-11 | Screen layout editor (tỷ lệ 16:9/32:9/dọc/tuỳ ý, vị trí QR, sponsor loop) | M1 (preset), M2 (tuỳ chỉnh) |
| BLD-12 | Quiz builder: import Excel, ảnh/video, thời gian từng câu | M1 |
| BLD-13 | Asset manager: upload, tối ưu ảnh tự động, crop theo asset slot | M1 |
| BLD-14 | Tự lưu nháp, undo/redo | M2 |
| BLD-15 | Nhân bản event/game; thùng rác 14 ngày | M2 |
| BLD-16 | Lưu thành template riêng của org (agency tái sử dụng) | M4 |
| BLD-17 | AI draft từ prompt (MCP/tích hợp): chọn template, skin, giải, copy, câu hỏi quiz | M4 |
| BLD-18 | Game SDK công khai + marketplace template/skin | Later |

### 6.3 Sự kiện và tham gia (EVT)

| ID | Yêu cầu | GĐ |
|---|---|---|
| EVT-01 | CRUD event: slug, thời gian, timezone, trạng thái `draft → scheduled → live → ended → archived` | M1 |
| EVT-02 | Identity: `anonymous`, `guest_list` (import CSV/XLSX), `form_only` | M1 |
| EVT-03 | Identity: `phone_otp` (ZNS ưu tiên, SMS dự phòng), `email_otp` | M3 |
| EVT-04 | Identity: Zalo login / Zalo Mini App | M4 |
| EVT-05 | Form đăng ký (field builder) + consent tách mục đích | M1 |
| EVT-06 | Đội: theo guest list, tự chọn, chia ngẫu nhiên cân bằng | M1 |
| EVT-07 | Mã tham gia (một người một mã / dùng chung; import ≤ 50.000; in QR hàng loạt) | M3 |
| EVT-08 | Requirements trước khi chơi: nhập mã (M3); chụp hoá đơn, xem video (M4) | M3/M4 |
| EVT-09 | **Rehearsal mode** + bot N người + reset | M1 |
| EVT-10 | QR tham gia; QR theo khu vực/bàn | M1 |
| EVT-11 | Link theo kênh (`?ch=`) và thống kê theo kênh | M3 |
| EVT-12 | Giới hạn khu vực GPS (điểm + bán kính) | M4 |

### 6.4 Live engine (LIV)

| ID | Yêu cầu | GĐ |
|---|---|---|
| LIV-01 | **Host Console mobile-first**: run-of-show, Start/Pause/Next/End, số người online, cảnh báo, nút "đóng băng màn hình" | M1 |
| LIV-02 | Screen full-screen, tự kết nối lại, nhiều screen/event, khoá bằng `screenKey` | M1 |
| LIV-03 | State machine vòng do server điều khiển: `idle → lobby → countdown → playing → result` | M1 |
| LIV-04 | Degrade mode khi quá tải | M1 |
| LIV-05 | Kiểm duyệt nội dung người chơi (lọc từ cấm tiếng Việt + duyệt tay) | M1 |
| LIV-06 | Loại top N khỏi vòng sau; hiển thị top N trên Screen | M1 |
| LIV-07 | Sponsor slot trên Screen và Player | M2 |
| LIV-08 | Operator hỗ trợ từ xa (xem trạng thái event của khách) | M2 |
| LIV-09 | Scale 20.000 CCU/event, room affinity nhiều node | M4 |

### 6.5 Template game

Danh mục và giai đoạn: [04-game-catalog.md](./04-game-catalog.md). Tóm tắt:

| GĐ | Template |
|---|---|
| **M1** | `checkin-wall`, `live-quiz`, `shake-race` (fallback `tap`), `lucky-draw` · *stretch:* `performance-score` |
| **M2** | `performance-score`, `tug-of-war`, `money-count`, `launch-ceremony`, `live-poll` (+ word cloud), `danmaku-wall` |
| **M3** | `spin-wheel`, `scratch-card`, `gift-box` (+ biến thể đập trứng, lưới 9 ô, máy xèng, hộp bí ẩn qua skin), `catch-items`, `memory-match`, `quiz-async` |
| **M4** | `red-envelope`, `collect-cards`, `puzzle`, `whack-a-mole`, `photo-booth`, `bingo` |

### 6.6 Giải thưởng (PRZ)

| ID | Yêu cầu | GĐ |
|---|---|---|
| PRZ-01 | CRUD giải: tên, ảnh, loại, số lượng, giá trị | M1 |
| PRZ-02 | **Lucky draw minh bạch**: pool lọc AND/OR (đã check-in, chưa trúng, đội/phòng ban, top N vòng X), commit–reveal, `void` có lý do, log | M1 |
| PRZ-03 | Thông báo trúng trên Screen và Player | M1 |
| PRZ-04 | Biên bản quay thưởng PDF (thể lệ, danh sách, log, seed) | M2 |
| PRZ-05 | Chế độ instant-win: `per_prize_probability`, `overall_win_rate`, `guaranteed` | M3 |
| PRZ-06 | `scheduled_moments`, `score_threshold`, `rank_based` (xác nhận tay) | M3 |
| PRZ-07 | Pacing: `time_uniform` (tự làm mượt), `batch_release`, `opening_hours`, `end_flush` | M3 |
| PRZ-08 | **Prize Simulator** trước khi publish | M3 |
| PRZ-09 | Voucher pool (import/sinh mã), giải an ủi, ngân sách tổng | M3 |
| PRZ-10 | Đổi quà: điểm đổi + PIN nhân viên, quét QR, tự đổi, đổi hàng loạt | M3 |
| PRZ-11 | Thông báo trúng qua ZNS/email | M3 |
| PRZ-12 | "Tặng quà theo danh sách" (không ngẫu nhiên, ghi rõ). **Không** hỗ trợ định trước người trúng | M3 |
| PRZ-13 | e-gift (topup, e-voucher qua UrBox/ViHat), điểm thưởng qua webhook | M4 |

### 6.7 Báo cáo và tích hợp (ANL)

| ID | Yêu cầu | GĐ |
|---|---|---|
| ANL-01 | Dashboard live: người online, tham gia, kết quả vòng | M1 |
| ANL-02 | Export CSV/XLSX: người tham gia, form (kèm consent), người trúng | M1 |
| ANL-03 | Báo cáo PDF sau sự kiện (white-label theo agency/client) | M2 |
| ANL-04 | Funnel: quét → tham gia → chơi → trúng → đổi; theo kênh | M3 |
| ANL-05 | Webhook (`player.registered`, `play.completed`, `prize.awarded`, `prize.redeemed`) | M4 |
| ANL-06 | Public API; Logic webhook (Enterprise) | M4 |

### 6.8 Thanh toán và quota (BIL)

| ID | Yêu cầu | GĐ |
|---|---|---|
| BIL-01 | Kích hoạt gói thủ công (admin), hoá đơn VAT thủ công | M1 |
| BIL-02 | Quota người chơi/event + watermark gói Free | M1 |
| BIL-03 | Self-serve: Live Pass, gói Agency; thanh toán PayOS (VietQR) | M2 |
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
| Realtime | M1: 5.000 CCU/event trên 1 node; M4: 20.000. p95 < 150 ms; reconnect và khôi phục < 3 s |
| API | p95 < 200 ms; draw < 300 ms |
| Khả dụng | 99,9%/tháng; 99,95% trong khung giờ sự kiện; freeze window quanh sự kiện critical |
| Tính đúng | 0 sai lệch tồn kho; mọi award có audit trail |
| Bảo mật | OWASP ASVS L2; mã hoá PII; RBAC; test cross-tenant tự động |
| Riêng tư | Luật 91/2025/QH15: consent tách mục đích, quyền xoá/xuất, retention 12 tháng |
| Trình duyệt | iOS Safari ≥ 16, Chrome Android ≥ 100, Zalo/FB in-app; Screen: Chrome desktop |
| i18n | vi/en từ đầu |

---

## 8. Tiêu chí nghiệm thu M1 (Definition of Ready for Pilot)

1. **Builder:** 1 PM agency đối tác (không phải người của Playora) dựng được event YEP 4 game + brand kit + guest list trong ≤ 60 phút, có ≤ 2 lần hỏi hỗ trợ.
2. **Tải:** k6 với 5.000 client (shake race 60 s + quiz 10 câu): không mất kết nối diện rộng, CPU < 70%, p95 < 150 ms.
3. **Lucky draw:** 1.000 lần chạy tự động, 0 người trúng hai lần khi bật loại trùng; log khớp 100%; kiểm chứng được commit–reveal.
4. **Phục hồi:** Screen/Host/Player mất mạng 10 s thì tự hồi phục đúng trạng thái vòng.
5. **Thiết bị:** chạy được trên iPhone SE, iPhone 12, Samsung A-series, Xiaomi tầm thấp, Zalo/FB in-app; shake race có fallback tap khi bị chặn motion.
6. **Dữ liệu:** export người tham gia và người trúng đúng 100% so với DB.

---

## 9. Câu hỏi mở

1. Tính Live Pass theo "người tham gia" (đã join) hay "người chơi ≥ 1 vòng"? *Đề xuất:* đã join, vì dễ hiểu và dễ kiểm.
2. Có cần hỗ trợ khách không có máy nối LED (cho thuê mini PC qua đối tác)?
3. Gói Free ≤ 100 người có gây "ăn mòn" Live Pass S không? Theo dõi tỷ lệ nâng cấp ở M2.
4. Thời điểm mở gallery template công khai (SEO) là M2 hay sớm hơn để bắt đầu mùa YEP 2027?
