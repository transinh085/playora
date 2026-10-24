# 09 — Lộ trình và kế hoạch triển khai chi tiết

Phiên bản: v2.0 · 24/10/2026 · Sprint dài 2 tuần, bắt đầu thứ Hai · Mốc Tết Đinh Mùi: 06/02/2027 · Nhất quán với [00-product-strategy.md §7](./00-product-strategy.md#7-lộ-trình-mvp-theo-giai-đoạn) v2.0

---

## 1. Tổng quan

```
2026         Nov              Dec                Jan 2027        Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct   Nov   Dec
             │M0 │ M1: S1 S2 S3│── PILOT TẾT CAMPAIGN + YEP (Live add-on) ──│Tết│ M2: Self-serve & Agency│ M3: Booth & Activation│ M4: Scale & Platform ── Tết 2028 + YEP 2027 ──
             ▲   ▲            ▲  ▲                                          ▲   ▲                      ▲                       ▲            ▲
          26/10 G0:06/11  G1a:04/12 12/12                                 06/02 22/02                30/04                   30/07        09: mở bán Tết 2028 + YEP 2027
```

| Mã | Giai đoạn | Thời gian | Kết quả chính | Gate |
|---|---|---|---|---|
| **M0** | Discovery & Foundation | 26/10 – 06/11/2026 | Phỏng vấn agency + brand, ≥ 3 cọc pilot campaign Tết, spike, monorepo + CI, design system v0 | **G0** (06/11) |
| **M1** | MVP "Tết Campaign" + Live add-on | 09/11 – 11/12/2026 | Play engine, prize engine v1, voucher pool, 4 minigame, skin Tết + chung, link theo kênh, dashboard + export; Live add-on (shake/tap race, lucky draw, Host Console) | **G1a** prize + tải (04/12) |
| M1-Pilot | Pilot Tết Campaign + YEP | 12/12/2026 – 06/02/2027 | 10+ campaign trả phí, ≥ 50.000 lượt chơi hợp lệ, ≥ 5 sự kiện YEP mua add-on, 5 case study | **G1b** (cuối 02/2027) |
| **M2** | Self-serve & Agency | 22/02 – 30/04/2027 | Prize Simulator, pacing đầy đủ, OTP, thông báo trúng email/ZNS, +4 minigame, flow chuẩn + pre-flight, đổi quà staff mode, client workspace, white-label, PayOS, báo cáo PDF + biên bản | **G2** (05/2027) |
| **M3** | Booth & Activation | 03/05 – 30/07/2027 | Kiosk mode (online), mã tham gia/nắp chai, requirements, funnel theo kênh; Live thêm kéo co, nghi thức khởi động, check-in wall | **G3** (08/2027) |
| **M4** | Scale & Platform | 02/08 – 17/12/2027 | Zalo login/Mini App, webhook/API, custom domain, e-gift, AI draft, template riêng, reseller/OEM, kiosk offline, SSO, Live 20.000 CCU; vận hành Tết 2028 + YEP 2027 | **G4** (02/2028) |

---

## 2. Đội ngũ theo giai đoạn

| Vai trò | M0–M1 | M2 | M3 | M4 |
|---|---|---|---|---|
| Founder / PM (**PM**) | ✅ | ✅ | ✅ | ✅ |
| Tech Lead, prize engine/realtime/DevOps (**TL**) | ✅ | ✅ | ✅ | ✅ |
| Fullstack Nest-heavy (**BE**) | ✅ | ✅ | ✅ | ✅ |
| Fullstack Next-heavy (**FE**) | ✅ | ✅ | ✅ | ✅ |
| Game/Frontend dev PixiJS (**GD**) | ✅ | ✅ | ✅ | ✅ |
| Designer UI + game art/skin (**DS**) | ✅ | ✅ | ✅ | ✅ |
| BD agency (**BD**) | — | ✅ | ✅ | ✅ |
| CS / Campaign & event operator (**OP**) | part-time (pilot) | ✅ | ✅ | ✅ + thời vụ mùa Tết/YEP |
| QA (**QA**) | freelance từ S2 | part-time | part-time | ✅ |
| Game dev #2 / artist (hợp đồng) | — | ✅ (+4 minigame, skin theo mùa) | ✅ (skin booth, Trung thu) | ✅ (theme pack Tết 2028) |

---

## 3. M0: Discovery & Foundation (26/10 – 06/11/2026)

### 3.1 Business

| # | Việc | Owner | Hạn |
|---|---|---|---|
| B0.1 | Danh sách 40 agency và brand mục tiêu; lịch 18 phỏng vấn (10 agency, 6 brand marketing, 2 HR) | PM | 27/10 |
| B0.2 | Kịch bản phỏng vấn: quy trình làm minigame hiện tại, nhà cung cấp (WOAY, dev thuê ngoài), chi phí, nỗi lo về giải; Van Westendorp cho Campaign Pass và gói Agency năm | PM | 27/10 |
| B0.3 | Demo "wow": prototype vòng quay Tết có giải giới hạn và rải đều; prototype shake race cho Live add-on (từ spike S0-3) | PM + GD | 03/11 |
| B0.4 | Landing page + form đặt lịch demo | FE + DS | 30/10 |
| B0.5 | Gói pilot Tết Campaign: −50% Campaign Pass, cọc 30%, cam kết case study + **1 agency tự dựng**; Live add-on bán kèm cho YEP | PM | 30/10 |
| B0.6 | Dùng thử đối thủ: 凡科/Guandayun, **WOAY** (đối thủ trực tiếp), Hi现场, XSPIN, Luck4You, Drimify; ghi toàn bộ trường cấu hình giải và participation | PM + DS | 05/11 |
| B0.7 | Luật sư: khuyến mại (thể lệ, thông báo/đăng ký theo NĐ 81) + PDPL + ToS/DPA | PM | 06/11 |
| B0.8 | Device lab: 4 điện thoại, 1 mini PC, 1 máy chiếu | PM | 04/11 |

### 3.2 Engineering

| # | Việc | Owner | Hạn |
|---|---|---|---|
| E0.1 | Repo, Bun workspaces, Turborepo, Biome, tsconfig | TL | 27/10 |
| E0.2 | Docker compose dev (Postgres, Valkey, MinIO, Mailpit) | TL | 27/10 |
| E0.3 | Scaffold `api`, `realtime`, `worker` (Nest), `studio`, `play`, `web` (Next) | TL + FE | 29/10 |
| E0.4 | `packages/db` schema lõi + seed; `contracts`; `env` | BE | 04/11 |
| E0.5 | Better Auth + organization; login Studio | BE + FE | 06/11 |
| E0.6 | CI (lint, typecheck, test, build, Docker) + staging tự deploy | TL | 06/11 |
| S0-1…5 | Spike: monorepo build; Nest trên Bun; **realtime 5.000 client**; DeviceMotion trên in-app browser; PixiJS trên LED | TL, GD | 05/11 |
| S0-6 | Spike: **trừ tồn kho/ngân sách nguyên tử** dưới tải (Postgres vs Valkey Lua), 500 lượt/giây `[GĐ]` | TL + BE | 06/11 |
| E0.7 | ADR 001–009 sau spike | TL | 06/11 |

**Tiến độ engineering (cập nhật 24/10/2026):**

| Task | Trạng thái |
|---|---|
| E0.1–E0.3 (repo, compose, scaffold 6 app) | ✅ Xong |
| E0.4 (schema lõi, migration `0000_init`, seed) | ✅ Xong |
| E0.5 (Better Auth + organization; đăng nhập/đăng ký Studio) | ✅ Xong (gồm Google/magic link, mời thành viên) |
| E0.6 (CI) | ✅ Workflow lint + migrate + typecheck + test + build · ⏳ Docker image + staging |
| S0-1 monorepo build | ✅ Đạt |
| S0-2 Nest trên Bun | ✅ Đạt sơ bộ (ADR-002) · ⏳ soak 24h, k6 HTTP |
| S0-3 realtime 5.000 client | ✅ Đạt cục bộ, p95 72–101 ms (ADR-004) · ⏳ test qua mạng thật trên VM |
| S0-4 DeviceMotion | ⏳ Trang `/spike/player` sẵn sàng; cần test trên device lab qua HTTPS |
| S0-5 PixiJS trên LED | ⏳ Chưa làm |
| S0-6 trừ kho nguyên tử | ⏳ Chưa làm |
| E0.7 ADR | ✅ 10 ADR trong `docs/adr/` |

**Đã làm sớm theo kế hoạch v1.0, dùng lại cho M1 v2.0:** event CRUD + guest list + đội + QR (EVT-01/02/06/10); brand kit + asset manager (BLD-04/13); template registry, auto-form, preview thật, publish version (BLD-01/02/03/08); `game-sdk` v0; player join + participation config (EVT-02/05); screen shell + preset layout (LIV-02, BLD-11); live engine `LiveRoom` + `RoundRunner` (LIV-01). Các story này không lặp lại trong sprint M1 bên dưới.

### 3.3 Design

| # | Việc | Owner | Hạn |
|---|---|---|---|
| D0.1 | Design tokens + shadcn theme | DS | 30/10 |
| D0.2 | Wireframe: Studio (campaign, editor 3 cột, **thiết lập giải**, dashboard), **Player flow async** (Cover → Form → Game → Kết quả → Quà của tôi), Host Console mobile, Screen | DS | 04/11 |
| D0.3 | Art direction: **theme pack Tết Đinh Mùi** và **skin chung** (dùng quanh năm) cho 4 minigame M1 | DS | 06/11 |

### 3.4 Gate G0 (06/11)

| Tiêu chí | Ngưỡng | Nếu không đạt |
|---|---|---|
| Pain xác nhận | ≥ 6/10 agency, ≥ 4/6 brand | Quay lại phỏng vấn, đổi ICP |
| Cọc pilot campaign Tết | ≥ 3 | Pilot miễn phí 5 campaign để lấy case study; xem lại A1 |
| Lý do chọn Playora thay vì WOAY | Ghi lại được trong ≥ 5 phỏng vấn | Xem lại định vị (A1) |
| Spike trừ kho (S0-6) | 0 sai lệch ở 500 lượt/giây `[GĐ]` | Serialize theo campaign; giới hạn tốc độ phát giải |
| Spike realtime (S0-2, S0-3) | Đạt | Live add-on giới hạn ≤ 500 người; realtime chạy Node/uWS theo ADR-004 |
| Spike motion (S0-4) | Đạt hoặc fallback tap ổn | Live add-on chỉ bán `tap-race` |

---

## 4. M1: MVP "Tết Campaign" + Live add-on (09/11 – 11/12/2026)

**Nguyên tắc scope:**
- **Lõi là campaign minigame online.** Prize engine đúng đắn đứng trên mọi tính năng ([00 §6](./00-product-strategy.md#6-nguyên-tắc-sản-phẩm)): 0 vượt tồn kho, 0 vượt ngân sách, 0 vượt giới hạn người chơi.
- **Builder là assisted:** Studio đủ dùng cho đội ops và PM agency đối tác. Flow chuẩn dùng màn mặc định; chỉnh từng màn, pre-flight và Simulator để sang M2.
- **Live add-on ≤ 20% effort dev M1** (A5): shake/tap race, lucky draw minh bạch, Host Console; dùng lại live engine đã có.
- **Không** billing tự động, OTP, Prize Simulator, pacing theo đợt/xả kho cuối, đổi quà tại quầy, client workspace hay white-label, quiz.
- **Hạ tầng đơn giản:** 1 node API + 1 node realtime; worker xử lý ảnh, export và job pacing.

### Sprint 1 (09/11 – 20/11): Play engine và prize engine v1

| # | Story | PRD | Owner | Ước lượng |
|---|---|---|---|---|
| 1.1 | **Play engine**: phiên chơi + token lượt chơi; server quyết định kết quả trước khi client animate; idempotency; hỗ trợ `instant` và `skill` | — | TL + BE | 6d |
| 1.2 | **Prize engine v1** (`packages/core/prize`): `per_prize_probability`, `overall_win_rate`, `guaranteed`; trừ tồn kho nguyên tử; giới hạn giải/người (tổng, theo ngày); ngân sách tổng `valueVnd`; giải an ủi | PRZ-01/05/09 | TL + BE | 7d |
| 1.3 | Participation: lượt chơi theo ngày/tổng, khung thời gian, trần người chơi; dùng identity đã có (anonymous, form, guest list) | EVT-05 | BE | 3d |
| 1.4 | Thiết lập giải trong Studio: CRUD giải, chọn chế độ, tồn kho, giới hạn, ngân sách; `prize-picker` | PRZ-01 | FE | 4d |
| 1.5 | Flow chuẩn async (màn mặc định): Cover → Form → Game → Result (thắng / không trúng / hết quà / hết lượt) → Quà của tôi | PRZ-10 | FE | 5d |
| 1.6 | `spin-wheel` + custom widget sửa ô vòng quay; skin chung + Tết | — | GD | 5d |
| 1.7 | `scratch-card`; skin chung + Tết | — | GD | 3d |
| 1.8 | Theme pack Tết + skin chung cho 4 minigame | BLD-06 | DS | liên tục |

**Demo:** tạo campaign vòng quay Tết, 3 giải có tồn kho và ngân sách, bot 100.000 lượt, 0 vượt kho, kết quả hiện đúng biến thể màn Result.

### Sprint 2 (23/11 – 04/12): Minigame, pacing, voucher, kênh và Live add-on

| # | Story | PRD | Owner | Ước lượng |
|---|---|---|---|---|
| 2.1 | `gift-box` (skin đập trứng, lì xì) | — | GD | 4d |
| 2.2 | `catch-items` (skill): validator điểm, plausibility; đạt ngưỡng (`score_threshold`) thì nhận kết quả từ prize engine | PRZ-06 | GD + BE | 5d |
| 2.3 | Pacing `time_uniform` (buffer, tự làm mượt, giải dồn sang khung sau) + `opening_hours` | PRZ-07 | TL + BE | 4d |
| 2.4 | **Voucher pool**: import CSV / sinh mã theo pattern; gán nguyên tử khi trúng; hiển thị mã ở "Quà của tôi" | PRZ-09 | BE + FE | 3d |
| 2.5 | **Link theo kênh** `?ch=` + QR theo kênh; `plays.channel_key` | EVT-11 | BE | 2d |
| 2.6 | Chống gian lận mức **Chuẩn**: Turnstile, rate limit IP/device/token, giới hạn tốc độ phát giải, blacklist | — | TL | 3d |
| 2.7 | Live add-on: `shake-race` / `tap-race` (cá nhân/đội) + **Host Console mobile** + run-of-show tối giản | LIV-01, BLD-10 | GD + FE | 5d |
| 2.8 | Live add-on: `lucky-draw` (pool AND/OR, loại người trúng, commit–reveal, `void` có lý do, log) | PRZ-02/03, LIV-06 | BE + GD | 4d |
| 2.9 | Rehearsal mode + `tooling/bots` (chế độ campaign nhiều ngày và live) + reset | EVT-09 | TL | 3d |

**Gate G1a (04/12):**
- Prize engine: **1 triệu lượt mô phỏng** + load test đỉnh 500 lượt/giây `[GĐ]`: 0 sai lệch tồn kho, ngân sách, giới hạn người chơi; với `time_uniform` không hết giải trước 80% thời lượng mô phỏng.
- Live add-on: k6 2.000 client đạt NFR.
- Nếu không đạt: serialize theo campaign, giảm tốc độ phát giải; giới hạn Live ≤ 1.000 người/sự kiện.

### Sprint 3 (07/12 – 11/12, 1 tuần): Dashboard, hardening và nghiệm thu

| # | Việc | Owner |
|---|---|---|
| 3.1 | **Dashboard campaign** (ANL-01): lượt chơi, người chơi, giải đã phát/còn lại, theo ngày, theo kênh; dashboard live cho Live add-on | FE + BE |
| 3.2 | **Export** CSV/XLSX (ANL-02): người chơi, form (kèm consent), người trúng, mã voucher đã phát | BE |
| 3.3 | Audit log giải và điều chỉnh tồn kho; admin tối giản (org, gói thủ công, lịch campaign/sự kiện); quota + watermark Free | BE |
| 3.4 | Degrade mode cho Live add-on | TL |
| 3.5 | QA thiết bị thật (device lab, Zalo/FB in-app); fix | QA + all |
| 3.6 | Observability: Sentry, Grafana (API, prize engine, realtime), alert Telegram khi tốc độ phát giải bất thường | TL |
| 3.7 | **Nghiệm thu builder với 1 PM agency đối tác** (PRD §8.1): dựng campaign vòng quay Tết có giải + voucher + link theo kênh | PM |
| 3.8 | Runbook campaign (theo dõi pacing hằng ngày) và runbook sự kiện live; video hướng dẫn 5 phút | PM + OP |
| 3.9 | Checklist pháp lý ([08 §6](./08-security-compliance.md#6-checklist-trước-pilot-cuối-sprint-3)): mẫu thể lệ khuyến mại, consent | PM |

---

## 5. M1-Pilot: Tết Campaign + YEP (12/12/2026 – 06/02/2027)

### 5.1 Vận hành

- **Phân loại campaign:**
  - **Concierge:** đội Playora dựng bằng Studio. Mục tiêu khoảng 70% số campaign.
  - **Agency tự dựng:** có hỗ trợ. Mục tiêu ≥ 3 campaign.
- **Mỗi campaign:** kickoff 45 phút; chơi thử + bot trước khi publish; theo dõi pacing và tỷ lệ gắn cờ hằng ngày; báo cáo tuần gửi client; NPS khi kết thúc.
- **Mỗi sự kiện Live add-on:** rehearsal trước 1–2 ngày bằng bot, operator trực (tại chỗ nếu ≥ 500 người).
- **Mỗi lần dựng, ops ghi "friction log":** mỗi lần phải sửa DB, phải nhờ dev hay phải đoán cách làm đều được ghi lại. Đây là backlog chính cho builder M2.
- **Freeze:** không deploy production tối thứ Sáu và thứ Bảy, và từ 23 tháng Chạp đến mùng 3 Tết, trừ hotfix P1.
- **Capacity dev:** 50% hỗ trợ và fix, 50% chuẩn bị M2 (Prize Simulator, OTP, flow editor, pre-flight, PayOS).

### 5.2 Chỉ số và Gate G1b (cuối 02/2027)

| Chỉ số | Mục tiêu |
|---|---|
| Campaign trả phí | ≥ 10 |
| Lượt chơi hợp lệ | ≥ 50.000 |
| Sai lệch tồn kho / vượt ngân sách / vượt giới hạn | **0** |
| Campaign **agency tự dựng** | ≥ 3 |
| Mở link/quét QR → chơi lượt đầu | ≥ 70% |
| Campaign hết giải trước 80% thời lượng (khi bật rải đều) | ≤ 5% |
| Lượt bị gắn cờ gian lận (A4) | < 5% |
| Trung vị thời gian dựng (ops) | ≤ 60 phút |
| Sự kiện YEP mua Live add-on (A5) | ≥ 5 |
| Sự cố P1 | 0 |
| NPS organizer | ≥ 40 |
| Khách chấp nhận giá Campaign Pass (không giảm) cho lần sau | ≥ 50% |
| Case study (số liệu + video) | 5 |

**Quyết định tại G1b:** gọi vốn pre-seed bằng số liệu pilot; chốt bảng giá M2; quyết định giữ/đóng băng Live add-on (A5); xếp lại backlog M2 theo friction log.

---

## 6. M2: Self-serve & Agency (22/02 – 30/04/2027)

Mục tiêu: khách **tự dựng, tự trả tiền**; agency **quản lý nhiều client, bán dưới thương hiệu mình**. Kịp mùa 8/3 và 30/4 (campaign ngắn, nhiều).

| Track | Owner | S8 (22/02) | S9 (08/03) | S10 (22/03) | S11 (05/04) | S12 (19/04) |
|---|---|---|---|---|---|---|
| **A. Builder self-serve** | FE + DS | Flow chuẩn chỉnh từng màn + sponsor slot | Autosave, undo/redo, **pre-flight** | Gallery công khai theo mùa + onboarding "tạo campaign đầu tiên" | Nhân bản, thùng rác | Polish theo usability test |
| **B. Prize & Trust** | TL + BE | **Prize Simulator** (Monte Carlo) | Pacing `batch_release` + `end_flush`; `scheduled_moments`, `rank_based` (xác nhận tay) | **OTP ZNS/SMS**, chặn đầu số ảo; thông báo trúng email/ZNS | **Đổi quà staff mode** (điểm đổi + PIN, quét QR, đổi hàng loạt) | Báo cáo PDF + biên bản (white-label) |
| **C. Minigame** | GD + game dev #2 | Lật thẻ | Ghép hình | Đập logo | Lì xì rơi | Hardening validator skill |
| **D. Agency & Billing** | BE | Client workspace | Kế thừa brand kit theo tầng; white-label cơ bản; 2FA | PayOS: Campaign Pass, gói Agency năm, Live add-on; quota; credit OTP/ZNS | Trang billing, hoá đơn (thủ công) | Operator hỗ trợ từ xa |
| **E. Theme** | DS (+ freelance) | 8/3 | 30/4 – 1/5 | Khai trương, sinh nhật brand | Ra mắt sản phẩm | Hè + Trung thu (chuẩn bị M3) |

**Gate G2:** ≥ 30 khách trả phí, ≥ 8 agency trả phí, ≥ 60% campaign tự dựng không cần hỗ trợ, trung vị dựng ≤ 30 phút, 0 sai lệch giải.

---

## 7. M3: Booth & Activation (03/05 – 30/07/2027)

Mục tiêu: mở rộng từ online sang **booth/activation của brand qua agency**: cùng một game version chạy trên điện thoại và kiosk, chung kho giải và dữ liệu.

| Track | Owner | Nội dung |
|---|---|---|
| **A. Kiosk** | TL + FE | Kiosk mode online (full-screen, auto-reset sau mỗi người, khoá điều hướng); preview Kiosk trong editor |
| **B. Participation** | BE | Mã tham gia/nắp chai (≤ 50.000/lần import, in QR hàng loạt); requirements "nhập mã" trước khi chơi; thêm lượt khi nhập mã/chia sẻ (có giới hạn) |
| **C. Prize & data** | BE + FE | Funnel theo kênh (quét → chơi → trúng → đổi); pacing `traffic_based`; tự đổi quà; gift list |
| **D. Trust** | TL | Anti-cheat preset Cao (chặn VPN/proxy, email dùng một lần); trình tạo thể lệ |
| **E. Live add-on** | GD | `tug-of-war`, `launch-ceremony`, `checkin-wall` |
| **F. Theme** | DS + artist | Skin booth; Trung thu, 20/10 |

**Gate G3:** ≥ 10 activation trả phí, 0 sai lệch giải, ARPA agency tăng ≥ 30% so với M2.

---

## 8. M4: Scale & Platform (02/08 – 17/12/2027)

| Thời gian | Trọng tâm |
|---|---|
| 08/2027 | Zalo login/Mini App; webhook; custom domain + SSL tự động; theme pack Tết Mậu Thân 2028 + YEP 2027 |
| 09/2027 | **Mở bán campaign Tết 2028 + YEP 2027** (gói Agency năm trả trước); public API; e-gift (UrBox/ViHat) |
| 10/2027 | AI draft (prompt → bản nháp campaign); lưu template riêng của org; reseller/OEM |
| 11/2027 | Kiosk offline (PWA, sync sau); SSO; logic webhook (Enterprise); Live 20.000 CCU, pre-scale theo lịch campaign/sự kiện |
| 11/2027 – 02/2028 | **Vận hành mùa YEP 2027 + Tết 2028**: freeze window, operator thời vụ, war-room cuối tuần |

**Gate G4 (02/2028):** 1.000 campaign/sự kiện mùa Tết 2028, 50 agency, MRR theo [02-business-model §6](./02-business-model.md#6-dự-phóng-tài-chính-2027-gđ).

---

## 9. Ngân sách M0 → hết pilot (26/10/2026 – 06/02/2027, ~3,4 tháng) `[GĐ]`

| Hạng mục | Triệu đ |
|---|---|
| Nhân sự 6 người × ~32tr × 3,4 tháng | ~650 |
| Operator/QA part-time (pilot) | ~40 |
| Hạ tầng + SaaS | ~50 |
| Device lab | ~30 |
| Pháp lý | ~30 |
| Marketing, pilot ops, quay case study | ~80 |
| Dự phòng | ~40 |
| **Tổng** | **~920** |

---

## 10. Rủi ro

| Rủi ro | Xác suất | Ảnh hưởng | Giảm thiểu | Owner |
|---|---|---|---|---|
| M1 trễ, không kịp mùa Tết | TB | Cao | Scope cứng 4 minigame; builder assisted; tái dùng phần đã làm ở M0; Live add-on ≤ 20% effort, cắt trước tiên nếu trễ | PM/TL |
| Prize engine sai lệch kho/ngân sách dưới tải (A3) | Thấp–TB | Rất cao | Spike S0-6; 1 triệu lượt mô phỏng; load test; audit log; alert tốc độ phát giải; serialize theo campaign nếu cần | TL |
| Builder quá khó, agency không tự dựng (A2) | TB | Cao | Dogfooding qua concierge; friction log; usability test mỗi sprint M2 | PM/FE |
| Không thắng được WOAY (A1) | TB | Cao | Pre-sale ở M0; ghi lý do chọn; skin theo mùa + prize engine + white-label; giá theo campaign | PM |
| Bot/gian lận làm hết giải sớm khi chưa có OTP (A4) | TB | Cao | Chống gian lận mức Chuẩn; giới hạn giải/người; theo dõi gắn cờ hằng ngày; đưa OTP lên sớm nếu > 5% | TL |
| Live add-on kéo nguồn lực khỏi lõi (A5) | TB | TB | Trần 20% effort; chỉ 2 game live + Host Console; đóng băng nếu < 5 sự kiện | PM |
| Sự cố live trên sân khấu | Thấp–TB | Rất cao | Spike sớm, load test, degrade, rehearsal bắt buộc, operator | TL |
| DeviceMotion bị chặn trong in-app browser | Cao | TB | Fallback `tap-race`; hướng dẫn mở bằng trình duyệt | GD |
| Wi-Fi venue kém (Live, booth) | Cao | Cao | Payload nhỏ; khuyến nghị 4G; Screen có 4G backup | OP |
| Mùa vụ dồn vào Tết | Cao | TB | M2 nhắm 8/3, 30/4; M3 booth/activation mùa hè; gói Agency năm | PM/BD |
| Pháp lý khuyến mại (campaign có thưởng ngay từ M1) | TB | Cao | Tư vấn luật ở M0; mẫu thể lệ; ToS phân định trách nhiệm (khách là "thương nhân thực hiện khuyến mại"); trình tạo thể lệ ở M3 | PM |

---

## 11. Nghi thức làm việc

- Planning thứ Hai đầu sprint; daily 15 phút; demo + retro thứ Sáu cuối sprint.
- **Mỗi demo M1/M2 có một người ngoài team** (agency đối tác) thử dựng campaign để đo builder.
- Mỗi story gắn ID PRD (vd. `BLD-03`, `PRZ-05`) và acceptance criteria.
- **Definition of Done:** review ≥ 1; test unit cho `core` (bắt buộc với prize engine) và server template; lint, typecheck xanh; deploy staging; QA ≥ 2 thiết bị thật nếu là UI player; cập nhật docs/ADR khi đổi kiến trúc.
- Trunk-based, feature flag (PostHog), release theo tuần ngoài freeze window.
