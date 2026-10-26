# Đặc tả Builder

Cập nhật: 26/10/2026 · Owner: PO · PRD: BLD-* ([prd §5.3](../prd.md#53-builder-bld)) · Liên quan: [studio-ux](./studio-ux.md), [prizes-redemption](./prizes-redemption.md), [participation](./participation.md), [playbooks](./playbooks.md), [game-catalog](./game-catalog.md), [ADR-012](../../adr/012-campaign-architecture.md), [ADR-014](../../adr/014-free-canvas-screen-editor.md) · Nghiên cứu: [builder-research](../../research/builder-research.md), [guandayun-teardown](../../research/guandayun-teardown.md), [kế hoạch 25/10](../../plans/2026-10-25-game-builder-plan.md)

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

| Thành phần | Mô tả | Ví dụ (`catch-items`) |
|---|---|---|
| `meta` | Tên, mô tả, ảnh đại diện, tag (dịp, ngành, mục tiêu), `kind` | `skill`, tag `['tet', 'fnb']` |
| `configSchema` | zod; nguồn chân lý để validate và sinh form | thời lượng, tốc độ rơi, điểm từng vật phẩm |
| `assetSlots` | Ô asset có ràng buộc (kích thước, tỷ lệ, định dạng, nền trong suốt) | `player`, `goodItem[1..5]`, `background` |
| `skins` | Bộ asset và cấu hình mặc định theo chủ đề | `tet`, `quanh-nam`, `khai-truong` |
| `screens` | **Màn mặc định theo skin** (`ScreenDoc`), có phần tử gắn ô thay thế | Bìa, Game, Kết quả |
| `server` | Map kết quả → hiển thị (instant) hoặc validator điểm (skill) | `validate()` |
| `editor` | Gợi ý nhóm field, widget, preset độ khó | Dễ / Vừa / Khó |
| `hotEditable` | Field sửa được khi đang chạy (chỉ chữ và nhãn) | `copy.*` |

### 2.2 Engine và renderer

| Engine | Logic server | Renderer (mẫu) |
|---|---|---|
| **Instant-win** | Prize engine quyết định kết quả trước, client chỉ diễn hoạt cảnh | Vòng quay, cào thẻ, mở hộp (M1); đập trứng, lật thẻ, lưới 9 ô, gacha, lắc (M2) |
| **Skill + điểm** | Khung chung: thời gian, điểm, ô cộng/trừ; validator phía server; thắng theo `score_threshold` hoặc `rank_based` | Hứng quà (M1); đếm tiền, chạm nhanh, đập logo, lật cặp, ghép hình (M2) |
| **Giữ chân** | Trạng thái người chơi qua nhiều ngày: chuỗi điểm danh, số dư điểm, bộ thẻ | Điểm danh, bốc mỗi ngày (M2); hub điểm, sưu tầm thẻ (M3) |

Thêm renderer không được đụng vào prize engine ([D-07](../decisions.md)).

---

## 3. Flow chuẩn

### 3.1 Luồng người chơi

```
[Bìa] → [Điều kiện]* → [Danh tính/Form]* → [Thể lệ]? → [Game] → [Kết quả] → [Chi tiết quà] → [Quà của tôi]
                                                               ├─ Trúng (mã + QR đổi quà)
                                                               ├─ Không trúng (giải an ủi?)
                                                               ├─ Hết quà
                                                               └─ Hết lượt / Chưa mở / Đã kết thúc
* tuỳ cấu hình chương trình     ? tuỳ mẫu
```

Bìa, Form, Kết quả, Quà của tôi thuộc **shell của Play**, không thuộc mẫu; mẫu chỉ vẽ trong `gameStage` ([ADR-012 §3](../../adr/012-campaign-architecture.md)).

### 3.2 Cấu hình mỗi màn

Mỗi màn là một tài liệu canvas (artboard rộng 375): nền, chữ, ảnh, nút, hình, đếm ngược, danh sách giải ([ADR-014 §3](../../adr/014-free-canvas-screen-editor.md)). Màn Kết quả có 4 biến thể, mỗi biến thể chỉnh chữ và ảnh riêng. Chữ hỗ trợ biến `{prize.name}`, `{player.name}`, `{event.name}`.

---

## 4. Editor

### 4.1 Bố cục

Studio desktop-first ([D-12](../decisions.md)). Builder toàn màn hình, 4 bước có thứ tự **Giao diện → Giải thưởng → Luật chơi → Phát hành** ([studio-ux §2](./studio-ux.md#2-mô-hình-một-chương-trình-hai-chế-độ)).

```
┌──────────────────┬──────────────────────────────┬──────────────────────────┐
│ MÀN              │   PREVIEW ĐIỆN THOẠI (thật)  │ THUỘC TÍNH               │
│ ▸ Bìa            │                              │ ô thay thế / phần tử /   │
│ ▸ Form           │      ┌───────────┐           │ cấu hình mẫu             │
│ ▸ Game  ●        │      │ CanvasScreen│          │                          │
│ ▸ Kết quả        │      │ + cơ chế    │          │                          │
│   ├ Trúng        │      └───────────┘           │                          │
│   └ …            │  [Chơi thử] [Link nháp]       │                          │
│ Lớp (Tuỳ biến)   │                              │ Kiểm tra 7/9 · [Phát hành]│
└──────────────────┴──────────────────────────────┴──────────────────────────┘
```

### 4.2 Ba chế độ trên cùng một dữ liệu

| Chế độ | Ai dùng | Nội dung | PRD |
|---|---|---|---|
| **Sửa nhanh** (mặc định) | Mọi chủ quán | Danh sách ô thay thế dạng thẻ (logo, ảnh sản phẩm, chữ khuyến mãi, ảnh quà); đổi skin giữ nguyên nội dung; màu brand | BLD-19 |
| **Tuỳ biến** (beta) | Người muốn khác biệt | Canvas tự do: kéo, đổi cỡ, xoay, snap, lớp, khoá 2 mức, neo dọc ([ADR-014](../../adr/014-free-canvas-screen-editor.md)) | BLD-20 |
| **Luật & giải** | Mọi chủ quán | Chọn **cách phát giải** trước → danh sách giải (kèm giá vốn) → số lượng → luật viết bằng câu ("Mỗi khách quay 1 lần/ngày") → mô phỏng | BLD-21 |

Ba chế độ ghi vào cùng một bản nháp; đổi chế độ không mất dữ liệu. Hiện có trong Builder Lab ([kế hoạch 25/10 §11](../../plans/2026-10-25-game-builder-plan.md#11-builder-lab--prototype-frontend-với-backend-giả-25102026)).

### 4.3 Khoá sau phát hành

- Phát hành tạo phiên bản bất biến; người chơi luôn chơi phiên bản đã phát hành, bản nháp sửa tiếp không ảnh hưởng.
- Field `hotEditable` (chữ, nhãn nút) sửa được khi đang chạy; mọi thay đổi ghi audit.
- Field ảnh hưởng công bằng (xác suất, luật, điều kiện) phải **phát hành phiên bản mới**, kèm cảnh báo "Thay đổi không ảnh hưởng người chơi đã tham gia" (yêu cầu khi sửa chương trình khuyến mại, [compliance](../../business/compliance.md)).

### 4.4 Auto-form cho phần riêng của mẫu

Mỗi field trong `configSchema` gắn metadata UI:

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

- `AutoForm` (`@playora/ui/auto-form`, trên antd `Form`) render các nhóm `gameplay / appearance / content`, validate bằng `zodRule(configSchema)`.
- Widget sẵn có: `text`, `number`, `slider`, `switch`, `segmented`, `select`, `color`, `asset`, `sound`, `list`, `localized`, `object`.
- Lối thoát: mẫu khai báo `editorWidgets` / `editorPanels` khi form tự sinh không đủ.
- Giải, lịch, lượt chơi, màn Bìa/Form/Kết quả do **panel nền tảng** viết tay, không do auto-form.

### 4.5 Kiểm tra trước khi phát hành

| Mức | Kiểm tra | Sửa một chạm |
|---|---|---|
| Chặn | Chưa có giải hoặc giải không có số lượng; tổng xác suất > 100%; thiếu thể lệ/consent; ngày kết thúc trước ngày bắt đầu; ô vòng quay không gắn giải nào | Mở đúng chỗ cần sửa |
| Cảnh báo | Quà dự kiến hết trước 80% thời gian (theo mô phỏng); chữ < 12 px; tương phản < 3:1; nút < 44 px; phần tử ra ngoài artboard; màn > 60 phần tử; chưa chơi thử lần nào | Đổi màu chữ sang `brand.text`, tăng cỡ, kéo vào |

### 4.6 AI dựng nháp (M2)

| Mức | Đầu vào | Đầu ra |
|---|---|---|
| AI-1 Chữ | Tên quán, ngành, dịp | Tiêu đề, khẩu hiệu, tên ô vòng quay, lời chúc (giới hạn độ dài theo ô) |
| AI-2 Bản nháp | "Quán cà phê, Tết, 3 giải, mỗi khách 1 lượt/ngày" | Playbook + mẫu + skin + đề xuất giải và luật; xuất JSON theo schema, validate zod; người dùng duyệt từng mục |
| AI-3 Brand từ link | Link fanpage / Zalo OA / web | Logo, màu, ảnh vào brand kit |

AI **không bao giờ** đặt kết quả, không đặt tỷ lệ ≈ 0 để "giữ giải"; muốn giữ giải lớn thì dùng rải quà/ngân sách.

---

## 5. Skin, theme và brand kit

| Tầng | Nội dung | Ai tạo |
|---|---|---|
| **Brand kit** | Logo (sáng/tối), màu (chính, phụ, nhấn, nền, chữ), font, bo góc, watermark | Quán |
| **Skin** | Bộ asset theo chủ đề cho các ô, kèm màn mặc định | Playora (thuê art), sau này đối tác |
| **Bộ theo dịp** | Nhiều skin cùng chủ đề cho mọi mẫu: Tết, 8/3, 30/4, hè, Trung thu, 20/10, Noel, khai trương | Playora |
| **Override** | Người dùng thay từng ô, từng phần tử | Quán |

Thứ tự áp: `mẫu mặc định → skin → brand kit → override`. Màu trong canvas mặc định là **tham chiếu token** (`brand.primary`…), nên đổi brand kit thì mọi màn đổi theo. Token kỹ thuật: [design-system §4](../../engineering/design-system.md).

---

## 6. Vòng đời chương trình

| Trạng thái (suy ra) | Hành động được phép |
|---|---|
| Nháp | Sửa tự do; chơi thử; link nháp |
| Đã lên lịch | Chỉ sửa `hotEditable`; muốn sửa khác thì phát hành phiên bản mới; tự chạy khi tới giờ |
| Đang chạy ⇄ Tạm dừng | Theo dõi; tạm dừng khẩn cấp; điều chỉnh tồn kho (có audit); **không xoá** |
| Đã kết thúc | Báo cáo, export; đổi quà vẫn mở tới hạn; gia hạn để chạy tiếp (giữ dữ liệu, có audit) |
| Đã xoá | Thùng rác 14 ngày rồi xoá cứng (M2) |

Nhân bản giữ cấu hình, skin, giải; xoá dữ liệu người chơi (M2).

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
| Playbook theo mục tiêu | 3 playbook F&B | + ngành khác | gợi ý chương trình tiếp theo | |
| Kho mẫu | Trong Studio, 3 mẫu × 2–3 skin | Công khai (SEO), bộ theo dịp | | Mẫu riêng của tổ chức |
| Sửa nhanh, Luật & giải, mô phỏng | ✅ | | | |
| Tuỳ biến (canvas) | Beta, desktop | Nhóm, chọn nhiều | | |
| Preview thật, chơi thử, link nháp | ✅ | | Kiosk preview | |
| Tự lưu, undo/redo, kiểm tra trước phát hành | ✅ | | | |
| Ảnh: upload, cắt theo ô | ✅ | Chụp + xoá nền | | |
| AI | | AI-1, AI-2, AI-3 | | |
| Nhân bản, thùng rác | | ✅ | | |
| `gen:template`, một nơi đăng ký mẫu | ✅ | | | |
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
