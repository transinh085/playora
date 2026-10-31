# Mô hình dữ liệu (PostgreSQL + Drizzle)

Cập nhật: 31/10/2026 · Owner: Tech Lead (founder) · Liên quan: [architecture.md](./architecture.md), [ADR-003](../adr/003-drizzle-postgres.md), [ADR-012 §5](../adr/012-campaign-architecture.md), [ADR-015](../adr/015-campaign-persistence.md), [product/specs/builder.md](../product/specs/builder.md)

Nguồn chân lý là code ở `packages/db/src/schema/*` và migration đã commit ở `packages/db/drizzle/`. Tài liệu này mô tả **mô hình hiện tại và mô hình đích**; bảng/cột chưa có trong code được đánh dấu "(đích)" ở bảng dưới.

| Nhóm | Đã có trong schema (31/10/2026) | (đích) |
|---|---|---|
| Auth (Better Auth) | `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation` | |
| Tổ chức, thương hiệu | `clients`, `brand_kits`, `assets` | |
| Chương trình | `events` (+ `paused`, `schedule`, `participation`, `anti_fraud`), `games` (+ `skin_key`, `hot_config`), `game_versions` | |
| Người chơi | `guest_list_entries`, `players` (+ `session_ver`), `consents` | `form_submissions` |
| Giải & lượt chơi | `prizes`, `draw_spins`, `awards`, `plays`, `play_counters` | `voucher_codes` (M2), `prize_counters` (BLD-25) |
| Vận hành & gói | `audit_logs`, `org_subscriptions`, `billing_invoices` (BIL-01/02, migration `0006_little_sabra`) | `counter_devices` (ORG-10, [ADR-017](../adr/017-counter-device-pairing.md) Proposed); `awards.redeemed_by_device_id`, `awards.store_label` (PRZ-17); `payments` (PayOS, BIL-03 M2), `analytics_events`, webhook, api key |
| Builder mở rộng | | `skins`, `participation_codes`, `channels`, `redeem_points`, `prize_moments`, `org_templates`, `logic_webhooks` (xem [product/specs/builder.md](../product/specs/builder.md)) |

Campaign lưu trên `events` + `games` + `game_versions` + `prizes` theo [ADR-015](../adr/015-campaign-persistence.md): luật và màn nằm trong `games.draft_config` (nháp) → `game_versions.config` (bất biến khi phát hành).

## 1. Quy ước

- **ID:** UUIDv7, sinh ở app (`uuidv7()`), sắp theo thời gian nên thân thiện với index. ID công khai dạng ngắn (slug, mã) dùng cột riêng.
- **Multi-tenant:** mọi bảng nghiệp vụ có `organization_id` (kiểu `text`, FK tới `organization.id` vì Better Auth dùng text id) và index bắt đầu bằng cột này. Repository bắt buộc nhận `organizationId` đầu tiên.
- **Thời gian:** `timestamptz`; mọi bảng có `created_at`, bảng sửa được có thêm `updated_at`.
- **Xoá:** soft delete (`deleted_at`) cho event, game, asset. PII bị xoá cứng hoặc ẩn danh theo retention.
- **JSONB** cho cấu hình template (đã validate bằng zod trước khi ghi), không dùng cho dữ liệu cần query nhiều.
- **Tiền:** `bigint` đơn vị VND (không dùng float).
- **Tên bảng/cột:** `snake_case`; trong TS là `camelCase` (Drizzle `casing: 'snake_case'`).

---

## 2. Sơ đồ quan hệ (rút gọn)

```
organization ─┬─< member >── user                      (Better Auth)
              ├─< client
              ├─< brand_kit
              ├─< asset
              ├── org_subscription (0..1) ─ billing_invoice*
              └─< event ─┬─< guest_list_entry
                         ├─< player ─┬─< consent
                         │           ├─< form_submission
                         │           └─< play ──o award
                         ├─< game ─┬─< game_version
                         │         └─< prize ─┬─< voucher_code
                         │                    └─< draw_spin ─< award   (bốc thăm cuối chương trình)
                         └─< analytics_event (partitioned)
audit_log, webhook_endpoint, webhook_delivery, api_key
```

