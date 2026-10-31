# ADR-016: shadcn/ui với style luma thay thế Ant Design v6

| | |
|---|---|
| **Trạng thái** | Accepted |
| **Ngày** | 31/10/2026 |
| **Người quyết định** | Founder (Tech Lead) |
| **Thay thế / Liên quan** | Thay thế [ADR-013](./013-antd-ui.md) · [ADR-009](./009-frontend-stack.md) · [../engineering/design-system.md](../engineering/design-system.md) |

## Bối cảnh

Ở [ADR-013](./013-antd-ui.md), Playora chuyển sang Ant Design v6 để tận dụng các component nguyên khối sẵn có (`Form`, `Table`, `Modal`, `Upload`). Tuy nhiên, Ant Design v6 đem lại một số nhược điểm lớn trong quá trình phát triển sản phẩm:
1. **Bundle size nặng:** CSS-in-JS (`@ant-design/cssinjs`), `ConfigProvider`, và runtime lớn làm bundle First Load của Play app tăng ~75–100 KB gzip, đe doạ ngân sách ≤ 260 KB gzip.
2. **Xung đột CSS layer với Tailwind v4:** Cần thiết lập `@layer` phức tạp và dễ gặp lỗi đặc tính (specificity) khi tuỳ biến giao diện game và builder.
3. **Thẩm mỹ:** Ant Design mang phong cách enterprise cổ điển, khó tuỳ biến linh hoạt theo phong cách hiện đại, mềm mại, thanh thoát của ứng dụng minigame quảng bá thương hiệu.
4. **Yêu cầu phong cách:** Định hướng giao diện mới chuyển sang **shadcn/ui** với preset / style **`luma`** (bo góc mềm mại, độ sâu phân tầng tinh tế, nút pill, bề mặt kính trong suốt kiểu macOS/breathable layout).

## Quyết định

| Chủ đề | Quyết định |
|---|---|
| Thư viện UI | **shadcn/ui** (`radix-ui` primitives, Tailwind CSS v4 native, Hugeicons qua `@playora/ui/icons`) tại `packages/ui/src/components/*` |
| Style / Preset | **`luma`**: Bo góc đồng tâm (`--radius-xl: 12px` / `rounded-xl` đồng nhất cho Button, Input, Select; `rounded-2xl` cho Card/Dialog; `rounded-full` cho Badge/Avatar), shadow phân tầng mềm mại, bề mặt breathable |
| Form | `react-hook-form` + `@hookform/resolvers/zod` + shadcn `Form` (`FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`) |
| Feedback & Toast | **`sonner`** (`toast.success()`, `toast.error()`) thay thế `App.useApp()` của antd |
| Modal & Confirmation | shadcn `Dialog`, `AlertDialog` (cho hành động xác nhận/xoá), `Sheet` (cho side panel) |
| Table | shadcn `Table` component + `@tanstack/react-table` cho các bảng lọc/phân trang phức tạp |
| Theme & Tokens | Hệ biến CSS Tailwind v4 (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, v.v.) ánh xạ theo token `luma` trong `@playora/ui/styles.css` |
| Linter | Gỡ cấm `radix-ui`, `react-hook-form`, `sonner` trong `biome.json` |

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược | Vì sao không chọn |
|---|---|---|---|
| Giữ Ant Design v6 | Đầy đủ component phức tạp sẵn | Nặng, khó custom UI kiểu luma, vướng CSS-in-JS | Người dùng không muốn dùng antd nữa, muốn chuyển toàn bộ sang shadcn luma |
| shadcn với style vega / nova | Gọn, chuẩn SaaS | Cứng và vuông vắn hơn | Không đạt được cảm giác mềm mại, breathable của luma |
| Base UI (MUI) base | Nhẹ, không cần Radix | Hệ sinh thái mới, ít component mở rộng | Radix UI ổn định và tương thích cao nhất với React 19 / Next.js 16 App Router |

## Hệ quả

- **Tốt:**
  - Toàn quyền kiểm soát mã nguồn component (được copy vào `@playora/ui`).
  - Bundle size của `apps/play` và `apps/studio` giảm rõ rệt, đạt dễ dàng ngân sách ≤ 260 KB gzip.
  - Phối hợp tự nhiên 100% với Tailwind CSS v4 không cần hack `@layer` CSS-in-JS.
  - Phong cách `luma` hiện đại, tươi mới, thẩm mỹ cao cho brand builder.
- **Chi phí:**
  - Phải di chuyển toàn bộ màn hình Form, Table, Modal của Studio và Play.
  - Cần viết các wrapper/composite components dùng chung trong `@playora/ui` (TableCard, MetricCard, PageHeader).
- **Rủi ro:**
  - Lỗi type hoặc validation khác biệt giữa antd rule và react-hook-form -> giảm rủi ro bằng cách dùng lại contract Zod schema nguyên bản.

## Kiểm chứng

- `bun run ci` (lint + typecheck + test + build) xanh 100%.
- E2E Playwright tests (`bun run e2e`) xanh toàn bộ luồng Studio và Play.
- Bundle `play /[slug]` First Load JS ≤ 260 KB gzip.

## Lịch sử

- 31/10/2026: Accepted ([D-29](../product/decisions.md)); thay thế [ADR-013](./013-antd-ui.md), hoàn tất chuyển đổi từ Ant Design v6 sang shadcn/ui style luma.
