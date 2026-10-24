# 00 — Chiến lược sản phẩm Playora

Phiên bản: v2.0 · 24/10/2026 · Owner: Head of Product · Tài liệu "nguồn chân lý" về định hình sản phẩm. Mọi tài liệu khác phải nhất quán với file này.

> Cơ sở: [01-market-research.md](./01-market-research.md), [11-game-builder-research.md](./11-game-builder-research.md). Thay đổi so với v1.0 được tóm tắt ở §10.

---

## 1. Một câu định nghĩa sản phẩm

> **Playora là nền tảng dựng minigame có thưởng cho chiến dịch marketing tại Việt Nam, bán qua agency. Dựng trong 30 phút từ template × skin theo mùa, giải thưởng được kiểm soát chặt và minh bạch, chạy online, tại booth, và khi cần thì lên cả sân khấu LED.**

- **Category:** *Gamified Campaign Builder* (builder minigame có thưởng). Không phải "phần mềm quay số", không phải "slide tương tác/quiz".
- **Tagline:** *"Dựng minigame có thưởng trong 30 phút."*

---

## 2. Vấn đề và cơ hội (rút từ nghiên cứu)

| Sự thật thị trường | Hệ quả chiến lược |
|---|---|
| Minigame có thưởng (vòng quay, cào, mở quà, hứng quà) là **ngân sách lặp lại** của brand: Tết, 8/3, Trung thu, sinh nhật brand, ra mắt sản phẩm, khai trương | **Minigame campaign là lõi**: đây là nơi có tần suất mua và doanh thu |
| 凡科/Guandayun thắng nhờ **kho template × skin theo mùa rất lớn**, prize engine và participation rules đầy đủ, **mạng lưới đại lý OEM**; big screen chỉ là phụ | Đi đúng mô hình này: builder + skin theo mùa + prize engine + kênh agency/white-label |
| WOAY (VN) đã có ~11 game, OTP, Zalo login, Open API, nhưng bán theo quota lượt/tháng, ít skin theo mùa, **không có live/LED**, không có lớp agency/white-label | Không đối đầu ở "số lượng game". Thắng bằng **độ rộng skin theo mùa, prize engine kiểm soát chi phí, lớp agency, và một nền tảng cho cả online + booth + sân khấu** |
| Nỗi sợ số 1 của brand là **giải hết sớm hoặc vượt ngân sách**, và bị nghi gian lận | **Prize engine là lý do khách tin**: pacing, giới hạn, ngân sách, Prize Simulator, log kiểm chứng |
| Quiz/poll (Kahoot, Slido, Mentimeter, AhaSlides) đã rất tốt, có bản miễn phí | **Không làm quiz.** Không cạnh tranh được và không phải nhu cầu của brand campaign |
| Quay số và check-in LED đã là hàng phổ thông (0,25–4 triệu đ/sự kiện) | Không bán quay số riêng lẻ. Game LED nhiều người + lucky draw minh bạch là **add-on "Live"** cho mùa YEP/hội nghị |
| Builder quốc tế đắt (USD/EUR), không có Zalo, không có văn hoá Tết, không hiểu thể lệ khuyến mại VN | Lợi thế bản địa: Zalo/ZNS, VietQR, hoá đơn VAT, skin Tết/lễ VN, mẫu thể lệ khuyến mại và biên bản |

---

## 3. Khách hàng mục tiêu (ICP)

| Thứ tự | Phân khúc | Vai trò | Vì sao |
|---|---|---|---|
| **#1** | **Agency digital / activation / sự kiện** (5–50 nhân sự) | **Người mua + kênh phân phối** | Mỗi agency mang theo hàng chục brand và nhiều campaign/năm; cần white-label; đau nhất là "dev minigame chậm, đắt, không kiểm soát được giải" |
| **#2** | **Brand marketing tầm trung** (FMCG, chuỗi F&B, bán lẻ chuỗi, bank, bảo hiểm, BĐS) | Người dùng cuối của agency; mua trực tiếp gói tự phục vụ ở M2+ | Ngân sách campaign theo mùa, cần lead hợp pháp và kiểm soát chi phí giải |
| #3 | **HR / Internal comms** (doanh nghiệp 200–3.000 nhân sự) | Mua **Live add-on** cho YEP, Family Day, hội nghị | Theo mùa, quyết định nhanh; minigame nội bộ dùng chung engine |
| Không ưu tiên | Shop nhỏ, SME bán lẻ rất nhỏ | Phục vụ qua gói Free (watermark) | ARPA thấp, chi phí hỗ trợ cao |

