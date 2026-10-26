# 11 — Nghiên cứu chuyên sâu: Game Builder (Guandayun và thị trường)

Cập nhật: 23/10/2026 · Phạm vi: Trung Quốc (gồm Guandayun), quốc tế, Việt Nam · Tài liệu này là đầu vào cho [12-builder-spec.md](./12-builder-spec.md)

> **Quy ước:** **[CXM]** = chưa xác minh từ nguồn chính thức. Giá trích từ trang công khai lúc khảo sát (10/2026). Tỷ giá tham chiếu: 1 CNY ≈ 3.650 đ, 1 USD ≈ 26.000 đ, 1 EUR ≈ 28.000 đ.

---

## 1. Tóm tắt điều hành

1. **Guandayun là 观达云互动 (guandayun.com)**, module "互动营销" trong một bộ SaaS cho SME Trung Quốc (gồm cả web, shop, mini-program, edu…). Bằng chứng kỹ thuật cho thấy đây gần như chắc chắn là **đại lý OEM/white-label của 凡科互动 (hd.fkw.com, Faisco)**: tên template trùng 100%, CDN và backend thuộc hạ tầng Faisco, và 凡科 công khai có chương trình OEM. Vì vậy, khi nói "builder kiểu Guandayun" thì thực chất là **builder của 凡科互动**.
2. **Mô hình builder thống trị** (凡科/Guandayun, 易企秀, Hi现场, Drimify, Easypromos, WOAY) là: **game engine code sẵn + editor dạng form cấu hình + bộ skin/asset slot + prize engine + participation rules**. Không ai cho người dùng "vẽ game" tự do. Canvas kéo-thả chỉ dùng cho *trang bao quanh* game (人人秀, Playable, Brame).
3. **Giá trị thật của builder không nằm ở "game"** mà ở bốn lớp quanh game:
   - Prize engine: tỷ lệ, tồn kho, rải giải theo thời gian, đổi quà.
   - Participation rules: ai được chơi, bao nhiêu lần.
   - Chống gian lận.
   - Kênh phân phối và dữ liệu.
   Template chỉ là lớp skin. Trung Quốc thắng nhờ **số lượng template theo dịp lễ** (凡科 khoảng 1.700 mục gồm bản sao theo mùa).
4. **Khoảng trống lớn nhất toàn cầu và tại VN:** chưa có builder no-code nào cho **game nhiều người realtime trên LED** (lắc/tap race, kéo co, đếm tiền…) gắn chung prize engine và lucky draw. Trung Quốc có (Hi现场, 趣现场), nhưng là sản phẩm tách khỏi builder H5 và gắn chặt WeChat. Tại VN, lucky draw đã **bị hàng hoá hoá** (250k–4 triệu đ/sự kiện).
5. **Chưa nền tảng nào mở SDK** để bên thứ ba viết game mới chạy trên prize engine và data của họ. Đây là cơ hội nền tảng dài hạn cho Playora.

---

## 2. Guandayun / 凡科互动: phân tích chi tiết

### 2.1 Danh tính và quan hệ OEM

| Bằng chứng | Chi tiết |
|---|---|
| Tên template trùng | 能量小树林 (gameId 456 trên 凡科), 积分乐园, 锦鲤抽奖, 一刮千金 (gameId 93), 火山喷发·召唤礼物雨 (gameId 68), 中秋博饼 đều có trong catalog hd.fkw.com |
| Hạ tầng | Trang Guandayun tải tài nguyên từ `faimallusr.com`, `508mallsys.com`, `faisys.com`, `fe.508sys.com` (CDN Faisco). Backend `www.webportal.top` dùng frontend `oem.508sys.com`, server header `F-WEB` giống fkw.com |
| Chính sách OEM | Trang API của 凡科: "平台接口服务… 支持OEM贴牌模式", kèm chương trình 加盟 (đại lý) |
| Khác biệt | Tên gói của Guandayun (试用版/营销版/至尊版/联合版) khác 凡科 (免费/铂金/钻石/星钻/集团), nên đại lý tự đặt tên và giá |

**Kết luận:** suy luận với độ tin cậy cao; hợp đồng OEM **[CXM]**.

**Bài học kinh doanh:** 凡科 nhân rộng qua **mạng lưới đại lý OEM**: đại lý bán lại dưới thương hiệu riêng, tự định giá. Mô hình này tương ứng trực tiếp với **gói Agency white-label** của Playora.

