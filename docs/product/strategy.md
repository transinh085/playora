# Chiến lược sản phẩm Playora

Phiên bản: **v4.0** · 26/10/2026 · Owner: PO (founder) · **Nguồn chân lý** cho định hình sản phẩm: khi tài liệu khác mâu thuẫn với file này thì file này đúng.

Liên quan: [prd.md](./prd.md) · [roadmap.md](./roadmap.md) · [decisions.md](./decisions.md) · [business-model](../business/business-model.md) · nghiên cứu ở [research/](../research/)

---

## 1. Sản phẩm trong một câu

> **Playora giúp quán nhỏ kéo khách tới và giữ khách quay lại bằng minigame có thưởng mang đúng sản phẩm của quán: dựng trong vài phút, giải không bao giờ phát sai, đổi quà ngay tại quầy, và báo lại bằng con số chủ quán hiểu (bao nhiêu khách đã đến, bao nhiêu quay lại, tốn bao nhiêu).**

- **Category:** Mobile Game Campaign Builder cho SME. Hình mẫu sản phẩm là 凡科互动 ([teardown](../research/guandayun-teardown.md)), chỉ lấy mảng hoạt động marketing.
- **Tagline** `[GĐ]`: *"Minigame kéo khách về quán."*

### 1.1 Builder là lõi, kết quả là thứ để bán

Chủ quán không mua "game builder", họ mua **khách tới quán**. Builder vẫn là phần khó và là tài sản lõi của Playora, nhưng mọi màn hình, thông điệp và chỉ số phải trả lời câu hỏi của chủ quán: *"Chương trình này mang lại gì cho tôi?"*

| Ta xây | Chủ quán thấy |
|---|---|
| Builder (template × skin × canvas) | "Có game mang ảnh ly trà sữa của quán trong 5 phút" |
| Prize engine (tồn kho, pacing, ngân sách) | "Không bao giờ phát quá số quà tôi đặt" |
| Đổi quà tại quầy | "Biết chắc khách đã đến quán" |
| Giữ chân (điểm danh, bốc mỗi ngày…) | "Khách quay lại lần 2, lần 3" |
| Báo cáo | "Chi 1,4 triệu tiền quà, 312 khách tới quầy, 97 khách quay lại" |

Hệ quả cho cách làm việc: **không thêm tính năng builder nào chỉ vì nó đẹp hơn về kỹ thuật.** Mỗi việc phải gắn với một bước của vòng giá trị ở §2.

---

## 2. Vòng giá trị

```
 Thu hút ─► Chơi ─► Để lại liên hệ ─► Đổi quà TẠI QUẦY ─► Nhắc quay lại ─► Báo cáo kết quả
 (QR bàn,   (game     (SĐT/Zalo,       (lượt ghé quán      (lượt mới, ZNS,   (khách tới, quay
  fanpage)   của quán)  có consent)      đã xác thực)        voucher sắp hết)  lại, chi phí)
    ▲                                                            │
    └────────────────────── khách quay lại ◄─────────────────────┘
```

Đối thủ làm tốt bước "Chơi". Khoảng trống là **bước 4 đến 6**: đổi quà tại quầy biến một lượt chơi thành **một lượt ghé quán đã xác thực**, thứ vòng quay online không đo được. Đây là dữ liệu attribution của Playora.

---

## 3. Sự thật thị trường và hệ quả