---

## 3. Drizzle schema (lõi)

> Bảng auth (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) được sinh bởi Better Auth CLI vào `packages/db/src/schema/auth.ts`. Phần dưới là bảng nghiệp vụ.

```ts
// packages/db/src/schema/_shared.ts
import { text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { organization } from './auth';

export const id = () => uuid().primaryKey().$defaultFn(() => uuidv7());
/** Better Auth dùng text id, nên khoá tenant là text. */
export const orgId = () => text().notNull().references(() => organization.id, { onDelete: 'cascade' });
export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
};
```

```ts
// packages/db/src/schema/enums.ts
import { pgEnum } from 'drizzle-orm/pg-core';

export const eventStatus   = pgEnum('event_status', ['draft', 'scheduled', 'live', 'ended', 'archived']);
export const identityMode  = pgEnum('identity_mode', ['anonymous', 'guest_list', 'form_only', 'phone_otp', 'email_otp', 'zalo']);
export const gameStatus    = pgEnum('game_status', ['draft', 'published', 'disabled']);
export const prizeType     = pgEnum('prize_type', ['physical', 'voucher_code', 'e_gift', 'digital', 'points', 'consolation', 'no_prize']);
export const awardStatus   = pgEnum('award_status', ['issued', 'notified', 'redeemed', 'void']);
export const playOutcome   = pgEnum('play_outcome', ['win', 'lose', 'closed']);   // no_turns không ghi dòng
export const dataEnv       = pgEnum('data_env', ['live', 'rehearsal']);   // 'live' = dữ liệu thật, 'rehearsal' = chạy thử
export const assetKind     = pgEnum('asset_kind', ['image', 'audio', 'video']);
export const assetStatus   = pgEnum('asset_status', ['pending', 'ready', 'failed']);
```

```ts
// packages/db/src/schema/events.ts
import { pgTable, text, jsonb, timestamp, integer, uuid, index, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { id, orgId, timestamps } from './_shared';
import { eventStatus, identityMode, gameStatus } from './enums';
import { organization } from './auth';

export const clients = pgTable('clients', {
  id: id(),
  organizationId: orgId().references(() => organization.id),
  name: text().notNull(),
  logoAssetId: uuid(),
  ...timestamps,
}, (t) => [index().on(t.organizationId)]);

export const brandKits = pgTable('brand_kits', {
  id: id(),
  organizationId: orgId().references(() => organization.id),
  clientId: uuid().references(() => clients.id),
  name: text().notNull(),
  tokens: jsonb().$type<BrandTokens>().notNull(), // colors, fonts, radius, logo/background/sound asset ids
  ...timestamps,
}, (t) => [index().on(t.organizationId, t.clientId)]);

export const events = pgTable('events', {
  id: id(),
  organizationId: orgId().references(() => organization.id),
  clientId: uuid().references(() => clients.id),
  brandKitId: uuid().references(() => brandKits.id),
  slug: text().notNull(),                         // play.playora.vn/{slug}
  name: text().notNull(),
  status: eventStatus().notNull().default('draft'),
  paused: boolean().notNull().default(false),     // tạm dừng chương trình
  timezone: text().notNull().default('Asia/Ho_Chi_Minh'),
  startsAt: timestamp({ withTimezone: true }),
  endsAt: timestamp({ withTimezone: true }),
  schedule: jsonb().notNull().default({}),        // giờ mở cửa, ngày mở trong tuần
  participation: jsonb().notNull().default({}),   // lượt/ngày, requireRedeemBeforeReplay
  antiFraud: jsonb().notNull().default({}),       // { level: 'low' | 'standard' }
  identity: identityMode().notNull().default('anonymous'),
  identityConfig: jsonb().$type<IdentityConfig>().notNull().default({}),  // rule lượt chơi, OTP, field
  registrationForm: jsonb().$type<FormDefinition>(),                      // field builder + consent text
  playerLimit: integer().notNull().default(100),  // di sản; join coi là giới hạn mềm
  customDomain: text(),                           // (đích, ORG-05 M4)
  isCritical: boolean().notNull().default(false), // bật freeze window và pre-scale (hiện đặt bằng SQL)
  deletedAt: timestamp({ withTimezone: true }),
  ...timestamps,
}, (t) => [
  uniqueIndex().on(t.slug),
  index().on(t.organizationId, t.status),
  index().on(t.startsAt),
]);

export const games = pgTable('games', {
  id: id(),
  organizationId: orgId(),
  eventId: uuid().notNull().references(() => events.id),
  templateKey: text().notNull(),                  // 'spin-wheel' | 'scratch-card' | 'gift-box'
  templateVersion: text().notNull(),              // '1.0.0'
  skinKey: text(),                                // 'tet' | 'everyday' | 'grand-opening'
  name: text().notNull(),
  draftConfig: jsonb().notNull(),
  hotConfig: jsonb().notNull().default({}),
  status: gameStatus().notNull().default('draft'),
  currentVersionId: uuid(),                       // → game_versions.id
  sortOrder: integer().notNull().default(0),
  deletedAt: timestamp({ withTimezone: true }),
  ...timestamps,
}, (t) => [index().on(t.organizationId, t.eventId)]);

export const gameVersions = pgTable('game_versions', {
  id: id(),
  organizationId: orgId(),
  gameId: uuid().notNull().references(() => games.id),
  version: integer().notNull(),
  templateKey: text().notNull(),
  templateVersion: text().notNull(),
  skinKey: text(),
  config: jsonb().notNull(),                      // snapshot bất biến
  configHash: text().notNull(),
  publishedBy: text().notNull().references(() => user.id),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex().on(t.gameId, t.version)]);
```

