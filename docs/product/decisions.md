# Nhật ký quyết định sản phẩm

Cập nhật: 26/10/2026 · Owner: PO

Ghi mọi quyết định **sản phẩm và kinh doanh** (phạm vi, khách hàng, giá, thứ tự ưu tiên) ở đây, mỗi dòng một quyết định. Quyết định **kỹ thuật** khó đảo ngược thì viết ADR ở [adr/](../adr/README.md).

**Quy tắc:**
- Không xoá dòng cũ. Quyết định bị thay thì đổi trạng thái thành `Thay bởi D-xx` và thêm dòng mới.
- Trạng thái: `Đã chốt` · `Thử nghiệm` (chốt tạm, có điều kiện xem lại) · `Thay bởi D-xx` · `Huỷ`.
- Khi một quyết định làm đổi [strategy.md](./strategy.md) hoặc [prd.md](./prd.md), sửa các file đó trong cùng PR.

| ID | Ngày | Quyết định | Lý do | Trạng thái | Ảnh hưởng |
|---|---|---|---|---|---|
| D-01 | 23/10/2026 | Không làm quiz, poll, bình chọn, dự đoán | Kahoot, Slido, AhaSlides đã tốt và có bản miễn phí | Đã chốt (xác nhận lại 24/10) | strategy §7 |
| D-02 | 24/10/2026 | Bỏ Live add-on: game LED, Host Console, Screen, shake/tap race | Quay số và check-in LED đã bị hàng hoá hoá; tập trung minigame có thưởng | Đã chốt | [ADR-011](../adr/011-remove-live-engine.md) |
| D-03 | 24/10/2026 | Tết 2027 là mùa học, không phải mốc doanh thu; ưu tiên xây đúng và bền | Chưa có khách; muốn sản phẩm builder lâu dài | Đã chốt | roadmap |
| D-04 | 24/10/2026 | ICP #1 là SME; agency chỉ là kênh bán lại (M4) | Chưa có khách agency; 凡科 thắng nhờ SME số lượng lớn | Đã chốt | strategy §4 |
| D-05 | 24/10/2026 | Hình mẫu sản phẩm là 凡科互动, chỉ mảng hoạt động marketing | Template market + editor cấu hình + prize engine là đúng nhu cầu | Đã chốt | [teardown](../research/guandayun-teardown.md) |
| D-06 | 24/10/2026 | Dùng Ant Design v6 cho mọi bề mặt (Studio, Play, Web) | Bớt component tự lắp; Form/Table/Upload có sẵn | Đã chốt | [ADR-013](../adr/013-antd-ui.md) |
| D-07 | 25/10/2026 | Kiến trúc game: engine instant-win + engine skill/điểm + engine giữ chân, nhiều renderer | 1.700 template của 凡科 chạy trên ~111 engine | Đã chốt | [specs/builder](./specs/builder.md) |
| D-08 | 25/10/2026 | Có tính năng giữ chân: điểm danh, bốc mỗi ngày, hub điểm, sưu tầm thẻ (không rủ bạn) | Lý do SME trả thuê bao | Đã chốt | [specs/participation](./specs/participation.md) |
| D-09 | 25/10/2026 | Up hoá đơn để được lượt: giai đoạn sau (M4) | Cần duyệt tay hoặc OCR, nặng vận hành | Đã chốt | prd EVT-08 |
| D-10 | 25/10/2026 | Đổi quà tại quầy + vai trò nhân viên lên M1 | Kịch bản lõi của SME là QR tại quầy → quay → đổi quà | Đã chốt | [specs/prizes-redemption](./specs/prizes-redemption.md) |
| D-11 | 25/10/2026 | Zalo (OA, ZNS, đăng nhập) lên M3 | Kênh chính của SME | Đã chốt | roadmap |
| D-12 | 25/10/2026 | **Game mobile-first, Studio desktop-first**; riêng màn Đổi quà dùng tốt trên điện thoại | Người chơi dùng điện thoại; chủ quán soạn trên máy tính | Đã chốt | [specs/studio-ux](./specs/studio-ux.md) |
| D-13 | 25/10/2026 | Studio theo giao diện admin games-vt (sidebar nhóm, PageHeader, MetricGrid, TableCard) | Bản chỉ chỉnh token Atlassian bị đánh giá "chán" | Đã chốt | [design-system §3.4](../engineering/design-system.md) |
| D-14 | 25/10/2026 | Có editor canvas tự do cho các màn (chế độ Tuỳ biến) | SME muốn màn chơi như poster của quán | Đã chốt 26/10 | [ADR-014](../adr/014-free-canvas-screen-editor.md) |
| D-15 | 26/10/2026 | **Builder vẫn là lõi, nhưng sản phẩm định vị và đo theo kết quả của quán** (playbook theo mục tiêu, báo cáo kết quả) | Chủ quán mua "khách tới quán", không mua "game builder" | Đã chốt | strategy §1.1, §5 |
| D-16 | 26/10/2026 | North Star = **lượt đổi quà tại quầy mỗi tháng** (thay "SME có chương trình chạy") | Đo đúng giá trị cho quán, không bơm được bằng bot | Thử nghiệm: xem lại sau pilot Tết | strategy §8 |
| D-17 | 26/10/2026 | Beachhead: **quán đồ uống và ăn nhẹ** (cà phê, trà sữa, tiệm bánh) | Ghé thường xuyên, quà rẻ, có quầy để đổi; một người chỉ làm sâu được một ngành | Thử nghiệm: xem lại sau 15 phỏng vấn M0 | strategy §4 |
| D-18 | 26/10/2026 | Thứ tự: **vòng lõi thật (API lượt chơi, giải, đổi quà, báo cáo) trước** mọi cải tiến canvas, theme hay refactor | Chưa người chơi nào chơi được với backend thật; không có gì để pilot | Đã chốt | roadmap P0 |
| D-19 | 26/10/2026 | Pilot Tết theo kiểu **dựng hộ miễn phí** 5–10 quán, đổi lại số liệu và case study | Chưa có khách; cần bằng chứng kết quả | Đã chốt | roadmap, [business-model](../business/business-model.md) |
| D-20 | 26/10/2026 | Giá: thuê bao tháng/năm cho quán; Free soạn đầy đủ, khoá theo số lượt đổi quà/tháng và watermark | Gắn giá với giá trị (khách tới quán), khác WOAY bán quota lượt | Thử nghiệm: đo ở M2 | [business-model §3](../business/business-model.md) |

## Câu hỏi đang mở

| # | Câu hỏi | Cần để | Hạn |
|---|---|---|---|
| Q-1 | Tính phí theo lượt đổi quà (trả theo kết quả) có làm quán dễ mua hơn thuê bao cố định không? | Chốt D-20 | Sau phỏng vấn M0 |
| Q-2 | Đăng ký Zalo OA cho ZNS ngay từ M1 để kịp M2–M3? | Nhắc quay lại | 30/11/2026 |
| Q-3 | AI dựng nháp: nhà cung cấp nào, trần chi phí mỗi chương trình, có trong gói Free không? | Builder M2 | 01/2027 |
| Q-4 | Xoá nền ảnh sản phẩm: dịch vụ trả theo lượt hay tự host model (kiểm license)? | Builder M1–M2 | 12/2026 |
| Q-5 | Lưu Campaign trên `events` + `games` + `game_versions` hay bảng mới? | API P0 | [ADR-015](../adr/015-campaign-persistence.md) |