### 2.2 Catalog (Guandayun công bố hơn 300 template; 凡科 khoảng 1.700 mục gồm bản theo mùa)

| Nhóm | Template tiêu biểu |
|---|---|
| **在线抽奖** (bốc thăm online) | 大转盘 (vòng quay), 刮刮乐/一刮千金 (cào), 九宫格 (lưới 9 ô), 砸金蛋 (đập trứng vàng), 扭蛋机 (gacha), 老虎机 (máy xèng), 摇一摇抽奖 (lắc), 幸运开箱/盲盒 (mở hộp), 锦鲤抽奖 (cá chép may mắn), 翻牌 (lật bài), 许愿 (ước), 中秋博饼 (gieo xúc xắc Trung thu) |
| **小游戏** (game kỹ năng) | Chia nhóm: 动作 (hành động), 手速 (tốc độ tay), 反应 (phản xạ), 消除 (match-3), 跳跃 (nhảy), 接物 (hứng đồ), 益智 (trí tuệ). Ví dụ: 别踩白块儿, 打地鼠, 天降红包雨, 2048, 手速数钱, 欢乐娃娃机, 疯狂拆快递 |
| **有奖答题** (quiz) | 常规答题, 看图猜名, 对话式答题, 听歌答题, 每日一答 |
| **投票竞猜** (bình chọn, dự đoán) | 图片/视频投票, 有奖竞猜, 竞猜瓜分, 多轮竞猜 |
| **裂变引流** (lan truyền) | 集福 (sưu tầm thẻ, 2–15 thẻ), 集赞, 关注红包, 瓜分红包, 接力跑, 传递祝福 |
| **商业促销** | 秒杀, 拼团, 砍价, 降价拍, 分销宝 (có WeChat Pay) |
| **长期活动** (giữ chân) | 签到抽奖, 日历打卡, 能量小树林 / 积分乐园 / 天天抽奖 (mini-program, kiểu "nuôi cây") |
| **现场活动** (tại sự kiện) | 现场大屏幕抽奖, 现场摇一摇, 导入名单抽奖; 凡科 còn có 极速赛车, 激情赛马, 拔河大赛, 现场抽签 |
| **AR** | AR集福, AR切水果 |

### 2.3 Builder: luồng và editor

```
活动市场 (template market)  →  创建 (clone template)  →  Editor  →  预览  →  一键发布  →  Share / Embed / Big screen
 lọc theo loại/từ khoá                                       │
                                                             ├─ Cột trái: danh sách trang/màn (trang đầu, game, kết quả, big screen…)
                                                             ├─ Giữa: preview điện thoại
                                                             └─ Phải: 属性 / 基础设置 / 奖项设置 / 高级设置
```

| Nhóm cấu hình | Nội dung (Guandayun/凡科) |
|---|---|
| **Ngoại hình** | Thay nhân vật/vật phẩm game, ảnh tiêu đề (sửa được bằng 云设计), nhạc nền, âm thanh click; "设置页面样式"; màu/text nút ở trang thắng, thua, hết quà; 首屏广告 (quảng cáo màn đầu: ảnh hoặc 微传单) |
| **Nội dung** | Mô tả hoạt động (rich text), 奖品说明, nội dung chia sẻ (tiêu đề, ảnh, mô tả) |
| **Gameplay** | Thời gian chơi (giây), đơn vị điểm, tỷ lệ trúng; template mùa có thể thay game nhúng (vd. bản Olympic đổi "数钱" thành "cử tạ") |
| **Giải thưởng** | Số loại giải theo gói (3 / 8 / 8 / 15, không tính giải an ủi). Loại: hiện vật, quà ảo, gift center (thẻ cào, data, vé phim), 微信现金红包, 立减金, coupon, coupon nhân bản, coupon cửa hàng, quà qua API |
| **Phát giải** | **Tỷ lệ trúng tổng** (không đặt riêng từng giải); 5 cách phát (bốc thăm, theo xếp hạng…); xếp hạng thì phát tay; 按人流量 / 时间均匀 (theo lưu lượng hoặc rải đều theo thời gian); 分批放奖 (mở kho theo đợt) |
| **Luật chơi** | Lượt chơi/ngày, số lần trúng/người, cấm trúng lặp, chơi theo đội, thêm lượt khi chia sẻ/mời |
| **Điều kiện tham gia** | 粉丝专属 (phải follow OA), chỉ bạn 企微/thành viên nhóm, **活动密码** (một người một mã / một lần một mã / SĐT / nhập tay; tối đa 50.000 mã/lần import), giới hạn khu vực (GPS + điểm và bán kính), trần số người, thời gian hoạt động |
| **Dữ liệu** | Form thông tin liên hệ, thoả thuận người dùng, danh sách người chơi/người trúng, export; thống kê xem/chơi/trúng/chia sẻ, xu hướng, khu vực, thiết bị; dữ liệu làm mới mỗi 5 phút |
| **Kênh** | Link H5, menu/bài viết OA, auto-reply, poster có QR, **渠道管理** (link theo kênh, 30–10.000 kênh tuỳ gói), mini-program, 企业微信, big screen |
| **Chống gian lận** | Blacklist, 智能防刷, 投票防刷 (gắn cờ user rủi ro), captcha xoay ghép hình, giới hạn tốc độ phát 红包, chặn đầu số ảo khi gửi SMS, **测试机器人 (robot test tải)**, whitelist chống gian lận |
| **Đổi quà (核销)** | Quét bằng điện thoại, trang web, upload hàng loạt, qua OA, **mã tự đổi gán cho cửa hàng/nhân viên** |
| **Vận hành** | Một số trường **khoá sau khi publish** (vd. luật trợ lực); thùng rác giữ 14–15 ngày; giới hạn số 999.999; ảnh ≤ 20 MB; leaderboard ≤ 500 người |

