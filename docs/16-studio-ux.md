# 16 — UX Studio: luồng, điều hướng và bố cục

**Trạng thái:** Đã duyệt hướng · 25/10/2026 · Wireframe: [artifact "Playora Studio Redesign"](https://claude.ai/artifact/BicQJgceiHnnL4voLzpETt) · Liên quan: [00](./00-product-strategy.md), [12 §4](./12-builder-spec.md#4-editor-ux), [13 §3.4](./13-design-system.md#34-luật-studio-theo-games-vt)

> **Studio là desktop-first.** Mobile-first chỉ áp dụng cho game người chơi thấy, và cho màn Đổi quà của nhân viên quầy.

## 1. Vấn đề của Studio trước đây

| Mức | Vấn đề | Chỗ trong code |
|---|---|---|
| Đứt luồng | Tạo sự kiện hay game xong, modal đóng, người dùng vẫn ở danh sách | `create-event-dialog.tsx`, `create-game-dialog.tsx` |
| Đứt luồng | Publish chỉ tạo version cho game; trạng thái sự kiện chọn tay ở Cài đặt; link/QR nằm ở sự kiện | `event-settings-form-general.tsx`, `publish-dialog.tsx` |
| Đứt luồng | Cấu hình một game nằm ở 3 nơi: Editor, tab Giải (placeholder), Cài đặt sự kiện (form, consent, lịch) | `editor-shell.tsx`, `(tabs)/prizes`, `(tabs)/settings` |
| Nhầm lẫn | Không có trang chủ; menu có link 404 (Kho mẫu, Báo cáo); Labs lộ cho khách; Thành viên có 2 URL | `app-shell.tsx` |
| Nhầm lẫn | Bấm tên sự kiện ra danh sách khách; tab Tổng quan chỉ có link/QR và 4 thẻ lối tắt lặp lại các tab | `events-table.tsx`, `event-overview.tsx` |
| Nhầm lẫn | Kho mẫu là modal chỉ có chữ, tag thô | `create-game-dialog.tsx` |
| Nhầm lẫn | Editor lặp control (tên, skin hai chỗ), 5 tab ngang hàng, không checklist | `editor-shell.tsx` |
| Thừa | Di sản game live: nhiều game một sự kiện, chia đội, nhả thiết bị | `game-list.tsx`, `random-teams-dialog.tsx` |

## 2. Mô hình: một chương trình, hai chế độ

- UI gọi đối tượng chính là **Chương trình** (en: *Campaign*). API và DB giữ tên `events`.
- **M1: mỗi chương trình một game.** Dữ liệu vẫn cho nhiều game; UI ẩn danh sách game và sắp xếp.
- **Trạng thái do hệ thống suy ra** (thay cho ô chọn tay): Nháp → Publish → Đã lên lịch → đến giờ → Đang chạy ⇄ Tạm dừng → Đã kết thúc ([12 §12](./12-builder-spec.md#12-vòng-đời-và-vận-hành)).
- **Soạn (Builder):** toàn màn hình, 4 bước Giao diện → Giải thưởng → Luật chơi → Phát hành; cột trái là các màn người chơi thấy + lớp (ADR-014), giữa là preview điện thoại thật, phải là thuộc tính. Mặc định khi chương trình là Nháp.
- **Vận hành:** trong khung app; tab Tổng quan · Người chơi · Giải & đổi quà · Kênh & QR · Cài đặt. Mặc định khi đã publish.
- Bấm một chương trình ở bất cứ đâu thì mở đúng chế độ theo trạng thái.

## 3. Điều hướng

```
Trang chủ                hôm nay, cần xử lý, chương trình đang chạy, checklist bắt đầu
MINIGAME
  Chương trình           danh sách có ảnh game, lượt hôm nay, giải còn lại
  Kho mẫu                lọc theo dịp, ngành, mục tiêu; xem trước chơi được
  Đổi quà                vai trò "chỉ đổi quà" chỉ thấy mục này (dùng tốt trên điện thoại)
THƯƠNG HIỆU
  Brand kit · Thư viện ảnh
TỔ CHỨC
  Cài đặt                Chung · Thành viên & vai trò · Gói
THỬ NGHIỆM               chỉ hiện khi NEXT_PUBLIC_STUDIO_LABS=1 hoặc môi trường dev
```

Mục chưa có trang thì không hiện trên menu.

## 4. Luồng chính

Kho mẫu → Tạo nhanh (tên và brand kit điền sẵn, slug tự sinh) → Builder (4 bước) → Checklist trước publish + chơi thử bằng link nháp → **Màn chia sẻ** (QR, standee, link theo kênh, mời nhân viên đổi quà) → Vận hành → Nhân viên quét mã đổi quà.

Mỗi màn kết thúc bằng việc đưa người dùng sang bước sau, không trả về danh sách.

## 5. Lộ trình

| PR | Nội dung | Phạm vi |
|---|---|---|
| S1 | Khung app: sidebar chỉ còn route có thật, Labs sau cờ, gộp Thành viên về `/settings`, đổi "Sự kiện" → "Chương trình", bấm tên chương trình ra Tổng quan; sửa docs sang desktop-first | FE + docs |
| S2 | Trang Kho mẫu + tạo nhanh (createEvent → createGame → Builder) | FE |
| S3 | Khung Builder 4 bước, gỡ control trùng | FE |
| S4 | Bước Luật chơi: chuyển lịch, định danh, form, consent từ Cài đặt chương trình | FE |
| S5 | Trạng thái suy ra khi publish, checklist, màn chia sẻ | API + FE |
| S6 | Trang chủ, danh sách chương trình có số liệu | API + FE |
| S7 | Bước Giải thưởng, tab Giải & đổi quà (prize engine v1) | API + FE |
| S8 | Đổi quà + vai trò nhân viên | API + FE |

PR có phần API phải hỏi trước khi sửa `packages/contracts` (AGENTS.md).
