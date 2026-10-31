# ADR-013: Ant Design v6 trên mọi bề mặt

| | |
|---|---|
| **Trạng thái** | Superseded by [ADR-016](./016-shadcn-luma-ui.md) (31/10/2026) |
| **Ngày** | 24/10/2026 |
| **Người quyết định** | Founder |
| **Thay thế / Liên quan** | Thay một phần [ADR-009](./009-frontend-stack.md) (UI, form, toast) · [../engineering/design-system.md](../engineering/design-system.md) |

## Bối cảnh

Ở giai đoạn đầu ([ADR-009](./009-frontend-stack.md)), Playora dùng `shadcn/ui` (Radix) + `react-hook-form` + `sonner`. Khi mở rộng Studio (bảng phân trang, form cấu hình phức tạp, builder nhiều nhóm field, upload, color picker, popconfirm) và chuẩn bị UI giải thưởng, kho voucher, luồng Play, việc tự lắp từng primitive của shadcn tạo ra nhiều component "god" (> 450–700 dòng) và một `AutoForm` tự quản lý state nặng nề.

Ant Design v6 hỗ trợ React 19 native (không cần `@ant-design/v5-patch-for-react-19`), có sẵn `Form` (`Form.Item`, `Form.List`), `Table`, `Modal`, `Tabs`, `Collapse`, `ColorPicker`, `Upload`, và CSS-in-JS hỗ trợ `@layer` tương thích Tailwind CSS v4.

## Quyết định

| Chủ đề | Quyết định |
|---|---|
| Thư viện UI | **Ant Design v6** (`antd@6.6.5`, React 19.3 native) cho **Studio, Play, Web**. Thay `shadcn/ui` + `radix-ui` |
| Form | **antd `Form`** kết hợp contract zod schema qua `@playora/ui/form` (`useZodForm`, `zodRule`, `applyApiError`). Bỏ `react-hook-form` + `@hookform/resolvers` |
| Styling | **Tailwind CSS v4 chỉ cho layout và khoảng cách** (`flex`, `grid`, `gap`, `p-*`, responsive). Màu, bo góc, font, kích thước lấy từ theme token antd (`ThemeConfig`). Cấm hard-code màu |
| Theme & token | Một nguồn primitive token (`@playora/ui/theme/tokens.ts`) ánh xạ sang `ThemeConfig`. **Studio:** `StudioProvider` (`getStudioTheme('light' \| 'dark')`, `defaultAlgorithm` / `darkAlgorithm` theo `next-themes`). **Play:** `PlayProvider` / `GameRoot` (`gameThemeConfig({ skin, brand })` + `brandKitVars`) giữ luật tương phản WCAG (`contrastRatio >= 3`, `readableOn`) và xuất biến `--game-*` cho phần template tự vẽ (SVG/canvas) |
| SSR | `@ant-design/nextjs-registry` (`AntdRegistry`, pin `1.3.0`) bọc ở `app/layout.tsx` của mỗi app Next.js |
| Tailwind × antd | `@layer theme, base, antd, components, utilities;` khai báo **trước** `@import "tailwindcss"` + `<StyleProvider layer>` (`@ant-design/cssinjs@2.1.2`) trong provider, để preflight của Tailwind không đè style antd và utilities thắng antd |
| Toast / Confirm | `App.useApp()` (`message`, `notification`, `modal`) bên trong provider chuẩn; **không** gọi static `message.*`. Bỏ `sonner` |
| Icon | Giữ `lucide-react` (truyền qua prop `icon`). Không cài `@ant-design/icons` trực tiếp ở app trừ khi component antd bắt buộc |
| Cưỡng chế | `biome.json` `noRestrictedImports` cấm `react-hook-form`, `radix-ui`, `sonner`, `@playora/ui/components/*` toàn repo |

### Hợp đồng Form (`@playora/ui/form`)

```tsx
const { form, rules, parse } = useZodForm(CreateEventBody);
<Form form={form} layout="vertical" onFinish={(v) => create.mutate({ params, body: parse(v) })}>
  <Form.Item name="slug" label={t('slug')} rules={rules}>
    <Input />
  </Form.Item>
</Form>
// onError: if (!applyApiError(form, err, (c) => tErrors(c))) message.error(tErrors(err.code))
```