**Persona chính:** *Linh, PM agency*, cần "vòng quay Tết có logo khách, 3 tuần, 5.000 giải, không được hết giải trong ngày đầu, có báo cáo gửi client mỗi tuần".

---

## 4. Định vị

**Với** agency và brand marketing tại Việt Nam,
**khi** cần một minigame có thưởng cho chiến dịch, booth hay sự kiện,
**Playora** là builder minigame có thưởng
**giúp** dựng game có thương hiệu trong 30 phút từ hàng trăm tổ hợp cơ chế × skin theo mùa, kiểm soát giải thưởng và ngân sách (pacing, giới hạn, mô phỏng trước khi chạy), và có báo cáo gửi client,
**khác với** WOAY (ít skin theo mùa, quota lượt/tháng, không có lớp agency và sân khấu), phần mềm quay số (chỉ có quay số), slide tương tác (chỉ có quiz/poll) hay thuê dev làm riêng (chậm, đắt, khó kiểm soát giải).

---

## 5. Kiến trúc sản phẩm: 3 bề mặt + 1 builder + 1 lõi

```
                         ┌──────────────── PLAYORA STUDIO (Builder) ────────────────┐
                         │ Template gallery · Editor (flow + form + preview) · Skin │
                         │ Brand kit · Prize setup + Simulator · Run-of-show · Reports│
                         └───────────────┬──────────────────────────────────────────┘
                                         │ publish (game version bất biến)
      ┌──────────────────────────────────┼───────────────────────────────────────┐
      ▼                                  ▼                                       ▼
 PLAYER (phone) — LÕI               BOOTH (Kiosk/Tablet)                 STAGE (Screen + Host) — ADD-ON
 Link/QR/Zalo, không cài app        Activation, triển lãm                LED, máy chiếu; MC điều khiển
 Minigame có thưởng, nhiều ngày     Auto-reset, staff đổi quà            Game nhiều người + lucky draw
      └──────────────────────────────────┼───────────────────────────────────────┘
                                         ▼
               PLAYORA CORE: Play Engine (instant + skill) · Prize & Participation Engine ·
               Anti-fraud · Identity & Consent · Data & Insights · Live Engine · Billing/Quota
```

**Bốn trụ giá trị (theo thứ tự đầu tư):**

1. **Builder + thư viện minigame:** template × skin × brand kit, flow chuẩn (Cover → Form → Game → Kết quả → Quà của tôi), auto-form, preview thật. *Lõi.*
2. **Prize & Trust:** prize engine (tỷ lệ, tồn kho, pacing, giới hạn, ngân sách), Prize Simulator, voucher, đổi quà, chống gian lận, log kiểm chứng. *Lý do khách tin và trả tiền.*
3. **Agency layer:** client workspace, white-label, báo cáo gửi client, template riêng, reseller/OEM. *Lý do khách ở lại và kênh tăng trưởng.*
4. **Live add-on:** game LED nhiều người (shake/tap race), lucky draw minh bạch, Host Console. *Upsell mùa YEP/hội nghị; engine đã có.*

---

## 6. Nguyên tắc sản phẩm

1. **Giải thưởng không được sai.** Server quyết định mọi kết quả trước khi client animate; 0 vượt tồn kho, 0 vượt ngân sách, 0 vượt giới hạn người chơi. Đúng đắn của prize engine đứng trên mọi tính năng mới.
2. **Cơ chế ít, skin nhiều.** Mỗi cơ chế mới phải đáng giá ≥ 10 skin. Gallery = cơ chế × skin × dịp. Ra skin theo mùa đều đặn quan trọng hơn ra cơ chế mới.
3. **Builder là sản phẩm, không phải công cụ nội bộ.** Đội Playora dựng campaign cho khách **bằng chính Studio**. Cái gì đội ops thấy khó thì khách cũng sẽ thấy khó.
4. **Minh bạch mặc định.** Log kiểm chứng được; không có tính năng "định trước người trúng". Quà không ngẫu nhiên đi qua "Tặng quà theo danh sách", ghi rõ.
5. **Một engine, ba bề mặt.** Cùng một game version chạy được trên điện thoại (campaign), kiosk (booth) và, với game live, trên LED. Không fork logic theo bề mặt.
6. **Agency là khách hàng hạng nhất.** Mọi màn hình đều nghĩ tới trường hợp "một người quản lý 20 client".
7. **Sân khấu không được sập** (cho Live add-on). Game live phải có degrade mode và rehearsal.

### Không làm (ít nhất đến hết 2027)

