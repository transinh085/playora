# 15 — Kế hoạch đưa Game Builder lên mức vượt trội

**Trạng thái:** Đề xuất · 25/10/2026 · Đầu vào: kiểm kê code, nghiên cứu đối thủ (CN/VN/quốc tế), nghiên cứu UX editor và công nghệ canvas · Liên quan: [00](./00-product-strategy.md), [12](./12-builder-spec.md), [14](./14-guandayun-teardown.md), [ADR-012](./adr/012-campaign-architecture.md), [ADR-014](./adr/014-free-canvas-screen-editor.md)

---

## 0. Tóm tắt

1. **Hiện trạng: builder mới là vòng khép kín trong Studio.** Soạn → xem thử → publish chạy được, nhưng **người chơi chưa chơi được game nào**: chưa có API lượt chơi, prize engine (đã viết, có test) chưa được gọi, Play dừng ở phòng chờ. Chỉ có 1/10 template, skin chưa có hình. Mọi cải tiến builder đều vô nghĩa nếu chưa có vòng lõi này.
2. **Khoảng trống thị trường có thật:** không sản phẩm nào có đủ ba thứ **soạn dễ + prize engine thật + đổi quà tại quầy**. 易企秀/MAKA sửa trên điện thoại nhưng chỉ là trang H5 gắn thêm bốc thăm; 凡科/Drimify/Qualifio có engine nhưng soạn trên PC bằng form; WOAY chỉ đổi màu, logo, ảnh quà. AI ở mọi nơi đều nông và **không ai dùng AI để cấu hình giải một cách an toàn bằng tiếng Việt**.
3. **Công thức đề xuất — "Template trước, ô thay thế, canvas khi cần, AI dựng nháp, server giữ giải":**
   - **Sửa nhanh** (mô hình CapCut): template đánh dấu sẵn các ô thay thế (logo, ảnh sản phẩm, chữ khuyến mãi, ảnh quà). Chủ quán chỉ thay nội dung, bố cục luôn đẹp. Làm được trên điện thoại.
   - **Tuỳ biến** (canvas ADR-014, desktop): kéo thả tự do cho ai muốn, với khoá 2 mức, neo dọc, chữ tự giãn, cảnh báo sửa-bằng-một-chạm.
   - **Luật & giải** dạng câu dễ hiểu, chọn cách phát giải trước, có mô phỏng.
   - **AI** dựng bản nháp từ một câu tiếng Việt hoặc link fanpage; AI không bao giờ quyết định kết quả.
4. **Thứ tự:** vòng lõi chơi được (4 tuần) → nền canvas + sửa nhanh (4 tuần) → kho mẫu + an toàn publish (4 tuần) → pilot Tết → AI & ảnh (M2) → canvas nâng cao (M2–M3).
5. **Cần bạn chốt 5 quyết định** ở §8, quan trọng nhất là chấp nhận ADR-014 kèm 6 sửa đổi, và Studio desktop-first hay mobile-first.

---

## 1. Hiện trạng (kiểm kê code 25/10/2026)

| Mảng | Trạng thái | Ghi chú |
|---|---|---|
| Template model, schema → form | ✅ | `defineTemplate`, `describeConfigSchema`, `AutoForm`; JSON Schema xuất được (tốt cho AI) |
| Preview | ✅ | iframe Play + `postMessage`, kết quả giả lập thắng/thua/hết quà |
| Publish, phiên bản bất biến | ✅ | `games.service.ts` khoá, hash, ghi `game_versions` + audit |
| Lưu nháp | ⚠️ | Lưu tay, không autosave, không undo |
| Hot edit | ⚠️ | Ghi `hotConfig` không audit; lúc chơi không đọc tới |
| Skin, brand kit | ⚠️ | 2 skin không có asset; thumbnail template không tồn tại |
| **Lượt chơi / runtime Play** | ❌ | Không có endpoint `plays`; `/[slug]` dừng ở lobby |
| **Prize engine** | ❌ (chưa nối) | `packages/core/src/prize` có 3 mode, pacing, giới hạn, ngân sách, test; **không app nào import** |
| Giải thưởng UI/API, voucher, đổi quà | ❌ | Tab Giải thưởng là placeholder; bảng `awards` có nhưng không dùng |
| Màn Game / Kết quả / Quà của tôi | ❌ | |
| Pre-flight, link nháp, bot | ❌ | Publish là hộp xác nhận trơn |
| Kênh, link theo game | ❌ | Chỉ có QR tham gia sự kiện |
| Mobile editor | ❌ | Lưới chỉ xếp chồng dưới `lg` |
| Template | 1/10 | Chỉ `spin-wheel`; thêm template phải đăng ký tay ở 3 chỗ; không có scaffold |
| Canvas (ADR-014) | 🧪 | Prototype cục bộ ở `/labs/canvas`; `SpinWheelPlayer` vẽ cả màn (tiêu đề, CTA) nên phải tách thành cơ chế thuần |