```ts
// packages/db/src/schema/players.ts
export const guestListEntries = pgTable('guest_list_entries', {
  id: id(),
  organizationId: orgId(),
  eventId: uuid().notNull().references(() => events.id),
  externalCode: text().notNull(),                 // mã NV / mã vé
  displayName: text().notNull(),
  attributes: jsonb().$type<Record<string, string>>().notNull().default({}), // phòng ban, bàn…
  ...timestamps,
}, (t) => [uniqueIndex().on(t.eventId, t.externalCode)]);

export const players = pgTable('players', {
  id: id(),
  organizationId: orgId(),
  eventId: uuid().notNull().references(() => events.id),
  env: dataEnv().notNull().default('live'),
  guestListEntryId: uuid().references(() => guestListEntries.id),
  displayName: text(),
  phoneEnc: text(),                               // AES-256-GCM `<keyId>:<iv>:<ct>:<tag>` của SĐT dạng 84… (security.md §3)
  phoneHash: text(),                              // HMAC-SHA256 của SĐT dạng 84…: tra trùng / giới hạn lượt
  formData: jsonb().notNull().default({}),        // câu trả lời form KHÔNG nhạy cảm — SĐT không bao giờ nằm ở đây
  emailEnc: text(),                               // (đích)
  emailHash: text(),                              // (đích)
  zaloId: text(),                                 // (đích, M3)
  deviceId: text(),                               // id ngẫu nhiên trong localStorage
  sessionVer: integer().notNull().default(0),     // tăng để thu hồi token phiên
  team: text(),
  checkedInAt: timestamp({ withTimezone: true }),
  flagged: boolean().notNull().default(false),
  ...timestamps,
}, (t) => [
  index().on(t.eventId, t.env),
  uniqueIndex().on(t.eventId, t.env, t.phoneHash),   // một SĐT = một người chơi mỗi chương trình
  uniqueIndex().on(t.eventId, t.env, t.deviceId).where(sql`device_id is not null`), // một thiết bị = một người chơi
  uniqueIndex().on(t.eventId, t.env, t.guestListEntryId),
]);

export const consents = pgTable('consents', {
  id: id(),
  organizationId: orgId(),
  playerId: uuid().notNull().references(() => players.id),
  purpose: text().notNull(),                      // 'participation' | 'marketing' ('share_with_brand': đích, sau Gate M3)
  granted: boolean().notNull(),
  textVersion: text().notNull(),                  // phiên bản nội dung consent hiển thị
  textHash: text().notNull(),
  ip: text(), userAgent: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  withdrawnAt: timestamp({ withTimezone: true }),
}, (t) => [index().on(t.playerId)]);

// (đích)
export const formSubmissions = pgTable('form_submissions', {
  id: id(),
  organizationId: orgId(),
  eventId: uuid().notNull(),
  playerId: uuid().notNull().references(() => players.id),
  dataEnc: text().notNull(),                      // JSON đã mã hoá
  source: jsonb().$type<{ qr?: string; utm?: Record<string, string> }>(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [index().on(t.eventId, t.createdAt)]);
```

