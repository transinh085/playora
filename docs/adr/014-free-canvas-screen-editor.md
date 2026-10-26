# ADR-014: Editor canvas tự do cho các màn của game

| | |
|---|---|
| **Trạng thái** | Accepted (kèm 6 sửa đổi, xem "Quyết định §8") |
| **Ngày** | 25/10/2026 (Proposed) · 26/10/2026 (Accepted) |
| **Người quyết định** | Founder (PO) |
| **Thay thế / Liên quan** | Thay nguyên tắc cũ "không làm editor bố cục tự do" ở [../product/strategy.md](../product/strategy.md) · [../product/specs/builder.md](../product/specs/builder.md), [../plans/2026-10-25-game-builder-plan.md](../plans/2026-10-25-game-builder-plan.md) §4.3, [ADR-012](./012-campaign-architecture.md) |

## Bối cảnh

Builder lúc đầu là form chia tab sinh từ zod (`auto-form`) cạnh một preview. Người dùng chỉ đổi được chữ, màu, asset và skin; bố cục mỗi màn do template cố định. Nhà sáng lập đánh giá như vậy là chưa đủ linh hoạt: chủ SME muốn màn chơi trông như poster của quán, đặt logo, ảnh sản phẩm, sticker, chữ khuyến mãi ở đâu tuỳ ý.

Spec cũ cố ý không làm việc này vì ba rủi ro: khó soạn trên điện thoại, bố cục vỡ trên nhiều cỡ màn hình, và tốn công. ADR này chấp nhận làm canvas tự do và đặt ràng buộc để kiểm soát ba rủi ro đó.

Quyết định sản phẩm 26/10/2026: **builder vẫn là lõi**. Canvas là chế độ **Tuỳ biến**; chế độ mặc định là **Sửa nhanh** (thay nội dung các ô thay thế trên màn mặc định của mẫu), cạnh chế độ **Luật & giải** ([../product/specs/builder.md](../product/specs/builder.md)).

## Quyết định

### 1. Phạm vi của canvas

- Mỗi **màn** trong flow chuẩn (Cover, Form, Thể lệ, Game, Kết quả thắng/thua/hết quà/hết lượt, Chi tiết quà) là một **tài liệu canvas** riêng.
- **Cơ chế game không nằm trên canvas.** Màn Game có đúng một phần tử `gameStage` (không xoá được): template vẽ vòng quay/thẻ cào/hộp quà bên trong khung đó. Người dùng di chuyển, đổi kích thước khung và trang trí xung quanh, nhưng không chỉnh được bên trong cơ chế.
- **Server vẫn quyết định mọi kết quả** (AGENTS.md). Canvas chỉ là lớp trình bày; nút "Chơi" gọi đúng luồng chuẩn, không phần tử nào gọi API kết quả.

### 2. Hệ toạ độ và hiển thị

- Mỗi màn có **artboard logic rộng 375**, cao mặc định 750 (kéo dài được thành trang cuộn, tối đa 2.000).
- Khi chạy: artboard **co giãn đều theo chiều rộng** viewport (`scale = vw / 375`). Nền màn (màu/ảnh) tràn ra ngoài artboard. Không có bố cục riêng theo breakpoint.
- Kiosk: co theo chiều cao, hai bên là nền.
- Phần tử đặt theo `x, y, w, h, rotation` trong đơn vị artboard; thứ tự lớp là thứ tự mảng.

### 3. Loại phần tử (v1)

