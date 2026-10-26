# UX Studio: luồng, điều hướng và bố cục

**Trạng thái:** Đã duyệt hướng · 25/10/2026 (cập nhật 26/10/2026 theo strategy v4.0) · Owner: PO · Wireframe: [artifact "Playora Studio Redesign"](https://claude.ai/artifact/BicQJgceiHnnL4voLzpETt) · Liên quan: [strategy](../strategy.md), [builder §4](./builder.md#4-editor), [playbooks](./playbooks.md), [design-system §3.4](../../engineering/design-system.md#34-luật-studio-theo-games-vt)

> **Studio là desktop-first** ([D-12](../decisions.md)). Mobile-first chỉ áp dụng cho game người chơi thấy, và cho màn Đổi quà của nhân viên quầy.
>
> **v4.0:** luồng tạo bắt đầu bằng **mục tiêu** (playbook) và Tổng quan chương trình hiện **kết quả** (khách tới quầy, quay lại, chi phí quà) trước lượt chơi ([playbooks](./playbooks.md)). Xem §4 và §5 bước D.

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
- **Trạng thái do hệ thống suy ra** (thay cho ô chọn tay): Nháp → Publish → Đã lên lịch → đến giờ → Đang chạy ⇄ Tạm dừng → Đã kết thúc ([builder §6](./builder.md#6-vòng-đời-chương-trình)).
- **Soạn (Builder):** toàn màn hình, 4 bước Giao diện → Giải thưởng → Luật chơi → Phát hành; cột trái là các màn người chơi thấy + lớp (ADR-014), giữa là preview điện thoại thật, phải là thuộc tính. Mặc định khi chương trình là Nháp.
- **Vận hành:** trong khung app; tab Tổng quan · Người chơi · Giải & đổi quà · Kênh & QR · Cài đặt. Mặc định khi đã publish.
- Bấm một chương trình ở bất cứ đâu thì mở đúng chế độ theo trạng thái.

## 3. Điều hướng

```
Trang chủ                kết quả tuần này, cần xử lý, "Bạn muốn gì?" (playbook), checklist bắt đầu
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

"Bạn muốn gì?" → playbook (nhập ngân sách, giá vốn quà, ngày chạy; hoặc "Tạo trống" từ Kho mẫu) → Tạo nhanh (tên và brand kit điền sẵn, slug tự sinh) → Builder (4 bước) → Checklist trước publish + chơi thử bằng link nháp → **Màn chia sẻ** (QR, standee, link theo kênh, mời nhân viên đổi quà) → Vận hành → Nhân viên quét mã đổi quà.

Mỗi màn kết thúc bằng việc đưa người dùng sang bước sau, không trả về danh sách.

## 5. Lộ trình (cập nhật 25/10/2026, sau Builder Lab)

Builder Lab ([kế hoạch 25/10 §11](../../plans/2026-10-25-game-builder-plan.md#11-builder-lab--prototype-frontend-với-backend-giả-25102026)) đã thay mô hình Sự kiện → nhiều Trò chơi bằng **một Campaign** (mẫu, skin, màu, màn canvas, giải, luật, lịch). Studio gộp về mô hình này.

| Đã xong | Nội dung |
|---|---|
| S1 | Sidebar chỉ có route thật, "Chương trình", docs desktop-first |
| S2 · S3 | Kho mẫu + tạo nhanh, Trang chủ, tab Tổng quan (trên mô hình cũ; thay ở A) |

**A — Đưa Lab vào Studio** (frontend, backend giả trong `features/builder-lab/mock`):

| | Nội dung | Trạng thái |
|---|---|---|
| A1 | Sidebar: Trang chủ · Chương trình (`/campaigns`) · Kho mẫu (`/campaigns/new`) · Đổi quà (`/redeem`). Editor toàn màn hình ở `/campaigns/:id/edit`, người chơi giả lập ở `/play/:id`. Mọi URL qua `lib/routes.ts` | Xong |
| A2 | Trang vận hành `/campaigns/:id`: Tổng quan (số liệu, tồn kho, lượt gần đây; nháp thì hiện việc còn chặn publish) · Chia sẻ & QR · Giải & đổi quà · Người chơi · Cài đặt | Xong |
| A3 | Trang chủ đọc campaign: Cần xử lý (quà dưới 20 %, tạm dừng, sắp kết thúc, có thay đổi chưa publish), checklist bắt đầu, chương trình, mẫu gợi ý | Xong |
| A4 | Quầy đổi quà trong khung app | Xong |
| A5 | Campaign mới lấy màu chính/nhấn từ brand kit đầu tiên của tổ chức | Xong (chọn ảnh từ Thư viện ảnh: chưa) |
| A6 | Vòng đời suy ra (`lib/phase.ts`): Nháp → Đã lên lịch → Đang chạy ⇄ Tạm dừng → Đã kết thúc; kết thúc ngay, gia hạn; không xoá khi đang chạy/đã lên lịch | Xong |

**B — API thật thay backend giả** (P0 của [roadmap](../roadmap.md#p0--vòng-lõi-thật--2610--2211-4-tuần)): contract `campaigns` / `plays` / `vouchers` / `stats`, vai trò "chỉ đổi quà", e2e API có cross-tenant; đổi `mock/hooks.ts` sang `useRouteQuery`. Cách lưu Campaign: [ADR-015](../../adr/015-campaign-persistence.md) (đề xuất dùng `events` + `games` + `game_versions`).

**C — Dọn:**

| | Nội dung | Trạng thái |
|---|---|---|
| C1 | Gỡ UI sự kiện/trò chơi/khách mời cũ (`/events/**`, `features/events`, `features/games`, `features/guests`, editor cũ, chia đội) cùng e2e và chuỗi i18n của chúng; module API giữ nguyên | Xong (27/10) |
| C2 | Gói & sử dụng (`/settings/billing`, mục "Gói & sử dụng" trong nhóm Tổ chức), cảnh báo hạn mức, back-office `/admin` | Xong (27/10) |
| C3 | Gỡ Canvas lab; đổi tên `features/builder-lab` → `features/campaigns` | Chưa |

**D — Kết quả trước** (P1 của [roadmap](../roadmap.md)): luồng tạo từ playbook; Tổng quan đổi thứ tự thẻ số liệu thành Khách tới quầy · Khách quay lại · Chi phí quà · Chi phí mỗi khách; báo cáo một trang ([playbooks §3](./playbooks.md#3-báo-cáo-kết-quả)).

PR có phần API phải hỏi trước khi sửa `packages/contracts` (AGENTS.md).
