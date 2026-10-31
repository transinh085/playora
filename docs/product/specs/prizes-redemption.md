# Đặc tả Giải thưởng và Đổi quà

Cập nhật: 31/10/2026 · Owner: PO · PRD: PRZ-*, ORG-02a, ORG-10 ([prd §5.7](../prd.md#57-giải-và-đổi-quà-prz)) · Kỹ thuật: [architecture §6–7](../../engineering/architecture.md), [ADR-012 §4](../../adr/012-campaign-architecture.md) · Code lõi: `packages/core/src/prize` (`decide`, `simulate`)

Đây là trụ "lý do tin" của Playora: **quà không bao giờ phát sai, và mỗi lần đổi quà là một lượt khách thật tới quán.**

---

## 1. Loại giải

| Loại | Mô tả | Cách nhận | GĐ |
|---|---|---|---|
| `physical` | **Quà đổi tại quầy**: hiện vật, dịch vụ, giảm giá tại quán (topping, size up…) | Đổi tại quầy | M1 (loại duy nhất) |
| `voucher_code` | Mã từ kho (import CSV hoặc sinh theo mẫu) | Hiện mã; đổi tại quầy hoặc dùng online | M2 |
| `consolation` | Giải an ủi không giới hạn | Tuỳ | M2 |
| `digital` | Link, file, nội dung số | Tự động | M2 |
| `e_gift` | Topup, e-voucher qua đối tác | Tự động | M4 |
| `points` | Điểm thưởng (hub điểm hoặc hệ thống của quán) | Tự động | M3/M4 |

"Không trúng" là kết quả lượt chơi (`lose`), không phải loại giải. Mỗi giải có **giá vốn** (`valueVnd`, VND, số nguyên) để tính ngân sách và báo cáo chi phí cho mỗi lượt ghé quán.

---

## 2. Cách phát giải

Builder bắt người dùng **chọn cách phát trước**, rồi chỉ hiện những trường cách đó cần (học từ 派奖方式 của 凡科).

| Chế độ | Mô tả | Khi nào dùng | GĐ |
|---|---|---|---|
| `per_prize_probability` | Mỗi giải có xác suất riêng (thang 1/10.000), tổng ≤ 100% | Quán muốn tự đặt tỷ lệ | M1 |
| `overall_win_rate` | Một tỷ lệ trúng tổng; khi trúng chọn giải theo tồn kho còn lại | Mặc định của playbook | M1 |
| `guaranteed` | Ai chơi cũng trúng một giải (theo tồn kho) | Khai trương, tri ân | M1 |
| `score_threshold` | Game skill: đạt điểm ngưỡng thì được một lượt xét giải | Hứng quà | M2 (dời cùng hứng quà, PRZ-06) |
| `scheduled_moments` | Mỗi đơn vị giải có thời điểm mở; người chơi đầu tiên sau đó trúng | Giải lớn rải theo giờ | M2 |
| `rank_based` | Phát theo thứ hạng khi kết thúc; chủ quán xác nhận trước khi phát | Thi đua điểm | M2 |
| `end_draw` | Bốc thăm cuối chương trình (§7) | Giải đặc biệt | M2 |

## 3. Rải quà theo thời gian

| Chiến lược | Mô tả | GĐ |
|---|---|---|
| `none` | Phát đến khi hết | M1 |
| `time_uniform` | Rải đều theo thời lượng, cho vượt `buffer`%; tự làm mượt: khung thiếu người chơi thì quà dồn sang khung sau | M1 |
| `opening_hours` | Chỉ phát trong giờ mở cửa của quán | M1 |
| `batch_release` | Mở kho theo đợt cố định (100 giải lúc 10:00, 100 lúc 14:00) | M2 |
| `end_flush` | N phút cuối chuyển sang `guaranteed` để xả kho | M2 |
| `traffic_based` | Xác suất điều chỉnh theo lưu lượng dự kiến | M3 |

## 4. Ràng buộc

Có từ M1, cùng giao dịch trừ kho:

- Tồn kho từng giải; trừ nguyên tử, không bao giờ âm.
- **Ngân sách tổng** theo giá vốn: chặn khi vượt.
- Tối đa giải/người: M1 chỉ có **tổng cho cả chương trình** (`maxWinsPerPlayer`); theo ngày, theo loại: M2. Không trúng lặp cùng giải.
- **Hạn mức gói** ([D-23](../decisions.md), BIL-02, M1 Must — chưa làm): khi số mã còn hiệu lực đã phát + lượt đã đổi trong tháng chạm trần cứng (hạn mức + 10%), ngừng phát giải mới cho mọi chương trình của tổ chức; lượt chơi vẫn chạy, người chơi nhận kết quả không trúng ("Hôm nay quà đã hết, quay lại sau nhé").
- Tối đa giải/phút (chống vét quà): mức chống gian lận Cao, M2.
- Giới hạn theo cửa hàng (chuỗi nhiều quán, M2).

Từ M2 (mức Cao): lượt bị gắn cờ gian lận không được nhận giải; M1 chưa có gắn cờ ([D-28](../decisions.md), [participation §4](./participation.md#4-chống-gian-lận-theo-mức)).

## 5. Mô phỏng phát giải

Trước khi phát hành, chủ quán nhập **lưu lượng dự kiến** (ví dụ 300 khách/ngày). Mô phỏng chạy `simulate()` của `packages/core/src/prize` nhiều lần và trả lời bằng câu:

- "Với 300 khách/ngày, quà còn lại theo ngày như biểu đồ này."
- "Khả năng hết quà trước ngày kết thúc: 12%."
- "Khách thấy tỷ lệ trúng khoảng 1/5."
- "Tổng chi phí quà dự kiến: 1,6 triệu / ngân sách 2 triệu."

Kết quả mô phỏng nuôi cảnh báo trong bước kiểm tra trước khi phát hành ([builder §4.5](./builder.md#45-kiểm-tra-trước-khi-phát-hành-preflightts-bld-09)). Không đối thủ nào đang có tính năng này; nó trả lời trực tiếp nỗi sợ "hết quà trong 2 giờ đầu".

### 5.1 Theo dõi nhịp phát quà khi đang chạy (PRZ-22, M1 Should)

Từ ngày thứ 2, so lưu lượng thật/ngày với dự kiến, dự báo quà dư/thiếu khi kết thúc; lệch > 20% thì đề xuất tỷ lệ trúng mới tính bằng `simulate()` với số liệu thật, nút Áp dụng mở bản nháp đã sửa và phát hành lại sau xác nhận (vẫn qua kiểm tra trước phát hành). Chỉ đề xuất, không tự đổi; không bao giờ đề xuất tỷ lệ ≈ 0.

---

## 6. Đổi quà tại quầy

Đây là điểm biến một lượt chơi thành **lượt ghé quán đã xác thực** (North Star, [strategy §8](../strategy.md#8-chỉ-số)).

### 6.1 Luồng

```
Khách trúng → màn Trúng hiện mã 6 ký tự + QR (nút "Lưu mã") → khách tới quầy
Nhân viên mở Quầy đổi quà trên điện thoại (máy quầy ghép QR hoặc tài khoản "chỉ đổi quà")
  → quét QR / gõ mã / tìm theo SĐT
  → thấy: tên + ảnh quà, tên khách, chương trình, hạn, trạng thái (chưa đổi / đã đổi lúc… bởi… / hết hạn / huỷ / không thuộc quán / mã chơi thử)
  → [Xác nhận đã trao] → award.status = redeemed, ghi người/máy đổi, nhãn quán (PRZ-17), thời điểm
```

### 6.2 Quy tắc

| Quy tắc | Chi tiết | GĐ |
|---|---|---|
| Vai trò "chỉ đổi quà" | Chỉ thấy Quầy đổi quà; không xem/sửa chương trình, không xem danh sách khách | M1 |
| Không hoàn tác | Đổi nhầm thì owner mở lại ngay tại Quầy đổi quà, bắt buộc lý do (3–500 ký tự), có audit | M1 |
| Một mã một lần | Chống đổi hai lần dưới yêu cầu đồng thời (cập nhật có điều kiện) | M1 |
| Hạn đổi | Cố định = ngày kết thúc chương trình + 7 ngày (`VOUCHER_GRACE_MS`); gia hạn chương trình thì mã phát sau có hạn mới, mã đã phát giữ hạn cũ. Chỉnh hạn theo chương trình: M1 Could | M1 |
| Chống ảnh chụp màn hình | Màn quà của khách có đồng hồ chạy và trạng thái lấy từ server; mã đã đổi hiện "Đã đổi" | M1 |
| Không từ chối vì hạn mức gói | Hạn mức lượt đổi quà/tháng được giữ ở lúc **phát giải**; mã đã phát luôn đổi được ([D-23](../decisions.md), thay D-21) | M1 (Must — chưa làm; code hiện vẫn chặn ở 110% `PLAN_REDEMPTION_LIMIT`) |
| Tra theo SĐT | Khách mất mã/đổi trình duyệt: nhân viên tìm mã chưa đổi theo SĐT, đối chiếu tên; rate limit + audit `via=phone` ([D-25](../decisions.md), PRZ-15) | M1 (Must) |
| Khôi phục "Quà của tôi" | SĐT + 4 ký tự cuối của mã trên thiết bị mới; nút "Lưu mã" qua Zalo/ảnh; không mở thêm lượt chơi (PRZ-16) | M1 (Must) |
| Máy quầy | Điện thoại ghép bằng QR, quyền chỉ đổi quà, gắn nhãn quán, thu hồi được; mã ghép dùng một lần, hết hạn 10 phút; số máy theo gói Free 1 / Quán 3 / Chuỗi 30 `[GĐ]` ([D-24](../decisions.md), [ADR-017](../../adr/017-counter-device-pairing.md)) | M1 (Must; nhãn quán: Should, PRZ-17) |
| Quầy dạng PWA | Cài lên màn hình chính, giữ quyền camera, rung + âm báo, chữ kết quả rất to; không đổi offline (PRZ-18) | M1 (Should) |
| Chế độ tập huấn | Mã chơi thử bấm Xác nhận được, không ghi số liệu (PRZ-19) | M1 (Should) |
| Quà lần sau | Đổi quà xong tặng voucher cố định dùng từ ngày mai, hạn 14 ngày; sau khi trao quầy hiện "Nhắc khách: lần sau có quà"; quà tặng không ngẫu nhiên, ghi trong thể lệ (RET-06) | M1 (Could) / M2 |
| Điểm đổi quà | Chuỗi nhiều quán: mỗi quán một điểm đổi, báo cáo theo điểm; quản lý cửa hàng xem/thêm tồn kho, máy quầy, nhân viên của quán mình (PRZ-14, ORG-12) | M2 |
| Nhật ký quầy | Theo nhân viên/máy/ca + cờ bất thường (đổi < 2 phút sau khi trúng cùng IP máy quầy, > X mã/giờ, tỷ lệ tra SĐT cao) (PRZ-20) | M2 |
| Quà hết hạn quay về kho | Tuỳ chọn, ghi trong thể lệ; chờ ý kiến luật sư (PRZ-21) | M2 |
| Đổi hàng loạt | Upload CSV mã đã đổi (PRZ-09 bổ sung) | M2 |
| Tự đổi bằng PIN | Khách nhập PIN nhân viên đưa (khi quầy quá đông) | M3 |

### 6.3 Báo cáo

Đã phát / đã đổi / chưa đổi / hết hạn, theo ngày, theo quán (PRZ-17, M1 Should; điểm đổi quà PRZ-14 từ M2); chi phí quà đã đổi; tỷ lệ đổi. Đây là đầu vào của báo cáo kết quả ([playbooks §3](./playbooks.md#3-báo-cáo-kết-quả)).

---

## 7. Bốc thăm cuối chương trình (M2)

Chọn người trúng từ tập người chơi đã chốt, chạy trong Studio, kết quả lên trang công bố công khai và "Quà của tôi".

```
Studio:        [Chốt tập ứng viên (lọc AND/OR)] → [Công bố commit] → [Quay từng hạng] → [Huỷ có lý do?] → [Kết thúc]
Trang công bố: [commit + poolHash] → [người trúng theo spinNo] → [serverSeed sau khi kết thúc]
```

1. Chốt tập ứng viên (đã chơi, đã/chưa trúng, kênh, đạt điểm), sắp theo `player_id`, tính `poolHash`.
2. Server sinh `serverSeed` (CSPRNG), công bố `commit = sha256(serverSeed ‖ poolHash ‖ spinNo)` **trước** khi quay; `spinNo` tăng đơn điệu.
3. Chọn người trúng: `index = HMAC_SHA256(serverSeed, poolHash + ":" + spinNo) mod N` (lặp cho nhiều người, loại trùng).
4. Ghi `draw_spins` và `awards` trong một giao dịch.
5. Huỷ kết quả (người trúng không liên lạc được) ghi `void` kèm lý do, không xoá, `spinNo` tăng.
6. Sau khi kết thúc công bố `serverSeed`; ai cũng kiểm chứng được.

Code provably-fair: `packages/core/src/draw`. API: [engineering/api.md](../../engineering/api.md).

---

## 8. Không hỗ trợ (có chủ đích)

- **Định trước người trúng** trong cơ chế ngẫu nhiên, hay upload sẵn danh sách người trúng.
- Đặt tỷ lệ ≈ 0 để "giữ" giải lớn (cách Woobox hướng dẫn). Dùng rải quà và ngân sách.
- Thay vào đó: **Tặng quà theo danh sách** (PRZ-12, M3) hoặc **Quà lần sau** (RET-06), ghi rõ là quà tặng trong thể lệ, không chạy hiệu ứng quay.

## 9. Tiêu chí nghiệm thu M1

1. 1.000.000 lượt mô phỏng, 50 luồng đồng thời: 0 vượt tồn kho, ngân sách, giới hạn/người.
2. `time_uniform`: quà còn lại bám đường kế hoạch ± 10%.
3. Một mã chỉ đổi được một lần dưới 20 yêu cầu đồng thời; mã hết hạn bị từ chối có thông báo rõ.
4. Nhân viên vai trò "chỉ đổi quà" không gọi được API nào ngoài tra cứu, tìm theo SĐT và đổi mã (test cross-role).
5. Mã đã phát luôn đổi được kể cả khi tổ chức đã chạm hạn mức gói ([D-23](../decisions.md)).
6. Khách đổi trình duyệt vẫn đổi được quà: tra theo SĐT ở quầy hoặc khôi phục Quà của tôi ([D-25](../decisions.md)); tra/khôi phục sai quá số lần → 429.
7. Máy quầy: token đổi được mã tổ chức mình, 404 với tổ chức khác, 401 sau thu hồi; mã ghép dùng lại bị từ chối (ORG-10).
