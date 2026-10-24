# Proposal — Playora: Gamified Campaign Builder

> **"Dựng minigame có thưởng trong 30 phút."** Nền tảng dựng minigame có thưởng cho chiến dịch marketing tại Việt Nam, bán qua agency. Chạy online, tại booth, và khi cần thì lên cả sân khấu LED.

Phiên bản: v2.0 · 24/10/2026 · Chiến lược đầy đủ: [00-product-strategy.md](./00-product-strategy.md)

---

## 1. Vấn đề

Brand ở Việt Nam chạy minigame có thưởng (vòng quay, cào thẻ, mở quà, hứng quà) như một **ngân sách lặp lại theo mùa**: Tết, 8/3, 30/4, Trung thu, sinh nhật brand, ra mắt sản phẩm, khai trương. Agency phụ trách các campaign này hiện phải chọn một trong ba cách, cách nào cũng có vấn đề:

| Cách hiện tại | Vấn đề |
|---|---|
| Thuê dev làm minigame riêng | Vài chục đến hàng trăm triệu đ, 2–6 tuần; khó kiểm soát giải (hết sớm, vượt ngân sách); hay sập khi đông; không tái sử dụng; không có báo cáo |
| SaaS minigame trong nước (WOAY) | Ít skin theo mùa; bán quota lượt/tháng; không có lớp agency/white-label; không có booth/sân khấu |
| Công cụ miễn phí (vòng quay online, random.org, Excel) | Thiếu chuyên nghiệp; bị nghi gian lận; không quản lý được giải; không có dữ liệu |

Nỗi sợ số 1 của brand là **giải hết sớm hoặc vượt ngân sách**, và bị nghi gian lận. Ở Trung Quốc, builder minigame như **观达云互动 (Guandayun)**, thực chất là đại lý OEM của **凡科互动** với hơn 300 template, thắng nhờ **kho template × skin theo mùa rất lớn, prize engine đầy đủ và mạng lưới đại lý OEM**; big screen chỉ là phụ. **Việt Nam chưa có sản phẩm tương đương** kết hợp skin theo mùa, prize engine kiểm soát chi phí và lớp agency.

## 2. Giải pháp

Playora là **một builder, một lõi và ba bề mặt**:

```
                 PLAYORA STUDIO: template × skin theo mùa × brand kit → publish trong 30 phút
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
   PLAYER (điện thoại) — LÕI       BOOTH (kiosk)                  SÂN KHẤU (LED + MC) — ADD-ON
   link/QR/Zalo, không cài app     activation, triển lãm          lắc/chạm đua theo đội,
   vòng quay, cào thẻ, mở hộp      auto-reset, staff đổi quà      lucky draw minh bạch,
   quà, hứng quà; nhiều ngày       (từ M3)                        Host Console
        └─────────────────────────────────┼─────────────────────────────────┘
          LÕI: Play Engine · Prize & Participation · Anti-fraud · Identity/Consent · Báo cáo · Live Engine
```

**Bốn trụ giá trị (theo thứ tự đầu tư):**

1. **Builder + thư viện minigame (lõi):** template × skin theo mùa × brand kit; flow chuẩn (Cover → Form → Game → Kết quả → Quà của tôi); auto-form, preview thật.
2. **Prize & Trust:** prize engine (tỷ lệ, tồn kho, giới hạn, ngân sách, rải đều theo thời gian), Prize Simulator (M2), voucher, đổi quà, chống gian lận, log kiểm chứng. Không có tính năng định trước người trúng.
3. **Agency layer:** client workspace, white-label, báo cáo gửi client, template riêng, reseller/OEM.
4. **Live add-on:** game LED nhiều người (shake/tap race), lucky draw minh bạch (lọc pool, commit–reveal, biên bản), Host Console; dùng lại engine realtime đã đạt 2.000 người.

## 3. Thị trường

- MICE Việt Nam khoảng **5–6 tỷ USD** (2025). Phần mềm quản lý sự kiện tại VN khoảng **28,6 triệu USD** (IMARC, 2025).
- SAM ước tính cho game sự kiện tại VN khoảng **75–80 tỷ đ/năm**, chưa tính dịch vụ game custom và ngân sách minigame campaign online. Đông Nam Á lớn gấp 5–8 lần.
- **ICP #1:** agency digital/activation/sự kiện (người mua và là kênh). **ICP #2:** brand marketing tầm trung (FMCG, F&B chuỗi, bán lẻ, bank, bảo hiểm, BĐS). **#3:** HR doanh nghiệp 200–3.000 nhân sự, mua Live add-on cho YEP và hội nghị.

