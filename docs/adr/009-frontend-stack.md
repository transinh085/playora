# ADR-009: Frontend stack

**Trạng thái:** Accepted · 23/10/2026

## Quyết định
| Lớp | Lựa chọn |
|---|---|
| UI | shadcn/ui (style new-york, Radix qua package `radix-ui`) đặt trong `packages/ui`, Tailwind CSS v4, token OKLCH; app import `@playora/ui/components/*` |
| Server state | TanStack Query 5 qua `@playora/api-client/react` |
| Form | react-hook-form 7 + `@hookform/resolvers` (zod 4) |
| i18n | next-intl 4, **không** có tiền tố locale trong URL Studio; locale lấy từ cookie; type key từ `vi.json`; test đảm bảo en đủ key và mọi `ErrorCode` đều có message |
| Theme | next-themes (class `dark`) |
| Auth gate | `proxy.ts` (Next 16) kiểm tra cookie Better Auth; server layout xác thực thật qua API |
| Toast | sonner |

## Ghi chú
- shadcn CLI 4.22 ghi sai alias `utils` thành package `cn` trong monorepo. Quy trình sửa nằm ở docs/10 §6.3.
- Shell người chơi (`apps/play`) giữ tối giản để đạt mục tiêu bundle ≤ 200 KB.