### 2.4 Chế độ màn hình lớn (Guandayun)

- **Bật** trong `基础设置 → 高级选项 → 现场大屏幕`. Có **editor màn hình lớn riêng** (nền, style). Sau khi lưu, copy link big screen và mở trên máy nối LED.
- **Áp dụng cho** bốc thăm, game, quiz; 现场摇一摇 (xếp hạng theo số lần lắc); bốc thăm từ danh sách import.
- **Yêu cầu** gói 营销版 trở lên.
- **Use case họ nêu:** tất niên, khuyến mại trung tâm thương mại, livestream bốc thăm, quán bar, hội nghị khách hàng, ký kết.
- **Hạn chế quan sát được:** big screen là **tính năng phụ gắn vào hoạt động H5**, không phải sản phẩm live riêng. Tài liệu không mô tả điều khiển MC, vòng chơi hay kiểm duyệt. 凡科 giới hạn 摇一摇 ở 300/500/1.000 người tuỳ gói.

### 2.5 Giá

| | Free | Gói 1 | Gói 2 | Gói 3 | Doanh nghiệp |
|---|---|---|---|---|---|
| **凡科** (CNY/năm) | 0 | 铂金 1.298 | 钻石 1.998 | 星钻 2.998 | 集团: báo giá |
| ≈ VND/năm | 0 | ~4,7 tr | ~7,3 tr | ~10,9 tr | |
| Người chơi/hoạt động | 50 | 20.000 | 500.000 | Không giới hạn | Không giới hạn |
| Số loại giải | 3 | 8 | 8 | 15 | 15 |
| Tổng quà | 100 | 10.000 | 100.000 | 500.000 | 2.000.000 |
| Hoạt động đồng thời | 3 | 5 | 10 | 20 | 100 |
| Phí phát 红包 | | 4% | 2% | 2% | 1,5% |
| **Guandayun** (CNY/năm) | Trial | 营销版 ~1.498 **[CXM]** | 至尊版 ~1.998 **[CXM]** | 联合版 ~2.998 **[CXM]** | |

- Hay có khuyến mại "买2送2" (mua 2 năm tặng 2 năm). Bỏ logo chỉ có ở gói 集团, hoặc mua voucher 100–400 tệ/hoạt động.
- **Nhận xét:** giá SME Trung Quốc khoảng **5–11 triệu đ/năm** cho số người chơi gần như không giới hạn. Rẻ vì volume khổng lồ và lợi nhuận đến từ red packet và upsell. Không nên dùng làm mỏ neo giá cho VN; dùng làm **mỏ neo tính năng**.

### 2.6 API và mở rộng (凡科)

API trả phí gồm: nhúng game vào web/app/mini-program/Douyin; **tự định nghĩa điều kiện tham gia**; đồng bộ điểm thưởng; phát quà từ hệ thống khách; thêm lượt khi làm nhiệm vụ; **中奖审核** (duyệt người trúng); đẩy dữ liệu hành vi về server khách. Có hỗ trợ OEM.