| Sự thật | Hệ quả |
|---|---|
| 凡科 có ~1.700 template trên ~111 engine; phần lớn game bốc thăm dùng chung một logic ([teardown §1](../research/guandayun-teardown.md#1-tóm-tắt)) | Ít engine, nhiều renderer và skin. Kho mẫu lớn đến từ dây chuyền skin |
| WOAY quảng cáo "5 phút" nhưng chỉ đổi màu, logo, ảnh quà; bán quota lượt/ngày ([market](../research/market-research.md)) | Builder dùng **ảnh sản phẩm của chính quán** và luật/giải sâu hơn; giá không phạt khách chơi nhiều |
| Chủ SME (F&B, spa, gym, bán lẻ) không có designer, không có thời gian | Bắt đầu từ **mục tiêu** (playbook), không bắt đầu từ trang trắng; publish ≤ 5 phút |
| Nỗi sợ lớn nhất: phát quà quá tay, gian lận, nhân viên đổi sai | Prize engine + đổi quà tại quầy là lõi từ ngày đầu |
| SME cần khách **quay lại**, không chỉ một lần dịp Tết | Giữ chân là lý do trả thuê bao |
| Ở VN, Zalo đóng vai trò WeChat | Zalo (OA, ZNS, đăng nhập) là kênh lõi |
| Quiz/poll đã có Kahoot, Slido, AhaSlides miễn phí | Không làm quiz |

---

## 4. Khách hàng mục tiêu

| Thứ tự | Phân khúc | Vai trò |
|---|---|---|
| **#1 (beachhead)** | **Quán đồ uống và ăn nhẹ** (cà phê, trà sữa, tiệm bánh) 1–30 điểm bán | Người dùng và người mua, tự phục vụ |
| #2 | SME có điểm bán khác: spa/làm đẹp, gym, nha khoa, bán lẻ; shop online có fanpage | Mở rộng khi playbook F&B đã chạy |
| #3 | Agency nhỏ, freelancer marketing | Kênh bán lại (M4) |
| — | Brand lớn, HR nội bộ | Dùng gói chung, không có tính năng riêng |
| Tương lai | Agency làm cho nhãn hàng (M4); nhãn hàng tiêu dùng chạy minigame trực tiếp cho người tiêu dùng (sau Gate M3) | Persona tương lai ở [prd §2.2](./prd.md#22-persona-tương-lai-m3m4-chưa-xây-tính-năng-riêng); không có tính năng riêng trước Gate M3, chỉ giữ thiết kế không đóng cửa ([D-27](./decisions.md)) |

**Vì sao chọn một ngành trước:** một người làm không thể viết playbook, skin, case study và số liệu benchmark cho mười ngành cùng lúc. F&B đồ uống có tần suất ghé cao, quà rẻ (topping, size up), quầy thu ngân sẵn để đổi quà, và đông nhất trong tệp của 凡科. Chọn lại nếu phỏng vấn M0 cho thấy ngành khác đau hơn ([decisions D-17](./decisions.md)).

**Persona chính: chị Hà, chủ 3 quán trà sữa.** *"Tết này tôi muốn khách quay lại nhiều hơn quán bên cạnh. Quà là topping với giảm 10%, mỗi khách quay một lần mỗi ngày, nhân viên quét mã đổi tại quầy. Tôi tự làm trong giờ nghỉ trưa được không, và cuối tháng có biết là có lời không?"*

---

## 5. Định vị

**Với** chủ quán nhỏ tại Việt Nam,
**khi** cần kéo khách tới quán và giữ khách quay lại,
**Playora** là công cụ minigame có thưởng chạy trên điện thoại khách,
**giúp** có ngay game mang đúng sản phẩm của quán, phát quà trong ngân sách, đổi quà tại quầy và thấy rõ bao nhiêu khách đã tới và quay lại,
**khác với** WOAY (tuỳ biến ở mức màu/logo/ảnh quà, báo cáo theo lượt chơi, bán quota lượt), vòng quay miễn phí (không quản lý giải, không đổi quà, không dữ liệu) và 凡科 (chỉ ở Trung Quốc, gắn WeChat).

### 5.1 Ba lớp khác biệt (thứ tự đầu tư)

1. **Builder nhanh và đúng chất quán** *(lõi, khó sao chép)*: playbook theo mục tiêu → template × skin → **Sửa nhanh** bằng ô thay thế (logo, ảnh sản phẩm, chữ khuyến mãi) → **Tuỳ biến** canvas tự do khi cần ([ADR-014](../adr/014-free-canvas-screen-editor.md)) → **Luật & giải** viết bằng câu dễ hiểu. Đặc tả: [specs/builder.md](./specs/builder.md).
2. **Giải đúng và đổi quà tin được** *(lý do tin)*: prize engine, mô phỏng phát giải, đổi quà tại quầy không hoàn tác, chống gian lận, log kiểm chứng. Đặc tả: [specs/prizes-redemption.md](./specs/prizes-redemption.md).
3. **Kết quả đo được và khách quay lại** *(lý do trả tiền và ở lại)*: báo cáo theo ngôn ngữ chủ quán, giữ chân (điểm danh, bốc mỗi ngày, hub điểm, sưu tầm thẻ), nhắc quay lại qua Zalo. Đặc tả: [specs/playbooks.md](./specs/playbooks.md), [specs/participation.md](./specs/participation.md).

---

## 6. Kiến trúc sản phẩm

```
 ┌──────── PLAYORA STUDIO (desktop-first; màn Đổi quà dùng tốt trên điện thoại) ────────┐
 │ Playbook theo mục tiêu · Kho mẫu (ngành × dịp) · Builder: Sửa nhanh / Tuỳ biến /    │
 │ Luật & giải · Brand kit · Chia sẻ & QR · Vận hành · Báo cáo kết quả · Đổi quà        │
 └──────────────────────────────┬─────────────────────────────────────────────────────────┘
                                │ publish (phiên bản bất biến)
                ┌───────────────┴────────────────┐
                ▼                                ▼
     PLAYER (điện thoại khách) — LÕI      KIOSK (tablet tại quầy, sau)
     link/QR/Zalo, không cài app
                └───────────────┬────────────────┘
                                ▼
 PLAYORA CORE
 · Engine instant-win (1 logic, nhiều renderer: vòng quay, cào, mở hộp, đập trứng, lật thẻ…)
 · Engine skill + điểm (hứng quà, chạm nhanh, đếm tiền…)
 · Engine giữ chân (điểm danh, bốc mỗi ngày, hub điểm, sưu tầm thẻ)
 · Prize & Participation · Đổi quà · Chống gian lận · Danh tính & Consent · Báo cáo · Gói/Quota
```

Kiến trúc kỹ thuật: [engineering/architecture.md](../engineering/architecture.md).

---

## 7. Nguyên tắc sản phẩm

1. **Bắt đầu từ mục tiêu của quán.** Màn đầu của luồng tạo hỏi "Bạn muốn gì?" (kéo khách ngày vắng, khách quay lại lần 2, Tết…), không hỏi "Chọn game nào?". Builder đầy đủ vẫn mở cho ai cần.
2. **Giải thưởng không được sai.** Server quyết định mọi kết quả trước khi client animate. Không bao giờ vượt tồn kho, ngân sách hay giới hạn người chơi.
3. **Báo cáo bằng kết quả kinh doanh.** Ưu tiên "khách tới quầy", "khách quay lại", "chi phí quà so với ngân sách" hơn "lượt chơi".
4. **Engine ít, renderer và skin nhiều.** Cơ chế mới phải là renderer trên engine có sẵn, trừ khi nó đáng giá ≥ 10 skin.
5. **Game mobile-first, Studio desktop-first.** Riêng màn Đổi quà dùng tốt trên điện thoại.
6. **Nhanh mặc định, sâu khi cần.** Publish từ playbook ≤ 5 phút; cấu hình nâng cao mở theo lớp.
7. **Builder là sản phẩm.** Playora dựng hộ khách bằng chính Studio. Cái gì mình thấy khó thì khách cũng thấy khó.
8. **Minh bạch mặc định.** Không định trước người trúng, không số liệu ảo. Quà không ngẫu nhiên đi qua "Tặng quà theo danh sách".
9. **Không xây khi chưa có người dùng cần.** Tính năng mới cần một bước trong vòng giá trị (§2) và một bằng chứng từ khách (phỏng vấn, pilot, số liệu).

### Không làm (ít nhất đến hết 2027)

- Quiz, poll, bình chọn, dự đoán.
- Game LED/sân khấu realtime (code lưu ở tag `archive/live-engine`, [ADR-011](../adr/011-remove-live-engine.md)).
- Editor logic kiểu Epub360 (canvas tự do chỉ là lớp trình bày, [ADR-014](../adr/014-free-canvas-screen-editor.md)).
- Thương mại: flash sale, mua nhóm, mặc cả, hoa hồng.
- Bộ SaaS đầy đủ như 凡科 (web, shop, CRM, quản lý cửa hàng, POS).
- Lì xì tiền mặt, cá cược, chia quỹ thưởng, đổi thưởng ra tiền.
- Cơ chế ép rủ bạn (gom like, trợ lực); chỉ "thêm lượt khi chia sẻ" có giới hạn.
- Số liệu ảo, upload sẵn danh sách người trúng.
- Check-in bằng khuôn mặt (dữ liệu sinh trắc học).

---

## 8. Chỉ số

| Cấp | Chỉ số | Mục tiêu `[GĐ]` |
|---|---|---|
| **North Star** | **Lượt đổi quà tại quầy mỗi tháng** (lượt ghé quán đã xác thực), trên mọi quán đang dùng | Pilot Tết: 1.000 → 12/2027: 100.000 |
| Kích hoạt | Số quán có ≥ 1 chương trình đang chạy và ≥ 30 lượt đổi quà trong tháng | Pilot: 5 → M2: 50 → 12/2027: 1.000 |
| Kết quả cho quán | % khách đổi quà quay lại lần 2 trong 30 ngày | ≥ 20% |
| Kết quả cho quán | Chi phí quà trung bình cho mỗi lượt ghé quán | Báo được cho 100% chương trình |
| Builder | Trung vị thời gian từ chọn playbook đến publish | M1 ≤ 10 phút · M2 ≤ 5 phút |
| Builder | % chương trình tự dựng không cần hỗ trợ | M1 ≥ 50% · M2 ≥ 80% |
| Builder | % chương trình dùng ảnh của chính quán | ≥ 60% |
| Prize | Sai lệch tồn kho / vượt ngân sách / vượt giới hạn | **0** |
| Player | Tỷ lệ quét QR → chơi lượt đầu | ≥ 70% |
| Kinh doanh | Quán trả phí · retention thuê bao tháng 2 | M2: 50 · ≥ 60% |
| Hài lòng | NPS chủ quán | ≥ 40 |

Vì sao North Star là lượt đổi quà: nó chỉ tăng khi cả vòng giá trị chạy (game hấp dẫn, quà hợp lý, khách thật sự tới quán), và nó là con số chủ quán sẵn lòng trả tiền. "Lượt chơi" tăng được bằng bot; "lượt đổi quà" thì không.

---

## 9. Giả định rủi ro nhất

| # | Giả định | Kiểm chứng ở | Bằng chứng cần có | Nếu sai thì |
|---|---|---|---|---|
| A1 | Chủ quán chọn Playora vì thấy khách tới quán và quay lại (kết quả), và vì game mang sản phẩm của họ (builder) | M0, pilot | Lý do chọn trong phỏng vấn; quán gia hạn sau pilot | Cạnh tranh bằng kho skin theo mùa và giá |
| A2 | Chủ quán tự dựng được trong ≤ 10 phút từ playbook | Pilot | Đo ≥ 10 quán | Thêm wizard, giảm mặc định, dựng hộ |
| A3 | Nhân viên quầy chịu quét mã đổi quà trong giờ đông khách | Pilot | ≥ 80% quà hiện vật được đổi qua màn Đổi quà | Cho tự đổi bằng PIN, đổi bằng mã ngắn |
| A4 | Quán trả **thuê bao**, không chỉ mua theo mùa | M2 | Retention tháng 2 ≥ 60% | Bán theo chương trình, thuê bao cho gói có giữ chân |
| A5 | Giữ chân làm khách quay lại | M2–M3 | Quay lại 30 ngày ≥ 20% | Tập trung chương trình theo mùa |
| A6 | SEO, chợ mẫu công khai, gói Free và watermark kéo được quán với CAC thấp | M2 | CAC ≤ 3 tháng thuê bao | Kênh agency/POS sớm hơn |
| A7 | Prize engine đúng dưới tải | M1 | 1 triệu lượt mô phỏng + load test: 0 sai lệch | Serialize theo chương trình |

Cách phỏng vấn: [customer-interview-guide](../research/customer-interview-guide.md).

---

## 10. Lộ trình

Tóm tắt ở đây; chi tiết, gate và backlog theo tuần ở [roadmap.md](./roadmap.md).

| Mã | Giai đoạn | Thời gian `[GĐ]` | Câu hỏi | Gate |
|---|---|---|---|---|
| **M0** | Discovery (song song P0) | 26/10 – 22/11/2026 | Quán F&B có muốn và tự dựng được không? Họ đo hiệu quả khuyến mại thế nào? | ≥ 15 cuộc phỏng vấn; ≥ 5 quán nhận pilot Tết |
| **M1** | Vòng lõi + pilot Tết | 26/10/2026 – 28/02/2027 | Vòng QR → chơi → đổi quà → báo cáo có chạy thật ở quán không? | 0 sai lệch giải; ≥ 5 quán chạy; ≥ 1.000 lượt đổi quà; ≥ 3 quán muốn trả tiền |
| **M2** | Self-serve + giữ chân v1 | 03 – 05/2027 | Quán có tự trả thuê bao và tự dựng không? | ≥ 50 quán trả phí; retention tháng 2 ≥ 60% |
| **M3** | Zalo + giữ chân v2 | 06 – 09/2027 | Giữ chân có tăng retention và ARPA không? | ≥ 200 quán trả phí |
| **M4** | Kênh + Tết 2028 | 10 – 12/2027 | Nhân rộng qua kênh được không? | 1.000 quán trả phí mùa Tết 2028 |

Tết 2027 là **mùa để học**, không phải mốc doanh thu.

---

## 11. Lịch sử phiên bản

| Phiên bản | Ngày | Thay đổi chính |
|---|---|---|
| **v4.0** | 26/10/2026 | Builder vẫn là lõi, nhưng **định vị theo kết quả**: playbook theo mục tiêu, báo cáo kết quả, North Star đổi từ "SME có chương trình chạy" sang **lượt đổi quà tại quầy**; beachhead F&B đồ uống; lộ trình theo năng lực một người; tài liệu chia thư mục |
| v3.0 | 25/10/2026 | ICP #1 đổi từ agency sang SME; hình mẫu 凡科; 2 engine + engine giữ chân; Studio desktop-first, game mobile-first; đổi quà tại quầy lên M1; Zalo lên M3; giá thuê bao |
| v2.1 | 24/10/2026 | Bỏ Live add-on (game LED, Host Console, Screen) |
| v2.0 | 23/10/2026 | Lõi chuyển từ game LED sang minigame có thưởng cho campaign |

Bản cũ còn đọc được trong lịch sử git và ở [archive/](../archive/). Danh sách từng quyết định: [decisions.md](./decisions.md).
