# Thuật ngữ

Cập nhật: 26/10/2026 · Owner: PO

Một khái niệm, một tên. Cột "Trong code" là tên dùng trong DB, API và TypeScript; UI luôn dùng cột "Tên trên UI".

| Tên trên UI (vi) | UI (en) | Trong code | Định nghĩa |
|---|---|---|---|
| Tổ chức | Organization | `organization` | Tenant: một quán, chuỗi quán hoặc agency. Mọi dữ liệu nghiệp vụ thuộc một tổ chức |
| Thành viên | Member | `member` | Người dùng trong tổ chức, có vai trò `owner / admin / editor / operator / viewer` và vai trò "chỉ đổi quà" (M1) |
| Chương trình | Campaign | `events` (DB, API) | Một chương trình khuyến mại có game: mẫu, skin, màn, giải, luật, lịch. **M1: mỗi chương trình một game** ([ADR-012](../adr/012-campaign-architecture.md), [ADR-015](../adr/015-campaign-persistence.md)) |
| Playbook | Playbook | `playbook` (dự kiến) | Gói dựng sẵn theo **mục tiêu** của quán (kéo khách ngày vắng, khách quay lại lần 2…): chọn sẵn mẫu, luật, gợi ý quà và chỉ số theo dõi ([specs/playbooks](./specs/playbooks.md)) |
| Mẫu | Template | `template` | Một renderer (cơ chế hiển thị) trên một engine, có `configSchema`, ô asset, màn mặc định |
| Engine | Engine | `kind: instant / skill` | Logic server dùng chung cho nhiều mẫu: instant-win, skill + điểm, giữ chân |
| Skin | Skin | `skin` | Bộ hình và màu theo chủ đề cho một mẫu (Tết, quanh năm, khai trương…) |
| Bộ theo dịp | Theme pack | — | Nhiều skin cùng chủ đề cho mọi mẫu |
| Brand kit | Brand kit | `brand_kits` | Logo, màu, font của tổ chức; áp cho mọi chương trình |
| Màn | Screen | `ScreenDoc` | Một trang người chơi thấy: Bìa, Form, Thể lệ, Game, Kết quả, Chi tiết quà |
| Ô thay thế | Slot | `slot` | Phần tử trên màn được đánh dấu để thay nội dung nhanh (logo, ảnh sản phẩm, chữ khuyến mãi, ảnh quà) |
| Sửa nhanh / Tuỳ biến / Luật & giải | Quick edit / Customize / Rules & prizes | — | Ba chế độ của builder ([specs/builder §4](./specs/builder.md)) |
| Phát hành | Publish | `game_versions` | Tạo phiên bản bất biến; người chơi luôn chơi phiên bản đã phát hành |
| Kiểm tra trước khi phát hành | Pre-flight | — | Danh sách lỗi/cảnh báo chặn hoặc nhắc trước khi phát hành, có nút sửa một chạm |
| Chơi thử | Rehearsal | `env = rehearsal` | Chơi bằng link nháp, không trừ kho thật |
| Giải / Quà | Prize | `prizes` | Một loại quà: tên, ảnh, loại, số lượng, giá trị |
| Lần trúng | Award | `awards` | Một người chơi trúng một giải; có trạng thái `issued → redeemed / void` |
| Mã đổi quà | Voucher code | `voucher_codes` | Mã người chơi đưa nhân viên để đổi quà |
| Đổi quà | Redeem | `redeem` | Nhân viên xác nhận đã trao quà; **không hoàn tác** |
| Lượt ghé quán đã xác thực | Verified visit | (= award `redeemed` tại quầy) | Đơn vị của North Star |
| Lượt chơi | Play | `plays` | Một lần chơi đã qua kiểm tra điều kiện và chống gian lận |
| Người chơi | Player | `players` | Khách chơi game, định danh ẩn danh/SĐT/Zalo theo cấu hình |
| Cách phát giải | Prize mode | `per_prize_probability`, `overall_win_rate`, `guaranteed`, `score_threshold`… | Cách prize engine chọn kết quả ([specs/prizes-redemption §2](./specs/prizes-redemption.md)) |
| Rải quà | Pacing | `time_uniform`, `opening_hours`… | Phân phối quà theo thời gian để không hết sớm |
| Mô phỏng phát giải | Prize simulator | `simulate()` | Chạy thử N lượt để xem quà còn lại theo thời gian |
| Kênh | Channel | `?ch=` | Nguồn khách (QR bàn, fanpage, Zalo OA) để thống kê |
| Bốc thăm cuối chương trình | End draw | `draws` | Chọn người trúng từ tập người chơi đã chốt, có commit–reveal (M2) |
| Tặng quà theo danh sách | Gift list | — | Trao quà không ngẫu nhiên, ghi rõ là quà tặng (không dùng hiệu ứng quay) |
| Quầy đổi quà | Redeem desk | `/redeem` | Màn của nhân viên quầy để quét/nhập mã |

**Nhãn trong tài liệu:** `[GĐ]` = số giả định, cần kiểm chứng · `[CXM]` = chưa xác minh · M0–M4 = giai đoạn ở [roadmap](./roadmap.md) · ID dạng `BLD-01` = yêu cầu trong [prd.md](./prd.md) · `D-xx` = [quyết định sản phẩm](./decisions.md) · `ADR-xxx` = [quyết định kiến trúc](../adr/README.md).