**10 điểm yếu lớn nhất** với mục tiêu "chủ quán publish game mang thương hiệu trong ≤ 5 phút": (1) chưa chơi được; (2) prize engine chưa nối, không có giải/voucher/đổi quà; (3) không có cách sửa trên điện thoại; (4) không có đường ảnh chụp → asset (xoá nền, cắt); (5) 1 template, skin không có hình; (6) không có link/QR theo game sau publish; (7) không có pre-flight; (8) player vẽ cả màn, chặn canvas; (9) lưu tay, không undo; (10) đăng ký template thủ công 3 nơi.

---

## 2. Thị trường

### 2.1 So sánh

| Sản phẩm | Cách soạn | Sửa trên ĐT | AI | Prize engine thật | Điểm đáng học |
|---|---|---|---|---|---|
| 凡科互动 | Form chia tab + simulator | Không | Không thấy | Có | Ít engine, rất nhiều skin |
| 易企秀 | Canvas theo trang + form | **Có (app)** | Từ khoá → bản nháp [CXM] | Gắn thêm | Soạn trên điện thoại ở quy mô lớn |
| 人人秀 | Canvas + module | Một phần | Nhãn AI, không rõ | Có (tỉ lệ, giờ quay từng giải) | |
| MAKA | Canvas thiết kế | Có | Không | Gắn thêm (trả phí) | Mẫu đẹp |
| WOAY (VN) | Form: màu, logo, ảnh quà | [CXM] | Không | Có | Giá theo ngày, OTP ZNS |
| Vòng quay miễn phí (VN) | 1 màn | Có | AI sinh danh sách ô | Không | Miễn phí, tức thì |
| Drimify | Các bước theo màn, giống nhau mọi engine | Không | Không | Có | Checklist trước khi launch |
| Qualifio | Form + mẫu | Không | AI quiz; agent bắt lỗi trước publish (beta) | Có | Kiểm tra lỗi trước publish |
| OptiMonk | Kéo thả | Không | **URL web → popup đúng thương hiệu**; sửa bằng chat | Coupon | Lấy brand từ web khách |
| Woobox | Prompt + form | Không | **Prompt → campaign** | Có | 1 engine, 3 giao diện |

Nguồn chi tiết ở §10. Tiếng Trung và tiếng Việt nguồn mỏng; [CXM] = chưa xác minh.

### 2.2 Khoảng trống Playora chiếm được

1. **Ba thứ cùng lúc:** soạn dễ (kể cả trên điện thoại) + prize engine thật + đổi quà tại quầy.
2. **AI cấu hình giải an toàn bằng tiếng Việt.** Woobox cho AI dựng campaign nhưng hướng dẫn "giữ giải lớn bằng cách đặt tỉ lệ ≈ 0 rồi tự tăng" và có "Pick Winners" ngay cả với instant win: **không làm theo**. Playora dùng pacing/ngân sách của prize engine.
3. **Cửa hàng offline:** QR trên bàn/quầy, nhân viên đổi quà, Zalo. Công cụ quốc tế nhắm e-commerce; WOAY không nhắc QR.
4. **Chợ mẫu theo ngành và mùa**, không theo cơ chế (Drimify, Playable, Qualifio đều sắp theo cơ chế).
5. **Báo cáo theo ngôn ngữ chủ quán:** quà đã phát/đã đổi, chi phí so ngân sách, khách quay lại.