### 2.7 Điểm mạnh và yếu

| Mạnh | Yếu |
|---|---|
| Kho template khổng lồ, ra theo mùa đều đặn | Tuỳ biến chỉ ở mức thay ảnh/chữ; game nào cũng "na ná" |
| Prize engine và participation rules rất đầy đủ, đã được thị trường kiểm chứng | Big screen là tính năng phụ, giới hạn người, không có điều khiển MC thực thụ |
| Kênh phân phối gắn chặt WeChat (follow, red packet, mini-program) | Phụ thuộc WeChat, không dùng được ở VN |
| Mô hình OEM/đại lý giúp phân phối rộng | Giao diện và UX kiểu cũ, nhiều cấu hình chồng chéo theo gói |
| Giá rất rẻ | Tài liệu tự thừa nhận H5 có khả năng chống gian lận hạn chế |

---

## 3. Các builder Trung Quốc khác

| Nền tảng | Kiến trúc builder | Điểm đáng chú ý | Big screen | Giá (CNY) |
|---|---|---|---|---|
| **人人秀** (rrx.cn) | **Canvas H5 kéo-thả + plugin** game/bốc thăm (6合1编辑器) | Xác suất **riêng từng giải**; kiểm soát phát quà theo ngày/giờ; 分时抽奖; **指定用户中奖** (định trước người trúng qua Excel/API); thêm lượt khi làm nhiệm vụ; OEM editor | "18种大屏玩法": bốc thăm, check-in, game, vote, quiz, khởi động; 20–2.000 người theo gói | Free → VIP 99,7/tháng → 营销专业版 1.888/năm → 旗舰 2.888/năm → API từ 20.000 |
| **易企秀** (eqxiu.com) | Template + form (互动编辑器: 页面编辑 + 属性面板) | **Game + bốc thăm** (đạt điểm ngưỡng mới được bốc); thời lượng 15–180 s; **4 mức độ khó**; thưởng theo xếp hạng; **webhook "自定义活动逻辑"** quyết định từng lượt (cho chơi / không đủ điều kiện / không trúng / trúng giải X / khoanh vùng giải); 库存释放; trường khoá sau publish | Qua Hi现场 (cùng hệ "中网") | Gói VIP/SVIP/营销专业版; giá **[CXM]** |
| **Hi现场** (hixianchang.com) | Editor màn hình lớn + "游戏互动编辑器" | Hơn 60 trò trên màn hình lớn: check-in 3D/logo/chữ ký/bản đồ; 弹幕, tường tin nhắn, 霸屏; bốc thăm cuộn/3D/ảnh/danh sách/xếp chỗ/hộp bí ẩn/tường lì xì; 红包雨; **摇一摇, 数钱, 赛车, 赛马, 敲敲乐, 射击, 接金币, 拔河**; vote/chấm điểm/quiz/你演我猜; **nghi thức khởi động, ký kết**. MC điều khiển bằng **điện thoại**; duyệt tin nhắn; tự nhận "单场40万人" | Đây chính là sản phẩm | **Bán theo buổi** 0–1.599/buổi; hội viên 3.980–6.980/năm (1.000–2.000 người/hoạt động) |
| **趣现场** (quxianchang.com) | Màn hình lớn | 摇一摇 mặc định 500 người, màn hình hiện top 6, kết quả top 10, **loại top 1–500 khỏi lượt sau**; Bingo, 对对碰 | Có | **Bán lẻ từng tính năng theo ngày/tháng/năm**: 摇一摇 166/ngày, bỏ logo 99/ngày, hỗ trợ tại chỗ 2–3k/người/ngày |
| **Epub360** | **Canvas + trigger + biến + DB tuỳ biến + JS** | Linh hoạt nhất; va chạm, biến toàn cục, database; không có prize engine chuyên dụng | Kích thước tuỳ ý | 0 / 1.499 / 2.999 / 9.999 / 19.999 mỗi năm |
| 兔展 | — | Đã chuyển sang AI, editor H5 chỉ còn bảo trì | — | — |

---

## 4. Builder quốc tế

