# ADR-014: Editor canvas tự do cho các màn của game

**Trạng thái:** Proposed · 25/10/2026 · Thay đổi [00 §4](../00-product-strategy.md#4-định-vị) ("không làm editor bố cục tự do") và [12 §1, §4](../12-builder-spec.md#4-editor-ux)

## Bối cảnh

Builder hiện tại là form chia tab sinh từ zod (`auto-form`) cạnh một preview. Người dùng chỉ đổi được chữ, màu, asset và skin; bố cục mỗi màn do template cố định. Nhà sáng lập đánh giá như vậy là chưa đủ linh hoạt: chủ SME muốn màn chơi trông như poster của quán, đặt logo, ảnh sản phẩm, sticker, chữ khuyến mãi ở đâu tuỳ ý.

Spec cũ cố ý không làm việc này (00 §4, 12 §1) vì ba rủi ro: khó soạn trên điện thoại, bố cục vỡ trên nhiều cỡ màn hình, và tốn công. ADR này chấp nhận làm canvas tự do và đặt ràng buộc để kiểm soát ba rủi ro đó.

## Quyết định

### 1. Phạm vi của canvas

- Mỗi **màn** trong flow chuẩn (12 §3.1: Cover, Form, Thể lệ, Game, Kết quả thắng/thua/hết quà/hết lượt, Chi tiết quà) là một **tài liệu canvas** riêng.
- **Cơ chế game không nằm trên canvas.** Màn Game có đúng một phần tử `gameStage` (không xoá được): template vẽ vòng quay/thẻ cào/hộp quà bên trong khung đó. Người dùng di chuyển, đổi kích thước khung và trang trí xung quanh, nhưng không chỉnh được bên trong cơ chế.
- **Server vẫn quyết định mọi kết quả** (AGENTS.md). Canvas chỉ là lớp trình bày; nút "Chơi" gọi đúng luồng chuẩn, không phần tử nào gọi API kết quả.

### 2. Hệ toạ độ và hiển thị

- Mỗi màn có **artboard logic rộng 375**, cao mặc định 750 (người dùng kéo dài được để thành trang cuộn, tối đa 2.000).
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
| `countdown` | mốc (kết thúc sự kiện/tuỳ chọn), kiểu hiển thị | |
| `prizeList` | bố cục lưới/danh sách, hiện số còn lại | Dữ liệu lấy từ prize engine |
| `gameStage` | — | Chỉ ở màn Game, đúng một |
| `form` | — | Chỉ ở màn Form, đúng một; trường lấy từ cấu hình sự kiện |

Thuộc tính chung: `id, name, x, y, w, h, rotation, opacity, locked, hidden, animation { enter: none|fade|slideUp|zoom|bounce, delayMs }`.

Màu là **tham chiếu token** (`brand.primary`, `brand.text`…) hoặc hex. Mặc định dùng tham chiếu, để đổi brand kit thì mọi màn đổi theo (12 §5).

### 4. Dữ liệu và phiên bản

- `screens: Record<ScreenKey, ScreenDoc>` nằm trong config của **GameVersion** (bất biến khi publish), validate bằng zod trong `packages/contracts`.
- Template cung cấp **màn mặc định** cho từng skin; người dùng bắt đầu từ đó, không bắt đầu từ trang trắng.
- `hotEditable` mặc định: nội dung `text` và nhãn `button`, sửa được khi đang chạy.

### 5. Một renderer cho cả Play và Studio

`CanvasScreen` (sẽ nằm ở `@playora/ui/game`) render tài liệu canvas. Play dùng nó khi chạy; Studio dùng **cùng component** để vẽ canvas trong editor rồi phủ lớp chọn/kéo lên trên. Preview vì vậy khớp 100% như nguyên tắc cũ ở 12 §4.1.

### 6. Rào chắn chất lượng

- Lưới bắt dính (snap) vào mép/tâm artboard và mép/tâm phần tử khác; thước khoảng cách.
- Pre-flight cảnh báo (không chặn): chữ < 12 px, tương phản < 3:1, phần tử nằm ngoài artboard, nút nhỏ hơn 44 px, màn > 60 phần tử.
- Undo/redo, nhóm/khoá/ẩn phần tử, bảng lớp kéo đổi thứ tự.

### 7. Thiết bị soạn

- **Desktop:** editor đầy đủ (kéo, đổi kích thước, xoay, snap, bảng lớp).
- **Điện thoại:** chạm chọn, kéo di chuyển, sửa chữ/ảnh/màu trong bottom sheet; đổi kích thước bằng thanh trượt. Mục tiêu "publish từ template trên điện thoại" (12 §1) vẫn giữ, vì người dùng điện thoại chủ yếu thay chữ và ảnh trên màn mặc định.

## Hệ quả

- **Tốt:** linh hoạt ngang công cụ thiết kế H5; khác biệt rõ với WOAY và vòng quay miễn phí; template mới chỉ cần viết cơ chế và màn mặc định.
- **Chi phí:** renderer + editor canvas là khối việc lớn nhất của builder; phải viết lại `SpinWheelPlayer` thành cơ chế thuần (bỏ tiêu đề/nút ra canvas); thêm bước migrate config cũ sang `screens`.
- **Rủi ro:** người dùng tạo màn xấu. Giảm bằng màn mặc định đẹp theo skin, snap, và cảnh báo pre-flight.
- **Bước tiếp theo:** prototype trong Studio (`/orgs/[orgId]/labs/canvas`, dữ liệu cục bộ, chưa nối API) để kiểm chứng trải nghiệm trước khi chốt contract.