---

## 3. Thế nào là "vượt trội" — đo được

| Chỉ số | Hiện tại | Mục tiêu pilot Tết | Mục tiêu M2 |
|---|---|---|---|
| Thời gian từ chọn mẫu → publish (trung vị) | Không đo được (chưa chơi được) | ≤ 10 phút | ≤ 5 phút |
| % campaign tự dựng không cần hỗ trợ | — | ≥ 50% | ≥ 80% |
| % campaign dùng ảnh của chính quán | — | ≥ 60% | ≥ 70% |
| Sai lệch giải (vượt tồn kho/ngân sách/giới hạn) | — | **0** | **0** |
| % game publish không có cảnh báo pre-flight chưa xử lý | — | ≥ 90% | ≥ 95% |
| Số template × skin trong chợ | 1 × 2 | 4 × 3 | 10 × 5 |

---

## 4. Kiến trúc builder đích

```
                    ┌──────────────────── TEMPLATE ────────────────────┐
                    │ cơ chế (renderer trong gameStage) · configSchema  │
                    │ màn mặc định theo skin (ScreenDoc) · ô thay thế   │
                    └───────────────┬──────────────────────────────────┘
                                    ▼
  ┌──── SỬA NHANH ─────┐   ┌──── TUỲ BIẾN (canvas) ────┐   ┌──── LUẬT & GIẢI ──────────┐
  │ danh sách ô thay thế│   │ kéo/đổi cỡ/xoay, lớp,     │   │ chọn cách phát giải trước │
  │ (logo, ảnh SP, chữ, │   │ khoá 2 mức, neo dọc, snap │   │ luật bằng câu dễ hiểu     │
  │ ảnh quà) + đổi skin │   │ (desktop; ĐT: chạm-sửa)   │   │ mô phỏng phát giải        │
  └─────────┬───────────┘   └────────────┬──────────────┘   └────────────┬──────────────┘
            └──────────── cùng một tài liệu GameVersion.config ────────────┘
                                    ▼
             PRE-FLIGHT (sửa một chạm) → PUBLISH (bất biến) → Play: CanvasScreen + cơ chế
                                    ▲
             AI: câu tiếng Việt / link fanpage → bản nháp (config + màn + giải đề xuất)
```

### 4.1 Template thế hệ mới

- **Cơ chế thuần:** renderer chỉ vẽ trong `gameStage`, nhận kích thước khung và tín hiệu "bắt đầu" từ nút canvas. Tách `SpinWheelPlayer` hiện tại (đang vẽ tiêu đề, CTA, chữ kết quả cứng vi/en).
- **Màn mặc định theo skin** là `ScreenDoc` (ADR-014), có **ô thay thế** được đánh dấu (`slot: 'logo' | 'productPhoto' | 'promoText' | 'prizeImage' | …`).
- **Một nơi đăng ký:** thêm template = thêm một thư mục; registry, surfaces, skin UI tự sinh. Có lệnh `bun run gen:template`.

### 4.2 Ba chế độ chỉnh sửa trên cùng một dữ liệu

| Chế độ | Ai dùng | Thiết bị | Nội dung |
|---|---|---|---|
| **Sửa nhanh** (mặc định) | Mọi chủ quán | ĐT + desktop | Danh sách ô thay thế dạng thẻ; chạm để chụp/chọn ảnh, gõ chữ; đổi skin giữ nguyên nội dung; xem trước toàn màn |
| **Tuỳ biến** | Người muốn khác biệt, agency | Desktop (ĐT: chạm chọn, kéo di chuyển, sửa trong bottom sheet) | Canvas ADR-014 đầy đủ |
| **Luật & giải** | Mọi chủ quán | ĐT + desktop | Wizard: cách phát giải → danh sách giải → số lượng → giới hạn; mỗi luật là một câu; mô phỏng "1.000 khách thì phát gì" |