- `zodRule(schema, form)` chạy `schema.safeParse(form.getFieldsValue(true))` và trả lỗi có `issue.path` khớp `name` của `Form.Item` (field phẳng, lồng `['a', 'b']`, `Form.List` và `refine` chéo field).
- `parse(values)` chạy `schema.parse` và trả `z.output<schema>` để gửi API.
- `applyApiError(form, error, messageFor)` đọc `details.field` (`'consents.x'` → `['consents', 'x']`) và `details.body.fieldErrors`, gắn lỗi qua `form.setFields`, trả `false` nếu không gắn được vào field nào.

### Ngân sách bundle Play

Ngân sách cũ ≤ 200 KB ([ADR-009](./009-frontend-stack.md)) không giữ được sau khi thêm `@ant-design/cssinjs`, `ConfigProvider`, `Form` và `next-intl`.

- **First Load JS `play /[slug]`:** mục tiêu **≤ 260 KB gzip**, trần cứng **≤ 280 KB gzip**.
- Bắt buộc ở `apps/play`:
  1. `experimental: { optimizePackageImports: ['antd'] }` trong `next.config.ts`.
  2. Chỉ dùng component nhẹ (`Button`, `Input`, `Form`, `Checkbox`, `Radio`, `Select`, `Result`, `Modal`, `Skeleton`, `Alert`, `Tag`, `Empty`). **Cấm** `DatePicker`, `Table`, `ColorPicker`, `Upload`, `Tree`, `Transfer`.
  3. Lazy-load surface của từng game template bằng `React.lazy` + `Suspense`.

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| Giữ shadcn/ui, tách nhỏ component | Vẫn phải tự viết Table, Form.List, Upload, ColorPicker; tốn công một người |
| MUI | Nặng hơn, phong cách Material không hợp admin kiểu games-vt |
| antd chỉ cho Studio, giữ Play thuần | Hai hệ component; Play cần form và modal giống Studio preview |

## Hệ quả

- **Tốt:** Studio có đủ component admin; form dùng lại schema contract.
- **Chi phí:** bundle Play tăng (~+75–100 KB gzip so với baseline); phải giữ kỷ luật import.
- **Rủi ro:** antd ghi đè Tailwind nếu sai thứ tự `@layer` (đã gặp, sửa ở commit `b9fea12`).

## Kiểm chứng

Baseline `next build` (Next.js 16.4.3 Turbopack trên `main@e9a8106`, **trước** khi chuyển `apps/**`):

| Ứng dụng / Route | First Load JS (gzip) | First Load JS (raw) | Phần riêng của route (gzip / raw) |
|---|---:|---:|---:|
| Runtime dùng chung (`rootMainFiles`: React 19 + Next App Router) | 129.6 KB | 431.8 KB | — |
| **Play `/[slug]`** | **155.2 KB** | 513.0 KB | 25.6 KB / 81.2 KB |
| Play `/preview` | 184.3 KB | 611.8 KB | 54.7 KB / 180.0 KB |
| **Studio lớn nhất:** `/orgs/[orgId]/events/[eventId]/guests` | **318.7 KB** | 1018.0 KB | 188.6 KB / 586.1 KB |
| Studio `/orgs/[orgId]/events/[eventId]` | 318.3 KB | 1017.0 KB | 188.2 KB / 585.0 KB |
| Studio `/orgs/[orgId]/events/[eventId]/games/[gameId]` (builder) | 309.4 KB | 992.8 KB | 179.3 KB / 560.9 KB |

**Còn mở:** đo lại `play /[slug]` sau khi chuyển antd và so với trần 280 KB; chưa có kiểm tra tự động trong CI.

## Lịch sử

- 24/10/2026: Accepted.
- 25/10/2026: sửa thứ tự `@layer` để utilities Tailwind thắng antd (`b9fea12`); Studio theo giao diện admin games-vt.
- 26/10/2026: chuẩn hoá theo [mẫu ADR](./000-template.md). Số đo baseline giữ nguyên, chưa đo lại.
- 31/10/2026: Superseded by [ADR-016](./016-shadcn-luma-ui.md) (shadcn/ui luma); ngân sách bundle Play ≤ 260 KB giữ nguyên.
