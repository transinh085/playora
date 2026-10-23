# 01 — Khảo sát thị trường

Cập nhật: 23/10/2026 · Phạm vi: Việt Nam là thị trường chính, sau đó Đông Nam Á.

---

## 1. Tóm tắt

1. **Nhu cầu có thật và theo mùa.** Sự kiện doanh nghiệp (YEP/tất niên, hội nghị khách hàng, ra mắt sản phẩm, roadshow, booth triển lãm) đều cần "khoảnh khắc tương tác". Hiện phần lớn được giải quyết bằng: (a) agency thuê dev làm game riêng cho từng dự án, hoặc (b) công cụ miễn phí rời rạc như vòng quay online, Kahoot hay Google Form.
2. **Khoảng trống:** ở Việt Nam chưa có sản phẩm nào gộp được ba mảng: **live game màn hình lớn** (kiểu Hi现场 của Trung Quốc), **minigame H5 trúng thưởng có quản lý giải** (kiểu WOAY hoặc 人人秀), và **white-label cho agency**.
3. **Đối thủ trực tiếp nhất tại VN là WOAY** (minigame marketing, không có live). Quay số và check-in trên LED đã **bị hàng hoá hoá** (XSPIN, Luck4You, EDC Tech, quaythuong.vn: 0,25–4 triệu đ/sự kiện). Nhóm quiz/poll (Kahoot, Slido, Mentimeter, AhaSlides) giải quyết tương tác nhưng không có game thương hiệu hoá và quản lý giải thưởng.
4. **Guandayun = 观达云互动**, gần như chắc chắn là đại lý OEM của **凡科互动**. Đây là mô hình "template + form cấu hình + prize engine" cho SME WeChat, big screen chỉ là tính năng phụ. Chi tiết ở [11-game-builder-research.md](./11-game-builder-research.md).
5. **Định vị đề xuất:** *"Event Game OS cho agency và brand Việt Nam"*. Dựng game sự kiện có thương hiệu trong 30 phút, chạy được 5.000+ người chơi đồng thời, quản lý giải minh bạch, đúng quy định khuyến mại và PDPL.

---

## 2. Quy mô thị trường

### 2.1 Số liệu tham chiếu (top-down)