Chi tiết: [01-market-research.md](./01-market-research.md) · [11-game-builder-research.md](./11-game-builder-research.md)

## 4. Khác biệt

| | Playora | Guandayun / 凡科 | WOAY | Quay số VN (XSPIN, Luck4You, EDC) | AhaSlides / Kahoot | Custom dev |
|---|---|---|---|---|---|---|
| Builder template + cấu hình | ✅ | ✅ | ✅ | ⚠️ (rời rạc) | ⚠️ (slide) | ❌ |
| Skin theo mùa VN (Tết, 8/3, Trung thu…) | ✅ ra đều theo lịch | ✅ (TQ) | ⚠️ ít | ❌ | ❌ | ⚠️ |
| Prize engine (rải đều, giới hạn, ngân sách, voucher) | ✅ + Simulator (M2) | ✅ | ✅ | ❌ | ❌ | ⚠️ |
| White-label cho agency | ✅ | ✅ (OEM) | ⚠️ | ⚠️ | ❌ | ✅ |
| Booth/kiosk cùng engine | ✅ (M3) | ✅ | ⚠️ | ❌ | ❌ | ⚠️ |
| Game nhiều người realtime trên LED | ✅ (add-on) | ⚠️ (phụ, ≤ 1.000) | ❌ | ❌ | ⚠️ (quiz) | ⚠️ |
| Lucky draw minh bạch (lọc pool, log) | ✅ (add-on) | ⚠️ | ❌ | ✅ | ⚠️ | ❌ |
| Zalo/ZNS, VietQR, PDPL, thể lệ khuyến mại | ✅ | ❌ (WeChat) | ⚠️ | ⚠️ | ❌ | ⚠️ |
| Cách tính giá | Theo campaign, không giới hạn lượt | Theo năm/đại lý | Quota lượt/tháng | Theo sự kiện | Theo tháng/sự kiện | Theo dự án |
| Thời gian dựng | 30 phút | Giờ | Giờ | Phút | Phút | Tuần |

## 5. Mô hình doanh thu

| Gói | Giá `[GĐ]` | Ghi chú |
|---|---|---|
| Free | 0đ | ≤ 200 người chơi/campaign, 1 minigame, lucky draw ≤ 100 người; watermark (kênh kéo khách) |
| **Campaign Pass** | 1,99tr (S, ≤ 2.000 người) · 4,99tr (M, ≤ 10.000) · từ 9,9tr (L) / campaign | Theo campaign, không giới hạn lượt chơi |
| **Agency (năm)** | Starter 29,9 triệu đ/năm · Pro 59,9 triệu đ/năm | White-label, client workspace, báo cáo gửi client, Live add-on giảm 30–40% |
| **Live add-on** | 990k (≤ 300) · 2,49tr (≤ 1.000) · 4,99tr (≤ 3.000) · từ 9,9tr (XL) / sự kiện | Upsell mùa YEP/hội nghị: shake/tap race, lucky draw, Host Console |
| Enterprise | Từ 150 triệu đ/năm | SSO, SLA, API, logic webhook |

Thêm add-on (OTP/ZNS, skin riêng theo brand, operator tại chỗ) và dịch vụ game custom. Gross margin phần mềm trên 85%.

Chi tiết: [02-business-model.md](./02-business-model.md)

## 6. Sản phẩm và công nghệ

- **Monorepo TypeScript trên Bun:** Next.js (Studio, Player, Screen), NestJS (API, Realtime, Worker), Drizzle + PostgreSQL, Redis, PixiJS, Cloudflare R2/CDN.
- **Template + config + skin:** mỗi cơ chế là một template có schema; editor tự sinh form; skin theo mùa nhân bản gallery mà không cần viết code mới.
- **Server-authoritative:** server quyết định mọi kết quả và giải thưởng trước khi client animate; prize engine khoá tồn kho và ngân sách theo campaign. Live add-on chạy trên room realtime có snapshot để phục hồi.

Chi tiết: [05-architecture.md](./05-architecture.md) · [12-builder-spec.md](./12-builder-spec.md)

## 7. Lộ trình MVP