| Loại | Thuộc tính chính | Ghi chú |
|---|---|---|
| `text` | nội dung (vi/en), font heading/body, cỡ, đậm, màu, căn lề, giãn dòng | Cho phép biến: `{prize.name}`, `{player.name}`, `{event.name}` |
| `image` | asset, fit cover/contain, bo góc | Chỉ dùng asset đã upload (không hotlink) |
| `button` | nhãn, hành động (`start`, `rules`, `link`, `zalo`, `phone`, `next`), nền, màu chữ, bo góc | Vùng chạm tối thiểu 44 px |
| `shape` | chữ nhật/elip, nền, viền, bo góc | |
| `countdown` | mốc (kết thúc chương trình/tuỳ chọn), kiểu hiển thị | |
| `prizeList` | bố cục lưới/danh sách, hiện số còn lại | Dữ liệu lấy từ prize engine |
| `gameStage` | — | Chỉ ở màn Game, đúng một |
| `form` | — | Chỉ ở màn Form, đúng một; trường lấy từ cấu hình chương trình |

Thuộc tính chung: `id, name, slot?, x, y, w, h, rotation, opacity, locked, hidden, anchor, animation { enter: none|fade|slideUp|zoom|bounce, delayMs }`.

Màu là **tham chiếu token** (`brand.primary`, `brand.text`…) hoặc hex. Mặc định dùng tham chiếu, để đổi brand kit thì mọi màn đổi theo.

### 4. Dữ liệu và phiên bản

- `screens: Record<ScreenKey, ScreenDoc>` nằm trong config của **GameVersion** (bất biến khi publish), validate bằng zod trong `packages/contracts`. Cách lưu Campaign: [ADR-015](./015-campaign-persistence.md).
- Template cung cấp **màn mặc định** cho từng skin; người dùng bắt đầu từ đó, không bắt đầu từ trang trắng.
- `hotEditable` mặc định: nội dung `text` và nhãn `button`, sửa được khi đang chạy (có audit).

### 5. Một renderer cho cả Play và Studio

`CanvasScreen` (đích: `@playora/ui/game`) render tài liệu canvas. Play dùng nó khi chạy; Studio dùng **cùng component** để vẽ canvas trong editor rồi phủ lớp chọn/kéo lên trên. Preview vì vậy khớp 100%.

### 6. Rào chắn chất lượng

- Snap vào mép/tâm artboard và mép/tâm phần tử khác; thước khoảng cách.
- Pre-flight cảnh báo (không chặn): chữ < 12 px, tương phản < 3:1, phần tử ngoài artboard, nút < 44 px, màn > 60 phần tử.
- Undo/redo, nhóm/khoá/ẩn phần tử, bảng lớp kéo đổi thứ tự.

### 7. Thiết bị soạn

**Studio là desktop-first** (quyết định 25/10/2026, [../product/decisions.md](../product/decisions.md)): editor canvas đầy đủ (kéo, đổi kích thước, xoay, snap, bảng lớp) chỉ cam kết trên desktop. Soạn canvas trên điện thoại (chạm chọn, kéo, bottom sheet, thanh trượt cỡ) **hoãn**, không có trong M1. Mobile-first chỉ áp dụng cho game người chơi thấy và màn Đổi quà của nhân viên.

### 8. Sáu sửa đổi khi chấp nhận (từ [kế hoạch builder §4.3](../plans/2026-10-25-game-builder-plan.md))

| # | Sửa đổi | Trạng thái code 26/10/2026 |
|---|---|---|
| 1 | **Khoá 2 mức** `locked: 'none' \| 'position' \| 'all'` (như Canva): mẫu khoá vị trí ô ảnh/chữ, chỉ cho thay nội dung | Chưa: `locked` vẫn là `boolean` (`canvas-editor/lib/model.ts`) |
| 2 | **Ô thay thế** `slot?: SlotKey` trên phần tử: nguồn của Sửa nhanh và của AI | **Đã có**: `SlotKey = logo \| productPhoto \| title \| promoText \| cta`; Sửa nhanh dùng ở `builder-lab/components/quick-edit/slots.ts` |
| 3 | **Neo dọc** `anchor: 'top' \| 'center' \| 'bottom'` + overlay vùng an toàn và đường chia 16:9 / 19.5:9 / 20:9: CTA bám đáy trên máy dài | Chưa |
| 4 | **Chữ tự giãn chiều cao** mặc định; tiêu đề và tên quà có "co chữ cho vừa" với cỡ tối thiểu; xem trước với giá trị biến dài nhất | Chưa |
| 5 | **Chữ đa ngôn ngữ** `LocalizedText` (vi/en) thay cho `string` | Chưa: `content`, `label` là `string` |
| 6 | **Pre-flight sửa một chạm:** tương phản thấp → `brand.text` hoặc thêm bóng; chữ < 12 px → 14 px; nút < 44 px → phóng; phần tử ra ngoài → kéo vào | **Đã có** ở Builder Lab: `builder-lab/lib/preflight.ts` (`offCanvas`, `smallText`, `lowContrast`, `smallButton`, `emptyTitle`, cùng các lỗi giải/lịch), mỗi lỗi có `fix` một chạm |

