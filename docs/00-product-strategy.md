# 00 — Chiến lược sản phẩm Playora

Phiên bản: v1.0 · 23/10/2026 · Owner: Head of Product · Tài liệu "nguồn chân lý" về định hình sản phẩm. Mọi tài liệu khác phải nhất quán với file này.

> Cơ sở: [01-market-research.md](./01-market-research.md), [11-game-builder-research.md](./11-game-builder-research.md). Thay đổi so với v0.1 được tóm tắt ở §10.

---

## 1. Một câu định nghĩa sản phẩm

> **Playora là nền tảng dựng và vận hành game tương tác *tại sự kiện* cho agency và doanh nghiệp Việt Nam, từ sân khấu LED đến booth activation. Dựng trong 30 phút từ template, hàng nghìn người chơi cùng lúc bằng điện thoại, giải thưởng minh bạch và đo được.**

- **Category:** *Event Game Builder*. Không phải "phần mềm quay số", không phải "minigame marketing online", không phải "slide tương tác".
- **Tagline:** *"Cả hội trường cùng chơi."*

---

## 2. Vấn đề và cơ hội (rút từ nghiên cứu)

| Sự thật thị trường | Hệ quả chiến lược |
|---|---|
| Quay số và check-in tại VN đã là hàng phổ thông (0,25–4 triệu đ/sự kiện) | **Không cạnh tranh bằng quay số.** Cho free ở quy mô nhỏ, dùng làm cửa vào |
| Không ai ở VN có **game nhiều người realtime trên LED** dựng bằng builder. Hiện chỉ agency làm riêng, giá hàng chục triệu, hay sập | **Đây là wedge**: thứ khách thấy "wow" và sẵn sàng trả tiền |
| Người mua phải ghép 2–3 nhà cung cấp (check-in + quay số + game + báo cáo) | **Bán gói trọn "một đêm sự kiện"** trên một nền tảng, một dữ liệu |
| Builder Trung Quốc (Guandayun/凡科) thắng nhờ **template × skin theo mùa** + prize engine đầy đủ + **mạng lưới đại lý OEM** | Kiến trúc template + skin; đi qua **kênh agency/white-label** |
| WOAY mạnh ở minigame online cho bán lẻ, không có live | **Không đối đầu WOAY ở online**; chỉ mở rộng sang booth/activation (vẫn là "tại sự kiện") |
| Builder quốc tế đắt (USD/EUR), không có Zalo, không có văn hoá Tết/YEP | Lợi thế bản địa: Zalo/ZNS, VietQR, hoá đơn VAT, theme Tết/YEP, thể lệ khuyến mại VN |

---

## 3. Khách hàng mục tiêu (ICP)

| Thứ tự | Phân khúc | Vai trò | Vì sao |
|---|---|---|---|
| **#1** | **Agency sự kiện & activation** (5–50 nhân sự, 30–200 sự kiện/năm) | **Người mua + kênh phân phối** | Mua lặp lại; mỗi agency mang theo hàng chục brand; cần white-label; đau nhất về "dev game chậm/đắt/sập" |
| **#2** | **HR / Internal comms** của doanh nghiệp 200–3.000 nhân sự | Người mua theo mùa (YEP, Family Day, hội nghị nội bộ) | Tự phục vụ bằng template YEP; quyết định nhanh; lan truyền qua người tham dự |
| #3 | Brand marketing (FMCG, F&B, bank, BĐS) | Mua **qua agency** ở giai đoạn đầu | Ngân sách lớn nhưng chu kỳ bán dài; cần case study |
| Không ưu tiên | Shop online, SME bán lẻ cần minigame online | — | Sân của WOAY và Zalo Mini App; ARPA thấp |

**Persona chính:** *Linh, PM agency*, cần "game có logo khách, chạy cho 800 người, tối thứ Bảy này, không được sập, có báo cáo gửi client sáng thứ Hai".

---

## 4. Định vị

**Với** agency sự kiện và doanh nghiệp tổ chức sự kiện tại Việt Nam,
**khi** cần khoảnh khắc tương tác có thương hiệu cho hàng trăm đến hàng nghìn người,
**Playora** là nền tảng game sự kiện
**giúp** dựng game trong 30 phút, chạy ổn định cho cả hội trường, quản lý giải minh bạch và có báo cáo ngay sau sự kiện,
**khác với** phần mềm quay số (chỉ có quay số), slide tương tác (chỉ có quiz/poll), minigame online (không chạy được sân khấu) hay thuê dev làm riêng (chậm, đắt, rủi ro).

---

## 5. Kiến trúc sản phẩm: 3 bề mặt + 1 builder + 1 lõi

