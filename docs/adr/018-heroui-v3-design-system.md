# ADR-018: HeroUI v3 Design System (React Aria + Tailwind CSS v4) thay thế BoardUI

| | |
|---|---|
| **Trạng thái** | Accepted |
| **Ngày** | 01/11/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | Thay thế [ADR-017](./017-boardui-design-system.md) · [ADR-016](./016-shadcn-luma-ui.md) · [ADR-009](./009-frontend-stack.md) · [../engineering/design-system.md](../engineering/design-system.md) |

## Bối cảnh

Sau giai đoạn dùng BoardUI nội bộ ([ADR-017](./017-boardui-design-system.md)), dự án cần một thư viện UI chuẩn mực, được bảo trì chính thức bởi đội ngũ lớn, tích hợp sâu với **Tailwind CSS v4** và **React Aria Components**, hỗ trợ đầy đủ mô hình Compound Component (`Card.Header`, `Modal.Backdrop`, `Drawer.Content`, `Tabs.List`), kiến trúc BEM và hệ thống token CSS variable với OKLCH.

**HeroUI v3** (`@heroui/react` & `@heroui/styles` v3.2.7+) đáp ứng hoàn hảo các tiêu chuẩn này mà không cần Provider runtime bao bọc, chuyển động 100% bằng CSS (không phụ thuộc runtime `framer-motion`), đồng thời duy trì khả năng tiếp cận (a11y) tốt nhất của React Aria.

## Quyết định

| Chủ đề | Quyết định |
|---|---|
| Thư viện UI | **HeroUI v3** (`@heroui/react` và `@heroui/styles` v3.2.7+) kết hợp `tailwind-variants`, dựng trên `react-aria-components` và Tailwind CSS v4 |
| Không cần Provider | HeroUI v3 hoạt động độc lập không cần `<HeroUIProvider>`, giảm độ phức tạp cây component |
| Compound Pattern | Áp dụng cấu trúc Compound Component chuẩn v3: `<Card><Card.Header><Card.Title>`, `<Modal><Modal.Backdrop><Modal.Dialog>`, `<Drawer><Drawer.Backdrop><Drawer.Content>`, `<Tabs><Tabs.List><Tabs.Tab>` |
| Brand Accent | Ánh xạ màu thương hiệu **Brand Teal** (hue 192) vào `--accent: oklch(0.6 0.1 192)` và `--accent-foreground: oklch(100% 0 0)` trong `:root` và `.dark` / `[data-theme='dark']`; giữ nguyên hệ token `--game-*` và `[data-skin="*"]` cho minigames |
| Semantic Tokens & Theming | Sử dụng hệ thống token của HeroUI v3 (`--accent`, `--surface`, `--overlay`, `--field-background`, `--border`, `--separator`). Hỗ trợ chuyển đổi Theme tự động qua `data-theme="light|dark"` và class `.dark` trên `<html>` |
| Tương thích ngược | `@playora/ui` tái xuất (re-export) trực tiếp toàn bộ các component của HeroUI v3, đồng thời duy trì lớp semantic bridge để đảm bảo toàn bộ mã hiện hữu trong `apps/studio`, `apps/play` và `apps/web` hoạt động trơn tru không lỗi |
| Form & Inputs | Tích hợp `react-hook-form` + `@hookform/resolvers/zod` với `Input`, `TextField`, `TextArea`, `Select`, `Switch`, `Checkbox` của HeroUI v3 |
| Feedback & Toast | HeroUI v3 native `Toast` và hàm `toast` (`toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`, `toast.danger()`) thay thế hoàn toàn cơ chế cũ |

## Hệ quả

- **Tốt:**
  - Nâng cấp lên thư viện UI chính thức HeroUI v3 với hơn 70 components chất lượng cao.
  - Loại bỏ gánh nặng tự duy trì mã nguồn UI tự chế, thừa hưởng các cải tiến và bản vá a11y chính thức.
  - Tối ưu hiệu năng: không cần Provider, CSS animations nhẹ nhàng thay thế framer-motion.
  - Giữ vững 100% tính tương thích ngược và Tenant isolation, không phá vỡ giao diện Studio hay minigame runtime.
- **Chi phí:**
  - Cần cài đặt `@heroui/react`, `@heroui/styles`, `tailwind-variants` vào các package liên quan trong monorepo.

## Kiểm chứng

- `bun run ci` (lint + typecheck + test + build) xanh 100%.
- Kiểm thử unit & component test trong `packages/ui` và `apps/studio` vượt qua 100%.
- Trang `/design-system` (`apps/web`) và các màn Studio / Play build và render chính xác.

## Lịch sử

- 01/11/2026: Accepted; chuyển đổi hoàn toàn từ BoardUI sang HeroUI v3 (v3.2.7+).