| Nền tảng | Kiến trúc builder | Ý tưởng đáng học | Giá / đơn vị tính |
|---|---|---|---|
| **Playable** | Visual editor kéo-thả + **campaign flow builder**; global themes, CSS | **AI tạo bản nháp qua MCP (Claude)** từ prompt và brand kit; chiến dịch live không sửa được, phải nhân bản thành nháp; hơn 50 tích hợp CRM | Liên hệ sales; theo user; webhook từ Core, API ở Premium |
| **Brame** | Kéo-thả, hơn 100 template, custom flows | Unique access token; fraud detection | €440–880/tháng + phí setup; **tính theo số chiến dịch live đồng thời** |
| **Drimify** | **Wizard 5 bước chung cho mọi engine**: Start, Branding, màn trung gian (form/media/leaderboard), End, Settings | **Rải giải tự làm mượt**: xác suất tính lại sau mỗi lần trúng, ngày không có người chơi thì giải dồn sang ngày sau; **"100% winner" để xả kho cuối chiến dịch**; slider độ khó (số mạng, số cú, thời gian); custom JS; dịch vụ "Creation Pack" | $221/tháng (1.000 lượt) / $783 (10.000); **tính theo lượt tham gia** |
| **Qualifio** | Wizard: Welcome → Interaction → Form → Exit (+ bước Prize) | **Kế thừa theo tầng "Website"** (template, sub-domain, ngôn ngữ, opt-in, kết nối dữ liệu): sửa một lần thì mọi chiến dịch đổi theo; **"Winning moments"** (người đầu tiên chơi sau mốc giờ định trước sẽ trúng); secure token; webhook 2.0 gửi cả lượt chưa hoàn tất | Theo seat, liên hệ |
| **Easypromos** | Form theo tab: Prizes → Participation (Options/Segments/**Requirements**/Game) → Design | **Requirements trước khi chơi** (nhập mã, upload hoá đơn, xem video); **Instant Win Scheduler** (giờ trúng cho từng đơn vị giải, rải đều theo giờ/ngày, giới hạn theo giờ mở cửa); xác suất trên thang 1.000; **bộ chống gian lận chi tiết nhất** (IP 300 s, chặn VPN/proxy, chặn email dùng một lần và alias "+", chặn số điện thoại tạm thời, Security Center); kiosk tự đăng xuất | $29–399/tháng; theo số app và trần người tham gia |
| **Interacty** | Ghép block | Hơn 400 template; "Live Game Events" giới hạn theo **player room** | $14–85/tháng; theo pageview/lead/room |
| **Riddle** | Quiz/poll builder | **Builder API + MCP**; tính theo người chơi đồng thời | ₹10k–60k/tháng |
| **Crowdpurr** | Experience builder (trivia, bingo, poll, social wall, lottery) | **Ba view: Host Dashboard / Presentation / Participant**; Host-controlled hoặc Crowd-controlled; **booth auto-reset**; vòng lặp 24/7; **logo và quảng cáo pop-up nhà tài trợ** trên điện thoại người chơi; tournament bracket | $49,99–999,99/tháng; **theo người/trải nghiệm** (100–15.000) |
| **Kahoot! 360** | Quiz | **Event pass 30 ngày**: $199 (200 người) → $799 (5.000 người, cần test hiệu năng trước) | Theo host + trần người |
| **Dinobros, Paradowski** | Studio làm riêng | Điện thoại làm controller, race trên jumbotron (2.913 người chơi) | €700/ngày + reskin |

---

## 5. Builder và công cụ tại Việt Nam

