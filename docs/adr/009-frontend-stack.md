# ADR-009: Frontend stack (data, i18n, theme, auth gate)

| | |
|---|---|
| **Trạng thái** | Accepted · **Superseded một phần** by [ADR-013](./013-antd-ui.md) (UI, form, toast) |
| **Ngày** | 23/10/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | [ADR-008](./008-contract-first-api.md), [ADR-013](./013-antd-ui.md) · [../engineering/design-system.md](../engineering/design-system.md) |

## Bối cảnh

Ba app Next.js 16 (Studio, Play, Web) cần cùng cách lấy dữ liệu, đa ngôn ngữ, sáng/tối và chặn trang khi chưa đăng nhập.

## Quyết định

Phần **còn hiệu lực**:

| Lớp | Lựa chọn |
|---|---|
| Server state | TanStack Query 5 qua `@playora/api-client/react` |
| i18n | next-intl 4, **không** có tiền tố locale trong URL Studio; locale lấy từ cookie `playora_locale` (mặc định `vi`); type key từ `vi.json`; test đảm bảo `en` đủ key và mọi `ErrorCode` đều có message |
| Theme | next-themes (class `dark`) ở Studio |
| Auth gate | `proxy.ts` (Next 16) kiểm tra cookie Better Auth; server layout xác thực thật qua API |
| Font | Studio: **Google Sans** (text) + **Unbounded** (display). Play và Web: **Be Vietnam Pro** (text) + **Unbounded** (display). Tất cả qua `next/font/google`, subset `vietnamese` |

Phần **đã bị thay** bởi [ADR-013](./013-antd-ui.md):

| Lớp | Trước | Nay |
|---|---|---|
| UI | shadcn/ui (Radix) trong `packages/ui`, `@playora/ui/components/*` | Ant Design v6 + `@playora/ui/{theme,providers,form,game}` |
| Form | react-hook-form 7 + `@hookform/resolvers` | antd `Form` + `useZodForm` |
| Toast | sonner | `App.useApp()` của antd |

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| Locale trong URL (`/vi/...`) cho Studio | Studio không cần SEO; URL gọn hơn |
| SWR | TanStack Query có mutation, invalidation tốt hơn và hook sinh từ contract |

## Hệ quả

- **Tốt:** hook dữ liệu có type từ contract; i18n có test bắt thiếu key.
- **Chi phí:** Play phải giữ bundle nhỏ; ngân sách hiện hành ở [ADR-013](./013-antd-ui.md) (≤ 260 KB gzip mục tiêu, trần 280 KB), thay mức ≤ 200 KB ban đầu.

## Kiểm chứng

- Test i18n (đủ key `en`, mọi `ErrorCode` có message).
- E2E Playwright fail khi trình duyệt log lỗi console; lỗi i18n `slugHint` đầu tiên được phát hiện theo cách này.

## Lịch sử

- 23/10/2026: Accepted (shadcn/ui, react-hook-form, sonner, Be Vietnam Pro cho mọi app).
- 24/10/2026: UI, form, toast Superseded by [ADR-013](./013-antd-ui.md). Ghi chú cũ về lỗi alias `utils` của shadcn CLI 4.22 không còn áp dụng.
- 25/10/2026: Studio đổi font chữ sang Google Sans (commit `f4f0086`).
- 26/10/2026: chuẩn hoá theo [mẫu ADR](./000-template.md); chỉ giữ phần còn hiệu lực.