### 4.3 Sửa đổi cần thêm vào ADR-014 (từ nghiên cứu)

1. **Khoá 2 mức** `locked: 'none' | 'position' | 'all'` (Canva): mẫu khoá vị trí ô ảnh/chữ, chỉ cho thay nội dung.
2. **Ô thay thế** `slot?: SlotKey` trên phần tử: nguồn cho chế độ Sửa nhanh và cho AI.
3. **Neo dọc** `anchor: 'top' | 'center' | 'bottom'` + overlay vùng an toàn và đường chia tỉ lệ 16:9 / 19.5:9 / 20:9: CTA bám đáy trên máy dài.
4. **Chữ tự giãn chiều cao** mặc định; tiêu đề và tên quà có "co chữ cho vừa" với cỡ tối thiểu; xem trước với giá trị biến dài nhất.
5. **Chữ đa ngôn ngữ** (`LocalizedText` vi/en) thay cho `string`.
6. **Pre-flight sửa một chạm:** tương phản thấp → đổi sang `brand.text` hoặc thêm bóng; chữ < 12 px → 14 px; nút < 44 px → phóng; phần tử ra ngoài → kéo vào.

### 4.4 AI (không bao giờ quyết định kết quả)

| Mức | Đầu vào | Đầu ra | Ghi chú |
|---|---|---|---|
| **AI-1 Chữ** | Tên quán, ngành, dịp | Tiêu đề, khẩu hiệu, tên ô vòng quay, lời chúc | Rẻ, rủi ro thấp; giới hạn độ dài theo ô |
| **AI-2 Bản nháp từ câu** | "Quán cà phê, Tết, 3 giải, mỗi khách 1 lượt/ngày" | Chọn template + skin, đề xuất giải và luật, điền ô chữ | Xuất JSON theo `toConfigJsonSchema`; validate bằng zod; người dùng duyệt từng mục |
| **AI-3 Brand từ link** | Link fanpage / Zalo OA / web | Logo, màu, ảnh vào brand kit | Theo OptiMonk; cần kiểm tra quyền dùng ảnh |
| **Ảnh** | Ảnh chụp sản phẩm | Xoá nền, cắt theo tỉ lệ ô | Server-side hoặc dịch vụ thương mại; `@imgly/background-removal` có vẻ AGPL, phải kiểm license |

### 4.5 Công nghệ

- **Tiếp tục tự viết editor DOM** (prototype ~2.700 dòng, 0 dependency). Loại Konva/Fabric/Polotno (render bằng `<canvas>`, phá nguyên tắc một renderer cho Play và Studio, Play phải tải engine nặng), tldraw (license trả phí), Craft.js/GrapesJS/Puck (bố cục dòng chảy, không phải canvas tự do).
- `@dnd-kit/react` (MIT, hỗ trợ React 19) cho bảng lớp và danh sách ô; cần nói lý do khi thêm dependency (AGENTS.md).
- Moveable chỉ cân nhắc nếu fork, vì không phát hành từ 12/2023.
- Undo/redo theo lệnh trên tài liệu bất biến → nền cho autosave và phát hiện xung đột phiên bản. Không làm cộng tác realtime.

---

## 5. Lộ trình (một người làm)

Ước lượng theo tuần làm việc của một dev. Tết Đinh Mùi rơi vào 06/02/2027; game pilot phải chạy được trước ~15/01.

### P0 — Vòng lõi chơi được · 26/10 → 22/11 (4 tuần) · **chặn mọi thứ khác**

