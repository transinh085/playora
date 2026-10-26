# ADR-015: Lưu Campaign trên `events` + `games` + `game_versions`

| | |
|---|---|
| **Trạng thái** | Accepted |
| **Ngày** | 26/10/2026 |
| **Người quyết định** | Founder |
| **Thay thế / Liên quan** | Mở rộng [ADR-012](./012-campaign-architecture.md) §5 · [ADR-014](./014-free-canvas-screen-editor.md) · [../product/specs/studio-ux.md](../product/specs/studio-ux.md) §5 (giai đoạn B) |

## Bối cảnh

Builder Lab ([kế hoạch builder §11](../plans/2026-10-25-game-builder-plan.md)) đã thay mô hình "Sự kiện → nhiều Trò chơi" bằng **một Campaign** ("Chương trình" trên UI), hiện lưu trong localStorage qua backend giả `apps/studio/src/features/builder-lab/mock/`. Kiểu dữ liệu (`mock/types.ts`):

- `Campaign`: `name`, `templateKey`, `skinKey`, `brand` (bảng màu), `screens: CanvasDoc` (màn canvas, ADR-014), `prizes: LabPrize[]`, `rules: LabRules`, `status` (`draft | published`), `paused`, `version`, `publishedAt`.
- `LabRules`: `mode` (`PrizeMode` của `@playora/core/prize`), `overallWinRate`, `playsPerDay`, `maxWinsPerPlayer`, `startsAt`, `endsAt`, `openingHours`, `pacing` (`time_uniform`), `budgetVnd`, `collectForm`.
- `LabPrize`: `name`, `image`, `quantity`, `valueVnd`, `probability`.
- `PlayRecord`, `Voucher` (`code`, `redeemedAt`), `CampaignStats`.
- API giả: `listCampaigns`, `getCampaign`, `createCampaign`, `updateCampaign`, `deleteCampaign`, `publishCampaign`, `pauseCampaign`, `resumeCampaign`, `endCampaign`, `listCampaignPlays`, `listCampaignVouchers`, `startPlay`, `listMyVouchers`, `lookupVoucher`, `redeemVoucher`, `getCampaignStats`.

Schema hiện có (`packages/db/src/schema`):

- `events`: `slug` (unique), `name`, `status` (`draft/scheduled/live/ended/archived`), `timezone`, `startsAt`, `endsAt`, `identityConfig`, `registrationForm`, `brandKitId`, `playerLimit`, `deletedAt`.
- `games`: `eventId`, `templateKey`, `templateVersion`, `skinKey`, `draftConfig` jsonb, `hotConfig` jsonb, `status`, `currentVersionId`.
- `game_versions`: `gameId`, `version`, `templateKey`, `templateVersion`, `skinKey`, `config` jsonb (bất biến), `configHash`, `publishedBy`.
- `prizes`: `eventId`, `gameId?`, `name`, `imageAssetId`, `quantity`, `issued`, `remaining` (check ≥ 0), `valueVnd`.
- `awards`: `prizeId`, `playerId`, `redeemCode` (unique theo event), trạng thái `issued/notified/redeemed/void`.
- Chưa có: `plays`, `play_counters`, `voucher_codes`, `prize_counters`, `prizes.rules`, `events.schedule/participation/antiFraud` (đã quyết ở ADR-012 §5).

Cần chọn cách lưu Campaign thật trước khi viết contract và API (giai đoạn B, P0 của kế hoạch builder).

## Quyết định

**Phương án A: tái dùng bảng hiện có, M1 cố định "1 Campaign = 1 event có đúng 1 game".**