Đã có khác: snap (`canvas-editor/lib/geometry.ts`), undo/redo theo snapshot (`editor-state.ts`), xoay snap 15°. Màn đang có trong prototype: `cover`, `form`, `game`, `resultWin`, `resultLose` (thiếu Thể lệ, Hết quà, Hết lượt, Chi tiết quà).

## Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| Giữ form + bố cục cố định của template | Không đủ khác biệt với WOAY; chủ quán không làm màn giống poster của quán được |
| Konva / Fabric / Polotno (render `<canvas>`) | Phá nguyên tắc một renderer cho Play và Studio; Play phải tải engine nặng |
| tldraw | License trả phí |
| Craft.js / GrapesJS / Puck | Bố cục dòng chảy, không phải canvas tự do |
| Moveable | Không phát hành từ 12/2023; chỉ cân nhắc nếu fork |

Chọn: **tự viết editor DOM** (prototype ~2.700 dòng, 0 dependency). Có thể thêm `@dnd-kit/react` (MIT, React 19) cho bảng lớp, phải nêu lý do trong PR.

## Hệ quả

- **Tốt:** linh hoạt ngang công cụ thiết kế H5; khác biệt rõ với WOAY và vòng quay miễn phí; template mới chỉ cần viết cơ chế và màn mặc định.
- **Chi phí:** renderer + editor canvas là khối việc lớn nhất của builder; phải tách `SpinWheelPlayer` thành cơ chế thuần (bỏ tiêu đề/nút ra canvas); thêm bước migrate config cũ sang `screens`.
- **Rủi ro:** người dùng tạo màn xấu. Giảm bằng: Sửa nhanh là mặc định, màn mặc định đẹp theo skin, khoá vị trí trong mẫu, snap, pre-flight sửa một chạm. Bố cục vỡ trên máy dài/ngắn: neo dọc và vùng an toàn (sửa đổi 3).

## Kiểm chứng

- Unit test: `canvas-editor/lib/canvas-editor.test.ts`, `builder-lab/lib/preflight.test.ts`, `quick-edit/slots.test.ts`.
- E2E `tooling/e2e/tests/builder-lab.spec.ts`: tạo → luật → publish → chơi trên điện thoại → đổi quà.
- **Còn mở (gate sản phẩm):** 5 người không biết thiết kế dựng được game Tết có logo + ảnh sản phẩm trong ≤ 10 phút.
- **Còn mở (kỹ thuật):** `ScreenDoc` chuyển thành zod trong `packages/contracts`; `CanvasScreen` chuyển sang `@playora/ui/game` và Play render bằng nó; sửa đổi 1, 3, 4, 5.

## Lịch sử

- 25/10/2026: Proposed; prototype ở `/orgs/[orgId]/labs/canvas`, sau đó dùng làm chế độ Tuỳ biến trong Builder Lab.
- 26/10/2026: **Accepted** kèm 6 sửa đổi (§8); ghi rõ Studio desktop-first, soạn canvas trên điện thoại hoãn; chuẩn hoá theo [mẫu ADR](./000-template.md).