- Contract + API `plays` (bắt đầu lượt, kết quả do server quyết, idempotent), nối `packages/core/src/prize` (mode, tồn kho, giới hạn, ngân sách, pacing).
- Bảng `plays`, `play_counters`, `voucher_codes`; API + UI giải thưởng (thay placeholder), wizard "cách phát giải trước".
- Play runtime: màn Game → Kết quả (thắng/thua/hết quà/hết lượt) → Quà của tôi; đọc `hotConfig`.
- Đổi quà tại quầy v1: nhân viên quét/nhập mã, vai trò "chỉ đổi quà".
- Link/QR theo game sau publish.
- **Gate:** chơi hết luồng QR → quay → nhận mã → đổi tại quầy; test 1 triệu lượt mô phỏng 0 sai lệch.

### P1 — Nền canvas + sửa nhanh · 23/11 → 20/12 (4 tuần)

- ADR-014 → Accepted kèm 6 sửa đổi (§4.3); `ScreenDoc` thành zod trong `packages/contracts`, nằm trong `GameVersion.config.screens`; migrate config cũ.
- `CanvasScreen` chuyển sang `@playora/ui/game`; Play render màn bằng nó.
- Tách `SpinWheelPlayer` thành cơ chế thuần trong `gameStage`; màn mặc định của skin là `ScreenDoc` có ô thay thế.
- **Sửa nhanh** (danh sách ô) làm màn soạn mặc định; canvas của prototype trở thành chế độ **Tuỳ biến (beta)** trong route toàn màn hình.
- Autosave + undo/redo cho cả builder.
- **Gate:** 5 người không biết thiết kế dựng được game Tết có logo + ảnh sản phẩm trong ≤ 10 phút (đo trên prototype/staging).

### P2 — Kho mẫu + an toàn publish · 21/12 → 17/01 (4 tuần) · **pilot Tết**

- 3 template M1 còn lại: cào thẻ, mở hộp (instant-win), hứng quà (skill) — trên `gen:template` mới.
- Dây chuyền skin: 3 skin/template (Tết, quanh năm, khai trương) có art thật.
- Pre-flight sửa một chạm (giải, tồn kho so lượng khách dự kiến, ngày, tương phản, cỡ chữ, nút).
- Link nháp chơi thử (≤ 20 người, `env=rehearsal`).
- **Gate pilot:** ≥ 10 SME chạy game Tết; 0 sai lệch giải; trung vị publish ≤ 10 phút.

### P3 — AI & ảnh · 02 → 03/2027 (M2)

- Chụp ảnh → xoá nền → cắt theo ô.
- AI-1 chữ, AI-2 bản nháp từ câu, AI-3 brand từ link.
- Chợ mẫu công khai theo ngành × dịp (SEO).

### P4 — Canvas nâng cao + vận hành · 03 → 05/2027 (M2)

- Canvas trên điện thoại (chạm chọn, kéo, bottom sheet, thanh trượt cỡ), nhóm/chọn nhiều.
- UI Prize Simulator; báo cáo theo ngôn ngữ chủ quán; renderer M2 (đập trứng, lật thẻ, lưới 9 ô…).

