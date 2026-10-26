# 06 — Mô hình dữ liệu (PostgreSQL + Drizzle)

Cập nhật: 24/10/2026 · v2.1: bỏ bảng live (xem [ADR-011](./adr/011-remove-live-engine.md))

---

> Bổ sung từ nghiên cứu builder: các bảng `skins`, `participation_codes`, `channels`, `redeem_points`, `prize_moments`, `org_templates`, `logic_webhooks` được liệt kê ở [12-builder-spec §15](./12-builder-spec.md#15-thay-đổi-dữ-liệu-so-với-06-data-modelmd).

> **v2.1: còn phải gỡ trong code** (chore `remove live engine`, [09](./09-roadmap-plan.md) story 1.0): bảng `live_rounds`, `round_scores`, `event_screens`; enum `round_status`, `event_mode` (chỉ còn campaign); cột `draw_spins.round_id`. Gỡ bằng **migration drop mới** (không sửa migration cũ). Lưu ý: hiện `prizes`, `draw_spins`, `awards` đang nằm trong `packages/db/src/schema/live.ts`; phải **chuyển sang `prizes.ts`**, không xoá. Tài liệu dưới đây mô tả trạng thái đích.

## 1. Quy ước

- **ID:** UUIDv7, sinh ở app (`uuidv7()`), sắp theo thời gian nên thân thiện với index. ID công khai dạng ngắn (slug, mã) dùng cột riêng.
- **Multi-tenant:** mọi bảng nghiệp vụ có `organization_id` và index bắt đầu bằng cột này. Repository bắt buộc nhận `orgId`.
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
              ├─< subscription / event_pass / payment
              └─< event ─┬─< guest_list_entry
                         ├─< player ─┬─< consent
                         │           ├─< form_submission
                         │           └─< play ──o award
                         ├─< game ─┬─< game_version
                         │         └─< prize ─┬─< voucher_code
                         │                    └─< draw_spin ─< award   (bốc thăm cuối chương trình, M2)
                         └─< analytics_event (partitioned)
audit_log, webhook_endpoint, webhook_delivery, api_key
```

---

## 3. Drizzle schema (lõi)

> Bảng auth (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) được sinh bởi Better Auth CLI vào `packages/db/src/schema/auth.ts`. Phần dưới là bảng nghiệp vụ.

```ts
// packages/db/src/schema/_shared.ts
import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const id = () => uuid().primaryKey().$defaultFn(() => uuidv7());
export const orgId = () => uuid().notNull();          // FK tới organization.id (định nghĩa ở từng bảng)
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
export const prizeType     = pgEnum('prize_type', ['physical', 'voucher_code', 'digital', 'no_prize']);
export const awardStatus   = pgEnum('award_status', ['issued', 'notified', 'redeemed', 'void']);
export const playStatus    = pgEnum('play_status', ['started', 'completed', 'rejected', 'expired']);
export const dataEnv       = pgEnum('data_env', ['live', 'rehearsal']);   // 'live' = dữ liệu thật, không liên quan live engine
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
  timezone: text().notNull().default('Asia/Ho_Chi_Minh'),
  startsAt: timestamp({ withTimezone: true }),
  endsAt: timestamp({ withTimezone: true }),
  identity: identityMode().notNull().default('anonymous'),
  identityConfig: jsonb().$type<IdentityConfig>().notNull().default({}),  // rule lượt chơi, OTP, field
  registrationForm: jsonb().$type<FormDefinition>(),                      // field builder + consent text
  playerLimit: integer().notNull(),               // từ gói (Campaign Pass / subscription)
  customDomain: text(),
  isCritical: boolean().notNull().default(false), // bật freeze window và pre-scale
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
  templateKey: text().notNull(),                  // 'spin-wheel'
  templateVersion: text().notNull(),              // '1.0.0'
  name: text().notNull(),
  draftConfig: jsonb().notNull(),
  status: gameStatus().notNull().default('draft'),
  currentVersionId: uuid(),                       // → game_versions.id
  sortOrder: integer().notNull().default(0),
  opensAt: timestamp({ withTimezone: true }),
  closesAt: timestamp({ withTimezone: true }),
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
  config: jsonb().notNull(),                      // snapshot bất biến
  configHash: text().notNull(),
  publishedBy: uuid().notNull(),
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
  phoneE164Enc: text(),                           // mã hoá ứng dụng (AES-GCM, key theo org)
  phoneHash: text(),                              // HMAC để tra trùng / giới hạn lượt
  emailEnc: text(),
  emailHash: text(),
  zaloId: text(),
  deviceId: text(),                               // id ngẫu nhiên trong localStorage
  team: text(),
  checkedInAt: timestamp({ withTimezone: true }),
  flagged: boolean().notNull().default(false),
  ...timestamps,
}, (t) => [
  index().on(t.eventId, t.env),
  uniqueIndex().on(t.eventId, t.phoneHash),
  uniqueIndex().on(t.eventId, t.guestListEntryId),
]);

