# Thuật ngữ

Cập nhật: 31/10/2026 · Owner: PO

Một khái niệm, một tên. Cột "Trong code" là tên dùng trong DB, API và TypeScript; UI luôn dùng cột "Tên trên UI".

| Tên trên UI (vi) | UI (en) | Trong code | Định nghĩa |
|---|---|---|---|
| Tổ chức | Organization | `organization` | Tenant: một quán, chuỗi quán hoặc agency. Mọi dữ liệu nghiệp vụ thuộc một tổ chức |
| Thành viên | Member | `member` | Người dùng trong tổ chức, có vai trò `owner / admin / editor / operator / viewer` và vai trò "chỉ đổi quà" (`redeemer`, M1); vai trò quản lý cửa hàng (ORG-12) từ M2 |
| Chương trình | Campaign | `events` + `games` + `game_versions` (DB), `campaigns` (API, contract) | Một chương trình khuyến mại có game: mẫu, skin, màn, giải, luật, lịch. **M1: mỗi chương trình một game** ([ADR-012](../adr/012-campaign-architecture.md), [ADR-015](../adr/015-campaign-persistence.md)). Không dùng "Sự kiện" hay "Campaign" trên UI tiếng Việt |
| Playbook | Playbook | `playbook` (dự kiến) | Gói dựng sẵn theo **mục tiêu** của quán (kéo khách ngày vắng, khách quay lại lần 2…): chọn sẵn mẫu, luật, gợi ý quà và chỉ số theo dõi ([specs/playbooks](./specs/playbooks.md)) |
| Mẫu | Template | `template` | Một renderer (cơ chế hiển thị) trên một engine, có `configSchema`, ô asset, màn mặc định |
| Engine | Engine | `kind: instant / skill` | Logic server dùng chung cho nhiều mẫu: instant-win, skill + điểm, giữ chân |
| Skin | Skin | `skin` | Bộ hình và màu theo chủ đề cho một mẫu (Tết, quanh năm, khai trương…) |
| Bộ theo dịp | Theme pack | — | Nhiều skin cùng chủ đề cho mọi mẫu |
| Brand kit | Brand kit | `brand_kits` | Logo, màu, font của tổ chức; áp cho mọi chương trình |
| Màn | Screen | `ScreenDoc` (`cover`, `form`, `game`, `resultWin`, `resultLose`) | Một trang canvas người chơi thấy: Bìa, Form, Game, Trúng, Không trúng (dùng cho cả hết quà) (BLD-07). Thể lệ, Quà của tôi và thông báo hết lượt / ngoài giờ / chưa mở / đã kết thúc thuộc shell Play, không phải màn canvas |
| Ô thay thế | Slot | `slot` | Phần tử trên màn được đánh dấu để thay nội dung nhanh (logo, ảnh sản phẩm, chữ khuyến mãi, ảnh quà) |
| Sửa nhanh / Tuỳ biến / Luật & giải | Quick edit / Customize / Rules & prizes | — | Ba chế độ của builder ([specs/builder §4](./specs/builder.md)) |
| Phát hành | Publish | `game_versions` | Tạo phiên bản bất biến; người chơi luôn chơi phiên bản đã phát hành |
| Kiểm tra trước khi phát hành | Pre-flight | — | Danh sách lỗi/cảnh báo chặn hoặc nhắc trước khi phát hành, có nút sửa một chạm |
| Chơi thử | Rehearsal | `data_env = 'rehearsal'`, `rehearsal-plays`, `?rehearsal=1` | Thành viên đã đăng nhập chạy đủ flow Player trên bản nháp ngay trong Studio; không trừ kho thật, không vào báo cáo và hạn mức (BLD-23) |
| Link nháp công khai | Public draft link | — (chưa có) | Link chơi thử bản nháp cho ≤ 20 người ngoài tổ chức, kèm QR mở trên điện thoại; M1 Should (BLD-23, BLD-26) |
| Giải / Quà | Prize | `prizes` (tồn kho: `issued`, `remaining`) | Một loại quà: tên, ảnh, số lượng, **giá vốn** (`valueVnd`). M1 chỉ có một loại: quà đổi tại quầy; "không trúng" là kết quả, không phải giải (PRZ-01) |
| Lần trúng | Award | `awards` | Một người chơi trúng một giải; có trạng thái `issued → redeemed / expired / void` |
| Mã đổi quà | Voucher code | `awards.redeemCode` (API: `vouchers`) | Mã 6 ký tự + QR người chơi đưa nhân viên; hạn đổi = ngày kết thúc chương trình + 7 ngày (cố định ở M1) |
| Đổi quà | Redeem | `redeem` | Nhân viên xác nhận đã trao quà; **không hoàn tác** |
| Lượt ghé quán đã xác thực | Verified visit | (= award `redeemed` tại quầy) | Đơn vị của North Star. Từ M2 (PLB-09) gồm cả lượt nhân viên quét thẻ thành viên (RET-08) |
| Lượt chơi | Play | `plays` | Một lần chơi đã qua kiểm tra điều kiện và chống gian lận |
| Người chơi | Player | `players` | Khách chơi game, định danh ẩn danh/SĐT/Zalo theo cấu hình |
| Cách phát giải | Prize mode | `per_prize_probability`, `overall_win_rate`, `guaranteed`, `score_threshold`… | Cách prize engine chọn kết quả ([specs/prizes-redemption §2](./specs/prizes-redemption.md)) |
| Rải quà | Pacing | `time_uniform`, `opening_hours`… | Phân phối quà theo thời gian để không hết sớm |
| Mô phỏng phát giải | Prize simulator | `simulate()` | Chạy thử N lượt để xem quà còn lại theo thời gian |
| Kênh | Channel | `?ch=` | Nguồn khách (QR bàn, fanpage, Zalo OA) để thống kê |
| Bốc thăm cuối chương trình | End draw | `draw_spins` | Chọn người trúng từ tập người chơi đã chốt, có commit–reveal (M2) |
| Tặng quà theo danh sách | Gift list | — | Trao quà không ngẫu nhiên, ghi rõ là quà tặng (không dùng hiệu ứng quay) |
| Quầy đổi quà | Redeem desk | `/redeem` | Màn của nhân viên quầy (điện thoại) để quét/gõ mã hoặc tìm theo SĐT; mục "Đổi quà" trên sidebar |
| Chỉ đổi quà | Redeemer | `redeemer` | Vai trò thành viên chỉ thấy Quầy đổi quà (ORG-02a) |
| Máy quầy | Counter device | `counter_devices` (dự kiến) | Điện thoại ghép bằng QR, không cần tài khoản email, chỉ tra cứu/đổi mã, thu hồi được (ORG-10, [D-24](./decisions.md), [ADR-017](../adr/017-counter-device-pairing.md)) |
| Mã ghép | Pairing code | — | QR dùng một lần, hết hạn 10 phút, để biến điện thoại thành máy quầy (ORG-10) |
| Quán / Nhãn quán | Store label | `storeLabel` (dự kiến) | Nhãn điểm bán gắn máy quầy và lượt đổi để báo cáo theo quán; chưa giới hạn kho/quyền (PRZ-17) |
| Điểm đổi quà | Redemption point | — | Quán trong chuỗi có giới hạn tồn kho và quyền riêng (PRZ-14, M2) |
| Quản lý cửa hàng | Store manager | (vai trò, M2) | Xem số liệu, tồn kho, máy quầy, nhân viên của quán mình; không sửa chương trình (ORG-12) |
| Mã chơi thử / Chế độ tập huấn | Rehearsal code / Training mode | — | Mã sinh từ chơi thử; ở quầy bấm Xác nhận được nhưng không ghi số liệu (PRZ-19) |
| Tra theo SĐT | Phone lookup | `via=phone` (dự kiến) | Quầy tìm mã chưa đổi theo SĐT, nhân viên đối chiếu tên trước khi đổi (PRZ-15, [D-25](./decisions.md)) |
| Lưu mã / Khôi phục quà | Save code / Restore | — | Lưu mã qua Zalo/ảnh; khôi phục Quà của tôi trên thiết bị mới bằng SĐT + 4 ký tự cuối mã (PRZ-16, [D-25](./decisions.md)) |
| Mã tại quầy | Counter code | — | Mã 4 số đổi mỗi 30 phút trên máy quầy; bật thì phải nhập mới mở lượt (EVT-16, M2) |
| Quà của tôi | My prizes | `/{slug}/prizes` | Trang người chơi xem mã, QR, hạn, trạng thái (PRZ-03) |
| Quà lần sau | Bounce-back voucher | — | Voucher cố định tặng sau khi đổi quà, dùng từ ngày mai, hạn 14 ngày; quà tặng không ngẫu nhiên, ghi trong thể lệ (RET-06) |
| Thẻ thành viên | Member card | — | QR cá nhân, quầy quét để ghi lượt ghé khi khách không có quà (RET-08, M2) |
| Hồ sơ khách | Customer profile | (gộp theo `phoneHash`, M2) | Gộp người chơi theo SĐT ở cấp tổ chức (ANL-08) |
| Khách tới quầy / Khách quay lại / Chi phí quà / Chi phí mỗi khách | Visits / Returning / Prize cost / Cost per visit | — | 4 số kết quả, định nghĩa ở [playbooks §3.2](./specs/playbooks.md) (PLB-03) |
| Giá vốn / Ngân sách quà | Unit cost / Prize budget | `valueVnd`, budget | Chi phí thật của quán cho mỗi quà; trần tổng chi phí quà (PLB-02, PRZ-07) |
| Mốc so sánh (ngày thường) | Baseline | — | Số khách ngày thường chủ quán nhập, luôn ghi "ước tính" (PLB-08) |
| Nhịp phát quà | Prize pacing monitor | — | So lưu lượng thật với dự kiến, dự báo dư/thiếu quà, đề xuất tỷ lệ trúng mới (PRZ-22) |
| Bìa minh bạch | Transparent cover | — | Bìa hiện số quà còn lại / tổng, danh sách quà, lượt còn hôm nay; không lộ tỷ lệ trúng (BLD-25) |
| Sẵn sàng mở bán | Launch checklist | — | Checklist sau phát hành: QR đã in, có máy quầy, đã đổi thử mã tập huấn, đã chia sẻ (BLD-29) |
| Hạn mức gói / Trần cứng | Plan quota / Hard cap | `PLAN_REDEMPTION_LIMIT`, `PLAN_CAMPAIGN_LIMIT` | Lượt đổi quà/tháng; chạm trần cứng (hạn mức + 10%) thì ngừng phát giải mới, quầy vẫn đổi được ([D-23](./decisions.md), BIL-02) |
| Mức chống gian lận | Anti-fraud level | `antiFraud: low / standard` (high: M2) | Thấp / Chuẩn / Cao (EVT-13) |
| Loại chương trình | Promotion type | `promotionType` | Có gắn mua hàng hay không (CMP-03) |
| Thể lệ | Terms | `termsText` | Tự sinh từ cấu hình, chủ quán sửa được (CMP-04) |
| Trạng thái chương trình | Phase | `draft / scheduled / live / paused / ended` | Nháp, Đã lên lịch, Đang chạy, Tạm dừng, Đã kết thúc; suy ra từ lịch và thao tác (EVT-01) |
| Soạn / Vận hành | Build / Operate | — | Hai chế độ của một chương trình: Builder và trang Vận hành ([studio-ux §2](./specs/studio-ux.md)) |
| Chia sẻ & QR | Share & QR | `/share` | Tab QR, link theo kênh, vật in, mời nhân viên (EVT-10, EVT-11) |

**Nhãn trong tài liệu:** `[GĐ]` = số giả định, cần kiểm chứng · `[CXM]` = chưa xác minh · M0–M4 = giai đoạn ở [roadmap](./roadmap.md) · ID dạng `BLD-01` = yêu cầu trong [prd.md](./prd.md) · `D-xx` = [quyết định sản phẩm](./decisions.md) · `ADR-xxx` = [quyết định kiến trúc](../adr/README.md).
