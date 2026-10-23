# Proposal — Playora: Event Game Builder

> **"Cả hội trường cùng chơi."** Nền tảng dựng và vận hành game tương tác *tại sự kiện* cho agency và doanh nghiệp Việt Nam, từ sân khấu LED đến booth activation.

Phiên bản: v1.0 · 23/10/2026 · Chiến lược đầy đủ: [00-product-strategy.md](./00-product-strategy.md)

---

## 1. Vấn đề

Sự kiện ở Việt Nam (YEP, hội nghị, ra mắt sản phẩm, activation, roadshow) cần "khoảnh khắc tương tác". Người tổ chức hiện phải chọn một trong ba cách, cách nào cũng có vấn đề:

| Cách hiện tại | Vấn đề |
|---|---|
| Thuê dev/agency làm game riêng | Vài chục triệu đến hàng trăm triệu đ, 2–6 tuần; hay sập khi đông người; không tái sử dụng; không có báo cáo |
| Ghép nhiều công cụ rời (phần mềm quay số, check-in QR, Kahoot/AhaSlides) | 2–3 nhà cung cấp, 2–3 bộ dữ liệu; không có game nhiều người; thương hiệu rời rạc |
| Công cụ miễn phí (vòng quay online, random.org, Excel) | Thiếu chuyên nghiệp; bị nghi gian lận; không có dữ liệu |

Ở Trung Quốc, builder minigame như **观达云互动 (Guandayun)**, thực chất là đại lý OEM của **凡科互动** với hơn 300 template, cùng các nền tảng màn hình lớn như **Hi现场** (60+ trò, tự nhận "40 vạn người/buổi") đã chứng minh nhu cầu ở quy mô lớn. **Việt Nam chưa có sản phẩm tương đương:** quay số đã bị hàng hoá hoá (0,25–4 triệu đ/sự kiện), nhưng **game nhiều người trên LED dựng bằng builder thì chưa ai làm**.

## 2. Giải pháp

Playora là **một builder và ba bề mặt**:

```
                 PLAYORA STUDIO: template × skin × brand kit → publish trong 30 phút
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
   SÂN KHẤU (LED + MC)            KHÁN GIẢ (điện thoại)                BOOTH (kiosk)
   check-in wall, quiz,           quét QR, không cài app               vòng quay, cào thẻ,
   lắc đua theo đội, kéo co,      chơi live, nhận giải                 hứng quà, đổi quà
   đếm tiền lì xì, quay số                                             (từ M3)
        └─────────────────────────────────┼─────────────────────────────────┘
                    LÕI: Live Engine · Prize & Trust · Identity/Consent · Báo cáo
```

**Bốn trụ giá trị:**

1. **Live Engine (wedge):** game nhiều người trên LED, 5.000+ người đồng thời (20.000 ở M4).
2. **Builder (lõi):** template × skin theo mùa × brand kit; auto-form, preview thật, run-of-show; MC điều khiển bằng điện thoại.
3. **Prize & Trust:** lucky draw minh bạch (lọc pool, commit–reveal, biên bản quay thưởng); prize engine có Prize Simulator.
4. **Agency layer:** client workspace, white-label, báo cáo gửi client, reseller.

## 3. Thị trường

- MICE Việt Nam khoảng **5–6 tỷ USD** (2025). Phần mềm quản lý sự kiện tại VN khoảng **28,6 triệu USD** (IMARC, 2025).
- SAM ước tính cho game sự kiện tại VN khoảng **75–80 tỷ đ/năm**, chưa tính dịch vụ game custom. Đông Nam Á lớn gấp 5–8 lần.
- **ICP #1:** agency sự kiện và activation (người mua và là kênh). **ICP #2:** HR doanh nghiệp 200–3.000 nhân sự (mùa YEP).

Chi tiết: [01-market-research.md](./01-market-research.md) · [11-game-builder-research.md](./11-game-builder-research.md)

## 4. Khác biệt

| | Playora | Guandayun / 凡科 | WOAY | Quay số VN (XSPIN, Luck4You, EDC) | AhaSlides / Kahoot | Custom dev |
|---|---|---|---|---|---|---|
| Builder template + cấu hình | ✅ | ✅ | ✅ | ⚠️ (rời rạc) | ⚠️ (slide) | ❌ |
| Game nhiều người realtime trên LED | ✅ | ⚠️ (phụ, ≤ 1.000) | ❌ | ❌ | ⚠️ (quiz) | ⚠️ |
| Lucky draw minh bạch (lọc pool, log) | ✅ | ⚠️ | ❌ | ✅ | ⚠️ | ❌ |
| Prize engine (pacing, voucher, đổi quà) | ✅ + Simulator | ✅ | ✅ | ❌ | ❌ | ⚠️ |
| White-label cho agency | ✅ | ✅ (OEM) | ⚠️ | ⚠️ | ❌ | ✅ |
| Chịu tải hàng nghìn người đồng thời | ✅ | ? | ? | ✅ | ✅ | ❌ thường sập |
| Zalo/ZNS, VietQR, PDPL, thể lệ khuyến mại | ✅ | ❌ (WeChat) | ⚠️ | ⚠️ | ❌ | ⚠️ |
| Thời gian dựng | 30 phút | Giờ | Giờ | Phút | Phút | Tuần |

## 5. Mô hình doanh thu

