# PRD — Playora

Phiên bản: **v4.0** · 26/10/2026 · Owner: PO · Theo [strategy.md](./strategy.md) v4.0 · Thuật ngữ: [glossary.md](./glossary.md)

**Giai đoạn:** M0 Discovery · **M1** vòng lõi + pilot Tết (→ 02/2027) · **M2** self-serve + giữ chân v1 (03–05/2027) · **M3** Zalo + giữ chân v2 (06–09/2027) · **M4** kênh + Tết 2028 (10–12/2027) · **Later** 2028+. Lịch chi tiết: [roadmap.md](./roadmap.md).

**Hiện trạng** (cột cuối mỗi bảng): ✅ chạy với API thật · 🧪 bản thử nghiệm (chưa đủ cho pilot) · ⬜ chưa làm.

---

## 1. Mục tiêu

| # | Mục tiêu | Đo bằng |
|---|---|---|
| G1 | Chủ quán có game mang sản phẩm của mình mà không cần kỹ thuật | Trung vị playbook → publish ≤ 10 phút (M1), ≤ 5 phút (M2); ≥ 60% chương trình dùng ảnh của quán |
| G2 | Giải không bao giờ phát sai, chi phí quà trong ngân sách | 0 sai lệch tồn kho/ngân sách/giới hạn; 100% kết quả có log |
| G3 | Mỗi lượt trúng quà hiện vật thành một lượt ghé quán đã xác thực | ≥ 80% quà hiện vật được đổi qua màn Đổi quà |
| G4 | Chủ quán thấy kết quả kinh doanh, không chỉ lượt chơi | 100% chương trình có báo cáo "khách tới quầy, khách quay lại, chi phí quà" |
| G5 | Khách quay lại | ≥ 20% khách đã đổi quà quay lại trong 30 ngày (chương trình bật giữ chân) |
| G6 | Dữ liệu hợp pháp | 100% người chơi có consent tách mục đích; xoá/xuất theo yêu cầu |

### Ngoài phạm vi

