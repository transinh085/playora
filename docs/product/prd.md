# PRD — Playora

Phiên bản: **v4.3** · 31/10/2026 · Owner: PO · Theo [strategy.md](./strategy.md) v4.1 · Thuật ngữ: [glossary.md](./glossary.md) · Thay đổi: [§9](#9-lịch-sử-phiên-bản)

**Giai đoạn:** M0 Discovery · **M1** vòng lõi + pilot Tết (→ 02/2027) · **M2** self-serve + giữ chân v1 (03–05/2027) · **M3** Zalo + giữ chân v2 (06–09/2027) · **M4** kênh + Tết 2028 (10–12/2027) · **Later** 2028+. Lịch chi tiết: [roadmap.md](./roadmap.md).

**Hiện trạng** (cột cuối mỗi bảng): ✅ chạy với API thật · 🧪 bản thử nghiệm (chưa đủ cho pilot) · ⬜ chưa làm. Hiện trạng được đối chiếu với code ngày 31/10/2026; mô tả trong phần chi tiết là **hành vi đích**, chỗ nào code chưa có thì ghi *Chưa có:*.

**Giai đoạn và ưu tiên:** cột "GĐ" ghi giai đoạn sớm nhất. Trong M1, "M1 (Must/Should/Could)" là mức ưu tiên trước pilot theo [D-26](./decisions.md); M1 không ghi mức là việc đã xong hoặc thuộc vòng lõi.

**Cách đọc tài liệu này**

| Phần | Trả lời câu hỏi |
|---|---|
| §1–§2 | Làm cho ai (persona đang phục vụ và persona tương lai), để đạt gì |
| §3 | **Có những màn hình nào, mỗi màn có tính năng gì** (bản đồ tính năng, map về ID) |
| §4 | Người dùng đi qua sản phẩm thế nào |
| §5 | **Từng tính năng làm gì**: bảng tổng hợp theo nhóm, rồi chi tiết từng ID (M1: hành vi · quy tắc · nghiệm thu; M2: tóm tắt; M3+: một dòng trong bảng) |
| §6–§7 | Yêu cầu phi chức năng, tiêu chí sẵn sàng pilot |

Đặc tả sâu hơn (thuật toán, wireframe, hợp đồng kỹ thuật) nằm ở `specs/`; PRD không lặp lại, chỉ dẫn link.

---

## 1. Mục tiêu

| # | Mục tiêu | Đo bằng | Từ GĐ |
|---|---|---|---|
| G1 | Chủ quán có game mang sản phẩm của mình mà không cần kỹ thuật | Trung vị thời gian từ chọn playbook đến phát hành ≤ 10 phút (M1), ≤ 5 phút (M2); ≥ 60% chương trình đã phát hành có ít nhất một ô ảnh (logo, sản phẩm, quà) do quán tải lên | M1 |
| G2 | Giải không bao giờ phát sai, chi phí quà trong ngân sách | 0 lần vượt tồn kho/ngân sách/giới hạn mỗi người (kiểm bằng test PRD §7.3 và đối soát DB); 100% lượt chơi có bản ghi kết quả | M1 |
| G3 | Mỗi lượt trúng quà hiện vật thành một lượt ghé quán đã xác thực | ≥ 80% số quà hiện vật quán **thực trao** được ghi qua màn Đổi quà. Đo trong pilot bằng đối chiếu số quà quán kiểm kê đã xuất với số lượt đổi trong hệ thống (không đo được bằng dữ liệu hệ thống một mình) | M1 |
| G4 | Chủ quán thấy kết quả kinh doanh, không chỉ lượt chơi | 100% chương trình có báo cáo "khách tới quầy, khách quay lại, chi phí quà" (PLB-03) | M1 |
| G5 | Khách quay lại | ≥ 20% khách đã đổi quà có **lượt đổi thứ hai ở một ngày khác** trong vòng 30 ngày, tính trên chương trình dùng playbook "Khách quay lại lần 2" hoặc bật quà lần sau (RET-06). Định nghĩa đổi sang "lượt ghé đã xác thực" khi có PLB-09 | Đo thử ở pilot; mục tiêu từ M2 |
| G6 | Dữ liệu hợp pháp | 100% người chơi có consent tách mục đích (M1); người chơi xem/xoá/rút consent được và hạn lưu 12 tháng (M2, CMP-01/02) | M1 / M2 |

### Ngoài phạm vi

Quiz/poll; game LED/sân khấu realtime; editor logic kiểu Epub360; cash/lì xì tiền, cá cược; bán vé, agenda; check-in khuôn mặt; app native; bộ SaaS (CRM, POS, shop). Lý do: [strategy §7](./strategy.md#7-nguyên-tắc-sản-phẩm).

---

## 2. Persona

### 2.1 Persona đang phục vụ (M1–M2)

| Persona | Bối cảnh | Cần | Thất vọng hiện tại | GĐ |
|---|---|---|---|---|
| **Chị Hà, chủ 3 quán trà sữa** (người mua, người dựng) | Tự làm marketing trên fanpage và Zalo; làm việc trên laptop lúc vắng khách | Kéo khách dịp Tết và ngày vắng; khách quay lại; biết chương trình có lời không | Vòng quay miễn phí không quản lý được quà; WOAY chỉ đổi màu/logo; không đo được hiệu quả | M1 |
| **Tuấn, nhân viên quầy** | Đứng quầy giờ cao điểm, một tay cầm điện thoại; nhân viên thời vụ, hay thay người | Quét hoặc gõ mã trong vài giây, biết ngay đổi được hay không | Khách đưa ảnh chụp màn hình mã cũ; không biết mã đã đổi chưa | M1 |
| **Khách (người chơi)** | Điện thoại phổ thông, mở link từ Zalo/FB hoặc quét QR trên bàn; 4G chập chờn | Vào trong ≤ 10 giây, chơi vui, biết trúng gì và đổi ở đâu | Phải cài app, form dài, trúng rồi không nhận được quà | M1 |
| **Chị Thảo, quản lý cửa hàng trong chuỗi** | Quản lý một điểm bán của chuỗi 5–30 quán; chương trình do văn phòng chuỗi dựng; chịu trách nhiệm ca, nhân viên và quà tại quán mình | Thấy số liệu của **quán mình** (khách tới quầy, quà còn lại); quản lý máy quầy và nhân viên của quán; báo thiếu quà sớm | Không được sửa chương trình nhưng phải trả lời khách và chủ chuỗi; không biết quán mình so với quán khác thế nào | M2 (gói Chuỗi, cùng PRZ-14) |
| **Nhân viên Playora** (nội bộ) | Hỗ trợ quán, kích hoạt gói | Tìm tổ chức, đổi gói, ghi hoá đơn, xem usage | — | M1 |

### 2.2 Persona tương lai (M3–M4+, chưa xây tính năng riêng)

Theo [D-27](./decisions.md): ICP vẫn là quán nhỏ ([D-04](./decisions.md), [strategy §4](./strategy.md#4-khách-hàng-mục-tiêu)). Các persona dưới đây được ghi để **thiết kế hiện tại không đóng cửa** với họ; không thêm tính năng riêng cho họ trước Gate M3.

| Persona | Bối cảnh | Cần | Thất vọng hiện tại | Khác biệt lớn với quán | GĐ sớm nhất |
|---|---|---|---|---|---|
| **Linh, freelancer marketing cho quán** | Làm chương trình cho 5–10 quán | Nhân bản chương trình, giao cho từng quán tự vận hành | Mỗi quán làm lại từ đầu | Một người, nhiều tổ chức | M4 |
| **Anh Quân, PM agency làm cho nhãn hàng** | Agency digital/activation 10–50 người; mỗi mùa (Tết, 8/3, Trung thu) chạy 5–20 campaign cho nhiều nhãn hàng; vừa online vừa booth sự kiện | Workspace theo từng client; bản nháp gửi client duyệt; white-label/tên miền riêng; nhân bản campaign giữa các client; báo cáo mang thương hiệu agency gửi client; tính phí theo campaign để cộng vào báo giá | Thuê dev làm game riêng 30–200 triệu đ/dự án, chậm; WOAY không có lớp agency, không white-label; quản lý giải bằng Excel, sợ hết giải sớm và bị client nghi gian lận | Người dùng ≠ người trả tiền cuối; cần quyền theo client và luồng duyệt; mua theo dự án, không theo tháng | M4 |
| **Chị Mai, brand manager nhãn hàng tiêu dùng** (FMCG, mỹ phẩm, đồ uống đóng chai) | Chạy minigame trực tiếp cho người tiêu dùng trên fanpage, Zalo OA, mã in trên bao bì/nắp chai; **không có quầy**; 10.000–500.000 người chơi mỗi campaign; ngân sách giải hàng chục–hàng trăm triệu | Giải không vượt ngân sách và chống gian lận ở quy mô lớn (OTP/Zalo bắt buộc); quà gửi tận nơi hoặc e-voucher/e-gift; mã tham gia trên bao bì; đăng ký khuyến mại nhiều tỉnh; tuân thủ brand guideline; dữ liệu khách xuất sang CRM; báo cáo cho cấp trên (lead đã xác thực, chi phí mỗi lead, quà đã trao) | Agency báo giá cao và chậm; nền tảng nước ngoài không hiểu luật khuyến mại VN; số liệu lượt chơi bị bơm, không tin được | **Không có "đổi quà tại quầy"** → North Star và báo cáo kết quả phải đổi đơn vị; quy mô tải lớn hơn nhiều; pháp lý nặng hơn | Sau Gate M3 (xem Q-5) |

### 2.3 Tác động tới thiết kế hiện tại

Những ràng buộc "không hối tiếc" dưới đây giữ cửa mở cho §2.2 mà không tốn thêm công ở M1–M2. Người viết code và ADR mới cần giữ chúng.

| Ràng buộc | Vì persona | Đã có / giữ thế nào | ID liên quan |
|---|---|---|---|
| Tổ chức là ranh giới tenant duy nhất; một người dùng thuộc được nhiều tổ chức | Agency, freelancer | Better Auth organization; mọi repository lọc `organizationId` | ORG-02, ORG-03 |
| Quyền theo vai trò đủ mềm để thêm vai trò mới (quản lý cửa hàng, client duyệt) mà không sửa từng route | Quản lý cửa hàng, agency | Ma trận quyền ở `packages/auth/src/permissions.ts`; route chỉ khai báo `permission` | ORG-02, ORG-11, ORG-12 |
| Đổi quà là **một kênh nhận quà** trong nhiều kênh (quầy, e-voucher dùng online, gửi tận nơi, e-gift), không phải giả định cứng | Brand manager | Giữ trạng thái award chung (`issued / redeemed / expired / void`); khi thêm kênh chỉ thêm loại giải và cách nhận | PRZ-10, PRZ-13 |
| Danh tính người chơi mở rộng được sang OTP/Zalo bắt buộc | Brand manager | Mức chống gian lận theo chương trình; OTP M2, Zalo M3 | EVT-03, EVT-04, EVT-13 |
| Thương hiệu Playora trên Player tắt được theo gói (watermark là cờ gói, không gắn cứng) | Agency (white-label) | `watermark` trong `PlanLimits` | BIL-02, ORG-04 |
| Báo cáo dựa trên định nghĩa chỉ số ở một chỗ, thêm được chỉ số mới (lead đã xác thực, chi phí mỗi lead) | Brand manager, agency | Định nghĩa ở [playbooks §3.2](./specs/playbooks.md#32-định-nghĩa-chỉ-số) | PLB-03 |
| Prize engine và Play API không có giới hạn cứng theo quy mô quán | Brand manager | Mục tiêu tải §6 là cho M1; nâng khi có khách lớn | §6 |

Đã có ID: luồng client duyệt (ORG-11, M4), vai trò quản lý cửa hàng (ORG-12, M2), workspace theo client (ORG-03), white-label (ORG-04), tên miền riêng (ORG-05), e-gift (PRZ-13), mã trên bao bì (EVT-07), kiosk cho booth (GAM-03). Nhu cầu **chưa có ID** (ghi để không quên, không lên lịch): báo cáo mang thương hiệu agency gửi client; tính phí theo campaign; đăng ký khuyến mại nhiều tỉnh với Bộ Công Thương; gửi quà tận nơi kèm theo dõi vận chuyển; xuất dữ liệu sang CRM; SSO cho doanh nghiệp lớn.

---

## 3. Bề mặt sản phẩm và bản đồ tính năng

| Bề mặt | URL | Thiết bị | Giai đoạn |
|---|---|---|---|
| **Studio** | `studio.playora.vn` | Desktop (Đổi quà: điện thoại) | M1 |
| **Player** | `play.playora.vn/{slug}` (custom domain M4) | Điện thoại | M1 |
| **Quầy đổi quà** | `studio.playora.vn/orgs/{orgId}/redeem` | Điện thoại | M1 |
| **Web + chợ mẫu công khai** | `playora.vn` | Mọi thiết bị | M1 (landing), M2 (chợ mẫu SEO) |
| **Kiosk** | `play.playora.vn/{slug}?mode=kiosk` | Tablet tại quầy | M3 |
| **Back-office** | trong Studio (`/admin`), vai trò nội bộ | Desktop | M1 (tối giản) |

Các bảng dưới liệt kê **mọi màn hình** và tính năng trên đó. Cột "GĐ" để trống nghĩa là M1 và đã có hoặc thuộc vòng lõi; "M1 (Must/Should/Could)" là việc M1 chưa làm, xếp ưu tiên theo [D-26](./decisions.md). Bố cục và điều hướng: [studio-ux](./specs/studio-ux.md).

### 3.1 Studio — khung app và tổ chức

Sidebar: **Trang chủ** · MINIGAME (Chương trình, Kho mẫu, Đổi quà) · THƯƠNG HIỆU (Brand kit, Thư viện ảnh) · TỔ CHỨC (Cài đặt, Gói & sử dụng; Máy quầy khi có ORG-10). Mục chưa có trang thì không hiện; vai trò "chỉ đổi quà" chỉ thấy Đổi quà.

| Màn hình | URL | Tính năng | ID | GĐ |
|---|---|---|---|---|
| Đăng nhập | `/login` | Email + mật khẩu; Google (khi cấu hình client id); magic link; chuyển về trang đang mở dở sau khi đăng nhập | ORG-01 | |
| | | Bật 2FA cho owner/admin | ORG-07 | M2 |
| Nhận lời mời | `/invite/{id}` | Xem tổ chức và vai trò được mời; đăng nhập/đăng ký rồi chấp nhận | ORG-02 | |
| Tạo tổ chức | `/onboarding` | Tạo tổ chức đầu tiên (tên quán); người tạo thành owner; gói Free | ORG-02, BIL-02 | |
| Trang chủ | `/orgs/{orgId}` | Kết quả tuần này (khách tới quầy, chi phí quà) | PLB-03 | |
| | | **Cần xử lý**: quà còn < 20%, chương trình tạm dừng, sắp kết thúc, có thay đổi chưa phát hành | ANL-01 | |
| | | **"Bạn muốn gì?"**: thẻ 3 playbook → luồng tạo | PLB-01 | |
| | | Checklist bắt đầu (brand kit, chương trình đầu tiên, mời nhân viên quầy); mẫu gợi ý | — | |
| | | Banner hạn mức gói ở 80% / 100% | BIL-02 | |
| Email tóm tắt hằng ngày | (email) | 4 số hôm qua, % quà còn lại, cảnh báo bất thường, link về Tổng quan | ANL-10 | M1 (Should) |
| Brand kit | `/brand-kits` | Tạo/sửa brand kit: logo, 5 màu (chính, nhấn, nền, bề mặt, chữ), font; chương trình mới lấy brand kit đầu tiên | BLD-04 | |
| | | Upload logo → tự đề xuất 5 màu | BLD-27 | M1 (Could) |
| Thư viện ảnh | `/assets` | Upload ảnh (tối ưu, giới hạn dung lượng), xem, xoá; brand kit chọn logo từ thư viện | BLD-13 | |
| | | Chọn ảnh từ thư viện ngay trong Builder (hiện Builder chỉ upload mới) | BLD-13 | M1 (Could) |
| | | Chụp ảnh sản phẩm → tự xoá nền | BLD-22 | M2 |
| Cài đặt tổ chức | `/settings` | Tên tổ chức; **Thành viên & vai trò**: danh sách, mời qua email kèm vai trò, đổi vai trò, gỡ thành viên, huỷ lời mời (`/members` và `/settings/members` chuyển hướng về đây) | ORG-02, ORG-02a | |
| Máy quầy | `/settings/counter-devices` | Thêm máy quầy (nhãn, quán) → QR ghép; danh sách máy, lần dùng cuối; thu hồi một chạm | ORG-10, PRZ-17 | M1 (Must) |
| Gói & sử dụng | `/settings/billing` | Gói hiện tại + hạn; thanh usage (chương trình đang chạy, lượt đổi quà tháng này); cảnh báo 80%/100%; lịch sử hoá đơn; hướng dẫn chuyển khoản | BIL-01, BIL-02 | |
| | | Tự thanh toán qua PayOS (VietQR) | BIL-03 | M2 |
| Back-office | `/admin` | Chỉ nhân viên Playora (404 với người khác): tìm tổ chức, xem gói + usage, đổi gói + hạn + ghi chú, ghi hoá đơn | ADM-01, BIL-01 | |
| | | Impersonate có log; lịch chương trình sắp chạy | ADM-01, ADM-02 | |
| | | Quản lý mẫu/skin (bật/tắt, gán gói) | ADM-03 | M2 |

### 3.2 Studio — chương trình

| Màn hình | URL | Tính năng | ID | GĐ |
|---|---|---|---|---|
| Danh sách chương trình | `/campaigns` | Thẻ có ảnh game, trạng thái suy ra, lượt hôm nay, giải còn lại, tag playbook; bấm vào mở **Builder** nếu Nháp, **Vận hành** nếu đã phát hành | EVT-01 | |
| | | Nhân bản; thùng rác 14 ngày | BLD-15 | M2 |
| Tạo chương trình | `/campaigns/new` | Màn 1 **"Bạn muốn gì?"**: chọn playbook (Tết kéo khách, Khách quay lại lần 2, Lấp ngày vắng) hoặc "Tự chọn mẫu" | PLB-01 | |
| | | Màn 2 **Thiết lập + đề xuất** (cập nhật trực tiếp): tên, ngày chạy, ngày mở trong tuần, giờ mở cửa, ngân sách quà, quà + giá vốn (gợi ý sẵn), lượng khách dự kiến/ngày → số lượng từng quà, tỷ lệ trúng, rủi ro hết quà, chi phí dự kiến, câu tóm tắt → "Tạo" mở Builder | PLB-02, PRZ-08 | |
| | | Câu hỏi mốc so sánh: "Ngày thường quán có khoảng bao nhiêu khách?" | PLB-08 | M1 (Should) |
| | | **"Tự chọn mẫu"**: kho mẫu lọc dịp/ngành/mục tiêu, thẻ có ảnh, xem trước chơi được, chọn skin | BLD-01, BLD-06 | |
| | | AI dựng nháp từ một câu / link fanpage | BLD-17 | M2 |
| Builder (toàn màn hình) | `/campaigns/{id}/edit` | Ba chế độ trên cùng bản nháp: **Sửa nhanh · Tuỳ biến · Luật & giải**; giữa là preview điện thoại; nút **Phát hành** mở hộp kiểm tra + checklist pháp lý | BLD-03, BLD-07 | |
| | | **Sửa nhanh** (mặc định): thẻ ô thay thế (logo, ảnh sản phẩm, chữ khuyến mãi, ảnh quà); đổi skin giữ nội dung; màu brand | BLD-19, BLD-06 | |
| | | **Tuỳ biến** (beta): canvas tự do mỗi màn — kéo, đổi cỡ, xoay, snap, lớp, khoá | BLD-20 | |
| | | Cấu hình riêng của mẫu trong form tự sinh (hiện cơ chế tự suy từ danh sách giải, không có form) | BLD-02 | M2 |
| | | **Luật & giải** (4 bước): (1) cách phát giải → (2) giải (tên, ảnh, số lượng, giá vốn) → (3) luật viết bằng câu (lượt/ngày, lịch, giờ mở cửa, rải quà, ngân sách, form, chống gian lận) → (4) pháp lý (loại chương trình, thể lệ tự sinh/sửa); kèm thẻ mô phỏng | BLD-21, PRZ-01, PRZ-05, PRZ-07, PRZ-08, PRZ-09, EVT-05, EVT-13, EVT-14, CMP-03, CMP-04 | |
| | | Tự lưu, undo/redo | BLD-14 | |
| | | Preview chuyển giữa 5 màn (Bìa, Form, Game, Trúng, Không trúng); nút Chơi thử chạy bản nháp trong Studio (thành viên đăng nhập), không trừ kho thật | BLD-03, BLD-23 | |
| | | **Link nháp công khai** (≤ 20 người ngoài tổ chức) + QR cạnh preview để mở trên điện thoại | BLD-23, BLD-26 | M1 (Should) |
| | | **Phát hành**: danh sách kiểm tra (chặn/cảnh báo, sửa một chạm) + checklist pháp lý → phiên bản bất biến → màn Chia sẻ | BLD-08, BLD-09, CMP-03 | |
| | | Luồng "60 giây": playbook → logo + 1 ảnh sản phẩm → ngân sách → Phát hành | BLD-28 | M2 |
| Chơi thử (người chơi giả lập) | `/play/{campaignId}?rehearsal=1` | Chạy toàn bộ flow Player trên bản nháp; lượt và mã chơi thử không vào kho, báo cáo, quota | BLD-23 | |
| Vận hành · Tổng quan | `/campaigns/{id}` | 4 số kết quả: Khách tới quầy · Khách quay lại · Chi phí quà / ngân sách · Chi phí mỗi khách; biểu đồ theo ngày (chơi/trúng/đổi); theo kênh; tồn kho từng quà; lượt gần đây. Nháp: danh sách việc còn chặn phát hành | PLB-03, ANL-01, EVT-11 | |
| | | So với ngày thường ("Thứ 3 +18%", ghi rõ ước tính) | PLB-08 | M1 (Should) |
| | | **Nhịp phát quà**: lưu lượng thật so với dự kiến, dự báo quà dư/thiếu khi kết thúc, đề xuất chỉnh tỷ lệ trúng + phát hành lại một chạm | PRZ-22 | M1 (Should) |
| | | Hiệu quả theo quà (tỷ lệ đổi, chi phí/khách từng quà, gợi ý thay quà) | PLB-10 | M1 (Could) |
| | | Bản đồ nhiệt giờ × thứ | ANL-09 | M2 |
| | | Phễu mở link → form → chơi → trúng → đổi | ANL-04 | M2 |
| Vận hành trên điện thoại | `/campaigns/{id}` (responsive) | Tạm dừng/tiếp tục, thêm tồn kho, xem 4 số chính | EVT-15 | M1 (Could) |
| Vận hành · Người chơi | tab | Danh sách **lượt chơi** (thời gian, người chơi, kênh, kết quả, quà) | ANL-01 | |
| | | Danh sách **người chơi** (tên, SĐT che bớt, số lượt, quà, consent marketing), tìm theo SĐT/tên | EVT-02, EVT-05 | M1 (Should) |
| | | Export CSV/XLSX (kèm consent) | ANL-02 | M1 (Should) |
| | | Xử lý yêu cầu xem/xoá/rút consent | CMP-01 | M2 |
| Vận hành · Giải & đổi quà | tab | Bảng quà: tổng / đã phát / đã đổi / còn lại / chi phí; danh sách mã (đã phát, đã đổi, hết hạn, huỷ); lối tắt sang Quầy đổi quà | PRZ-09, PRZ-10 | |
| | | Thêm/bớt tồn kho khi đang chạy, có audit (hiện phải sửa bản nháp và phát hành lại) | PRZ-01 | M1 (Should) |
| | | Bốc thăm cuối chương trình | PRZ-02 | M2 |
| Vận hành · Chia sẻ & QR | `/campaigns/{id}/share` | QR tải PNG/SVG; link theo kênh (`?ch=qr-ban`, `fanpage`, `zalo-oa`, tự đặt); mẫu in standee + tent card (`/share/print`); mời nhân viên quầy | EVT-10, EVT-11, ORG-02a | |
| | | Thêm máy quầy (QR ghép) | ORG-10 | M1 (Must) |
| | | Checklist **"Sẵn sàng mở bán"**: đã in QR · đã có máy quầy · nhân viên đã đổi thử mã tập huấn · đã chia sẻ fanpage | BLD-29 | M1 (Should) |
| Vận hành · Cài đặt | tab | Đổi ngày kết thúc (**gia hạn**); **tạm dừng / tiếp tục**, **kết thúc ngay**; xoá (chặn khi Đã lên lịch / Đang chạy / Tạm dừng) | EVT-01 | |
| | | Sửa nóng chữ/nhãn không cần phát hành lại (có audit); chỉnh hạn đổi quà | BLD-08, PRZ-10 | M1 (Could) |
| Báo cáo một trang | `/campaigns/{id}/report` | Trang in A4: mục tiêu, thời gian, 4 số chính, biểu đồ theo ngày, quà theo loại, 3 nhận xét tự sinh; nút In/Tải PDF | PLB-04 | |
| | | Benchmark theo ngành; gợi ý chương trình tiếp theo | PLB-05, PLB-07 | M3 |

### 3.3 Quầy đổi quà (điện thoại)

| Màn hình | Tính năng | ID | GĐ |
|---|---|---|---|
| Quầy đổi quà `/redeem` | Quét QR bằng camera; gõ mã 6 ký tự | PRZ-10 | |
| | Kết quả tra cứu: tên + ảnh quà, tên khách, chương trình, hạn, trạng thái (chưa đổi / đã đổi lúc… bởi… / hết hạn / huỷ / không thuộc quán / mã chơi thử) | PRZ-10 | |
| | Nút **Xác nhận đã trao** (không hoàn tác); quay lại sẵn sàng quét mã tiếp | PRZ-10 | |
| | Owner **mở lại mã** đổi nhầm, bắt buộc lý do, có audit | PRZ-10 | |
| | Vai trò "chỉ đổi quà": vào thẳng màn này, không thấy menu khác | ORG-02a | |
| | **Không bao giờ từ chối vì hạn mức gói** ([D-23](./decisions.md)); hiện code vẫn chặn ở 110% | BIL-02 | M1 (Must) |
| | **Tìm theo SĐT**: liệt kê mã chưa đổi của SĐT trong tổ chức; nhân viên đối chiếu tên rồi đổi | PRZ-15 | M1 (Must) |
| | **Máy quầy ghép QR**: dùng quầy không cần tài khoản email | ORG-10 | M1 (Must) |
| | **Chế độ tập huấn**: mã chơi thử hiện "Mã chơi thử — đây là cách đổi quà", bấm Xác nhận được nhưng không ghi số liệu | PRZ-19 | M1 (Should) |
| | Cài như app (PWA): giữ quyền camera, rung + âm báo, chữ rất to "ĐỔI ĐƯỢC" / "ĐÃ ĐỔI LÚC 14:02" | PRZ-18 | M1 (Should) |
| | Mỗi máy quầy gắn nhãn quán; lượt đổi ghi quán | PRZ-17 | M1 (Should) |
| | Sau khi trao: nhắc "Lần sau khách có quà" nếu chương trình bật quà lần sau | RET-06 | M1 (Could) |
| | Điểm đổi quà đầy đủ (giới hạn, quyền theo quán) | PRZ-14 | M2 |
| | Nhật ký theo nhân viên/máy + cờ bất thường | PRZ-20 | M2 |
| | Khách tự đổi bằng PIN nhân viên | — | M3 |

### 3.4 Player (điện thoại người chơi)

Flow chuẩn: **Bìa → Form (nếu bật) → Game → Kết quả → Quà của tôi** ([builder §3](./specs/builder.md#3-flow-chuẩn)).

| Màn hình | Tính năng | ID | GĐ |
|---|---|---|---|
| Bìa `/{slug}` | Màn canvas của quán (tiêu đề, ảnh sản phẩm, logo, nút Chơi); luật tóm tắt bằng câu; link "Thể lệ đầy đủ" | BLD-07, CMP-04 | |
| | **Bìa minh bạch**: "Còn 312 / 400 phần quà", danh sách quà có ảnh, "Hôm nay bạn còn 1 lượt" | BLD-25 | M1 (Should) |
| Form | Tên + SĐT; consent tách mục đích; Turnstile ẩn ở mức Chuẩn; SĐT đã dùng ở thiết bị khác → báo trùng ([D-22](./decisions.md)) | EVT-02, EVT-05, EVT-13 | |
| | Tuỳ chọn "chơi trước, để lại SĐT khi trúng" | EVT-17 | M2 |
| | OTP SĐT | EVT-03 | M2 |
| | Đăng nhập Zalo | EVT-04 | M3 |
| Game | Renderer mẫu trong `gameStage` (vòng quay, cào thẻ, mở hộp); server quyết định kết quả trước, client chỉ diễn hoạt cảnh; mất mạng thì thử lại cùng token, không mất lượt | GAM-01, GAM-04 | |
| | Hứng quà (skill) | GAM-02, GAM-04 | M2 |
| | Haptic, âm thanh, confetti khi trúng; tải trước asset game ở Bìa | GAM-05 | M2 |
| Kết quả | 2 màn canvas: **Trúng** (tên + ảnh quà, mã + QR, hạn, nơi đổi) · **Không trúng** (dùng cho cả hết quà). **Hết lượt / ngoài giờ** hiện dạng thông báo kèm thời điểm lượt tiếp theo | BLD-07, PRZ-03 | |
| | Nút **"Lưu mã"**: chia sẻ vào Zalo "Cloud của tôi", tải ảnh mã | PRZ-16 | M1 (Must) |
| | Nút "Quan tâm Zalo OA của quán" (link do quán cấu hình) | RET-07 | M1 (Should) |
| Quà của tôi `/{slug}/prizes` | Danh sách quà đã trúng trên thiết bị này: mã, QR, hạn, trạng thái lấy từ server (tự làm mới); đồng hồ chạy chống ảnh chụp màn hình; mã đã đổi hiện "Đã đổi" | PRZ-03, PRZ-10 | |
| | **Khôi phục trên thiết bị mới** bằng SĐT + 4 ký tự cuối của một mã ([D-25](./decisions.md)) | PRZ-16 | M1 (Must) |
| | Quà lần sau (mở từ ngày mai, hạn 14 ngày) | RET-06 | M1 (Could) |
| | Thẻ thành viên QR cá nhân (quét được cả khi không có quà) | RET-08 | M2 |
| Trạng thái chương trình | Chưa mở, tạm dừng, đã kết thúc, ngoài giờ/ngày mở cửa, không tồn tại — mỗi trạng thái có thông báo rõ | EVT-01, EVT-14 | |
| Watermark | Badge "Tạo bằng Playora" ở gói Free | BIL-02 | |
| Ngôn ngữ | Tiếng Việt mặc định; chuỗi giao diện có bản tiếng Anh (`packages/i18n`, NFR §6) | — | |

### 3.5 Web công khai

| Màn hình | Tính năng | ID | GĐ |
|---|---|---|---|
| Landing `playora.vn` | Giới thiệu theo kết quả ("khách tới quầy"), case study, bảng giá, nút đăng ký Studio | — | |
| Chợ mẫu | Trang mẫu × skin công khai, xem trước chơi được, SEO theo dịp/ngành, nút "Dùng mẫu này" | BLD-01 | M2 |

### 3.6 Kiosk (M3)

Cùng phiên bản đã phát hành chạy trên tablet tại quầy, tự reset sau mỗi người, khoá điều hướng (GAM-03).

---

## 4. Hành trình chính

### J1 — Chủ quán dựng chương trình từ mục tiêu (M1)

1. Trang chủ → **"Bạn muốn gì?"**: chọn playbook "Tết: kéo khách về quán".
2. Playbook điền sẵn mẫu vòng quay, skin Tết, luật "mỗi khách 1 lượt/ngày", gợi ý quà theo ngân sách. Chị Hà nhập ngân sách 2 triệu và giá vốn từng quà.
3. **Sửa nhanh:** chụp ảnh ly trà sữa vào ô "ảnh sản phẩm", logo vào ô "logo", sửa chữ khuyến mãi. Muốn đặt sticker riêng thì chuyển sang **Tuỳ biến**.
4. **Luật & giải:** xem mô phỏng "1.000 khách thì quà còn lại thế nào"; chỉnh tỷ lệ.
5. Chơi thử bản nháp → bấm **Phát hành**: danh sách kiểm tra (sửa một chạm) + checklist pháp lý → phát hành → màn chia sẻ: QR để in standee, link cho fanpage, mời nhân viên vào quầy đổi quà.

### J2 — Khách chơi (M1)

Quét QR trên bàn → Bìa + thể lệ → form (tên, SĐT) + consent → chơi → **server quyết định kết quả trước khi animate** → Kết quả (trúng / không trúng / hết quà / hết lượt) → mã đổi quà + QR → "Quà của tôi". Hết lượt thì báo lượt tiếp theo khi nào.

### J3 — Nhân viên đổi quà (M1)

Mở Quầy đổi quà trên điện thoại (máy quầy đã ghép QR hoặc tài khoản "chỉ đổi quà") → quét QR, gõ mã, hoặc **tìm theo SĐT** khi khách mất mã → thấy tên quà, hạn, trạng thái → **Xác nhận đã trao** (không hoàn tác) → lượt ghé quán được ghi nhận, kèm quán nào đổi. Trước ngày chạy, nhân viên tập bằng mã chơi thử (chế độ tập huấn).

### J4 — Chủ quán xem kết quả (M1)

Mỗi sáng nhận email tóm tắt hôm qua. Trang tổng quan chương trình: khách tới quầy, khách quay lại, quà đã phát / đã đổi / còn lại, chi phí quà so với ngân sách, so với ngày thường, theo ngày và theo kênh; sau 2–3 ngày, hệ thống báo nhịp phát quà lệch kế hoạch và đề xuất chỉnh. Cuối chương trình: báo cáo một trang để lưu hoặc gửi đối tác.

### J5 — Khách quay lại (M2)

Khách đổi quà xong thấy ngay "Lần sau có quà" trong "Quà của tôi" (quà lần sau, có thể từ M1). Từ M2: thẻ thành viên QR, điểm danh mỗi ngày để tích điểm đổi quà; từ M3: tin "Hôm nay bạn còn 1 lượt" qua Zalo ZNS.

### J6 — Nhân viên Playora kích hoạt gói (M1)

Quán chuyển khoản theo hướng dẫn ở Gói & sử dụng → nhân viên mở `/admin`, tìm tổ chức → đổi gói + hạn, ghi hoá đơn → quán thấy gói mới và hoá đơn trong 24 giờ.

---

## 5. Yêu cầu chức năng

Mỗi nhóm có **bảng tổng hợp** (một dòng một ID) rồi **chi tiết**. Chi tiết M1 gồm: *Hành vi* (người dùng thấy và làm gì), *Quy tắc* (ràng buộc nghiệp vụ, lỗi), *Nghiệm thu* (kiểm được, ưu tiên test tự động). M2 tóm tắt phạm vi; M3 trở đi chỉ có dòng trong bảng.

### 5.1 Tài khoản và tổ chức (ORG)

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| ORG-01 | Đăng nhập email + mật khẩu; Google, magic link | M1 | ✅ (Google bật khi có client id) |
| ORG-02 | Tổ chức, mời thành viên, vai trò `owner/admin/editor/operator/viewer` | M1 | ✅ |
| ORG-02a | Vai trò **"chỉ đổi quà"**: chỉ thấy Quầy đổi quà | M1 | ✅ |
| ORG-06 | Audit log cho mọi hành động ảnh hưởng giải, tiền và dữ liệu | M1 | ✅ một phần: phát hành, tạm dừng/tiếp tục/kết thúc, xoá chương trình, mở lại mã, đổi gói/hoá đơn · ⬜ lượt đổi quà (hiện chỉ ghi trên bản ghi award), tồn kho, export, màn xem audit |
| ORG-10 | **Máy quầy ghép bằng QR**, không cần tài khoản email; quyền chỉ đổi quà; thu hồi một chạm ([D-24](./decisions.md), [ADR-017](../adr/017-counter-device-pairing.md)) | M1 (Must) | ⬜ |
| ORG-07 | 2FA cho owner/admin | M2 | ⬜ |
| ORG-12 | Vai trò **quản lý cửa hàng**: xem số liệu, tồn kho, máy quầy và nhân viên của quán mình; không sửa chương trình (persona chị Thảo, §2.1) | M2 | ⬜ |
| ORG-11 | Luồng **client duyệt**: gửi link xem trước bản nháp cho client (agency) hoặc cấp trên (nhãn hàng), ghi nhận duyệt/góp ý trước khi phát hành (persona §2.2) | M4 | ⬜ |
| ORG-03 | Workspace theo quán cho agency/freelancer | M4 | ⬜ |
| ORG-04 | White-label cơ bản | M4 | ⬜ |
| ORG-05 | Custom domain cho Player | M4 | ⬜ |
| ORG-09 | Reseller/OEM | M4 | ⬜ |

#### ORG-01 · Đăng nhập

- **Hành vi:** màn `/login` có email + mật khẩu, nút Google (chỉ hiện khi môi trường có client id) và magic link gửi qua email. Sau đăng nhập về trang đang mở dở; chưa có tổ chức thì vào `/onboarding`.
- **Quy tắc:** sai thông tin báo lỗi chung, không lộ email đã tồn tại hay chưa; phiên do Better Auth quản lý, cookie `httpOnly`; rate limit đăng nhập theo IP ([security](../engineering/security.md)).
- **Nghiệm thu:** e2e đăng nhập email; API trả 401 cho mọi route cần auth khi không có phiên.

#### ORG-02 · Tổ chức, thành viên, vai trò

- **Hành vi:** người dùng tạo tổ chức ở `/onboarding` và thành **owner**. Owner/admin mời theo email kèm vai trò; người được mời mở `/invite/{id}`, đăng nhập rồi chấp nhận. Trang Thành viên cho đổi vai trò, gỡ thành viên, huỷ lời mời.
- **Quy tắc — ma trận vai trò** (nguồn: `packages/auth/src/permissions.ts`):

  | Quyền | owner | admin | editor | operator | viewer | redeemer ("chỉ đổi quà") |
  |---|---|---|---|---|---|---|
  | Xem chương trình, brand kit, ảnh, gói | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
  | Tạo/sửa/phát hành chương trình, brand kit, ảnh | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
  | Xoá chương trình | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
  | Tra cứu + đổi mã quà | ✅ | ✅ | ✅ | ✅ | chỉ tra cứu | ✅ |
  | Mở lại mã đã đổi nhầm | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
  | Export, xem audit log | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
  | Mời/gỡ thành viên, đổi vai trò | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

  Mọi dữ liệu thuộc một tổ chức; người ngoài tổ chức nhận 403/404, không bao giờ thấy dữ liệu tổ chức khác.
- **Nghiệm thu:** test unit cho ma trận quyền; mỗi module API có test cross-tenant 403/404.

#### ORG-02a · Vai trò "chỉ đổi quà"

- **Hành vi:** nhân viên được mời với vai trò này đăng nhập trên điện thoại, vào thẳng Quầy đổi quà; sidebar chỉ có mục Đổi quà. Màn Chia sẻ của chương trình có nút "Mời nhân viên quầy" mời sẵn vai trò này.
- **Quy tắc:** không xem/sửa chương trình, không xem danh sách khách; API chỉ cho tra cứu và đổi mã.
- **Nghiệm thu:** test cross-role — redeemer gọi bất kỳ API nào ngoài `GET/POST …/vouchers/{code}[/redeem]` đều 403 ([prizes-redemption §9.4](./specs/prizes-redemption.md#9-tiêu-chí-nghiệm-thu-m1)).

#### ORG-06 · Audit log

- **Hành vi:** ghi lại ai, lúc nào, làm gì, trên đối tượng nào, giá trị trước/sau.
  - **Đã ghi:** `campaign.publish`, `campaign.pause` / `resume` / `end`, `campaign.delete`, `voucher.reopen` (kèm lý do), đổi gói và ghi hoá đơn ở back-office, xoá brand kit và xoá ảnh.
  - *Chưa có:* lượt đổi quà (hiện người đổi và thời điểm chỉ nằm trên bản ghi award — đủ cho báo cáo, chưa là audit), gia hạn (đổi ngày kết thúc), điều chỉnh tồn kho, sửa nóng, export, tra cứu theo SĐT (PRZ-15), màn xem audit trong Studio.
- **Quy tắc:** audit chỉ ghi thêm, không sửa/xoá; owner/admin xem được (`audit:read`).
- **Nghiệm thu:** test tích hợp kiểm có dòng audit cho phát hành, tạm dừng/kết thúc, xoá, mở lại mã, đổi gói; mỗi hành động mới trong danh sách *Chưa có* thêm test khi làm.

#### ORG-10 · Máy quầy ghép bằng QR

- **Hành vi:** owner/admin vào Cài đặt → Máy quầy (hoặc nút "Thêm máy quầy" ở màn Chia sẻ) → nhập nhãn ("Máy Tuấn") và quán → hiện QR ghép. Nhân viên quét bằng camera điện thoại → điện thoại mở thẳng Quầy đổi quà, không cần đăng nhập. Danh sách máy có lần dùng cuối và nút **Thu hồi**.
- **Quy tắc:** mã ghép dùng một lần, hết hạn sau 10 phút; máy quầy chỉ có quyền tra cứu, tìm theo SĐT và đổi mã trong một tổ chức; thu hồi có hiệu lực ở request kế tiếp; mỗi lượt đổi ghi máy nào đổi. Số máy theo gói `[GĐ]`: Free 1, Quán 3, Chuỗi 30. Kỹ thuật: [ADR-017](../adr/017-counter-device-pairing.md).
- **Nghiệm thu:** test tích hợp — token máy đổi được mã tổ chức mình, 404 với tổ chức khác, 401/403 với mọi route khác, 401 sau khi thu hồi; mã ghép dùng lại bị từ chối. E2E: thêm máy → ghép → đổi một mã.

**M2 — ORG-07 · 2FA:** TOTP cho owner/admin; bắt buộc khi tổ chức có gói trả phí và bật Export; mã khôi phục một lần.

**M2 — ORG-12 · Quản lý cửa hàng:** vai trò mới gắn với một hoặc nhiều quán (điểm đổi quà PRZ-14): xem Tổng quan lọc theo quán mình, thêm tồn kho cho quán mình (có audit), thêm/thu hồi máy quầy (ORG-10) và mời nhân viên "chỉ đổi quà" cho quán mình; không sửa/phát hành chương trình, không export. Làm cùng PRZ-14 cho gói Chuỗi.

### 5.2 Playbook và kết quả (PLB) — mới ở v4.0

Đặc tả: [specs/playbooks.md](./specs/playbooks.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| PLB-01 | Luồng tạo bắt đầu bằng **mục tiêu**; ≥ 3 playbook F&B (Tết kéo khách, khách quay lại lần 2, ngày vắng) | M1 | ✅ Studio: "Bạn muốn gì?" → thiết lập + đề xuất → editor (3 màn), "Tự chọn mẫu" mở kho mẫu; tag playbook ở trang chương trình · e2e `playbook-create.spec.ts` |
| PLB-02 | Playbook điền sẵn mẫu, skin, luật, gợi ý cơ cấu quà theo **ngân sách** và **giá vốn** quà | M1 | ✅ `lib/playbooks.ts` + `lib/suggest.ts` (q_i = ⌊B·w_i/c_i⌋, Σ q_i·c_i ≤ B có test; tỷ lệ trúng chọn bằng `simulate()` để rủi ro hết quà trước 90% ≤ 10%) |
| PLB-03 | Báo cáo kết quả: khách tới quầy (lượt đổi quà), khách quay lại, chi phí quà so ngân sách, theo ngày/kênh | M1 | ✅ API (`GET …/campaigns/{id}/report`, 4 số chính khớp `awards` trong test tích hợp) · ✅ UI (Tổng quan theo kết quả, e2e `campaign-report.spec.ts`) |
| PLB-04 | Báo cáo một trang cuối chương trình (xem/in/tải) | M1 | ✅ trang `/report` in A4, 3 nhận xét tự sinh |
| PLB-05 | Benchmark ẩn danh theo ngành ("quán trà sữa trung bình đạt X% đổi quà"); hiện cả trên thẻ playbook/mẫu khi chọn | M3 | ⬜ |
| PLB-06 | Playbook cho ngành khác (spa, gym, bán lẻ) | M2–M3 | ⬜ |
| PLB-07 | Gợi ý "chương trình tiếp theo" dựa trên kết quả chương trình trước | M3 | ⬜ |
| PLB-08 | **Mốc so sánh (baseline)**: hỏi số khách ngày thường lúc tạo; Tổng quan hiện "so với ngày thường" (ước tính). Nhập số bill cuối ngày trên điện thoại: M2 | M1 / M2 | ⬜ |
| PLB-09 | Định nghĩa lại "khách quay lại" theo **lượt ghé đã xác thực** (đổi quà hoặc quét thẻ thành viên RET-08) | M2 | ⬜ |
| PLB-10 | Hiệu quả theo quà: tỷ lệ đổi, chi phí/khách từng quà, gợi ý thay quà | M1 (Could) | ⬜ |
| PLB-11 | Báo cáo chia sẻ được: ảnh 4 số chính cho fanpage/Zalo; so sánh 2 chương trình | M2 | ⬜ |

#### PLB-01 · Tạo chương trình từ mục tiêu

- **Hành vi:** `/campaigns/new` mở bằng câu hỏi "Bạn muốn gì?" với 3 thẻ playbook, mỗi thẻ có mục tiêu, cơ chế và chỉ số theo dõi:

  | Playbook (`PlaybookKey`) | Mẫu + skin mặc định | Luật mặc định | Chỉ số |
  |---|---|---|---|
  | Tết kéo khách (`tet_traffic`) | Vòng quay, skin Tết | 1 lượt/ngày, rải quà theo giờ mở cửa | Lượt đổi quà/ngày |
  | Khách quay lại lần 2 (`second_visit`) | Cào thẻ, skin quanh năm | Phải đổi quà lần trước mới chơi tiếp (`requireRedeemBeforeReplay`), 30 ngày | % quay lại trong 14 ngày |
  | Lấp ngày vắng (`slow_days`) | Mở hộp | Chỉ mở các ngày vắng (`openDays`), quà cao hơn | Lượt đổi quà ngày vắng |

  Cuối trang có "Tự chọn mẫu" (kho mẫu, BLD-01). Chọn xong → bước Thiết lập (PLB-02) → Builder ở chế độ Sửa nhanh, đã đủ giải và luật.
- **Quy tắc:** playbook chỉ là cấu hình ban đầu; server không có logic riêng theo playbook. Tag playbook lưu trên chương trình để báo cáo theo mục tiêu.
- **Nghiệm thu:** e2e `playbook-create.spec.ts`: chọn playbook → nhập ngân sách, giá vốn, ngày → vào Builder → bước kiểm tra không còn lỗi chặn về giải/luật.

#### PLB-02 · Gợi ý cơ cấu quà theo ngân sách

- **Hành vi:** chủ quán nhập ngân sách `B`, danh sách quà với giá vốn `c_i` (gợi ý sẵn: size up, topping, giảm giá…), ngày chạy, giờ mở cửa, lưu lượng dự kiến (khách/ngày). Hệ thống đề xuất số lượng từng quà và tỷ lệ trúng, kèm câu: "Với 2 triệu, bạn phát được khoảng 400 phần quà, đủ cho 1 trong 4 khách trúng trong 20 ngày."
- **Quy tắc:** `q_i = ⌊B·w_i/c_i⌋` với `w_i` là tỷ trọng theo playbook; luôn `Σ q_i·c_i ≤ B`; tỷ lệ trúng chọn sao cho mô phỏng cho xác suất hết quà trước 90% thời gian ≤ 10%. Giá vốn = 0 thì quà không tính vào ngân sách (cảnh báo).
- **Nghiệm thu:** unit test `suggest.test.ts` cho bất đẳng thức ngân sách và ngưỡng rủi ro.

#### PLB-03 · Báo cáo kết quả (Tổng quan)

- **Hành vi:** tab Tổng quan hiện theo thứ tự: **Khách tới quầy · Khách quay lại (số và %) · Chi phí quà / ngân sách · Chi phí mỗi khách tới quầy**; biểu đồ theo ngày (lượt chơi, lượt trúng, lượt đổi); bảng theo kênh; quà đã phát / đã đổi / còn lại theo từng loại.
- **Quy tắc:** định nghĩa chỉ số theo [playbooks §3.2](./specs/playbooks.md#32-định-nghĩa-chỉ-số): khách tới quầy = số award `redeemed`; khách quay lại = người chơi có ≥ 2 lần đổi ở 2 ngày khác nhau; chi phí quà chỉ tính quà **đã đổi**. Ngày tính theo múi giờ chương trình (Asia/Ho_Chi_Minh). Lượt chơi thử không tính. Không hiện "doanh thu tăng thêm" ở M1.
- **Nghiệm thu:** test tích hợp — 4 số chính khớp 100% với `awards`; e2e `campaign-report.spec.ts`.

#### PLB-04 · Báo cáo một trang

- **Hành vi:** nút "Xem báo cáo" (luôn có; nổi bật khi chương trình đã kết thúc) mở `/report`: mục tiêu, thời gian, 4 số chính, biểu đồ theo ngày, quà theo loại, 3 nhận xét tự sinh ("Ngày đông nhất: 28 Tết, 64 khách"). In/tải PDF bằng trình duyệt.
- **Nghiệm thu:** hiển thị đúng trên khổ A4 và điện thoại; nhận xét có unit test với dữ liệu mẫu.

#### PLB-08 · Mốc so sánh (baseline)

- **Hành vi:** bước Thiết lập hỏi "Ngày thường quán có khoảng bao nhiêu khách?" — một số chung hoặc theo từng thứ (có thể bỏ qua). Tổng quan và báo cáo một trang hiện "Khách tới quầy hôm nay = 14% khách ngày thường" và "Thứ 3: +18% so với thường lệ" khi playbook là "Lấp ngày vắng".
- **Quy tắc:** luôn ghi chữ **"ước tính, theo số bạn nhập"**; không có baseline thì ẩn dòng so sánh, không đoán. Baseline lưu trên chương trình (sửa được ở Cài đặt). M2: nhân viên/chủ quán nhập "số bill hôm nay" cuối ngày trên điện thoại (máy quầy) để thay số ước tính bằng số thật.
- **Nghiệm thu:** unit test công thức so sánh; báo cáo không hiện so sánh khi thiếu baseline.

#### PLB-10 · Hiệu quả theo quà (Could)

- **Hành vi:** bảng trong Tổng quan: mỗi quà có đã phát, đã đổi, **tỷ lệ đổi**, chi phí/khách tới quầy; quà có tỷ lệ đổi < 50% sau ≥ 30 lượt phát được gợi ý "Ít khách đổi — cân nhắc thay quà ở chương trình sau".
- **Nghiệm thu:** số liệu khớp `awards`.

**M2 — PLB-06 · Playbook ngành khác:** thêm playbook theo dịp cho F&B (khai trương, món mới, sinh nhật quán, 8/3, 30/4, Trung thu, 20/10) trước, sau đó ngành thứ hai (spa/gym/bán lẻ) chọn theo phỏng vấn; mỗi playbook chỉ là dữ liệu trong `lib/playbooks.ts`, không thêm logic server.

**M2 — PLB-09 · Khách quay lại theo lượt ghé:** chỉ số chính đổi thành "người có ≥ 2 lượt ghé đã xác thực ở 2 ngày khác nhau", lượt ghé = đổi quà **hoặc** nhân viên quét thẻ thành viên (RET-08); chỉ số cũ giữ với tên "khách đổi quà ≥ 2 lần". Lý do: với tỷ lệ trúng 25%, khách ghé 4 lần có thể chỉ đổi quà 1 lần.

**M2 — PLB-11 · Báo cáo chia sẻ được:** ảnh 1080×1350 có logo quán + 4 số chính để đăng fanpage/gửi Zalo; trang so sánh 2 chương trình cạnh nhau.

### 5.3 Builder (BLD)

Đặc tả: [specs/builder.md](./specs/builder.md) · UX Studio: [specs/studio-ux.md](./specs/studio-ux.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| BLD-01 | Kho mẫu lọc theo dịp, ngành, mục tiêu; xem trước chơi được | M1 (trong Studio), M2 (công khai, SEO) | ✅ (trong Studio) |
| BLD-02 | Auto-form sinh từ `configSchema` cho phần riêng của mẫu | M2 | ⬜ trong mô hình Campaign (`@playora/ui/auto-form` có sẵn, editor cũ dùng nó đã gỡ 27/10; M1 cơ chế tự suy từ danh sách giải) |
| BLD-03 | Preview thật: cùng renderer với Play, kết quả giả lập chọn được | M1 | ✅ |
| BLD-04 | Brand kit (logo, màu, font) áp cho mọi chương trình | M1 | ✅ |
| BLD-06 | Skin: M1 mỗi mẫu 3 skin (Tết, quanh năm, khai trương) có hình thật; M2 bộ theo dịp | M1/M2 | 🧪 (3 mẫu × 3 skin, chưa có art thật) |
| BLD-07 | Flow chuẩn: Bìa → Form → Game → Kết quả (Trúng / Không trúng; hết lượt, ngoài giờ là thông báo) → Quà của tôi | M1 | ✅ |
| BLD-08 | Phát hành tạo phiên bản bất biến; chỉ chữ/nhãn sửa nóng được, có audit | M1 | ✅ phiên bản bất biến, bản nháp sửa tiếp không ảnh hưởng người chơi · ⬜ sửa nóng (hiện mọi thay đổi phải phát hành lại; M1 Could) |
| BLD-09 | Kiểm tra trước khi phát hành, **sửa một chạm** | M1 | ✅ (các luật ở chi tiết) · ⬜ cảnh báo theo mô phỏng, "chưa chơi thử", màn > 60 phần tử |
| BLD-13 | Thư viện ảnh: upload, tối ưu ảnh, chọn lại ảnh trong Builder, cắt theo ô | M1 | ✅ upload, thư viện, brand kit chọn từ thư viện · ⬜ chọn từ thư viện trong Builder, cắt theo ô (M1 Could) |
| BLD-14 | Tự lưu, undo/redo | M1 | ✅ |
| BLD-15 | Nhân bản chương trình; thùng rác 14 ngày | M2 | ⬜ |
| BLD-19 | **Sửa nhanh** bằng ô thay thế (logo, ảnh sản phẩm, chữ khuyến mãi, ảnh quà) | M1 | ✅ |
| BLD-20 | **Tuỳ biến**: canvas tự do cho mọi màn ([ADR-014](../adr/014-free-canvas-screen-editor.md)) | M1 (beta) | ✅ |
| BLD-21 | **Luật & giải**: chọn cách phát giải trước, luật viết bằng câu, mô phỏng | M1 | ✅ |
| BLD-22 | Chụp ảnh sản phẩm → **tự xoá nền** → cắt theo ô | M2 | ⬜ |
| BLD-23 | Chơi thử bản nháp không trừ kho; link nháp công khai cho ≤ 20 người ngoài tổ chức | M1 | ✅ chơi thử trong Studio (cần đăng nhập) · ⬜ link nháp công khai (M1 Should) |
| BLD-24 | Thêm mẫu mới chỉ bằng một thư mục + lệnh `gen:template` | M1 | ⬜ |
| BLD-25 | **Bìa minh bạch**: số quà còn lại / tổng, danh sách quà có ảnh, lượt còn hôm nay (phần tử canvas, bật sẵn ở màn mặc định) | M1 (Should) | ⬜ |
| BLD-26 | QR cạnh preview mở bản nháp trên điện thoại của chủ quán (cần link nháp công khai BLD-23) | M1 (Should) | ⬜ |
| BLD-27 | Upload logo → tự đề xuất 5 màu brand (phân tích ảnh phía client) | M1 (Could) | ⬜ |
| BLD-28 | Luồng "60 giây": playbook → logo + 1 ảnh sản phẩm → ngân sách → Phát hành; Builder mở sau nếu muốn | M2 | ⬜ |
| BLD-29 | Checklist **"Sẵn sàng mở bán"** sau phát hành (QR đã in, có máy quầy, đã đổi thử mã tập huấn, đã chia sẻ) | M1 (Should) | ⬜ |
| BLD-17 | AI dựng nháp từ một câu tiếng Việt / link fanpage; AI không quyết định kết quả | M2 | ⬜ |
| BLD-16 | Lưu thành mẫu riêng của tổ chức | M4 | ⬜ |
| BLD-18 | Game SDK công khai + marketplace | Later | ⬜ |

#### BLD-01 · Kho mẫu

- **Hành vi:** lưới thẻ mẫu × skin có ảnh; lọc theo dịp (Tết, quanh năm, khai trương), ngành, mục tiêu; bấm thẻ mở xem trước chơi được (kết quả giả lập); "Dùng mẫu này" tạo chương trình nháp với brand kit của tổ chức.
- **Quy tắc:** M1 có 3 mẫu instant-win (`spin-wheel`, `scratch-card`, `gift-box`) × 3 skin (`tet`, `everyday`, `grand-opening`). Mẫu bị tắt ở back-office (M2) không hiện.
- **Nghiệm thu:** e2e tạo chương trình từ kho mẫu.

#### BLD-02 · Cấu hình riêng của mẫu (M2)

- **Hiện tại (M1):** mô hình Campaign không có cấu hình riêng theo mẫu; cơ chế tự suy từ danh sách giải và brand: vòng quay dựng ô từ các giải (tối thiểu 6 ô, xen ô "chúc may mắn", `wheel-math.ts`), cào thẻ hiện kết quả khi cào ≥ 45%, mở hộp có 3 hộp.
- **Đích (M2):** panel "Cấu hình mẫu" hiện các field riêng của mẫu (số ô, thời lượng quay, ngưỡng cào, số hộp…), form sinh từ `configSchema` (zod) bằng `@playora/ui/auto-form` và validate bằng chính schema ở client và server; giải, lịch, lượt chơi, màn shell vẫn là panel nền tảng viết tay.
- **Nghiệm thu (M2):** nhập giá trị ngoài khoảng thì báo lỗi tại field; server từ chối config sai schema (400).

#### BLD-03 · Preview thật

- **Hành vi:** giữa Builder là khung điện thoại render màn đang sửa bằng đúng component của Play (`CanvasScreen` + renderer cơ chế); thanh chọn màn để xem Bìa, Form, Game, Trúng, Không trúng. Muốn thấy luồng thật với kết quả do server quyết định thì bấm Chơi thử (BLD-23).
- **Nghiệm thu:** preview và bản phát hành dùng cùng component (không có renderer riêng cho Studio).

#### BLD-04 · Brand kit

- **Hành vi:** trang Brand kit tạo/sửa: logo, 5 màu (`primary`, `accent`, `background`, `surface`, `text`), font. Chương trình mới lấy brand kit đầu tiên của tổ chức; màu trong canvas là tham chiếu token nên đổi brand kit thì các màn chưa ghi đè đổi theo trong bản nháp.
- **Quy tắc:** thứ tự áp `mẫu mặc định → skin → brand kit → override`. Màu hợp lệ dạng `#RRGGBB[AA]`. Bản đã phát hành không đổi theo brand kit cho tới khi phát hành lại.
- **Nghiệm thu:** test unit thứ tự áp; e2e tạo brand kit (trang tham chiếu của Studio).

#### BLD-06 · Skin

- **Hành vi:** mỗi mẫu có 3 skin; đổi skin trong Sửa nhanh giữ nguyên nội dung người dùng đã thay (logo, ảnh sản phẩm, chữ).
- **Quy tắc:** skin gồm bộ asset cho các ô và màn mặc định (`ScreenDoc`). Pilot cần art thật cho skin Tết và quanh năm (roadmap P2.1).
- **Nghiệm thu:** đổi skin qua lại 3 lần không mất ô đã thay.

#### BLD-07 · Flow chuẩn

- **Hành vi:** mọi mẫu chạy cùng flow Bìa → Form (nếu bật) → Game → Kết quả → Quà của tôi. Bìa, Form, Kết quả, Quà của tôi thuộc shell Play; mẫu chỉ vẽ trong `gameStage`. Kết quả có 2 màn canvas (`resultWin`, `resultLose`), mỗi màn chỉnh chữ/ảnh riêng; hết quà dùng màn Không trúng; hết lượt và ngoài giờ/ngày mở hiện thông báo dạng sheet kèm thời điểm lượt tiếp theo. Chữ dùng được biến `{prize.name}`, `{player.name}`, `{event.name}`.
- **Nghiệm thu:** e2e `play-mechanisms` chạy đủ flow cho 3 mẫu.

#### BLD-08 · Phát hành và sửa nóng

- **Hành vi:** nút Phát hành (sau khi qua BLD-09 và checklist CMP-03) tạo phiên bản bất biến và chuyển sang màn Chia sẻ. Sau khi phát hành, mọi sửa đổi nằm trong bản nháp, Trang chủ báo "Có thay đổi chưa phát hành", phải **phát hành lại** để người chơi thấy; khi phát hành lại có cảnh báo "Thay đổi không ảnh hưởng người chơi đã tham gia" (yêu cầu của luật khuyến mại).
- *Chưa có (M1 Could):* sửa nóng chữ và nhãn nút áp ngay không cần phát hành lại, có audit. Module game cũ có `hotEditable`; mô hình Campaign chưa có.
- **Quy tắc:** người chơi luôn chơi phiên bản đã phát hành mới nhất; mọi lần phát hành ghi audit; phát hành bị chặn khi vượt số chương trình chạy của gói (`PLAN_CAMPAIGN_LIMIT`).
- **Nghiệm thu:** test tích hợp — sửa bản nháp sau phát hành không đổi dữ liệu Play; phát hành có dòng audit.

#### BLD-09 · Kiểm tra trước khi phát hành

- **Hành vi:** bấm Phát hành mở hộp có danh sách lỗi (chặn) và cảnh báo, lỗi xếp trước; mỗi mục có nút đưa tới chỗ cần sửa hoặc tự sửa một chạm (thêm giải mặc định, chia lại xác suất về 100%, dời ngày kết thúc +14 ngày, kéo phần tử vào artboard, tăng cỡ chữ/nút, đổi màu chữ sang `brand.text`). Dưới danh sách là checklist pháp lý (CMP-03). Nút Phát hành chỉ bật khi không còn lỗi **và** checklist đủ.
- **Quy tắc** (nguồn: `features/builder-lab/lib/preflight.ts`):

  | Mức | Đã có | *Chưa có* |
  |---|---|---|
  | **Chặn** | Chưa có giải; giải số lượng ≤ 0; tổng xác suất > 100% (`per_prize_probability`); ngày kết thúc ≤ ngày bắt đầu; ngày kết thúc đã qua; khung game hoặc form nằm ngoài artboard; tiêu đề trống | Giải không gắn ô vòng quay nào |
  | **Cảnh báo** | Tổng quà < 10; chữ < 12 px; tương phản < 3:1 (chữ và nút); nút cao < 44 px; phần tử khác ngoài artboard; chưa chọn loại chương trình (checklist vẫn chặn) | Mô phỏng dự báo hết quà trước 80% thời gian; chưa chơi thử lần nào; màn > 60 phần tử |
- **Nghiệm thu:** unit test `preflight.test.ts` cho từng luật; e2e không phát hành được khi còn lỗi chặn hoặc checklist chưa đủ.

#### BLD-13 · Thư viện ảnh

- **Hành vi:** upload ảnh ở Thư viện ảnh hoặc ngay trong ô thay thế; ảnh được nén/đổi cỡ phía server; chọn lại ảnh đã có từ thư viện. *Còn thiếu:* cắt ảnh theo tỷ lệ của ô.
- **Quy tắc:** chỉ ảnh (PNG, JPEG, WebP, SVG an toàn); giới hạn dung lượng mỗi ảnh và tổng theo tổ chức; bản nháp chỉ lưu URL, không lưu data URL.
- **Nghiệm thu:** upload ảnh sai định dạng/quá cỡ bị từ chối có thông báo; ảnh của tổ chức A không đọc được qua API của tổ chức B.

#### BLD-14 · Tự lưu, undo/redo

- **Hành vi:** mọi thay đổi trong Builder tự lưu sau 800 ms không thao tác; hiện trạng thái lưu (đang lưu / đã lưu / lỗi); Ctrl/⌘+Z, Ctrl/⌘+Shift+Z.
- **Quy tắc:** lưu lỗi thì giữ bản làm việc trên trình duyệt và cho thử lại. *Nên có:* hỏi lại khi đóng tab lúc còn thay đổi chưa lưu.

#### BLD-19 · Sửa nhanh

- **Hành vi:** chế độ mặc định của Builder: danh sách thẻ ô thay thế theo màn (logo, ảnh sản phẩm, chữ khuyến mãi, ảnh từng quà); bấm thẻ để thay ảnh/chữ, preview cập nhật ngay; đổi skin, chỉnh màu brand.
- **Quy tắc:** ô thay thế khai báo trong mẫu (`assetSlots`), kèm ràng buộc tỷ lệ/kích thước/nền trong suốt; mẫu mới tự có Sửa nhanh mà không sửa code Studio.
- **Nghiệm thu:** nghiệm thu builder §9 — 5 người không làm thiết kế dựng chương trình Tết ≤ 10 phút.

#### BLD-20 · Tuỳ biến (canvas tự do, beta)

- **Hành vi:** chuyển sang Tuỳ biến để sửa từng màn như poster: thêm chữ, ảnh, nút, hình, đếm ngược, danh sách giải; kéo, đổi cỡ, xoay, snap, lớp, khoá 2 mức, neo dọc. Khung `gameStage` di chuyển/đổi cỡ được nhưng không xoá được.
- **Quy tắc:** artboard rộng 375; tối đa 200 phần tử/màn (server từ chối hơn); canvas không đọc/ghi được giải hay kết quả. Chỉ desktop ở M1.
- **Nghiệm thu:** chuyển qua lại Sửa nhanh ⇄ Tuỳ biến không mất dữ liệu.

#### BLD-21 · Luật & giải

- **Hành vi:** chế độ Luật & giải gồm các thẻ bước theo thứ tự: (1) chọn **cách phát giải** (`overall_win_rate` mặc định, `per_prize_probability`, `guaranteed`) — chỉ hiện field cách đó cần; (2) danh sách giải (PRZ-01); (3) luật: lượt/ngày, tối đa giải/người, ngày giờ chạy, ngày mở trong tuần, giờ mở cửa, rải quà, ngân sách, phải đổi quà trước khi chơi tiếp, form, mức chống gian lận; luật hiện dạng **câu dễ hiểu** ("Mỗi khách quay 1 lần mỗi ngày, từ 8h đến 22h, từ 20/01 đến 10/02"); (4) pháp lý: loại chương trình, thể lệ tự sinh/sửa (CMP-03, CMP-04). Thẻ mô phỏng (PRZ-08) cập nhật theo mọi thay đổi.
- **Nghiệm thu:** unit test `rules-summary`, `rules-format`, `rules-sim`.

#### BLD-23 · Chơi thử và link nháp

- **Hành vi:**
  - **Đã có:** nút "Chơi thử" trong Builder mở `/play/{id}?rehearsal=1` trong Studio: chạy đủ flow trên **bản nháp** với API thật (`rehearsal-plays`), có nhãn chơi thử. Chỉ thành viên tổ chức đã đăng nhập dùng được.
  - *Chưa có (M1 Should):* **link nháp công khai** gửi cho người ngoài tổ chức (nhân viên chưa có tài khoản, bạn bè) để thử trên điện thoại của họ; mở bằng token khó đoán, tối đa 20 người chơi, thu hồi được.
- **Quy tắc:** lượt chơi thử tự đếm kho riêng (số lượng nháp − quà đã trúng khi thử), không trừ kho thật, không vào báo cáo và quota; vẫn kiểm lịch và giờ mở cửa như thật. Mã quà sinh ra là mã chơi thử — quầy hiện "mã chơi thử" (khi có PRZ-19 thì vào chế độ tập huấn).
- **Nghiệm thu:** test tích hợp — lượt chơi thử không đổi kho thật, không vào report.

#### BLD-24 · `gen:template`

- **Hành vi (dev):** `bun run gen:template <key>` tạo thư mục `packages/templates/src/<key>/` với `definition.ts`, `player.tsx`, màn mặc định 2 skin, test mẫu, và đăng ký vào một nơi duy nhất.
- **Nghiệm thu:** mẫu sinh ra chạy được trong Builder (form, Sửa nhanh, preview) mà không sửa code Studio.

#### BLD-25 · Bìa minh bạch

- **Hành vi:** màn Bìa mặc định của mọi skin có khối "Còn 312 / 400 phần quà" (thanh tiến độ), danh sách quà có ảnh và tên, và dòng "Hôm nay bạn còn 1 lượt" (khi đã biết người chơi). Chủ quán ẩn/hiện hoặc kéo vị trí trong Tuỳ biến.
- **Quy tắc:** số liệu lấy từ API công khai của chương trình (đọc `prizes.remaining`, cache ≤ 30 s); chỉ hiện tổng quà, không lộ tỷ lệ trúng; chương trình `per_prize_probability` có thể tắt dòng số lượng.
- **Nghiệm thu:** số trên Bìa khớp tồn kho sau một lượt trúng (trong vòng 30 s); không làm tăng First Load JS của Play quá ngân sách §6.

#### BLD-26 · QR chơi thử trên điện thoại

- **Hành vi:** cạnh preview có nút "Mở trên điện thoại" hiện QR của link nháp công khai (BLD-23); quét là chơi bản nháp hiện tại trên điện thoại thật, không cần đăng nhập.
- **Quy tắc:** phụ thuộc link nháp công khai; tính vào giới hạn 20 người; nháp đổi thì tải lại trang trên điện thoại là thấy bản mới.

#### BLD-27 · Màu từ logo (Could)

- **Hành vi:** upload logo ở Brand kit hoặc Sửa nhanh → đề xuất bảng 5 màu (chính, nhấn, nền, bề mặt, chữ) đảm bảo tương phản chữ/nền ≥ 4,5:1 → "Dùng bảng màu này" hoặc chỉnh tay.
- **Quy tắc:** chạy phía client, không thêm dịch vụ ngoài.

#### BLD-29 · Checklist "Sẵn sàng mở bán"

- **Hành vi:** màn Chia sẻ sau khi phát hành có 4 mục: đã tải/in QR hoặc standee · đã có ≥ 1 máy quầy hoặc nhân viên "chỉ đổi quà" · nhân viên đã đổi thử 1 mã tập huấn · đã sao chép link kênh fanpage/Zalo. Mục tự tích khi hệ thống thấy hành động tương ứng; Trang chủ "Cần xử lý" nhắc mục còn thiếu khi chương trình sắp chạy.
- **Nghiệm thu:** e2e — phát hành → checklist hiện 0/4 → thêm máy quầy + đổi mã tập huấn → 2/4.

**M2:**
- **BLD-15 · Nhân bản, thùng rác:** nhân bản giữ cấu hình, skin, giải, màn; không chép người chơi/mã; tên "… (bản sao)", trạng thái Nháp. Xoá chuyển vào thùng rác 14 ngày, khôi phục được, sau đó xoá cứng.
- **BLD-22 · Chụp ảnh → xoá nền:** trên điện thoại hoặc upload, tự tách nền sản phẩm, cắt theo ô; nhà cung cấp chốt ở [Q-4](./decisions.md#câu-hỏi-đang-mở).
- **BLD-17 · AI dựng nháp:** AI-1 sinh chữ theo độ dài ô; AI-2 từ một câu tiếng Việt ra playbook + mẫu + skin + giải + luật (JSON validate bằng zod, người dùng duyệt từng mục); AI-3 lấy logo/màu từ link fanpage. AI không bao giờ đặt kết quả hay tỷ lệ ≈ 0 ([builder §4.6](./specs/builder.md#46-ai-dựng-nháp-m2)).
- **BLD-01 (công khai):** chợ mẫu ở `playora.vn`, trang SEO theo dịp/ngành (§3.5).
- **BLD-06 (bộ theo dịp):** 8 mẫu × 8 bộ skin theo dịp.
- **BLD-28 · Luồng "60 giây":** sau khi chọn playbook chỉ hỏi 3 thứ — logo, một ảnh sản phẩm, ngân sách — rồi tự điền ô thay thế, giải, luật, thể lệ và mở bước Phát hành (vẫn qua BLD-09). Nhắm mục tiêu G1 ≤ 5 phút của M2.

### 5.4 Tham gia và chương trình (EVT)

Đặc tả: [specs/participation.md](./specs/participation.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| EVT-01 | Vòng đời suy ra: Nháp → Đã lên lịch → Đang chạy ⇄ Tạm dừng → Đã kết thúc; gia hạn; không xoá khi đang chạy | M1 | ✅ |
| EVT-02 | Danh tính: ẩn danh (thiết bị), form (tên, SĐT), danh sách khách mời | M1 | ✅ ẩn danh, form · ⬜ danh sách khách mời trong mô hình Campaign (có ở module sự kiện cũ, không có UI) · ⬜ danh sách người chơi trong Studio (M1 Should) |
| EVT-05 | Form đăng ký + consent tách mục đích | M1 | ✅ |
| EVT-10 | QR tham gia (PNG/SVG), mẫu standee & tent card | M1 | ✅ |
| EVT-11 | Link theo kênh (`?ch=`) và thống kê theo kênh | M1 | ✅ |
| EVT-13 | Chống gian lận theo mức Thấp/Chuẩn/Cao | M1 (Thấp, Chuẩn), M2 (Cao) | ✅ Thấp/Chuẩn (rate limit, Turnstile trên Play, một thiết bị một người chơi, thu hồi token) · ⬜ Cao |
| EVT-14 | Lượt chơi theo ngày/tổng/khung giờ; thêm lượt khi chia sẻ (giới hạn) | M1/M2 | ✅ M1 (lượt/ngày, giờ và ngày mở cửa) · ⬜ thêm lượt khi chia sẻ (M2) |
| EVT-09 | Chạy thử bằng bot N lượt, không trừ kho thật | M1 | ⬜ |
| EVT-15 | Thao tác khẩn trên điện thoại: tạm dừng/tiếp tục, thêm tồn kho, xem 4 số chính (ngoại lệ của D-12 như màn Đổi quà) | M1 (Could) | ⬜ |
| EVT-03 | OTP SĐT (ZNS ưu tiên, SMS dự phòng) | M2 | ⬜ |
| EVT-16 | Mã tại quầy xoay vòng (4 số, đổi mỗi 30 phút trên máy quầy) để mở lượt — chứng minh khách đang ở quán | M2 | ⬜ |
| EVT-17 | Tuỳ chọn "chơi trước, để lại SĐT khi trúng" | M2 | ⬜ |
| EVT-07 | Mã tham gia (in trên hoá đơn/nắp ly), mỗi mã có QR | M3 | ⬜ |
| EVT-04 | Đăng nhập Zalo / Zalo Mini App | M3 | ⬜ |
| EVT-08 | Up hoá đơn để được lượt (duyệt tay; OCR sau) | M4 | ⬜ |
| EVT-12 | Giới hạn khu vực GPS | M4 | ⬜ |

#### EVT-01 · Vòng đời chương trình

- **Hành vi:** trạng thái hiển thị do hệ thống suy ra từ trạng thái lưu (`draft`/`published`), lịch và cờ tạm dừng — không có ô chọn tay.

  | Trạng thái | Khi nào | Được làm |
  |---|---|---|
  | Nháp | Chưa phát hành | Sửa tự do, chơi thử, xoá |
  | Đã lên lịch | Đã phát hành, chưa tới `startsAt` | Sửa bản nháp rồi phát hành lại; tạm dừng; tự chạy khi tới giờ |
  | Đang chạy | Trong khoảng `startsAt`–`endsAt`, không tạm dừng | Theo dõi, tạm dừng khẩn cấp, kết thúc ngay, gia hạn; đổi giải/tồn kho bằng cách sửa bản nháp và phát hành lại (thêm tồn kho trực tiếp: PRZ-01, M1 Should) |
  | Tạm dừng | Chủ quán bấm tạm dừng | Tiếp tục (bị chặn nếu vượt số chương trình chạy của gói) |
  | Đã kết thúc | Qua `endsAt` hoặc bấm kết thúc ngay | Báo cáo; đổi quà vẫn mở tới hạn (kết thúc + 7 ngày); gia hạn bằng cách đặt ngày kết thúc mới (giữ dữ liệu); xoá |
- **Quy tắc:** không xoá được chương trình Đã lên lịch / Đang chạy / Tạm dừng (409 `CAMPAIGN_RUNNING`); xoá là xoá mềm. Player hiện thông báo trạng thái tương ứng (chưa mở, tạm dừng, đã kết thúc, ngoài giờ/ngày mở).
- **Nghiệm thu:** unit test `phase.test.ts`; test tích hợp xoá chương trình đang chạy bị từ chối.

#### EVT-02 · Danh tính người chơi

- **Hành vi:** mỗi trình duyệt có `deviceId`. Chương trình bật form thì người chơi nhập tên + SĐT (định dạng VN, chuẩn hoá về một dạng); tắt form thì chơi ẩn danh theo thiết bị.
- **Quy tắc:** một SĐT là một người chơi trong mỗi chương trình; SĐT đã gắn với thiết bị khác thì báo trùng (409), không gộp phiên ([D-22](./decisions.md); cách cứu mã quà: D-25). Một thiết bị một người chơi mỗi chương trình. Danh sách khách mời (import, mã cá nhân) có ở module sự kiện cũ, chưa có trong mô hình Campaign — không cần cho pilot quán.
- *Chưa có (M1 Should):* danh sách người chơi trong Studio (tab Người chơi hiện mới liệt kê lượt chơi).
- **Nghiệm thu:** test tích hợp SĐT trùng khác thiết bị → 409; cùng thiết bị → tiếp tục phiên cũ.

#### EVT-05 · Form và consent

- **Hành vi:** màn Form có tên, SĐT và hai ô consent tách mục đích: (1) **bắt buộc** — đồng ý thể lệ và xử lý dữ liệu để tham gia/nhận quà; (2) **tuỳ chọn** — nhận tin khuyến mãi từ quán. Link chính sách dữ liệu và thể lệ.
- **Quy tắc:** consent marketing không được tích sẵn; lưu thời điểm, phiên bản văn bản và mục đích của từng consent ([compliance](../business/compliance.md)). Cảnh báo chủ quán khi thêm trường nhạy cảm.
- **Nghiệm thu:** không gửi form được khi chưa tích consent bắt buộc; danh sách người chơi hiện đúng trạng thái consent marketing.

#### EVT-10 · QR và vật in

- **Hành vi:** màn Chia sẻ có QR của link chương trình (hoặc link theo kênh đang chọn), tải PNG/SVG; trang in `/share/print` có mẫu standee và tent card mang logo, màu brand, tên chương trình, QR, câu kêu gọi.
- **Nghiệm thu:** QR quét bằng camera iPhone/Android mở đúng link; trang in vừa khổ A4/A5.

#### EVT-11 · Link theo kênh

- **Hành vi:** ở màn Chia sẻ, chủ quán thêm kênh (tên + mã kênh, gợi ý QR bàn, fanpage, Zalo OA) và nhận link `?ch=` cùng QR riêng; bảng theo kênh hiện lượt chơi, lượt trúng, lượt đổi, tỷ lệ đổi.
- **Quy tắc:** kênh ghi theo **từng lượt chơi**, lấy từ `?ch=` của link người chơi đang mở (một người chơi có thể có lượt ở nhiều kênh); mã kênh trùng trong một chương trình bị từ chối; không có `ch` thì là "trực tiếp".
- **Nghiệm thu:** unit test `channels.test.ts`; report nhóm đúng theo kênh.

#### EVT-13 · Chống gian lận (Thấp, Chuẩn)

- **Hành vi:** chủ quán chọn mức trong Luật chơi; mặc định **Chuẩn**. Người chơi không thấy gì ở mức Chuẩn trừ khi bị nghi ngờ (Turnstile hiện thử thách).
- **Quy tắc:** cả hai mức: server quyết định kết quả, token lượt dùng một lần, một thiết bị một người chơi. **Thấp** (danh sách khách mời, wifi chung): rate limit lỏng, không Turnstile. **Chuẩn**: rate limit theo IP/thiết bị/phiên người chơi, Turnstile, thu hồi token khi bất thường. Blacklist, gắn cờ tự động (lượt bị gắn cờ không nhận giải) và giới hạn tốc độ phát giải đến cùng mức **Cao** ở M2 ([participation §4](./specs/participation.md#4-chống-gian-lận-theo-mức)).
- **Nghiệm thu:** PRD §7.6 — script chơi lặp từ một thiết bị/IP bị chặn ở mức Chuẩn.

#### EVT-14 · Lượt chơi và thời gian mở

- **Hành vi:** chủ quán đặt lượt/ngày (1–100), ngày bắt đầu/kết thúc, ngày mở trong tuần, giờ mở cửa. Hết lượt thì Player hiện thông báo "Lượt tiếp theo: 8:00 sáng mai".
- **Quy tắc:** ngày tính theo múi giờ chương trình; lượt chỉ bị trừ khi lượt chơi thật sự được tạo (lỗi mạng retry cùng token không trừ hai lần); ngoài giờ/ngày mở thì không tạo lượt (outcome `closed`).
- **Nghiệm thu:** test tích hợp lượt thứ `playsPerDay + 1` trong ngày trả `no_turns`; ngoài giờ trả `closed`.

#### EVT-09 · Chạy thử bằng bot

- **Hành vi:** trong hộp Phát hành (hoặc thẻ mô phỏng), nút "Chạy thử N lượt" (100–10.000) chạy bot qua chính API lượt chơi ở chế độ chơi thử, rồi hiện quà còn lại và chi phí như mô phỏng.
- **Quy tắc:** không trừ kho thật, không vào báo cáo/quota; dùng cùng code đường đi với lượt thật để bắt lỗi cấu hình.
- **Nghiệm thu:** sau khi chạy, tồn kho thật (`prizes.issued` / `remaining`) không đổi.

#### EVT-15 · Thao tác khẩn trên điện thoại (Could)

- **Hành vi:** trang Vận hành của chương trình hiển thị gọn trên điện thoại: 4 số chính, tồn kho từng quà với nút "+ thêm", nút Tạm dừng/Tiếp tục. Các tab khác vẫn desktop-first.
- **Quy tắc:** cùng quyền và audit như trên desktop; thao tác tạm dừng có hộp xác nhận.

**M2:**
- **EVT-03 · OTP SĐT:** bật theo chương trình (bắt buộc ở mức Cao); ZNS ưu tiên, SMS dự phòng; chặn đầu số ảo; tính phí bằng credit (BIL-04).
- **EVT-13 · mức Cao:** OTP bắt buộc, chặn VPN/proxy và đầu số ảo, gắn cờ tự động + duyệt tay trước khi phát giải lớn.
- **EVT-14 · thêm lượt khi chia sẻ:** tối đa N lượt thêm/ngày; lượt thêm **chỉ được cộng khi người được mời ghé quán và đổi quà** (thưởng lượt ghé thật, không thưởng spam link); không yêu cầu bạn bè đăng ký (không ép rủ bạn).
- **EVT-16 · Mã tại quầy xoay vòng:** máy quầy hiện mã 4 số đổi mỗi 30 phút; chương trình bật tuỳ chọn này thì người chơi phải nhập mã để mở lượt. Chống "farm" lượt từ xa mà không cần OTP; làm chỉ số "Lấp ngày vắng" đáng tin. Dễ bị coi là **gắn với mua hàng** → CMP-03 nhắc thông báo Sở Công Thương.
- **EVT-17 · Chơi trước, SĐT sau:** bỏ màn Form trước game; chỉ người trúng nhập tên + SĐT + consent trước khi thấy mã. Giữ một thiết bị một người chơi và D-22. Đo bằng A/B: tỷ lệ quét → chơi lượt đầu (mục tiêu ≥ 70%) và tỷ lệ đổi quà.

### 5.5 Giữ chân (RET) — engine thứ ba

Đặc tả: [participation §3](./specs/participation.md#3-giữ-chân).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| RET-01 | Điểm danh mỗi ngày, chuỗi ngày, quà theo mốc | M2 | ⬜ |
| RET-02 | Bốc mỗi ngày (mỗi ngày một lượt mới) | M2 | 🧪 (lượt theo ngày) |
| RET-03 | Nhắc quay lại: tin "còn lượt hôm nay", voucher sắp hết hạn (ZNS) | M3 | ⬜ |
| RET-04 | Hub điểm thưởng của quán | M3 | ⬜ |
| RET-05 | Sưu tầm thẻ (không ép rủ bạn) | M3 | ⬜ |
| RET-06 | **Quà lần sau (bounce-back)**: đổi quà xong được tặng ngay một voucher cố định cho lần ghé sau, dùng từ ngày mai, hạn 14 ngày | M1 (Could) / M2 | ⬜ |
| RET-07 | Nút "Quan tâm Zalo OA của quán" trên Kết quả và Quà của tôi (link do quán cấu hình) | M1 (Should) | ⬜ |
| RET-08 | Thẻ thành viên QR cá nhân trong Quà của tôi; nhân viên quét được cả khi khách không có quà → ghi một lượt ghé | M2 | ⬜ |

#### RET-06 · Quà lần sau (Could)

- **Hành vi:** ở bước Giải thưởng, chủ quán bật "Quà lần sau" và chọn một quà cố định (ví dụ "Giảm 10% ly tiếp theo") với giá vốn và số lượng. Khi nhân viên bấm Xác nhận đã trao, màn quầy hiện "Nhắc khách: lần sau có quà"; "Quà của tôi" của khách hiện voucher mới với nhãn "Dùng từ ngày mai".
- **Quy tắc:** đây là **quà tặng không ngẫu nhiên**, ghi rõ trong thể lệ tự sinh (CMP-04); tính vào tồn kho và ngân sách như mọi quà; mỗi khách tối đa 1 quà lần sau còn hiệu lực; không phát cho mã chơi thử; đổi được từ 00:00 ngày hôm sau theo múi giờ chương trình, hạn 14 ngày `[GĐ]`. Lượt đổi quà lần sau là một lượt ghé đã xác thực → nuôi chỉ số "khách quay lại".
- **Nghiệm thu:** test tích hợp — đổi mã thường sinh đúng một voucher quà lần sau; đổi voucher đó trong cùng ngày bị từ chối với thông báo "Dùng từ ngày mai"; hết tồn kho quà lần sau thì không phát, không lỗi.

#### RET-07 · Nút Zalo OA

- **Hành vi:** Cài đặt chương trình có ô "Link Zalo OA của quán"; nếu có, màn Kết quả và Quà của tôi hiện nút "Quan tâm quán trên Zalo".
- **Quy tắc:** chỉ là link ngoài, Playora không nhận dữ liệu từ Zalo; link được kiểm tra thuộc tên miền Zalo.
- **Nghiệm thu:** không có link thì ẩn nút.

**M2:**
- **RET-01 · Điểm danh:** mỗi lần ghé quán được xác thực bằng mã tại quầy thì cộng một ngày vào chuỗi; quà theo mốc 3/7/14 ngày cấu hình được; Quà của tôi hiện chuỗi hiện tại và mốc kế tiếp. Chỉ số: chuỗi trung bình.
- **RET-02 · Bốc mỗi ngày:** chương trình chạy dài, mỗi ngày một lượt mới (đã có qua `playsPerDay`); thêm màn Kết quả nói rõ "Mai quay tiếp", lịch sử các ngày đã bốc, nút thêm lối tắt vào màn hình chính. Chỉ số: % khách chơi ≥ 2 ngày.
- **RET-08 · Thẻ thành viên QR:** "Quà của tôi" có QR cá nhân của khách trong tổ chức; quầy quét thẻ khi khách ghé mà không có quà → ghi lượt ghé (nền cho RET-01, PLB-09). Cần hồ sơ khách theo tổ chức (ANL-08).
- **RET-06 (M2 nếu không kịp M1):** như trên, thêm tuỳ chọn quà lần sau theo mốc lần ghé thứ 2/3.

### 5.6 Game (GAM)

Danh mục: [specs/game-catalog.md](./specs/game-catalog.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| GAM-01 | Instant-win: token lượt chơi dùng một lần; server quyết định kết quả và giải trước khi client animate | M1 | ✅ |
| GAM-02 | Skill: server xác thực điểm (thời lượng, tốc độ tối đa, plausibility) trước khi xét giải | M2 (dời từ M1, roadmap §1.4) | ⬜ |
| GAM-03 | Cùng phiên bản chạy trên Player và Kiosk | M1/M3 | ⬜ |
| GAM-04 | Renderer: vòng quay, cào thẻ, mở hộp (instant, M1); hứng quà (skill, dời M2) | M1 / M2 | ✅ vòng quay, cào thẻ, mở hộp (API thật, e2e `play-mechanisms`) · ⬜ hứng quà (dời M2 theo roadmap §1.4) |
| GAM-05 | Cảm giác trúng: haptic, âm thanh, confetti; tải trước asset game khi đang ở Bìa | M2 | ⬜ |

#### GAM-01 · Instant-win do server quyết định

- **Hành vi:** người chơi bấm chơi → client gọi API lượt chơi kèm `deviceId`, token lượt, Turnstile (mức Chuẩn) → server kiểm điều kiện (lịch, lượt, giới hạn, gian lận), gọi prize engine trong một giao dịch, trừ kho nguyên tử, cấp mã đổi quà → trả `{ playId, outcome: win | lose | no_turns | closed, reason?, prize?, voucher?, turnsLeftToday }` → client chỉ animate tới kết quả đã biết (vòng quay chọn một ô khớp kết quả rồi dừng ở đó).
- **Quy tắc:** API idempotent theo `requestId` của người chơi (gọi lại trả cùng kết quả); client không gửi kết quả; không có đường nào định trước người trúng; hộp/ô còn lại **không** lật ra "giải lẽ ra trúng". Mỗi lượt ghi log đủ để kiểm toán.
- **Nghiệm thu:** test tích hợp gọi lại cùng token không tạo lượt thứ hai; PRD §7.3–7.4.

#### GAM-04 · Renderer M1

- **Hành vi:**
  - **Vòng quay (`spin-wheel`):** ô dựng từ danh sách giải (tối thiểu 6 ô, xen ô "chúc may mắn"); server quyết định kết quả, client chọn một ô khớp kết quả để dừng; trượt/hết quà dừng ở ô "chúc may mắn". Số ô tuỳ chỉnh: BLD-02 (M2).
  - **Cào thẻ (`scratch-card`):** cào bằng ngón tay; cào ≥ 45% thì hiện kết quả; người dùng bàn phím/công tắc có nút hiện kết quả; kết quả đã có trước khi cào.
  - **Mở hộp (`gift-box`):** 3 hộp; chọn hộp nào cũng ra kết quả server đã quyết định; thể lệ ghi rõ. Biến thể trứng vàng, lì xì, lưới 9 ô: M2.
- **Quy tắc:** chơi được bằng một ngón tay trên máy cũ, trong trình duyệt Zalo/FB; bundle mỗi mẫu ≤ 300 KB gzip, ≥ 30 fps.
- **Nghiệm thu:** e2e `play-mechanisms` cho 3 mẫu; QA thiết bị theo PRD §7.7.

**M2:**
- **GAM-02 + GAM-04 (hứng quà):** `catch-items` 20–60 s, vật phẩm là ảnh sản phẩm của quán; server cấp `playId` + `seed` lúc bắt đầu, nhận `{ score, durationMs, telemetry }` lúc kết thúc, kiểm plausibility rồi mới xét giải theo `score_threshold`.
- **Renderer instant-win mới:** đập trứng, lật thẻ, lưới 9 ô, slot, gacha — chỉ là renderer, không đụng prize engine ([D-07](./decisions.md)).

### 5.7 Giải và đổi quà (PRZ)

Đặc tả: [specs/prizes-redemption.md](./specs/prizes-redemption.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| PRZ-01 | Giải: tên, ảnh, loại, số lượng, **giá vốn** | M1 | ✅ · ⬜ thêm/bớt tồn kho khi đang chạy không cần phát hành lại (M1 Should) |
| PRZ-05 | Cách phát: `per_prize_probability`, `overall_win_rate`, `guaranteed`; trừ kho nguyên tử | M1 | ✅ |
| PRZ-06 | `score_threshold` (skill); `scheduled_moments`, `rank_based` | M2 (`score_threshold` dời từ M1 cùng hứng quà) | ⬜ |
| PRZ-07 | Rải quà: `time_uniform`, `opening_hours` (M1); `batch_release`, `end_flush` (M2) | M1/M2 | ✅ (`time_uniform`, `opening_hours`) |
| PRZ-08 | Mô phỏng phát giải trước khi phát hành | M1 | ✅ (có chi phí quà dự kiến so ngân sách, ngày mở trong tuần) |
| PRZ-09 | Mã đổi quà, **ngân sách tổng**, giới hạn giải/người; kho mã voucher đối tác (import), giải an ủi không giới hạn | M1 / M2 | ✅ sinh mã 6 ký tự, ngân sách, giới hạn giải/người cho cả chương trình · ⬜ import mã đối tác, giải an ủi không giới hạn, giới hạn theo ngày/loại (M2) |
| PRZ-03 | Thông báo trúng trên Player ("Quà của tôi") | M1 | ✅ |
| PRZ-10 | **Đổi quà tại quầy**: quét/nhập mã, không hoàn tác, chống đổi hai lần; hạn đổi | M1 | ✅ · hạn đổi cố định = kết thúc + 7 ngày, ⬜ chỉnh theo chương trình (M1 Could) |
| PRZ-15 | **Tra mã theo SĐT ở quầy** khi khách mất mã ([D-25](./decisions.md)) | M1 (Must) | ⬜ |
| PRZ-16 | **Lưu và khôi phục mã quà**: nút "Lưu mã" (Zalo, ảnh); khôi phục "Quà của tôi" trên thiết bị mới bằng SĐT + 4 ký tự cuối của mã ([D-25](./decisions.md)) | M1 (Must) | ⬜ |
| PRZ-17 | Nhãn quán cho mỗi máy quầy/lượt đổi; báo cáo theo quán (bản tối giản của PRZ-14) | M1 (Should) | ⬜ |
| PRZ-18 | Quầy dạng PWA: cài lên màn hình chính, giữ quyền camera, rung + âm báo, chữ kết quả rất to | M1 (Should) | ⬜ |
| PRZ-19 | Chế độ tập huấn: mã chơi thử bấm Xác nhận được ở quầy, không ghi số liệu | M1 (Should) | ⬜ |
| PRZ-22 | **Theo dõi nhịp phát quà** khi đang chạy: lưu lượng thật vs dự kiến, dự báo quà dư/thiếu, đề xuất tỷ lệ trúng + phát hành lại một chạm | M1 (Should, tuần đầu pilot) | ⬜ |
| PRZ-14 | Điểm đổi quà theo cửa hàng (chuỗi nhiều quán) | M2 | ⬜ |
| PRZ-20 | Nhật ký quầy theo nhân viên/máy + cờ bất thường (đổi < 2 phút sau khi trúng cùng IP máy quầy; > X mã/giờ) | M2 | ⬜ |
| PRZ-21 | Quà hết hạn chưa đổi quay về kho (tuỳ chọn, ghi trong thể lệ; **cần ý kiến luật sư**) | M2 | ⬜ |
| PRZ-11 | Thông báo trúng qua email/ZNS | M3 | ⬜ |
| PRZ-02 | Bốc thăm cuối chương trình (commit–reveal, trang công bố) | M2 | ⬜ |
| PRZ-04 | Biên bản PDF (thể lệ, giải, người trúng, log) | M2 | ⬜ |
| PRZ-12 | Tặng quà theo danh sách (không ngẫu nhiên). **Không** định trước người trúng | M3 | ⬜ |
| PRZ-13 | e-gift, điểm thưởng qua webhook | M4 | ⬜ |

#### PRZ-01 · Giải thưởng

- **Hành vi:** thêm/sửa/xoá giải ở bước 2 của Luật & giải: tên (≤ 120 ký tự), ảnh, số lượng, giá vốn (VND), xác suất (chỉ khi `per_prize_probability`). Mỗi lần trúng sinh một mã đổi quà tại quầy.
- **Quy tắc:** M1 chỉ có một loại giải: **quà đổi tại quầy** (hiện vật, dịch vụ, giảm giá tại quán); "không trúng" là kết quả, không phải giải. Mã voucher của đối tác (import), giải an ủi không giới hạn và quà số: M2. Số lượng 0–1.000.000; giá vốn là số nguyên VND ≥ 0. Sửa giải sau khi phát hành phải phát hành lại.
- *Chưa có (M1 Should):* thêm/bớt tồn kho khi đang chạy không cần phát hành lại, có audit; không cho giảm dưới số đã phát.
- **Nghiệm thu:** server từ chối giải sai schema (400).

#### PRZ-05 · Cách phát giải và trừ kho

- **Hành vi:** chọn một cách phát cho cả chương trình:
  - `overall_win_rate` (mặc định playbook): một tỷ lệ trúng tổng; khi trúng chọn giải theo tồn kho còn lại.
  - `per_prize_probability`: mỗi giải một xác suất (thang 1/10.000), tổng ≤ 100%.
  - `guaranteed`: ai chơi cũng trúng một giải còn hàng (khai trương, tri ân).
- **Quy tắc:** trừ kho, ngân sách, giới hạn/người trong cùng một giao dịch; tồn kho không bao giờ âm; hết quà, vượt ngân sách hay vượt giới hạn/người đều trả kết quả `lose` (kèm lý do nội bộ), không phải lỗi.
- **Nghiệm thu:** PRD §7.3 — 1.000.000 lượt mô phỏng, 50 luồng: 0 vượt.

#### PRZ-07 · Rải quà theo thời gian

- **Hành vi:** công tắc "Rải đều quà suốt chương trình" (`time_uniform`) và giờ/ngày mở cửa (`opening_hours`, `openDays`).
- **Quy tắc:** `time_uniform` cho phát tới đường kế hoạch + `buffer`%; khung thiếu người chơi thì quà dồn sang khung sau; ngoài giờ mở cửa không phát.
- **Nghiệm thu:** PRD §7.3 — quà còn lại bám đường kế hoạch ± 10%.

#### PRZ-08 · Mô phỏng

- **Hành vi:** chủ quán nhập lưu lượng dự kiến (khách/ngày); mô phỏng chạy `simulate()` nhiều lần và trả lời bằng câu + biểu đồ: quà còn lại theo ngày, khả năng hết quà trước ngày kết thúc, tỷ lệ trúng khách thấy, chi phí quà dự kiến / ngân sách.
- **Quy tắc:** mô phỏng dùng đúng code prize engine thật (`packages/core/src/prize`), có tính ngày mở trong tuần; kết quả nuôi cảnh báo BLD-09.
- **Nghiệm thu:** unit test `rules-sim.test.ts`.

#### PRZ-09 · Mã voucher, ngân sách, giới hạn

- **Hành vi:** mỗi lần trúng sinh một mã ngắn chữ in hoa, bỏ ký tự dễ nhầm (0/O, 1/I) + QR; ngân sách tổng theo giá vốn; tối đa giải/người cho cả chương trình. *Còn thiếu ở M1:* import kho mã voucher của đối tác từ CSV.
- **Quy tắc:** mã duy nhất trong tổ chức; vượt ngân sách thì ngừng phát giải có giá vốn (vẫn phát giải an ủi giá 0 nếu có); không trúng lặp cùng giải vượt giới hạn.
- **Nghiệm thu:** PRD §7.3.

#### PRZ-03 · Quà của tôi

- **Hành vi:** sau khi trúng, màn Kết quả có nút "Xem quà của tôi"; trang `/{slug}/prizes` liệt kê mọi quà của người chơi trên thiết bị: tên, ảnh, mã, QR, hạn đổi, nơi đổi, trạng thái.
- **Quy tắc:** trạng thái luôn lấy từ server; có đồng hồ chạy theo thời gian thực để nhân viên phân biệt với ảnh chụp màn hình; mã đã đổi hiện "Đã đổi lúc …".
- **Nghiệm thu:** đổi mã ở quầy → tải lại Quà của tôi hiện "Đã đổi".

#### PRZ-10 · Đổi quà tại quầy

- **Hành vi:** xem §3.3. Tra cứu mã (quét, gõ, hoặc tìm theo SĐT — PRZ-15) → thấy thông tin → **Xác nhận đã trao** → ghi người/máy đổi, quán, thời điểm; lượt ghé quán được tính vào báo cáo.
- **Quy tắc:**
  - Một mã chỉ đổi một lần, kể cả dưới yêu cầu đồng thời (cập nhật có điều kiện).
  - Không hoàn tác với nhân viên; đổi nhầm thì **owner** mở lại mã ngay tại Quầy đổi quà, bắt buộc lý do (3–500 ký tự), có audit.
  - Hạn đổi: ngày kết thúc chương trình + 7 ngày (cố định trong code, `VOUCHER_GRACE_MS`; chỉnh theo chương trình: M1 Could); quá hạn thì từ chối với thông báo rõ. Gia hạn chương trình thì mã phát sau đó có hạn mới; mã đã phát giữ hạn cũ.
  - Mã của tổ chức khác → "không thuộc quán" (không lộ thông tin); mã chơi thử → chế độ tập huấn (PRZ-19).
  - **Không bao giờ từ chối vì hạn mức gói** ([D-23](./decisions.md)); hạn mức được giữ ở lúc phát giải (BIL-02). *Hiện code vẫn chặn ở 110% (`PLAN_REDEMPTION_LIMIT`) theo D-21 cũ — cần sửa.*
- **Nghiệm thu:** PRD §7.5; test cross-role ORG-02a; quét → kết quả ≤ 2 s trên 4G; test tích hợp đổi mã khi tổ chức đã vượt hạn mức vẫn thành công.

#### PRZ-15 · Tra mã theo SĐT ở quầy

- **Hành vi:** quầy có tab "Tìm theo SĐT": nhân viên gõ SĐT khách → danh sách mã **chưa đổi, còn hạn** của SĐT đó trong tổ chức (tên quà, chương trình, tên khách) → nhân viên hỏi tên để đối chiếu → chọn mã → Xác nhận đã trao như bình thường.
- **Quy tắc:** chỉ thành viên có `voucher:redeem` hoặc máy quầy; không hiện mã đã đổi/hết hạn, không hiện SĐT khác; SĐT chuẩn hoá trước khi tìm; rate limit theo người/máy (ví dụ 20 lần tra/giờ `[GĐ]`); mỗi lần tra và đổi theo SĐT ghi audit với cờ `via=phone`. Báo cáo tỷ lệ lượt đổi qua SĐT để theo dõi lạm dụng.
- **Nghiệm thu:** test tích hợp — tra SĐT trả đúng mã chưa đổi của tổ chức mình, không trả mã tổ chức khác; vượt rate limit → 429; có dòng audit.

#### PRZ-16 · Lưu và khôi phục mã quà

- **Hành vi:** màn Kết quả (trúng) và Quà của tôi có nút **"Lưu mã"**: chia sẻ qua Web Share (Zalo "Cloud của tôi", Messenger) hoặc tải ảnh mã có QR. Trên thiết bị/trình duyệt mới, "Quà của tôi" có link "Không thấy quà? Khôi phục" → nhập SĐT + 4 ký tự cuối của một mã đã nhận → thiết bị được gắn với người chơi đó và thấy toàn bộ quà.
- **Quy tắc:** thiết bị cũ vẫn giữ quyền xem (khách hay dùng song song Zalo và Safari). Sai quá 5 lần/giờ theo SĐT hoặc thiết bị thì khoá 1 giờ; ghi audit. Không dùng để **chơi** thêm lượt: D-22 vẫn áp cho lượt chơi. Khi có OTP (M2) thì thay 4 ký tự bằng OTP.
- **Nghiệm thu:** test tích hợp — khôi phục đúng SĐT + mã → thấy quà; sai → 400 chung (không lộ SĐT có tồn tại hay không); quá số lần → 429. E2E: trúng ở trình duyệt A, khôi phục ở trình duyệt B, đổi ở quầy.

#### PRZ-17 · Nhãn quán (Should)

- **Hành vi:** máy quầy có nhãn quán khi ghép (ORG-10); thành viên đăng nhập chọn quán một lần trên thiết bị. Mỗi lượt đổi ghi `storeLabel`; Tổng quan và báo cáo có bảng "Theo quán".
- **Quy tắc:** chỉ là nhãn để báo cáo — chưa giới hạn tồn kho/quyền theo quán (để PRZ-14 ở M2).

#### PRZ-18 · Quầy dạng PWA (Should)

- **Hành vi:** quầy có manifest + nút "Thêm vào màn hình chính"; mở như app toàn màn hình; camera bật ngay; kết quả hiện bằng khối màu chữ rất to ("ĐỔI ĐƯỢC" xanh / "ĐÃ ĐỔI LÚC 14:02" đỏ / "HẾT HẠN"), rung và âm khác nhau cho đúng/sai.
- **Quy tắc:** không đổi quà offline (phải có server để chống đổi hai lần); mất mạng thì báo rõ và giữ mã để thử lại.

#### PRZ-19 · Chế độ tập huấn (Should)

- **Hành vi:** quét mã sinh từ lượt chơi thử ở quầy hiện khung vàng "Mã chơi thử — đây là cách đổi quà"; nhân viên bấm Xác nhận được, thấy đúng màn thành công, kèm chữ "Không tính vào số liệu".
- **Quy tắc:** không ghi lượt đổi thật, không vào báo cáo/quota; có ghi nhận "đã tập" để tích checklist BLD-29.

#### PRZ-22 · Theo dõi nhịp phát quà (Should)

- **Hành vi:** từ ngày thứ 2 của chương trình, Tổng quan có thẻ "Nhịp phát quà": lưu lượng thật/ngày so với dự kiến, đường quà còn lại thật so với kế hoạch, dự báo khi kết thúc ("dư ~40% quà" / "hết quà ngày 03/02"). Lệch > 20% thì đề xuất một con số (ví dụ "Tăng tỷ lệ trúng 25% → 32%") với nút **Áp dụng** → mở bản nháp đã sửa và phát hành lại sau xác nhận. Trang chủ "Cần xử lý" và email tóm tắt (ANL-10) nhắc khi lệch.
- **Quy tắc:** đề xuất tính bằng `simulate()` với lưu lượng thật của các ngày đã qua; chỉ đề xuất, không tự đổi cấu hình; phát hành lại vẫn qua BLD-09 và cảnh báo "không ảnh hưởng người chơi đã tham gia"; không bao giờ đề xuất tỷ lệ ≈ 0.
- **Nghiệm thu:** unit test với dữ liệu lưu lượng thấp/cao hơn dự kiến cho ra đề xuất đúng chiều; đề xuất mới vẫn giữ rủi ro hết quà trước 90% thời gian ≤ 10%.

**M2:**
- **PRZ-06:** `score_threshold` cho hứng quà; `scheduled_moments` (mỗi đơn vị giải có thời điểm mở, người chơi đầu tiên sau đó trúng); `rank_based` (phát theo hạng khi kết thúc, chủ quán xác nhận trước).
- **PRZ-07:** `batch_release` (mở kho theo đợt), `end_flush` (N phút cuối chuyển sang `guaranteed`).
- **PRZ-14 · Điểm đổi quà:** chuỗi nhiều quán khai báo điểm đổi; nhân viên gắn với điểm; báo cáo và giới hạn theo điểm.
- **PRZ-02 · Bốc thăm cuối chương trình:** chốt tập ứng viên → công bố commit → quay từng hạng → huỷ có lý do → công bố `serverSeed`; trang công bố công khai ([prizes-redemption §7](./specs/prizes-redemption.md#7-bốc-thăm-cuối-chương-trình-m2)).
- **PRZ-04 · Biên bản PDF:** thể lệ, cơ cấu giải, danh sách người trúng (SĐT che bớt), log phát/đổi; dùng cho báo cáo Sở Công Thương.
- **PRZ-09 (bổ sung):** import kho mã voucher CSV; đổi hàng loạt bằng CSV.
- **PRZ-20 · Nhật ký quầy theo nhân viên/máy:** số lượt đổi theo người/máy/ca; cờ bất thường "đổi trong < 2 phút sau khi trúng, cùng IP với máy quầy", "một người/máy đổi > X mã/giờ", "tỷ lệ đổi qua SĐT cao bất thường"; chủ quán xem và đánh dấu đã kiểm.
- **PRZ-21 · Quà hết hạn quay về kho:** tuỳ chọn theo chương trình; khi mã quá hạn đổi, đơn vị quà trả lại tồn kho để phát tiếp (nếu chương trình còn chạy). Phải ghi trong thể lệ; ảnh hưởng tới báo cáo giá trị giải không có người trúng (CMP-05) — **chờ ý kiến luật sư** trước khi làm.

### 5.8 Báo cáo và tích hợp (ANL)

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| ANL-01 | Tổng quan chương trình: lượt chơi, khách, quà đã phát/đã đổi/còn lại, theo ngày (xem PLB-03 cho chỉ số kết quả) | M1 | ✅ |
| ANL-02 | Export CSV/XLSX: người chơi (kèm consent), người trúng, mã đã đổi | M1 | ⬜ |
| ANL-10 | **Email tóm tắt hằng ngày** cho owner/admin: 4 số hôm qua, % quà còn lại, nhịp phát quà lệch, mục "Sẵn sàng mở bán" còn thiếu (Zalo OA/ZNS: M3) | M1 (Should) | ⬜ |
| ANL-04 | Phễu: mở link → form → chơi → trúng → đổi; theo kênh | M2 | ⬜ |
| ANL-08 | **Hồ sơ khách theo tổ chức** (gộp theo `phoneHash` qua mọi chương trình): số lượt ghé, quà đã đổi, chương trình đã chơi, consent — cần ADR mô hình dữ liệu | M2 | ⬜ |
| ANL-09 | Bản đồ nhiệt giờ × thứ (lượt chơi, lượt đổi) | M2 | ⬜ |
| ANL-05 | Webhook `player.registered`, `play.completed`, `prize.awarded`, `prize.redeemed` | M4 | ⬜ |
| ANL-07 | Tích hợp POS (KiotViet, Sapo): ghi nhận đơn hàng sau khi đổi quà | M4 | ⬜ |
| ANL-06 | Public API | M4 | ⬜ |

#### ANL-01 · Tổng quan vận hành

- **Hành vi:** ngoài 4 số kết quả (PLB-03): lượt chơi hôm nay/tổng, số người chơi, tồn kho từng giải (cảnh báo dưới 20%), lượt chơi gần đây (thời gian, kênh, kết quả). Trang chủ tổng hợp "Cần xử lý" từ các chương trình. *Chưa có:* số lượt bị chặn bởi chống gian lận (cùng mức Cao, M2).
- **Nghiệm thu:** số liệu khớp `stats` API; e2e Tổng quan.

#### ANL-02 · Export

- **Hành vi:** nút Export ở tab Người chơi và Giải & đổi quà; chọn loại (người chơi, người trúng, mã đã đổi) và định dạng CSV/XLSX; file tạo nền (BullMQ), có link tải khi xong.
- **Quy tắc:** chỉ owner/admin (`export:create`); file có cột consent marketing; chỉ người có consent marketing mới có SĐT đầy đủ trong export "danh sách liên hệ"; mỗi lần export ghi audit; link tải hết hạn sau 24 giờ `[GĐ]`.
- **Nghiệm thu:** test tích hợp happy path, 403 cho editor/operator, cross-tenant 404, có dòng audit.

#### ANL-10 · Email tóm tắt hằng ngày (Should)

- **Hành vi:** 7:30 sáng (giờ VN) mỗi ngày có chương trình đang chạy, owner/admin nhận email: "Hôm qua: 42 khách tới quầy · 6 khách quay lại · chi 180.000đ quà · còn 61% quà", kèm dòng cảnh báo (quà < 20%, nhịp phát lệch PRZ-22, checklist BLD-29 còn thiếu) và nút về Tổng quan. Không có hoạt động thì không gửi.
- **Quy tắc:** job nền trong worker (BullMQ); người nhận tắt được trong cài đặt cá nhân; số liệu dùng cùng nguồn với PLB-03; không chứa dữ liệu cá nhân của khách.
- **Nghiệm thu:** unit test nội dung email với dữ liệu mẫu; test job không gửi cho tổ chức không có chương trình chạy.

**M2 — ANL-04 · Phễu:** đếm mở link → gửi form → chơi → trúng → đổi, theo kênh và theo ngày; tỷ lệ chuyển giữa các bước.

**M2 — ANL-08 · Hồ sơ khách theo tổ chức:** hiện người chơi tách theo từng chương trình (D-22), nên không thấy "khách quen" giữa chương trình Tết và chương trình tháng 3. Gộp theo `phoneHash` ở cấp tổ chức, giữ consent theo mục đích; là nền cho RET-01, RET-04, RET-08, PLB-09 và benchmark. Cần ADR (mô hình dữ liệu, quyền xoá theo CMP-01).

**M2 — ANL-09 · Bản đồ nhiệt:** lưới giờ × thứ cho lượt chơi và lượt đổi; phục vụ playbook "Lấp ngày vắng" và cấu hình giờ mở cửa.

### 5.9 Gói và thanh toán (BIL)

Giá: [business-model §3](../business/business-model.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| BIL-01 | Kích hoạt gói thủ công, hoá đơn thủ công | M1 | ✅ API (`/admin/orgs…` cho nhân viên Playora trong `PLATFORM_ADMIN_EMAILS`, có audit log) · ✅ UI back-office Studio `/admin`: tìm tổ chức, đổi gói + hạn + ghi chú, ghi hoá đơn; trang Gói & sử dụng có lịch sử hoá đơn và hướng dẫn chuyển khoản (kích hoạt trong 24 giờ) |
| BIL-02 | Quota theo gói (lượt đổi quà/tháng, số chương trình chạy) + watermark gói Free | M1 | ✅ API + Play (chặn phát hành/tiếp tục `PLAN_CAMPAIGN_LIMIT`, chặn đổi quà quá 110% `PLAN_REDEMPTION_LIMIT` theo D-21 cũ, badge "Tạo bằng Playora"; `GET …/billing` trả usage) · ✅ Studio: trang Gói & sử dụng (thanh usage, cảnh báo 80%/100% + giải thích ân hạn), banner trên Trang chủ và quầy đổi quà, thông báo `PLAN_CAMPAIGN_LIMIT` khi publish/tiếp tục, `PLAN_REDEMPTION_LIMIT` ở quầy · ⬜ **chuyển điểm chặn sang lúc phát giải theo [D-23](./decisions.md)** (M1 Must) |
| BIL-03 | Tự thanh toán thuê bao qua PayOS (VietQR) | M2 | ⬜ |
| BIL-04 | Credit OTP/ZNS | M3 | ⬜ |
| BIL-05 | Hoá đơn điện tử tự động | M4 | ⬜ |

#### BIL-01 · Kích hoạt gói thủ công

- **Hành vi:** xem J6. Back-office đổi gói (`free` / `shop` / `chain`), ngày hết hạn, ghi chú; ghi hoá đơn (số tiền, kỳ, cách thanh toán). Quán thấy lịch sử hoá đơn ở Gói & sử dụng.
- **Quy tắc:** chỉ email trong `PLATFORM_ADMIN_EMAILS`; mọi thay đổi ghi audit; hết hạn gói trả phí thì tự về giới hạn Free (dữ liệu giữ nguyên).
- **Nghiệm thu:** test tích hợp 404 với người không phải nhân viên; có audit khi đổi gói.

#### BIL-02 · Hạn mức theo gói

- **Quy tắc:** nguồn: `packages/core/src/billing/plans.ts`.

  | Gói | Chương trình chạy cùng lúc | Lượt đổi quà/tháng (trần cứng +10%) | Watermark |
  |---|---|---|---|
  | Free | 1 | 100 (110) | Có |
  | Quán (`shop`) | 3 | 2.000 (2.200) | Không |
  | Chuỗi (`chain`) | Không giới hạn | 10.000 (11.000) | Không |

  Đơn vị tính là **lượt đổi quà tại quầy** theo tháng dương lịch (Asia/Ho_Chi_Minh), không phải lượt chơi ([D-20](./decisions.md)). "Chương trình chạy" = đã phát hành và đang chạy/đã lên lịch. Soạn thảo không giới hạn ở mọi gói.
- **Hành vi (theo [D-23](./decisions.md)):** cảnh báo ở 80% và 100% (Studio, email tóm tắt). Khi **mã còn hiệu lực đã phát + lượt đã đổi trong tháng** chạm trần cứng (hạn mức + 10%), prize engine ngừng phát giải mới cho các chương trình của tổ chức: lượt chơi vẫn chạy, người chơi nhận kết quả không trúng với chữ "Hôm nay quà đã hết, quay lại sau nhé"; Studio hiện banner "Đã tạm ngừng phát quà vì hết hạn mức — nâng gói để phát tiếp". **Quầy luôn đổi được mã đã phát.** Phát hành/tiếp tục vượt số chương trình bị chặn với thông báo và nút nâng gói.
- **Nghiệm thu:** unit test `plans.test.ts`; test tích hợp cho `PLAN_CAMPAIGN_LIMIT`; test tích hợp — ở trần cứng, lượt chơi mới không trúng và không trừ kho, còn đổi mã đã phát vẫn 200.

**M2 — BIL-03 · PayOS:** chọn gói + kỳ (tháng/năm) → VietQR → webhook PayOS kích hoạt tự động, tự gia hạn nhắc trước 7 ngày; hoá đơn ghi vào cùng lịch sử với BIL-01.

### 5.10 Back-office (ADM)

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| ADM-01 | Danh sách tổ chức, gói, usage; impersonate có log | M1 | ✅ API danh sách/tìm tổ chức kèm gói + usage (`GET /admin/orgs`) · ✅ UI Studio `/admin` (404 với người không phải nhân viên) · ⬜ impersonate |
| ADM-02 | Lịch chương trình sắp chạy (để chuẩn bị tải, hỗ trợ) | M1 | ⬜ |
| ADM-03 | Quản lý mẫu/skin (bật/tắt, gán gói) | M2 | ⬜ |

#### ADM-01 · Tổ chức và impersonate

- **Hành vi:** tìm tổ chức theo tên/email owner; mỗi dòng có gói, hạn, usage tháng này, số chương trình chạy. *Còn thiếu:* "Xem như tổ chức này" (impersonate) để hỗ trợ.
- **Quy tắc:** impersonate chỉ đọc mặc định, có banner rõ trên mọi trang, tự hết sau 30 phút, mỗi phiên ghi audit (ai, tổ chức nào, lý do).

#### ADM-02 · Lịch chương trình sắp chạy

- **Hành vi:** danh sách chương trình sẽ chạy trong 14 ngày tới (tổ chức, thời gian, lưu lượng dự kiến, khung giờ quan trọng) để chuẩn bị tải và không deploy vào khung đó ([runbook](../operations/runbook.md)).

**M2 — ADM-03:** bật/tắt mẫu và skin, gán mẫu cho gói; mẫu đang được chương trình chạy dùng thì không tắt được.

### 5.11 Tuân thủ (CMP)

Pháp lý: [compliance](../business/compliance.md).

| ID | Yêu cầu | GĐ | Hiện trạng |
|---|---|---|---|
| CMP-03 | Hỏi "loại chương trình" khi tạo (gắn mua hàng hay không); checklist pháp lý và nhắc thông báo Sở Công Thương trước phát hành | M1 | ✅ API (`compliance.promotionType`, `checklistAcknowledgedAt`) · ✅ UI Studio |
| CMP-04 | Sinh thể lệ từ cấu hình (thời gian, giải, số lượng, giá trị, cách xác định trúng); chủ quán sửa được | M1 | ✅ API + Play (`generateTerms`, "Thể lệ đầy đủ" trên Play, `compliance.termsText` ghi đè) · ✅ UI sửa trong Studio |
| CMP-01 | Người chơi yêu cầu xem/xoá/rút consent; chủ quán xử lý trong Studio | M2 | ⬜ |
| CMP-02 | Hạn lưu dữ liệu mặc định 12 tháng, tự ẩn danh hoá | M2 | ⬜ |
| CMP-05 | Báo cáo giá trị giải không có người trúng, kèm số tiền ước tính phải trích nộp (chương trình may rủi) | M2 | ⬜ |
| CMP-06 | Sinh sẵn hồ sơ thông báo khuyến mại gửi Sở Công Thương từ cấu hình (**cần luật sư duyệt mẫu**) | M2 | ⬜ |

#### CMP-03 · Loại chương trình và checklist pháp lý

- **Hành vi:** bước 4 (Pháp lý) của Luật & giải hỏi "Khách có phải mua hàng mới được chơi không?" → `purchase_linked` / `not_linked`, kèm giải thích hệ quả. Hộp Phát hành có checklist: (1) xác nhận quán là đơn vị tổ chức và chịu trách nhiệm trao giải; (2) đã xem thể lệ; (3) nếu gắn mua hàng: đã/sẽ thông báo Sở Công Thương trước khi chạy.
- **Quy tắc:** chưa chọn loại chương trình là cảnh báo trong danh sách kiểm tra, nhưng checklist bắt buộc chọn loại và tích đủ mục mới bật nút Phát hành; lưu `checklistAcknowledgedAt`.
- **Nghiệm thu:** unit test `publish-compliance.test.ts`.

#### CMP-04 · Thể lệ tự sinh

- **Hành vi:** thể lệ sinh từ cấu hình (đơn vị tổ chức, thời gian, đối tượng, cơ cấu giải với số lượng và giá trị, cách xác định trúng — ghi rõ kết quả do hệ thống quyết định ngẫu nhiên, cách và hạn nhận quà, xử lý dữ liệu); chủ quán sửa trong Studio (ghi đè), có nút "Khôi phục bản tự sinh". Player có link "Thể lệ đầy đủ".
- **Quy tắc:** thể lệ ghi đè không tự cập nhật khi đổi giải. *Nên có:* cảnh báo khi cấu hình (giải, thời gian) đổi sau lần ghi đè thể lệ.

**M2:**
- **CMP-01 · Quyền của người chơi:** link "Dữ liệu của tôi" trên Player gửi yêu cầu xem/xoá/rút consent (xác thực bằng thiết bị hoặc OTP); Studio có hàng đợi yêu cầu, hạn xử lý theo luật; xoá = ẩn danh hoá, giữ số liệu tổng hợp và award để không lệch báo cáo.
- **CMP-02 · Hạn lưu:** job hằng ngày ẩn danh hoá dữ liệu cá nhân sau 12 tháng kể từ khi chương trình kết thúc.
- **CMP-05 · Giải không có người trúng:** khi kết thúc, báo cáo giá trị giải đã công bố / đã trao / không có người trúng, kèm số tiền ước tính phải trích nộp ngân sách với chương trình may rủi ([compliance §2](../business/compliance.md)); phục vụ nghĩa vụ báo cáo khuyến mại.
- **CMP-06 · Hồ sơ thông báo khuyến mại:** từ cấu hình (thời gian, địa điểm, cơ cấu giải, tổng giá trị, thể lệ) điền sẵn mẫu thông báo gửi Sở Công Thương để chủ quán tải về và nộp; CMP-03 dẫn tới đây khi chương trình gắn mua hàng.

**Đã bỏ:** BLD-05 (kế thừa brand kit theo client, gộp vào ORG-03), BLD-10/11/12 (run-of-show, screen editor, quiz), toàn bộ LIV-* (live engine). Xem [archive](../archive/).

---

## 6. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
|---|---|
| Hiệu năng Player | First load ≤ 2 s trên 4G; First Load JS `play /[slug]` ≤ 260 KB gzip (trần 280; [ADR-016](../adr/016-shadcn-luma-ui.md), thay ADR-013); mỗi mẫu lazy-load ≤ 300 KB; ≥ 30 fps máy cũ |
| Play API | Đỉnh ≥ 500 lượt/giây/chương trình (M1); quyết định kết quả + trừ kho p95 < 200 ms |
| Quầy đổi quà | Từ quét mã đến kết quả ≤ 2 s trên 4G |
| Khả dụng | 99,9%/tháng; không deploy trong khung giờ đánh dấu "quan trọng" ([runbook](../operations/runbook.md)) |
| Tính đúng | 0 sai lệch tồn kho; mọi lần trúng và đổi quà có bản ghi (award: lượt chơi, giải, mã, ai/máy nào đổi, lúc nào); hành động của người vận hành ghi audit (ORG-06) |
| Bảo mật | OWASP ASVS L2; RBAC; test cross-tenant tự động ([security](../engineering/security.md)) |
| Riêng tư | Luật 91/2025/QH15: consent tách mục đích, quyền xoá/xuất, lưu 12 tháng ([compliance](../business/compliance.md)) |
| Trình duyệt | iOS Safari ≥ 16, Chrome Android ≥ 100, trình duyệt trong Zalo/FB |
| i18n | Mọi chuỗi giao diện qua i18n, có cả vi và en; vi là chuẩn; mã lỗi mới phải có bản dịch (test bắt buộc) |

---

## 7. Tiêu chí nghiệm thu M1 (sẵn sàng pilot)

1. **Vòng lõi:** trên điện thoại thật, quét QR → chơi → nhận mã → nhân viên đổi tại quầy → số liệu hiện trên Tổng quan, tất cả qua API thật.
2. **Builder:** 5 người không làm thiết kế dựng được chương trình Tết có logo + ảnh sản phẩm từ playbook trong ≤ 10 phút, ≤ 2 lần hỏi.
3. **Prize engine:** 1.000.000 lượt mô phỏng với 50 luồng đồng thời: **0** vượt tồn kho, ngân sách, giới hạn/người; bật `time_uniform` thì quà còn lại bám đường kế hoạch ± 10%.
4. **Tải:** k6 đỉnh 500 lượt/giây trong 10 phút: p95 < 200 ms, 0 lỗi 5xx, số liệu khớp DB.
5. **Đổi quà:** một mã chỉ đổi được một lần dưới 20 yêu cầu đồng thời; mã hết hạn bị từ chối; mã đã phát luôn đổi được kể cả khi tổ chức đã chạm hạn mức gói (D-23); khách đổi trình duyệt vẫn đổi được quà (tra theo SĐT hoặc khôi phục, D-25).
6. **Chống gian lận:** script chơi lặp từ một thiết bị/IP bị chặn theo mức Chuẩn (rate limit, Turnstile, một thiết bị một người chơi). Gắn cờ tự động và "lượt bị gắn cờ không nhận giải" thuộc mức Cao (M2), không nằm trong nghiệm thu M1.
7. **Thiết bị:** chạy trên iPhone SE, iPhone 12, Samsung A-series, Xiaomi tầm thấp, trình duyệt trong Zalo/FB.
8. **Báo cáo:** số khách tới quầy và chi phí quà khớp 100% với dữ liệu đổi quà.

### 7.1 Việc M1 còn mở

Tổng hợp từ cột Hiện trạng, để theo dõi trước pilot. Mức ưu tiên Must / Should / Could theo [D-26](./decisions.md) và [D-28](./decisions.md): thiếu thời gian thì cắt từ Could lên, không dời mốc pilot.

| Ưu tiên | ID | Việc còn thiếu | Ghi chú |
|---|---|---|---|
| **Must** | BIL-02 | Chuyển điểm chặn hạn mức sang lúc phát giải; quầy không bao giờ từ chối | D-23 |
| **Must** | PRZ-15, PRZ-16 | Tra mã theo SĐT ở quầy; lưu + khôi phục "Quà của tôi" | D-25 |
| **Must** | ORG-10 | Máy quầy ghép QR | D-24, ADR-017 |
| Must | BLD-06 | Art thật cho skin Tết và quanh năm | roadmap P2.1 |
| Should | PRZ-18, PRZ-19 | Quầy PWA; chế độ tập huấn | |
| Should | ANL-10 | Email tóm tắt hằng ngày | |
| Should | PRZ-17 | Nhãn quán khi đổi quà | Persona có 3 quán |
| Should | BLD-25, BLD-26, BLD-29 | Bìa minh bạch; QR chơi thử trên điện thoại; checklist "Sẵn sàng mở bán" | |
| Should | RET-07, PLB-08 | Nút Zalo OA; câu hỏi baseline | |
| Should | PRZ-22 | Theo dõi nhịp phát quà | Có thể làm trong tuần đầu pilot |
| Should | ANL-02 | Export CSV/XLSX | Cần cho quán liên hệ khách quay lại |
| Should | BLD-23 | Link nháp công khai (≤ 20 người ngoài tổ chức) | Điều kiện cho BLD-26 |
| Should | EVT-02 | Danh sách người chơi trong Studio (tab Người chơi mới có lượt chơi) | |
| Should | PRZ-01 | Thêm/bớt tồn kho khi đang chạy không cần phát hành lại, có audit | Tết hay hết quà giữa chừng |
| Could | BLD-08 | Sửa nóng chữ/nhãn không cần phát hành lại | |
| Could | PRZ-10 | Chỉnh hạn đổi quà theo chương trình (hiện cố định kết thúc + 7 ngày) | |
| Could | BLD-09 | Cảnh báo theo mô phỏng, "chưa chơi thử", màn > 60 phần tử | |
| Could | RET-06 | Quà lần sau | Tác động lớn nhất tới G5; không kịp thì M2 |
| Could | PLB-10, BLD-27, EVT-15 | Hiệu quả theo quà; màu từ logo; thao tác khẩn trên điện thoại | |
| Could | BLD-13 | Chọn ảnh từ thư viện trong Builder; cắt ảnh theo ô | |
| Could | BLD-24 | Lệnh `gen:template` | Tới khi có: copy `spin-wheel` |
| Could | EVT-09 | Chạy thử bằng bot N lượt | |
| Could | ADM-01, ADM-02 | Impersonate có log; lịch chương trình sắp chạy | |
| Could | ORG-06 | Audit lượt đổi quà, gia hạn, tồn kho, export; màn xem audit | Lượt đổi quà nên lên Should khi làm PRZ-15 |
| — | GAM-02, GAM-04, PRZ-06 | Hứng quà + `score_threshold` | Đã dời M2 (roadmap §1.4) |
| — | GAM-03 | Kiosk | M3 |

---

## 8. Câu hỏi mở

Xem [decisions.md — Câu hỏi đang mở](./decisions.md#câu-hỏi-đang-mở).

---

## 9. Lịch sử phiên bản

| Phiên bản | Ngày | Thay đổi chính |
|---|---|---|
| **v4.3** | 31/10/2026 | Rà soát PRD với code: sửa Builder thành 3 chế độ + hộp Phát hành (không phải 4 bước); chơi thử hiện chỉ trong Studio, link nháp công khai là việc còn mở; tab Người chơi là danh sách lượt chơi; mở lại mã nằm ở Quầy đổi quà; hạn đổi cố định kết thúc + 7 ngày; luật kiểm tra trước phát hành theo `preflight.ts`; audit thực tế; chống gian lận M1 không có blacklist/gắn cờ; M1 chỉ có loại giải "quà đổi tại quầy". Mục tiêu §1 có cách đo rõ và giai đoạn. Ưu tiên Must/Should/Could ghi ở cả §3. Chuẩn hoá thêm cùng đợt rà soát tài liệu: tab "Chia sẻ & QR"; cơ chế M1 tự suy từ danh sách giải (vòng quay ≥ 6 ô, cào 45%, 3 hộp), BLD-02 sang M2; tồn kho ở `prizes.issued/remaining`; BLD-13 chưa chọn ảnh từ thư viện trong Builder; UI theo [ADR-016](../adr/016-shadcn-luma-ui.md) (D-29) |
| v4.2 | 31/10/2026 | Persona tương lai (agency, nhãn hàng) và quản lý cửa hàng ([D-27](./decisions.md)); ID từ review tính năng ([D-23…D-26](./decisions.md)) |
| v4.1 | 31/10/2026 | Bản đồ tính năng theo bề mặt (§3); chi tiết hành vi · quy tắc · nghiệm thu cho từng ID M1 |
| v4.0 | 26/10/2026 | Theo strategy v4.0: playbook, báo cáo kết quả, North Star lượt đổi quà |
