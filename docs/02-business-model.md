# 02 — Mô hình kinh doanh

Cập nhật: 24/10/2026 · Nhất quán với [00-product-strategy.md](./00-product-strategy.md) v2.1 · Mọi con số tài chính là giả định `[GĐ]` cần kiểm chứng ở M0 và pilot M1.

---

## 1. Value proposition

| Khách hàng | Job-to-be-done | Playora mang lại |
|---|---|---|
| **Agency digital / activation / sự kiện** (ICP #1) | "Có vòng quay Tết có logo khách trong 3 tuần, 5.000 giải, không hết giải ngày đầu, có báo cáo gửi client mỗi tuần" | Dựng minigame có thưởng trong 30 phút từ template × skin theo mùa; prize engine kiểm soát tồn kho, ngân sách và tốc độ phát giải; white-label; báo cáo gửi client; giá bằng 1/5–1/10 thuê dev làm riêng |
| **Brand marketing tầm trung** (ICP #2) | "Chạy minigame theo mùa để thu first-party data hợp pháp, không vượt ngân sách giải, không bị nghi gian lận" | Minigame có thưởng chạy online (link/QR/Zalo), form lead có consent theo PDPL, voucher pool, link theo kênh, chống gian lận, log kiểm chứng, dashboard + export; tự dựng và tự trả tiền từ M2 |
| **HR / Internal comms** (ICP #3, dùng gói campaign thường) | "Minigame nội bộ dịp lì xì đầu năm, Family Day, tri ân; bốc thăm minh bạch, không cần IT" | Dùng chung builder và gói campaign; guest list nội bộ; **bốc thăm cuối chương trình** online có log kiểm chứng và trang công bố kết quả (M2) |

**Tagline:** *"Dựng minigame có thưởng trong 30 phút."*

---

## 2. Business Model Canvas

| Khối | Nội dung |
|---|---|
| **Customer segments** | ICP #1: Agency digital/activation/sự kiện (người mua + kênh phân phối). ICP #2: Brand marketing tầm trung (qua agency ở M1, tự phục vụ từ M2). #3: HR/Internal comms (dùng gói campaign thường). Không ưu tiên: shop nhỏ, SME bán lẻ rất nhỏ (gói Free) |
| **Value propositions** | Xem mục 1 |
| **Channels** | Sales trực tiếp tới agency; chương trình đối tác agency; product-led (gói Free có watermark lan truyền qua người chơi); SEO và template gallery theo mùa; đối tác activation/booth (M3) |
| **Customer relationships** | Self-serve và onboarding; Customer Success cho Agency/Enterprise; dựng hộ (concierge) trong pilot; cộng đồng agency |
| **Revenue streams** | **Campaign Pass** (theo campaign); **gói Agency năm**; Enterprise license; add-on (OTP/ZNS, skin riêng, AI credits); dịch vụ (game custom, kiểm thử tải) |
| **Key resources** | Play engine + thư viện minigame × skin theo mùa; prize & participation engine; anti-fraud; brand và case study |
| **Key activities** | Ra skin theo mùa đều đặn; phát triển cơ chế mới (ít, đáng giá ≥ 10 skin); đảm bảo đúng đắn prize engine; bán hàng cho agency; CS mùa cao điểm |
| **Key partners** | Agency; cổng thanh toán (PayOS/VNPay/MoMo, VietQR); Zalo (ZNS, Mini App); đối tác e-gift (UrBox/ViHat, M4); cloud/CDN; công ty luật (khuyến mại, PDPL) |
| **Cost structure** | Nhân sự (~70%); cloud và CDN; SMS/ZNS (pass-through); art/skin theo mùa; marketing và sales; pháp lý và kế toán |

---

## 3. Bảng giá đề xuất `[GĐ]`

### 3.1 Nguyên tắc

- **Hai cách mua song song:** *Campaign Pass* (mua theo từng campaign, cho brand chạy vài campaign/năm) và *gói Agency năm* (cho agency chạy nhiều campaign cho nhiều client).
- **Đơn vị đo:** **người chơi duy nhất (unique player)** trên mỗi campaign, cộng thời lượng campaign. Dễ hiểu, gắn với giá trị thật và với chi phí hạ tầng.
- **Không tính phí theo lượt chơi**, để khách không ngại cho người chơi chơi nhiều lượt (khác WOAY bán quota lượt/tháng).
- Định giá bằng VND, xuất hoá đơn VAT, thanh toán bằng VietQR hoặc chuyển khoản. M1 kích hoạt gói thủ công; self-serve qua PayOS từ M2.

### 3.2 Gói

> **Điều chỉnh sau nghiên cứu ([11 §8](./11-game-builder-research.md#8-mô-hình-giá-hệ-quả-cho-playora)) và chiến lược v2.1:**
> - Doanh thu lõi đến từ **minigame campaign có thưởng**: ngân sách lặp lại theo mùa (Tết, 8/3, 30/4, Trung thu, sinh nhật brand, khai trương).
> - Mỏ neo trong nước: WOAY Pro 50.000đ/ngày (500 lượt/tháng), Pro-Adv 300.000đ/ngày (5.000 lượt/tháng) ([01](./01-market-research.md)). Playora bán **theo campaign, không giới hạn lượt**, kèm prize engine và skin theo mùa.
> - Quay số và check-in tại VN đã bị hàng hoá hoá (Luck4You 690k–3,99tr, EDC 1–4tr, Outing 250k mỗi sự kiện), nên Playora **không bán quay số riêng lẻ** và **không làm game LED/sân khấu** (bỏ Live add-on ở v2.1). Bốc thăm cuối chương trình (online, M2) là tính năng nằm trong gói campaign; bản nhỏ cho Free để kéo khách.
> - Mỏ neo quốc tế: Drimify/Easypromos theo campaign hoặc theo năm (USD/EUR); Kahoot event pass $199–799.

| Gói | Giá | Giới hạn chính | Đối tượng |
|---|---|---|---|
| **Free** | 0đ | ≤ 200 người chơi/campaign `[GĐ]`, ≤ 7 ngày `[GĐ]`; 1 minigame, skin chung; prize engine cơ bản (tỷ lệ, tồn kho); bốc thăm cuối chương trình ≤ 100 người (log minh bạch, từ M2); watermark "Powered by Playora" | Dùng thử, shop nhỏ; **kênh kéo khách** |
| **Campaign S** | 1.990.000đ / campaign `[GĐ]` | ≤ 2.000 người chơi `[GĐ]`, ≤ 30 ngày `[GĐ]`; 1 minigame; bỏ watermark; prize engine v1 (giới hạn, ngân sách, rải đều, khung giờ); voucher pool; link theo kênh; dashboard + export | Brand chạy campaign nhỏ, chuỗi F&B địa phương |
| **Campaign M** | 4.990.000đ / campaign `[GĐ]` | ≤ 10.000 người chơi `[GĐ]`, ≤ 60 ngày `[GĐ]`; ≤ 3 minigame; theme pack theo mùa; Prize Simulator, báo cáo PDF + biên bản (từ M2) | Campaign Tết, 8/3, ra mắt sản phẩm |
| **Campaign L** | Từ 9.900.000đ / campaign `[GĐ]` | ≤ 50.000+ người chơi `[GĐ]`; chống gian lận mức Cao, OTP (credit riêng); kiểm thử tải; hỗ trợ ưu tiên | Campaign toàn quốc, chuỗi bán lẻ lớn |
| **Agency Starter** | 29.900.000đ / năm `[GĐ]` | 3 seat; ≤ 8 campaign/năm `[GĐ]` (mỗi campaign tới mức M); **white-label cơ bản**; client workspace; báo cáo gửi client | Agency nhỏ, 5–15 nhân sự |
| **Agency Pro** | 59.900.000đ / năm `[GĐ]` | 10 seat; **không giới hạn số campaign**, 200.000 người chơi/năm gộp `[GĐ]`; white-label (logo, domain, email, báo cáo); template riêng của org (M4); CS riêng | Agency digital/activation 15–50 nhân sự |
| **Enterprise** | Từ 150 triệu đ/năm | SSO, SLA 99,9%, DPA, logic webhook, API, dedicated instance, template riêng | Ngân hàng, tập đoàn, FMCG lớn |
| **Reseller / OEM** (M4) | Chiết khấu 30–50% | Bán lại dưới thương hiệu riêng (theo mô hình đại lý của 凡科) | Agency lớn, đối tác activation |

### 3.3 Add-on và dịch vụ

| Hạng mục | Giá | Ghi chú |
|---|---|---|
| OTP SMS / Zalo ZNS (từ M2) | Giá vốn + 20–30% | Pass-through, trả trước bằng credit |
| Skin riêng theo brand (đội art Playora) | 5–15 triệu đ / skin `[GĐ]` | Skin mới có thể được đưa vào thư viện (có thoả thuận độc quyền theo thời gian) |
| AI asset credits (M4) | 200.000đ / 100 credit | Sinh nền, vật phẩm, copy theo brand kit |
| Game custom (cơ chế mới trên engine) | 20–150 triệu đ | Cơ chế mới làm xong được đưa vào thư viện (có thoả thuận độc quyền theo thời gian) |
| Kiểm thử tải trước campaign/sự kiện | 3–10 triệu đ | Bắt buộc với Campaign L có đỉnh lưu lượng lớn |

---

## 4. Go-to-market

### 4.1 Giai đoạn

| Giai đoạn | Thời gian | Chiến thuật | Mục tiêu |
|---|---|---|---|
| **GTM-1: Tết Campaign qua agency** (M1) | 11/2026 – 02/2027 | Pre-sale campaign Tết cho agency và brand từ M0; giá pilot −50% đổi lấy case study; đội Playora dựng hộ bằng Studio, ≥ 3 agency tự dựng; minigame nội bộ (lì xì đầu năm) cho HR bằng gói campaign | ≥ 10 campaign trả phí, ≥ 50.000 lượt chơi hợp lệ, 5 case study |
| **GTM-2: Self-serve & Agency** (M2) | 02 – 04/2027 | Chương trình đối tác agency; mùa 8/3 và 30/4 (campaign ngắn, nhiều); self-serve Campaign Pass qua PayOS; gallery công khai theo mùa | ≥ 30 khách trả phí, ≥ 8 agency trả phí |
| **GTM-3: Booth & Activation qua agency** (M3) | 05 – 07/2027 | Bán booth/activation (kiosk, mã nắp chai) cho brand qua agency đối tác; upsell agency từ online sang tại chỗ | ≥ 10 activation trả phí, ARPA agency +30% |
| **GTM-4: Scale + Tết 2028** (M4) | 08 – 12/2027 | Mở bán campaign Tết 2028 từ tháng 9 (gói năm trả trước); SEO gallery; reseller/OEM | 1.000 campaign/sự kiện mùa Tết 2028; 50 agency |
| **GTM-5: SEA** | 2028 | Indonesia/Philippines qua agency đối tác | 3 thị trường |

### 4.2 Chương trình đối tác agency

| Hạng | Điều kiện | Quyền lợi |
|---|---|---|
| Registered | Đăng ký và hoàn thành training | Giảm 15% Campaign Pass, badge đối tác |
| Silver | ≥ 8 campaign/năm hoặc gói Agency Starter `[GĐ]` | Giảm 25%, white-label, CS riêng |
| Gold | ≥ 30 campaign/năm hoặc gói Agency Pro `[GĐ]` | Giảm 35%, ưu tiên roadmap và skin theo mùa, co-marketing, lead chia sẻ |

### 4.3 Kênh tăng trưởng

1. **Lịch skin theo mùa:** mỗi dịp (Tết, 8/3, 30/4, Trung thu, 20/10, Black Friday, Noel) ra theme pack trước 4–6 tuần, kèm email/Zalo tới agency. Đây là nhịp bán hàng chính.
2. **Watermark virality:** mỗi campaign Free cho hàng trăm người thấy "Powered by Playora · Tạo minigame của bạn". Đo K-factor theo UTM.
3. **SEO:** "vòng quay may mắn có quản lý giải", "minigame Tết", "game cào thẻ online", "phần mềm quay số trúng thưởng"… Mỗi tổ hợp cơ chế × skin là một landing page có demo chơi thử.
4. **Nội dung case study:** số liệu campaign (lượt chơi, lead, giải phát đúng kế hoạch, 0 sai lệch) và video 30 giây gameplay theo từng skin mùa.
5. **Đối tác activation/booth (M3):** agency activation, đơn vị dựng booth triển lãm. Đưa kiosk Playora vào gói dịch vụ của họ, chia hoa hồng.

---

## 5. Unit economics `[GĐ]`

### 5.1 Chi phí biến đổi cho mỗi người chơi

| Thành phần | Ước tính | Ghi chú |
|---|---|---|
| CDN asset (game bundle + asset ~3 MB) | ~3–5đ | Cache tốt; R2 không tính egress |
| API + DB (lượt chơi, prize engine, anti-fraud) | ~5–15đ | Phân bổ theo giờ cao điểm; một người chơi campaign có thể chơi nhiều lượt |
| OTP (nếu bật, từ M2) | ~250–800đ | Pass-through, khách trả |
| **Tổng (không tính OTP)** | **< 30đ/người chơi** | Gross margin phần mềm > 85% |

### 5.2 LTV / CAC

| Phân khúc | ARPA/năm | Gross margin | Retention năm | LTV (3 năm) | CAC mục tiêu | LTV/CAC |
|---|---|---|---|---|---|---|
| Agency (gói năm) | 60 triệu đ | 85% | 70% | ~110 triệu đ | ≤ 15 triệu đ | ≥ 7 |
| Brand (Campaign Pass, 2–3 campaign/năm) | 12 triệu đ `[GĐ]` | 85% | 55% `[GĐ]` | ~19 triệu đ | ≤ 3 triệu đ | ≥ 6 |

---

## 6. Dự phóng tài chính 2027 `[GĐ]`

Tỷ giá tham chiếu khoảng 26.000 VND/USD.

### 6.1 Doanh thu (tỷ đồng)

| Nguồn | Thận trọng | Cơ sở | Lạc quan |
|---|---|---|---|
| Campaign Pass (gồm HR nội bộ) | 0,75 (250 campaign × 3tr) | 2,25 (550 × 4,1tr) | 4,3 (950 × 4,5tr) |
| Agency (gói năm, trung bình Starter/Pro) | 0,6 (15 agency × 40tr) | 1,75 (35 × 50tr) | 3,0 (60 × 50tr) |
| Enterprise | 0,15 | 0,45 | 0,9 |
| Dịch vụ (skin riêng, custom, kiểm thử tải) | 0,4 | 0,9 | 1,7 |
| **Tổng** | **~1,9** | **~5,4** | **~9,9** |

> v2.1: bỏ dòng Live add-on (trước đây 0,4 / 1,2 / 2,0); một phần nhu cầu HR/YEP chuyển sang Campaign Pass (minigame nội bộ), dịch vụ bỏ operator tại chỗ. Toàn bộ là `[GĐ]`.

### 6.2 Chi phí năm 2027 (kịch bản cơ sở)

| Hạng mục | Tỷ đồng/năm |
|---|---|
| Nhân sự (8 người, TB ~32tr/tháng gồm bảo hiểm) | 3,1 |
| Cloud, CDN, SaaS tools | 0,36 |
| Marketing và sales (ads, event, content) | 0,8 |
| Pháp lý, kế toán, văn phòng | 0,25 |
| Dự phòng 10% | 0,45 |
| **Tổng** | **~5,0** |

- **Hoà vốn `[GĐ]`:** kịch bản cơ sở (doanh thu ~5,4 so với chi phí ~5,0) hoà vốn vận hành quanh Q4/2027 nhờ mở bán campaign Tết 2028 và gói Agency năm trả trước; kịch bản thận trọng chưa hoà vốn trong 2027.
- **Nhu cầu vốn:** pre-seed **~6 tỷ đ (~230.000 USD)** cho 18 tháng runway (đến hết mùa Tết 2028 cộng thêm đệm).
- **Dòng tiền theo mùa:** campaign trải theo các dịp trong năm (8/3, 30/4, hè, Trung thu, Black Friday), nhưng khoảng 35–45% `[GĐ]` doanh thu năm vẫn rơi vào tháng 11 đến tháng 1 (mùa Tết). Cần thu trả trước (gói Agency năm, cọc) và giữ quỹ dự phòng.

---

## 7. KPI

| Loại | KPI | Mục tiêu 2027 |
|---|---|---|
| **North Star** | **Lượt chơi hợp lệ trên campaign/sự kiện trả phí / tháng** | 2.000.000 vào tháng 12/2027 |
| Builder | % campaign khách **tự dựng** không cần Playora hỗ trợ | ≥ 60% (M2) → ≥ 80% (M4) |
| Time-to-value | Thời gian trung vị từ tạo đến publish campaign | ≤ 30 phút |
| Prize | Sai lệch tồn kho / vượt ngân sách / vượt giới hạn người chơi | 0 |
| Prize | % campaign hết giải trước 80% thời lượng (khi bật rải đều) | ≤ 5% |
| Activation | % workspace mới publish campaign đầu tiên trong 24h | ≥ 40% |
| Chất lượng | Uptime trong khung giờ campaign; p95 Play API (quyết định kết quả + trừ kho) | 99,95%; < 200 ms |
| Revenue | MRR (trung bình 12 tháng), ARPA agency | ~450 triệu đ `[GĐ]`; ≥ 5 triệu đ/tháng |
| Retention | Agency logo retention 12 tháng | ≥ 70% |
| Satisfaction | NPS người tổ chức | ≥ 50 |
| Upsell | % khách Campaign Pass chuyển lên gói Agency năm hoặc Campaign L | ≥ 15% `[GĐ]` |
| Virality | % signup đến từ watermark | ≥ 20% |

---

## 8. Rủi ro kinh doanh và cách giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| **WOAY cạnh tranh trực tiếp** (đã có ~11 game, OTP, Zalo login, Open API) | Cao | Không đua số lượng game; thắng bằng độ rộng skin theo mùa, prize engine kiểm soát chi phí (rải đều, ngân sách, Simulator), lớp agency/white-label, giá theo campaign không giới hạn lượt, và một engine cho online + booth |
| Prize engine sai lệch (vượt kho/ngân sách) làm mất uy tín | Cao (rủi ro uy tín) | Server quyết định mọi kết quả; test 1 triệu lượt mô phỏng + load test trước Tết; log kiểm chứng; giới hạn tốc độ phát giải |
| Mùa vụ dồn vào Tết làm dòng tiền không đều | Cao | Gói Agency năm trả trước; lịch skin theo mùa cả năm (8/3, 30/4, Trung thu…); booth/activation mùa hè (M3) |
| Gian lận/bot làm hết giải sớm | TB | Chống gian lận mức Chuẩn ở M1 (Turnstile, rate limit, thiết bị); OTP ZNS/SMS từ M2; giới hạn giải/người |
| Agency lớn tự build | Trung bình | White-label và giá Agency rẻ hơn chi phí 1 dev; liên tục ra skin và cơ chế mới |
| Mất phần doanh thu YEP/sân khấu sau khi bỏ Live (v2.1) | TB | Chấp nhận; HR dùng gói campaign cho minigame nội bộ; bốc thăm cuối chương trình online (M2); không quay lại game LED trước 2028 |
| Pháp lý khuyến mại và dữ liệu (campaign có thưởng ngay từ M1) | Cao | Tư vấn luật từ M0; mẫu thể lệ khuyến mại và biên bản; consent và audit; điều khoản phân định trách nhiệm (khách là "thương nhân thực hiện khuyến mại") |
| Thị trường nhỏ | Trung bình | Kiến trúc i18n từ đầu; SEA năm 2028 |