| Gói | Giá | Ghi chú |
|---|---|---|
| Free | 0đ | ≤ 100 người; check-in, quay số, quiz, 1 game live; watermark (kênh kéo khách) |
| **Live Pass** | 990k (≤ 300) · 2,49tr (≤ 1.000) · 4,99tr (≤ 3.000) · từ 9,9tr (XL) | Theo sự kiện |
| **Agency** | 4,99 triệu đ/tháng | White-label, client workspace, Live Pass giảm 40% |
| Campaign Pro (M3) | 1,49 triệu đ/tháng | Booth/activation |
| Enterprise | Từ 150 triệu đ/năm | SSO, SLA, API, logic webhook |

Thêm add-on (OTP/ZNS, operator tại chỗ, theme đặc biệt) và dịch vụ game custom. Gross margin phần mềm trên 85%.

Chi tiết: [02-business-model.md](./02-business-model.md)

## 6. Sản phẩm và công nghệ

- **Monorepo TypeScript trên Bun:** Next.js (Studio, Player, Screen), NestJS (API, Realtime, Worker), Drizzle + PostgreSQL, Redis, PixiJS, Cloudflare R2/CDN.
- **Template + config + skin:** mỗi cơ chế là một template có schema; editor tự sinh form; skin theo mùa nhân bản gallery mà không cần viết code mới.
- **Server-authoritative + room affinity:** server quyết định mọi kết quả; mỗi sự kiện chạy trên một room realtime, có snapshot để phục hồi.

Chi tiết: [05-architecture.md](./05-architecture.md) · [12-builder-spec.md](./12-builder-spec.md)

## 7. Lộ trình MVP

| Giai đoạn | Thời gian | Kết quả | Gate |
|---|---|---|---|
| **M0** Discovery & Foundation | 26/10 – 06/11/2026 | 18 phỏng vấn, ≥ 3 cọc pilot, 5 spike kỹ thuật | Nhu cầu + realtime đạt |
| **M1** MVP "YEP Live" | 09/11 – 11/12/2026 | Live Engine; 4 game (check-in, quiz, lắc đua theo đội, quay số minh bạch); builder *assisted*; theme YEP + Tết | Load test 5.000 |
| Pilot YEP 2026 | 12/12/2026 – 05/02/2027 | 12–15 sự kiện, ≥ 5.000 người chơi, ≥ 3 sự kiện agency tự dựng | NPS ≥ 40, ≥ 50% chấp nhận giá |
| **M2** Live Self-serve & Agency | 22/02 – 29/04/2027 | Builder tự phục vụ, +5 game live, client workspace, white-label, PayOS, biên bản | 20 khách / 5 agency trả phí |
| **M3** Booth & Activation | 04/05 – 30/07/2027 | Game booth, prize engine + simulator, đổi quà, kiosk, OTP ZNS | 10 activation trả phí |
| **M4** Scale & Platform | 08 – 12/2027 | 20k CCU, custom domain, Zalo, API, AI draft, reseller; mùa YEP 2027 | 1.000 sự kiện/mùa, 50 agency |

Chi tiết: [09-roadmap-plan.md](./09-roadmap-plan.md)

## 8. Đội ngũ và nguồn lực

- **M0–M1 (6 người):** Founder/PM, Tech Lead (realtime), 2 Fullstack, 1 Game dev (PixiJS), 1 Designer (UI + game art); operator và QA part-time khi pilot.
- **Từ M2 (8 người + hợp đồng):** thêm BD agency, CS/Operator; game dev/artist hợp đồng ở M3–M4.
- **Ngân sách M0 → hết pilot:** ~920 triệu đ.
- **Pre-seed:** ~6 tỷ đ (~230.000 USD) cho 18 tháng runway. Kịch bản cơ sở hoà vốn vận hành quanh Q4/2027.

## 9. Giả định rủi ro nhất

| Giả định | Kiểm chứng | Nếu sai thì |
|---|---|---|
| Khách trả cao hơn mức quay số nhờ game LED nhiều người | Pre-sale M0, chấp nhận giá trong pilot | Bundle với agency, tăng tỷ trọng dịch vụ |
| Agency tự dựng bằng builder | ≥ 3 sự kiện tự dựng (M1), ≥ 60% (M2) | Mô hình managed service + template |
| Realtime ổn định trên Wi-Fi/4G hội trường | Spike, load test, 0 sự cố P1 trong pilot | Giới hạn quy mô; đầu tư degrade |
| Mùa vụ được bù bằng hội nghị và activation | Doanh thu 03–08/2027 | Gói năm trả trước |

## 10. Đề xuất quyết định

1. **Duyệt định hình sản phẩm** theo [00-product-strategy.md](./00-product-strategy.md): wedge là game LED nhiều người; ICP là agency; không đối đầu minigame online.
2. **Duyệt scope M1** (4 game, builder assisted, không billing/OTP/đổi quà) và ngân sách ~920 triệu đ đến hết pilot.
3. **Mở pre-sale YEP 2026 ngay tuần 26/10** với 20 agency và HR; mục tiêu ≥ 3 cọc trước 06/11.
4. **Chốt tư vấn pháp lý** khuyến mại + PDPL (≤ 30 triệu đ).
5. **Khởi động M0:** scaffold monorepo và 5 spike ([10-dev-setup-conventions.md](./10-dev-setup-conventions.md)).