- **Quiz / poll / slide tương tác** (Kahoot, Slido, Mentimeter, AhaSlides đã làm tốt và có bản miễn phí).
- Canvas kéo-thả tự do hoặc editor logic kiểu Epub360.
- Cash/red packet, cá cược, đổi thưởng ra tiền.
- Cơ chế ép chia sẻ kiểu "裂变" (trái policy Zalo/FB); chỉ "thêm lượt khi chia sẻ" có giới hạn.
- Event management đầy đủ (bán vé, agenda, seating).
- Check-in bằng khuôn mặt (dữ liệu sinh trắc học nhạy cảm theo PDPL).

---

## 7. Lộ trình MVP theo giai đoạn

| Mã | Giai đoạn | Thời gian | Câu hỏi cần trả lời | Phạm vi cốt lõi | Gate để đi tiếp |
|---|---|---|---|---|---|
| **M0** | Discovery & Foundation | 26/10 – 06/11/2026 | Agency/brand có trả tiền cho minigame campaign dựng bằng builder không? | Phỏng vấn agency + brand, pre-sale campaign Tết; monorepo, design system, spike realtime (đã đạt 5.000 client, ADR 004) | ≥ 3 cọc pilot campaign Tết |
| **M1** | **MVP "Tết Campaign" + Live add-on** | 09/11 – 11/12/2026, pilot 12/12/2026 – 06/02/2027 (Tết) | Agency có dựng và chạy được campaign minigame thật bằng builder không? Prize engine có giữ đúng kho và ngân sách không? | **Play engine** (instant + skill); **prize engine v1** (tỷ lệ/tỷ lệ tổng/100% trúng, tồn kho, giới hạn người/ngày, ngân sách, rải đều theo thời gian, khung giờ); voucher pool; **4 minigame**: vòng quay, cào thẻ, mở hộp quà (skin đập trứng, lì xì), hứng quà; skin Tết + chung; chống gian lận mức Chuẩn (Turnstile, rate limit, thiết bị); link theo kênh; dashboard + export. **Live add-on:** shake/tap race, lucky draw minh bạch, Host Console | 10+ campaign trả phí, ≥ 50.000 lượt chơi hợp lệ, **0 sai lệch giải**, ≥ 3 campaign **agency tự dựng**, NPS ≥ 40 |
| **M2** | **Self-serve & Agency** | 22/02 – 30/04/2027 (8/3, 30/4) | Khách có tự dựng và tự trả tiền không? Agency có bán lại không? | **Prize Simulator**, pacing đầy đủ (theo đợt, xả kho cuối); OTP ZNS/SMS; +4 minigame (lật thẻ, ghép hình, đập logo, lì xì rơi) và theme pack theo mùa; flow chuẩn chỉnh từng màn, pre-flight; thông báo trúng qua email/ZNS; đổi quà staff mode; client workspace, white-label cơ bản; gói tự phục vụ + Agency (PayOS); báo cáo PDF + biên bản | ≥ 30 khách trả phí, ≥ 8 agency trả phí, ≥ 60% campaign tự dựng không cần hỗ trợ |
| **M3** | **Booth & Activation** | 03/05 – 30/07/2027 (hè, Trung thu sớm) | Mở rộng sang booth/activation tại chỗ có tăng ARPA agency không? | Kiosk mode (online), mã tham gia/nắp chai, requirements trước khi chơi; funnel theo kênh; Live add-on thêm kéo co, nghi thức khởi động, check-in wall | ≥ 10 activation trả phí, ARPA agency tăng ≥ 30% |
| **M4** | **Scale & Platform** | 08 – 12/2027 (bán YEP + Tết 2028 từ 09) | Có nhân rộng được qua kênh không? | Zalo login/Mini App; webhook/API; custom domain; e-gift (UrBox/ViHat); AI draft; template riêng của org; reseller/OEM; kiosk offline; SSO; Live 20.000 CCU | 50 agency, 1.000 campaign/sự kiện mùa Tết 2028, MRR theo kế hoạch |
| Later | Platform & SEA | 2028 | | Game SDK công khai + marketplace; SEA (en/id/th); OCR hoá đơn; ClickHouse | |

**Lý do sắp xếp như vậy:**
- **M1 phải kịp Tết 2027**, mùa ngân sách minigame lớn nhất năm. Live add-on dùng lại engine realtime (spike 5.000 client; engine M1 đã đo 2.000 client, ADR 004) để bán thêm cho YEP cùng thời điểm.
- **M2 rơi vào 8/3 và 30/4:** campaign ngắn, nhiều, cần tự phục vụ và Simulator để agency tự tin bán.
- **M3 vào mùa hè và activation (05–07):** booth dùng chung engine với campaign.
- **M4 chuẩn bị Tết 2028:** quy mô và kênh.

