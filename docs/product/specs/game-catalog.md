# Danh mục game

Cập nhật: 31/10/2026 · Owner: PO · PRD: GAM-* ([prd §5.6](../prd.md#56-game-gam)) · Liên quan: [builder §2](./builder.md#2-mô-hình-khái-niệm), [prizes-redemption](./prizes-redemption.md), [architecture §5](../../engineering/architecture.md)

---

## 1. Phân loại

| Engine | `kind` | Ai quyết định kết quả | Ví dụ |
|---|---|---|---|
| **Instant-win** | `instant` | Server, **trước** khi client animate | Vòng quay, cào thẻ, mở hộp |
| **Skill + điểm** | `skill` | Client chơi, server **xác thực** điểm; giải theo ngưỡng điểm hoặc hạng | Hứng quà, lật cặp, ghép hình |
| **Giữ chân** | (M2) | Server giữ trạng thái nhiều ngày | Điểm danh, sưu tầm thẻ |

Bốc thăm cuối chương trình là tính năng nền tảng, không phải mẫu ([prizes-redemption §7](./prizes-redemption.md#7-bốc-thăm-cuối-chương-trình-m2)).

**Nguyên tắc chọn mẫu** ([D-07](../decisions.md)):
1. Mẫu là renderer trên engine có sẵn. Engine mới chỉ khi đáng giá ≥ 10 skin.
2. Ra skin theo dịp đều đặn quan trọng hơn ra cơ chế mới.
3. Mẫu phải chơi tốt bằng một ngón tay trên điện thoại cũ, trong trình duyệt của Zalo/FB.

## 2. Danh mục và giai đoạn

| Mẫu | Tên | Engine | GĐ | Độ khó | Ghi chú |
|---|---|---|---|---|---|
| `spin-wheel` | Vòng quay may mắn | instant | **M1** | S | Ô sinh tự động từ danh sách giải (tối thiểu 6, xen kẽ ô giải và ô "chúc may mắn"); cấu hình 4–12 ô (BLD-02) ở M2. Chạy với API thật (`packages/ui/src/campaign/spin-wheel.tsx`) |
| `scratch-card` | Cào thẻ | instant | **M1** | S | Cào lộ ≥ 45% thì hiện kết quả. Chạy với API thật (`packages/ui/src/campaign/scratch-card.tsx`) |
| `gift-box` | Mở hộp quà | instant | **M1** | S | 3 hộp; biến thể skin: hộp quà, trứng vàng, lì xì. Chạy với API thật (`packages/ui/src/campaign/gift-box.tsx`) |
| `flip-card`, `grid-9`, `egg-smash` | Lật thẻ, lưới 9 ô, đập trứng | instant | M2 | S | Renderer mới trên engine instant-win, không đụng prize engine ([D-07](../decisions.md)) |
| `catch-items` | Hứng quà | skill | M2 (dời từ M1, GAM-02) | M | PixiJS; `score_threshold` → một lượt xét giải |
| `memory-match` | Lật cặp | skill | M2 | S | Ảnh sản phẩm của quán làm thẻ |
| `whack-a-mole` | Đập logo | skill | M2 | M | |
| `puzzle` | Ghép hình | skill | M2 | M | Ghép ảnh sản phẩm |
| `red-envelope` | Lì xì rơi | skill | M2 | M | Kịp Tết 2028 bằng skin |
| `slot-machine`, `gacha` | Máy xèng, gacha | instant | M2 | S | Skin/renderer của instant-win |
| `daily-checkin` | Điểm danh | giữ chân | M2 | M | |
| `collect-cards` | Sưu tầm thẻ | giữ chân | M3 | M | Không có cơ chế xin thẻ từ bạn |

**Độ khó:** S ≈ 3–5 ngày, M ≈ 1,5–2 tuần với một người (gồm schema, màn mặc định, 2 skin, test).

**Đã bỏ:** quiz, poll (D-01); mọi game live/LED (D-02): `shake-race`, `tap-race`, `tug-of-war`, `checkin-wall`, `money-count`… Code ở tag `archive/live-engine`.

**Kho mẫu = mẫu × skin.** Mục tiêu: pilot Tết 3 mẫu × 3 skin (art thật cho Tết và quanh năm); M2 8 mẫu × 8 bộ theo dịp; M4 trên 200 tổ hợp.

---

## 3. Đặc tả mẫu M1

### 3.0 Luồng chung cho instant-win

1. Shell Play chạy Bìa → Form/consent (nếu bật) → màn Game ([builder §3.1](./builder.md#31-luồng-người-chơi)).
2. Người chơi bấm chơi → `POST /p/{slug}/plays` (token người chơi từ bước tham gia; body `requestId` idempotent, `channel`, `captchaToken` theo mức chống gian lận). Server kiểm điều kiện, gọi prize engine trong một giao dịch, trừ kho nguyên tử, cấp mã đổi quà.
3. Server trả `{ playId, outcome: 'win' | 'lose' | 'no_turns' | 'closed', reason, prize, voucher: { code, expiresAt }, turnsLeftToday }`. Hết quà là `lose` (lý do nội bộ `out_of_stock`). Client **chỉ animate** tới kết quả đã biết (vòng quay chọn một ô khớp giải server trả về).
4. Màn Trúng hoặc Không trúng; hết lượt/ngoài giờ là thông báo (BLD-07); "Quà của tôi" liệt kê quà và mã.
5. **Cảm giác trúng (GAM-05, M2):** haptic, âm thanh, confetti; tải trước asset game khi ở Bìa. Chế độ kiosk tại quầy (GAM-03): M3.

**Không hỗ trợ:** định trước người trúng; client gửi kết quả.

### 3.1 `spin-wheel`

- **Cấu hình:** M1 tự dựng ô từ danh sách giải (tối thiểu 6, xen kẽ ô giải và ô "chúc may mắn", `packages/ui/src/campaign/wheel-math.ts`); cấu hình 4–12 ô, nhãn/màu/ảnh từng ô, thời lượng 3–8 s sẽ mở ở M2 (BLD-02).
- **Map kết quả → ô:** server chọn giải trước; client chọn một ô khớp giải đó để dừng (ô "chúc may mắn" khi trượt/hết quà).
- **Skin:** Tết, quanh năm, khai trương; màu theo brand kit.

### 3.2 `scratch-card`

- **Cấu hình:** M1 cố định ngưỡng cào lộ ≥ 45% (`REVEAL_THRESHOLD = 0.45`) thì hiện kết quả, kèm nút hiện kết quả cho người dùng bàn phím/công tắc; cấu hình ảnh lớp phủ và ngưỡng lộ mở ở M2 (BLD-02).
- Kết quả đã quyết định và lượt đã tính trước khi cào; xem trước bằng devtools không đổi được gì.

### 3.3 `gift-box`

- **Cấu hình:** M1 có 3 hộp (số hộp 1/9 mở ở M2, BLD-02), hiệu ứng mở, ảnh hộp/trứng/bao lì xì theo skin.
- Kết quả do server quyết định trước khi khách chọn hộp; thể lệ ghi rõ điều này. Hộp còn lại **không** lật ra "giải lẽ ra trúng".

### 3.4 `catch-items` (M2, dời từ M1 — GAM-02)

- **Cơ chế:** 20–60 s hứng vật phẩm rơi, tránh vật phẩm xấu; điểm theo vật phẩm. Vật phẩm là **ảnh sản phẩm của quán**.
- **Server:** cấp `playId` + `seed` lúc bắt đầu (lượt tính ngay); nhận `{ score, durationMs, telemetry }` lúc kết thúc; kiểm plausibility (điểm tối đa theo seed và thời lượng thật theo server). Đạt `score_threshold` thì xét giải qua prize engine.

---

## 4. Hợp đồng mẫu (tóm tắt)

Mỗi mẫu là một thư mục `packages/templates/src/<key>/` gồm `definition.ts` (server-safe: schema, ô, skin, server module) và `player.tsx` (client) ([ADR-012 §2–3](../../adr/012-campaign-architecture.md)).

```ts
export default defineTemplate({
  key: 'spin-wheel',
  version: '1.0.0',
  kind: 'instant',
  meta: { name: { vi: 'Vòng quay may mắn', en: 'Spin the Wheel' }, tags: ['tet', 'fnb'] },
  configSchema,              // zod; validate server và sinh form
  defaultConfig,
  assetSlots,                // ô asset có ràng buộc
  skins,                     // màn mặc định (ScreenDoc) theo skin
  server: { present },       // instant: outcome → dữ liệu hiển thị
});
```

Interface đầy đủ: [architecture §5](../../engineering/architecture.md).

## 5. Quy trình làm mẫu mới

1. **Spec một trang:** cơ chế, engine, cấu hình, luồng server, chống gian lận, ô asset, playbook nào dùng.
2. Scaffold: `bun run gen:template <key>` (BLD-24; tới khi có lệnh này thì copy `spin-wheel`).
3. `configSchema` + `defaultConfig` → `player.tsx` (chỉ vẽ trong `gameStage`) → server module → màn mặc định cho 2 skin.
4. Test: unit cho server module; preview trong builder; load test k6 cho play API nếu là engine mới.
5. QA thiết bị thật: iPhone SE/12, Android tầm thấp, trình duyệt trong Zalo.
6. Hiệu năng: bundle ≤ 300 KB gzip mỗi mẫu (chưa tính asset); ≥ 30 fps trên máy cũ (mục tiêu 60 fps).
