# Đặc tả Giải thưởng và Đổi quà

Cập nhật: 26/10/2026 · Owner: PO · PRD: PRZ-*, ORG-02a ([prd §5.7](../prd.md#57-giải-và-đổi-quà-prz)) · Kỹ thuật: [architecture §6–7](../../engineering/architecture.md), [ADR-012 §4](../../adr/012-campaign-architecture.md) · Code lõi: `packages/core/src/prize` (`decide`, `simulate`)

Đây là trụ "lý do tin" của Playora: **quà không bao giờ phát sai, và mỗi lần đổi quà là một lượt khách thật tới quán.**

---

## 1. Loại giải

| Loại | Mô tả | Cách nhận | GĐ |
|---|---|---|---|
| `physical` | Hiện vật, dịch vụ tại quán (topping, size up, giảm giá tại quầy) | Đổi tại quầy | M1 |
| `voucher_code` | Mã từ kho (import CSV hoặc sinh theo mẫu) | Hiện mã; đổi tại quầy hoặc dùng online | M1 |
| `consolation` | Giải an ủi, có hoặc không giới hạn | Tuỳ | M1 |
| `no_prize` | Không trúng | — | M1 |
| `digital` | Link, file, nội dung số | Tự động | M2 |
| `e_gift` | Topup, e-voucher qua đối tác | Tự động | M4 |
| `points` | Điểm thưởng (hub điểm hoặc hệ thống của quán) | Tự động | M3/M4 |

Mỗi giải có **giá vốn** (`valueVnd`, VND, số nguyên) để tính ngân sách và báo cáo chi phí cho mỗi lượt ghé quán.

---

## 2. Cách phát giải

Builder bắt người dùng **chọn cách phát trước**, rồi chỉ hiện những trường cách đó cần (học từ 派奖方式 của 凡科).

| Chế độ | Mô tả | Khi nào dùng | GĐ |
|---|---|---|---|
| `per_prize_probability` | Mỗi giải có xác suất riêng (thang 1/10.000), tổng ≤ 100% | Quán muốn tự đặt tỷ lệ | M1 |
| `overall_win_rate` | Một tỷ lệ trúng tổng; khi trúng chọn giải theo tồn kho còn lại | Mặc định của playbook | M1 |
| `guaranteed` | Ai chơi cũng trúng một giải (theo tồn kho) | Khai trương, tri ân | M1 |
| `score_threshold` | Game skill: đạt điểm ngưỡng thì được một lượt xét giải | Hứng quà | M1 |
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
- Tối đa giải/người (tổng, theo ngày, theo loại); không trúng lặp cùng giải.
- Tối đa giải/phút (chống vét quà).
- Giới hạn theo cửa hàng (chuỗi nhiều quán, M2).

Lượt bị gắn cờ gian lận không được nhận giải ([participation §4](./participation.md#4-chống-gian-lận-theo-mức)).

## 5. Mô phỏng phát giải

Trước khi phát hành, chủ quán nhập **lưu lượng dự kiến** (ví dụ 300 khách/ngày, cao điểm 11–13h và 17–19h). Mô phỏng chạy `simulate()` của `packages/core/prize` nhiều lần và trả lời bằng câu:

- "Với 300 khách/ngày, quà còn lại theo ngày như biểu đồ này."
- "Khả năng hết quà trước ngày kết thúc: 12%."
- "Khách thấy tỷ lệ trúng khoảng 1/5."
- "Tổng chi phí quà dự kiến: 1,6 triệu / ngân sách 2 triệu."

Kết quả mô phỏng nuôi cảnh báo trong bước kiểm tra trước khi phát hành ([builder §4.5](./builder.md#45-kiểm-tra-trước-khi-phát-hành)). Không đối thủ nào đang có tính năng này; nó trả lời trực tiếp nỗi sợ "hết quà trong 2 giờ đầu".

---

## 6. Đổi quà tại quầy

Đây là điểm biến một lượt chơi thành **lượt ghé quán đã xác thực** (North Star, [strategy §8](../strategy.md#8-chỉ-số)).

### 6.1 Luồng

```
Khách trúng → màn Kết quả hiện mã ngắn + QR → khách tới quầy
Nhân viên mở Quầy đổi quà (điện thoại) → quét QR / gõ mã
  → thấy: tên quà, ảnh, hạn, trạng thái (chưa đổi / đã đổi lúc… / hết hạn / không thuộc quán)
  → [Xác nhận đã trao]  → award.status = redeemed, ghi người đổi, điểm đổi, thời điểm
```

### 6.2 Quy tắc

| Quy tắc | Chi tiết | GĐ |
|---|---|---|
| Vai trò "chỉ đổi quà" | Chỉ thấy Quầy đổi quà; không xem/sửa chương trình, không xem danh sách khách | M1 |
| Không hoàn tác | Đổi nhầm thì owner mở lại, bắt buộc ghi lý do, có audit | M1 |
| Một mã một lần | Chống đổi hai lần dưới yêu cầu đồng thời (cập nhật có điều kiện) | M1 |
| Hạn đổi | Mặc định đến hết chương trình + 7 ngày `[GĐ]`, chỉnh được | M1 |
| Chống ảnh chụp màn hình | Màn quà của khách có đồng hồ chạy và trạng thái lấy từ server; mã đã đổi hiện "Đã đổi" | M1 |
| Điểm đổi quà | Chuỗi nhiều quán: mỗi quán một điểm đổi, báo cáo theo điểm | M2 |
| Tự đổi bằng PIN | Khách nhập PIN nhân viên đưa (khi quầy quá đông) | M3 |
| Đổi hàng loạt | Upload CSV mã đã đổi; cập nhật vận chuyển cho quà gửi bưu điện | M2 |

### 6.3 Báo cáo

Đã phát / đã đổi / chưa đổi / hết hạn, theo ngày, theo điểm đổi; chi phí quà đã đổi; tỷ lệ đổi. Đây là đầu vào của báo cáo kết quả ([playbooks §3](./playbooks.md#3-báo-cáo-kết-quả)).

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
- Thay vào đó: **Tặng quà theo danh sách** (M3), ghi rõ là quà tặng, không chạy hiệu ứng quay.

## 9. Tiêu chí nghiệm thu M1

1. 1.000.000 lượt mô phỏng, 50 luồng đồng thời: 0 vượt tồn kho, ngân sách, giới hạn/người.
2. `time_uniform`: quà còn lại bám đường kế hoạch ± 10%.
3. Một mã chỉ đổi được một lần dưới 20 yêu cầu đồng thời; mã hết hạn bị từ chối có thông báo rõ.
4. Nhân viên vai trò "chỉ đổi quà" không gọi được API nào ngoài tra cứu và đổi mã (test cross-role).
