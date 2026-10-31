# UX Studio: luồng, điều hướng và bố cục

**Trạng thái:** Đã duyệt hướng · 25/10/2026 (cập nhật 31/10/2026 theo PRD v4.3) · Owner: PO · Wireframe: [artifact "Playora Studio Redesign"](https://claude.ai/artifact/BicQJgceiHnnL4voLzpETt) · Liên quan: [strategy](../strategy.md), [builder §4](./builder.md#4-editor), [playbooks](./playbooks.md), [design-system §3.4](../../engineering/design-system.md#34-luật-studio-theo-games-vt)

> **Studio là desktop-first** ([D-12](../decisions.md)). Mobile-first chỉ áp dụng cho game người chơi thấy, và cho màn Đổi quà của nhân viên quầy; ngoại lệ thứ hai là thao tác khẩn trên điện thoại ở trang Vận hành (tạm dừng/tiếp tục, thêm tồn kho, 4 số chính — EVT-15, M1 Could).
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

- UI gọi đối tượng chính là **Chương trình** (en: *Campaign*). DB giữ tên `events` (+ `games`, `game_versions`, [ADR-015](../../adr/015-campaign-persistence.md)); API/contract dùng `campaigns`.
- **M1: mỗi chương trình một game.** Dữ liệu vẫn cho nhiều game; UI ẩn danh sách game và sắp xếp.
- **Trạng thái do hệ thống suy ra** (thay cho ô chọn tay): Nháp → Phát hành → Đã lên lịch → đến giờ → Đang chạy ⇄ Tạm dừng → Đã kết thúc ([builder §6](./builder.md#6-vòng-đời-chương-trình)).
- **Soạn (Builder):** toàn màn hình, ba chế độ Sửa nhanh · Tuỳ biến · Luật & giải + hộp Phát hành ([builder §4.2](./builder.md#42-ba-chế-độ-trên-cùng-một-dữ-liệu)); cột trái là các màn người chơi thấy + lớp (ADR-014), giữa là preview điện thoại thật, phải là thuộc tính. Mặc định khi chương trình là Nháp.
- **Vận hành:** trong khung app; tab Tổng quan · Người chơi · Giải & đổi quà · Chia sẻ & QR · Cài đặt. Mặc định khi đã phát hành.
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
  Cài đặt                Chung · Thành viên & vai trò · Máy quầy (khi có ORG-10)
  Gói & sử dụng          gói, usage, cảnh báo 80%/100%, hoá đơn
THỬ NGHIỆM               chỉ hiện khi NEXT_PUBLIC_STUDIO_LABS=1 hoặc môi trường dev
```

Mục chưa có trang thì không hiện trên menu. Vai trò "chỉ đổi quà" và máy quầy chỉ thấy Đổi quà. Từ M2, quản lý cửa hàng (ORG-12) thấy Tổng quan, tồn kho, máy quầy và nhân viên của quán mình, không thấy Builder.

## 4. Luồng chính

"Bạn muốn gì?" → playbook (hoặc "Tự chọn mẫu" từ Kho mẫu) → **Thiết lập + đề xuất** (ngân sách, quà + giá vốn, ngày chạy, giờ mở cửa, lượng khách dự kiến → số lượng quà, tỷ lệ trúng, rủi ro hết quà) → Builder (Sửa nhanh · Tuỳ biến · Luật & giải) → chơi thử trong Studio → hộp Phát hành (kiểm tra + checklist pháp lý) → **Chia sẻ & QR** (QR, standee, link theo kênh, mời nhân viên, thêm máy quầy; checklist "Sẵn sàng mở bán" — BLD-29) → Vận hành → nhân viên quét mã đổi quà.

Mỗi màn kết thúc bằng việc đưa người dùng sang bước sau, không trả về danh sách.

## 5. Lộ trình (cập nhật 25/10/2026, sau Builder Lab)

Builder Lab ([kế hoạch 25/10 §11](../../plans/2026-10-25-game-builder-plan.md#11-builder-lab--prototype-frontend-với-backend-giả-25102026)) đã thay mô hình Sự kiện → nhiều Trò chơi bằng **một Chương trình** (`Campaign`: mẫu, skin, màu, màn canvas, giải, luật, lịch). Studio gộp về mô hình này (trạng thái cập nhật 31/10/2026).

| Đã xong | Nội dung |
|---|---|
| S1 | Sidebar chỉ có route thật, "Chương trình", docs desktop-first |
| S2 · S3 | Kho mẫu + tạo nhanh, Trang chủ, tab Tổng quan (trên mô hình cũ; thay ở A) |

**A — Đưa Lab vào Studio** (frontend; backend giả lúc đó đã được thay ở B):

| | Nội dung | Trạng thái |
|---|---|---|
| A1 | Sidebar: Trang chủ · Chương trình (`/campaigns`) · Kho mẫu (`/campaigns/new`) · Đổi quà (`/redeem`). Editor toàn màn hình ở `/campaigns/:id/edit`, chơi thử ở `/play/:id?rehearsal=1`. Mọi URL qua `features/builder-lab/lib/routes.ts` | Xong |
| A2 | Trang vận hành `/campaigns/:id`: Tổng quan (số liệu, tồn kho, lượt gần đây; nháp thì hiện việc còn chặn phát hành) · Chia sẻ & QR · Giải & đổi quà · Người chơi · Cài đặt | Xong |
| A3 | Trang chủ đọc chương trình: Cần xử lý (quà dưới 20 %, tạm dừng, sắp kết thúc, có thay đổi chưa phát hành), checklist bắt đầu, chương trình, mẫu gợi ý | Xong |
| A4 | Quầy đổi quà trong khung app | Xong |
| A5 | Chương trình mới lấy màu chính/nhấn từ brand kit đầu tiên của tổ chức | Xong (chọn ảnh từ Thư viện ảnh trong Builder: chưa) |
| A6 | Vòng đời suy ra (`lib/phase.ts`): Nháp → Đã lên lịch → Đang chạy ⇄ Tạm dừng → Đã kết thúc; kết thúc ngay, gia hạn; không xoá khi đang chạy/đã lên lịch | Xong |

**B — API thật thay backend giả** (P0 của [roadmap](../roadmap.md#p0--vòng-lõi-thật--2610--2211-4-tuần)) — **Xong**: contract `campaigns` / `plays` / `vouchers` / `stats`, vai trò "chỉ đổi quà", e2e API có cross-tenant; Studio dùng `useRouteQuery`/`useRouteMutation`. Cách lưu: [ADR-015](../../adr/015-campaign-persistence.md) (Accepted: `events` + `games` + `game_versions`).

**C — Dọn:**

| | Nội dung | Trạng thái |
|---|---|---|
| C1 | Gỡ UI sự kiện/trò chơi/khách mời cũ (`/events/**`, `features/events`, `features/games`, `features/guests`, editor cũ, chia đội) cùng e2e và chuỗi i18n của chúng; module API giữ nguyên | Xong (27/10) |
| C2 | Gói & sử dụng (`/settings/billing`, mục "Gói & sử dụng" trong nhóm Tổ chức), cảnh báo hạn mức, back-office `/admin` | Xong (27/10) |
| C3 | Gỡ Canvas lab; đổi tên `features/builder-lab` → `features/campaigns` | Chưa |

**D — Kết quả trước** (P1 của [roadmap](../roadmap.md)) — **Xong** (PLB-01…PLB-04, e2e `playbook-create`, `campaign-report`): luồng tạo từ playbook; Tổng quan đổi thứ tự thẻ số liệu thành Khách tới quầy · Khách quay lại · Chi phí quà · Chi phí mỗi khách; báo cáo một trang ([playbooks §3](./playbooks.md#3-báo-cáo-kết-quả)).

**E — Sẵn sàng pilot** (P2, [D-26](../decisions.md) / [D-28](../decisions.md)): Máy quầy `/settings/counter-devices` + nút ở Chia sẻ & QR (ORG-10, Must); tab Người chơi liệt kê người chơi (EVT-02, Should); thêm/bớt tồn kho khi đang chạy (PRZ-01, Should); nhịp phát quà + so với ngày thường trên Tổng quan (PRZ-22, PLB-08, Should); checklist "Sẵn sàng mở bán" (BLD-29, Should); export (ANL-02, Should); email tóm tắt (ANL-10, Should); Vận hành gọn trên điện thoại (EVT-15, Could); sửa nóng (BLD-08, Could).

PR có phần API phải hỏi trước khi sửa `packages/contracts` (AGENTS.md).
