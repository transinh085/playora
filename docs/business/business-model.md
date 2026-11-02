# Mô hình kinh doanh

Cập nhật: 31/10/2026 · Owner: PO (founder) · Theo [strategy](../product/strategy.md) v4.1 · Mọi con số tài chính là giả định `[GĐ]`, kiểm chứng ở M0 và pilot Tết.

Bản cho agency và brand (Campaign Pass, gói Agency năm, đội 8 người) ở lịch sử git của file này và [archive](../archive/2026-10-24-proposal-v2.1.md).

---

## 1. Giá trị cho khách hàng

| Khách hàng | Việc cần làm | Playora mang lại |
|---|---|---|
| **Chủ quán F&B** (ICP #1) | "Tết này đông khách hơn quán bên cạnh; khách mới quay lại; không phát quà quá tay" | Playbook theo mục tiêu → game mang sản phẩm của quán trong vài phút; quà trong ngân sách; đổi quà tại quầy; báo cáo khách tới quầy, khách quay lại, chi phí quà |
| **Nhân viên quầy** (người dùng, không mua) | "Đổi quà nhanh, không bị lừa bằng ảnh chụp màn hình" | Quầy đổi quà trên điện thoại, quét QR hoặc gõ mã; ghép máy bằng QR, không cần email ([D-24](../product/decisions.md)); tìm mã theo SĐT khi khách mất mã ([D-25](../product/decisions.md)) |
| **Khách của quán** (người chơi) | "Chơi vui, trúng thật, nhận được quà" | Không cài app; kết quả rõ ràng; mã đổi quà luôn có trong "Quà của tôi" (khôi phục được khi đổi trình duyệt) |
| **Quản lý cửa hàng trong chuỗi** (người dùng gói Chuỗi, M2) | "Biết quán mình đang ra sao, quản lý máy quầy và nhân viên của quán mình" | Số liệu và tồn kho lọc theo quán, máy quầy theo quán (ORG-12, PRZ-14) |
| **Agency, freelancer** (kênh, M4) | "Làm chương trình cho nhiều quán, không làm lại từ đầu" | Nhân bản, workspace theo quán, white-label |

Persona tương lai (PM agency làm cho nhãn hàng — M4; brand manager nhãn hàng không có quầy — sau Gate M3) chỉ để giữ thiết kế không đóng cửa, không đổi ICP ([D-27](../product/decisions.md), [prd §2.2](../product/prd.md#22-persona-tương-lai-m3m4-chưa-xây-tính-năng-riêng)).

---

## 2. Business Model Canvas

| Khối | Nội dung |
|---|---|
| **Khách hàng** | #1 quán đồ uống và ăn nhẹ 1–30 điểm bán; #2 SME có điểm bán khác (spa, gym, nha khoa, bán lẻ) và shop có fanpage; #3 agency/freelancer làm kênh (M4) |
| **Giá trị** | Mục 1 |
| **Kênh** | Dựng hộ miễn phí trong pilot; watermark "Tạo bằng Playora" (dẫn về `playora.vn`) trên mọi game Free; SEO chợ mẫu (mỗi mẫu × dịp là một trang chơi thử); nhóm Facebook chủ quán F&B; đối tác POS (M4); agency (M4) |
| **Quan hệ** | Tự phục vụ; hỗ trợ qua Zalo; dựng hộ cho quán đầu tiên của mỗi chuỗi |
| **Doanh thu** | Thuê bao gói sàn + phí nạp credit theo lượt đổi quà thật (Pay-per-verified-visit, D-34); add-on (skin riêng); về sau reseller/OEM |
| **Tài nguyên chính** | Hồ sơ khách quen & Benchmark ngành tại quầy (Moat, D-30); Quầy đổi quà Zero-delay & POS visual bridge (D-32, D-39); Builder + kho mẫu × skin; prize engine |
| **Hoạt động chính** | Ra skin và playbook theo dịp; giữ prize engine đúng; vận hành Marketing Autopilot (D-37); case study có số liệu |
| **Đối tác** | Cổng thanh toán (PayOS/VietQR); Zalo (ZNS qua OA riêng hoặc Shared OA "Playora Pass" cho hộ cá thể, D-40); POS (cầu nối phím tắt D-39, tích hợp M4); họa sĩ/nhà cung cấp art; tư vấn pháp lý |
| **Chi phí** | Founder; cloud (nhỏ, xem §5); art theo dịp; ZNS/SMS (thu lại từ khách); pháp lý, kế toán |

---

## 3. Giá `[GĐ]`

### 3.1 Nguyên tắc (Mô hình giá Hybrid)

- **Mô hình Hybrid (Sàn thấp + Pay-per-verified-visit, [D-34](../product/decisions.md)):** Giảm rào cản chi phí cố định định kỳ cho chủ quán F&B. Quán đóng gói sàn nhẹ mỗi tháng (kèm một số lượt đổi cơ bản), và chỉ nạp thêm credit theo lượt khách thực tế tới quầy đổi quà thành công (300đ–500đ/lượt đổi quà thật).
- **Đơn vị giới hạn là lượt đổi quà tại quầy/tháng**, không phải lượt chơi: khách chơi bao nhiêu cũng được, quán chỉ chi trả khi có khách bằng xương bằng thịt ghé quầy ([D-20](../product/decisions.md)). Khác WOAY bán quota lượt/ngày.
- **Thấu chi an toàn giờ cao điểm ([D-38](../product/decisions.md)):** Khi ví credit về 0đ trong lúc quán đông khách, hệ thống tự động cho phép thấu chi 50–100 lượt đổi quà tiếp theo (tương đương 25k–50k) và gửi nhắc nhở VietQR thân thiện, không bao giờ làm đứt đoạn cảm xúc của khách đang ngồi tại quán.
- **Hết hạn mức không làm khách mất quà** ([D-23](../product/decisions.md)): khi vượt trần thấu chi, chương trình ngừng phát giải mới, còn quầy **luôn đổi được** mã đã phát.
- Gói Free soạn đầy đủ, để chủ quán thấy giá trị trước khi trả tiền; giới hạn ở số chương trình chạy, 100 lượt đổi quà và watermark.

### 3.2 Gói `[GĐ]`

| Gói | Giá sàn `[GĐ]` | Lượt đổi đi kèm | Phí lượt đổi phát sinh (Pay-as-you-grow) | Cho ai |
|---|---|---|---|---|
| **Free** | 0đ | ≤ 100 lượt/tháng (trần 110) | Không nạp thêm (cần nâng gói) | Thử nghiệm, quán rất nhỏ; **kênh kéo khách** |
| **Quán (Hybrid)** | 149.000đ – 199.000đ/tháng · 1.490.000đ/năm | 200 lượt đổi/tháng | **300đ – 500đ / lượt đổi thành công** (nạp qua VietQR, có thấu chi 50 lượt) | Một quán (cà phê, trà sữa 1 điểm bán) |
| **Chuỗi (Hybrid)** | 499.000đ – 599.000đ/tháng · 4.990.000đ/năm | 1.000 lượt đổi/tháng | **200đ – 300đ / lượt đổi thành công** (thấu chi 100 lượt/quán) | Chuỗi 2–30 điểm bán |
| **Agency / Reseller** | Chiết khấu 30–50% (M4) | Theo hợp đồng | Giá sỉ theo credit | Agency, freelancer |

Mỏ neo: WOAY Pro 50.000đ/ngày (500 lượt/tháng), Pro-Adv 300.000đ/ngày ([market-research](../research/market-research.md)). Giá Playora cần kiểm bằng Van Westendorp trong phỏng vấn M0 ([interview guide](../research/customer-interview-guide.md)).

### 3.3 Add-on và dịch vụ

| Hạng mục | Giá | Ghi chú |
|---|---|---|
| OTP SMS / Zalo ZNS | Giá vốn + 20–30% | Trả trước bằng credit (M2–M3) |
| Skin riêng theo quán | 1–3 triệu đ/skin `[GĐ]` | Thuê art; skin có thể vào kho chung nếu quán đồng ý |
| Dựng hộ (sau pilot) | 300–500 nghìn đ/chương trình `[GĐ]` | Cho quán không muốn tự làm |

---

## 4. Go-to-market

| Giai đoạn | Thời gian | Cách làm | Mục tiêu |
|---|---|---|---|
| **GTM-0: Pilot Tết** | 11/2026 – 02/2027 | Tìm 5–10 quán F&B quen hoặc qua nhóm chủ quán; dựng hộ miễn phí đổi lấy số liệu và case study ([D-19](../product/decisions.md)) | 3 case study có số liệu; ≥ 3 quán muốn trả tiền |
| **GTM-1: Tự phục vụ** | 03 – 05/2027 | PayOS; chợ mẫu công khai (SEO "vòng quay may mắn cho quán", "minigame Tết cho quán cà phê"…); watermark; mùa 8/3, 30/4 | ≥ 50 quán trả phí |
| **GTM-2: Cộng đồng và nội dung** | 06 – 09/2027 | Video 30 giây mỗi playbook; nội dung "chương trình nào hiệu quả cho quán trà sữa" từ benchmark; nhóm chủ quán | ≥ 200 quán trả phí |
| **GTM-3: Kênh** | 10 – 12/2027 | Agency/freelancer, đối tác POS; mở bán Tết 2028 từ tháng 9 (gói năm trả trước) | 1.000 quán trả phí mùa Tết 2028 |

**Nhịp bán theo dịp:** mỗi dịp (Tết, 8/3, 30/4, hè, Trung thu, 20/10, Noel) ra playbook + skin trước 4–6 tuần, gửi Zalo/email tới quán đang dùng. Đây là nhịp bán chính và cũng là lý do quán giữ thuê bao.

---

## 5. Unit economics `[GĐ]`

### 5.1 Chi phí biến đổi

| Thành phần | Ước tính | Ghi chú |
|---|---|---|
| CDN asset (game + ảnh ~3 MB) | ~3–5đ/người chơi | Cache tốt |
| API + DB (lượt chơi, prize engine, đổi quà) | ~5–15đ/người chơi | |
| OTP/ZNS | 250–800đ/tin | Khách trả |
| **Tổng không tính OTP** | **< 30đ/người chơi** | Gross margin phần mềm > 85% |

Hạ tầng cố định giai đoạn đầu: 1 VM + Postgres managed + Valkey, khoảng vài triệu đồng/tháng ([environments-deploy](../operations/environments-deploy.md)).

### 5.2 LTV / CAC

| Gói | ARPA/tháng | Gross margin | Thời gian ở lại TB | LTV | CAC mục tiêu |
|---|---|---|---|---|---|
| Quán | ~250 nghìn đ (có gói năm) | 85% | 12 tháng | ~2,5 triệu đ | ≤ 750 nghìn đ (≤ 3 tháng thuê bao) |
| Chuỗi | ~700 nghìn đ | 85% | 18 tháng | ~10,7 triệu đ | ≤ 2,1 triệu đ |

CAC thấp như vậy chỉ đạt được bằng kênh tự nhiên (watermark, SEO, giới thiệu), không bằng sales trực tiếp. Đây là lý do mô hình phải là PLG.

### 5.3 Mốc doanh thu

| Mốc | Quán trả phí | MRR `[GĐ]` |
|---|---|---|
| Sau M2 (05/2027) | 50 | ~15 triệu đ |
| Sau M3 (09/2027) | 200 | ~60 triệu đ |
| Mùa Tết 2028 | 1.000 | ~300 triệu đ |

Công ty chạy bằng một founder cho tới khi có bằng chứng từ pilot. Gọi vốn pre-seed **sau Gate M1**, dùng số liệu pilot (lượt đổi quà, khách quay lại, quán muốn trả tiền) làm bằng chứng.

---

## 6. KPI kinh doanh

| KPI | Mục tiêu 2027 `[GĐ]` |
|---|---|
| North Star: lượt đổi quà tại quầy/tháng | 100.000 vào 12/2027 |
| Quán trả phí | 50 (05) → 200 (09) → 1.000 (Tết 2028) |
| Free → trả phí | ≥ 5% trong 60 ngày |
| Retention thuê bao tháng 2 | ≥ 60% |
| % đăng ký đến từ watermark/SEO | ≥ 50% |
| CAC | ≤ 3 tháng thuê bao |
| NPS chủ quán | ≥ 40 |

---

## 7. Rủi ro kinh doanh

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| WOAY sao chép (đã có game, OTP, Zalo) | Cao | Không đua số game; thắng bằng ảnh sản phẩm của quán + đổi quà tại quầy + báo cáo kết quả + giá theo lượt đổi quà |
| Quán nhỏ không chịu trả thuê bao, chỉ dùng mùa Tết | Cao | Giữ chân và playbook theo dịp cả năm; gói năm giảm giá; thử trả theo kết quả |
| Một người làm cả sản phẩm và bán | Cao | Roadmap cắt phạm vi; ngày cố định cho khách mỗi tuần; PLG thay sales |
| Prize engine phát sai, mất uy tín | Cao | Server quyết định; mô phỏng 1 triệu lượt + load test trước pilot; log kiểm chứng |
| Pháp lý khuyến mại may rủi gắn mua hàng | Cao | Thể lệ mẫu, hướng dẫn thông báo Sở Công Thương; điều khoản "quán là thương nhân thực hiện khuyến mại" ([compliance](./compliance.md)) |
| Mùa vụ dồn vào Tết | TB | Lịch playbook cả năm; gói năm trả trước từ tháng 9 |
| Gian lận/bot vét quà | TB | Chống gian lận mức Chuẩn; giới hạn quà/người; đổi quà tại quầy làm bot vô ích với quà hiện vật |
