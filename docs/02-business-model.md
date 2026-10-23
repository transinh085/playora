# 02 — Mô hình kinh doanh

Cập nhật: 23/10/2026 · Mọi con số tài chính là giả định `[GĐ]` cần kiểm chứng ở M0 và pilot M1.

---

## 1. Value proposition

| Khách hàng | Job-to-be-done | Playora mang lại |
|---|---|---|
| **Agency sự kiện** | "Có game có thương hiệu cho sự kiện tuần sau, chạy ổn với 1.000 khách, có báo cáo gửi brand" | Dựng game trong 30 phút từ template; chịu tải 5.000+ người chơi đồng thời; white-label; báo cáo lead và lượt chơi export ngay; giá bằng 1/5–1/10 làm custom |
| **HR / Internal comms** | "YEP vui, quay số minh bạch, không cần IT" | Live Pass: check-in, quiz về công ty, lắc điện thoại, kéo co theo phòng ban, quay số trên LED có log minh bạch |
| **Brand marketing** | "Thu first-party data hợp pháp và đo được hiệu quả activation" | Form lead có consent theo PDPL, quản lý giải và voucher, chống gian lận, dashboard ROI, webhook về CRM |

**Tagline đề xuất:** *"Game sự kiện có thương hiệu: dựng trong 30 phút, chạy cho hàng nghìn người."*

---

## 2. Business Model Canvas

| Khối | Nội dung |
|---|---|
| **Customer segments** | ICP #1: Agency sự kiện/activation (người mua + kênh). ICP #2: HR doanh nghiệp. #3: Brand marketing (qua agency). Không ưu tiên: shop online/SME bán lẻ |
| **Value propositions** | Xem mục 1 |
| **Channels** | Sales trực tiếp tới agency; product-led (free tier có watermark lan truyền qua người chơi); chương trình đối tác agency; SEO và template gallery; đối tác AV/LED, khách sạn, trung tâm hội nghị |
| **Customer relationships** | Self-serve và onboarding; Customer Success cho Agency/Enterprise; operator hỗ trợ tại sự kiện (add-on); cộng đồng người dùng |
| **Revenue streams** | Live Pass (theo sự kiện); subscription Agency/Campaign Pro; Enterprise license; add-on (OTP/ZNS, custom domain, AI credits); dịch vụ (game custom, vận hành tại chỗ) |
| **Key resources** | Game engine và thư viện template; realtime infra; prize engine; brand và case study |
| **Key activities** | Phát triển template; vận hành hạ tầng mùa cao điểm; bán hàng cho agency; CS tại sự kiện |
| **Key partners** | Agency sự kiện; nhà cung cấp LED/AV; cổng thanh toán (PayOS/VNPay/MoMo, VietQR); Zalo (ZNS, Mini App); cloud/CDN; công ty luật (khuyến mại, PDPL) |
| **Cost structure** | Nhân sự (~70%); cloud và CDN; SMS/ZNS (pass-through); marketing và sales; pháp lý và kế toán |

---

## 3. Bảng giá đề xuất `[GĐ]`

### 3.1 Nguyên tắc

- **Hai cách mua song song:** *Live Pass* cho người dùng theo mùa (HR, brand chạy 1–2 sự kiện/năm) và *Subscription* cho người dùng thường xuyên (agency).
- **Đơn vị đo:** **người chơi duy nhất (unique player)** cho mỗi sự kiện. Dễ hiểu, gắn với giá trị thật, và gắn với chi phí hạ tầng.
- **Không tính phí theo lượt chơi**, để khách không ngại cho người chơi chơi nhiều lần.
- Định giá bằng VND, xuất hoá đơn VAT, thanh toán bằng VietQR hoặc chuyển khoản.

### 3.2 Gói