Song song suốt P0–P2: **phỏng vấn SME (M0)** dùng prototype canvas và màn Sửa nhanh làm vật kiểm chứng giả định A1/A2 ([00 §9](./00-product-strategy.md#9-giả-định-rủi-ro-nhất-và-cách-kiểm-chứng)).

---

## 6. Rào chắn không đổi

- Server quyết định mọi kết quả; AI, canvas, nút đều không có đường gọi tới quyết định giải.
- Không "chọn người thắng", không đặt tỉ lệ ≈ 0 để giữ giải; muốn giữ giải lớn thì dùng pacing/ngân sách.
- Phiên bản đã publish bất biến; hot edit chỉ cho chữ/nhãn, có audit.
- Một renderer cho Play và Studio.

---

## 7. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Làm canvas trước vòng lõi → không có gì để pilot | Cao | P0 chặn mọi thứ; canvas giữ ở beta tới khi lõi chạy |
| Một người làm, 12 tuần tới pilot là sát | Cao | Cắt P2 còn 2 template (cào thẻ, mở hộp) nếu trễ; hứng quà sang M2 |
| Người dùng tự kéo thả ra màn xấu | Trung bình | Sửa nhanh là mặc định; khoá vị trí trong mẫu; pre-flight sửa một chạm |
| Bố cục vỡ trên máy dài/ngắn | Trung bình | Neo dọc, vùng an toàn, đường chia tỉ lệ trong editor |
| Chi phí/license AI và xoá nền | Trung bình | AI-1 trước (rẻ); kiểm license; giới hạn theo gói |
| Hiệu năng Play khi màn nhiều phần tử/ảnh | Thấp–TB | Giới hạn 60 phần tử, nén ảnh khi upload, lazy-load ảnh ngoài màn hiện tại |

---

## 8. Quyết định cần bạn chốt

1. **ADR-014 → Accepted** kèm 6 sửa đổi ở §4.3?
2. **Studio:** desktop-first (theo trao đổi ngày 25/10, chỉ Play là mobile-first) hay mobile-first như docs/00 §6.3 và 12 §4.1b đang ghi? Đề xuất: **Sửa nhanh + Luật & giải chạy tốt trên điện thoại; Tuỳ biến (canvas) desktop-first** — rồi sửa lại 00/12 cho khớp.
3. **Thứ tự P0 trước canvas** (đề xuất) — đồng ý?
4. **AI:** nhà cung cấp và trần chi phí mỗi campaign; AI có trong gói Free không?
5. **Xoá nền ảnh:** dịch vụ trả phí theo lượt hay tự host model (kiểm license)?

---

## 9. Việc dọn tài liệu sau khi chốt

- 00 §5/§6.3 và 12 §4.1b: thống nhất Studio desktop/mobile theo quyết định 2.
- 12 §4: thay bố cục bằng "ba chế độ chỉnh sửa" (§4.2) và trỏ ADR-014.
- 04 §5: cập nhật quy trình thêm template (`gen:template`, màn mặc định, ô thay thế).
- prd.md: thêm ID cho Sửa nhanh, Tuỳ biến, pre-flight sửa một chạm, AI-1/2/3.

---

## 10. Nguồn

**Đối thủ:** 易企秀 [App Store](https://apps.apple.com/cn/app/%E6%98%93%E4%BC%81%E7%A7%80-h5%E6%B5%B7%E6%8A%A5%E9%82%80%E8%AF%B7%E5%87%BD%E5%92%8C%E8%A7%86%E9%A2%91%E6%A8%A1%E6%9D%BF%E5%88%B6%E4%BD%9C/id933128780), [eqxiu.com](https://www.eqxiu.com), [aitoollab](https://www.aitoollab.cn/tools/eqxiu/) · 人人秀 [rrx.cn](https://www.rrx.cn), [Zhihu](https://zhuanlan.zhihu.com/p/617341816) · MAKA [ifanr](https://www.ifanr.com/app/576339) · WOAY [woay.vn](https://woay.vn), [bảng giá](https://woay.vn/bang-gia) · [vongquaymayman.icu](https://vongquaymayman.icu/) · Zalo/MISA [misaeshop](https://www.misaeshop.vn/?p=9248) · Drimify [help](https://help.drimify.com/en/article/jzuouc/) · Qualifio [qualifio.com](https://qualifio.com/), [G2](https://www.g2.com/products/qualifio/reviews) · Playable [playable.com](https://playable.com/gamification-platform/) · OptiMonk [so sánh](https://www.optimonk.com/optimonk-vs-wheelio) · Woobox [help AI builder](https://help.woobox.com/articles/creating-a-spin-the-wheel-campaign-with-the-ai-site-builder/) · ShortStack [so sánh](https://www.shortstack.com/compare/woobox/) · Genially [Capterra](https://www.capterra.com/p/10046302/Genially/) · 凡科: [14](./14-guandayun-teardown.md).

**UX editor:** Canva [brand template locks](https://www.canva.com/help/brand-template-locks/), [mobile app](https://www.canva.com/help/navigate-canva-mobile-app/), [Magic Design](https://www.canva.com/magic-design/), [brand voice](https://www.canva.com/help/brand-voice/) · CapCut [replaceable clips](https://www.capcut.com/help/how-to-set-replaceable-material-clips) · Shopify [blocks](https://shopify.dev/docs/storefronts/themes/architecture/blocks) · Framer [absolute positioning](https://framer.university/blog/why-framer-experts-avoid-using-absolute-positioning) · Gamma [smart layouts](https://gamma.app/explore/content/guides/create-professionally-designed-slides-without-manual-formatting) · H5 co giãn [cnblogs](https://www.cnblogs.com/xwwin/p/5778380.html), [juejin](https://juejin.cn/post/6844903576658001933) · MDN [text-fit](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-fit).

**Công nghệ** (npm registry, kiểm 25/10/2026): moveable 0.56.0 (MIT, 12/2023) · @dnd-kit/react 0.5.1 (MIT) · react-konva 19.3.2 · fabric 7.4.0 · tldraw 5.5.2 ([pricing](https://tldraw.dev/pricing)) · Polotno 4.18.0 ([pricing](https://polotno.com/ai-info-page)) · @craftjs/core 0.2.12 · GrapesJS 0.23.8 · @puckeditor/core 0.23.0 · [@imgly/background-removal](https://unpkg.com/@imgly/background-removal@1.5.8/README.md).

**Kiểm kê code:** `packages/game-sdk/src/define.ts`, `packages/templates/src/{registry,surfaces}.ts`, `packages/templates/src/spin-wheel/{definition,player}`, `apps/studio/src/features/games/**`, `apps/play/src/app/preview/page.tsx`, `apps/api/src/modules/games/games.service.ts`, `packages/core/src/prize/{decide,simulate}.ts`, `packages/contracts/src/api/public.ts`, `apps/studio/src/features/canvas-editor/**`.

---

## 11. Builder Lab — prototype frontend với backend giả (25/10/2026)

Để hình dung sản phẩm trước khi có API, toàn bộ luồng đã dựng trong Studio ở chế độ toàn màn hình (sidebar **Thử nghiệm → Game builder (lab)**):

| Route | Nội dung |
|---|---|
| `/orgs/:orgId/labs/builder` | Chợ mẫu (3 template × 3 skin, lọc theo dịp) + danh sách campaign |
| `/orgs/:orgId/labs/builder/:id` | Editor 3 chế độ: **Sửa nhanh** (ô thay thế, đổi skin, màu brand), **Tuỳ biến** (canvas ADR-014), **Luật & giải** (cách phát giải → quà → luật dạng câu → mô phỏng); tự lưu; pre-flight sửa một chạm; publish + QR |
| `/orgs/:orgId/labs/play/:id[?rehearsal=1]` | Người chơi trong khung điện thoại: bìa → form → game (vòng quay / cào / mở hộp) → kết quả + mã đổi quà → Quà của tôi |
| `/orgs/:orgId/labs/redeem[?code=]` | Quầy đổi quà cho nhân viên (đổi một lần, không hoàn tác) |

**Phần giả:** chỉ lưu trữ (`apps/studio/src/features/builder-lab/mock/db.ts`, localStorage, đồng bộ giữa các tab). **Phần thật:** quyết định giải chạy `decide()` / `simulate()` của `@playora/core/prize`; client không bao giờ tự chọn kết quả.

**Thay bằng API thật:** `mock/api.ts` có cùng hình dạng với các endpoint P0 (§5) — `createCampaign`, `updateCampaign`, `publishCampaign`, `startPlay`, `listMyVouchers`, `lookupVoucher`, `redeemVoucher`, `getCampaignStats`. Khi contract và API xong, chỉ cần đổi `mock/hooks.ts` sang `useRouteQuery` / `useRouteMutation`; UI giữ nguyên. Kiểu dữ liệu trong `mock/types.ts` là bản nháp cho `packages/contracts`.

Kiểm thử: unit test cho mock API, pre-flight, luật, mô phỏng, cơ chế game; e2e `tooling/e2e/tests/builder-lab.spec.ts` (tạo → luật → publish → chơi trên điện thoại → đổi quà).
