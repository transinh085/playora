# Lộ trình

Cập nhật: 26/10/2026 · Owner: PO · Theo [strategy §10](./strategy.md#10-lộ-trình) · Năng lực: **một founder vừa code vừa bán** · Tết Đinh Mùi: 06/02/2027

Lộ trình cũ cho đội 6–8 người (M0–M4 theo sprint) ở [archive/2026-10-24-roadmap-v2.1.md](../archive/2026-10-24-roadmap-v2.1.md).

---

## 1. Nguyên tắc lập kế hoạch

1. **Mỗi tuần có thời gian cho khách.** Khoảng 70% build, 30% nói chuyện với quán, dựng hộ, đọc số liệu. Tuần nào không có cuộc nói chuyện với quán nào là tuần trượt kế hoạch.
2. **Vòng lõi trước, đánh bóng sau** ([D-18](./decisions.md)). Không làm theme, refactor hay canvas nâng cao khi vòng QR → chơi → đổi quà → báo cáo chưa chạy với API thật.
3. **Gate dựa trên bằng chứng.** Qua gate mới mở việc của giai đoạn sau; trượt gate thì quay lại câu hỏi, không chạy tiếp.
4. **Cắt phạm vi, không dời mốc pilot.** Nếu trễ: bỏ hứng quà (skill) sang M2, giữ 2 mẫu instant-win.

---

## 2. M0 + M1: vòng lõi và pilot Tết (26/10/2026 – 28/02/2027)

```
Tuần   44   45   46   47 │ 48   49   50 │ 51   52   01 │ 02 ─────────── 07 │ 08   09
      ├── P0 vòng lõi ───┤├─ P1 kết quả ─┤├─ P2 sẵn sàng┤├── PILOT TẾT ─────┤├ tổng kết ┤
      ├── M0: 15 phỏng vấn, chọn 5–10 quán pilot ──────┤        Tết 06/02 ▲
```

### P0 — Vòng lõi thật · 26/10 → 22/11 (4 tuần)

Mục tiêu: những gì Builder Lab đang làm bằng backend giả chạy bằng API thật ([studio-ux §5 bước B](./specs/studio-ux.md#5-lộ-trình-cập-nhật-25102026-sau-builder-lab)).

| # | Việc | PRD |
|---|---|---|
| P0.1 | Chốt cách lưu Campaign ([ADR-015](../adr/015-campaign-persistence.md)); contract `campaigns`, `plays`, `vouchers`, `stats` | BLD-08, GAM-01 |
| P0.2 | Bảng `plays`, `play_counters`, `voucher_codes`, `prize_counters`; nối `packages/core/src/prize` vào API (tồn kho, giới hạn, ngân sách, rải quà) | PRZ-05, PRZ-07, PRZ-09 |
| P0.3 | API lượt chơi idempotent; Play đọc chương trình đã phát hành, chạy Bìa → Form → Game → Kết quả → Quà của tôi | GAM-01, BLD-07, PRZ-03 |
| P0.4 | Quầy đổi quà với API thật; vai trò "chỉ đổi quà" | PRZ-10, ORG-02a |
| P0.5 | Studio đổi `mock/hooks.ts` sang `useRouteQuery`/`useRouteMutation`; e2e có cross-tenant | — |
| P0.6 | Test 1 triệu lượt mô phỏng + k6 500 lượt/giây | PRD §7.3–7.4 |

**Gate P0:** trên điện thoại thật, quét QR → quay → nhận mã → đổi tại quầy → số hiện ở Tổng quan; 0 sai lệch trong mô phỏng.

### P1 — Kết quả và playbook · 23/11 → 13/12 (3 tuần)

| # | Việc | PRD |
|---|---|---|
| P1.1 | Luồng tạo bắt đầu bằng mục tiêu; 3 playbook F&B | PLB-01, PLB-02 |
| P1.2 | Nhập ngân sách và giá vốn quà; gợi ý cơ cấu quà; mô phỏng dùng ngân sách | PLB-02, PRZ-08 |
| P1.3 | Tổng quan theo kết quả: khách tới quầy, quay lại, chi phí quà; báo cáo một trang | PLB-03, PLB-04 |
| P1.4 | Link theo kênh (QR bàn, fanpage, Zalo) | EVT-11 |
| P1.5 | Chống gian lận mức Chuẩn (rate limit, thiết bị, Turnstile) | EVT-13 |

**Gate P1:** 5 người không làm thiết kế dựng được chương trình Tết từ playbook trong ≤ 10 phút.

### P2 — Sẵn sàng pilot · 14/12 → 03/01 (3 tuần)

| # | Việc | PRD |
|---|---|---|
| P2.1 | Art thật cho 3 mẫu × skin Tết và quanh năm (thuê ngoài hoặc mua bộ hình) | BLD-06 |
| P2.2 | Mẫu standee/tent card in QR cho quầy | EVT-10 |
| P2.3 | Kích hoạt gói thủ công, watermark Free | BIL-01, BIL-02 |
| P2.4 | Thể lệ mẫu và consent theo [compliance](../business/compliance.md); ý kiến luật sư cho kịch bản quán | — |
| P2.5 | Hạ tầng production + backup + runbook ([operations](../operations/environments-deploy.md)) | — |
| P2.6 | Cào thẻ, mở hộp trên API thật; hứng quà nếu còn thời gian | GAM-04 |

**Gate P2:** checklist kỹ thuật trong [runbook](../operations/runbook.md) xanh; ≥ 5 quán đã hẹn ngày chạy.

### Pilot Tết · 04/01 → 21/02/2027

- Dựng hộ miễn phí 5–10 quán F&B ([D-19](./decisions.md)) bằng chính Studio; ghi lại mọi chỗ mình thấy khó.
- Mỗi tuần: gọi từng quán 10 phút, đọc số liệu cùng họ.
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
| **M2** Self-serve + giữ chân v1 | 03 – 05/2027 (8/3, 30/4) | PayOS thuê bao; chợ mẫu công khai (SEO); điểm danh, bốc mỗi ngày; chụp ảnh → xoá nền; AI chữ và AI dựng nháp; renderer instant-win mới (đập trứng, lật thẻ, lưới 9 ô); OTP; bốc thăm cuối chương trình | ≥ 50 quán trả phí; retention tháng 2 ≥ 60% |
| **M3** Zalo + giữ chân v2 | 06 – 09/2027 (hè, Trung thu) | Zalo OA/ZNS/đăng nhập; nhắc quay lại; hub điểm; sưu tầm thẻ; mã tham gia; kiosk; benchmark theo ngành; playbook ngành thứ hai | ≥ 200 quán trả phí |
| **M4** Kênh + Tết 2028 | 10 – 12/2027 | Agency/reseller; POS (KiotViet, Sapo); up hoá đơn; webhook/API; mở bán Tết 2028 từ tháng 9 | 1.000 quán trả phí mùa Tết 2028 |

---

## 4. Không làm cho tới Gate M1

- Đổi theme, đổi thư viện UI, refactor kiến trúc không chặn vòng lõi.
- Canvas trên điện thoại, nhóm/chọn nhiều phần tử, hiệu ứng nâng cao.
- Engine giữ chân, AI, xoá nền ảnh.
- Agency/white-label, POS, webhook.
- Mẫu thứ năm trở đi.

Việc nằm ngoài danh sách P0–P2 cần một dòng trong [decisions.md](./decisions.md) giải thích vì sao làm ngay.
