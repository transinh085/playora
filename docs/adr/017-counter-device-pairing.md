# ADR-017: Máy quầy ghép bằng QR (token thiết bị cho đổi quà)

| | |
|---|---|
| **Trạng thái** | Proposed |
| **Ngày** | 31/10/2026 |
| **Người quyết định** | Founder |
| **Thay thế / Liên quan** | [D-24](../product/decisions.md) · PRD ORG-10, ORG-02a · [ADR-006](./006-better-auth.md) · [ADR-008](./008-contract-first-api.md) · [security](../engineering/security.md) |

## Bối cảnh

Quầy đổi quà hiện yêu cầu nhân viên là thành viên tổ chức (Better Auth, vai trò `redeemer`) và đăng nhập bằng email. Nhân viên quán F&B thay liên tục, nhiều người không muốn dùng email cá nhân; đây là ma sát lớn nhất của giả định A3 ([strategy §9](../product/strategy.md#9-giả-định-rủi-ro-nhất)). [D-24](../product/decisions.md) chốt về sản phẩm: owner/admin tạo "máy quầy" và ghép điện thoại bằng QR.

Ràng buộc:
- Quyền của máy quầy phải **hẹp hơn hoặc bằng** `redeemer`: chỉ `voucher:read` + `voucher:redeem` (+ tra theo SĐT của D-25) trong đúng một tổ chức.
- Thu hồi tức thì; mỗi lượt đổi vẫn ghi audit "ai đổi" (nhãn máy).
- Không làm bẩn danh sách thành viên/ghế; không thêm mật khẩu.
- Contract đã có tiền lệ token không phải phiên: `auth: 'player'` (`packages/contracts/src/api/route.ts`).

## Quyết định

Thêm chế độ auth thứ tư **`device`** cho contract và guard của API:

1. **Bảng `counter_devices`** (thuộc tổ chức): `id`, `organizationId`, `label` ("Máy Tuấn"), `storeLabel` (PRZ-17), `tokenHash` (SHA-256), `createdBy`, `createdAt`, `lastSeenAt`, `revokedAt`. Repository lọc theo `organizationId` như mọi bảng khác.
2. **Ghép:** owner/admin gọi `POST /orgs/:orgId/counter-devices` → server tạo mã ghép dùng một lần, hết hạn 10 phút, hiện dưới dạng QR (`studio…/pair?c=…`). Điện thoại mở link → `POST /counter-devices/pair` đổi mã ghép lấy **token thiết bị** ngẫu nhiên 256 bit; server chỉ lưu hash. Token lưu ở cookie `httpOnly`, `SameSite=Strict`, phạm vi đường dẫn quầy.
3. **Quyền:** route khai báo `auth: ['session', 'device']` khi cho cả hai; guard `device` dựng một actor `{ kind: 'device', deviceId, organizationId }` với quyền cố định `voucher: ['read', 'redeem']`. Không route nào khác nhận `device`; mặc định là từ chối.
4. **Thu hồi:** `revokedAt` có giá trị thì token bị từ chối ngay ở request kế tiếp (tra DB, có cache ngắn ≤ 30 s trong Valkey nếu cần).
5. **Audit:** lượt đổi quà ghi `redeemedByDeviceId` (hoặc `redeemedByUserId` khi qua phiên); màn quầy và báo cáo hiện nhãn máy.
6. **Giới hạn:** rate limit theo thiết bị; số máy quầy theo gói `[GĐ]` (Free 1, Quán 3, Chuỗi 30).

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược | Vì sao không chọn |
|---|---|---|---|
| Tạo user Better Auth "ẩn" cho mỗi máy (email giả) | Dùng lại toàn bộ RBAC, phiên | Làm bẩn bảng user/thành viên, đếm ghế sai; email giả dễ lộ ra UI; phiên Better Auth có quyền rộng hơn cần | Phạm vi quyền khó khoá chặt |
| Một PIN chung của quán | Đơn giản nhất | Không biết ai đổi; PIN lộ thì phải đổi cho mọi người; dễ dò | Mất audit theo người, yếu bảo mật |
| Chỉ dùng magic link email (hiện tại) | Không thêm gì | Ma sát với nhân viên thời vụ | Không giải quyết A3 |

## Hệ quả

- **Tốt:** nhân viên mới dùng được quầy trong 10 giây; owner thu hồi khi nhân viên nghỉ; quyền tối thiểu; audit theo máy.
- **Chi phí:** chế độ auth mới trong `packages/contracts` (`RouteAuth`), guard mới trong `apps/api/src/common/auth`, bảng + migration, màn "Máy quầy" trong Studio, test.
- **Rủi ro:** token bị sao chép từ điện thoại → giảm bằng cookie `httpOnly`, quyền hẹp, `lastSeenAt` + cảnh báo khi một token dùng từ nhiều IP/UA khác nhau, thu hồi một chạm. Mất điện thoại → owner thu hồi.

## Kiểm chứng

- Test tích hợp: token thiết bị gọi lookup/redeem của tổ chức mình → 200; tổ chức khác → 404; mọi route khác → 401/403; token đã thu hồi → 401; mã ghép dùng lần hai hoặc quá 10 phút → 400.
- Pilot: ≥ 80% lượt đổi đi qua máy quầy ghép QR hoặc thành viên `redeemer` (G3).

## Lịch sử

- 31/10/2026: tạo (Proposed), theo D-24.
