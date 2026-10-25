# Playora — Bộ tài liệu dự án

> **Playora** là nền tảng dựng minigame có thưởng cho chiến dịch marketing tại Việt Nam, bán qua agency. Dựng trong 30 phút từ template × skin theo mùa, giải thưởng được kiểm soát chặt và minh bạch, chạy online và tại booth. *"Dựng minigame có thưởng trong 30 phút."*

Cập nhật: 24/10/2026 · Trạng thái: **v2.1**, chỉ làm minigame campaign có thưởng; bỏ hẳn Live add-on (game LED, Host Console, Screen), lucky draw sân khấu thay bằng bốc thăm cuối chương trình online (xem [00 §10](./00-product-strategy.md#10-thay-đổi-so-với-v10))

## Bắt đầu từ đâu

| Bạn là | Đọc |
|---|---|
| Nhà đầu tư, lãnh đạo, đối tác | [03-proposal.md](./03-proposal.md) → [00-product-strategy.md](./00-product-strategy.md) |
| PM, Designer | [00-product-strategy.md](./00-product-strategy.md) → [prd.md](./prd.md) → [12-builder-spec.md](./12-builder-spec.md) → [04-game-catalog.md](./04-game-catalog.md) → [13-design-system.md](./13-design-system.md) |
| Developer | [00-product-strategy.md](./00-product-strategy.md) → [05-architecture.md](./05-architecture.md) → [12-builder-spec.md](./12-builder-spec.md) → [06](./06-data-model.md) / [07](./07-api-realtime.md) → [10-dev-setup-conventions.md](./10-dev-setup-conventions.md) |
| BD, Sales | [02-business-model.md](./02-business-model.md) → [01-market-research.md](./01-market-research.md) → [11-game-builder-research.md](./11-game-builder-research.md) |

## Danh mục

| Tài liệu | Nội dung |
|---|---|
| [00-product-strategy.md](./00-product-strategy.md) | **Nguồn chân lý:** định nghĩa sản phẩm, ICP, định vị, kiến trúc sản phẩm, nguyên tắc, **giai đoạn MVP M0–M4** và gate, chỉ số, giả định rủi ro |
| [01-market-research.md](./01-market-research.md) | Quy mô thị trường, đối thủ, insight khách hàng, mùa vụ, SWOT, kế hoạch kiểm chứng |
| [02-business-model.md](./02-business-model.md) | Business model canvas, bảng giá (Free / Campaign Pass / Agency năm / Enterprise), GTM, unit economics, dự phóng |
| [03-proposal.md](./03-proposal.md) | Proposal trình bày (Gamified Campaign Builder) |
| [prd.md](./prd.md) | Yêu cầu sản phẩm theo giai đoạn M1–M4, NFR, tiêu chí nghiệm thu M1 |
| [04-game-catalog.md](./04-game-catalog.md) | Danh mục minigame (campaign, booth) theo giai đoạn; đặc tả 4 minigame M1 và bốc thăm cuối chương trình |
| [05-architecture.md](./05-architecture.md) | Kiến trúc, tech stack (Bun, Next.js, NestJS, Drizzle), monorepo, play engine + prize engine trên API, ADR, đơn giản hoá cho M1 |
| [06-data-model.md](./06-data-model.md) | Drizzle schema |
| [07-api-realtime.md](./07-api-realtime.md) | REST API và public API (phần realtime đã bỏ ở v2.1) |
| [08-security-compliance.md](./08-security-compliance.md) | Chống gian lận, bảo mật, PDPL 2025, quy định khuyến mại |
| [09-roadmap-plan.md](./09-roadmap-plan.md) | Sprint plan M0–M1 (gỡ live engine, play engine, prize engine v1, chống gian lận, 4 minigame), các track M2–M4, gate, đội ngũ, ngân sách, rủi ro |
| [10-dev-setup-conventions.md](./10-dev-setup-conventions.md) | Scaffold monorepo, convention, CI/CD, testing |
| [adr/](./adr/README.md) | Quyết định kiến trúc; [ADR-011](./adr/011-remove-live-engine.md) gỡ live engine (thay ADR-004) |
| [11-game-builder-research.md](./11-game-builder-research.md) | Nghiên cứu sâu builder: Guandayun/凡科, Trung Quốc, quốc tế, Việt Nam |
| [12-builder-spec.md](./12-builder-spec.md) | Đặc tả builder (tính năng lõi) và phân kỳ theo M1–M4 |
| [13-design-system.md](./13-design-system.md) | Design system: token 3 tầng, skin + brand kit, component Studio và game/LED |
| [16-studio-ux.md](./16-studio-ux.md) | UX Studio: mô hình chương trình hai chế độ (Soạn / Vận hành), điều hướng, luồng chính, lộ trình S1–S8 |

## Quy ước

- **Giai đoạn:** M0 Discovery (26/10–06/11/2026) · **M1** MVP "Tết Campaign" (→ 11/12/2026, pilot đến 06/02/2027) · **M2** Self-serve & Agency (22/02–30/04/2027) · **M3** Booth & Activation (05–07/2027) · **M4** Scale & Platform (08–12/2027) · Later (2028+).
- Số liệu thị trường có trích nguồn. Số **giả định** gắn nhãn `[GĐ]`; số **chưa xác minh** gắn nhãn `[CXM]`.
- "Guandayun" là **观达云互动** (guandayun.com), gần như chắc chắn là đại lý OEM của **凡科互动** (hd.fkw.com). Xem [11-game-builder-research.md](./11-game-builder-research.md).
- Khi có mâu thuẫn giữa các tài liệu, [00-product-strategy.md](./00-product-strategy.md) là chuẩn.