```ts
// packages/db/src/schema/prizes.ts  (các file dưới đây lược bớt dòng import)
// M1 chỉ dùng type 'physical' (quà đổi tại quầy, PRD PRZ-01); các giá trị khác của enum là đích.
export const prizes = pgTable('prizes', {
  id: id(),
  organizationId: orgId(),
  eventId: uuid().notNull(),
  gameId: uuid().references(() => games.id),      // null = dùng chung cho bốc thăm cuối chương trình toàn event
  key: text(),                                    // khoá giải trong Campaign draft/version
  name: text().notNull(),
  type: prizeType().notNull().default('physical'),
  imageUrl: text(),
  imageAssetId: uuid(),
  quantity: integer().notNull(),
  issued: integer().notNull().default(0),
  remaining: integer().notNull(),                 // CHECK (remaining >= 0)
  valueVnd: bigint({ mode: 'number' }),           // giá vốn, phục vụ ngân sách và báo cáo kết quả
  sortOrder: integer().notNull().default(0),
  ...timestamps,
}, (t) => [index().on(t.eventId, t.gameId), check('remaining_non_negative', sql`${t.remaining} >= 0`)]);

// (đích, M2)
export const voucherCodes = pgTable('voucher_codes', {
  id: id(),
  organizationId: orgId(),
  prizeId: uuid().notNull().references(() => prizes.id),
  codeEnc: text().notNull(),
  codeHash: text().notNull(),
  awardId: uuid(),                                // null = chưa cấp
  ...timestamps,
}, (t) => [uniqueIndex().on(t.prizeId, t.codeHash), index().on(t.prizeId, t.awardId)]);

export const plays = pgTable('plays', {
  id: id(),
  organizationId: orgId(),
  eventId: uuid().notNull(),
  gameId: uuid().notNull(),
  gameVersionId: uuid(),                          // null khi chơi thử (rehearsal)
  playerId: uuid().notNull().references(() => players.id),
  env: dataEnv().notNull().default('live'),
  requestId: text().notNull(),                    // idempotent theo người chơi
  channelKey: text(),                             // ?ch=qr-ban, fanpage, zalo-oa…
  outcome: playOutcome().notNull(),
  reason: text(),
  prizeId: uuid().references(() => prizes.id),
  rngProof: jsonb(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex().on(t.playerId, t.requestId),
  index().on(t.eventId, t.env, t.createdAt),
]);

export const playCounters = pgTable('play_counters', {
  organizationId: orgId(),
  playerId: uuid().notNull().references(() => players.id),
  gameId: uuid().notNull().references(() => games.id),
  day: text().notNull(),                          // 'YYYY-MM-DD' theo timezone chương trình
  n: integer().notNull().default(0),
}, (t) => [primaryKey({ columns: [t.playerId, t.gameId, t.day] })]);

export const awards = pgTable('awards', {
  id: id(),
  organizationId: orgId(),
  eventId: uuid().notNull(),
  prizeId: uuid().notNull().references(() => prizes.id),
  playerId: uuid().notNull().references(() => players.id),
  env: dataEnv().notNull().default('live'),
  playId: uuid().references(() => plays.id),          // instant/skill
  drawSpinId: uuid(),                                 // bốc thăm cuối chương trình
  redeemCode: text().notNull(),                       // 6 ký tự, bảng 32 ký tự không có 0/O/1/I
  status: awardStatus().notNull().default('issued'),
  expiresAt: timestamp({ withTimezone: true }),       // ngày kết thúc + 7 ngày (VOUCHER_GRACE_MS)
  redeemedAt: timestamp({ withTimezone: true }),
  redeemedBy: text().references(() => user.id),
  // (đích ORG-10 / PRZ-17): redeemedByDeviceId uuid → counter_devices.id, storeLabel text
  voidReason: text(),
  ...timestamps,
}, (t) => [
  uniqueIndex().on(t.playId),                         // 1 play → tối đa 1 award
  uniqueIndex().on(t.organizationId, t.redeemCode),
  index().on(t.eventId, t.prizeId),
  index().on(t.playerId),
]);
```

