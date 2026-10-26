# Báo cáo Triển khai "Chia sẻ & QR" (EVT-10, EVT-11 UI)

**Ngày:** 27/10/2026  
**Nhánh:** `feat/studio-share-qr`  
**Liên quan:** Roadmap P1.4, P2.2 · PRD EVT-10, EVT-11 · [docs/product/specs/participation.md §5](../product/specs/participation.md#5-kênh-phân-phối)

---

## 1. Nội dung đã thực hiện

### 1.1 Trang "Chia sẻ & QR" (`/orgs/[orgId]/campaigns/[campaignId]/share`)
- **Định tuyến & Điều hướng:**
  - Route mới: `/orgs/[orgId]/campaigns/[campaignId]/share` với `PageHeader`, breadcrumbs, nút quay lại trang chi tiết, nút chơi thử (nếu nháp) hoặc mở trang chơi thật (nếu đã phát hành).
  - Bổ sung nút "Chia sẻ & QR" trên header của trang chiến dịch (`HeaderActions` trong `campaign-ops.tsx`) và trong hộp thoại phát hành thành công (`PublishDialog` / `PublishSuccess`).
  - Tích hợp `CampaignShareView` vào tab `Chia sẻ & QR` (`ShareTab`) trong `campaign-ops.tsx` mà không làm thay đổi cấu trúc tab Tổng quan.
- **Kênh phân phối (Distribution Channels):**
  - **Kênh mẫu (Presets):**
    - `table-qr`: QR để bàn
    - `counter`: Quầy thu ngân
    - `fanpage`: Fanpage Facebook
    - `zalo`: Zalo OA / Chat
  - **Thêm kênh tuỳ chỉnh (Custom Channels):**
    - Modal thêm kênh với tên và mã kênh tự động chuẩn hoá theo quy tắc slugify (`slugifyChannelKey`), đảm bảo tuân thủ định dạng `/^[a-z0-9_-]{1,64}$/`.
    - **Lưu trữ client-side:** Danh sách kênh tuỳ chỉnh được lưu trong `localStorage` theo từng chiến dịch (`playora:campaign:custom-channels:${campaignId}`) cho giai đoạn M1.
  - **Hành động trên từng kênh:**
    - Đường dẫn tham gia đầy đủ: `${NEXT_PUBLIC_PLAY_URL}/${slug}?ch=${channelKey}` kèm nút sao chép nhanh (copy to clipboard với thông báo toast qua `App.useApp()`).
    - Hiển thị mã QR bằng component `QRCode` của Ant Design.
    - Nút **Tải PNG** và **Tải SVG** trực tiếp từ canvas / SVG của Ant Design QRCode (sử dụng browser API `XMLSerializer`, không thêm thư viện ngoài).
    - Lối tắt in nhanh: nút "In Standee A5" và "In Tent card A6".
- **Báo cáo hiệu quả theo kênh (Report by Channel):**
  - Bổ sung hook `useCampaignReport(orgId, campaignId)` gọi `campaignsApi.report` từ `@playora/contracts`.
  - Hiển thị bảng số liệu trực quan: Lượt chơi (plays), Trúng thưởng (wins), Đến quầy đổi quà (visits), Tỷ lệ đổi quà (redemption rate) cho từng kênh.
- **Mời nhân viên quầy (Counter Staff Invitation):**
  - Khối hướng dẫn và nút dẫn tới trang Thành viên (`/orgs/[orgId]/settings`), giải thích rõ vai trò "Chỉ đổi quà" (`redeemer`): chỉ có quyền tra cứu và đổi voucher tại Quầy đổi quà, không thể can thiệp cấu hình chương trình.

### 1.2 Mẫu in Standee & Tent Card (`/orgs/[orgId]/campaigns/[campaignId]/share/print`)
- **Route riêng biệt không chứa app chrome:**
  - Định tuyến thông qua nhóm route `(print)` (`apps/studio/src/app/(print)/...`), hoàn toàn tách biệt khỏi `AppShell` của Studio (không có sidebar, header, padding dư thừa).
- **Tham số URL:**
  - `?ch=<channelKey>`: Kênh áp dụng mã QR (mặc định: `table-qr`).
  - `?format=standee|tent`: Định dạng in (mặc định: `standee`).
- **Thanh công cụ xem trước (Toolbar):**
  - Nút quay lại trang Chia sẻ & QR.
  - Menu chuyển đổi kênh phân phối tức thì.
  - Bộ chọn định dạng (`Standee A5` / `Tent card A6`).
  - Nút "In ngay" (`window.print()`).
  - Thanh công cụ được ẩn tự động khi in nhờ lớp `.no-print` và `@media print`.
- **Mẫu Standee A5 (148mm × 210mm):**
  - Khổ A5 dọc chuẩn in ấn (`@page { size: 148mm 210mm; margin: 0; }`).
  - Hiển thị logo quán (nếu trang bìa có gắn ảnh trong ô `logo`), tên chiến dịch, khẩu hiệu (ô `promoText`).
  - Lời kêu gọi hành động nổi bật: "Quét để nhận quà".
  - Mã QR khổ lớn (kèm viền màu thương hiệu từ `campaign.brand`).
  - Hướng dẫn quét bằng camera điện thoại hoặc Zalo.
- **Mẫu Tent card A6 gấp đôi (Folded Tent card):**
  - In trên tờ A5 ngang/dọc với 2 nửa mặt đối xứng A6 (148mm × 105mm).
  - Nửa trên được xoay lộn ngược 180° (`transform: rotate(180deg)`), phân cách bằng đường nếp gấp nét đứt (`✂ Nếp gấp / Fold here ✂`), nửa dưới quay xuôi.
  - Khi gấp đôi và đặt trên bàn tiệc/quầy cà phê, khách ở cả hai phía đối diện đều đọc và quét được mã QR chuẩn xác.
- **Cảnh báo bản nháp (Draft warning):**
  - Với các chiến dịch ở trạng thái `draft`, hiển thị cảnh báo trên thanh công cụ và trên mẫu in để chủ quán biết mã QR chỉ hoạt động sau khi xuất bản chính thức.

### 1.3 Kiểm thử & Chất lượng
- **Unit test (`apps/studio/src/features/builder-lab/lib/channels.test.ts`):**
  - 12 ca kiểm thử toàn diện cho hàm `slugifyChannelKey`, `buildPlayerLink`, kiểm tra regex, loại bỏ dấu tiếng Việt, ký tự đặc biệt, giới hạn 64 ký tự và danh sách kênh preset.
- **E2E test (`tooling/e2e/tests/share-qr.spec.ts`):**
  - Kịch bản Playwright hoàn chỉnh: Tạo tài khoản, tạo tổ chức, tạo chiến dịch (`antiFraud: 'low'`), publish qua API, đăng nhập Studio, mở trang `/share`, xác thực liên kết `?ch=table-qr`, kiểm tra mở mẫu in Standee và xác nhận mã QR render thành công.
- **Đa ngôn ngữ (i18n):**
  - Bổ sung đầy đủ các khóa dịch trong cả `vi.json` và `en.json` thuộc gói `@playora/i18n`. Kiểm tra parity test đạt 100%.

---

## 2. Ghi chú kỹ thuật & Tương thích
- Không thêm bất kỳ npm dependency mới nào; sử dụng `QRCode` sẵn có của Ant Design kết hợp Browser Canvas / XMLSerializer.
- Không thay đổi contracts (`packages/contracts`) hoặc backend API (`apps/api`), hook gọi đúng endpoint `campaignsApi.report` có sẵn.
- Trạng thái PRD trong `docs/product/prd.md` đã được cập nhật thành công cho `EVT-10` và `EVT-11`.
