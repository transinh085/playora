# ADR-013: Chuyển giao diện sang Ant Design v6 trên mọi bề mặt

**Trạng thái:** Accepted · 24/10/2026 · Thay thế một phần [009](./009-frontend-stack.md) (UI, Form, Toast)

## Bối cảnh

Ở giai đoạn đầu ([ADR-009](./009-frontend-stack.md)), Playora dùng `shadcn/ui` (Radix) + `react-hook-form` + `sonner`. Khi mở rộng Studio (bảng phân trang, form cấu hình sự kiện phức tạp, builder nhiều nhóm field, upload, color picker, popconfirm) và chuẩn bị cho Đợt 4 (UI giải thưởng, kho voucher, luồng Play), việc tự lắp ghép từng primitive của shadcn tạo ra nhiều component "god" (> 450–700 dòng) và một `AutoForm` tự quản lý state nặng nề.

Ant Design v6 hỗ trợ React 19 native (không cần `@ant-design/v5-patch-for-react-19`), có sẵn hệ thống `Form` (`Form.Item`, `Form.List`), `Table`, `Modal`, `Tabs`, `Collapse`, `ColorPicker`, `Upload`, cùng cơ chế CSS-in-JS hỗ trợ `@layer` tương thích với Tailwind CSS v4.

## Quyết định

| Chủ đề | Quyết định |
|---|---|
| Thư viện UI | **Ant Design v6** (`antd@6.6.5`, React 19.3 native) cho **Studio, Play, Web**. Thay thế `shadcn/ui` + `radix-ui` |
| Form | **antd `Form`** (`Form.Item`, `Form.List`) kết hợp contract Zod schema qua `@playora/ui/form` (`useZodForm`, `zodRule`, `applyApiError`). Bỏ `react-hook-form` + `@hookform/resolvers` |
| Styling | **Tailwind CSS v4 chỉ dùng cho layout và khoảng cách** (`flex`, `grid`, `gap`, `p-*`, responsive). Màu sắc, bo góc, font, kích thước lấy từ **theme token antd** (`ThemeConfig`). Cấm hard-code màu |
| Theme & Token | Một nguồn primitive token (`@playora/ui/theme/tokens.ts`) ánh xạ sang `ThemeConfig`:<br>• **Studio:** `StudioProvider` (`getStudioTheme('light' \| 'dark')` dùng `defaultAlgorithm` / `darkAlgorithm` theo `next-themes`).<br>• **Play:** `PlayProvider` / `GameRoot` (`gameThemeConfig({ skin, brand })` + `brandKitVars`) giữ nguyên luật tương phản WCAG (`contrastRatio >= 3`, `readableOn`) và tiếp tục xuất biến `--game-*` cho phần template tự vẽ (SVG/canvas) |
| SSR | `@ant-design/nextjs-registry` (`AntdRegistry`, pin `1.3.0`) bọc ở `app/layout.tsx` của mỗi ứng dụng Next.js |
| Tailwind × antd | Khai báo `@layer theme, base, antd, components, utilities;` ở đầu `@playora/ui/styles.css` kết hợp `<StyleProvider layer>` (`@ant-design/cssinjs@2.1.2`) trong `StudioProvider` / `PlayProvider` để preflight của Tailwind không đè style của antd |
| Toast / Confirm | Dùng `App.useApp()` (`message`, `notification`, `modal`) từ `<App>` bên trong provider chuẩn — **không** gọi static `message.*` (mất ngữ cảnh theme). Bỏ `sonner` |
| Icon | Giữ `lucide-react` (truyền qua prop `icon`). Không cài thêm `@ant-design/icons` trực tiếp ở app trừ khi component antd bắt buộc nội bộ |

## Hợp đồng Form (`@playora/ui/form`)

```tsx
const { form, rules, parse } = useZodForm(CreateEventBody);
<Form form={form} layout="vertical" onFinish={(v) => create.mutate({ params, body: parse(v) })}>
  <Form.Item name="slug" label={t('slug')} rules={rules}>
    <Input />
  </Form.Item>
</Form>
// onError: if (!applyApiError(form, err, (c) => tErrors(c))) message.error(tErrors(err.code))
```

- `zodRule(schema, form)` chạy `schema.safeParse(form.getFieldsValue(true))` và trả lỗi có `issue.path` khớp với `name` của `Form.Item` (hỗ trợ cả field phẳng, field lồng `['a', 'b']`, `Form.List` và `refine` chéo field).
- `parse(values)` chạy `schema.parse` và trả về `z.output<schema>` để gửi API.
- `applyApiError(form, error, messageFor)` đọc `details.field` (`'consents.x'` → `['consents', 'x']`) và `details.body.fieldErrors`, gắn lỗi qua `form.setFields`, trả `false` nếu không gắn được vào field nào.

## Đo Baseline First Load JS & Ngân sách Bundle mới cho Play

Số đo `next build` (Next.js 16.4.3 Turbopack trên `main@e9a8106`, trước khi chuyển `apps/**`):

| Ứng dụng / Route | First Load JS (gzip) | First Load JS (raw) | Phần riêng của route (gzip / raw) |
|---|---:|---:|---:|
| Runtime dùng chung (`rootMainFiles`: React 19 + Next App Router) | 129.6 KB | 431.8 KB | — |
| **Play `/[slug]`** (baseline trước antd) | **155.2 KB** | 513.0 KB | 25.6 KB / 81.2 KB |
| Play `/preview` | 184.3 KB | 611.8 KB | 54.7 KB / 180.0 KB |
| **Studio lớn nhất:** `/orgs/[orgId]/events/[eventId]/guests` | **318.7 KB** | 1018.0 KB | 188.6 KB / 586.1 KB |
| Studio `/orgs/[orgId]/events/[eventId]` | 318.3 KB | 1017.0 KB | 188.2 KB / 585.0 KB |
| Studio `/orgs/[orgId]/events/[eventId]/games/[gameId]` (builder) | 309.4 KB | 992.8 KB | 179.3 KB / 560.9 KB |

### Ngân sách mới cho `apps/play` (`/[slug]`)

Ngân sách cũ ≤ 200 KB ở ADR-009 không còn giữ nguyên sau khi thêm runtime `@ant-design/cssinjs`, `ConfigProvider`, `Form` và `next-intl` (theo ADR-012 §6).

- **Ngân sách First Load JS mới cho `play /[slug]`:** mục tiêu **≤ 260 KB gzip** (trần cứng **≤ 280 KB gzip**).
- **Biện pháp kiểm soát bắt buộc ở `apps/play`:**
  1. Bật `experimental: { optimizePackageImports: ['antd'] }` trong `next.config.ts`.
  2. Chỉ dùng các component nhẹ trên Play (`Button`, `Input`, `Form`, `Checkbox`, `Radio`, `Select`, `Result`, `Modal`, `Skeleton`, `Alert`, `Tag`, `Empty`). **Cấm** import `DatePicker`, `Table`, `ColorPicker`, `Upload`, `Tree`, `Transfer` trong `apps/play`.
  3. Lazy-load surface của từng game template bằng `React.lazy` + `Suspense`.
