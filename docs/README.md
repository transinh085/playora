# Playora — Bộ tài liệu dự án

> **Playora** là nền tảng dựng và vận hành game tương tác *tại sự kiện* cho agency và doanh nghiệp Việt Nam, từ sân khấu LED đến booth activation. Dựng trong 30 phút, hàng nghìn người chơi cùng lúc bằng điện thoại, giải thưởng minh bạch. *"Cả hội trường cùng chơi."*

Cập nhật: 23/10/2026 · Trạng thái: **v1.0**, đã định hình sản phẩm sau nghiên cứu builder

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
| [02-business-model.md](./02-business-model.md) | Business model canvas, bảng giá (Free / Live Pass / Agency / Campaign Pro / Enterprise), GTM, unit economics, dự phóng |
| [03-proposal.md](./03-proposal.md) | Proposal trình bày |
| [prd.md](./prd.md) | Yêu cầu sản phẩm theo giai đoạn M1–M4, NFR, tiêu chí nghiệm thu M1 |
| [04-game-catalog.md](./04-game-catalog.md) | Danh mục template live và booth theo giai đoạn; đặc tả 4 game M1 |
| [05-architecture.md](./05-architecture.md) | Kiến trúc, tech stack (Bun, Next.js, NestJS, Drizzle), monorepo, realtime, ADR, đơn giản hoá cho M1 |
| [06-data-model.md](./06-data-model.md) | Drizzle schema |
| [07-api-realtime.md](./07-api-realtime.md) | REST API, giao thức realtime |
| [08-security-compliance.md](./08-security-compliance.md) | Chống gian lận, bảo mật, PDPL 2025, quy định khuyến mại |
| [09-roadmap-plan.md](./09-roadmap-plan.md) | Sprint plan M0–M1, các track M2–M4, đội ngũ, ngân sách, rủi ro |
| [10-dev-setup-conventions.md](./10-dev-setup-conventions.md) | Scaffold monorepo, convention, CI/CD, testing |
| [11-game-builder-research.md](./11-game-builder-research.md) | Nghiên cứu sâu builder: Guandayun/凡科, Trung Quốc, quốc tế, Việt Nam |
| [12-builder-spec.md](./12-builder-spec.md) | Đặc tả builder (tính năng lõi) và phân kỳ theo M1–M4 |
| [13-design-system.md](./13-design-system.md) | Design system: token 3 tầng, skin + brand kit, component Studio và game/LED |

## Quy ước

- **Giai đoạn:** M0 Discovery (26/10–06/11/2026) · **M1** MVP "YEP Live" (→ 11/12/2026, pilot đến 05/02/2027) · **M2** Live Self-serve & Agency (22/02–29/04/2027) · **M3** Booth & Activation (05–07/2027) · **M4** Scale & Platform (08–12/2027) · Later (2028+).
- Số liệu thị trường có trích nguồn. Số **giả định** gắn nhãn `[GĐ]`; số **chưa xác minh** gắn nhãn `[CXM]`.
- "Guandayun" là **观达云互动** (guandayun.com), gần như chắc chắn là đại lý OEM của **凡科互动** (hd.fkw.com). Xem [11-game-builder-research.md](./11-game-builder-research.md).
- Khi có mâu thuẫn giữa các tài liệu, [00-product-strategy.md](./00-product-strategy.md) là chuẩn.