| Giai đoạn | Thời gian | Kết quả | Gate |
|---|---|---|---|
| **M0** Discovery & Foundation | 26/10 – 06/11/2026 | Phỏng vấn agency + brand, pre-sale campaign Tết; monorepo, design system, spike realtime (đã đạt) | ≥ 3 cọc pilot campaign Tết |
| **M1** MVP "Tết Campaign" + Live add-on | 09/11 – 11/12/2026 | Play engine; prize engine v1; voucher pool; 4 minigame (vòng quay, cào thẻ, mở hộp quà, hứng quà); skin Tết + chung; link theo kênh; dashboard + export. Live add-on: shake/tap race, lucky draw minh bạch, Host Console | 0 sai lệch giải trên 1 triệu lượt mô phỏng |
| Pilot Tết 2027 | 12/12/2026 – 06/02/2027 | 10+ campaign trả phí, ≥ 50.000 lượt chơi hợp lệ, ≥ 3 campaign agency tự dựng | 0 sai lệch giải, NPS ≥ 40 |
| **M2** Self-serve & Agency | 22/02 – 30/04/2027 | Prize Simulator, pacing đầy đủ, OTP ZNS/SMS, +4 minigame, đổi quà staff mode, client workspace, white-label, PayOS, báo cáo PDF + biên bản | ≥ 30 khách / ≥ 8 agency trả phí |
| **M3** Booth & Activation | 03/05 – 30/07/2027 | Kiosk mode, mã tham gia/nắp chai, funnel theo kênh, thông báo trúng ZNS/email; Live thêm kéo co, nghi thức khởi động, check-in wall | ≥ 10 activation trả phí, ARPA agency +30% |
| **M4** Scale & Platform | 08 – 12/2027 | Zalo login/Mini App, webhook/API, custom domain, e-gift, AI draft, reseller/OEM, kiosk offline, Live 20.000 CCU; bán Tết 2028 + YEP từ 09 | 1.000 campaign/sự kiện mùa Tết 2028, 50 agency |

Chi tiết: [09-roadmap-plan.md](./09-roadmap-plan.md)

## 8. Đội ngũ và nguồn lực

- **M0–M1 (6 người):** Founder/PM, Tech Lead (backend/prize engine + realtime), 2 Fullstack, 1 Game dev (PixiJS), 1 Designer (UI + game art/skin); operator và QA part-time khi pilot.
- **Từ M2 (8 người + hợp đồng):** thêm BD agency, CS/Operator; game artist hợp đồng cho skin theo mùa từ M2.
- **Ngân sách M0 → hết pilot:** ~920 triệu đ.
- **Pre-seed:** ~6 tỷ đ (~230.000 USD) cho 18 tháng runway. Kịch bản cơ sở hoà vốn vận hành quanh Q4/2027.

## 9. Giả định rủi ro nhất

| Giả định | Kiểm chứng | Nếu sai thì |
|---|---|---|
| Agency/brand chọn Playora thay vì WOAY nhờ skin theo mùa + kiểm soát giải + white-label | Pre-sale M0 (≥ 3 cọc), lý do chọn trong phỏng vấn, pilot M1 | Tập trung hẳn vào agency white-label/OEM; cạnh tranh bằng giá theo campaign |
| Agency tự dựng bằng builder | ≥ 3 campaign tự dựng (M1), ≥ 60% (M2) | Mô hình managed service + template |
| Prize engine giữ đúng kho và ngân sách dưới tải campaign | Test 1 triệu lượt mô phỏng + load test, 0 sai lệch | Khoá chặt hơn (serialize theo campaign), giảm tốc độ phát giải |
| Live add-on bán thêm được mà không kéo nguồn lực khỏi lõi | ≥ 5 sự kiện YEP mua add-on; ≤ 20% effort dev M1 | Đóng băng live, chỉ giữ lucky draw |

## 10. Đề xuất quyết định

1. **Duyệt định hình sản phẩm** theo [00-product-strategy.md](./00-product-strategy.md) v2.0: lõi là minigame có thưởng cho campaign (online trước, booth dùng chung engine); Live LED là add-on; ICP #1 là agency; WOAY là đối thủ trực tiếp; không làm quiz.
2. **Duyệt scope M1** (play engine, prize engine v1, voucher pool, 4 minigame, skin Tết + chung, link theo kênh, dashboard + export, Live add-on ≤ 20% effort; không billing tự động, OTP, Simulator, đổi quà) và ngân sách ~920 triệu đ đến hết pilot.
3. **Mở pre-sale campaign Tết 2027 ngay tuần 26/10** với 20 agency và brand, bán kèm Live add-on cho YEP; mục tiêu ≥ 3 cọc trước 06/11.
4. **Chốt tư vấn pháp lý** khuyến mại + PDPL (≤ 30 triệu đ) trước khi chạy campaign có thưởng đầu tiên.
5. **Hoàn tất M0:** scaffold monorepo và spike ([10-dev-setup-conventions.md](./10-dev-setup-conventions.md)).
