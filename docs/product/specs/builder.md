# Đặc tả Builder

Cập nhật: 31/10/2026 · Owner: PO · PRD: BLD-* ([prd §5.3](../prd.md#53-builder-bld)) · Liên quan: [studio-ux](./studio-ux.md), [prizes-redemption](./prizes-redemption.md), [participation](./participation.md), [playbooks](./playbooks.md), [game-catalog](./game-catalog.md), [ADR-012](../../adr/012-campaign-architecture.md), [ADR-014](../../adr/014-free-canvas-screen-editor.md) · Nghiên cứu: [builder-research](../../research/builder-research.md), [guandayun-teardown](../../research/guandayun-teardown.md), [kế hoạch 25/10](../../plans/2026-10-25-game-builder-plan.md)

---

## 1. Mục tiêu và nguyên tắc

**Mục tiêu:** chủ quán không biết thiết kế có một chương trình mang ảnh sản phẩm và thương hiệu của quán, có giải, đo được kết quả, trong **≤ 10 phút** (M1) và **≤ 5 phút** (M2) tính từ lúc chọn playbook.

**Nguyên tắc:**

1. **Engine cố định + cấu hình.** Mẫu là code (cơ chế); luật, giải, nội dung là cấu hình. Bố cục mỗi màn là canvas do người dùng chỉnh; cơ chế game nằm trong khung `gameStage` ([ADR-014](../../adr/014-free-canvas-screen-editor.md)).
2. **Một flow chuẩn cho mọi game.** Học một lần, dùng cho mọi mẫu (§3).
3. **Giải, tham gia, chống gian lận, dữ liệu là dịch vụ nền tảng**, không nằm trong mẫu. Mẫu mới tự thừa hưởng.
4. **Mẫu trước, ô thay thế, canvas khi cần.** Người dùng bắt đầu từ màn mặc định đẹp; Sửa nhanh là chế độ mặc định, Tuỳ biến là lựa chọn.
5. **Một renderer cho Play và Studio.** Preview khớp 100% với bản phát hành.
6. **Minh bạch thay vì "điều khiển kết quả".** Không có cách định trước người trúng; AI, canvas, nút đều không gọi được quyết định giải.

---

## 2. Mô hình khái niệm

```
Tổ chức ──► Chương trình ──► Game (M1: đúng một) ──► Phiên bản đã phát hành (bất biến)
 │ brand kit, gói      │ lịch, danh tính, form,     │ mẫu@phiên bản, skin, màn (canvas),
 │                     │ kênh, chống gian lận,       │ cấu hình mẫu, giải, luật
 │                     │ mục tiêu (playbook)         │
 └─ tầng dưới ghi đè tầng trên (null = kế thừa)
```

Lưu trữ cụ thể: [ADR-015](../../adr/015-campaign-persistence.md).

### 2.1 Cấu tạo một mẫu

| Thành phần | Mô tả | Ví dụ (`spin-wheel`) |
|---|---|---|
| `meta` | Tên, mô tả, ảnh đại diện, tag (dịp, ngành, mục tiêu), `kind` | `instant`, tag `['tet', 'fnb']` |
| `configSchema` | zod; nguồn chân lý để validate và sinh form (M2, BLD-02) | thời lượng quay, số vòng |
| `assetSlots` | Ô asset có ràng buộc (kích thước, tỷ lệ, định dạng, nền trong suốt) | `logo`, `product`, `prize[1..n]` |
| `skins` | Bộ asset và cấu hình mặc định theo chủ đề | `tet`, `everyday`, `grand-opening` |
| `screens` | **Màn mặc định theo skin** (`ScreenDoc`), có phần tử gắn ô thay thế | Bìa (`cover`), Form (`form`), Game (`game`), Trúng (`resultWin`), Không trúng (`resultLose`) |
| `server` | Map kết quả → hiển thị (instant) hoặc validator điểm (skill) | `present()` |
| `editor` | Gợi ý nhóm field, widget, preset độ khó | — |
| `hotEditable` | Field sửa nóng được khi đang chạy (chỉ chữ và nhãn) — *chưa có trong mô hình Chương trình* (BLD-08, M1 Could) | `copy.*` |

### 2.2 Engine và renderer

| Engine | Logic server | Renderer (mẫu) |
|---|---|---|
| **Instant-win** | Prize engine quyết định kết quả trước, client chỉ diễn hoạt cảnh | Vòng quay, cào thẻ, mở hộp (M1); đập trứng, lật thẻ, lưới 9 ô, gacha, lắc (M2) |
| **Skill + điểm** | Khung chung: thời gian, điểm, ô cộng/trừ; validator phía server; thắng theo `score_threshold` hoặc `rank_based` | Hứng quà, lật cặp, đập logo, ghép hình, lì xì rơi (M2; hứng quà dời từ M1) |
| **Giữ chân** | Trạng thái người chơi qua nhiều ngày: chuỗi điểm danh, số dư điểm, bộ thẻ | Điểm danh, bốc mỗi ngày (M2); hub điểm, sưu tầm thẻ (M3) |

Thêm renderer không được đụng vào prize engine ([D-07](../decisions.md)).

---

## 3. Flow chuẩn

### 3.1 Luồng người chơi

```
[Bìa] → [Form]* → [Game] → [Kết quả] → [Quà của tôi]
                            ├─ Trúng (mã + QR, hạn, nơi đổi)        màn canvas `resultWin`
                            └─ Không trúng (dùng cho cả hết quà)     màn canvas `resultLose`
Hết lượt / ngoài giờ / chưa mở / tạm dừng / đã kết thúc: thông báo (sheet) của shell Play, kèm thời điểm lượt tiếp theo
* khi chương trình bật form. Thể lệ đầy đủ mở từ link trên Bìa.
```

Bìa, Form, Kết quả, Quà của tôi thuộc **shell của Play**, không thuộc mẫu; mẫu chỉ vẽ trong `gameStage` ([ADR-012 §3](../../adr/012-campaign-architecture.md)).

### 3.2 Cấu hình mỗi màn

Mỗi màn là một tài liệu canvas (artboard rộng 375): nền, chữ, ảnh, nút, hình, đếm ngược, danh sách giải ([ADR-014 §3](../../adr/014-free-canvas-screen-editor.md)). Kết quả có 2 màn canvas, **Trúng** (`resultWin`) và **Không trúng** (`resultLose`, dùng cho cả hết quà), mỗi màn chỉnh chữ và ảnh riêng; Hết lượt, ngoài giờ/ngày mở, Chưa mở, Tạm dừng, Đã kết thúc là thông báo dạng sheet của shell Play (cập nhật 31/10 cho khớp code). Chữ hỗ trợ biến `{prize.name}`, `{player.name}`, `{event.name}`.

### 3.3 Bìa minh bạch (BLD-25, M1 Should)

Màn Bìa mặc định của mọi skin hiện số quà còn lại / tổng (thanh tiến độ, đọc `prizes.remaining`, cache ≤ 30 s), danh sách quà có ảnh + tên, và dòng "Hôm nay bạn còn 1 lượt" khi đã biết người chơi; không lộ tỷ lệ trúng. Chủ quán ẩn/hiện hoặc kéo vị trí trong Tuỳ biến.

---

## 4. Editor

### 4.1 Bố cục

Studio desktop-first ([D-12](../decisions.md)). Builder toàn màn hình, ba chế độ **Sửa nhanh · Tuỳ biến · Luật & giải** (§4.2) và nút **Phát hành** mở hộp kiểm tra + checklist pháp lý (cập nhật 31/10 cho khớp code; trước đây viết là 4 bước Giao diện → Giải thưởng → Luật chơi → Phát hành) ([studio-ux §2](./studio-ux.md#2-mô-hình-một-chương-trình-hai-chế-độ)).

```
┌──────────────────┬──────────────────────────────┬──────────────────────────┐
│ MÀN              │   PREVIEW ĐIỆN THOẠI (thật)  │ THUỘC TÍNH               │
│ ▸ Bìa            │                              │ ô thay thế / phần tử /   │
│ ▸ Form           │      ┌───────────┐           │ cấu hình mẫu             │
│ ▸ Game  ●        │      │ CanvasScreen│          │                          │
│ ▸ Kết quả        │      │ + cơ chế    │          │                          │
│   ├ Trúng        │      └───────────┘           │                          │
│   └ Không trúng  │  [Chơi thử] [Mở trên ĐT]*    │                          │
│ Lớp (Tuỳ biến)   │                              │ Kiểm tra 7/9 · [Phát hành]│
└──────────────────┴──────────────────────────────┴──────────────────────────┘
* Link nháp công khai + QR mở trên điện thoại (BLD-23, BLD-26): M1 Should, chưa có.
```

### 4.2 Ba chế độ trên cùng một dữ liệu

| Chế độ | Ai dùng | Nội dung | PRD |
|---|---|---|---|
| **Sửa nhanh** (mặc định) | Mọi chủ quán | Danh sách ô thay thế dạng thẻ (logo, ảnh sản phẩm, chữ khuyến mãi, ảnh quà); đổi skin giữ nguyên nội dung; màu brand | BLD-19 |
| **Tuỳ biến** (beta) | Người muốn khác biệt | Canvas tự do: kéo, đổi cỡ, xoay, snap, lớp, khoá 2 mức, neo dọc ([ADR-014](../../adr/014-free-canvas-screen-editor.md)) | BLD-20 |
| **Luật & giải** | Mọi chủ quán | (1) chọn **cách phát giải** → (2) giải (tên, ảnh, số lượng, giá vốn) → (3) luật viết bằng câu (lượt/ngày, lịch, giờ mở cửa, rải quà, ngân sách, phải đổi quà trước khi chơi tiếp, form, chống gian lận) → (4) pháp lý (loại chương trình, thể lệ tự sinh/sửa); thẻ mô phỏng cập nhật theo mọi thay đổi | BLD-21, CMP-03, CMP-04 |

Ba chế độ ghi vào cùng một bản nháp; đổi chế độ không mất dữ liệu. Đã chạy trong Studio với API thật (`/campaigns/{id}/edit`); Tuỳ biến là beta, chỉ desktop.

### 4.3 Khoá sau phát hành

- Phát hành tạo phiên bản bất biến (`game_versions`); người chơi luôn chơi phiên bản đã phát hành, bản nháp sửa tiếp không ảnh hưởng.
- *Chưa có (M1 Could, BLD-08):* sửa nóng chữ và nhãn nút khi đang chạy, có audit. Hiện mọi thay đổi sau phát hành nằm trong bản nháp và phải phát hành lại.
- Field ảnh hưởng công bằng (xác suất, luật, điều kiện) luôn phải **phát hành phiên bản mới**, kèm cảnh báo "Thay đổi không ảnh hưởng người chơi đã tham gia" (yêu cầu khi sửa chương trình khuyến mại, [compliance](../../business/compliance.md)).

### 4.4 Auto-form cho phần riêng của mẫu (M2, BLD-02)

Ở M1, cơ chế tự suy từ danh sách giải (vòng quay dựng tối thiểu 6 ô từ các giải, cào thẻ lộ ≥ 45%, mở hộp 3 hộp). Từ M2, mỗi field trong `configSchema` gắn metadata UI:

```ts
const config = z.object({
  durationSec: z.number().int().min(15).max(180).default(30)
    .meta({ group: 'gameplay', widget: 'slider', label: { vi: 'Thời gian chơi (giây)' } }),
  items: z.array(z.object({
    asset: assetSlot({ ratio: '1:1', minPx: 256, transparent: true }),
    points: z.number().int().min(-50).max(100),
  })).min(1).max(8)
    .meta({ group: 'gameplay', widget: 'list', itemLabel: 'Vật phẩm' }),
  copy: z.object({ title: localizedText(), cta: localizedText() })
    .meta({ group: 'content', hotEditable: true }),
});
```

- `AutoForm` (`@playora/ui/auto-form`, trên shadcn `Form` + `react-hook-form`, [ADR-016](../../adr/016-shadcn-luma-ui.md)) render các nhóm `gameplay / appearance / content`, validate bằng `configSchema`.
- Widget sẵn có: `text`, `number`, `slider`, `switch`, `segmented`, `select`, `color`, `asset`, `sound`, `list`, `localized`, `object`.
- Lối thoát: mẫu khai báo `editorWidgets` / `editorPanels` khi form tự sinh không đủ.
- Giải, lịch, lượt chơi, màn Bìa/Form/Kết quả do **panel nền tảng** viết tay, không do auto-form.

### 4.5 Kiểm tra trước khi phát hành (`preflight.ts`, BLD-09)

| Mức | Đã có | *Chưa có (M1 Could)* | Sửa một chạm |
|---|---|---|---|
| Chặn | Chưa có giải; giải số lượng ≤ 0; tổng xác suất > 100%; ngày kết thúc ≤ ngày bắt đầu hoặc đã qua; khung game/form ngoài artboard; tiêu đề trống | — | Thêm giải mặc định, chia lại xác suất về 100%, dời ngày kết thúc +14 ngày, kéo vào artboard |
| Cảnh báo | Tổng quà < 10; chữ < 12 px; tương phản < 3:1; nút < 44 px; phần tử khác ngoài artboard; chưa chọn loại chương trình (checklist vẫn chặn) | Quà hết trước 80% thời gian theo mô phỏng; chưa chơi thử; màn > 60 phần tử | Tăng cỡ chữ/nút, đổi màu chữ sang `brand.text` |

Dưới danh sách là checklist pháp lý (CMP-03); nút Phát hành chỉ bật khi hết lỗi chặn **và** đủ checklist.

### 4.6 AI dựng nháp (M2)

| Mức | Đầu vào | Đầu ra |
|---|---|---|
| AI-1 Chữ | Tên quán, ngành, dịp | Tiêu đề, khẩu hiệu, tên ô vòng quay, lời chúc (giới hạn độ dài theo ô) |
| AI-2 Bản nháp | "Quán cà phê, Tết, 3 giải, mỗi khách 1 lượt/ngày" | Playbook + mẫu + skin + đề xuất giải và luật; xuất JSON theo schema, validate zod; người dùng duyệt từng mục |
| AI-3 Brand từ link | Link fanpage / Zalo OA / web | Logo, màu, ảnh vào brand kit |

AI **không bao giờ** đặt kết quả, không đặt tỷ lệ ≈ 0 để "giữ giải"; muốn giữ giải lớn thì dùng rải quà/ngân sách.

### 4.7 Link nháp công khai và QR điện thoại (BLD-23, BLD-26 — M1 Should)

Hiện nút "Chơi thử" chạy bản nháp ngay trong Studio cho thành viên đã đăng nhập (`rehearsal-plays`, không trừ kho thật). Link nháp công khai và QR dưới preview cho phép mở bản nháp trên điện thoại thật của chủ quán/nhân viên (token khó đoán, tối đa 20 người ngoài tổ chức, thu hồi được).

---

## 5. Skin, theme và brand kit

| Tầng | Nội dung | Ai tạo |
|---|---|---|
| **Brand kit** | Logo, 5 màu (chính, nhấn, nền, bề mặt, chữ), font. Upload logo → đề xuất 5 màu: BLD-27 (M1 Could) | Quán |
| **Skin** | Bộ asset theo chủ đề cho các ô, kèm màn mặc định | Playora (thuê art), sau này đối tác |
| **Bộ theo dịp** | Nhiều skin cùng chủ đề cho mọi mẫu: Tết, 8/3, 30/4, hè, Trung thu, 20/10, Noel, khai trương | Playora |
| **Override** | Người dùng thay từng ô, từng phần tử | Quán |

Thứ tự áp: `mẫu mặc định → skin → brand kit → override`. Màu trong canvas mặc định là **tham chiếu token** (`brand.primary`…), nên đổi brand kit thì các màn chưa ghi đè màu đổi theo trong bản nháp; bản đã phát hành chỉ đổi khi phát hành lại. Token kỹ thuật: [design-system §4](../../engineering/design-system.md).

---

## 6. Vòng đời chương trình

| Trạng thái (suy ra) | Hành động được phép |
|---|---|
| Nháp | Sửa tự do; chơi thử trong Studio; xoá (link nháp công khai: M1 Should) |
| Đã lên lịch | Sửa bản nháp rồi phát hành lại; tạm dừng; tự chạy khi tới giờ |
| Đang chạy ⇄ Tạm dừng | Theo dõi; tạm dừng/tiếp tục; kết thúc ngay; gia hạn; đổi giải/tồn kho bằng cách sửa bản nháp và phát hành lại (thêm tồn kho trực tiếp có audit: PRZ-01, M1 Should); **không xoá** |
| Đã kết thúc | Báo cáo; đổi quà vẫn mở tới hạn (kết thúc + 7 ngày); gia hạn bằng ngày kết thúc mới (giữ dữ liệu); xoá (xoá mềm); export: ANL-02 (M1 Should) |
| Đã xoá | Xoá mềm; thùng rác 14 ngày + khôi phục: M2 (BLD-15) |

Nhân bản giữ cấu hình, skin, giải; xoá dữ liệu người chơi (M2, BLD-15).

---

## 7. Mở rộng cho developer (M4 trở đi)

| Mức | Tính năng | GĐ |
|---|---|---|
| Webhook sự kiện | `player.registered`, `play.completed`, `prize.awarded`, `prize.redeemed` | M4 |
| Logic webhook | Trước mỗi lượt, gọi endpoint của khách (ký HMAC, timeout 800 ms) trả `allow / deny / no_prize / restrict`. Vẫn tuân tồn kho và giới hạn của nền tảng; **không** cho chọn người trúng | M4 |
| Public API | CRUD chương trình, giải, export, đổi quà | M4 |
| Game SDK công khai | Đối tác viết mẫu bằng `@playora/game-sdk`, chạy trong iframe sandbox; logic server chỉ khai báo bằng luật tính điểm | Later |

---

## 8. Phân kỳ

| Hạng mục | M1 | M2 | M3 | M4 |
|---|---|---|---|---|
| Playbook theo mục tiêu | 3 playbook F&B | + ngành khác, luồng "60 giây" (BLD-28) | gợi ý chương trình tiếp theo | |
| Kho mẫu | Trong Studio, 3 mẫu × 3 skin (art thật cho Tết, quanh năm — BLD-06) | Công khai (SEO), bộ theo dịp | | Mẫu riêng của tổ chức |
| Sửa nhanh, Luật & giải, mô phỏng | ✅ | Auto-form cấu hình mẫu (BLD-02) | | |
| Tuỳ biến (canvas) | Beta, desktop | Nhóm, chọn nhiều | | |
| Bìa minh bạch (BLD-25) | M1 Should | | | |
| Preview thật, chơi thử, link nháp | Preview thật, chơi thử trong Studio ✅; link nháp công khai + QR điện thoại (BLD-23, BLD-26 — M1 Should) | | Kiosk preview | |
| Tự lưu, undo/redo, kiểm tra trước phát hành | ✅ (thiếu luật mô phỏng/chưa chơi thử/màn > 60 phần tử: M1 Could) | | | |
| Checklist "Sẵn sàng mở bán" (BLD-29) | M1 Should | | | |
| Sửa nóng chữ/nhãn (BLD-08) | M1 Could | | | |
| Ảnh & màu brand | Upload ✅; chọn từ thư viện trong Builder, cắt theo ô, màu từ logo (BLD-13, BLD-27 — M1 Could) | Chụp + xoá nền (BLD-22) | | |
| AI | | AI-1, AI-2, AI-3 | | |
| Nhân bản, thùng rác | | ✅ (BLD-15) | | |
| `gen:template`, một nơi đăng ký mẫu | M1 Could, chưa có (tạm copy `spin-wheel`) | | | |
| Webhook, API, Game SDK công khai | | | | Webhook, API · Later: SDK |

---

## 9. Tiêu chí nghiệm thu

**M1**
1. 5 người không làm thiết kế dựng chương trình Tết có logo + ảnh sản phẩm từ playbook trong ≤ 10 phút, ≤ 2 lần hỏi.
2. Preview khớp bản phát hành (cùng `CanvasScreen` và cùng renderer cơ chế).
3. Mẫu mới chỉ cần thư mục mẫu (`configSchema`, `assetSlots`, màn mặc định) là builder có đủ form và Sửa nhanh, không sửa code Studio.
4. Đổi brand kit thì màn của chương trình chưa ghi đè màu đổi theo trong bản nháp.

**M2**
5. 3/3 chủ quán dùng thử tự dựng và phát hành trong ≤ 5 phút, không cần hỗ trợ.
6. ≥ 80% chương trình thật được quán tự dựng.
