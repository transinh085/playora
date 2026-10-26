# Phân tích chi tiết Guandayun / 凡科互动: cơ chế game và builder

Cập nhật: 25/10/2026 · Bổ sung cho [11-game-builder-research.md](builder-research.md) · Đầu vào cho bản chiến lược v3.0 (SME, mobile-first, builder) và [12-builder-spec.md](../product/specs/builder.md)

> **Đọc với bối cảnh (26/10/2026):** đề xuất ở §4 đã được chốt thành [D-05, D-07, D-08, D-10](../product/decisions.md) và đưa vào [specs/builder](../product/specs/builder.md), [specs/prizes-redemption](../product/specs/prizes-redemption.md), [specs/participation](../product/specs/participation.md).

> **Phạm vi sao chép:** Playora được phép sao chép **cơ chế game, cấu trúc editor, các trường cấu hình và mô hình prize/participation**, vì đây là ý tưởng và cách vận hành phổ biến trong ngành. Playora **không** sao chép art, skin, nhân vật, âm thanh, code, câu chữ, tên template hay thương hiệu của 凡科/Guandayun.
>
> **Nguồn:** help center của guandayun.com trả HTTP 429 trong suốt phiên khảo sát. Vì Guandayun là OEM của 凡科 ([11 §2.1](builder-research.md#21-danh-tính-và-quan-hệ-oem)), chi tiết chủ yếu lấy từ hd.fkw.com. Catalog được parse từ `hd.fkw.com/game.html` ngày 24/10/2026. **[CXM]** = chưa xác minh từ nguồn chính thức.

---

## 1. Tóm tắt

1. **1.709 template nhưng chỉ có 111 engine (`rstyle`), tương đương khoảng 90 cơ chế khác nhau.** Kho mẫu lớn là nhờ **nhiều skin trên cùng một engine**, không phải nhờ nhiều cơ chế. Riêng engine "bốc thăm bấm nút" (R115) đã có 140 skin. Điều này xác nhận nguyên tắc "cơ chế ít, skin nhiều" của Playora.
2. **Các game bốc thăm trúng ngay dùng chung một logic server.** Vòng quay, lưới 9 ô, mở hộp, cào, đập trứng, lật thẻ, gacha, máy xèng và lắc điện thoại khác nhau ở **cách hiển thị**, còn cách quyết định kết quả là một: tổng 中奖率 cộng với tồn kho. Vì vậy Playora có thể làm **một engine instant-win với nhiều renderer**.
3. **Editor là form chia tab, chỉ có trên PC.** Người dùng chọn **派奖方式** (cách phát giải) trước, sau đó editor mới hiện các trường liên quan. **Không có bằng chứng 凡科 cho soạn hoạt động trên điện thoại**: điện thoại chỉ dùng để đổi quà và cho nhân viên lấy mã. Một Studio mobile-first là khác biệt thật của Playora.
4. **Gói Free không khoá editor, chỉ khoá quy mô:** 50 người chơi và 10 lần publish. Người dùng soạn tự do, chỉ trả tiền khi cần chạy thật.
5. **Lịch theo mùa có 40 nhãn lễ.** Cụm Tết âm lịch là lớn nhất (腊八 → 元宵, khoảng 138 template). Template không gắn mùa ("通用") chiếm 639.
6. **Những thứ không làm theo:** số người tham gia ảo, phiếu ảo, robot đặt điểm ảo trên bảng xếp hạng, upload sẵn danh sách người trúng **[CXM]**, lì xì tiền mặt, dự đoán hoặc chia quỹ (gần với cá cược), các cơ chế lan truyền ép rủ bạn bè, quiz, bình chọn, màn hình lớn tại sự kiện.

---

## 2. Catalog theo nhóm

### 2.1 Số lượng template

| Nhóm | Số template | Gồm |
|---|---|---|
| 游戏营销 (game) | 721 | 答题 197 · 反应 123 · 手速 109 · 动作 95 · 益智 58 · 接物 54 · 消除 45 · 跳跃 29 · 场景布置 11 |
| 抽奖 (bốc thăm) | 363 | |
| 商业促销 | 261 | Flash sale, mua nhóm, mặc cả |
| 裂变引流 | 138 | Rủ bạn bè, gom like, sưu tầm thẻ |
| 投票竞猜 | 128 | |
| 长期活动 | 53 | Điểm danh, nuôi cây, điểm thưởng |
| 现场活动 | 23 | |
| AR | 11 | |
| 红包 | 10 | |
| **Tổng** | **1.709** | |

Đối chiếu với số Guandayun công bố: 198 quiz và 130 bình chọn khớp với catalog. Con số 582 template bốc thăm **không khớp** (catalog chỉ có 363) **[CXM]**.

### 2.2 Bốc thăm trúng ngay (instant-win): cùng một logic, nhiều cách hiển thị

Cách quyết định thắng: **tổng 中奖率**. Khi đã trúng, giải được chọn theo tồn kho. Không đặt tỉ lệ riêng cho từng giải.

| Cơ chế | Tiếng Việt | Template | Slot asset riêng | Playora |
|---|---|---|---|---|
| 抽好礼 bấm nút | Bốc thăm bấm nút | 140 | Kiểu trình bày | ✅ |
| 幸运开箱 / 盲盒 | Mở rương / hộp mù | 90 | Rương, nắp mở | ✅ (đã có: gift box) |
| 九宫格 | Lưới 9 ô | 21 | 8 ô giải + nút giữa | ✅ |
| 翻牌抽奖 | Lật thẻ bốc thăm | 21 | Mặt và lưng thẻ | ✅ |
| 摇一摇 | Lắc điện thoại | 18 | Cảm biến chuyển động | ✅ |
| 刮刮乐 | Thẻ cào | 16 | Lớp phủ, nền | ✅ (đã có) |
| 砸金蛋 | Đập trứng / hộp | 13 | Trứng, búa | ✅ |
| 定时抽奖 / 锦鲤 | Quay số theo giờ hẹn | 10 | Thời điểm mở thưởng | ⚠️ thành "bốc thăm cuối chương trình" (M2) |
| 扭蛋机 | Máy gacha | 7 | Bóng, máy | ✅ |
| 晒图 / 小票抽奖 | Up hoá đơn để bốc | 5 | Bước duyệt ảnh | ✅ **rất hợp với SME bán lẻ** |
| 老虎机 | Máy xèng | 3 | Biểu tượng cuộn | ✅ (cân nhắc hình ảnh cờ bạc) |
| 幸运大转盘 | Vòng quay | 1 + các skin R115 | Ô giải | ✅ (đã có) |
| 天天抽奖 | Bốc mỗi ngày | 2 | Giải theo từng ngày | ✅ |
| 火山喷发礼物雨 | Mưa quà | 1 | | ✅ |
| 许愿抽奖 | Viết điều ước, thả đèn để bốc thăm | 2 | Đèn, lời ước | ✅ (skin Tết, Trung thu) |
| 中秋博饼 | Gieo xúc xắc | 1 | Bảng tổ hợp → hạng giải | ✅ (làm skin Tết "bầu cua" được, cần cân nhắc hình ảnh cờ bạc) |
| 多轮竞猜 | Dự đoán nhiều vòng | 6 | | ❌ gần cá cược |

### 2.3 Game kỹ năng

**Cách thắng:**
- Theo hạng: admin phát giải thủ công; hoà điểm thì ai đạt trước xếp trên.
- Hoặc đạt điểm ngưỡng thì được một lượt bốc thăm.

**Cấu hình chung:** thời gian chơi (giây), đơn vị điểm, âm thanh khi chạm, tỉ lệ trúng.

**Slot asset chung:** nền, nhân vật, vật cộng điểm, vật trừ điểm hoặc bom, nhạc.

| Cơ chế | Tiếng Việt | Template | Playora |
|---|---|---|---|
| 接物品 | Hứng đồ rơi | 54 | ✅ (đã có: catch items) |
| 手速点击 | Chạm nhanh (bóc kiện hàng…) | 39 | ✅ |
| 消消乐 | Match-3 | 35 | ✅ |
| 拖拽吸金 | Kéo vật vào đích | 22 | ✅ |
| 滑雪 / 左右 | Né trái/phải | 25 | ✅ |
| 找不同 | Tìm điểm khác | 25 | ✅ |
| 躲避 | Né tránh | 19 | ✅ |
| 跑酷 / 重力跳云 | Chạy vượt chướng ngại, nhảy bằng gyro | 36 | ✅ |
| 手速数钱 | Vuốt đếm tiền | 16 | ✅ (rất hợp Tết) |
| 娃娃机 | Gắp thú | 15 | ✅ |
| 翻牌配对 | Lật cặp trí nhớ | 15 | ✅ (M2: lật thẻ) |
| 轨道冲刺 / 跳一跳 | Chạy theo ray, nhảy | 30 | ✅ |
| 狂点进度 | Bấm đầy thanh | 14 | ✅ |
| 别踩白块 | Chạm đúng, né sai | 13 | ✅ |
| 拖拽配对 / 二选一 | Kéo khớp, phân loại | 20 | ✅ |
| 捕鱼 / 见缝插针 / 盖楼 | Ném, cắm kẹo, xếp tầng | 27 | ✅ |
| 拼图 / 2048 / 记忆 | Ghép hình, 2048, ghi nhớ | 20 | ✅ (M2: ghép hình) |
| 打地鼠 | Đập chuột | 6 | ✅ (M2: đập logo) |
| 顺口溜 | Nói líu lưỡi (ASR) | 4 | ⚠️ cần ASR tiếng Việt |
| 颜值评分 | AI chấm "nhan sắc" | 3 | ❌ nhạy cảm |
| 场景布置 / 头像装扮 | Tạo ảnh, avatar để chia sẻ | 33 | ⚠️ không phải game có thưởng |

### 2.4 Giữ chân, sưu tầm, lan truyền

| Cơ chế | Tiếng Việt | Cách chơi / cấu hình | Template | Playora |
|---|---|---|---|---|
| 签到 / 日历打卡 | Điểm danh | Điểm danh thường và liên tiếp; xu dùng để bốc hoặc đổi quà | 38 | ✅ **đề xuất**, cần quyết định |
| 能量小树林 | Nuôi cây | Làm nhiệm vụ lấy năng lượng rồi đổi quà | 14 | ✅ nếu bỏ nhiệm vụ chia sẻ |
| 积分乐园 | Hub điểm thưởng | Điểm danh + nhiều minigame lấy điểm để đổi quà | 2 | ✅ đây là hình mẫu của "campaign builder L3" |
| 集福 / 集卡 | Sưu tầm thẻ | 2–15 loại thẻ, phần lớn do bạn bè "giúp" | 49 | ⚠️ giữ phần sưu tầm, thay việc nhờ bạn bằng lượt chơi hoặc hoá đơn |
| 集赞, 种树, 接力, 砍价, 拼团 | Gom like, rủ bạn, mặc cả, mua nhóm | Ép rủ bạn bè | ~190 | ❌ |
| 秒杀, 降价拍, 分销 | Thương mại | Cần thanh toán | ~140 | ❌ ngoài phạm vi |
| 投票, 竞猜, 瓜分 | Bình chọn, dự đoán, chia quỹ | Có phiếu ảo | 128 | ❌ |
| 答题 | Quiz | | 197 | ❌ (đã chốt) |
| 红包 | Lì xì tiền mặt WeChat | | 10 | ❌ |
| 现场 | Màn hình lớn, lắc tại chỗ | | 23 | ❌ |

### 2.5 Lịch theo mùa (40 nhãn)

- **Tết âm lịch** là cụm lớn nhất: 腊八 11 · 小年 11 · 除夕 31 · 春节 63 · 元宵 22. Ngoài ra có 元旦 33.
- **Mua sắm:** 11.11 (49), 12.12 (26), 618 (23), lễ ẩm thực (50).
- **Gia đình và tình cảm:** Valentine 25, 8/3 32, Ngày của Mẹ 30, Ngày của Cha 27, 1/6 28, Thất tịch 38.
- **Mùa khác:** Trung thu 35, Đoan ngọ 27, Noel 36, Halloween 23, khai giảng 28, Nhà giáo 18, Quốc khánh 28.
- **Không gắn mùa:** 639.

**Lịch VN đề xuất:** Tết (từ ông Công ông Táo đến rằm tháng Giêng), Valentine, 8/3, 30/4–1/5, 1/6, Trung thu, 20/10, 20/11, Halloween, 11.11 và 12.12, Black Friday, Noel, cùng một bộ mẫu không gắn mùa.

---

## 3. Builder và editor

### 3.1 Luồng tạo hoạt động

| Bước | 凡科 | Ghi chú cho Playora |
|---|---|---|
| Chợ template | Tab theo nhóm, chip theo dịp lễ, lọc theo kiểu chơi. Ngành và mục tiêu nằm ở trang "giải pháp" riêng | Với SME nên **lọc theo ngành và mục tiêu** ngay trong chợ template |
| Tạo | Clone template thành hoạt động chưa phát hành | |
| Editor | Form chia tab, simulator điện thoại ở giữa, chỉ trên PC | **Mobile-first:** preview toàn màn hình, chỉnh trong bottom sheet |
| Preview | QR để chơi thử trên máy thật; **tối đa 20 người chơi thử trước khi publish**, không tính quota | **Nên làm theo** |
| Publish | Bấm phát hành, hoặc **tự phát hành khi đến giờ bắt đầu**. Gói Free chỉ được 10 lần publish | **Nên làm theo** tự phát hành |
| Sau publish | Sửa giờ được; **kéo dài sau khi kết thúc mà giữ dữ liệu**; chỉ xoá được khi đã kết thúc | **Nên làm theo** |
| Version | Không có | Playora giữ GameVersion bất biến ([12 §4.3](../product/specs/builder.md)) |

**Trường bị khoá sau publish:** chế độ bốc thăm, chơi theo đội, loại giải, tên giải, cách sinh mã. Thời gian, số lượng và tỉ lệ vẫn sửa trực tiếp được.

### 3.2 Các nhóm cấu hình

| Nhóm | Trường chính |
|---|---|
| **基础设置** | Tiêu đề (≤ 30 ký tự, có gợi ý tên); thời gian; trần số người chơi; mô tả (rich text, để trống thì tự ẩn); 粉丝专属 (phải follow OA) |
| **高级选项** | Quảng cáo màn đầu; dải chữ chạy tên người trúng; giới hạn khu vực (IP/GPS, tâm + bán kính); **mật khẩu hoạt động**; chỉ thành viên nhóm; hiện/ẩn luật; số người trên bảng xếp hạng |
| **派奖方式** (chọn trước) | (1) **Bốc thăm**: tổng lượt, lượt/ngày, số lần trúng tối đa mỗi người, tổng 中奖率, ngưỡng điều kiện, form liên hệ. (2) **Theo hạng**: phát giải thủ công. (3) **Đạt ngưỡng thì đăng ký**. (4) **Ai chơi cũng nhận**: giải an ủi chỉ phát khi các giải khác đã hết. (5) **Không có giải** |
| **奖项设置** | Số loại giải (3/8/15 theo gói); loại giải: hiện vật (nhận tại quầy hoặc gửi bưu điện), quà ảo (nút đổi quà có link tuỳ chỉnh), thẻ quà, coupon; tên, ảnh, số lượng; hướng dẫn và địa chỉ đổi quà; giải an ủi; sinh mã đổi quà; thời hạn hiệu lực (ví dụ hiệu lực sau 1 ngày, dùng trong 15 ngày) |
| **Form liên hệ** | Tên, SĐT, địa chỉ. Không bật thì cửa hàng không xem được thông tin người chơi |
| **Giao diện** | Thay ảnh game (mọi gói), âm thanh, thời gian chơi, đơn vị điểm; menu, nền, icon nút |
| **Chia sẻ** | Icon (Free); tiêu đề và mô tả (gói trả phí) |
| **Chống gian lận** | Một công tắc "chặn người dùng rủi ro"; **danh sách hoạt động hiện số đã kiểm / đã chặn**; cờ "gian lận" kèm lý do trên từng người dùng; blacklist theo hoạt động và toàn cục; whitelist |

### 3.3 Mã tham gia (活动密码)

Ba loại mã:
- **Mã chung:** một mã dùng cho tất cả.
- **Một người một mã.**
- **Một lần một mã:** mỗi mã đổi được một lượt; mã chỉ bị trừ khi người chơi thực sự quay.

Quy tắc mã:
- **Định dạng:** 6–20 ký tự chữ và số, phân biệt hoa thường, không trùng.
- **Tạo mã:** tự sinh hoặc import tối đa 5.000 mã/lần. Con số này khác với 50.000 trong [11](builder-research.md), cần kiểm lại.
- **QR riêng cho từng mã:** quét là vào thẳng, không phải gõ mã. Có xuất QR hàng loạt.
- **Ứng dụng:** in mã lên bao bì; nhân viên lấy mã qua mini-program.

### 3.4 Đổi quà (核销)

| Cách | Luồng |
|---|---|
| Nhập hoặc quét mã | Trên PC hoặc điện thoại (qua mini-program); **không hoàn tác được** |
| Tự đổi tại quầy | Nhân viên nhập mã cửa hàng trên máy của người chơi |
| Không cần đổi | Dành cho quà ảo |
| Hàng loạt / vận chuyển | Upload Excel kèm mã vận đơn, trạng thái chuyển "đã gửi" |
| Phân quyền | Vai trò nhân viên **chỉ được đổi quà**, không sửa được hoạt động |

### 3.5 Tính năng theo gói (凡科, tệ/năm)

Giá niêm yết: Free 0 · 铂金 1.298 · 钻石 1.998 · 星钻 2.998 · 集团 báo giá. Giá khuyến mại 649 / 999 / 1.499, thường kèm "mua 2 tặng 2".

| Mục | Free | 铂金 | 钻石 | 星钻 |
|---|---|---|---|---|
| Hoạt động publish đồng thời / tổng lần publish | 3 / 10 | 5 / ∞ | 10 | 20 |
| Người chơi mỗi hoạt động | 50 | 20.000 | 500.000 | ∞ |
| Khu vực, đội, form liên hệ, ticker, chia sẻ tuỳ chỉnh, chống gian lận | ✗ | ✓ | ✓ | ✓ |
| Mật khẩu hoạt động, mã đổi quà tuỳ chỉnh, thanh toán | ✗ | ✗ | ✓ | ✓ |
| Thống kê cơ bản, đổi quà, giải an ủi, **soạn không giới hạn** | ✓ | ✓ | ✓ | ✓ |

---

## 4. Hệ quả cho Playora

### 4.1 Engine nên làm (đề xuất, chờ duyệt)

| Ưu tiên | Engine | Renderer / cơ chế | Lý do |
|---|---|---|---|
| **1** | **Instant-win** (một logic server) | Vòng quay, cào, mở hộp/hộp mù, đập trứng, lật thẻ bốc thăm, lưới 9 ô, gacha, lắc điện thoại, mưa quà | 凡科 có khoảng 360 template trên nhóm này. Thêm renderer mới không phải động vào prize engine |
| **2** | **Skill + điểm** (một khung tính điểm và thời gian) | Hứng quà, chạm nhanh, đếm tiền, né trái/phải, đập chuột, lật cặp, ghép hình, match-3, xếp tầng | Khung chung gồm thời gian, điểm và asset slot cộng/trừ |
| **3** | **Điều kiện tham gia** | Mã tham gia có QR riêng, **up hoá đơn để được lượt** (duyệt tay ở M2, OCR về sau) | Hợp với SME bán lẻ và FMCG |
| **4** | **Giữ chân (L3)** | Điểm danh, bốc mỗi ngày, hub điểm thưởng, sưu tầm thẻ (không nhờ bạn bè) | Lý do để SME trả thuê bao. **Cần quyết định** |

### 4.2 Builder: sửa [12-builder-spec.md](../product/specs/builder.md)

1. **Đặt "cách phát giải" lên đầu tab Giải thưởng**, rồi ẩn hoặc hiện trường theo mode ([§6.2](../product/specs/builder.md)). Giữ tab "Luật và điều kiện" tách riêng như spec hiện tại.
2. **Editor mobile-first** thay cho bố cục 3 cột ở §4.1: preview toàn màn hình và bottom sheet. Chụp ảnh sản phẩm rồi tự xoá nền để dùng làm asset.
3. **Chia sẻ link nháp** cho tối đa N người chơi thử trước khi publish.
4. **Tự publish khi đến giờ bắt đầu**; **kéo dài sau khi kết thúc mà giữ dữ liệu**; **không cho xoá khi đang chạy** (§12).
5. **Mã tham gia** (§7): thêm QR riêng cho từng mã và quy tắc "chỉ trừ lượt khi người chơi thực sự chơi"; xác định lại giới hạn import.
6. **Chống gian lận** (§8): hiện số đã kiểm / đã chặn trên danh sách campaign; gắn cờ kèm lý do trên từng người chơi.
7. **Đổi quà** (§11): thêm vai trò "chỉ đổi quà" vào `packages/auth` permissions; đổi quà không hoàn tác được và có quy trình xử lý khi đổi nhầm; cập nhật vận chuyển hàng loạt.
8. **Gói Free:** soạn đầy đủ, khoá theo số người chơi và số lần publish ([02 §3](../business/business-model.md)).

### 4.3 Không làm theo

- Số người tham gia ảo, phiếu ảo, robot đặt điểm trên bảng xếp hạng.
- Upload sẵn danh sách người trúng **[CXM]**. Trái hard rule "không định trước người trúng".
- Lì xì tiền mặt, dự đoán hoặc chia quỹ, cơ chế ép rủ bạn bè (gom like, mặc cả, mua nhóm, chạy tiếp sức).
- Quiz, bình chọn, màn hình lớn tại sự kiện.
- Ẩn logo nền tảng bằng voucher trả theo từng hoạt động.

---

## Nguồn

- Catalog 1.709 template, nhóm và nhãn lễ: https://hd.fkw.com/game.html (parse `data-key1/2/3`, `rstyle`); cách chơi từng engine: `https://hd.fkw.com/gamePreview~{id}.html`
- Gói và giá: https://hd.fkw.com/product.html
- 基础设置: https://hd.fkw.com/news/1048627 · 派奖: https://hd.fkw.com/news/1533, https://www.guandayun.com/h-nd-2295.html · Đổi quà: https://hd.fkw.com/news/10471, https://www.guandayun.com/h-nd-3545.html · Giải và chống gian lận: https://hd.fkw.com/news/1041047, /news/16145 · Changelog: /news/1159911, /news/1277166, /news/1277549
- Khoá sau publish: https://hd.fkw.com/questionView.html?id=7244 · Mật khẩu hoạt động: ?id=1048783 · Công thức cho hội chợ: ?id=7503
- Guandayun: https://www.guandayun.com/hd.html, /hd-xyx.html, /hd-cj.html, /hd-dzp.html, /hdhelp.html
- **Không truy cập được (429):** `guandayun.com/h-nd-{2262,2263,2264,2268,2310,2321,2335,2361,5224,6088,6878}.html`. Vì vậy các trường riêng của từng game (tốc độ rơi, điểm mỗi vật, thời lượng mặc định, số ô vòng quay) và cơ chế 按时间均匀 / 分批放奖 vẫn **[CXM]**.