```
                         ┌──────────────── PLAYORA STUDIO (Builder) ────────────────┐
                         │ Template gallery · Editor (flow + form + preview) · Skin │
                         │ Brand kit · Run-of-show · Prize setup · Reports          │
                         └───────────────┬──────────────────────────────────────────┘
                                         │ publish (game version bất biến)
      ┌──────────────────────────────────┼───────────────────────────────────────┐
      ▼                                  ▼                                       ▼
 STAGE (Screen + Host)            AUDIENCE (Player – phone)               BOOTH (Kiosk/Tablet)
 LED, máy chiếu; MC điều khiển      Quét QR, không cài app                  Activation, triển lãm
 bằng điện thoại                    Chơi live / nhận quà                    Auto-reset, offline (sau)
      └──────────────────────────────────┼───────────────────────────────────────┘
                                         ▼
               PLAYORA CORE: Live Engine (realtime rooms) · Prize & Participation Engine ·
               Identity & Consent · Anti-cheat · Data & Insights · Billing/Quota
```

**Bốn trụ giá trị (theo thứ tự đầu tư):**

1. **Live Engine:** game nhiều người trên LED (shake/tap race, quiz, kéo co, đếm tiền, nghi thức khởi động). *Wedge.*
2. **Builder:** template × skin × brand kit, flow chuẩn, auto-form, preview thật, run-of-show. *Lõi.*
3. **Prize & Trust:** lucky draw minh bạch (lọc pool, commit–reveal, biên bản), prize engine, đổi quà. *Lý do khách tin.*
4. **Agency layer:** client workspace, white-label, báo cáo gửi client, template riêng. *Lý do khách ở lại và kênh tăng trưởng.*

---

## 6. Nguyên tắc sản phẩm

1. **Sân khấu không được sập.** Độ ổn định realtime đứng trên mọi tính năng mới. Mọi game live phải có degrade mode và rehearsal.
2. **Cơ chế ít, skin nhiều.** Mỗi cơ chế mới phải đáng giá ≥ 10 skin. Gallery = cơ chế × skin × dịp.
3. **Builder là sản phẩm, không phải công cụ nội bộ.** Ngay từ MVP, đội Playora dựng sự kiện cho khách **bằng chính Studio**. Cái gì đội ops thấy khó thì khách cũng sẽ thấy khó.
4. **Minh bạch mặc định.** Server quyết định kết quả, log có thể kiểm chứng; không có tính năng "định trước người trúng".
5. **Tại sự kiện trước, online sau.** Mọi tính năng phải trả lời được: "giúp gì cho một sự kiện thật?".
6. **Agency là khách hàng hạng nhất.** Mọi màn hình đều nghĩ tới trường hợp "một người quản lý 20 client".

### Không làm (ít nhất đến hết 2027)

- Canvas kéo-thả tự do hoặc editor logic kiểu Epub360.
- Minigame online thuần cho shop/bán lẻ cạnh tranh trực tiếp WOAY (chỉ phục vụ khi đi kèm activation).
- Cash/red packet, cá cược, đổi thưởng ra tiền.
- Event management đầy đủ (bán vé, agenda, seating).
- Check-in bằng khuôn mặt (dữ liệu sinh trắc học nhạy cảm theo PDPL).

---

## 7. Lộ trình MVP theo giai đoạn

| Mã | Giai đoạn | Thời gian | Câu hỏi cần trả lời | Phạm vi cốt lõi | Gate để đi tiếp |
|---|---|---|---|---|---|
| **M0** | Discovery & Foundation | 26/10 – 06/11/2026 | Agency/HR có trả tiền cho game LED nhiều người không? Kỹ thuật realtime có đạt? | 18 phỏng vấn, pre-sale, 5 spike, monorepo, design system | ≥ 3 cọc pilot; spike realtime đạt |
| **M1** | **MVP "YEP Live"** (concierge + assisted builder) | 09/11 – 11/12/2026, pilot 12/12/2026 – 05/02/2027 | Game LED có tạo "wow" và sẵn sàng trả cao hơn quay số? Builder có dựng được sự kiện thật không? | Live Engine; Screen/Host/Player; **4 game**: check-in wall, live quiz, shake/tap race (đội), lucky draw minh bạch; Studio *assisted* (auto-form, brand kit, 2 skin YEP/Tết, guest list); rehearsal + bot | 12+ sự kiện, ≥ 5.000 người chơi, 0 sự cố P1, ≥ 3 sự kiện **agency tự dựng**, NPS ≥ 40, ≥ 50% muốn trả giá Live Pass |
| **M2** | **Live Self-serve & Agency** | 22/02 – 30/04/2027 | Khách có tự dựng và tự trả tiền không? Agency có bán lại không? | Builder tự phục vụ hoàn chỉnh (flow, preview, pre-flight, theme pack); +5 game live; client workspace, white-label cơ bản; Live Pass + gói Agency (PayOS); báo cáo PDF + biên bản quay thưởng | ≥ 20 khách trả phí, ≥ 5 agency trả phí, ≥ 60% sự kiện tự dựng không cần hỗ trợ |
| **M3** | **Booth & Activation** | 03/05 – 30/07/2027 | Mở rộng từ sân khấu sang booth/activation của brand (qua agency) có ra tiền không? | Async game engine (instant-win + skill); prize engine đầy đủ (pacing, voucher, simulator); đổi quà staff mode; kiosk mode; mã tham gia, OTP ZNS; link theo kênh; gói Campaign Pro | ≥ 10 activation trả phí, 0 sai lệch giải, ARPA agency tăng ≥ 30% |
| **M4** | **Scale & Platform** | 08 – 12/2027 (bán YEP 2027 từ 09) | Có nhân rộng được qua kênh và mùa YEP 2027 không? | 20.000 CCU; custom domain; webhook/API; Zalo login/Mini App; AI draft; template riêng của org; kiosk offline; reseller/OEM; SSO | 1.000 sự kiện mùa YEP 2027, 50 agency, MRR theo kế hoạch |
| Later | Platform & SEA | 2028 | | Game SDK công khai + marketplace; SEA (en/id/th); OCR hoá đơn; ClickHouse | |

