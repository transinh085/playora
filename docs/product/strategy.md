# 00 — Chiến lược sản phẩm Playora

Phiên bản: **v3.0 (bản nháp)** · 25/10/2026 · Owner: Head of Product · Tài liệu "nguồn chân lý" về định hình sản phẩm. Mọi tài liệu khác phải nhất quán với file này.

> Cơ sở: [01-market-research.md](./01-market-research.md), [11-game-builder-research.md](./11-game-builder-research.md), [14-guandayun-teardown.md](./14-guandayun-teardown.md). Thay đổi so với các bản trước được tóm tắt ở §10.
>
> **Chưa đồng bộ với v3.0:** [01](./01-market-research.md) (vẫn nói live/LED), [02](./02-business-model.md) (ICP agency, giá theo campaign), [prd.md](./prd.md), [04](./04-game-catalog.md), [12 §14](./12-builder-spec.md#14-phân-kỳ-theo-giai-đoạn-mvp). Cần cập nhật sau khi bản này được duyệt.

---

## 1. Một câu định nghĩa sản phẩm

> **Playora là builder minigame có thưởng cho SME Việt Nam. Chủ quán chọn mẫu, chụp ảnh sản phẩm, đặt quà và có game mang thương hiệu của mình trong vài phút. Giải thưởng được kiểm soát chặt, đổi quà ngay tại quầy, và có tính năng giữ chân khách quay lại.**

- **Category:** *Mobile Game Campaign Builder*. Hình mẫu sản phẩm là 凡科互动 / Guandayun ([14](./14-guandayun-teardown.md)), nhưng chỉ lấy mảng hoạt động marketing, không làm cả bộ SaaS.
- **Tagline:** *"Chụp ảnh sản phẩm, có ngay minigame của quán."* `[GĐ]`

---

## 2. Vấn đề và cơ hội

| Sự thật thị trường | Hệ quả chiến lược |
|---|---|
| 凡科 có 1.709 template nhưng chỉ chạy trên **111 engine**. Phần lớn các game bốc thăm dùng chung một logic, chỉ khác cách hiển thị ([14 §1](./14-guandayun-teardown.md#1-tóm-tắt)) | **Cần ít engine, nhiều renderer và skin.** Kho mẫu lớn đến từ dây chuyền sản xuất skin, không phải từ số cơ chế |
| Editor của 凡科 **chỉ chạy trên PC**; điện thoại chỉ dùng để đổi quà và lấy mã. WOAY quảng cáo "5 phút", nhưng phần tuỳ biến được nêu chỉ là màu, logo và ảnh quà | **Builder linh hoạt hơn** (ảnh sản phẩm, luật và giải, flow) là chỗ đối thủ đang để trống. Game chạy mobile-first trên điện thoại người chơi |
| Chủ SME (F&B, spa, gym, nha khoa, bán lẻ) không có designer hay dev, và vận hành cửa hàng bằng điện thoại | Builder chạy từ template, publish mặc định ≤ 5 phút; game và màn đổi quà phải dùng tốt trên điện thoại |
| SME cần lý do để khách **quay lại**, không chỉ một lần quay số dịp Tết | **Giữ chân** (điểm danh, bốc thăm mỗi ngày, hub điểm thưởng, sưu tầm thẻ) là lý do SME trả thuê bao |
| Nỗi sợ của chủ quán là phát quà quá tay, bị khách gian lận, và nhân viên đổi quà sai | Prize engine (tồn kho, giới hạn, ngân sách, rải đều) cộng với **đổi quà tại quầy** là phần lõi ngay từ đầu |
| Quiz/poll (Kahoot, Slido, AhaSlides) đã rất tốt và có bản miễn phí | **Không làm quiz** |
| Ở VN, Zalo đóng vai trò của WeChat | Zalo (OA, ZNS, đăng nhập) là kênh lõi, không phải tính năng cuối lộ trình |

---

## 3. Khách hàng mục tiêu (ICP)

| Thứ tự | Phân khúc | Vai trò | Vì sao |
|---|---|---|---|
| **#1** | **SME có điểm bán hoặc fanpage**: chuỗi F&B nhỏ (1–30 điểm), cà phê/trà sữa, spa/làm đẹp, gym, nha khoa, bán lẻ, shop online | **Người dùng và người mua** (tự phục vụ) | Số lượng lớn, tự quyết, cần kéo khách tới cửa hàng và giữ khách quay lại. Đây cũng là tệp khách chính của 凡科 |
| #2 | **Agency nhỏ và freelancer marketing** | Kênh bán lại (M4: reseller/OEM như mô hình đại lý của 凡科) | Mỗi agency mang theo nhiều SME |
| #3 | Brand tầm trung, HR | Dùng chung gói; không có tính năng riêng | |

**Persona chính:** *Chị Hà, chủ 3 quán trà sữa.* Chị muốn "vòng quay Tết có ảnh ly trà sữa của quán, mỗi khách quay 1 lần/ngày, quà là topping và giảm 10%, nhân viên quét mã đổi tại quầy", và muốn tự làm xong trong giờ nghỉ.

---

## 4. Định vị

**Với** chủ SME tại Việt Nam,
**khi** muốn kéo khách tới cửa hàng và giữ họ quay lại,
**Playora** là builder minigame có thưởng cho khách chơi trên điện thoại,
**giúp** dựng game mang đúng sản phẩm và thương hiệu của quán (chụp ảnh sản phẩm thành vật phẩm trong game), đặt luật chơi và quà linh hoạt, đổi quà tại quầy và giữ chân khách,
**khác với** WOAY (tuỳ biến chủ yếu ở màu, logo và ảnh quà; bán theo quota lượt), vòng quay miễn phí (không quản lý giải, không đổi quà) và 凡科 (chỉ có ở Trung Quốc, soạn trên PC, gắn với WeChat).

**Ba chiều linh hoạt của builder** (theo thứ tự đầu tư):

1. **Asset:** thay mọi asset slot; tải hoặc chụp ảnh sản phẩm, tự xoá nền.
2. **Luật và giải:** cách phát giải, lượt chơi, khung giờ, quà theo ngày, giới hạn mỗi người, mã tham gia. Viết bằng câu dễ hiểu ("Mỗi khách quay 1 lần/ngày").
3. **Flow:** bật/tắt form, chọn trường thu thập, màn kết quả, nút gọi Zalo hoặc đặt bàn.

4. **Bố cục màn ([ADR-014](./adr/014-free-canvas-screen-editor.md), 25/10/2026):** canvas tự do cho mọi màn (Cover, Form, Kết quả…): đặt chữ, ảnh, nút, sticker ở vị trí tuỳ ý. Cơ chế game vẫn do template vẽ trong khung `gameStage`.

~~**Không** làm editor bố cục tự do (kéo vị trí phần tử).~~ Thay bởi mục 4 ở trên.

---

## 5. Kiến trúc sản phẩm

```
           ┌──────── PLAYORA STUDIO (desktop-first; Đổi quà dùng trên ĐT) ─────────┐
           │ Chợ template (lọc theo ngành, dịp, mục tiêu) · Editor 3 cột (preview  │
           │ điện thoại ở giữa) · Ảnh sản phẩm → asset · Brand kit · Giải · Luật   │
           │ · Kênh/QR · Báo cáo · Đổi quà (vai trò nhân viên)                     │
           └───────────────┬────────────────────────────────────────────────────────┘
                           │ publish (game version bất biến)
                 ┌─────────┴──────────┐
                 ▼                    ▼
        PLAYER (điện thoại) — LÕI   BOOTH (kiosk/tablet tại quầy)
        Link/QR/Zalo, không cài app
                 └─────────┬──────────┘
                           ▼
 PLAYORA CORE
 · Engine instant-win (1 logic, nhiều renderer: vòng quay, cào, mở hộp, đập trứng, lật thẻ, lưới 9 ô, gacha, lắc…)
 · Engine skill + điểm (1 khung: thời gian, điểm, asset slot cộng/trừ: hứng quà, chạm nhanh, đếm tiền, match-3…)
 · Engine giữ chân (điểm danh, bốc mỗi ngày, hub điểm thưởng, sưu tầm thẻ)
 · Prize & Participation · Đổi quà · Anti-fraud · Identity & Consent · Data · Billing/Quota
```

**Ba trụ giá trị (theo thứ tự đầu tư):**

1. **Builder và thư viện:** template × skin × brand kit, chụp ảnh thành asset, dựng từ template trong ≤ 5 phút. *Lõi.*
2. **Prize, đổi quà và tin cậy:** prize engine, đổi quà tại quầy, chống gian lận, log kiểm chứng. *Lý do khách tin.*
3. **Giữ chân:** điểm danh, bốc mỗi ngày, hub điểm, sưu tầm thẻ. *Lý do khách trả thuê bao và ở lại.*

---

## 6. Nguyên tắc sản phẩm

1. **Giải thưởng không được sai.** Server quyết định mọi kết quả trước khi client animate. Không bao giờ vượt tồn kho, ngân sách hay giới hạn người chơi.
2. **Engine ít, renderer và skin nhiều.** Cơ chế mới phải là một renderer trên engine có sẵn, trừ khi nó đáng giá ≥ 10 skin. Ra skin theo mùa đều đặn quan trọng hơn ra engine mới.
3. **Game mobile-first, Studio desktop-first.** Người chơi chơi trên điện thoại, không cài app. Chủ quán soạn và vận hành trên máy tính; riêng màn Đổi quà cho nhân viên quầy phải dùng tốt trên điện thoại (quyết định 25/10/2026).
4. **Nhanh mặc định, sâu khi cần.** Publish từ template ≤ 5 phút; cấu hình nâng cao mở theo từng lớp.
5. **Builder là sản phẩm.** Đội Playora dựng hộ khách **bằng chính Studio**. Cái gì đội thấy khó thì khách cũng sẽ thấy khó.
6. **Minh bạch mặc định.** Không có tính năng định trước người trúng, không có số liệu ảo (người tham gia ảo, phiếu ảo, robot điểm). Quà không ngẫu nhiên đi qua "Tặng quà theo danh sách".

### Không làm (ít nhất đến hết 2027)

- **Quiz / poll / bình chọn / dự đoán.**
- **Game LED / sân khấu realtime** (code lưu ở tag `archive/live-engine`).
- ~~**Editor bố cục tự do**, canvas kéo-thả~~ (đang đề xuất làm, xem [ADR-014](./adr/014-free-canvas-screen-editor.md) và [15](./15-game-builder-plan.md)); vẫn **không** làm editor logic kiểu Epub360.
- **Thương mại**: flash sale, mua nhóm, mặc cả, phân phối hoa hồng.
- **Bộ SaaS đầy đủ** như 凡科 (web, shop, CRM, quản lý cửa hàng).
- Lì xì tiền mặt, cá cược, chia quỹ thưởng, đổi thưởng ra tiền.
- Cơ chế ép rủ bạn bè (gom like, trợ lực, chạy tiếp sức); chỉ cho "thêm lượt khi chia sẻ" có giới hạn.
- Số liệu ảo và upload sẵn danh sách người trúng.
- Check-in bằng khuôn mặt (dữ liệu sinh trắc học theo PDPL).

---

## 7. Lộ trình MVP theo giai đoạn

Ưu tiên **xây đúng và bền** hơn là chạy theo mùa. Tết 2027 là **mùa để học**, không phải mốc doanh thu.

| Mã | Giai đoạn | Thời gian `[GĐ]` | Câu hỏi cần trả lời | Phạm vi cốt lõi | Gate để đi tiếp |
|---|---|---|---|---|---|
| **M0** | Discovery | 26/10 – 15/11/2026 | SME có muốn tự dựng minigame không? Vì sao họ bỏ WOAY hoặc vòng quay miễn phí? | Phỏng vấn ≥ 15 SME (F&B, spa, gym, bán lẻ); tự dựng một game trên WOAY và đo thời gian; prototype editor | ≥ 10/15 SME muốn dùng thử; xác định được 3 điểm WOAY làm khó |
| **M1** | **Builder + instant-win** | 16/11/2026 – 28/02/2027 (pilot Tết) | Chủ quán có tự dựng và chạy được game không? Prize engine và đổi quà có đúng không? | Studio desktop-first (Đổi quà dùng tốt trên điện thoại); **khung engine instant-win** (vòng quay, cào thẻ, mở hộp) và **khung skill** (hứng quà); chụp ảnh → asset; brand kit; prize engine v1 (tỷ lệ, tồn kho, giới hạn, ngân sách, rải đều, khung giờ); voucher; **đổi quà tại quầy + vai trò nhân viên**; link/QR theo kênh; chơi thử bằng link nháp; gói Free (soạn đầy đủ, khoá theo người chơi và số lần publish); dựng hộ miễn phí 10–20 SME | ≥ 10 SME tự dựng; trung vị thời gian publish từ template ≤ 10 phút; **0 sai lệch giải**; ≥ 5 SME sẵn sàng trả tiền |
| **M2** | **Self-serve + giữ chân v1** | 03 – 05/2027 (8/3, 30/4) | SME có tự trả thuê bao không? Tính năng giữ chân có giữ được khách không? | Thanh toán thuê bao (PayOS/VietQR); +renderer instant-win (đập trứng, lật thẻ, lưới 9 ô, gacha, lắc); +skill (đếm tiền, chạm nhanh, đập logo, lật cặp, ghép hình); **điểm danh + bốc mỗi ngày**; OTP ZNS/SMS; Prize Simulator; chợ template công khai lọc theo ngành và dịp (SEO); theme pack theo mùa | ≥ 50 SME trả phí; retention tháng thứ 2 ≥ 60% |
| **M3** | **Giữ chân v2 + Zalo** | 06 – 09/2027 (hè, Trung thu) | Giữ chân có tăng ARPA và retention không? | **Hub điểm thưởng**, **sưu tầm thẻ** (không rủ bạn); Zalo OA/đăng nhập/ZNS; mã tham gia có QR riêng; kiosk tại quầy | ≥ 200 SME trả phí; ≥ 40% dùng tính năng giữ chân |
| **M4** | **Scale + kênh** | 10 – 12/2027 (Tết 2028) | Có nhân rộng qua kênh được không? | Agency/reseller; tích hợp POS (KiotViet, Sapo, Haravan); **up hoá đơn để được lượt** (duyệt tay, OCR về sau); AI sinh skin từ brand kit; webhook/API | 1.000 SME trả phí mùa Tết 2028 |
| Later | Platform & SEA | 2028 | | Game SDK công khai và marketplace; SEA | |

**Lý do sắp xếp:**
- M1 dồn vào **builder và hai khung engine**, vì đây là phần khó sao chép và mọi thứ sau đều xây trên nó. Chỉ 4 renderer nhưng khung phải đúng.
- Đổi quà tại quầy lên M1, vì kịch bản chính của SME là QR tại quầy → quay → đổi quà.
- Giữ chân vào M2–M3, khi đã có khách để đo retention.
- Zalo vào M3, sớm hơn M4 cũ, vì đây là kênh của SME.

---

## 8. Chỉ số

| Cấp | Chỉ số | Mục tiêu `[GĐ]` |
|---|---|---|
| **North Star** | **Số SME có ít nhất một campaign đang chạy với người chơi hợp lệ trong tháng** | 10 (pilot) → 1.000 (12/2027) |
| Builder (lõi) | Trung vị thời gian từ chọn template đến publish | M1 ≤ 10 phút · M2 ≤ 5 phút |
| Builder | % campaign tự dựng không cần hỗ trợ | M1 ≥ 50% · M2 ≥ 80% |
| Builder | % campaign dùng ảnh của chính SME (chụp hoặc upload) | ≥ 60% |
| Prize | Sai lệch tồn kho / vượt ngân sách / vượt giới hạn | 0 |
| Player | Tỷ lệ quét QR → chơi lượt đầu | ≥ 70% |
| Giữ chân | % người chơi quay lại trong 7 ngày (campaign bật giữ chân) | ≥ 25% |
| Kinh doanh | SME trả phí · retention thuê bao tháng 2 | M2: 50 · ≥ 60% |
| Hài lòng | NPS chủ SME | ≥ 40 |

---

## 9. Giả định rủi ro nhất và cách kiểm chứng

| # | Giả định | Kiểm chứng ở | Bằng chứng cần có | Nếu sai thì |
|---|---|---|---|---|
| A1 | SME chọn Playora thay vì WOAY hay vòng quay miễn phí vì builder linh hoạt hơn (ảnh sản phẩm của chính họ, luật và giải sâu hơn) | M0, M1 | Lý do chọn được ghi trong phỏng vấn; ≥ 60% campaign dùng ảnh riêng | Cạnh tranh bằng kho skin theo mùa và giá |
| A2 | Chủ SME tự dựng được trong ≤ 10 phút | M1 | Đo thời gian của ≥ 10 SME | Thêm wizard, giảm cấu hình mặc định, tăng dựng hộ |
| A3 | SME trả **thuê bao** cho minigame, không chỉ mua một lần theo mùa | M2 | Retention tháng 2 ≥ 60% | Bán theo campaign hoặc theo mùa, giữ thuê bao cho gói có giữ chân |
| A4 | Tính năng giữ chân làm khách quay lại và làm SME ở lại | M2, M3 | Người chơi quay lại 7 ngày ≥ 25% | Tập trung vào campaign theo mùa |
| A5 | SEO, chợ template công khai và gói Free kéo được SME với CAC thấp | M2 | CAC ≤ 3 tháng thuê bao | Đẩy kênh agency/reseller và POS lên sớm |
| A6 | Prize engine giữ đúng tồn kho và ngân sách dưới tải | M1 | Test 1 triệu lượt mô phỏng + load test: 0 sai lệch | Khoá chặt hơn (serialize theo campaign) |

---

## 10. Thay đổi so với v1.0

| Hạng mục | v2.1 | **v3.0** | Lý do |
|---|---|---|---|
| ICP #1 | Agency digital/activation | **SME có điểm bán hoặc fanpage** | Chưa có khách agency; mô hình 凡科 thắng nhờ SME số lượng lớn |
| Agency | Người mua và kênh, white-label ở M2 | **Kênh bán lại ở M4** | Theo ICP mới |
| Hình mẫu | 凡科 về sản phẩm, agency về kinh doanh | **凡科 cả sản phẩm và đối tượng khách**, chỉ lấy mảng hoạt động marketing | [14](./14-guandayun-teardown.md) |
| Khác biệt với WOAY | Skin theo mùa, prize engine, lớp agency | **Builder linh hoạt hơn** (asset, luật/giải, flow) và **game mobile-first** | Quyết định 24–25/10/2026 |
| Studio | Desktop (editor 3 cột) | **Desktop-first** (editor 3 cột, preview điện thoại ở giữa); chỉ game và màn Đổi quà là mobile-first | Người chơi dùng điện thoại, chủ quán soạn trên máy tính (sửa 25/10/2026; bản nháp trước ghi Studio mobile-first) |
| Kiến trúc game | Từng template là một game | **2 engine (instant-win, skill + điểm) với nhiều renderer**, cộng engine giữ chân | 1.709 template của 凡科 chạy trên 111 engine |
| Giữ chân | Không có | **Có** (điểm danh, bốc mỗi ngày ở M2; hub điểm, sưu tầm thẻ ở M3) | Lý do SME trả thuê bao |
| Up hoá đơn để được lượt | M4 | **M4** (giai đoạn sau) | Quyết định 25/10/2026 |
| Đổi quà tại quầy | M2 | **M1** | Kịch bản lõi của SME |
| Zalo | M4 | **M3** | Kênh của SME |
| Giá | Theo campaign (Campaign Pass, gói Agency năm) | **Thuê bao tháng/năm cho SME**; Free soạn đầy đủ, khoá theo người chơi và số lần publish | Theo ICP mới; cập nhật chi tiết ở [02](./02-business-model.md) |
| M1 | "Tết Campaign", gate 10 campaign trả phí | **"Builder + instant-win"**, Tết là mùa học, gate theo chỉ số học | Ưu tiên xây bền hơn kịp Tết |
| North Star | Lượt chơi hợp lệ trên campaign trả phí | **SME có campaign đang chạy trong tháng** | Phù hợp mô hình thuê bao |
| Quiz | Không làm | **Không làm** (xác nhận lại) | |

**v2.1 (24/10/2026):** bỏ Live add-on (game LED, Host Console, màn hình lớn). Code realtime lưu ở tag `archive/live-engine`.
**v2.0:** lõi chuyển từ game LED sang minigame có thưởng cho campaign.