> **Điều chỉnh sau nghiên cứu ([11 §8](./11-game-builder-research.md#8-mô-hình-giá-hệ-quả-cho-playora)):**
> - Quay số và check-in tại VN đã bị hàng hoá hoá (Luck4You 690k–3,99tr, EDC 1–4tr, Outing 250k mỗi sự kiện), nên Playora **cho free** lucky draw và check-in ở quy mô nhỏ để kéo khách.
> - Doanh thu đến từ **game nhiều người trên LED + builder + prize engine + white-label**, là những thứ chưa ai có.
> - Mỏ neo quốc tế: Kahoot event pass $199–799; Crowdpurr $50–1.000/tháng.

| Gói | Giá | Giới hạn chính | Đối tượng |
|---|---|---|---|
| **Free** | 0đ | ≤ 100 người/sự kiện; check-in wall, lucky draw (log minh bạch), quiz live và 1 game live; watermark "Powered by Playora" | Dùng thử, nhóm nhỏ, trường học; **kênh kéo khách** |
| **Live Pass S** | 990.000đ / sự kiện | ≤ 300 người; mọi game live; bỏ watermark; run-of-show; export | YEP công ty vừa |
| **Live Pass M** | 2.490.000đ / sự kiện | ≤ 1.000 người; theme pack mùa; báo cáo PDF; biên bản quay thưởng | YEP lớn, hội nghị |
| **Live Pass L** | 4.990.000đ / sự kiện | ≤ 3.000 người; custom domain; hỗ trợ ưu tiên; operator từ xa | Activation, roadshow, đại hội |
| **Live Pass XL** | Từ 9.900.000đ | ≤ 10.000+; kiểm thử tải trước; operator trực tại chỗ | Concert, sự kiện lớn |
| **Campaign Pro** | 1.490.000đ/tháng (trả năm −20%) | Game async (H5, booth, kiosk); 10.000 người chơi/tháng; prize engine đầy đủ; voucher; link theo kênh; 2 seat | Brand, chuỗi bán lẻ, F&B |
| **Agency** | 4.990.000đ/tháng (trả năm −20%) | 5 seat; **white-label** (logo, domain, email, báo cáo); client workspace; 30.000 người chơi/tháng gộp; **Live Pass giảm 40%**; lưu template riêng | Agency sự kiện và activation |
| **Enterprise** | Từ 150 triệu đ/năm | SSO, SLA 99,9%, DPA, logic webhook, API, dedicated instance, template riêng | Ngân hàng, tập đoàn, FMCG lớn |
| **Reseller / OEM** (M4) | Chiết khấu 30–50% | Bán lại dưới thương hiệu riêng (theo mô hình đại lý của 凡科) | Agency lớn, đối tác AV |

### 3.3 Add-on và dịch vụ

| Hạng mục | Giá | Ghi chú |
|---|---|---|
| OTP SMS / Zalo ZNS | Giá vốn + 20–30% | Pass-through, trả trước bằng credit |
| AI asset credits | 200.000đ / 100 credit | Sinh nền, nhân vật, câu hỏi quiz theo brand kit |
| Operator tại sự kiện | 2–5 triệu đ / buổi | Nhân sự Playora trực điều khiển màn hình lớn |
| Game custom (skin hoặc cơ chế mới trên engine) | 20–150 triệu đ | Cơ chế mới làm xong được đưa vào thư viện (có thoả thuận độc quyền theo thời gian) |
| Kiểm thử tải trước sự kiện | 3–10 triệu đ | Bắt buộc với XL |

---

## 4. Go-to-market

### 4.1 Giai đoạn

| Giai đoạn | Thời gian | Chiến thuật | Mục tiêu |
|---|---|---|---|
| **GTM-1: Concierge YEP** (M1) | 11/2026 – 02/2027 | Bán trực tiếp cho 12–15 sự kiện YEP, giá pilot −50% đổi lấy case study; ≥ 3 agency đối tác tự dựng | 12–15 sự kiện, ≥ 5.000 người chơi, 5 case study video |
| **GTM-2: Agency-led live** (M2) | 03 – 04/2027 | Chương trình đối tác agency; mùa hội nghị/ra mắt; self-serve Live Pass; gallery công khai | 5 agency trả phí, 20 khách trả phí |
| **GTM-3: Activation qua agency** (M3) | 05 – 08/2027 | Bán booth/activation cho brand thông qua agency đối tác; gói Campaign Pro | 10 activation; 20 agency |
| **GTM-4: Product-led + YEP 2027** (M4) | 09/2027 – 02/2028 | Free tier có watermark; SEO gallery; mở bán YEP 2027 từ tháng 9; reseller | 1.000 sự kiện/mùa; 50 agency |
| **GTM-5: SEA** | 2028 | Indonesia/Philippines qua agency đối tác | 3 thị trường |

### 4.2 Chương trình đối tác agency

| Hạng | Điều kiện | Quyền lợi |
|---|---|---|
| Registered | Đăng ký và hoàn thành training | Giảm 15% Live Pass, badge đối tác |
| Silver | ≥ 10 sự kiện/năm | Giảm 25%, white-label, CS riêng |
| Gold | ≥ 40 sự kiện/năm hoặc gói Agency năm | Giảm 35%, ưu tiên roadmap, co-marketing, lead chia sẻ |

### 4.3 Kênh tăng trưởng

1. **Watermark virality:** mỗi sự kiện Free/S cho vài trăm người thấy "Powered by Playora · Tạo game của bạn". Đo K-factor theo UTM.
2. **SEO:** "phần mềm quay số trúng thưởng", "game YEP", "ý tưởng minigame sự kiện", "vòng quay may mắn có quản lý giải"… Mỗi template là một landing page có demo chơi thử.
3. **Đối tác hạ tầng sự kiện:** công ty cho thuê LED/âm thanh, khách sạn, trung tâm hội nghị. Đưa Playora vào gói dịch vụ của họ, chia hoa hồng.
4. **Nội dung case study:** video 30 giây cảnh màn hình LED và hàng trăm người lắc điện thoại. Đây là tài sản marketing mạnh nhất.

---

## 5. Unit economics `[GĐ]`

### 5.1 Chi phí biến đổi cho mỗi người chơi

| Thành phần | Ước tính | Ghi chú |
|---|---|---|
| CDN asset (game bundle + asset ~3 MB) | ~3–5đ | Cache tốt; R2 không tính egress |
| Realtime (WS) + API + DB | ~5–15đ | Phân bổ theo giờ cao điểm |
| OTP (nếu bật) | ~250–800đ | Pass-through, khách trả |
| **Tổng (không tính OTP)** | **< 30đ/người chơi** | Gross margin phần mềm > 85% |

### 5.2 LTV / CAC

| Phân khúc | ARPA/năm | Gross margin | Retention năm | LTV (3 năm) | CAC mục tiêu | LTV/CAC |
|---|---|---|---|---|---|---|
| Agency | 60 triệu đ | 85% | 70% | ~110 triệu đ | ≤ 15 triệu đ | ≥ 7 |
| Campaign Pro | 18 triệu đ | 88% | 60% | ~31 triệu đ | ≤ 4 triệu đ | ≥ 7 |
| Live Pass (lẻ) | 2,5 triệu đ | 88% | 40% mua lại | ~3,5 triệu đ | ≤ 0,8 triệu đ | ≥ 4 |

---

## 6. Dự phóng tài chính 2027 `[GĐ]`

Tỷ giá tham chiếu khoảng 26.000 VND/USD.

### 6.1 Doanh thu (tỷ đồng)

| Nguồn | Thận trọng | Cơ sở | Lạc quan |
|---|---|---|---|
| Live Pass | 0,8 (350 pass × 2,3tr) | 2,5 (1.000 × 2,5tr) | 5,0 (1.800 × 2,8tr) |
| Campaign Pro | 0,24 | 0,71 | 1,4 |
| Agency | 0,6 | 1,5 | 3,0 |
| Enterprise | 0,15 | 0,45 | 0,9 |
| Dịch vụ (custom, operator) | 0,5 | 1,2 | 2,0 |
| **Tổng** | **~2,3** | **~6,4** | **~12,3** |

### 6.2 Chi phí năm 2027 (kịch bản cơ sở)

| Hạng mục | Tỷ đồng/năm |
|---|---|
| Nhân sự (8 người, TB ~32tr/tháng gồm bảo hiểm) | 3,1 |
| Cloud, CDN, SaaS tools | 0,36 |
| Marketing và sales (ads, event, content) | 0,8 |
| Pháp lý, kế toán, văn phòng | 0,25 |
| Dự phòng 10% | 0,45 |
| **Tổng** | **~5,0** |

- **Hoà vốn:** kịch bản cơ sở hoà vốn vận hành quanh Q4/2027 nhờ mùa YEP 2027.
- **Nhu cầu vốn:** pre-seed **~6 tỷ đ (~230.000 USD)** cho 18 tháng runway (đến hết mùa YEP 2027 cộng thêm đệm).
- **Dòng tiền theo mùa:** khoảng 40–50% doanh thu năm rơi vào tháng 11 đến tháng 1. Cần thu trả trước (gói năm, cọc) và giữ quỹ dự phòng.

---

## 7. KPI

| Loại | KPI | Mục tiêu 2027 |
|---|---|---|
| **North Star** | Người chơi duy nhất/tháng trên sự kiện trả phí (Paid MAP) | 150.000 vào tháng 12/2027 |
| Activation | % workspace mới publish game đầu tiên trong 24h | ≥ 40% |
| Time-to-value | Thời gian trung vị từ tạo đến publish game | ≤ 30 phút |
| Chất lượng live | Uptime trong khung giờ sự kiện; p95 độ trễ realtime | 99,95%; < 150 ms |
| Revenue | MRR (trung bình 12 tháng), ARPA agency | 550 triệu đ; 5 triệu đ/tháng |
| Retention | Agency logo retention 12 tháng | ≥ 70% |
| Satisfaction | NPS người tổ chức | ≥ 50 |
| Virality | % signup đến từ watermark | ≥ 20% |

---

## 8. Rủi ro kinh doanh và cách giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Mùa vụ làm dòng tiền không đều | Cao | Gói năm trả trước; đẩy use case quanh năm (hội nghị, campaign async, retail) |
| Agency lớn tự build | Trung bình | White-label và giá Agency rẻ hơn chi phí 1 dev; liên tục ra template mới |
| WOAY/AhaSlides lấn sang live | Trung bình | Tập trung chất lượng live (tải, độ trễ, màn hình LED) và quan hệ agency |
| Sự cố live trên sân khấu | Cao (rủi ro uy tín) | Load test, chế độ degrade, operator hỗ trợ, runbook, SLA rõ |
| Pháp lý khuyến mại và dữ liệu | Trung bình | Tư vấn luật từ đầu; tính năng consent và audit; điều khoản phân định trách nhiệm (khách là "thương nhân thực hiện khuyến mại") |
| Thị trường nhỏ | Trung bình | Kiến trúc i18n từ đầu; SEA năm 2028 |