**Lý do sắp xếp như vậy:**
- **M1 phải ra kịp YEP** (cửa sổ học lớn nhất năm), nên chỉ làm Live và đội ops cùng agency đối tác dựng bằng builder bản *assisted*.
- **M2 rơi vào mùa hội nghị và ra mắt sản phẩm (03–05):** vẫn là live, nhưng phải tự phục vụ để nhân rộng.
- **M3 vào mùa hè và activation (06–08):** mở sang booth.
- **M4 chuẩn bị YEP 2027:** quy mô và kênh.

---

## 8. Chỉ số

| Cấp | Chỉ số | Mục tiêu |
|---|---|---|
| **North Star** | **Người chơi tham gia trên sự kiện trả phí / tháng** | 5.000 (pilot) → 150.000 (12/2027) |
| Builder (lõi) | % sự kiện khách **tự dựng** không cần Playora hỗ trợ | M1 ≥ 25% · M2 ≥ 60% · M4 ≥ 80% |
| Builder | Thời gian trung vị từ tạo đến publish | M1 ≤ 60 phút · M2 ≤ 30 phút |
| Live | Tỷ lệ quét QR → vào chơi thành công | ≥ 80% |
| Live | Sự cố P1 (gián đoạn sân khấu > 1 phút) | 0 |
| Kinh doanh | Paying customers / agency trả phí | M2: 20/5 · M4: 300/50 |
| Kinh doanh | ARPA agency | ≥ 5 triệu đ/tháng (M4) |
| Hài lòng | NPS organizer | ≥ 40 (M1) → ≥ 50 (M4) |

---

## 9. Giả định rủi ro nhất và cách kiểm chứng

| # | Giả định | Kiểm chứng ở | Bằng chứng cần có | Nếu sai thì |
|---|---|---|---|---|
| A1 | Khách trả cao hơn mức quay số (~1–4tr) vì có game LED nhiều người | M0 (pre-sale), M1 | ≥ 50% pilot chấp nhận giá Live Pass M (2,49tr) cho ≤ 1.000 người | Giảm giá, bán theo bundle với agency, tăng tỷ trọng dịch vụ |
| A2 | Agency sẽ **tự dựng** bằng builder thay vì nhờ dev | M1, M2 | ≥ 3 agency tự dựng trong pilot; ≥ 60% ở M2 | Chuyển sang mô hình "managed service + template", tăng ops |
| A3 | Realtime ổn định 1.000–5.000 người trên Wi-Fi/4G hội trường | M0 spike, M1 | 0 sự cố P1; ≥ 80% join thành công | Giới hạn quy mô; đầu tư thêm degrade/edge |
| A4 | Mùa vụ được bù bằng hội nghị và activation | M2, M3 | Doanh thu 03–08/2027 ≥ 40% doanh thu 11/2026–02/2027 | Gói năm trả trước; dịch vụ custom |
| A5 | Theme Tết/YEP + văn hoá VN là lợi thế đủ lớn trước công cụ quốc tế | M1 | Feedback định tính, tỷ lệ chọn skin bản địa | Đầu tư cơ chế hơn là skin |

---

## 10. Thay đổi so với kế hoạch v0.1

| Hạng mục | v0.1 | v1.0 (sau nghiên cứu) | Lý do |
|---|---|---|---|
| Wedge | "Live Pack" có lucky draw, check-in là điểm bán | **Game LED nhiều người** là điểm bán; lucky draw/check-in là đồ đi kèm, free ở quy mô nhỏ | Quay số đã là hàng phổ thông |
| Phase 2 | Campaign online + self-serve | **Live tự phục vụ + Agency** | Tránh sân WOAY; mùa hội nghị 03–05 vẫn là live |
| Phase 3 | Agency & scale | **Booth & Activation** (async engine, prize engine đầy đủ, kiosk) | Mở rộng sát lõi "tại sự kiện" |
| Builder ở MVP | Self-serve đầy đủ | **Assisted builder** (ops + agency đối tác dùng), self-serve hoàn chỉnh ở M2 | 5 tuần không đủ cho cả hai; kiểm chứng builder bằng dogfooding |
| Đổi quà ở MVP | Có | **Bỏ khỏi M1** (YEP trao quà trên sân khấu) → M3 | Cắt scope không cần thiết |
| Giá | Event Pass từ 1,49tr | Free ≤ 100 người; **Live Pass từ 990k** | Mỏ neo thị trường VN |
| Kênh | Agency là một kênh | **Agency là ICP #1** + reseller/OEM (mô hình đại lý của 凡科) | Bài học Trung Quốc |