| Đối thủ | Builder | Live / LED | Giá | Ghi chú |
|---|---|---|---|---|
| **WOAY** | Template + config (~5 phút); 11 game (VQMM, mở quà, quà bay, lật hình, ghép hình, gắp quà, lắc hộp, lắc cầu, quiz, hứng quà, cào); kịch bản Trúng nhanh / Đua Top / Sưu tầm; OTP SMS/ZNS, login FB/Google/Zalo; Open API, Zalo MiniApp, UrBox | **Không** | Free 50 lượt/tháng; Pro 50k/ngày (500 lượt/tháng); Pro-Adv 300k/ngày (5.000 lượt/tháng); Enterprise liên hệ | Retail/online; Shark Tank 2021 |
| **XSPIN** (XEP) | Template rời: quay số, VQMM, bốc thăm, check-in, lắc lì xì/rung cây/mở quà, đua vịt | Quay số trên LED | Quay số 500k (100 người) → 4,5tr (10.000); check-in 500k → 3tr; minigame 500k–3tr/tháng; làm riêng từ 6tr | Khách: Grab, Vinaphone, Toyota, Agribank…; giao diện cũ |
| **Luck4You / Bright4Event** | Quay số + add-on (check-in, voting, minigame, welcome screen) | LED, multi-screen | 690k (≤300) → 3,99tr (≤3.000); add-on 390–590k | FPT Software YEP 2025 (1.200 người) |
| **EDC Tech Lucky Draw** | Kịch bản nhiều giải, **lọc AND/OR** (đã check-in, chưa trúng, phòng ban, hạng vé); log seed + hash, chữ ký số | Màn BTC tách màn sân khấu | 1tr / 2tr / 4tr mỗi sự kiện | Chỉ quay số |
| **quaythuong.vn, Outing** | Quay số; server quyết định trước animation, có chứng nhận | LED | 199k/tháng; Outing 250k/sự kiện (≤2.000) | Giá đáy thị trường |
| **AhaSlides** | Slide: quiz, poll, spinner (≤5.000 mục, tự đổ tên khi quét QR, loại người đã trúng) | Có | Free 50 người; Essential/Pro tính bằng USD | Không có game hành động, không có prize engine |
| **iCheck QR minigame** | 4 bước (giải → chiến dịch và tỷ lệ → game và skin → gắn QR); 28 template | Không | **[CXM]** | QR trên bao bì / loyalty |
| **Mini AI, MiniApp.vn** (Zalo Mini App) | No-code minigame trong Zalo, lấy SĐT không cần OTP, Social CRM, ZNS | Không | Liên hệ | Retail/loyalty |
| **Agency/studio** (GUMI, Marvy, Xưởng Event…) | Làm riêng (Kinect, AR body, cảm ứng) | Có (booth/LED) | Vài triệu đến hàng chục triệu đ/dự án | Không tái sử dụng |

**Kết luận về VN:**
- **Lucky draw và check-in đã là hàng hoá** (0,25–4 triệu đ/sự kiện).
- **Minigame marketing** có WOAY dẫn đầu, mô hình giá theo lượt/tháng.
- **Game nhiều người trên LED và builder white-label cho agency hiện bỏ trống.**
- Người mua thường phải ghép 2–3 nhà cung cấp (check-in + quay số + game).

---

## 6. Tổng hợp: bộ tính năng của một game builder

### 6.1 Table-stakes (phải có, ai cũng có)

| Lớp | Tính năng |
|---|---|
| Template | Thư viện có lọc theo loại, dịp, ngành; preview chơi thử; clone |
| Editor | Form cấu hình + preview điện thoại; thay ảnh, chữ, màu, nhạc, âm thanh; mô tả/thể lệ rich text |
| Flow | Màn bắt đầu → (điều kiện/form) → game → kết quả (thắng/thua/hết quà) |
| Prize | Nhiều loại giải, số lượng, tỷ lệ, giải an ủi, mã voucher unique, đổi quà bằng quét mã |
| Rules | Lượt chơi/ngày và tổng, số lần trúng/người, thời gian hoạt động, thêm lượt khi chia sẻ |
| Participation | Mã/mật khẩu hoạt động, OTP, đăng nhập mạng xã hội, giới hạn khu vực |
| Anti-cheat | Captcha, rate limit, blacklist |
| Data | Danh sách người chơi và người trúng, export, dashboard, link theo kênh |
| Publish | Link, QR, embed, poster chia sẻ |
| Business | Free tier có watermark; bỏ logo ở gói cao; white-label |

### 6.2 Khác biệt tốt nhất nên học