```ts
// packages/db/src/schema/prizes.ts (tiếp) — bốc thăm cuối chương trình (PRZ-02, M2)
// Pool được chốt (snapshot, sắp theo player_id) trước khi commit; mỗi lần quay là một dòng.
export const drawSpins = pgTable('draw_spins', {
  id: id(),
  organizationId: orgId(),
  eventId: uuid().notNull(),
  prizeId: uuid().notNull().references(() => prizes.id),
  env: dataEnv().notNull().default('live'),
  spinNo: integer().notNull(),                    // tăng đơn điệu theo (event, env), kể cả lần void
  poolSize: integer().notNull(),
  poolHash: text().notNull(),                     // hash của pool đã chốt
  seedCommit: text().notNull(),                   // sha256(serverSeed ‖ poolHash ‖ spinNo), công bố trước khi quay
  serverSeedEnc: text().notNull(),                // công bố sau khi kết thúc chương trình
  winners: jsonb().$type<string[]>().notNull().default([]), // playerIds, ghi lúc reveal
  operatorId: text().notNull().references(() => user.id),
  voided: boolean().notNull().default(false),
  voidReason: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex().on(t.eventId, t.env, t.spinNo), index().on(t.organizationId, t.eventId)]);
```

```ts
// packages/db/src/schema/billing.ts (đã có, M1: kích hoạt gói và hoá đơn thủ công, BIL-01/02).
// Hạn mức KHÔNG lưu ở DB: nằm trong @playora/core/billing (PLANS), đổi giá = deploy.
export const billingPlan = pgEnum('billing_plan', ['free', 'shop', 'chain']);   // Free / Quán / Chuỗi
export const subscriptionStatus = pgEnum('subscription_status', ['active', 'expired']);

export const orgSubscriptions = pgTable('org_subscriptions', {
  organizationId: orgId().primaryKey(),           // tối đa một dòng mỗi tổ chức; không có dòng = Free
  plan: billingPlan().notNull().default('free'),
  status: subscriptionStatus().notNull().default('active'),
  currentPeriodEnd: timestamp({ withTimezone: true }), // null = không hạn; đã qua → Free
  note: text(),
  updatedBy: text().references(() => user.id, { onDelete: 'set null' }),
  ...timestamps,
});

export const billingInvoices = pgTable('billing_invoices', {   // ghi tay, chỉ thêm
  id: id(), organizationId: orgId(),
  plan: billingPlan().notNull(),
  amountVnd: integer().notNull(),
  periodStart: timestamp({ withTimezone: true }).notNull(),
  periodEnd: timestamp({ withTimezone: true }).notNull(),
  paidAt: timestamp({ withTimezone: true }).notNull(),
  reference: text(),                              // mã chuyển khoản, số biên nhận
  createdBy: text().references(() => user.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [index().on(t.organizationId, t.paidAt)]);
```

Usage không lưu riêng: số chương trình chạy đếm từ `events` + `games` (đã phát hành, không tạm dừng, `ends_at` > now), lượt đổi quà tháng đếm `awards` live, không void, `redeemed_at` trong tháng dương lịch `Asia/Ho_Chi_Minh` (index `awards(organization_id, redeem_code)` lọc theo tổ chức; thêm `awards(organization_id, redeemed_at)` khi bảng lớn). Theo [D-23](../product/decisions.md) (chưa làm): trần cứng tính ở lúc phát giải = số mã live còn hiệu lực (`issued`, chưa hết hạn, không void) + lượt đã đổi trong tháng; cần index `awards(organization_id, status, expires_at)`.