export const consents = pgTable('consents', {
  id: id(),
  organizationId: orgId(),
  playerId: uuid().notNull().references(() => players.id),
  purpose: text().notNull(),                      // 'participation' | 'marketing' | 'share_with_brand'
  granted: boolean().notNull(),
  textVersion: text().notNull(),                  // phiên bản nội dung consent hiển thị
  textHash: text().notNull(),
  ip: text(), userAgent: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  withdrawnAt: timestamp({ withTimezone: true }),
}, (t) => [index().on(t.playerId)]);

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
export const prizes = pgTable('prizes', {
  id: id(),
  organizationId: orgId(),
  eventId: uuid().notNull(),
  gameId: uuid().references(() => games.id),      // null = dùng chung cho bốc thăm cuối chương trình toàn event
  name: text().notNull(),
  type: prizeType().notNull(),
  imageAssetId: uuid(),
  quantity: integer().notNull(),
  issued: integer().notNull().default(0),
  remaining: integer().notNull(),                 // CHECK (remaining >= 0)
  weight: integer().notNull().default(1),
  rules: jsonb().$type<PrizeRules>().notNull().default({}), // pacing, giới hạn/người, ngưỡng điểm
  valueVnd: bigint({ mode: 'number' }),           // phục vụ báo cáo/biên bản khuyến mại
  sortOrder: integer().notNull().default(0),
  ...timestamps,
}, (t) => [index().on(t.eventId, t.gameId), check('remaining_non_negative', sql`${t.remaining} >= 0`)]);

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
  gameVersionId: uuid().notNull(),
  playerId: uuid().notNull().references(() => players.id),
  env: dataEnv().notNull().default('live'),
  status: playStatus().notNull().default('started'),
  startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp({ withTimezone: true }),
  score: integer(),
  telemetry: jsonb(),                             // tóm tắt input cho anti-cheat
  rejectReason: text(),
}, (t) => [index().on(t.gameId, t.playerId, t.startedAt), index().on(t.eventId, t.startedAt)]);

export const awards = pgTable('awards', {
  id: id(),
  organizationId: orgId(),
  eventId: uuid().notNull(),
  prizeId: uuid().notNull().references(() => prizes.id),
  playerId: uuid().notNull().references(() => players.id),
  playId: uuid().references(() => plays.id),          // instant/skill
  drawSpinId: uuid(),                                 // bốc thăm cuối chương trình
  voucherCodeId: uuid(),
  redeemCode: text().notNull(),                       // mã ngắn để đổi quà (QR)
  status: awardStatus().notNull().default('issued'),
  rngProof: jsonb(),                                  // { seedCommit, method, poolHash, spinNo, index }
  redeemedAt: timestamp({ withTimezone: true }),
  redeemedBy: uuid(),
  voidReason: text(),
  ...timestamps,
}, (t) => [
  uniqueIndex().on(t.playId),                         // 1 play → tối đa 1 award
  uniqueIndex().on(t.eventId, t.redeemCode),
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
  spinNo: integer().notNull(),                    // tăng đơn điệu theo event, kể cả lần void
  poolSize: integer().notNull(),
  poolHash: text().notNull(),                     // hash của pool đã chốt
  seedCommit: text().notNull(),                   // sha256(serverSeed ‖ poolHash ‖ spinNo), công bố trước khi quay
  serverSeedEnc: text().notNull(),                // công bố sau khi kết thúc chương trình
  winners: jsonb().$type<string[]>().notNull().default([]), // playerIds, ghi lúc reveal
  operatorId: uuid().notNull(),
  voided: boolean().notNull().default(false),
  voidReason: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex().on(t.eventId, t.spinNo), index().on(t.organizationId, t.eventId)]);
```

```ts
// packages/db/src/schema/billing.ts (rút gọn)
export const subscriptions = pgTable('subscriptions', {
  id: id(), organizationId: orgId(),
  plan: text().notNull(),                         // 'pro' | 'agency' | 'enterprise'
  status: text().notNull(),                       // 'active' | 'past_due' | 'canceled'
  periodStart: timestamp({ withTimezone: true }).notNull(),
  periodEnd: timestamp({ withTimezone: true }).notNull(),
  limits: jsonb().$type<PlanLimits>().notNull(),
  ...timestamps,
});

export const eventPasses = pgTable('event_passes', {
  id: id(), organizationId: orgId(),
  eventId: uuid(),                                // gán khi dùng
  tier: text().notNull(),                         // 'S' | 'M' | 'L' (Campaign Pass)
  playerLimit: integer().notNull(),
  validDays: integer().notNull(),
  paymentId: uuid(),
  activatedAt: timestamp({ withTimezone: true }),
  ...timestamps,
});

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
  organizationId: uuid(),
  actorType: text().notNull(),                    // 'user' | 'system' | 'admin' | 'api_key'
  actorId: text(),
  action: text().notNull(),                       // 'prize.update', 'draw.spin', 'export.players', 'admin.impersonate'
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
| Đếm lượt chơi của player hôm nay | `plays(game_id, player_id, started_at)` |
| Chọn voucher chưa cấp | `voucher_codes(prize_id, award_id)` + `FOR UPDATE SKIP LOCKED` |
| Ứng viên bốc thăm cuối chương trình | `players(event_id, env)` + `plays(event_id, started_at)` theo bộ lọc pool |
| Dashboard theo thời gian | `analytics_hourly(event_id, hour)` |

---

## 6. Migration và seed

- `packages/db/drizzle.config.ts` dùng `casing: 'snake_case'`, schema là `./src/schema/*`, migrations ở `./migrations`.
- Quy trình: sửa schema → `bun run db:generate` → review SQL trong PR → `bun run db:migrate` (CI chạy trên staging, sau đó production trước khi deploy app).
- Migration phải **backward compatible** với bản app đang chạy (expand → migrate data → contract), vì không có downtime trong mùa sự kiện.
- `bun run db:seed` tạo org demo, 1 campaign với 4 minigame M1, guest list 500 người giả và giải mẫu.