| Ý tưởng | Nguồn | Áp dụng cho Playora |
|---|---|---|
| Rải giải theo thời gian, tự làm mượt, dồn giải ngày trống, xả kho cuối | Drimify, 凡科 (时间均匀), Easypromos Scheduler | Prize pacing (M3) |
| Winning moments (lịch thời điểm trúng) | Qualifio, Easypromos | Chế độ phát giải `scheduled` |
| Game + bốc thăm (đạt điểm mới được quay) | 易企秀 | Combo "skill → draw" |
| Webhook logic từng lượt | 易企秀 | Extension point cho Enterprise (M4) |
| Requirements trước khi chơi (mã, hoá đơn, video) | Easypromos | Activation FMCG tại VN (nhập mã nắp chai, chụp hoá đơn) |
| Kế thừa theo tầng Brand/Website | Qualifio | Org → Client → Event → Game cho agency |
| Ba view Host / Presentation / Participant; booth auto-reset; quảng cáo nhà tài trợ | Crowdpurr | Đã có trong kiến trúc; thêm "sponsor slots" |
| MC điều khiển bằng điện thoại; duyệt tin nhắn | Hi现场 | Host Console responsive (mobile-first) |
| Loại top N khỏi lượt sau; màn hình hiện top N | 趣现场 | Option của shake race / lucky draw |
| Nghi thức khởi động, ký kết, chấm điểm tiết mục | Hi现场 | Template mới cho khai trương, ra mắt, YEP |
| Robot test tải trong builder | Guandayun/凡科 | Rehearsal mode + bot (đã có) |
| AI tạo bản nháp từ prompt (MCP) | Playable, Optimove, Riddle | AI draft (M4) |
| Khoá trường sau publish; nhân bản thay vì sửa | 易企秀, Playable | `game_versions` bất biến + danh sách trường "hot-editable" |
| Bán theo buổi/ngày, bán lẻ từng tính năng | Hi现场, 趣现场 | Live Pass + add-on |
| OEM/đại lý | 凡科, 人人秀 | Agency white-label + reseller |

### 6.3 Những thứ **không** nên làm

| Tính năng | Lý do |
|---|---|
| **指定用户中奖** (định trước người trúng trong chương trình may rủi) | Mâu thuẫn với minh bạch; rủi ro pháp lý khuyến mại VN; phá uy tín "quay số minh bạch". Thay bằng tính năng "Tặng quà theo danh sách" **tách biệt và ghi rõ** là không ngẫu nhiên |
| Canvas tự do kiểu Epub360 cho người dùng phổ thông | Khó dùng, khó đảm bảo hiệu năng và chống gian lận; chỉ cân nhắc cho "trang bao quanh" sau 2027 |
| Cash red packet như WeChat | Không có hạ tầng tương đương và rủi ro pháp lý; thay bằng e-voucher, topup (UrBox/ViHat), mã giảm giá |
| Cơ chế "裂变" ép chia sẻ quá mức | Không hợp với Zalo/FB policy; chỉ dùng "thêm lượt khi chia sẻ" nhẹ |

---

## 7. Các mẫu kiến trúc builder

| # | Mẫu | Ai dùng | Ưu | Nhược | Playora |
|---|---|---|---|---|---|
| 1 | **Engine cố định + form config + asset slots** | 凡科/Guandayun, 易企秀, Drimify, Easypromos, WOAY, Hi现场 | Nhanh, ổn định, hiệu năng kiểm soát được, chống gian lận tốt | Game "na ná" nhau; mỗi game mới phải code | **Lõi v1** |
| 2 | **Wizard flow chung cho mọi engine** (Start → Requirements → Form → Game → Result) | Drimify, Qualifio | Học một lần dùng cho mọi game; tái sử dụng màn | Flow cứng | **Có ở v1**: "screen flow" chuẩn bao quanh template |
| 3 | **Canvas trang + plugin game** | 人人秀, Playable, Brame | Tự do bố cục trang | Phức tạp, dễ vỡ trên mobile | Sau 2027 (chỉ cho landing/màn phụ) |
| 4 | **Canvas + logic trực quan** | Epub360 | Linh hoạt tối đa | Không dành cho marketer | Không làm |
| 5 | **Extension cho developer** (webhook logic, API, custom JS, OEM) | 易企秀, 凡科, Drimify, Qualifio, Riddle | Phục vụ enterprise | Bảo mật, hỗ trợ | M4: webhook logic + public API; **Later: Game SDK công khai (chưa ai có)** |
| 6 | **Live room: server giữ state, nhiều client theo vai** | Hi现场, Crowdpurr, Kahoot | Game nhiều người | Hạ tầng realtime | **Lõi M1** (wedge) |

**Kết luận kiến trúc cho Playora:**
- Kết hợp **mẫu 1, 2 và 6** dưới một **Game SDK** chung.
- Prize engine, participation và data là **dịch vụ nền tảng dùng chung** cho cả game async lẫn live.
- Template chỉ khai báo schema, asset slot và logic riêng. Đặc tả chi tiết ở [12-builder-spec.md](./12-builder-spec.md).

---

## 8. Mô hình giá: hệ quả cho Playora