```ts
// (đích, M2 PayOS — BIL-03; các bảng subscriptions / event_passes của mô hình giá Campaign Pass cũ đã bỏ)
export const payments = pgTable('payments', {
  id: id(), organizationId: orgId(),
  provider: text().notNull(),                     // 'payos' | 'bank_transfer' | 'stripe'
  providerRef: text(),
  amountVnd: bigint({ mode: 'number' }).notNull(),
  status: text().notNull(),                       // 'pending' | 'paid' | 'failed' | 'refunded'
  payload: jsonb(),
  ...timestamps,
}, (t) => [uniqueIndex().on(t.provider, t.providerRef)]);
```

```ts
// packages/db/src/schema/audit.ts
export const auditLogs = pgTable('audit_logs', {
  id: id(),
  organizationId: text(),
  actorType: text().notNull(),                    // 'user' | 'system' | 'admin' | 'api_key'
  actorId: text(),
  action: text().notNull(),                       // đã ghi: campaign.publish|pause|resume|end|delete, voucher.reopen, billing.subscription.set, billing.invoice.record, brand_kit.delete, asset.delete (+ event/game/guests.* của module cũ). Đích: voucher.redeem, voucher.lookup_phone (PRZ-15), prize.stock_adjust, export.*, admin.impersonate
  targetType: text(), targetId: text(),
  diff: jsonb(),
  ip: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [index().on(t.organizationId, t.createdAt)]);
```

---

## 4. Analytics events (partitioned)

Drizzle chưa khai báo được partition. Tạo bảng bằng **custom migration SQL** (`drizzle-kit generate --custom`):

```sql
CREATE TABLE analytics_events (
  id           uuid        NOT NULL,
  organization_id uuid     NOT NULL,
  event_id     uuid        NOT NULL,
  game_id      uuid,
  player_id    uuid,
  name         text        NOT NULL,      -- 'page_view','join','play_start','play_end','award','redeem','share'
  props        jsonb       NOT NULL DEFAULT '{}',
  occurred_at  timestamptz NOT NULL,
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);
-- worker tạo partition theo tháng trước 7 ngày; rollup sang analytics_hourly
```

Ghi theo batch: API đẩy vào Redis stream `analytics`, worker gom 500 dòng hoặc 2 s rồi `INSERT` một lần. Khi vượt khoảng 50 triệu dòng/tháng thì chuyển sang ClickHouse.

---

## 5. Index và hiệu năng

| Truy vấn nóng | Index |
|---|---|
| Player join theo slug | `events(slug)` unique |
| Lượt đã dùng hôm nay của người chơi | `play_counters` PK `(player_id, game_id, day)` |
| Chọn voucher chưa cấp (M2) | `voucher_codes(prize_id, award_id)` + `FOR UPDATE SKIP LOCKED` |
| Ứng viên bốc thăm cuối chương trình | `players(event_id, env)` + `plays(event_id, env, created_at)` theo bộ lọc pool |
| Dashboard theo thời gian | `analytics_hourly(event_id, hour)` |

---

## 6. Migration và seed

- `packages/db/drizzle.config.ts` dùng `casing: 'snake_case'`, schema là `./src/schema/*`, migration SQL sinh vào `packages/db/drizzle/` (không sửa tay).
- Quy trình: sửa schema → `bun run db:generate` → review SQL trong PR → `bun run db:migrate` (CI chạy trên staging, sau đó production trước khi deploy app).
- Migration phải **backward compatible** với bản app đang chạy (expand → migrate data → contract), vì không được dừng khi có chương trình đang chạy.
- Nhiều nhánh cùng thêm migration thì phải đánh số lại nhánh merge sau (AGENTS.md).
- `bun run db:seed` tạo org demo, sự kiện `demo-yep` (danh tính `guest_list`) và 500 khách mời giả. Seed sẽ được làm lại khi có API Campaign thật.
