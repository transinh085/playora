# Đặc tả Playbook và Báo cáo kết quả

Cập nhật: 31/10/2026 · Owner: PO · Trạng thái: **Mới ở v4.0** · §1–§3 đã chạy ở Studio với API thật (PLB-01…PLB-04); PLB-08, PLB-10 là việc M1 còn mở; PLB-09, PLB-11 M2 · PRD: PLB-* ([prd §5.2](../prd.md#52-playbook-và-kết-quả-plb--mới-ở-v40)) · Quyết định: [D-15](../decisions.md), [D-16](../decisions.md)

Builder trả lời "làm game thế nào". Playbook và báo cáo trả lời câu chủ quán thực sự hỏi: **"Làm chương trình gì, và nó mang lại gì cho quán?"**

---

## 1. Playbook là gì

Một playbook là **gói dựng sẵn theo mục tiêu kinh doanh**, gồm:

| Thành phần | Ví dụ ("Khách quay lại lần 2") |
|---|---|
| Mục tiêu và câu chào | "Khách mới quay lại trong 14 ngày" |
| Mẫu + skin gợi ý | Cào thẻ, skin quanh năm |
| Luật mặc định | Chỉ khách đã đổi quà lần 1 được chơi lần 2; 1 lượt/ngày; chạy 30 ngày |
| Cơ cấu quà theo ngân sách | 60% size up, 30% topping, 10% giảm 20%; tự tính số lượng từ ngân sách và giá vốn |
| Cách phát giải + rải quà | `overall_win_rate` 25%, `time_uniform`, `opening_hours` |
| Danh tính | Form tên + SĐT, consent marketing (để nhắc quay lại) |
| Kênh và vật in | QR để bàn + tent card "Quét để chơi lần 2" |
| Chỉ số theo dõi | % khách quay lại lần 2 trong 14 ngày; chi phí quà cho mỗi khách quay lại |

Playbook **chỉ là cấu hình ban đầu**: sau khi tạo, mọi thứ sửa được bằng builder như bình thường. Không có logic riêng cho từng playbook ở server.

## 2. Playbook M1 (F&B đồ uống)

| Playbook | Mục tiêu | Cơ chế chính | Chỉ số chính |
|---|---|---|---|
| **Tết kéo khách** | Đông khách hơn dịp Tết | Vòng quay, skin Tết, 1 lượt/ngày, rải quà theo giờ mở cửa | Lượt đổi quà/ngày (so với ngày thường khi có mốc so sánh, PLB-08) |
| **Khách quay lại lần 2** | Khách mới thành khách quen | Lượt chơi thứ 2 chỉ mở cho người đã đổi quà lần 1 | % quay lại trong 14 ngày |
| **Lấp ngày vắng** | Tăng khách thứ 2–thứ 4 | Chương trình chỉ mở các ngày/khung giờ vắng; quà cao hơn | Lượt đổi quà ngày vắng so với số khách ngày thường chủ quán nhập (PLB-08, ước tính) |

Sau pilot thêm: khai trương, ra mắt món mới, sinh nhật quán, theo dịp (8/3, 30/4, Trung thu, 20/10) (PLB-06, M2). Ngành khác (spa, gym, bán lẻ) từ M2–M3 (PLB-06).

### 2.1 Luồng tạo

```
Trang chủ hoặc /campaigns/new → "Bạn muốn gì?" (3 thẻ playbook, hoặc "Tự chọn mẫu")
  → Thiết lập: tên, ngày chạy, ngày mở trong tuần, giờ mở cửa, ngân sách quà, quà + giá vốn (gợi ý sẵn),
    lượng khách dự kiến/ngày; (M1 Should) số khách ngày thường — PLB-08
  → Đề xuất cập nhật trực tiếp: số lượng từng quà, tỷ lệ trúng, rủi ro hết quà, chi phí dự kiến, câu tóm tắt
  → "Tạo" mở Builder ở chế độ Sửa nhanh, đã có đủ giải và luật
```

"Tự chọn mẫu" mở kho mẫu (BLD-01) cho người muốn chọn mẫu và skin.

### 2.2 Gợi ý cơ cấu quà

Đầu vào: ngân sách `B`, giá vốn từng quà `c_i`, tỷ lệ mỗi loại `w_i` (theo playbook), lưu lượng dự kiến `N` khách/ngày × `D` ngày.

- Số lượng quà `q_i = floor(B × w_i / c_i)`, luôn `Σ q_i × c_i ≤ B`; giá vốn = 0 thì không tính vào ngân sách (cảnh báo).
- Tỷ lệ trúng gợi ý sao cho mô phỏng cho xác suất hết quà trước 90% thời gian ≤ 10%.
- Hiện cho chủ quán bằng câu: "Với 2 triệu, bạn phát được khoảng 400 phần quà, đủ cho 1 trong 4 khách trúng trong 20 ngày."

Dùng `simulate()` của `packages/core/src/prize`; không có mô hình mới.

---

## 3. Báo cáo kết quả

### 3.1 Tổng quan chương trình (luôn có)

```
┌ Khách tới quầy ┐┌ Khách quay lại ┐┌ Chi phí quà    ┐┌ Chi phí/khách tới quầy ┐
│ 312            ││ 97 (31%)       ││ 1,4tr / 2tr    ││ 4.500đ                 │
└────────────────┘└────────────────┘└────────────────┘└────────────────────────┘
[biểu đồ theo ngày: lượt chơi · lượt trúng · lượt đổi]   [theo kênh: QR bàn · fanpage · Zalo]
Quà: đã phát / đã đổi / còn lại theo từng loại
+ (M1 Should/Could) So với ngày thường (PLB-08) · Nhịp phát quà (PRZ-22) · Hiệu quả theo quà (PLB-10) · Theo quán (PRZ-17)
```

### 3.2 Định nghĩa chỉ số

| Chỉ số | Định nghĩa | Nguồn |
|---|---|---|
| Khách tới quầy | Số award `redeemed` tại quầy (một khách nhiều lần thì đếm nhiều lượt) | `awards` |
| Khách duy nhất tới quầy | Số người chơi có ≥ 1 award `redeemed` | `awards` × `players` |
| Khách quay lại | Người chơi có ≥ 2 lần đổi quà ở **hai ngày khác nhau**. Từ M2 (PLB-09): người có ≥ 2 lượt ghé đã xác thực (đổi quà hoặc quét thẻ thành viên RET-08) ở 2 ngày khác nhau; chỉ số cũ đổi tên "khách đổi quà ≥ 2 lần" | `awards` |
| Chi phí quà | Tổng giá vốn quà đã đổi (quà phát mà chưa đổi không tính, hiện riêng) | `prizes.valueVnd` |
| Chi phí mỗi khách tới quầy | Chi phí quà / khách tới quầy | — |
| Tỷ lệ đổi | Đã đổi / đã phát (quà hiện vật) | `awards` |
| So với ngày thường (PLB-08) | Khách tới quầy / số khách ngày thường chủ quán nhập lúc tạo (theo thứ); luôn ghi "ước tính" và ẩn khi không có baseline | `campaign` + `awards` |

**Không** hiện "doanh thu tăng thêm" ở M1: Playora chưa biết hoá đơn. Doanh thu thật đến từ tích hợp POS (ANL-07, M4).

### 3.3 Báo cáo một trang (PLB-04)

Cuối chương trình (hoặc bấm "Xem báo cáo"): một trang in được gồm mục tiêu, thời gian, 4 số chính, biểu đồ theo ngày, quà theo loại, 3 nhận xét tự sinh từ số liệu ("Ngày đông nhất: 28 Tết, 64 khách"), và gợi ý chương trình tiếp theo (M3). Đây cũng là chất liệu case study.

### 3.4 Benchmark (M3)

Khi đủ ≥ 30 chương trình cùng ngành: "Quán trà sữa trung bình: 26% khách quay lại; quán bạn: 31%". Số liệu gộp ẩn danh, không lộ tên quán; cần điều khoản dịch vụ cho phép dùng dữ liệu tổng hợp ([compliance](../../business/compliance.md)).

### 3.5 Báo cáo bổ sung

- **Hiệu quả theo quà (PLB-10, M1 Could):** bảng theo từng giải (đã phát, đã đổi, tỷ lệ đổi, chi phí/lượt đổi); giải có tỷ lệ đổi < 50% sau ≥ 30 lượt phát hiện gợi ý thay bằng quà dễ dùng hơn.
- **Email tóm tắt hằng ngày 7:30 (ANL-10, M1 Should):** gửi cho chủ quán có chương trình đang chạy (4 số hôm qua, % quà còn lại, cảnh báo bất thường, link về Tổng quan); dùng cùng nguồn số liệu với §3.2.
- **Báo cáo chia sẻ được (PLB-11, M2):** xuất ảnh PNG 1080×1350 có 4 số chính + so sánh 2 chương trình của cùng quán.
- **Bản đồ nhiệt giờ × thứ (ANL-09, M2):** lượt chơi và lượt đổi quà theo 7 thứ × khung giờ mở cửa, nút tạo chương trình "Lấp ngày vắng" điền sẵn khung vắng nhất.

---

## 4. Nghiệm thu M1

1. Chủ quán tạo chương trình Tết từ playbook, chỉ nhập ngân sách, giá vốn, ngày; giải và luật được điền đủ để phát hành.
2. Tổng số lượng quà gợi ý × giá vốn ≤ ngân sách.
3. Bốn số chính khớp 100% với dữ liệu `awards` trong test tích hợp.
4. Báo cáo một trang hiển thị đúng trên A4 và trên điện thoại.
5. Không có baseline thì ẩn dòng so sánh với ngày thường (PLB-08).