| Trường Campaign | Lưu ở |
|---|---|
| `id`, `name`, slug, lịch (`startsAt`, `endsAt`, timezone), `paused`, trạng thái vòng đời | `events` (`status` + cột `paused`; trạng thái hiển thị suy ra như `lib/phase.ts`) |
| `rules.openingHours` | `events.schedule` (ADR-012 §5) |
| `rules.playsPerDay`, `rules.collectForm` | `events.participation`, `events.registrationForm` |
| `brand` | `events.brandKitId` + ghi đè màu trong config game |
| `templateKey`, `skinKey` | `games` |
| `screens`, `brand` ghi đè, nội dung ô | `games.draftConfig` (nháp) → `game_versions.config` (bất biến khi publish) |
| `version`, `publishedAt` | `game_versions.version`, `createdAt` |
| `rules.mode`, `overallWinRate`, `pacing`, `maxWinsPerPlayer`, `budgetVnd` | cấu hình prize engine của game: `prizes.rules` + ngân sách cấp game (ADR-012 §5). Snapshot luật vào `game_versions.config` khi publish để lượt chơi đọc bản bất biến |
| `prizes[]` | `prizes` (`gameId` bắt buộc) |
| `PlayRecord` | `plays` (mới, ADR-012) |
| `Voucher` | `awards.redeemCode` cho mã do hệ thống sinh; `voucher_codes` cho mã nhập từ CSV |

Contract mới trong `packages/contracts/src/api/`:

- `campaigns.ts`: list, get, create (từ template + skin, slug tự sinh), update draft, publish, pause, resume, end, delete. Route `/orgs/:orgId/campaigns[...]` là **mặt tiền** gộp `events` + `games` + `prizes` trong một transaction; route `events`/`games` cũ giữ cho tới khi gỡ UI cũ (giai đoạn C).
- `plays.ts`: `POST /p/:slug/plays` (đường nóng ADR-012 §4), Quà của tôi.
- `vouchers.ts`: tra mã, đổi mã (không hoàn tác; mở lại chỉ owner, có audit và lý do).
- `stats.ts`: số liệu chương trình (lượt, người chơi, trúng, đã đổi, ngân sách đã dùng, tồn kho theo giải).

Quyền: thêm resource `campaign` và `voucher` vào `packages/auth/src/permissions.ts`, cùng vai trò mới **`redeemer` ("chỉ đổi quà")**: chỉ `voucher: ['read', 'redeem']`, không xem hay sửa chương trình. Có test quyền và e2e cross-tenant theo AGENTS.md.

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| **A. Tái dùng `events` + `games` + `game_versions`** (đề xuất) | Giữ publish bất biến, `hotConfig`, audit, guest list, players, `awards`, cross-tenant test đã có; ít migration; nhiều game/chương trình vẫn mở được sau này | Một Campaign ghi vào 3 bảng; phải giữ bất biến "đúng 1 game" ở service; tên `events` lệch tên UI |
| B. Bảng `campaigns` mới (gộp tất cả, config jsonb) | Khớp 1–1 với mock; đọc ghi đơn giản | Lặp lại publish/version/hot edit; players, awards, prizes đang FK tới `events` phải đổi hoặc nhân đôi; hai mô hình song song tới khi gỡ cũ; nhiều migration |
| C. Đổi tên `events` → `campaigns` | Tên khớp UI | Đã bác ở ADR-012 §5: tốn công, không có giá trị |

Không thấy điểm chặn trong code cho phương án A: `games.draftConfig`/`game_versions.config` là jsonb nên chứa được `screens` và config template; `prizes.gameId` đã có.

## Hệ quả

- **Tốt:** API Campaign đến nhanh nhất; UI Builder Lab chỉ cần đổi `mock/hooks.ts` sang `useRouteQuery`/`useRouteMutation`.
- **Chi phí:** service `campaigns` điều phối 3 module (gọi qua service, không dùng repository chéo module theo `noRestrictedImports`); một migration duy nhất cho ADR-012 §5 cộng `events.paused`.
- **Rủi ro:** về sau cần nhiều game mỗi chương trình (retention hub, M3) thì bỏ ràng buộc "đúng 1 game" ở service, không đổi schema.

## Kiểm chứng

- Integration test `apps/api/test/campaigns.e2e.test.ts`: tạo → sửa nháp → publish (version bất biến) → sửa nháp không ảnh hưởng bản đã publish; 400, 401, cross-tenant 403/404; vai trò `redeemer` chỉ đổi được quà.
- E2E `builder-lab.spec.ts` chạy với API thật thay backend giả.

## Lịch sử

- 26/10/2026: Proposed.
- 26/10/2026: Accepted (founder chọn phương án A).
