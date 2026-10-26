# Architecture Decision Records

ADR ghi lại **quyết định kỹ thuật khó đảo ngược** và lý do của nó, để người sau (và agent) không phải đoán vì sao code lại như vậy.

## Khi nào viết ADR

| Viết ADR | Không viết ADR |
|---|---|
| Chọn hoặc đổi công nghệ, thư viện nền, runtime | Quyết định sản phẩm: ICP, giá, phạm vi giai đoạn, làm/không làm tính năng → [../product/decisions.md](../product/decisions.md) |
| Kiến trúc, ranh giới module/package, luồng dữ liệu nóng | Chi tiết triển khai đổi được trong một PR |
| Mô hình dữ liệu, cách lưu trữ, bảo mật, multi-tenant | Kế hoạch theo thời gian → [../plans/](../plans/) |

Thêm dependency mới vẫn phải nêu lý do trong PR (AGENTS.md); chỉ cần ADR khi nó trở thành nền của một phần lớn.

## Quy trình

1. Copy [000-template.md](./000-template.md) thành `NNN-kebab-case.md` (số tiếp theo, 3 chữ số).
2. Điền đủ: Bối cảnh · Quyết định · Phương án đã cân nhắc · Hệ quả · Kiểm chứng · Lịch sử. Trạng thái bắt đầu là **Proposed**.
3. Thêm một dòng vào bảng dưới, mở PR. Founder duyệt thì đổi sang **Accepted** và ghi ngày vào Lịch sử.

## Vòng đời

```
Proposed ──► Accepted ──► Superseded by ADR-x   (có ADR mới thay thế)
                    └──► Deprecated            (không còn áp dụng, không có thay thế)
```

- **Không xoá** ADR, kể cả khi bị thay.
- **Không viết lại lịch sử:** ADR đã Accepted chỉ được bổ sung dòng có ngày ở mục "Lịch sử" (cập nhật trạng thái thực hiện, số đo mới, đổi nhỏ). Đổi quyết định thì viết ADR mới và đánh dấu ADR cũ Superseded (toàn phần hoặc một phần).
- Link tới tài liệu khác bằng đường dẫn tương đối (`../engineering/…`, `../product/…`).

## Danh mục

| ADR | Quyết định | Trạng thái | Ngày |
|---|---|---|---|
| [000](./000-template.md) | Mẫu ADR | — | 26/10/2026 |
| [001](./001-monorepo-bun-turborepo.md) | Monorepo Bun workspaces + Turborepo; internal packages là TS source; Biome | Accepted | 23/10/2026 |
| [002](./002-nestjs-on-bun.md) | NestJS 12 chạy trên Bun (fallback Node 24 LTS) | Accepted (sơ bộ, còn soak test) | 23/10/2026 |
| [003](./003-drizzle-postgres.md) | Drizzle ORM 0.45 + postgres.js; migration bằng `drizzle-kit generate` | Accepted | 23/10/2026 |
| [004](./004-realtime-socketio-single-node.md) | Socket.IO, một node realtime | Superseded by [011](./011-remove-live-engine.md) | 23/10/2026 |
| [005](./005-zod-contracts.md) | Contracts zod v4; validate qua `@Route`/`@Args`; OpenAPI `/v1/openapi.json` | Accepted | 23/10/2026 |
| [006](./006-better-auth.md) | Better Auth 1.7 tại `/auth` (plugin organization); JWT riêng cho người chơi | Accepted | 23/10/2026 |
| [007](./007-typescript-6.md) | Pin TypeScript 6.0, chưa lên 7 | Accepted | 23/10/2026 |
| [008](./008-contract-first-api.md) | API contract-first, typed client không codegen | Accepted | 23/10/2026 |
| [009](./009-frontend-stack.md) | TanStack Query, next-intl (cookie locale), next-themes, `proxy.ts`, font | Accepted · Superseded một phần by [013](./013-antd-ui.md) | 23/10/2026 |
| [010](./010-testing-strategy.md) | Unit + integration trên DB thật + contract runtime + Playwright; cross-tenant bắt buộc | Accepted | 23/10/2026 |
| [011](./011-remove-live-engine.md) | Gỡ live engine (realtime/LED); code ở tag `archive/live-engine` | Accepted · đã thực hiện | 24/10/2026 |
| [012](./012-campaign-architecture.md) | Play engine + prize engine trên API, Game SDK v2 (`instant`/`skill`), dữ liệu campaign | Accepted · đang thực hiện | 24/10/2026 |
| [013](./013-antd-ui.md) | Ant Design v6 mọi bề mặt, `useZodForm`, ngân sách bundle Play ≤ 260 KB | Accepted | 24/10/2026 |
| [014](./014-free-canvas-screen-editor.md) | Canvas tự do cho các màn (artboard 375, `gameStage`, một renderer); chế độ Tuỳ biến của builder | Accepted (26/10/2026) | 25/10/2026 |
| [015](./015-campaign-persistence.md) | Lưu Campaign trên `events` + `games` + `game_versions`; contract `campaigns`/`plays`/`vouchers`/`stats`; vai trò "chỉ đổi quà" | Accepted | 26/10/2026 |
