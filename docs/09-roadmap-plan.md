# 09 — Lộ trình và kế hoạch triển khai chi tiết

Phiên bản: v1.0 · 23/10/2026 · Sprint dài 2 tuần, bắt đầu thứ Hai · Mốc Tết Đinh Mùi: 06/02/2027 · Nhất quán với [00-product-strategy.md §7](./00-product-strategy.md#7-lộ-trình-mvp-theo-giai-đoạn)

---

## 1. Tổng quan

```
2026         Nov              Dec                Jan 2027        Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct   Nov   Dec
             │M0 │ M1: S1 S2 S3│── PILOT YEP 2026 (concierge) ──│Tết│ M2: Live Self-serve│ M3: Booth & Activation│ M4: Scale & Platform ── YEP 2027 ──
             ▲   ▲            ▲  ▲                              ▲   ▲                  ▲                       ▲            ▲
          26/10 G0:06/11  G1a:04/12 12/12                     05/02 22/02           30/04                   30/07        09: mở bán YEP 2027
```

| Mã | Giai đoạn | Thời gian | Kết quả chính | Gate |
|---|---|---|---|---|
| **M0** | Discovery & Foundation | 26/10 – 06/11/2026 | 18 phỏng vấn, ≥ 3 cọc pilot, 5 spike, monorepo + CI, design system v0 | **G0** (06/11) |
| **M1** | MVP "YEP Live" | 09/11 – 11/12/2026 | Live Engine, Screen/Host/Player, 4 game, assisted builder, 2 theme | **G1a** load test (04/12) |
| M1-Pilot | Pilot YEP 2026 (concierge) | 12/12/2026 – 05/02/2027 | 12–15 sự kiện, ≥ 5.000 người chơi, 5 case study | **G1b** (cuối 02/2027) |
| **M2** | Live Self-serve & Agency | 22/02 – 29/04/2027 | Builder tự phục vụ, agency layer, billing, +5 game live, báo cáo/biên bản | **G2** (05/2027) |
| **M3** | Booth & Activation | 04/05 – 30/07/2027 | Async engine, prize engine đầy đủ + simulator, đổi quà, kiosk, OTP/ZNS | **G3** (08/2027) |
| **M4** | Scale & Platform | 02/08 – 17/12/2027 | 20k CCU, custom domain, Zalo, API/webhook, AI draft, reseller; vận hành YEP 2027 | **G4** (02/2028) |

---

## 2. Đội ngũ theo giai đoạn

| Vai trò | M0–M1 | M2 | M3 | M4 |
|---|---|---|---|---|
| Founder / PM (**PM**) | ✅ | ✅ | ✅ | ✅ |
| Tech Lead, realtime/DevOps (**TL**) | ✅ | ✅ | ✅ | ✅ |
| Fullstack Nest-heavy (**BE**) | ✅ | ✅ | ✅ | ✅ |
| Fullstack Next-heavy (**FE**) | ✅ | ✅ | ✅ | ✅ |
| Game/Frontend dev PixiJS (**GD**) | ✅ | ✅ | ✅ | ✅ |
| Designer UI + game art (**DS**) | ✅ | ✅ | ✅ | ✅ |
| BD agency (**BD**) | — | ✅ | ✅ | ✅ |
| CS / Event operator (**OP**) | part-time (pilot) | ✅ | ✅ | ✅ + thời vụ mùa YEP |
| QA (**QA**) | freelance từ S3 | part-time | part-time | ✅ |
| Game dev #2 / artist (hợp đồng) | — | — | ✅ (template async) | ✅ (theme pack YEP 2027) |

---

## 3. M0: Discovery & Foundation (26/10 – 06/11/2026)

### 3.1 Business

| # | Việc | Owner | Hạn |
|---|---|---|---|
| B0.1 | Danh sách 40 agency và HR mục tiêu; lịch 18 phỏng vấn (10 agency, 8 HR) | PM | 27/10 |
| B0.2 | Kịch bản phỏng vấn: quy trình hiện tại, nhà cung cấp đang ghép, chi phí, Van Westendorp cho Live Pass | PM | 27/10 |
| B0.3 | Demo "wow" bằng prototype shake race (từ spike S0-3) để đo phản ứng | PM + GD | 03/11 |
| B0.4 | Landing page + form đặt lịch demo | FE + DS | 30/10 |
| B0.5 | Gói pilot YEP: −50% Live Pass, cọc 30%, cam kết case study + **1 agency tự dựng** | PM | 30/10 |
| B0.6 | Dùng thử đối thủ: 凡科/Guandayun, Hi现场, WOAY, XSPIN, Luck4You, Crowdpurr; ghi toàn bộ trường cấu hình | PM + DS | 05/11 |
| B0.7 | Luật sư: khuyến mại + PDPL + ToS/DPA | PM | 06/11 |
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
| E0.7 | ADR 001–009 sau spike | TL | 06/11 |

**Tiến độ engineering (cập nhật 23/10/2026):**

| Task | Trạng thái |
|---|---|
| E0.1–E0.3 (repo, compose, scaffold 6 app) | ✅ Xong |
| E0.4 (schema lõi M1, migration `0000_init`, seed) | ✅ Xong |
| E0.5 (Better Auth + organization; đăng nhập/đăng ký Studio) | ✅ Xong (Google/magic link ở M1) |
| E0.6 (CI) | ✅ Workflow lint + migrate + typecheck + test + build · ⏳ Docker image + staging |
| S0-1 monorepo build | ✅ Đạt |
| S0-2 Nest trên Bun | ✅ Đạt sơ bộ (ADR-002) · ⏳ soak 24h, k6 HTTP |
| S0-3 realtime 5.000 client | ✅ Đạt cục bộ, p95 72–101 ms (ADR-004) · ⏳ test qua mạng thật trên VM |
| S0-4 DeviceMotion | ⏳ Trang `/spike/player` sẵn sàng; cần test trên device lab qua HTTPS |
| S0-5 PixiJS trên LED | ⏳ Chưa làm |
| E0.7 ADR | ✅ 7 ADR trong `docs/adr/` |

### 3.3 Design

| # | Việc | Owner | Hạn |
|---|---|---|---|
| D0.1 | Design tokens + shadcn theme | DS | 30/10 |
| D0.2 | Wireframe: Studio (event, run-of-show, editor 3 cột), **Host Console mobile**, Screen, Player | DS | 04/11 |
| D0.3 | Art direction 2 theme pack: **YEP (sang trọng)** và **Tết Đinh Mùi** | DS | 06/11 |

### 3.4 Gate G0 (06/11)

| Tiêu chí | Ngưỡng | Nếu không đạt |
|---|---|---|
| Pain xác nhận | ≥ 6/10 agency, ≥ 5/8 HR | Quay lại phỏng vấn, đổi ICP |
| Cọc pilot | ≥ 3 | Pilot miễn phí 5 sự kiện để lấy case study; xem lại A1 |
| Spike realtime (S0-2, S0-3) | Đạt | Giới hạn pilot ≤ 500 người; realtime chạy Node/uWS theo ADR-004 |
| Spike motion (S0-4) | Đạt hoặc fallback tap ổn | Thay `shake-race` bằng `tap-race` |

---

## 4. M1: MVP "YEP Live" (09/11 – 11/12/2026)

**Nguyên tắc scope:**
- **Builder là assisted**, nghĩa là Studio đủ dùng cho đội ops và PM agency đối tác. Auto-form, preview và run-of-show là bắt buộc; độ trau chuốt UX để sang M2.
- **Không** billing tự động, OTP, campaign/async, đổi quà (YEP trao quà trên sân khấu), client workspace hay white-label.
- **Hạ tầng đơn giản:** 1 node realtime (chưa cần HAProxy hash), worker chỉ xử lý ảnh và export.

### Sprint 1 (09/11 – 20/11): Xương sống

| # | Story | PRD | Owner | Ước lượng |
|---|---|---|---|---|
| 1.1 | Event CRUD, slug, QR; guest list import (CSV/XLSX) → đội theo cột | EVT-01/02/06/10 | BE + FE | 4d |
| 1.2 | Brand kit + asset manager (presigned upload, resize, crop theo slot) | BLD-04/13 | BE + FE | 4d |
| 1.3 | Template registry + **auto-form từ zod** + **preview iframe** (Mobile/Screen) | BLD-02/03 | FE | 6d |
| 1.4 | `game-sdk` v0: defineTemplate, asset slots, skins, PlayerProps/ScreenProps/HostPanel, LiveServerModule, clock sync | — | GD + TL | 5d |
| 1.5 | `apps/realtime`: auth handshake, room actor, RoundRunner, snapshot Redis, ownership lock | LIV-02/03 | TL | 7d |
| 1.6 | Player join: anonymous / guest list / form + consent → playerToken | EVT-02/05 | BE + FE | 3d |
| 1.7 | Screen shell (full-screen, reconnect overlay, QR, preset layout) | LIV-02, BLD-11 | GD | 2d |
| 1.8 | `checkin-wall` + kiểm duyệt (từ cấm + duyệt tay) | LIV-05 | GD | 3d |
| 1.9 | Skin YEP + Tết cho checkin-wall; khung theme pack | BLD-06 | DS | liên tục |

**Demo:** tạo event, import 500 khách, bot check-in, tên chạy trên Screen theo theme Tết.

### Sprint 2 (23/11 – 04/12): Game và điều khiển

| # | Story | PRD | Owner | Ước lượng |
|---|---|---|---|---|
| 2.1 | **Host Console mobile** + run-of-show editor + live dashboard | LIV-01, BLD-10, ANL-01 | FE | 6d |
| 2.2 | `live-quiz` (builder câu hỏi, import Excel, điểm theo tốc độ, leaderboard cá nhân/đội) | BLD-12 | GD + BE | 6d |
| 2.3 | `shake-race` (DeviceMotion + fallback tap, cá nhân/đội, skin đua ngựa + thuyền rồng) | — | GD | 6d |
| 2.4 | `lucky-draw` (pool AND/OR, loại người trúng, loại top N, commit–reveal, `void`, 2 hiệu ứng) | PRZ-01/02/03, LIV-06 | BE + GD | 6d |
| 2.5 | Publish → game version bất biến; `hotEditable` | BLD-08 | BE | 2d |
| 2.6 | Rehearsal mode + `tooling/bots` + reset | EVT-09 | TL | 3d |
| 2.7 | Degrade mode | LIV-04 | TL | 2d |

**Gate G1a (04/12):** k6 với 5.000 client đạt NFR. Nếu không đạt, giới hạn pilot ≤ 1.000 người/sự kiện.

### Sprint 3 (07/12 – 11/12, 1 tuần): Hardening và nghiệm thu

| # | Việc | Owner |
|---|---|---|
| 3.1 | Export CSV/XLSX; audit log; admin tối giản (org, gói thủ công, lịch sự kiện); quota + watermark Free | BE |
| 3.2 | QA thiết bị thật (device lab, Zalo/FB in-app); fix | QA + all |
| 3.3 | Observability: Sentry, Grafana realtime, alert Telegram | TL |
| 3.4 | **Nghiệm thu builder với 1 PM agency đối tác** (PRD §8.1) | PM |
| 3.5 | Runbook sự kiện, checklist operator, video hướng dẫn 5 phút | PM + OP |
| 3.6 | Checklist pháp lý ([08 §6](./08-security-compliance.md#6-checklist-trước-pilot-cuối-sprint-3)) | PM |
| 3.7 | *Stretch:* `performance-score` (chấm điểm văn nghệ) | GD |

---

## 5. M1-Pilot: YEP 2026 (12/12/2026 – 05/02/2027)

### 5.1 Vận hành

- **Phân loại sự kiện:**
  - **Concierge:** đội Playora dựng bằng Studio. Mục tiêu khoảng 70% số sự kiện.
  - **Agency tự dựng:** có hỗ trợ. Mục tiêu ≥ 3 sự kiện.
- **Mỗi sự kiện:** kickoff 45 phút, rehearsal trước 1–2 ngày bằng bot, operator trực (tại chỗ nếu ≥ 500 người), NPS sau 24 h.
- **Mỗi lần dựng sự kiện, ops ghi "friction log":** mỗi lần phải sửa DB, phải nhờ dev hay phải đoán cách làm đều được ghi lại. Đây là backlog chính cho builder M2.
- **Freeze:** không deploy production tối thứ Sáu và thứ Bảy, trừ hotfix P1.
- **Capacity dev:** 50% hỗ trợ và fix, 50% chuẩn bị M2 (flow editor, pre-flight, PayOS, `performance-score` nếu chưa xong).

### 5.2 Chỉ số và Gate G1b (cuối 02/2027)

| Chỉ số | Mục tiêu |
|---|---|
| Sự kiện / người chơi | 12–15 / ≥ 5.000 |
| Quét QR → vào chơi thành công | ≥ 80% |
| Sự cố P1 | 0 |
| Sự kiện agency **tự dựng** | ≥ 3 |
| Trung vị thời gian dựng (ops) | ≤ 60 phút |
| NPS organizer | ≥ 40 |
| Khách chấp nhận giá Live Pass (không giảm) cho lần sau | ≥ 50% |
| Case study (video + số liệu) | 5 |

**Quyết định tại G1b:** gọi vốn pre-seed bằng số liệu pilot; chốt bảng giá M2; xếp lại backlog M2 theo friction log.

---

## 6. M2: Live Self-serve & Agency (22/02 – 29/04/2027)

Mục tiêu: khách **tự dựng, tự trả tiền**; agency **quản lý nhiều client, bán dưới thương hiệu mình**. Kịp mùa hội nghị và ra mắt sản phẩm (03–05).

| Track | Owner | S8 (22/02) | S9 (08/03) | S10 (22/03) | S11 (05/04) | S12 (19/04) |
|---|---|---|---|---|---|---|
| **A. Builder self-serve** | FE + DS | Flow chuẩn từng màn + sponsor slot | Autosave, undo/redo, pre-flight | Gallery công khai + onboarding "tạo event đầu tiên" | Nhân bản, thùng rác; screen layout tuỳ chỉnh | Polish theo usability test |
| **B. Agency & Billing** | BE | Client workspace | Kế thừa brand kit theo tầng; white-label cơ bản; 2FA | PayOS: Live Pass, gói Agency; quota | Trang billing, hoá đơn (thủ công) | Operator hỗ trợ từ xa |
| **C. Template live** | GD | `performance-score` | `tug-of-war` | `money-count` | `launch-ceremony` | `live-poll` + `danmaku-wall` |
| **D. Platform & Trust** | TL | HAProxy hash + 2 node realtime | Báo cáo PDF (white-label) | Biên bản quay thưởng PDF | Load test 10.000 | Hardening, sẵn sàng hội nghị lớn |
| **E. Theme** | DS (+ freelance) | Hội nghị | Ra mắt sản phẩm | Khai trương | 8/3 + 20/10 | Trung thu (chuẩn bị M3) |

**Gate G2:** ≥ 20 khách trả phí, ≥ 5 agency trả phí, ≥ 60% sự kiện tự dựng không cần hỗ trợ, trung vị dựng ≤ 30 phút.

---

## 7. M3: Booth & Activation (04/05 – 30/07/2027)

Mục tiêu: mở rộng từ sân khấu sang **booth/activation của brand qua agency**: cùng một event có thể chạy cả LED lẫn booth, chung kho giải và dữ liệu.

| Track | Owner | Nội dung |
|---|---|---|
| **A. Async engine + template** | GD + game dev #2 | `instant` engine: `spin-wheel`, `scratch-card`, `gift-box` + biến thể skin (đập trứng, lưới 9 ô, máy xèng, hộp bí ẩn); `skill` engine: `catch-items`, `memory-match`, `quiz-async`; validator điểm |
| **B. Prize engine** | BE | Chế độ instant-win, scheduled, score_threshold, rank_based; pacing (time_uniform tự làm mượt, batch, opening hours, end_flush); voucher pool; ngân sách; **Prize Simulator**; gift list |
| **C. Đổi quà và participation** | BE + FE | Điểm đổi + PIN staff, quét QR, tự đổi; mã tham gia (≤ 50.000); OTP ZNS/SMS; requirements "nhập mã"; link theo kênh |
| **D. Kiosk và trust** | TL + FE | Kiosk mode online (auto-reset, khoá điều hướng); anti-cheat preset Cao (Turnstile, chặn email/đầu số ảo); funnel theo kênh; trình tạo thể lệ |
| **E. Billing** | BE | Gói Campaign Pro; credit OTP/ZNS |

**Gate G3:** ≥ 10 activation trả phí, 0 sai lệch giải, ARPA agency tăng ≥ 30% so với M2.

---

## 8. M4: Scale & Platform (02/08 – 17/12/2027)

| Thời gian | Trọng tâm |
|---|---|
| 08/2027 | Scale 20.000 CCU; custom domain + SSL tự động; webhook; theme pack YEP 2027 (4 theme) |
| 09/2027 | **Mở bán YEP 2027** (gói trả trước); Zalo login/Mini App; public API |
| 10/2027 | AI draft (prompt → bản nháp event); lưu template riêng của org; reseller/OEM |
| 11/2027 | Kiosk offline (PWA, sync sau); SSO; logic webhook (Enterprise); pre-scale theo lịch sự kiện |
| 11/2027 – 02/2028 | **Vận hành mùa YEP 2027**: freeze window, operator thời vụ, war-room cuối tuần |

**Gate G4 (02/2028):** 1.000 sự kiện trong mùa, 50 agency, MRR theo [02-business-model §6](./02-business-model.md#6-dự-phóng-tài-chính-2027-gđ).

---

## 9. Ngân sách M0 → hết pilot (26/10/2026 – 05/02/2027, ~3,4 tháng) `[GĐ]`

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
| M1 trễ, không kịp YEP | TB | Cao | Scope cứng 4 game; builder assisted; `performance-score` là stretch; fallback `tap-race` | PM/TL |
| Builder quá khó, agency không tự dựng (A2) | TB | Cao | Dogfooding qua concierge; friction log; usability test mỗi sprint M2 | PM/FE |
| Khách không trả cao hơn mức quay số (A1) | TB | Cao | Pre-sale ở M0; bundle; đo chấp nhận giá trong pilot | PM |
| Realtime không đạt hoặc sự cố trên sân khấu (A3) | Thấp–TB | Rất cao | Spike sớm, load test, degrade, rehearsal bắt buộc, operator | TL |
| DeviceMotion bị chặn trong in-app browser | Cao | TB | Fallback tap; hướng dẫn mở bằng trình duyệt | GD |
| Wi-Fi venue kém | Cao | Cao | Payload nhỏ; khuyến nghị 4G; Screen có 4G backup | OP |
| Mùa vụ (A4) | Cao | TB | M2/M3 nhắm hội nghị và activation; gói năm | PM/BD |
| Pháp lý khuyến mại khi sang M3 (activation gắn mua hàng) | TB | Cao | Trình tạo thể lệ; tư vấn luật trước M3; ToS phân định trách nhiệm | PM |

---

## 11. Nghi thức làm việc

- Planning thứ Hai đầu sprint; daily 15 phút; demo + retro thứ Sáu cuối sprint.
- **Mỗi demo M1/M2 có một người ngoài team** (agency đối tác) thử dựng event để đo builder.
- Mỗi story gắn ID PRD (vd. `BLD-03`, `LIV-01`) và acceptance criteria.
- **Definition of Done:** review ≥ 1; test unit cho `core` và server template; lint, typecheck xanh; deploy staging; QA ≥ 2 thiết bị thật nếu là UI player; cập nhật docs/ADR khi đổi kiến trúc.
- Trunk-based, feature flag (PostHog), release theo tuần ngoài freeze window.