---

## 8. Chỉ số

| Cấp | Chỉ số | Mục tiêu |
|---|---|---|
| **North Star** | **Lượt chơi hợp lệ trên campaign/sự kiện trả phí / tháng** | 50.000 (pilot) → 2.000.000 (12/2027) |
| Builder (lõi) | % campaign khách **tự dựng** không cần Playora hỗ trợ | M1 ≥ 25% · M2 ≥ 60% · M4 ≥ 80% |
| Builder | Thời gian trung vị từ tạo đến publish | M1 ≤ 60 phút · M2 ≤ 30 phút |
| Prize | Sai lệch tồn kho / vượt ngân sách / vượt giới hạn | 0 |
| Prize | % campaign hết giải trước 80% thời lượng (khi bật rải đều) | ≤ 5% |
| Player | Tỷ lệ mở link/quét QR → chơi lượt đầu | ≥ 70% |
| Kinh doanh | Paying customers / agency trả phí | M2: 30/8 · M4: 300/50 |
| Kinh doanh | ARPA agency | ≥ 5 triệu đ/tháng (M4) |
| Hài lòng | NPS organizer | ≥ 40 (M1) → ≥ 50 (M4) |

---

## 9. Giả định rủi ro nhất và cách kiểm chứng

| # | Giả định | Kiểm chứng ở | Bằng chứng cần có | Nếu sai thì |
|---|---|---|---|---|
| A1 | Agency/brand chọn Playora thay vì WOAY vì skin theo mùa + kiểm soát giải + white-label | M0 (pre-sale), M1 | ≥ 3 cọc pilot; lý do chọn được ghi lại trong phỏng vấn | Tập trung hẳn vào agency white-label/OEM; cạnh tranh bằng giá theo campaign |
| A2 | Agency sẽ **tự dựng** bằng builder thay vì nhờ dev | M1, M2 | ≥ 3 agency tự dựng trong pilot; ≥ 60% ở M2 | Chuyển sang "managed service + template", tăng ops |
| A3 | Prize engine giữ đúng kho và ngân sách dưới tải campaign (đỉnh vài trăm lượt/giây) | M1 | Test 1 triệu lượt mô phỏng + load test: 0 sai lệch | Khoá chặt hơn (serialize theo campaign), giảm tốc độ phát giải |
| A4 | Chống gian lận mức Chuẩn (không OTP) đủ cho campaign Tết M1 | M1 | Tỷ lệ lượt bị gắn cờ < 5%, không có khiếu nại "hết giải vì bot" | Đưa OTP ZNS/SMS lên sớm; bắt buộc form SĐT duy nhất |
| A5 | Live add-on bán thêm được cho mùa YEP mà không kéo nguồn lực khỏi lõi | M1 | ≥ 5 sự kiện YEP mua add-on; ≤ 20% effort dev M1 cho live | Đóng băng live, chỉ giữ lucky draw |

---

## 10. Thay đổi so với v1.0

| Hạng mục | v1.0 | v2.0 | Lý do |
|---|---|---|---|
| Lõi sản phẩm | Game LED nhiều người tại sự kiện (wedge) | **Minigame có thưởng cho campaign** (online trước, booth dùng chung engine) | Ngân sách lặp lại theo mùa nằm ở campaign; mô hình 凡科 |
| Live LED | Lõi | **Add-on** (shake/tap race, lucky draw, Host Console) | Engine đã có; bán thêm mùa YEP |
| Quiz | `live-quiz` trong M1 | **Bỏ**, vào mục "Không làm" | Kahoot/Slido/AhaSlides đã làm tốt và miễn phí |
| WOAY | Không đối đầu ở online | **Đối thủ trực tiếp**; thắng bằng skin theo mùa, prize engine, lớp agency, một nền tảng cho online + booth + sân khấu | Đổi lõi |
| M1 | "YEP Live": check-in wall, quiz, shake race, lucky draw | **"Tết Campaign"**: vòng quay, cào thẻ, mở hộp quà, hứng quà + prize engine v1 + Live add-on | Kịp mùa Tết 2027 |
| Prize engine | Đầy đủ ở M3 | **v1 ở M1** (tỷ lệ, tồn kho, giới hạn, ngân sách, rải đều); Simulator ở M2 | Campaign không chạy được nếu thiếu |
| North Star | Người chơi trên sự kiện trả phí | **Lượt chơi hợp lệ trên campaign/sự kiện trả phí** | Đo đúng giá trị campaign |
| ICP #2 | HR / Internal comms | **Brand marketing tầm trung**; HR thành người mua Live add-on | Đổi lõi |