Quiz/poll; game LED/sân khấu realtime; editor logic kiểu Epub360; cash/lì xì tiền, cá cược; bán vé, agenda; check-in khuôn mặt; app native; bộ SaaS (CRM, POS, shop). Lý do: [strategy §7](./strategy.md#7-nguyên-tắc-sản-phẩm).

---

## 2. Persona

| Persona | Bối cảnh | Cần | Thất vọng hiện tại |
|---|---|---|---|
| **Chị Hà, chủ 3 quán trà sữa** (người mua, người dựng) | Tự làm marketing trên fanpage và Zalo; làm việc trên laptop lúc vắng khách | Kéo khách dịp Tết và ngày vắng; khách quay lại; biết chương trình có lời không | Vòng quay miễn phí không quản lý được quà; WOAY chỉ đổi màu/logo; không đo được hiệu quả |
| **Tuấn, nhân viên quầy** | Đứng quầy giờ cao điểm, một tay cầm điện thoại | Quét hoặc gõ mã trong vài giây, biết ngay đổi được hay không | Khách đưa ảnh chụp màn hình mã cũ; không biết mã đã đổi chưa |
| **Khách (người chơi)** | Điện thoại phổ thông, mở link từ Zalo/FB hoặc quét QR trên bàn; 4G chập chờn | Vào trong ≤ 10 giây, chơi vui, biết trúng gì và đổi ở đâu | Phải cài app, form dài, trúng rồi không nhận được quà |
| **Linh, freelancer marketing** (M4) | Làm chương trình cho 5–10 quán | Nhân bản chương trình, giao cho từng quán tự vận hành | Mỗi quán làm lại từ đầu |

---

## 3. Bề mặt sản phẩm

| Bề mặt | URL | Thiết bị | Giai đoạn |
|---|---|---|---|
| **Studio** | `studio.playora.vn` | Desktop (Đổi quà: điện thoại) | M1 |
| **Player** | `play.playora.vn/{slug}` (custom domain M4) | Điện thoại | M1 |
| **Quầy đổi quà** | `studio.playora.vn/orgs/{orgId}/redeem` | Điện thoại | M1 |
| **Web + chợ mẫu công khai** | `playora.vn` | Mọi thiết bị | M1 (landing), M2 (chợ mẫu SEO) |
| **Kiosk** | `play.playora.vn/{slug}?mode=kiosk` | Tablet tại quầy | M3 |
| **Back-office** | trong Studio, vai trò nội bộ | Desktop | M1 (tối giản) |

---

## 4. Hành trình chính

### J1 — Chủ quán dựng chương trình từ mục tiêu (M1)

1. Trang chủ → **"Bạn muốn gì?"**: chọn playbook "Tết: kéo khách về quán".
2. Playbook điền sẵn mẫu vòng quay, skin Tết, luật "mỗi khách 1 lượt/ngày", gợi ý quà theo ngân sách. Chị Hà nhập ngân sách 2 triệu và giá vốn từng quà.
3. **Sửa nhanh:** chụp ảnh ly trà sữa vào ô "ảnh sản phẩm", logo vào ô "logo", sửa chữ khuyến mãi. Muốn đặt sticker riêng thì chuyển sang **Tuỳ biến**.
4. **Luật & giải:** xem mô phỏng "1.000 khách thì quà còn lại thế nào"; chỉnh tỷ lệ.
5. Kiểm tra trước khi phát hành (sửa một chạm) → chơi thử bằng link nháp → **Phát hành** → màn chia sẻ: QR để in standee, link cho fanpage, mời nhân viên vào quầy đổi quà.

### J2 — Khách chơi (M1)

Quét QR trên bàn → Bìa + thể lệ → form (tên, SĐT) + consent → chơi → **server quyết định kết quả trước khi animate** → Kết quả (trúng / không trúng / hết quà / hết lượt) → mã đổi quà + QR → "Quà của tôi". Hết lượt thì báo lượt tiếp theo khi nào.

### J3 — Nhân viên đổi quà (M1)

Mở Quầy đổi quà trên điện thoại → quét QR hoặc gõ mã → thấy tên quà, hạn, trạng thái → **Xác nhận đã trao** (không hoàn tác) → lượt ghé quán được ghi nhận.

### J4 — Chủ quán xem kết quả (M1)

Trang tổng quan chương trình: khách tới quầy, khách quay lại, quà đã phát / đã đổi / còn lại, chi phí quà so với ngân sách, theo ngày và theo kênh. Cuối chương trình: báo cáo một trang để lưu hoặc gửi đối tác.

### J5 — Khách quay lại (M2)

Khách đã đổi quà nhận tin "Hôm nay bạn còn 1 lượt" (Zalo ZNS từ M3), hoặc điểm danh mỗi ngày để tích điểm đổi quà.

---

## 5. Yêu cầu chức năng

### 5.1 Tài khoản và tổ chức (ORG)

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| ORG-01 | Đăng nhập email + mật khẩu; Google, magic link | M1 | ✅ (Google bật khi có client id) |
| ORG-02 | Tổ chức, mời thành viên, vai trò `owner/admin/editor/operator/viewer` | M1 | ✅ |
| ORG-02a | Vai trò **"chỉ đổi quà"**: chỉ thấy Quầy đổi quà | M1 | ✅ |
| ORG-06 | Audit log (giải, đổi quà, export, phát hành) | M1 | ✅ (một phần) |
| ORG-07 | 2FA cho owner/admin | M2 | ⬜ |
| ORG-03 | Workspace theo quán cho agency/freelancer | M4 | ⬜ |
| ORG-04 | White-label cơ bản | M4 | ⬜ |
| ORG-05 | Custom domain cho Player | M4 | ⬜ |
| ORG-09 | Reseller/OEM | M4 | ⬜ |

### 5.2 Playbook và kết quả (PLB) — mới ở v4.0

Đặc tả: [specs/playbooks.md](./specs/playbooks.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| PLB-01 | Luồng tạo bắt đầu bằng **mục tiêu**; ≥ 3 playbook F&B (Tết kéo khách, khách quay lại lần 2, ngày vắng) | M1 | 🧪 Studio: "Bạn muốn gì?" → thiết lập + đề xuất → editor (3 màn), "Tự chọn mẫu" mở kho mẫu; tag playbook ở trang chương trình · e2e `playbook-create.spec.ts` |
| PLB-02 | Playbook điền sẵn mẫu, skin, luật, gợi ý cơ cấu quà theo **ngân sách** và **giá vốn** quà | M1 | 🧪 `lib/playbooks.ts` + `lib/suggest.ts` (q_i = ⌊B·w_i/c_i⌋, Σ q_i·c_i ≤ B có test; tỷ lệ trúng chọn bằng `simulate()` để rủi ro hết quà trước 90% ≤ 10%) |
| PLB-03 | Báo cáo kết quả: khách tới quầy (lượt đổi quà), khách quay lại, chi phí quà so ngân sách, theo ngày/kênh | M1 | ✅ API (`GET …/campaigns/{id}/report`, 4 số chính khớp `awards` trong test tích hợp) · ⬜ UI |
| PLB-04 | Báo cáo một trang cuối chương trình (xem/in/tải) | M1 | ⬜ |
| PLB-05 | Benchmark ẩn danh theo ngành ("quán trà sữa trung bình đạt X% đổi quà") | M3 | ⬜ |
| PLB-06 | Playbook cho ngành khác (spa, gym, bán lẻ) | M2–M3 | ⬜ |
| PLB-07 | Gợi ý "chương trình tiếp theo" dựa trên kết quả chương trình trước | M3 | ⬜ |

### 5.3 Builder (BLD)

Đặc tả: [specs/builder.md](./specs/builder.md) · UX Studio: [specs/studio-ux.md](./specs/studio-ux.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| BLD-01 | Kho mẫu lọc theo dịp, ngành, mục tiêu; xem trước chơi được | M1 (trong Studio), M2 (công khai, SEO) | ✅ (trong Studio) |
| BLD-02 | Auto-form sinh từ `configSchema` cho phần riêng của mẫu | M1 | ✅ (editor cũ) |
| BLD-03 | Preview thật: cùng renderer với Play, kết quả giả lập chọn được | M1 | ✅ |
| BLD-04 | Brand kit (logo, màu, font) áp cho mọi chương trình | M1 | ✅ |
| BLD-06 | Skin: M1 mỗi mẫu 3 skin (Tết, quanh năm, khai trương) có hình thật; M2 bộ theo dịp | M1/M2 | 🧪 (3 mẫu × 3 skin, chưa có art thật) |
| BLD-07 | Flow chuẩn: Bìa → Form → Game → Kết quả (4 biến thể) → Quà của tôi | M1 | ✅ |
| BLD-08 | Phát hành tạo phiên bản bất biến; chỉ chữ/nhãn sửa nóng được, có audit | M1 | ✅ |
| BLD-09 | Kiểm tra trước khi phát hành, **sửa một chạm** | M1 | ✅ |
| BLD-13 | Thư viện ảnh: upload, tối ưu ảnh, cắt theo ô | M1 | ✅ upload · ⬜ cắt theo ô |
| BLD-14 | Tự lưu, undo/redo | M1 | ✅ |
| BLD-15 | Nhân bản chương trình; thùng rác 14 ngày | M2 | ⬜ |
| BLD-19 | **Sửa nhanh** bằng ô thay thế (logo, ảnh sản phẩm, chữ khuyến mãi, ảnh quà) | M1 | ✅ |
| BLD-20 | **Tuỳ biến**: canvas tự do cho mọi màn ([ADR-014](../adr/014-free-canvas-screen-editor.md)) | M1 (beta) | ✅ |
| BLD-21 | **Luật & giải**: chọn cách phát giải trước, luật viết bằng câu, mô phỏng | M1 | ✅ |
| BLD-22 | Chụp ảnh sản phẩm → **tự xoá nền** → cắt theo ô | M2 | ⬜ |
| BLD-23 | Link nháp chơi thử (≤ 20 người, không trừ kho) | M1 | ✅ |
| BLD-24 | Thêm mẫu mới chỉ bằng một thư mục + lệnh `gen:template` | M1 | ⬜ |
| BLD-17 | AI dựng nháp từ một câu tiếng Việt / link fanpage; AI không quyết định kết quả | M2 | ⬜ |
| BLD-16 | Lưu thành mẫu riêng của tổ chức | M4 | ⬜ |
| BLD-18 | Game SDK công khai + marketplace | Later | ⬜ |

### 5.4 Tham gia và chương trình (EVT)

Đặc tả: [specs/participation.md](./specs/participation.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| EVT-01 | Vòng đời suy ra: Nháp → Đã lên lịch → Đang chạy ⇄ Tạm dừng → Đã kết thúc; gia hạn; không xoá khi đang chạy | M1 | ✅ |
| EVT-02 | Danh tính: ẩn danh (thiết bị), form (tên, SĐT), danh sách khách mời | M1 | ✅ (join cũ) |
| EVT-05 | Form đăng ký + consent tách mục đích | M1 | ✅ |
| EVT-10 | QR tham gia (PNG/SVG), mẫu standee & tent card | M1 | ✅ |
| EVT-11 | Link theo kênh (`?ch=`) và thống kê theo kênh | M1 | ✅ |
| EVT-13 | Chống gian lận theo mức Thấp/Chuẩn/Cao | M1 (Thấp, Chuẩn), M2 (Cao) | ✅ Thấp/Chuẩn (rate limit, Turnstile trên Play, một thiết bị một người chơi, thu hồi token) · ⬜ Cao |
| EVT-14 | Lượt chơi theo ngày/tổng/khung giờ; thêm lượt khi chia sẻ (giới hạn) | M1/M2 | ✅ M1 (lượt/ngày, giờ và ngày mở cửa) · ⬜ thêm lượt khi chia sẻ (M2) |
| EVT-09 | Chạy thử bằng bot N lượt, không trừ kho thật | M1 | ⬜ |
| EVT-03 | OTP SĐT (ZNS ưu tiên, SMS dự phòng) | M2 | ⬜ |
| EVT-07 | Mã tham gia (in trên hoá đơn/nắp ly), mỗi mã có QR | M3 | ⬜ |
| EVT-04 | Đăng nhập Zalo / Zalo Mini App | M3 | ⬜ |
| EVT-08 | Up hoá đơn để được lượt (duyệt tay; OCR sau) | M4 | ⬜ |
| EVT-12 | Giới hạn khu vực GPS | M4 | ⬜ |

### 5.5 Giữ chân (RET) — engine thứ ba

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| RET-01 | Điểm danh mỗi ngày, chuỗi ngày, quà theo mốc | M2 | ⬜ |
| RET-02 | Bốc mỗi ngày (mỗi ngày một lượt mới) | M2 | 🧪 (lượt theo ngày) |
| RET-03 | Nhắc quay lại: tin "còn lượt hôm nay", voucher sắp hết hạn (ZNS) | M3 | ⬜ |
| RET-04 | Hub điểm thưởng của quán | M3 | ⬜ |
| RET-05 | Sưu tầm thẻ (không ép rủ bạn) | M3 | ⬜ |

### 5.6 Game (GAM)

Danh mục: [specs/game-catalog.md](./specs/game-catalog.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| GAM-01 | Instant-win: token lượt chơi dùng một lần; server quyết định kết quả và giải trước khi client animate | M1 | ✅ |
| GAM-02 | Skill: server xác thực điểm (thời lượng, tốc độ tối đa, plausibility) trước khi xét giải | M1 | ⬜ |
| GAM-03 | Cùng phiên bản chạy trên Player và Kiosk | M1/M3 | ⬜ |
| GAM-04 | Renderer M1: vòng quay, cào thẻ, mở hộp (instant); hứng quà (skill) | M1 | ✅ vòng quay, cào thẻ, mở hộp (API thật, e2e `play-mechanisms`) · ⬜ hứng quà (dời M2 theo roadmap §1.4) |

### 5.7 Giải và đổi quà (PRZ)

Đặc tả: [specs/prizes-redemption.md](./specs/prizes-redemption.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| PRZ-01 | Giải: tên, ảnh, loại, số lượng, **giá vốn** | M1 | ✅ |
| PRZ-05 | Cách phát: `per_prize_probability`, `overall_win_rate`, `guaranteed`; trừ kho nguyên tử | M1 | ✅ |
| PRZ-06 | `score_threshold` (skill) M1; `scheduled_moments`, `rank_based` M2 | M1/M2 | ⬜ |
| PRZ-07 | Rải quà: `time_uniform`, `opening_hours` (M1); `batch_release`, `end_flush` (M2) | M1/M2 | ✅ (`time_uniform`, `opening_hours`) |
| PRZ-08 | Mô phỏng phát giải trước khi phát hành | M1 | ✅ (có chi phí quà dự kiến so ngân sách, ngày mở trong tuần) |
| PRZ-09 | Kho mã voucher (import/sinh), giải an ủi, **ngân sách tổng**, giới hạn giải/người | M1 | ✅ (sinh mã, ngân sách, giới hạn) |
| PRZ-03 | Thông báo trúng trên Player ("Quà của tôi") | M1 | ✅ |
| PRZ-10 | **Đổi quà tại quầy**: quét/nhập mã, không hoàn tác, chống đổi hai lần; hạn đổi | M1 | ✅ |
| PRZ-14 | Điểm đổi quà theo cửa hàng (chuỗi nhiều quán) | M2 | ⬜ |
| PRZ-11 | Thông báo trúng qua email/ZNS | M3 | ⬜ |
| PRZ-02 | Bốc thăm cuối chương trình (commit–reveal, trang công bố) | M2 | ⬜ |
| PRZ-04 | Biên bản PDF (thể lệ, giải, người trúng, log) | M2 | ⬜ |
| PRZ-12 | Tặng quà theo danh sách (không ngẫu nhiên). **Không** định trước người trúng | M3 | ⬜ |
| PRZ-13 | e-gift, điểm thưởng qua webhook | M4 | ⬜ |

### 5.8 Báo cáo và tích hợp (ANL)

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| ANL-01 | Tổng quan chương trình: lượt chơi, khách, quà đã phát/đã đổi/còn lại, theo ngày (xem PLB-03 cho chỉ số kết quả) | M1 | 🧪 |
| ANL-02 | Export CSV/XLSX: người chơi (kèm consent), người trúng, mã đã đổi | M1 | ⬜ |
| ANL-04 | Phễu: mở link → form → chơi → trúng → đổi; theo kênh | M2 | ⬜ |
| ANL-05 | Webhook `player.registered`, `play.completed`, `prize.awarded`, `prize.redeemed` | M4 | ⬜ |
| ANL-07 | Tích hợp POS (KiotViet, Sapo): ghi nhận đơn hàng sau khi đổi quà | M4 | ⬜ |
| ANL-06 | Public API | M4 | ⬜ |

### 5.9 Gói và thanh toán (BIL)

Giá: [business-model §3](../business/business-model.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| BIL-01 | Kích hoạt gói thủ công, hoá đơn thủ công | M1 | ✅ API (`/admin/orgs…` cho nhân viên Playora trong `PLATFORM_ADMIN_EMAILS`, có audit log) · ✅ UI back-office Studio `/admin`: tìm tổ chức, đổi gói + hạn + ghi chú, ghi hoá đơn; trang Gói & sử dụng có lịch sử hoá đơn và hướng dẫn chuyển khoản (kích hoạt trong 24 giờ) |
| BIL-02 | Quota theo gói (lượt đổi quà/tháng, số chương trình chạy) + watermark gói Free | M1 | ✅ API + Play (chặn phát hành/tiếp tục `PLAN_CAMPAIGN_LIMIT`, chặn đổi quà quá 110% `PLAN_REDEMPTION_LIMIT` theo [D-21](./decisions.md), badge "Tạo bằng Playora"; `GET …/billing` trả usage) · ✅ Studio: trang Gói & sử dụng (thanh usage, cảnh báo 80%/100% + giải thích ân hạn), banner trên Trang chủ và quầy đổi quà, thông báo `PLAN_CAMPAIGN_LIMIT` khi publish/tiếp tục, `PLAN_REDEMPTION_LIMIT` ở quầy |
| BIL-03 | Tự thanh toán thuê bao qua PayOS (VietQR) | M2 | ⬜ |
| BIL-04 | Credit OTP/ZNS | M3 | ⬜ |
| BIL-05 | Hoá đơn điện tử tự động | M4 | ⬜ |

### 5.10 Back-office (ADM)

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| ADM-01 | Danh sách tổ chức, gói, usage; impersonate có log | M1 | ✅ API danh sách/tìm tổ chức kèm gói + usage (`GET /admin/orgs`) · ✅ UI Studio `/admin` (404 với người không phải nhân viên) · ⬜ impersonate |
| ADM-02 | Lịch chương trình sắp chạy (để chuẩn bị tải, hỗ trợ) | M1 | ⬜ |
| ADM-03 | Quản lý mẫu/skin (bật/tắt, gán gói) | M2 | ⬜ |

### 5.11 Tuân thủ (CMP)

Pháp lý: [compliance](../business/compliance.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| CMP-03 | Hỏi "loại chương trình" khi tạo (gắn mua hàng hay không); checklist pháp lý và nhắc thông báo Sở Công Thương trước phát hành | M1 | ✅ API (`compliance.promotionType`, `checklistAcknowledgedAt`) · ✅ UI Studio |
| CMP-04 | Sinh thể lệ từ cấu hình (thời gian, giải, số lượng, giá trị, cách xác định trúng); chủ quán sửa được | M1 | ✅ API + Play (`generateTerms`, "Thể lệ đầy đủ" trên Play, `compliance.termsText` ghi đè) · ✅ UI sửa trong Studio |
| CMP-01 | Người chơi yêu cầu xem/xoá/rút consent; chủ quán xử lý trong Studio | M2 | ⬜ |
| CMP-02 | Hạn lưu dữ liệu mặc định 12 tháng, tự ẩn danh hoá | M2 | ⬜ |
| CMP-05 | Báo cáo giá trị giải không có người trúng | M2 | ⬜ |

**Đã bỏ:** BLD-05 (kế thừa brand kit theo client, gộp vào ORG-03), BLD-10/11/12 (run-of-show, screen editor, quiz), toàn bộ LIV-* (live engine). Xem [archive](../archive/).

---

## 6. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
|---|---|
| Hiệu năng Player | First load ≤ 2 s trên 4G; First Load JS `play /[slug]` ≤ 260 KB gzip (trần 280, [ADR-013](../adr/013-antd-ui.md)); mỗi mẫu lazy-load ≤ 300 KB; ≥ 30 fps máy cũ |
| Play API | Đỉnh ≥ 500 lượt/giây/chương trình (M1); quyết định kết quả + trừ kho p95 < 200 ms |
| Quầy đổi quà | Từ quét mã đến kết quả ≤ 2 s trên 4G |
| Khả dụng | 99,9%/tháng; không deploy trong khung giờ đánh dấu "quan trọng" ([runbook](../operations/runbook.md)) |
| Tính đúng | 0 sai lệch tồn kho; mọi lần trúng và đổi quà có audit |
| Bảo mật | OWASP ASVS L2; RBAC; test cross-tenant tự động ([security](../engineering/security.md)) |
| Riêng tư | Luật 91/2025/QH15: consent tách mục đích, quyền xoá/xuất, lưu 12 tháng ([compliance](../business/compliance.md)) |
| Trình duyệt | iOS Safari ≥ 16, Chrome Android ≥ 100, trình duyệt trong Zalo/FB |
| i18n | vi/en từ đầu; vi là chuẩn |

---

## 7. Tiêu chí nghiệm thu M1 (sẵn sàng pilot)

1. **Vòng lõi:** trên điện thoại thật, quét QR → chơi → nhận mã → nhân viên đổi tại quầy → số liệu hiện trên Tổng quan, tất cả qua API thật.
2. **Builder:** 5 người không làm thiết kế dựng được chương trình Tết có logo + ảnh sản phẩm từ playbook trong ≤ 10 phút, ≤ 2 lần hỏi.
3. **Prize engine:** 1.000.000 lượt mô phỏng với 50 luồng đồng thời: **0** vượt tồn kho, ngân sách, giới hạn/người; bật `time_uniform` thì quà còn lại bám đường kế hoạch ± 10%.
4. **Tải:** k6 đỉnh 500 lượt/giây trong 10 phút: p95 < 200 ms, 0 lỗi 5xx, số liệu khớp DB.
5. **Đổi quà:** một mã chỉ đổi được một lần dưới 20 yêu cầu đồng thời; mã hết hạn bị từ chối.
6. **Chống gian lận:** script chơi lặp từ một thiết bị/IP bị chặn theo mức Chuẩn; lượt bị gắn cờ không nhận giải.
7. **Thiết bị:** chạy trên iPhone SE, iPhone 12, Samsung A-series, Xiaomi tầm thấp, trình duyệt trong Zalo/FB.
8. **Báo cáo:** số khách tới quầy và chi phí quà khớp 100% với dữ liệu đổi quà.

---

## 8. Câu hỏi mở

Xem [decisions.md — Câu hỏi đang mở](./decisions.md#câu-hỏi-đang-mở).
