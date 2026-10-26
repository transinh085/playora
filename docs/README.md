# Tài liệu Playora

> **Playora** giúp quán nhỏ kéo khách tới và giữ khách quay lại bằng minigame có thưởng mang đúng sản phẩm của quán: dựng trong vài phút, giải không bao giờ phát sai, đổi quà tại quầy, báo lại bằng kết quả kinh doanh. Builder là lõi; kết quả là thứ để bán.

Cập nhật: 26/10/2026 · Chiến lược **v4.0** · Giai đoạn hiện tại: **M0 + P0 vòng lõi** ([roadmap](./product/roadmap.md))

## Cấu trúc

```
docs/
├── product/            SẢN PHẨM & NGHIỆP VỤ — PO sở hữu, ràng buộc
│   ├── strategy.md         nguồn chân lý: định nghĩa, ICP, định vị, nguyên tắc, chỉ số
│   ├── prd.md              yêu cầu theo ID và giai đoạn, kèm hiện trạng
│   ├── roadmap.md          kế hoạch theo tuần, gate
│   ├── decisions.md        nhật ký quyết định sản phẩm (D-xx) + câu hỏi mở
│   ├── glossary.md         thuật ngữ UI ↔ code
│   └── specs/              đặc tả nghiệp vụ theo mảng
│       ├── playbooks.md        playbook theo mục tiêu, báo cáo kết quả
│       ├── builder.md          mẫu, skin, flow, 3 chế độ soạn, vòng đời
│       ├── prizes-redemption.md  prize engine, mô phỏng, đổi quà, bốc thăm
│       ├── participation.md    danh tính, điều kiện, giữ chân, chống gian lận, kênh
│       ├── game-catalog.md     danh mục mẫu và đặc tả mẫu M1
│       └── studio-ux.md        điều hướng, luồng, bố cục Studio
├── business/           KINH DOANH & PHÁP LÝ
│   ├── business-model.md   giá, GTM, unit economics, rủi ro
│   └── compliance.md       khuyến mại, PDPL, thuế, điều khoản
├── research/           NGHIÊN CỨU — đầu vào, không ràng buộc
│   ├── market-research.md, builder-research.md, guandayun-teardown.md
│   └── customer-interview-guide.md
├── engineering/        KỸ THUẬT — Tech Lead sở hữu
│   ├── architecture.md     kiến trúc, game runtime, play/prize engine, auth
│   ├── data-model.md, api.md
│   ├── conventions.md      quy trình thêm tính năng, quy tắc code, test
│   ├── design-system.md    token, Studio look, game UI
│   ├── builder-components.md  thành phần builder, 4 tầng tuỳ biến, yêu cầu GB-*
│   └── security.md         chống gian lận, bảo mật ứng dụng
├── operations/         TRIỂN KHAI & VẬN HÀNH
│   ├── environments-deploy.md  môi trường, CI/CD, Docker, backup
│   └── runbook.md          vận hành chương trình, sự cố, checklist trước pilot
├── adr/                QUYẾT ĐỊNH KIẾN TRÚC (ADR-NNN)
├── plans/              kế hoạch thực thi có ngày (đã chạy hoặc đang chạy)
└── archive/            bản cũ không còn hiệu lực
```

## Đọc gì trước

| Bạn là | Đọc |
|---|---|
| Mới vào dự án, nhà đầu tư | [strategy](./product/strategy.md) → [business-model](./business/business-model.md) → [roadmap](./product/roadmap.md) |
| Làm sản phẩm, thiết kế | [strategy](./product/strategy.md) → [prd](./product/prd.md) → [specs/](./product/specs/) → [design-system](./engineering/design-system.md) |
| Developer, AI agent | [AGENTS.md](../AGENTS.md) → [conventions](./engineering/conventions.md) → [architecture](./engineering/architecture.md) → spec của tính năng đang làm → [adr/](./adr/README.md) |
| Vận hành pilot | [runbook](./operations/runbook.md) → [specs/prizes-redemption §6](./product/specs/prizes-redemption.md#6-đổi-quà-tại-quầy) → [compliance](./business/compliance.md) |

## Thứ tự ưu tiên khi mâu thuẫn

1. [product/strategy.md](./product/strategy.md) — định hướng.
2. [product/decisions.md](./product/decisions.md) và [adr/](./adr/README.md) — quyết định mới hơn thắng.
3. [product/prd.md](./product/prd.md) và [product/specs/](./product/specs/) — yêu cầu.
4. [engineering/](./engineering/) — cách làm.
5. [research/](./research/), [plans/](./plans/), [archive/](./archive/) — tham khảo, không ràng buộc.

Thấy mâu thuẫn thì sửa tài liệu cấp thấp hơn trong cùng PR, hoặc ghi vào câu hỏi mở của [decisions.md](./product/decisions.md#câu-hỏi-đang-mở).

## Quy ước viết

- **Đặt file:** đúng thư mục theo bảng trên; tên `kebab-case.md`, không đánh số. Kế hoạch có ngày: `plans/YYYY-MM-DD-ten.md`. ADR: `adr/NNN-ten.md` theo [mẫu](./adr/000-template.md).
- **Dòng đầu mỗi file:** `Cập nhật: dd/mm/yyyy · Owner: … · Liên quan: …`.
- **Ngôn ngữ:** tiếng Việt; thuật ngữ theo [glossary](./product/glossary.md). Tên trong code giữ tiếng Anh.
- **Nhãn:** `[GĐ]` số giả định · `[CXM]` chưa xác minh · M0–M4 giai đoạn · `BLD-01` ID yêu cầu · `D-xx` quyết định sản phẩm · `ADR-xxx` quyết định kiến trúc.
- **Link:** đường dẫn tương đối. Code trích tài liệu theo dạng `docs/<thư mục>/<file>.md §n`; đổi số mục thì sửa luôn chỗ trích trong code (`git grep "docs/"`).
- **Khi nào viết gì:**

| Việc | Ghi vào |
|---|---|
| Đổi phạm vi, khách hàng, giá, thứ tự ưu tiên | Dòng mới trong [decisions.md](./product/decisions.md), rồi sửa strategy/prd |
| Lựa chọn kỹ thuật khó đảo ngược | ADR mới |
| Tính năng mới | ID trong [prd.md](./product/prd.md) + mục trong spec của mảng |
| Kế hoạch nhiều bước có ngày | `plans/` |
| Tài liệu hết hiệu lực | Chuyển vào `archive/`, thêm dòng "LƯU TRỮ" ở đầu |
