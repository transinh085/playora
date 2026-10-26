# Ghi chú triển khai UI Tuân thủ (CMP-03, CMP-04)

**Ngày:** 27/10/2026  
**Nhánh:** `feat/studio-compliance`  
**Liên quan:** [compliance.md](../business/compliance.md) §2 & §4, [prd.md](../product/prd.md) §5.11

---

## 1. Các tính năng đã xây dựng

### CMP-03: Loại chương trình & Checklist pháp lý trước phát hành
1. **Bước "Thể lệ & pháp lý" (Bước 4 trong panel Luật & giải):**
   - Đặt câu hỏi *"Khách có phải mua hàng mới được chơi không?"* với 2 lựa chọn:
     - **Có (`purchase_linked`):** Gắn với đơn hàng/mua hàng. Cảnh báo kèm lời khuyên pháp lý thận trọng: *"Chương trình may rủi gắn với mua hàng cần thông báo Sở Công Thương trước khi triển khai (nên tham khảo ý kiến luật sư hoặc cơ quan quản lý)."*
     - **Không (`not_linked`):** Chơi tự do / quà tặng. Nêu rõ: *"Chương trình chơi tự do không gắn điều kiện mua hàng thường không thuộc diện phải thông báo khuyến mại may rủi (nên tham khảo ý kiến luật sư để đảm bảo)."*
2. **Hộp thoại Publish (`publish-dialog.tsx`):**
   - Nếu `compliance.promotionType === null`, hiển thị câu hỏi inline để chủ quán chọn ngay trong hộp thoại.
   - Checklist pháp lý bắt buộc hoàn thành trước khi nút Publish được bật:
     - (a) *"Tôi là đơn vị tổ chức chương trình và chịu trách nhiệm trao quà"*
     - (b) *(chỉ với purchase_linked)* *"Tôi đã/ sẽ thông báo Sở Công Thương nơi tổ chức trước ngày bắt đầu"* kèm popover giải thích căn cứ NĐ 81/2018/NĐ-CP và NĐ 128/2024/NĐ-CP
     - (c) *"Đã kiểm tra thể lệ"*
   - Khi bấm Publish, lưu `checklistAcknowledgedAt = new Date().toISOString()`.
   - Các lần publish sau đó sẽ hiển thị checklist đã được tick sẵn nhưng vẫn hiển thị rõ ràng.
   - Giữ nguyên các cảnh báo hạn mức gói (`PlanCampaignLimitAlert`) và xử lý lỗi billing.
3. **Cảnh báo Preflight (`preflight.ts`):**
   - Thêm mã lỗi `unselectedPromotionType` ở mức `warning` (không chặn publish nếu đã xử lý ở dialog).

### CMP-04: Thể lệ tự sinh và cho phép chỉnh sửa
1. **Thể lệ tự sinh:** Dùng hàm `generateTerms` từ `@playora/core/compliance` kết hợp tên tổ chức (lấy từ Studio org context), thông tin giải thưởng, quy tắc và ân hạn đổi thưởng 7 ngày.
2. **Xem trước & chỉnh sửa:**
   - Hiển thị xem trước thể lệ tự sinh với `whitespace-pre-wrap` và tag trạng thái *"Thể lệ tự sinh"*.
   - Nút *"Sửa thể lệ"* chuyển sang `Input.TextArea` điền sẵn nội dung thể lệ để người dùng tuỳ chỉnh (lưu vào `compliance.termsText`).
   - Khi đang dùng thể lệ tuỳ chỉnh, hiển thị nút *"Dùng lại thể lệ tự sinh"* để đặt lại `termsText: null`.

---

## 2. Kiểm thử & Độ tin cậy
- **Unit test preflight (`preflight.test.ts`):** Kiểm tra `unselectedPromotionType` là warning khi `promotionType === null` và biến mất khi đã chọn loại chương trình.
- **Unit test checklist logic (`publish-compliance.test.ts`):** Kiểm tra toàn bộ ma trận trạng thái của checklist (chưa chọn loại chương trình, thiếu ô tick của purchase_linked vs not_linked, preflight error blocking).
- **Unit test component (`rules-prizes-panel.test.tsx`):** Kiểm tra render bước 4, hiển thị câu hỏi pháp lý, bản xem trước thể lệ tự sinh và chuyển đổi textarea thể lệ tuỳ chỉnh.
- **Unit test i18n (`messages.test.ts`):** Đảm bảo đồng bộ 100% key giữa `vi.json` và `en.json`.
- **E2E Playwright specs (`builder-lab.spec.ts`, `billing.spec.ts`, `playbook-create.spec.ts`):** Cập nhật các luồng publish để trả lời câu hỏi và tick các ô checklist pháp lý trước khi bấm nút Publish.
