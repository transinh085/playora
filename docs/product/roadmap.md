# Lộ trình

Cập nhật: 31/10/2026 · Owner: PO · Theo [strategy §10](./strategy.md#10-lộ-trình) · Năng lực: **một founder vừa code vừa bán** · Tết Đinh Mùi: 06/02/2027

Lộ trình cũ cho đội 6–8 người (M0–M4 theo sprint) ở [archive/2026-10-24-roadmap-v2.1.md](../archive/2026-10-24-roadmap-v2.1.md).

---

## 1. Nguyên tắc lập kế hoạch

1. **Mỗi tuần có thời gian cho khách.** Khoảng 70% build, 30% nói chuyện với quán, dựng hộ, đọc số liệu. Tuần nào không có cuộc nói chuyện với quán nào là tuần trượt kế hoạch.
2. **Vòng lõi trước, đánh bóng sau** ([D-18](./decisions.md)). Không làm theme, refactor hay canvas nâng cao khi vòng QR → chơi → đổi quà → báo cáo chưa chạy với API thật.
3. **Gate dựa trên bằng chứng.** Qua gate mới mở việc của giai đoạn sau; trượt gate thì quay lại câu hỏi, không chạy tiếp.
4. **Cắt phạm vi, không dời mốc pilot.** Nếu trễ: cắt việc P2 từ Could lên Should ([D-26](./decisions.md)); hứng quà (skill) đã dời sang M2, pilot chạy 3 mẫu instant-win.

---

## 2. M0 + M1: vòng lõi và pilot Tết (26/10/2026 – 28/02/2027)

```
Tuần   44   45   46   47 │ 48   49   50 │ 51   52   01 │ 02 ─────────── 07 │ 08   09
      ├── P0 vòng lõi ───┤├─ P1 kết quả ─┤├─ P2 sẵn sàng┤├── PILOT TẾT ─────┤├ tổng kết ┤
      ├── M0: 15 phỏng vấn, chọn 5–10 quán pilot ──────┤        Tết 06/02 ▲
```

### P0 — Vòng lõi thật · 26/10 → 22/11 (4 tuần)

Mục tiêu: những gì Builder Lab làm bằng backend giả chạy bằng API thật — ✅ xong, backend giả đã gỡ ([studio-ux §5 bước B](./specs/studio-ux.md#5-lộ-trình-cập-nhật-25102026-sau-builder-lab)).

| # | Việc | PRD | Trạng thái |
|---|---|---|---|
| P0.1 | Chốt cách lưu Campaign ([ADR-015](../adr/015-campaign-persistence.md)); contract `campaigns`, `plays`, `vouchers`, `stats` | BLD-08, GAM-01 | ✅ đã xong |
| P0.2 | Bảng `plays`, `play_counters`; mã đổi quà trong `awards.redeemCode`, tồn kho trong `prizes` (`issued`, `remaining`); nối `packages/core/src/prize` vào API (tồn kho, giới hạn, ngân sách, rải quà) | PRZ-05, PRZ-07, PRZ-09 | ✅ đã xong |
| P0.3 | API lượt chơi idempotent; Play đọc chương trình đã phát hành, chạy Bìa → Form → Game → Kết quả → Quà của tôi | GAM-01, BLD-07, PRZ-03 | ✅ đã xong |
| P0.4 | Quầy đổi quà với API thật; vai trò "chỉ đổi quà" | PRZ-10, ORG-02a | ✅ đã xong |
| P0.5 | Studio đổi `mock/hooks.ts` sang `useRouteQuery`/`useRouteMutation`; e2e có cross-tenant | — | ✅ đã xong |
| P0.6 | Test 1 triệu lượt mô phỏng + k6 500 lượt/giây (`tooling/loadtest`) | PRD §7.3–7.4 | ✅ đã xong |

**Gate P0:** trên điện thoại thật, quét QR → quay → nhận mã → đổi tại quầy → số hiện ở Tổng quan; 0 sai lệch trong mô phỏng.

### P1 — Kết quả và playbook · 23/11 → 13/12 (3 tuần)

| # | Việc | PRD | Trạng thái |
|---|---|---|---|
| P1.1 | Luồng tạo bắt đầu bằng mục tiêu; 3 playbook F&B | PLB-01, PLB-02 | ✅ đã xong |
| P1.2 | Nhập ngân sách và giá vốn quà; gợi ý cơ cấu quà; mô phỏng dùng ngân sách | PLB-02, PRZ-08 | ✅ đã xong |
| P1.3 | Tổng quan theo kết quả: khách tới quầy, quay lại, chi phí quà; báo cáo một trang | PLB-03, PLB-04 | ✅ đã xong |
| P1.4 | Link theo kênh (QR bàn, fanpage, Zalo) | EVT-11 | ✅ đã xong |
| P1.5 | Chống gian lận mức Chuẩn (rate limit, thiết bị, Turnstile) | EVT-13 | ✅ Thấp/Chuẩn (Cao: M2) |

**Gate P1:** 5 người không làm thiết kế dựng được chương trình Tết từ playbook trong ≤ 10 phút.

### P2 — Sẵn sàng pilot · 14/12 → 03/01 (3 tuần)

Phạm vi mở rộng theo [D-26](./decisions.md) (review tính năng 31/10). Cắt từ dưới lên (Could → Should) nếu trễ; không dời mốc pilot.

| # | Việc | PRD | Ưu tiên |
|---|---|---|---|
| P2.1 | Art thật cho 3 mẫu × skin Tết và quanh năm (thuê ngoài hoặc mua bộ hình) | BLD-06 | Must |
| P2.2 | Mẫu standee/tent card in QR cho quầy | EVT-10 | ✅ đã xong |
| P2.3 | Kích hoạt gói thủ công, watermark Free | BIL-01, BIL-02 | ✅ đã xong |
| P2.4 | Thể lệ mẫu và consent theo [compliance](../business/compliance.md); ý kiến luật sư cho kịch bản quán | — | Must |
| P2.5 | Hạ tầng production + backup + runbook ([operations](../operations/environments-deploy.md)) | — | Must |
| P2.6 | Cào thẻ, mở hộp trên API thật; hứng quà nếu còn thời gian | GAM-04 | ✅ cào thẻ, mở hộp · hứng quà dời M2 |
| P2.7 | Hạn mức chặn lúc phát giải, quầy không bao giờ từ chối ([D-23](./decisions.md)) | BIL-02 | Must |
| P2.8 | Cứu mã quà: tra theo SĐT ở quầy, lưu + khôi phục "Quà của tôi" ([D-25](./decisions.md)) | PRZ-15, PRZ-16 | Must |
| P2.9 | Máy quầy ghép QR ([D-24](./decisions.md), [ADR-017](../adr/017-counter-device-pairing.md)) + nhãn quán | ORG-10, PRZ-17 | Must / Should |
| P2.10 | Quầy PWA + chế độ tập huấn | PRZ-18, PRZ-19 | Should |
| P2.11 | Email tóm tắt hằng ngày | ANL-10 | Should |
| P2.12 | Bìa minh bạch, QR chơi thử trên điện thoại, checklist "Sẵn sàng mở bán", nút Zalo OA, câu hỏi baseline | BLD-25, BLD-26, BLD-29, RET-07, PLB-08 | Should |
| P2.13 | Export CSV/XLSX | ANL-02 | Should |
| P2.14 | Lỗ hổng M1 lộ ra khi đối chiếu PRD với code ([D-28](./decisions.md)): link nháp công khai, danh sách người chơi, thêm tồn kho khi đang chạy | BLD-23, EVT-02, PRZ-01 | Should |
| P2.15 | Quà lần sau; hiệu quả theo quà; màu từ logo; thao tác khẩn trên điện thoại | RET-06, PLB-10, BLD-27, EVT-15 | Could |
| P2.16 | Sửa nóng chữ/nhãn; chỉnh hạn đổi quà; luật kiểm tra còn thiếu (cảnh báo theo mô phỏng, chưa chơi thử, màn > 60 phần tử) ([D-28](./decisions.md)) | BLD-08, PRZ-10, BLD-09 | Could |
| P2.17 | Cắt ảnh theo ô; lệnh `gen:template`; chạy thử bằng bot; impersonate có log + lịch chương trình sắp chạy; audit lượt đổi quà/gia hạn/tồn kho/export | BLD-13, BLD-24, EVT-09, ADM-01, ADM-02, ORG-06 | Could |
| P2.18 | Theo dõi nhịp phát quà (có thể làm trong tuần đầu pilot) | PRZ-22 | Should |

**Gate P2:** checklist kỹ thuật trong [runbook](../operations/runbook.md) xanh; ≥ 5 quán đã hẹn ngày chạy; xong mọi việc **Must**.

### Pilot Tết · 04/01 → 21/02/2027

- Dựng hộ miễn phí 5–10 quán F&B ([D-19](./decisions.md)) bằng chính Studio; ghi lại mọi chỗ mình thấy khó.
- Mỗi tuần: gọi từng quán 10 phút, đọc số liệu cùng họ.
- Tuần đầu (04/01 → 10/01): bật theo dõi nhịp phát quà (PRZ-22) nếu chưa kịp ở P2, dùng số liệu thật của các quán để chỉnh tỷ lệ trúng.
- Không phát hành tính năng mới trong 7 ngày quanh Tết (30/01 – 10/02); chỉ sửa lỗi.

### Tổng kết · 22/02 → 28/02

**Gate M1:** 0 sai lệch giải · ≥ 5 quán chạy · ≥ 1.000 lượt đổi quà · ≥ 3 quán muốn trả tiền để chạy tiếp · 3 case study có số liệu. Viết lại [strategy](./strategy.md) và [decisions](./decisions.md) theo kết quả.

### M0 chạy song song (26/10 → 22/11)

| Việc | Kết quả |
|---|---|
| 15 phỏng vấn chủ quán F&B theo [customer-interview-guide](../research/customer-interview-guide.md) | Bảng tổng hợp lý do, cách đo khuyến mại hiện tại, giá sẵn lòng trả |
| Tự dựng một chương trình trên WOAY và vòng quay miễn phí, đo thời gian | 3 điểm đối thủ làm khó |
| Dùng Builder Lab làm vật demo khi phỏng vấn | Phản ứng với Sửa nhanh, Luật & giải, Quầy đổi quà |
| Chọn 5–10 quán pilot | Danh sách có ngày chạy |

**Gate M0 (22/11):** ≥ 15 phỏng vấn, ≥ 5 quán nhận pilot. Nếu < 3 quán: dừng build tính năng mới, dành 2 tuần chỉ để tìm quán.

---

## 3. Sau pilot (định hướng, lập lại sau Gate M1)

| Giai đoạn | Thời gian `[GĐ]` | Trọng tâm | Gate |
|---|---|---|---|
| **M2** Self-serve + giữ chân v1 | 03 – 05/2027 (8/3, 30/4) | PayOS thuê bao; chợ mẫu công khai (SEO); điểm danh, bốc mỗi ngày; chụp ảnh → xoá nền; AI chữ và AI dựng nháp; renderer instant-win mới (đập trứng, lật thẻ, lưới 9 ô); OTP; bốc thăm cuối chương trình; từ review 31/10: thẻ thành viên + hồ sơ khách theo tổ chức (RET-08, ANL-08), khách quay lại theo lượt ghé (PLB-09), chơi trước SĐT sau (EVT-17), luồng "60 giây" (BLD-28), nhật ký quầy (PRZ-20), hồ sơ thông báo khuyến mại (CMP-06), mã tại quầy xoay vòng (EVT-16), báo cáo chia sẻ được (PLB-11), bản đồ nhiệt giờ × thứ (ANL-09), cảm giác trúng (GAM-05), quà hết hạn quay về kho (PRZ-21, chờ luật sư); hứng quà + `score_threshold` dời từ M1 (GAM-02, GAM-04, PRZ-06); quản lý cửa hàng + điểm đổi quà cho gói Chuỗi (ORG-12, PRZ-14); 2FA (ORG-07); quà lần sau nếu chưa kịp M1 (RET-06) | ≥ 50 quán trả phí; retention tháng 2 ≥ 60% |
| **M3** Zalo + giữ chân v2 | 06 – 09/2027 (hè, Trung thu) | Zalo OA/ZNS/đăng nhập; nhắc quay lại; hub điểm; sưu tầm thẻ; mã tham gia; kiosk; benchmark theo ngành; playbook ngành thứ hai | ≥ 200 quán trả phí |
| **M4** Kênh + Tết 2028 | 10 – 12/2027 | Agency/reseller, luồng client duyệt (ORG-11); POS (KiotViet, Sapo); up hoá đơn; webhook/API; mở bán Tết 2028 từ tháng 9 | 1.000 quán trả phí mùa Tết 2028 |

---

## 4. Không làm cho tới Gate M1

- Đổi theme, đổi thư viện UI, refactor kiến trúc không chặn vòng lõi.
- Canvas trên điện thoại, nhóm/chọn nhiều phần tử, hiệu ứng nâng cao.
- Engine giữ chân (điểm danh, hub điểm, sưu tầm thẻ), AI, xoá nền ảnh. Quà lần sau (RET-06) là voucher cố định, không phải engine giữ chân, nên được làm ở P2 (Could).
- Agency/white-label, POS, webhook.
- Mẫu thứ tư trở đi (kể cả hứng quà, đã dời M2).

Việc nằm ngoài danh sách P0–P2 cần một dòng trong [decisions.md](./decisions.md) giải thích vì sao làm ngay.
