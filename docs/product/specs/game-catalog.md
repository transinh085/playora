# Danh mục game

Cập nhật: 26/10/2026 · Owner: PO · PRD: GAM-* ([prd §5.6](../prd.md#56-game-gam)) · Liên quan: [builder §2](./builder.md#2-mô-hình-khái-niệm), [prizes-redemption](./prizes-redemption.md), [architecture §5](../../engineering/architecture.md)

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
| `spin-wheel` | Vòng quay may mắn | instant | **M1** | S | 4–12 ô; ô gắn giải hoặc "chúc may mắn". Có trong `packages/templates` |
| `scratch-card` | Cào thẻ | instant | **M1** | S | Lộ ≥ 60% thì hiện kết quả. Có trong Builder Lab |
| `gift-box` | Mở hộp quà | instant | **M1** | S | Biến thể skin: hộp quà, đập trứng vàng, lì xì, lưới 9 ô. Có trong Builder Lab |
| `catch-items` | Hứng quà | skill | M1 (cắt sang M2 nếu trễ) | M | PixiJS; `score_threshold` → một lượt xét giải |
| `memory-match` | Lật cặp | skill | M2 | S | Ảnh sản phẩm của quán làm thẻ |
| `whack-a-mole` | Đập logo | skill | M2 | M | |
| `puzzle` | Ghép hình | skill | M2 | M | Ghép ảnh sản phẩm |
| `red-envelope` | Lì xì rơi | skill | M2 | M | Kịp Tết 2028 bằng skin |
| `slot-machine`, `gacha` | Máy xèng, gacha | instant | M2 | S | Skin/renderer của instant-win |
| `daily-checkin` | Điểm danh | giữ chân | M2 | M | |
| `collect-cards` | Sưu tầm thẻ | giữ chân | M3 | M | Không có cơ chế xin thẻ từ bạn |

**Độ khó:** S ≈ 3–5 ngày, M ≈ 1,5–2 tuần với một người (gồm schema, màn mặc định, 2 skin, test).

**Đã bỏ:** quiz, poll (D-01); mọi game live/LED (D-02): `shake-race`, `tap-race`, `tug-of-war`, `checkin-wall`, `money-count`… Code ở tag `archive/live-engine`.

**Kho mẫu = mẫu × skin.** Mục tiêu: pilot Tết 3 mẫu × 2–3 skin; M2 8 mẫu × 8 bộ theo dịp; M4 trên 200 tổ hợp.

---

## 3. Đặc tả mẫu M1

### 3.0 Luồng chung cho instant-win

1. Shell Play chạy Bìa → Form/consent (nếu bật) → màn Game ([builder §3.1](./builder.md#31-luồng-người-chơi)).
2. Người chơi bấm chơi → `POST /p/{slug}/games/{gameId}/plays` (kèm `deviceId`, Turnstile theo mức chống gian lận). Server kiểm điều kiện, gọi prize engine trong một giao dịch, trừ kho nguyên tử, cấp mã đổi quà.
3. Server trả `{ playId, outcome: { kind: 'win' | 'lose' | 'out_of_stock', prize?, voucherCode? }, display }`. Client **chỉ animate** tới kết quả đã biết (vòng quay dừng ở `display.slotIndex`).
4. Màn Kết quả theo biến thể; "Quà của tôi" liệt kê quà và mã.

**Không hỗ trợ:** định trước người trúng; client gửi kết quả.

### 3.1 `spin-wheel`

- **Cấu hình:** 4–12 ô (nhãn, màu, ảnh, giải hoặc "không trúng"); số vòng tối thiểu, thời lượng 3–8 s; âm thanh.
- **Map kết quả → ô:** server chọn giải trước, rồi chọn ngẫu nhiên một ô gắn giải đó (ô "không trúng" khi trượt/hết quà). Giải không có ô nào thì chặn phát hành.
- **Skin:** Tết, quanh năm, khai trương; màu theo brand kit.

### 3.2 `scratch-card`

- **Cấu hình:** ảnh lớp phủ, ảnh theo kết quả, tỷ lệ lộ để hiện kết quả (mặc định 60%), chữ hướng dẫn.
- Kết quả đã quyết định và lượt đã tính trước khi cào; xem trước bằng devtools không đổi được gì.

### 3.3 `gift-box`

- **Cấu hình:** số hộp (1, 3, 9), hiệu ứng mở, ảnh hộp/trứng/bao lì xì theo skin.
- Kết quả do server quyết định trước khi khách chọn hộp; thể lệ ghi rõ điều này. Hộp còn lại **không** lật ra "giải lẽ ra trúng".

### 3.4 `catch-items`

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
6. Hiệu năng: bundle ≤ 300 KB gzip mỗi mẫu (chưa tính asset); 60 fps.
