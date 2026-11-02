# ADR-019: Tích hợp PixiJS v8 cho Mẫu Game 2D Kỹ Năng (Skill Templates)

| | |
|---|---|
| **Trạng thái** | Proposed |
| **Ngày** | 02/11/2026 |
| **Người quyết định** | Tech Lead, PO |
| **Thay thế / Liên quan** | [ADR-012](./012-campaign-architecture.md), [ADR-014](./014-free-canvas-screen-editor.md), [ADR-018](./018-runner-2d.md) (Second Brain), [Nghiên cứu PixiJS](../research/pixijs-game-engine-evaluation.md) |

## Bối cảnh

Hệ thống minigame Playora mở rộng từ các cơ chế instant-win thuần túy (vòng quay `spin-wheel`, cào thẻ `scratch-card`, mở hộp `gift-box`) sang các game kỹ năng 2D tương tác (hứng quà `catch-items`, đập chuột `whack-a-mole`, chạy nhảy `runner-2d`).

Vấn đề đặt ra:
1. Nếu tự build canvas 2D context từ đầu cho từng game, ta sẽ phải liên tục tự code lại math va chạm, sprite management, particle, texture caching, dẫn đến rò rỉ bộ nhớ và tụt FPS trên thiết bị di động tầm trung/yếu (Zalo/FB in-app webview).
2. Nếu dùng full game engine (Phaser, Cocos), bundle size sẽ vượt quá 1.5MB+, gây trễ tải trang nghiêm trọng cho khách quét QR 4G tại quán.
3. Nếu hardcode PixiJS vào lõi nền tảng (`@playora/game-sdk`, `@playora/ui`), mọi người chơi (kể cả chỉ chơi vòng quay) đều bị ép tải thư viện đồ họa nặng.
4. Game 2D cần hỗ trợ đa dạng Skin theo mùa (Tết, Giáng sinh...) mà không được hardcode đường dẫn ảnh trong logic game.

## Quyết định

1. **Chọn PixiJS v8** làm công nghệ render 2D chuyên trách cho các **Skill Templates** (`kind: 'skill'`). Không sử dụng cho các minigame instant-win M1.
2. **Cô lập phụ thuộc (Package Boundary):** `pixi.js` chỉ được cài đặt trong `packages/templates` (hoặc package template riêng), tuyệt đối không xuất hiện trong `@playora/game-sdk`, `@playora/contracts`, `@playora/ui`, `@playora/core`.
3. **Nạp động (Dynamic Import):** Mọi component sử dụng PixiJS phải được nạp qua `React.lazy()` tại `packages/templates/src/surfaces.ts`.
4. **Hợp đồng Tài nguyên (Asset Slots Contract):** Toàn bộ texture và sprite trong PixiJS bắt buộc truy xuất thông qua `AssetResolver` của template definition (`player_catcher`, `item_positive`, `item_negative`, `game_background`). Cấm load URL tĩnh trong code logic.
5. **Vòng đời an toàn trong React 19:** Khởi tạo PixiJS `Application` bất đồng bộ (`await app.init()`) phải đi kèm cờ hủy `isCancelled` để xử lý StrictMode remount, và bắt buộc gọi `app.destroy(true, { children: true, texture: true, context: true })` khi component unmount để tránh rò rỉ WebGL context (giới hạn 8–16 context trên mobile webview).
6. **Xác thực Server-Authoritative:** Server (`SkillServerModule.validate`) kiểm tra thời gian thực với đồng hồ server và đối chiếu trần điểm lý thuyết tối đa trước khi gọi Prize Engine.

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược | Vì sao không chọn |
|---|---|---|---|
| **Tự viết HTML5 Canvas 2D thuần** | 0 KB phụ thuộc ngoài. | Tốn công duy trì, tự viết lại math va chạm và sprite loop, không tận dụng được WebGL batching. | Tốn công sức khi phát triển từ 3-5 game kỹ năng trở lên. |
| **Phaser 3 / Cocos Creator** | Đầy đủ physics, scene manager. | Quá nặng (>1.2MB gzip), cấu trúc scene tách rời khó đồng bộ với React state. | Quá cồng kềnh cho minigame marketing F&B 30 giây. |
| **PixiJS v8 (Được chọn)** | Siêu nhanh, WebGL/WebGPU batching, chỉ nặng ~130-160KB gzip khi tối ưu subpath, scene graph linh hoạt. | Cần quản lý vòng đời WebGL context cẩn thận trong React. | Đáp ứng hoàn hảo bài toán hiệu năng và tính mở rộng. |

## Hệ quả

- **Tốt:** Các minigame 2D đạt 60 FPS mượt mà; thay skin theo mùa dễ dàng bằng cách đổi asset slot; kiến trúc template registry mở rộng vô hạn mà không sửa core.
- **Chi phí:** Tăng thêm ~150KB cho gói tải về của riêng các game skill 2D.
- **Rủi ro & Giảm thiểu:** Rò rỉ context WebGL trên Zalo in-app browser $\rightarrow$ Giảm thiểu bằng cơ chế dọn dẹp triệt để `app.destroy(true)` trong hook `useEffect`.

## Kiểm chứng

- `bun run typecheck` và `bun test packages/templates` vượt qua 100%.
- Studio Preview tải được `catch-items` qua dynamic import, chuyển đổi giữa chế độ Idle và Chơi thử Rehearsal thành công.