| Chỉ số | Giá trị | Nguồn |
|---|---|---|
| Thị trường gamification toàn cầu 2026 | 19,4 – 34,4 tỷ USD (tuỳ nguồn), CAGR 15–28% | [Future Market Insights](https://www.futuremarketinsights.com/reports/gamification-market), [Persistence MR](https://www.persistencemarketresearch.com/market-research/gamification-market.asp) |
| Thị trường MICE Việt Nam 2025 | ~5,1 tỷ USD (IMARC), ~6 tỷ USD (BIDV), 7,79 tỷ USD (ReportOcean) | [IMARC](https://www.imarcgroup.com/mice-market-vietnam), [Vietnam News](https://vietnamnews.vn/media-outreach/1782331/vietnam-s-bridge-to-the-global-experience-economy.html) |
| Phần mềm quản lý sự kiện Việt Nam 2025 | ~28,57 triệu USD | [IMARC](https://www.imarcgroup.com/vietnam-event-management-software-market) |
| Live entertainment VN | > 50 triệu USD doanh thu, > 700 sự kiện lớn/năm | [Vietnam News (05/2026)](https://vietnamnews.vn/media-outreach/1782331/vietnam-s-bridge-to-the-global-experience-economy.html) |

> Lưu ý: các nguồn chênh nhau nhiều vì định nghĩa phạm vi khác nhau. Chưa có số liệu riêng cho "event gamification" hay "brand activation games" tại VN.

### 2.2 Ước tính bottom-up `[GĐ]`

Phân khúc **phần mềm game sự kiện** tại VN, chia theo use case:

| Phân khúc | Số đơn vị mục tiêu | % sẵn sàng trả tiền | Chi tiêu TB/năm | Giá trị/năm |
|---|---|---|---|---|
| YEP / sự kiện nội bộ của doanh nghiệp ≥ 50 nhân sự | ~30.000 DN | 10% | 4 triệu đ | ~12 tỷ đ |
| Agency sự kiện / activation | ~1.500 agency | 30% | 60 triệu đ | ~27 tỷ đ |
| Brand marketing (FMCG, F&B, bán lẻ, ngân hàng, BĐS) | ~3.000 brand | 15% | 80 triệu đ | ~36 tỷ đ |
| Trường học, hội nhóm, hội nghị | ~5.000 đơn vị | 10% | 3 triệu đ | ~1,5 tỷ đ |
| **SAM (VN)** | | | | **~75–80 tỷ đ/năm (~3 triệu USD)** |

- **SOM năm 1–2:** 5–8% SAM, tức khoảng **4–6 tỷ đ/năm**.
- **Mở rộng:** Đông Nam Á (Indonesia, Philippines, Thái Lan có văn hoá sự kiện và activation tương tự) nhân SAM lên 5–8 lần.
- **Upside ngoài phần mềm:** nhiều khách vẫn cần game custom, tức dịch vụ 30–200 triệu đ/dự án. Thị trường "agency đặt dev làm game" lớn hơn hẳn phần SaaS, và Playora có thể chiếm một phần nhờ giảm 70–90% chi phí làm mới.

**Việc cần làm ở M0:** kiểm chứng ba con số "% sẵn sàng trả" và "chi tiêu TB" bằng 15–20 cuộc phỏng vấn (xem mục 7).

---

## 3. Bản đồ đối thủ

### 3.1 Phân nhóm

```
                    LIVE (màn hình lớn, realtime, đồng thời)
                                   ▲
       Hi现场 / Guandayun(?)        │        Kahoot / Slido / Mentimeter
       (大屏互动: lắc, đua,          │        AhaSlides (quiz, poll, Q&A)
        quay số, tường check-in)    │
                                   │           ★ PLAYORA (mục tiêu)
 GAME THƯƠNG HIỆU ◄────────────────┼────────────────► TƯƠNG TÁC CHUNG
 + GIẢI THƯỞNG                     │                  (không giải thưởng)
       WOAY, 人人秀, 凡科互动         │        Google Form, vòng quay free
       Interacty, Playable          │
       (H5 minigame, vòng quay)     │
                                   ▼
                    ASYNC (chơi lẻ, theo chiến dịch)
```

### 3.2 Bảng so sánh chi tiết

| Đối thủ | Thị trường | Mạnh | Yếu / khoảng trống | Giá (tham khảo) |
|---|---|---|---|---|
| **WOAY** | VN | Gamification SaaS cho khuyến mại bán lẻ; 11 game (VQMM, mở quà, lật hình, gắp quà, hứng quà, cào, quiz…); OTP SMS/ZNS, login Zalo; Open API, Zalo MiniApp | Không có live, LED, lucky draw sân khấu; quota theo lượt/tháng không hợp sự kiện 1 đêm | Free 50 lượt/tháng; Pro 50k đ/ngày (500 lượt/tháng); Pro-Adv 300k đ/ngày (5.000 lượt/tháng) ([woay.vn](https://woay.vn/bang-gia)) |
| **XSPIN** | VN | Quay số, check-in, minigame lắc lì xì, đua vịt; khách lớn (Grab, Toyota, Agribank) | Sản phẩm rời, giao diện cũ, không có game realtime nhiều người | Quay số 500k (100 người) → 4,5tr (10.000)/sự kiện ([xspin.vn](https://xspin.vn/phi-dich-vu)) |
| **Luck4You / Bright4Event** | VN | Quay số YEP, multi-screen LED, add-on check-in/voting/minigame | Minigame chỉ là add-on | 690k (≤300) → 3,99tr (≤3.000)/sự kiện ([quaysotrungthuong.vn](https://quaysotrungthuong.vn/license)) |
| **EDC Tech Lucky Draw** | VN | Lọc pool AND/OR, log seed + hash, màn BTC tách màn sân khấu | Chỉ quay số | 1–4tr/sự kiện ([edctech.vn](https://edctech.vn/lucky-draw)) |
| **Crowdpurr** | Global | Trivia, bingo, lottery, social wall; Host/Presentation/Participant; booth auto-reset; sponsor ads | Không có game hành động, prize engine đơn giản | $49,99–999,99/tháng theo trần người ([crowdpurr.com](https://www.crowdpurr.com/pricing)) |
| **Drimify / Easypromos** | Global | Builder wizard, instant-win scheduler, chống gian lận chi tiết | Không có live/LED; giá USD/EUR cao | Drimify $221/1.000 lượt; Easypromos $29–399/tháng |
| **MISA eShop (vòng quay)** | VN | Gắn sẵn CRM và bán hàng | Chỉ là tính năng phụ, không phải game platform | Gói trong MISA |
| **Vòng quay free** (vongquaymayman…) | VN | Miễn phí, dễ dùng | Không thương hiệu hoá, không quản lý giải, không chống gian lận | Free |
| **AhaSlides** | VN/Global | Quiz, poll, spinner live; team gốc Việt | Định vị presentation; không phải game thương hiệu; không quản lý giải | Freemium, gói trả phí theo năm |
| **Kahoot!** | Global | Thương hiệu mạnh, quiz live | Đắt; chỉ có quiz; ít tuỳ biến thương hiệu | ~17 USD/user/tháng (Capterra, xem thêm [GetApp so sánh](https://www.getapp.com/collaboration-software/a/slido/compare/kahoot/)) |
| **Slido / Mentimeter** | Global | Poll, Q&A hội nghị | Không có game | Slido free tới 100 người; trả phí từ ~210 USD/năm |
| **Interacty** | Global | 20+ cơ chế game, kiosk/touchscreen | Không có live đông người; không có kênh VN (Zalo, VietQR) | Từ ~3 USD/tháng ([Capterra](https://capterra.com/p/209461/Interacty/)) |
| **Playable** | Global | Gamification cho marketer, enterprise | Giá liên hệ, không có mặt tại VN | Contact sales |
| **Engamio** (+ InEvent) | Global | Gamification cho virtual/hybrid event, sponsor ROI | Hướng virtual event; không phải game màn hình lớn | Enterprise |
| **Hi现场** | TQ | 60+ trò màn hình lớn (摇一摇, 数钱, 赛马, 拔河, 3D check-in, 弹幕, nghi thức khởi động), MC điều khiển bằng điện thoại | Gắn chặt WeChat; không vào được VN | Theo buổi 0–1.599 tệ; hội viên 3.980–6.980 tệ/năm |
| **观达云互动 (Guandayun)** = OEM **凡科互动** | TQ | 300+ template (凡科 ~1.700 mục theo mùa), prize engine và participation rules rất đầy đủ, OEM/API | Big screen chỉ là tính năng phụ (摇一摇 ≤ 300–1.000 người); tuỳ biến chỉ ở mức đổi ảnh/chữ | 凡科: 0 / 1.298 / 1.998 / 2.998 tệ/năm |
| **人人秀 / 易企秀** | TQ | 人人秀: canvas + plugin, 18 trò màn hình lớn; 易企秀: game + bốc thăm, webhook logic | Hệ sinh thái WeChat | 人人秀 1.888–2.888 tệ/năm |
| **Agency + dev freelance** | VN | Tuỳ biến 100% | 30–200 triệu đ/game, 2–6 tuần, khó tái sử dụng, rủi ro sập khi đông người | Theo dự án |

> **Đối thủ thật sự lớn nhất là "làm custom".** Agency hiện quen thuê dev làm game riêng. Lời chào hàng của Playora vì vậy phải là: rẻ hơn 5–10 lần, nhanh hơn 10 lần, và không sập khi đông người.

### 3.3 Bài học từ mô hình Trung Quốc (Hi现场 / Guandayun–凡科 / 人人秀)

> Phân tích builder chi tiết (editor, prize engine, participation, chống gian lận, giá) ở [11-game-builder-research.md](./11-game-builder-research.md).


- **Màn hình lớn và điện thoại là "combo vàng" ở sự kiện:** quét QR → check-in, rồi lên tường ảnh hoặc chạy chữ, rồi chơi lắc điện thoại (shake race), đếm tiền, kéo co theo đội, cuối cùng quay số trúng thưởng trên LED.
- **Freemium cộng dịch vụ:** công cụ rẻ hoặc miễn phí, doanh thu chính đến từ gói doanh nghiệp, tuỳ biến, white-label và vận hành tại chỗ.
- **Thư viện template rất lớn** (hàng nghìn) giúp marketing tự phục vụ. Ở VN nên bắt đầu với 10–15 cơ chế chất lượng cao, rồi nhân bản bằng skin hay theme.
- **Gắn chặt nền tảng nhắn tin quốc dân.** Ở TQ là WeChat; ở VN sẽ là **Zalo** (đăng nhập, ZNS gửi mã quà, Zalo Mini App) và Facebook.

---

## 4. Khách hàng và insight

### 4.1 Phân khúc ưu tiên

| Ưu tiên | Phân khúc | Vì sao |
|---|---|---|
| **#1** | **Agency sự kiện & activation** (người mua + kênh) | Mua lặp lại nhiều lần/năm; mỗi agency phục vụ hàng chục brand; nhạy cảm chi phí dev; là kênh phân phối B2B2C |
| **#2** | **HR / Internal comms (YEP, Family Day, team building)** | Mùa YEP (giữa 12 → trước Tết) là đỉnh cầu; người mua tự phục vụ được |
| #3 | Brand marketing (FMCG, F&B, bán lẻ, ngân hàng, BĐS) | Mua **qua agency** ở giai đoạn đầu; chu kỳ bán dài; cần case study |
| — | Trường học, cộng đồng; shop online | Chi tiêu thấp; phục vụ qua gói Free (virality). Shop online là sân của WOAY, không ưu tiên |

### 4.2 Pain point (giả thuyết cần kiểm chứng)

**Agency:**
- Brief gấp (3–7 ngày) mà dev làm game mất 2–6 tuần.
- Game custom hay sập hoặc lag khi vài trăm người cùng quét QR. Mất uy tín ngay trên sân khấu.
- Khó quản lý giải: số lượng, tỷ lệ trúng, không bị phát hết sớm, tránh một người chơi nhiều lần.
- Không có báo cáo đẹp (lead, lượt chơi, tỷ lệ chuyển đổi) để gửi brand sau sự kiện.
- Muốn bán dưới thương hiệu của mình (white-label).

**HR / YEP:**
- Quay số trúng thưởng bằng Excel hoặc random.org trông thiếu chuyên nghiệp và bị nghi gian lận.
- Cần các game đông người, vui và đơn giản: lắc điện thoại, quiz về công ty, kéo co theo phòng ban.
- Ngân sách nhỏ, cần setup trong 1 buổi, không cần kỹ thuật.

**Brand marketing:**
- Cần first-party data (số điện thoại, consent) một cách hợp pháp sau khi Luật BVDLCN 2025 có hiệu lực.
- Cần đo ROI của activation.

### 4.3 Thời điểm (seasonality)

| Thời gian | Mùa | Use case |
|---|---|---|
| **Giữa 11 → đầu 02** | **YEP + Tết** (đỉnh cao nhất) | Quay số LED, shake race, quiz, check-in |
| 03 – 05 | Hội nghị khách hàng, ra mắt sản phẩm | Live quiz, poll, lucky draw |
| 06 – 08 | Hè, family day, team building, khai trương | Team game, minigame booth |
| 09 – 10 | Trung thu, back-to-school, Black Friday warm-up | Minigame H5, voucher |

> **Hệ quả cho roadmap:** hôm nay là 23/10/2026, mùa YEP 2026 còn khoảng 7 tuần. Nên làm **MVP M1 "YEP Live"** (check-in, quiz live, lắc đua theo đội, quay số minh bạch, dựng bằng builder bản assisted) và vận hành kiểu concierge cho 12–15 sự kiện pilot. Đây là cơ hội học nhanh nhất trong năm (chi tiết ở [00-product-strategy.md](./00-product-strategy.md) và [09-roadmap-plan.md](./09-roadmap-plan.md)).

---

## 5. Xu hướng và động lực

1. **Experience economy:** brand chuyển từ "thuê địa điểm" sang "đo Return on Experience" ([Vietnam News](https://vietnamnews.vn/media-outreach/1782331/vietnam-s-bridge-to-the-global-experience-economy.html)).
2. **First-party data và PDPL:** Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15, hiệu lực **01/01/2026** ([LuatVietnam](https://luatvietnam.vn/dan-su/luat-bao-ve-du-lieu-ca-nhan-2025-co-hieu-luc-khi-nao-568-103652-article.html)). Thu thập lead qua game phải có consent rõ ràng. Nền tảng có sẵn consent và audit sẽ là lợi thế bán hàng.
3. **Quy định khuyến mại:** NĐ 128/2024 sửa NĐ 81/2018, hiệu lực 01/12/2024 ([LSVN](https://lsvn.vn/nhung-diem-moi-can-luu-y-ve-hoat-dong-khuyen-mai-a148525.html)). Chương trình may rủi gắn mua hàng phải thông báo Sở Công Thương. Một số chương trình gắn sự kiện văn hoá, giải trí có thể được miễn ([EY](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/tax-update-january-2025-decree-amending-decree-vn-24-jan-2025.pdf)). Cần luật sư xác nhận. Nếu Playora tự sinh "hồ sơ minh bạch" (thể lệ, tỷ lệ, log quay thưởng) thì đó là tính năng khác biệt.
4. **AI generative:** sinh asset theo brand kit (nền, nhân vật, câu hỏi quiz) giúp rút thời gian dựng game từ vài giờ xuống vài phút.
5. **Mobile-first, QR đã phổ biến:** người Việt quen quét QR (VietQR, Zalo), nên rào cản tham gia gần như bằng 0.

---

## 6. SWOT

| | Tích cực | Tiêu cực |
|---|---|---|
| **Nội tại** | **S:** Stack hiện đại (TS end-to-end), realtime chịu tải; hiểu thị trường VN (Zalo, VietQR, luật); tốc độ ra sản phẩm | **W:** Thương hiệu mới, chưa có case study; thư viện game ban đầu nhỏ; team nhỏ |
| **Bên ngoài** | **O:** Chưa ai gộp live + async + white-label ở VN; mùa YEP; PDPL tạo nhu cầu nền tảng tuân thủ; mở rộng SEA | **T:** WOAY mở rộng sang live; AhaSlides thêm game; agency lớn tự build; mùa vụ làm dòng tiền không đều; rủi ro pháp lý khuyến mại |

---

## 7. Kế hoạch kiểm chứng (M0, 2 tuần)

| Hạng mục | Mục tiêu | Cách làm | Tiêu chí thành công |
|---|---|---|---|
| Phỏng vấn agency | 10 cuộc | Mạng lưới, nhóm FB "Event Việt Nam", LinkedIn | ≥ 6/10 xác nhận pain "dev game chậm/đắt/sập" và sẵn sàng pilot |
| Phỏng vấn HR | 8 cuộc | HR community, khách quen | ≥ 5/8 muốn dùng cho YEP 2026 với ngân sách ≥ 2 triệu đ |
| Đo giá | Van Westendorp (4 câu) | Kèm phỏng vấn | Xác định khoảng giá Live Pass |
| Landing page + waitlist | 200 lượt truy cập có mục tiêu | Ads nhỏ (~5 triệu đ) | ≥ 10% để lại email; ≥ 10 yêu cầu demo |
| Pre-sale YEP | 5 hợp đồng pilot | Giá pilot ưu đãi, có cọc | ≥ 3 cọc trước 15/11/2026 |
| Benchmark đối thủ | Dùng thử WOAY, AhaSlides, Hi现场 (nếu được), Interacty | Ghi lại flow, giới hạn, giá | Ma trận tính năng cập nhật |

---

## Nguồn

- [Future Market Insights — Gamification Market](https://www.futuremarketinsights.com/reports/gamification-market)
- [Persistence Market Research — Gamification Market](https://www.persistencemarketresearch.com/market-research/gamification-market.asp)
- [IMARC — Vietnam MICE Market](https://www.imarcgroup.com/mice-market-vietnam)
- [IMARC — Vietnam Event Management Software Market](https://www.imarcgroup.com/vietnam-event-management-software-market)
- [Vietnam News — Vietnam's Bridge to the Global Experience Economy (05/2026)](https://vietnamnews.vn/media-outreach/1782331/vietnam-s-bridge-to-the-global-experience-economy.html)
- [KR-Asia — Vietnamese startup Woay](https://kr-asia.com/vietnamese-startup-woay-is-creating-games-for-a-more-engaging-retail-experience)
- [Brands Vietnam — WOAY SaaS 3.0](https://www.brandsvietnam.com/congdong/topic/320251-WOAY-vn-ra-mat-Gamification-Marketing-SAAS-phien-ban-3-0)
- [Capterra — Interacty](https://capterra.com/p/209461/Interacty/), [Capterra — Playable](https://capterra.com/p/179977/Playable/)
- [Nibble — Kahoot vs Slido 2026](https://nibble-app.com/blog/kahoot-vs-slido)
- [InEvent × Engamio](https://inevent.com/es/press-releases/engamio-gamification-partner.php)
- [Interacty — Gamification for events](https://interacty.me/gamification-for-events)
- [人人秀互动](https://hd.rrx.cn/)
- [163.com — Hi现场 年会大屏互动](https://www.163.com/dy/article/L2S21UVT0518FDSE.html)
- [LuatVietnam — Luật BVDLCN 2025](https://luatvietnam.vn/dan-su/luat-bao-ve-du-lieu-ca-nhan-2025-co-hieu-luc-khi-nao-568-103652-article.html)
- [LSVN — Điểm mới về hoạt động khuyến mại (NĐ 128/2024)](https://lsvn.vn/nhung-diem-moi-can-luu-y-ve-hoat-dong-khuyen-mai-a148525.html)
- [EY Tax Update 01/2025](https://www.ey.com/content/dam/ey-unified-site/ey-com/vi-vn/technical/tax/documents/tax-update-january-2025-decree-amending-decree-vn-24-jan-2025.pdf)
