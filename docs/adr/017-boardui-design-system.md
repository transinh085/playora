# ADR-017: BoardUI Design System (React Aria + Tailwind v4) thay thế shadcn/ui

| | |
|---|---|
| **Trạng thái** | Accepted |
| **Ngày** | 31/10/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | Thay thế [ADR-016](./016-shadcn-luma-ui.md) · [ADR-009](./009-frontend-stack.md) · [../engineering/design-system.md](../engineering/design-system.md) |

## Bối cảnh

Sau giai đoạn thử nghiệm `shadcn/ui` ([ADR-016](./016-shadcn-luma-ui.md)), giao diện Studio cần một hệ thống thiết kế dashboard/SaaS đồng bộ hơn về semantic tokens, thang chữ composite, chuyển động (micro-interactions), và bộ component nguyên bản (`Modal`, `Drawer`, `DataTable`, `StatCards`, `DashboardSidebar`, `Toast`/`Notification`, `Select`, `Input`, `Tabs`) thay vì các wrapper rời rạc trên `radix-ui` và `sonner`.

## Quyết định

| Chủ đề | Quyết định |
|---|---|
| Thư viện UI | **BoardUI** (Free tier components, dựng trên `react-aria-components`, `motion/react`, `@remixicon/react`, Tailwind CSS v4) cài đặt vào `@playora/ui` (`packages/ui/src/components/{base,application,foundations}`) |
| Brand Accent | Ánh xạ màu thương hiệu **Brand Teal** (hue 192) vào dải `--color-accent-50..950` trong `packages/ui/src/styles/theme.css` bằng giá trị `oklch(...)` tường minh; giữ nguyên hệ token `--game-*` và `[data-skin="*"]` cho minigames |
| Semantic Tokens & Dark Mode | Sử dụng 100% semantic tokens của BoardUI (`bg-background-primary-default`, `bg-background-secondary-default`, `text-text-primary`, `text-text-secondary`, `border-border-button-default`, `border-separator-border`, `shadow-card`, `shadow-dropdown`, `shadow-sidebar`). Dark mode tự động qua `.dark` trên `<html>`, không viết `dark:` thủ công |
| Typography | Sử dụng composite typography utilities trong `packages/ui/src/styles/typography.css` (`text-title-1-semibold`, `text-title-2-semibold`, `text-title-3-medium`, `text-headline-semibold`, `text-body-medium`, `text-body-regular`, `text-caption-1-semibold`, `text-caption-1-regular`) |
| Class Merging | Sử dụng `cx()` và `sortCx()` từ `@playora/ui/utils/cx` (cấu hình `extendTailwindMerge` nhận diện toàn bộ composite typography classes của BoardUI) |
| Form | `react-hook-form` + `@hookform/resolvers/zod` kết hợp trực tiếp với `Input` / `InputBase` / `Textarea` / `Select` / `Switch` / `Checkbox` của BoardUI |
| Feedback & Toast | BoardUI native `Toaster` & `toast` (`@playora/ui/components/base/toast/toast` dựng trên `Notification` + `NotificationViewport`) thay thế `sonner` |
| Modal & Drawer | BoardUI `Modal`, `AlertDialog` (`@playora/ui/components/base/modal/modal`) và `Drawer` (`@playora/ui/components/base/drawer/drawer`) |

## Hệ quả

- **Tốt:**
  - Xoá bỏ hoàn toàn các file wrapper legacy của `shadcn/ui`, `radix-ui` và `sonner`; mã nguồn UI thống nhất trên hệ thống primitive của BoardUI.
  - Tự động hỗ trợ Dark Mode thông qua semantic tokens mà không cần viết class `dark:*` rải rác.
  - Tương thích a11y chuẩn mực nhờ `react-aria-components` (focus trap, roving tabindex, keyboard navigation, ARIA roles).
- **Chi phí:**
  - Cập nhật các màn hình trong `apps/studio`, `apps/play` và `apps/web` sang API của BoardUI (`base/*`).

## Kiểm chứng

- `bun run ci` (lint + typecheck + test + build) xanh 100%.
- Trang sống `/design-system` (`apps/web`) hiển thị đầy đủ các primitive và application blocks của BoardUI.

## Lịch sử

- 31/10/2026: Accepted; thay thế [ADR-016](./016-shadcn-luma-ui.md), hoàn tất di chuyển từ `shadcn/ui` sang BoardUI.