| Quan sát | Hệ quả |
|---|---|
| Lucky draw và check-in VN: 0,25–4 triệu đ/sự kiện | Không bán riêng lucky draw giá cao. Cho **free hoặc rất rẻ** để kéo khách; kiếm tiền ở **Live Pass** (game nhiều người + lucky draw + check-in + báo cáo) |
| Live event toàn cầu tính theo trần người/phiên (Crowdpurr, Kahoot pass $199–799) | Giữ **Live Pass theo số người**, giá bậc đầu thấp hơn đề xuất cũ |
| Marketing builder tính theo lượt tham gia/tháng (Drimify, WOAY, XSPIN) | Gói campaign (async) **tính theo người chơi/tháng** |
| Trung Quốc: gói năm 5–11 triệu đ, gần như không giới hạn | Gói năm cho SME/agency nên ở mức 10–60 triệu đ/năm |
| Bỏ logo, white-label, custom domain luôn ở bậc cao | Giữ nguyên |
| Bán lẻ theo buổi và tính năng (Hi现场, 趣现场) | Add-on theo sự kiện (operator, theme đặc biệt, game "wow") |

Bảng giá cập nhật nằm ở [02-business-model.md §3](./02-business-model.md#3-bảng-giá-đề-xuất-gđ).

---

## 9. Câu hỏi còn mở và việc cần làm

1. **Tạo tài khoản dùng thử** 凡科互动 (hoặc Guandayun), 易企秀, Hi现场, Drimify, Easypromos, WOAY, XSPIN, Luck4You. Quay video flow editor và ghi lại toàn bộ trường cấu hình (M0, B0.6).
2. Xác minh bảng giá Guandayun (trang `/hdtc.html` bị chặn 429 khi khảo sát).
3. Phỏng vấn agency: họ đang ghép công cụ nào cho YEP, chi bao nhiêu, đau ở đâu.
4. Kiểm tra pháp lý cho "game + bốc thăm" và "requirements: hoá đơn" (khuyến mại gắn mua hàng).

---

## Nguồn

**Guandayun / 凡科**
- https://www.guandayun.com/
- https://www.guandayun.com/huodong.html
- https://www.guandayun.com/hd-xyx.html
- https://www.guandayun.com/hdmb.html
- https://www.guandayun.com/h-nd-4693.html
- https://www.guandayun.com/h-nd-4696.html
- https://www.shuyuweb.com/cpjgzx.html (giá bên thứ ba **[CXM]**)
- https://hd.fkw.com/
- https://hd.fkw.com/product.html
- https://hd.fkw.com/game.html
- https://hd.fkw.com/apiInterface.html
- https://www.webportal.top/

**Trung Quốc**
- https://www.rrx.cn/vip
- https://rrx.cn/content-cj
- https://www.rrx.cn/screen
- https://help.eqxiu.com/doc/258/
- https://help.eqxiu.com/doc/443/
- https://help.eqxiu.com/doc/3393/
- https://www.hixianchang.com/function/price.html
- https://www.hixianchang.com/members.html
- https://www.quxianchang.com/
- https://www.epub360.com/price/

**Quốc tế**
- https://www.playable.com/pricing
- https://intercom.help/beplayable/en/articles/16758534-tips-example-prompts
- https://www.brame.io/pricing
- https://www.drimify.com/en/pricing/
- https://help.drimify.com/en/article/create-an-instant-win-game-1g4tc34/
- https://support.qualifio.com/hc/en-us/articles/360020938140
- https://developers.qualifio.com/docs/campaigns/concepts/
- https://www.easypromosapp.com/pricing/
- https://soporte.easypromosapp.com/hc/en-us/articles/48282120208404
- https://interacty.me/pricing/business?group=individuals
- https://www.riddle.com/pricing
- https://www.crowdpurr.com/pricing
- https://kahoot360.com/en-GB/pricing-events/
- https://dinobros.com/en/live-games
- https://paradowski.com/work/st-louis-blues

**Việt Nam**
- https://woay.vn/bang-gia
- https://xspin.vn/phi-dich-vu
- https://xspin.vn/phi-dich-vu-mini-game
- https://quaysotrungthuong.vn/license
- https://edctech.vn/lucky-draw
- https://www.quaythuong.vn/
- https://outing.vn/phan-mem-boc-tham-may-man/
- https://docs.ahaslides.com/using-slide-types/using-the-spinner-wheel.md
- https://icheckqr.com/vi/minigame
- https://miniai.vn/product/mini-game/
- https://xuongevent.vn/booth-tuong-tac-game/
