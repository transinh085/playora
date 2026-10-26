# Plan tái cấu trúc kiến trúc (backend + frontend, chuyển sang antd) — 24/10/2026

Trạng thái: **Đã thực hiện** (các commit `refactor …` 24–25/10/2026; xem `git log --grep refactor`) · Nền: `main@e9a8106` (đã gỡ live engine, SDK v2) · Điều phối: Opus (review + merge + e2e) · Worker: Antigravity (agy) qua Orca

Mục tiêu: đưa code về đúng kiến trúc v2 ([ADR-012](../adr/012-campaign-architecture.md)) và **thay shadcn/ui bằng Ant Design ở mọi bề mặt** trước Đợt 4 (API lượt chơi, UI giải, flow Play). Ngoài việc đổi thư viện UI, mỗi task giữ **nguyên hành vi** trừ chỗ ghi rõ. Không thêm migration (migration thuộc story "nền dữ liệu campaign").

---

## 0. Quyết định UI (user, 24/10/2026) → ghi thành ADR-013 trong task D0

| Chủ đề | Quyết định |
|---|---|
| Thư viện | **Ant Design v6** (React 19 native) cho **Studio, Play, web**. Thay shadcn/ui + Radix |
| Form | **antd `Form`** (`Form.Item`, `Form.List`), validate bằng zod của contract qua adapter `@playora/ui/form` (§2.4). Bỏ react-hook-form + `@hookform/resolvers` |
| Styling | **Tailwind v4 giữ cho layout/spacing** (flex, grid, gap, padding, responsive). Màu, radius, font, kích thước component lấy từ **theme token antd**. Không hard-code màu |
| Theme | Một nguồn token: primitive hiện có (`violet`, `ink`, `spotlight`…) → `ThemeConfig` antd. Studio: `defaultAlgorithm`/`darkAlgorithm` theo next-themes. Play: `GameRoot` = `ConfigProvider` sinh theme từ **skin + brand kit** (giữ luật tương phản WCAG của `game-theme.ts`) và vẫn xuất biến `--game-*` cho phần template tự vẽ (SVG/canvas) |
| SSR | `@ant-design/nextjs-registry` (`AntdRegistry`) trong root layout của mỗi app Next |
| Tailwind × antd | `@layer theme, base, antd, components, utilities;` + `StyleProvider layer` để preflight Tailwind không đè style antd |
| Toast/confirm | `App.useApp()` (`message`, `notification`, `modal`) — không dùng static `message.*` (mất theme). Bỏ sonner |
| Icon | Giữ `lucide-react` (đã có; truyền qua prop `icon`). Không thêm `@ant-design/icons` trừ khi component antd bắt buộc |
| Bundle Play | Ngân sách cũ ≤ 200 KB (ADR-009) không còn giữ được nguyên. D0 đo baseline First Load JS của `play /[slug]`; ADR-013 đặt ngân sách mới; Play chỉ dùng component nhẹ (Button, Input, Form, Checkbox, Result, Modal…), **không** dùng `DatePicker`, `Table`, `ColorPicker` ở Play; bật `optimizePackageImports: ['antd']` |

Phiên bản: worker chạy `npm view antd version` / `npm view @ant-design/nextjs-registry version`, chọn bản stable **phát hành ≥ 2 tuần**, pin chính xác (`bunfig.toml` `exact = true`), ghi lý do thêm dependency trong PR.

---

## 1. Hiện trạng (rà soát)

### Backend (`apps/api`, packages)
| # | Vấn đề | Bằng chứng |
|---|---|---|
| B1 | Logic thuần nằm trong Nest service, module import chéo service của nhau | `public.service.ts` (438 dòng) tự validate form/consent; `public` import `normalizeRegistrationForm` từ `events.service`; `guests` import `Actor` từ `events.service`; `games.service.ts` (669 dòng) chứa `canonicalJson`, `getAtPath/setAtPath`, `extractHotConfig` |
| B2 | Kiểu transaction chép lại 6 lần | `Parameters<Parameters<Database['transaction']>[0]>[0]`; `public.repository.ts:13`, `guests.repository.ts:11` tự định nghĩa `Tx` |
| B3 | Luật phụ thuộc chỉ có trên giấy (`docs/10` §1) | `biome.json` không có `noRestrictedImports` |
| B4 | Health không phân biệt sống/sẵn sàng | `/v1/health` trả 200 cả khi `degraded`; worker health luôn `ok` |
| B5 | Secret mặc định lọt vào production | `S3_ACCESS_KEY/S3_SECRET_KEY` mặc định `playora`/`playora123` |
| B6 | Rác sau khi gỡ live / đổi kiến trúc | `ZodValidationPipe` không còn dùng; permission `live: ['operate']`; throttle dò `ctx.getHandler().name !== 'join'`; Turbo cache `test` của API dù phụ thuộc DB |
| B7 | Join tuần tự hoá theo event (`lockEvent` FOR UPDATE), thiếu unique `(event_id, device_id)` | **Ngoài plan** — story "nền dữ liệu campaign" |

### Studio (`apps/studio`, ~4.800 dòng)
| # | Vấn đề | Bằng chứng |
|---|---|---|
| S1 | Không có tầng feature; route import `_components` của route khác | `orgs/[orgId]/games/[gameId]/page.tsx` import `../../events/[eventId]/games/[gameId]/_components/game-editor` |
| S2 | Component "god" | `game-editor` 671, `guests-view` 534, `event-settings-form` 511, `brand-kits-manager` 459, `games-tab` 413 dòng |
| S3 | Không có `events/[eventId]/layout.tsx` | mỗi tab tự render `EventNav` |
| S4 | Route trùng/lỗi thời | `/orgs/[orgId]/games/[gameId]` (không còn link); `/orgs/[orgId]/members` re-export; `[eventId]/page.tsx` render Guests |
| S5 | IA lệch ADR-012 §6 | đích: Tổng quan · Trò chơi · Giải thưởng · Người chơi · (Kênh) · Cài đặt |
| S6 | Logic chép giữa client và server | `localizeText` ×2; `getByDotPath`/`hasNonHotEditableChanges` vs `getAtPath`/`extractHotConfig`; RBAC tự viết trong `lib/auth-client.ts` |
| S7 | Giao thức preview không có kiểu chung | `PreviewMessagePayload` ở `apps/play/src/app/preview/page.tsx`; `game-editor.tsx:223` tự dựng payload |
| S8 | UI: 21 file dùng 18 component shadcn; form dùng react-hook-form | `button` 18, `input`/`label`/`card` 11, `select` 8, `dialog` 5, `table` 3… |

### Play (`apps/play`, ~800 dòng)
| P1 | `fetch` tay, bỏ qua contracts/api-client | `[slug]/page.tsx:6`, `event-join-shell.tsx:80` |
|---|---|---|
| P2 | Text hard-code, không i18n (ADR-012 §6 yêu cầu next-intl) | `ERROR_MESSAGES` trùng `errors.*` của `packages/i18n` |
| P3 | Template surface import tĩnh | `packages/templates/src/surfaces.ts` |
| P4 | Validate form đăng ký chỉ ở server, client làm lại một phần | `event-join-shell.tsx` vs `public.service.ts` |

### `packages/ui`
| U1 | `auto-form` (717 dòng render + 355 dòng test) dựng trên shadcn, tự quản state, ôm cả widget mà v2.1 đã chuyển về nền tảng (`datetime-range` → lịch campaign, `prize-picker` → panel Giải thưởng) hoặc chưa template nào dùng (`richtext`) | `packages/ui/src/auto-form/auto-form.tsx`; `spin-wheel` gắn giải bằng ô text `prizeSlot` (`TODO(PRZ-01)`) |
|---|---|---|
| U2 | Component game của live/quiz còn sót | `game/answer-tile.tsx` (quiz), `game/stage.tsx` (LED) chỉ còn dùng ở design-system của web |

### Học từ `games-vt` (có chọn lọc)
- **Lấy:** logic thuần nhận `now`/`rng` làm tham số; luật ranh giới bằng lint; readiness kiểm migration journal; prod bắt buộc secret tường minh; frontend chia `features/<f>/{api,components,…}`.
- **Không lấy:** hexagonal ports/adapters toàn phần; API client viết tay; khoá global; session advisory lock.

---

## 2. Kiến trúc đích

### 2.1 Studio
```
apps/studio/src/
  app/                       # CHỈ routing: page/layout mỏng (≤ 30 dòng), metadata, đọc params
    layout.tsx               # AntdRegistry + Providers
    (app)/orgs/[orgId]/events/[eventId]/
      layout.tsx             # header event + EventNav, fetch event 1 lần
      page.tsx               # Tổng quan
      games/ prizes/ players/ settings/
  features/<feature>/        # events, guests, games (builder), brand-kits, assets, members, auth
    api.ts                   # hook dữ liệu: useEvent(), useUpdateEvent()… (TanStack Query qua api-client)
    components/              # UI antd của feature, mỗi file ≤ ~250 dòng
    lib/                     # helper thuần + *.test.ts
  components/                # shell dùng chung (app-shell, status badge)
  lib/                       # api client, env, permissions (can)
```
Luật: `app/**` chỉ import `features/**`, `components/**`, `lib/**`; `features/a` không import `features/b/components`; text qua next-intl.

### 2.2 Play
```
apps/play/src/
  app/layout.tsx (AntdRegistry)  app/[slug]/page.tsx  app/preview/page.tsx
  features/join/  features/preview/     # Đợt 4 sản phẩm thêm features/play, features/prizes
  lib/api.ts (createApiClient, không TanStack Query)  i18n/
```

### 2.3 Logic dùng chung (pure, có test)
| Ở đâu | Gì | Ai dùng |
|---|---|---|
| `@playora/core/registration` | `versionConsentItem` (server), `normalizeRegistrationForm`, `validateRegistration(form, input)` (browser-safe), `resolveDisplayName` | API `events`, `public`; Play join |
| `@playora/game-sdk` (`config-path`, `hot-edit`, `preview-protocol`) | `getAtPath/setAtPath`, `canonicalJson`, `extractHotConfig`, `hasNonHotEditableChanges`, zod schema message preview | API `games`; Studio builder; Play preview |
| `@playora/contracts` (`localize.ts`) | `localize(text, locale)` | Studio, Play, templates |
| `@playora/db` | `type Tx`, `type DbOrTx` | repository + `AuditService` |

### 2.4 `packages/ui` sau khi chuyển
```
packages/ui/src/
  theme/       tokens.ts (primitive), studio-theme.ts (ThemeConfig light/dark), game-theme.ts (skin + brand kit → ThemeConfig + --game-*)
  providers/   StudioProvider (ConfigProvider + App + StyleProvider layer), PlayProvider
  form/        useZodForm(schema) → { form, rules, parse }; zodRule(schema); applyApiError(form, error, messageFor)
  auto-form/   AutoForm trên antd Form, phạm vi gọn (A1, §2.5)
  game/        GameRoot (ConfigProvider theo skin), GameButton, JoinPanel, Countdown, Leaderboard… dựng trên antd
  lib/         cn (giữ cho className Tailwind), utils
  styles.css   @layer order + Tailwind layout + bridge vài class ngữ nghĩa → var(--ant-*)
```
Hợp đồng form (thay cho `zodResolver` + `applyApiError` của react-hook-form):
```tsx
const { form, rules, parse } = useZodForm(CreateEventBody);
<Form form={form} layout="vertical" onFinish={(v) => create.mutate({ params, body: parse(v) })}>
  <Form.Item name="slug" label={t('slug')} rules={rules}><Input /></Form.Item>
</Form>
// onError: if (!applyApiError(form, err, (c) => tErrors(c))) message.error(...)
```
- `rules` chạy `schema.safeParse(form.getFieldsValue(true))` và trả lỗi có `issue.path` trùng `name` của `Form.Item` (đúng cả field lồng và refine chéo field).
- `parse(values)` trả `z.output<schema>` để gửi API (giá trị trong antd là input).
- `applyApiError` đọc `details.field` (`'consents.x'` → `['consents','x']`) và `details.body.fieldErrors`, gọi `form.setFields`, trả `false` nếu không gắn được field nào.

### 2.5 Builder: panel nền tảng + auto-form gọn (user duyệt 24/10/2026)

Sau ADR-012, giải/kho/pacing, lịch/lượt chơi/chống gian lận và màn Cover/Form/Kết quả thuộc **nền tảng**; config riêng của template chỉ còn ~5–10 field (gameplay, giao diện, nội dung). Vì vậy:

```
Builder (features/games)
 ├─ Panel nền tảng — viết tay, UX riêng
 │    Skin & brand kit · Giải thưởng & gắn giải vào ô (thay ô text `prizeSlot`) · Nội dung chung
 ├─ Panel template — AutoForm render các group `gameplay` / `appearance` / `content` của configSchema
 └─ Lối thoát — template khai báo panel/widget riêng ở `surfaces.ts` (client) khi UX không hợp form tự sinh
```

- **Widget AutoForm hỗ trợ:** `text`, `number`, `slider`, `switch`, `segmented`, `select`, `color`, `asset` (cả `sound` = asset `accept: audio`), `list`, `localized`, `object`.
- **Không còn render trong AutoForm:** `richtext` (chưa template nào dùng), `datetime-range` (lịch là Cài đặt campaign), `prize-picker` (panel Giải thưởng). `field.richtext/prizePicker` trong game-sdk đánh dấu `@deprecated`; enum widget trong `packages/contracts/src/api/templates.ts` **giữ nguyên** (không đổi contract), AutoForm gặp widget không hỗ trợ và không có trong registry thì hiện `Alert` "widget chưa hỗ trợ" thay vì vỡ.
- **Lối thoát:** `TemplateSurfaces` thêm `editorWidgets?: Record<string, ComponentType<WidgetProps>>` (widget riêng theo tên) và `editorPanels?: Array<{ key, label, Component }>` (panel riêng). AutoForm nhận `widgets` để tra widget lạ.
- Tiêu chí `docs/12` §365 giữ nguyên: template mới chỉ khai báo `configSchema` + `assetSlots` là có form; panel riêng là tuỳ chọn.

---

## 3. Danh sách task

Model: **flash** = `gemini-3.8-flash` (cơ học, spec rõ) · **argon** = `gemini-4-argon-high` (cắt ngang package, logic đúng/sai, state phức tạp, nền móng).

Luật chung cho mọi worker:
- Nhánh riêng, Conventional Commits, `bun run ci` xanh trước khi báo xong (dán output cuối vào PR).
- **Không chạy `bun run e2e`** (dùng chung cổng 3000–4002). Task đổi UI phải giữ nguyên mọi `data-testid` và cập nhật spec e2e trong cột "Sở hữu" nếu selector đổi; điều phối viên chạy e2e tuần tự khi merge.
- Không đụng file ngoài cột "Sở hữu"; cần thì dừng và hỏi. Không sửa file generated, không `--no-verify`.
- Key i18n: chỉ thêm namespace được giao, vào **cả** `vi.json` và `en.json`.
- UI mới: component từ `antd`; theme/form/game helper từ `@playora/ui/*`; Tailwind chỉ cho layout; không hard-code màu; không `ConfigProvider` riêng ngoài provider chuẩn và `GameRoot`.

### Đợt 1 — song song (4 worker, không trùng file)

**R1 · `chore/api-tx-and-actor` · flash** — B2, một phần B1
- Sở hữu: `packages/db/src/client.ts`, `apps/api/src/modules/*/*.repository.ts`, `apps/api/src/common/audit/audit.service.ts`, `apps/api/src/common/actor.ts` (mới), chỗ import `Actor` trong service.
- Làm: export `Tx` và `DbOrTx = Database | Tx` từ `@playora/db`; thay mọi `Parameters<Parameters<…>>`, `Pick<Database,'…'>`, `Tx` cục bộ; chuyển `interface Actor` sang `common/actor.ts`.
- Xong khi: `git grep "Parameters<Parameters<Database"` rỗng; ci xanh.

**R3 · `chore/env-health-readiness` · flash** — B4, B5
- Sở hữu: `packages/env/src/index.ts` (+test mới), `apps/api/src/modules/health/*`, `packages/contracts/src/api/public.ts` (chỉ route health), `apps/api/test/health.e2e.test.ts` (mới), `apps/worker/src/main.ts`, `apps/worker/src/queues/workers.service.ts`, `.env.example`, `docs/10` §4.2 dòng Env.
- Làm:
  1. `NODE_ENV=production` thì `S3_ACCESS_KEY`/`S3_SECRET_KEY` không được bằng giá trị mặc định dev (`superRefine`, thông báo rõ); test dev + prod.
  2. `GET /v1/health` = liveness (luôn 200 `{status:'ok', uptimeSec}`); `GET /v1/health/ready` = readiness: DB, Redis, migration mới nhất trong `packages/db/drizzle/meta/_journal.json` đã có trong `drizzle.__drizzle_migrations`; thiếu → **503** + chi tiết. Contract cả hai, integration test 200 + shape.
  3. Worker health 503 khi không còn worker `running`.
- Báo lại (không sửa) chỗ nào trong `infra/` đang trỏ healthcheck.

**F0 · `refactor/studio-features-layout` · argon** — S1, S3, S4 (nền cho mọi task Studio)
- Sở hữu: `apps/studio/src/**`, `tooling/e2e/tests/*.spec.ts` (chỉ khi URL đổi), `docs/10` §3 bước 6 và **§6.4 mới "Cấu trúc thư mục frontend"**.
- Làm (**chỉ di chuyển/trích**, không đổi giao diện, chưa dùng antd):
  1. `src/features/{events,guests,games,brand-kits,assets,members,auth}/components/`, `git mv` file từ `_components`; `page.tsx` chỉ import `@/features/...`.
  2. Mỗi feature có `api.ts` gom `useRouteQuery/useRouteMutation` + `invalidateQueries` đang rải trong component (giữ nguyên query key). Ít nhất `events`, `games`, `guests`.
  3. `events/[eventId]/layout.tsx` render tiêu đề event + `EventNav` một lần.
  4. Xoá route `orgs/[orgId]/games/[gameId]`; `orgs/[orgId]/members` → `redirect` sang `settings/members`.
- Xong khi: không file nào trong `app/**` import `app/**` khác hay `_components`; `page.tsx` ≤ 30 dòng; ci xanh; PR ghi "mostly moves" + `git diff -M --stat`.

**D0 · `feat/ui-antd-foundation` · argon** — nền antd (§0, §2.4), **chưa** đổi app nào
- Sở hữu: `packages/ui/package.json`, `packages/ui/src/{theme,providers,form}/**` (mới), `packages/ui/src/styles.css` (chỉ thêm `@layer` order, chưa xoá token shadcn), `docs/adr/013-antd-ui.md` (mới), `docs/adr/README.md`, `docs/adr/009-frontend-stack.md` (ghi "Superseded một phần bởi ADR-013" ở dòng UI/Form/Toast), `docs/10` §6.1 (dòng UI/Form/Thông báo) + §6.3 (thay quy trình shadcn bằng "thêm component antd"), `docs/13-design-system.md` (mục token/component), `AGENTS.md` (bước 6 "How to add a feature" và hard rule UI).
- Làm:
  1. Thêm `antd`, `@ant-design/nextjs-registry` (pin bản ≥ 2 tuần, lý do trong PR). Kiểm tra `antd` dùng được với React 19.3 không cần patch.
  2. `theme/`: map primitive token hiện có → `ThemeConfig` (light/dark) cho Studio; `game-theme.ts` sinh `ThemeConfig` + biến `--game-*` từ skin + brand kit, **giữ** logic tương phản hiện có và test của nó.
  3. `providers/`: `StudioProvider` (ConfigProvider + `App` + `StyleProvider layer`, nhận `mode: 'light'|'dark'`), `PlayProvider` (nhận theme game).
  4. `form/`: `useZodForm`, `zodRule`, `applyApiError` đúng hợp đồng §2.4, **unit test** (field phẳng, lồng, refine chéo field, `details.field`, `fieldErrors`).
  5. `styles.css`: `@layer theme, base, antd, components, utilities;`.
  6. Đo và ghi vào ADR-013: First Load JS hiện tại của `play /[slug]` và trang Studio lớn nhất (`next build`), đề xuất ngân sách mới cho Play.
  7. ADR-013 + cập nhật docs/AGENTS như cột Sở hữu: quy tắc mới = component từ `antd`, form `Form` + `useZodForm(<contract schema>)` + `applyApiError`, toast qua `App.useApp()`, Tailwind chỉ layout, không hard-code màu.
- Không làm: sửa `apps/**`, xoá shadcn, đụng `auto-form`/`game/*`.

### Đợt 2 — sau khi Đợt 1 merge (6 worker)

**R2 · `refactor/core-registration` · argon** — B1, P4 (logic)
- Phụ thuộc: R1. Sở hữu: `packages/core/src/registration/**`, `packages/core/package.json` (export `./registration`), `apps/api/src/modules/public/public.service.ts`, `apps/api/src/modules/events/events.service.ts`.
- Làm: chuyển `versionConsentItem`, `normalizeRegistrationForm`, `validateFormAndConsents`, `resolveDisplayName*`, `normalizeConsentsInput` sang `core/registration` thành hàm thuần (không Nest, không throw HttpException; trả `{ field, code, message }`). Tách `validateRegistration` **browser-safe** (không `node:crypto`) khỏi `versionConsentItem`. Service map kết quả → `BadRequestException` như cũ (giữ `details.field` + message).
- Test: unit đủ nhánh (required, email, phone, select, checkbox, consent bắt buộc, cắt 500 ký tự, display name fallback). `player-join.e2e.test.ts` pass không sửa.
- Xong khi: `public.service.ts` < 250 dòng; không còn import `../events/events.service`.

**R5 · `chore/api-cleanup` · flash** — B6
- Phụ thuộc: R1. Sở hữu: `apps/api/src/common/http/zod-validation.pipe*.ts` (xoá), `docs/05` bảng stack, `docs/10` bảng gotcha, `docs/adr/005-zod-contracts.md` (thêm ghi chú cập nhật), `docs/adr/README.md` (dòng 005), `packages/auth/src/permissions.ts` (+test), `packages/contracts/src/api/route.ts` + `public.ts` (trường `rateLimit`), `apps/api/src/app.module.ts`, `apps/api/src/modules/public/public.controller.ts`, `turbo.json`.
- Làm: xoá `ZodValidationPipe`; bỏ `live: ['operate']`; thêm `rateLimit?: 'public' | 'publicJoinDevice'` vào `RouteDef`, throttler `skipIf` đọc contract thay vì so tên class/handler (giữ nguyên ngưỡng); `"@playora/api#test": { "cache": false }`.
- Đụng contract (`route.ts`): chỉ thêm trường optional; ghi rõ trong PR.

**A1 · `feat/ui-auto-form-antd` · argon** — U1, §2.5
- Phụ thuộc: D0. Sở hữu: `packages/ui/src/auto-form/**`, `packages/game-sdk/src/fields.ts` (chỉ JSDoc `@deprecated`), `packages/templates/src/surfaces.ts` (chỉ thêm type `editorWidgets`/`editorPanels` + test), `docs/12-builder-spec.md` §widget (dòng 124) + mô tả panel nền tảng/template/lối thoát.
- Làm: viết lại renderer trên antd `Form`, phạm vi gọn theo §2.5; **giữ nguyên** `FieldDescriptor`/`FormDescriptor` (game-sdk) và API công khai của `AutoForm` (prop nào cần đổi thì giữ adapter tương thích để `game-editor` hiện tại vẫn chạy cho tới F2a).
  - Map widget: `text`→`Input`, `number`→`InputNumber`, `slider`→`Slider`, `switch`→`Switch`, `segmented`→`Segmented`, `select`→`Select`, `color`→`ColorPicker`, `list`→`Form.List` (thêm/xoá/đổi thứ tự, tôn trọng `min`/`max`), `object`→`Form.Item` lồng theo `path`, nhóm theo `group` (`Collapse`), `localized`→ô vi/en trong `Space.Compact`, `asset`/`sound`→widget do host truyền vào (như hiện nay).
  - Widget không hỗ trợ (`richtext`, `datetime-range`, `prize-picker`, tên lạ): tra prop `widgets` trước; không có thì `Alert` "widget chưa hỗ trợ", không throw.
  - Field không `hotEditable` bị `disabled` khi game đã publish (giữ đúng prop hiện có).
  - Mỗi thay đổi gọi callback đổi giá trị như cũ (dựa trên `onValuesChange`) để preview cập nhật trực tiếp.
  - Validate bằng `configSchema` qua `zodRule` của D0.
- Test: viết lại test theo antd, phủ các case cũ **của widget còn hỗ trợ** + disabled hot-edit, `Form.List` min/max, widget lạ qua `widgets`, fallback `Alert`. Xoá test của widget đã bỏ và ghi rõ trong PR.
- Xong khi: renderer ≤ ~350 dòng (tách file theo widget nếu cần); `spin-wheel` hiện đủ form trong builder như trước; ci xanh.

**G1 · `feat/ui-game-antd` · argon** — U2, theme game
- Phụ thuộc: D0. Sở hữu: `packages/ui/src/game/**`, `packages/ui/src/lib/game-theme*` (nếu D0 chưa chuyển hết), `packages/templates/src/spin-wheel/**` (chỉ phần chrome: nút, kết quả), `apps/web/**`, `tooling/e2e/tests/player.smoke.spec.ts` (nếu cần).
- Làm: `GameRoot` = `PlayProvider` + theme từ skin/brand kit + biến `--game-*`; `GameButton`, `JoinPanel`, `Countdown`, `Leaderboard`, `TeamBar` dựng trên antd (giữ cảm giác "nút 3D" của docs/13 bằng token/`styles`, không hard-code màu); **xoá** `answer-tile` (quiz) và `stage` (LED); spin-wheel giữ phần SVG tự vẽ, đổi chrome sang antd; `apps/web` (layout + trang design-system) chuyển sang antd + `AntdRegistry`.
- Xong khi: `git grep "answer-tile\|game/stage"` rỗng; trang `/design-system` của web hiển thị các component game theo 2+ skin; ci xanh.

**F4a · `feat/studio-antd-shell` · flash** — S8 (shell)
- Phụ thuộc: F0, D0. Sở hữu: `apps/studio/src/app/layout.tsx`, `apps/studio/src/app/providers.tsx`, `apps/studio/src/components/**`, `apps/studio/src/features/auth/**`, `apps/studio/src/app/(auth)/**`, `apps/studio/src/app/(app)/onboarding/**`, `apps/studio/package.json`, `apps/studio/next.config.ts`, `tooling/e2e/tests/studio.spec.ts`.
- Làm: `AntdRegistry` + `StudioProvider` (dark mode theo next-themes), bỏ `Toaster` sonner → `App`; `app-shell` → antd `Layout`/`Menu`/`Dropdown`/`Avatar`; login, invite, onboarding → antd `Form` + `useZodForm`. `optimizePackageImports: ['antd']`.
- Xong khi: các màn trên không còn import `@playora/ui/components/*` hay `react-hook-form`; ci xanh.

**F3 · `refactor/studio-permissions` · flash** — S6 (RBAC)
- Phụ thuộc: F0. Sở hữu: `apps/studio/src/lib/auth-client.ts`, `apps/studio/src/lib/permissions.ts` (mới, +test), `apps/studio/package.json` (dòng `@playora/auth` — nếu F4a đang sửa cùng file, rebase), logic gọi `canManageMembers/assignableRolesFor` trong `features/members` (không đổi UI).
- Làm: `can(role, { member: ['create'] })` dùng `hasPermission` từ `@playora/auth/permissions`; bỏ bản tự viết; `assignableRolesFor` dựa trên `can`. Báo kích thước bundle trước/sau.

### Đợt 3 — sau khi Đợt 2 merge (6 worker)

**F1 · `feat/studio-event-ia` · flash** — S5
- Phụ thuộc: F4a. Sở hữu: route `apps/studio/src/app/(app)/orgs/[orgId]/events/[eventId]/**` (layout, page, prizes, players, guests redirect), `features/events/components/{event-nav,event-overview}.tsx`, i18n namespace `eventNav.*`, `overview.*`, `tooling/e2e/tests` selector `event-tab-*`.
- Làm: tab bằng antd `Tabs`/`Menu` theo ADR-012 §6, cấu hình một mảng: **Tổng quan** (tên, trạng thái, link Play + QR, lối tắt), **Trò chơi**, **Giải thưởng** (placeholder `Empty` "Sắp có"), **Người chơi** (route `players` dùng `features/guests`; `guests` → redirect), **Cài đặt**. "Kênh" chưa hiện.

**F4b · `feat/studio-antd-org-pages` · flash** — S8 (trang cấp org)
- Phụ thuộc: F4a, F3. Sở hữu: `features/events/components/{events-table,create-event-dialog,event-status-badge}.tsx`, `features/assets/**`, `features/members/**`, `tooling/e2e/tests/org-members.spec.ts`.
- Làm: chuyển sang antd (`Table` có phân trang cursor như cũ, `Modal` + `Form`, `Upload`, `Tag`, `Popconfirm`); tách file > 250 dòng (`members-view`, `assets-manager`).

**F2b · `refactor/studio-players-antd` · flash** — S2 + S8 (người chơi)
- Phụ thuộc: F4a. Sở hữu: `features/guests/**`, `tooling/e2e/tests/guests.spec.ts`.
- Làm: tách `guests-view.tsx` → bảng (`Table`), thanh công cụ/lọc, dialog import (preview + commit, `Upload.Dragger`), `join-qr-card`, `random-teams-dialog`; hook `useGuests` trong `api.ts`; antd hoá.

**F2c · `refactor/studio-settings-brand-antd` · argon** — S2 + S8 (cài đặt, brand kit)
- Phụ thuộc: F4a, G1. Sở hữu: `features/events/components/event-settings-form*`, `features/brand-kits/**`, `tooling/e2e/tests/brand-kit-assets.spec.ts`.
- Làm: `event-settings-form` → các section (identity, registration form builder bằng `Form.List`, lịch/giới hạn) trong **một** antd `Form` + `useZodForm(UpdateEventBody)`; `brand-kits-manager` → list + editor (`ColorPicker`, chọn font, asset) + preview dùng `GameRoot` của G1.

**R4 · `refactor/builder-shared-logic` · argon** — S6, S7, B1 (games)
- Phụ thuộc: F0, R5. Sở hữu: `packages/game-sdk/src/{config-path,hot-edit,preview-protocol}.ts` (+test, export), `packages/contracts/src/localize.ts` (+export), `apps/api/src/modules/games/games.service.ts`, `apps/studio/src/features/games/lib/**` + chỗ gọi helper trong `features/games` (không đổi UI), `apps/play/src/app/preview/**`.
- Làm: §2.3 — một bản `getAtPath/setAtPath/canonicalJson/extractHotConfig/hasNonHotEditableChanges` trong game-sdk dùng ở cả API và Studio; `localize()` thay mọi `localizeText`; zod `PreviewMessage` cho cả gửi (Studio) và nhận (Play, `safeParse`, kiểm origin như cũ). `computeConfigHash` phải ra **cùng hash** như trước (test fixture) vì đã lưu trong DB.
- Xong khi: `games.service.ts` < 450 dòng; không còn `localizeText`/`getByDotPath`.

**P1 · `refactor/play-antd-api-i18n` · argon** — P1, P2, P4 (UI)
- Phụ thuộc: R2, G1. Sở hữu: `apps/play/src/**` trừ `app/preview/**`, `apps/play/package.json`, `apps/play/next.config.ts`, i18n namespace `play.*`, `tooling/e2e/tests/{player-join,player.smoke}.spec.ts`.
- Làm: `AntdRegistry` + `GameRoot`; `lib/api.ts` = `createApiClient` (không TanStack Query); thay `fetch` tay bằng `api.call(publicApi.event | publicApi.join)`, lỗi theo `ApiError.code`; next-intl (cookie/`Accept-Language`, mặc định `vi`), lỗi dùng `errors.*`, text mới `play.*`, bỏ `ERROR_MESSAGES`; join form = antd `Form` render từ `registrationForm`, validate client bằng `validateRegistration` (R2) trước khi gửi; `[slug]/_components` → `features/join/`, `player-session.ts` → `features/join/session.ts`.
- Xong khi: không còn `fetch(` tới API trong `apps/play`; First Load JS `/[slug]` trong ngân sách ADR-013 (báo số).

### Đợt 4 — sau khi Đợt 3 merge

**F2a · `refactor/studio-builder-antd` · argon** — S2 + S8 (builder)
- Phụ thuộc: R4, A1. Sở hữu: `features/games/**`, `tooling/e2e/tests/builder.spec.ts`.
- Làm: dựng builder theo §2.5 và antd hoá:
  - `editor-shell` (layout 2 cột: panel trái, preview phải; antd `Tabs`/`Collapse` cho các panel);
  - panel nền tảng: `skin-panel` (chọn skin + brand kit, logic hiện có), `content-panel` nếu có field nội dung chung; **panel Giải thưởng chỉ là chỗ giữ chỗ** (`Empty` "Gắn giải ở Đợt 4") — UI gắn giải thật thuộc story PRZ-01, không làm ở đây;
  - `template-panel` = AutoForm (A1) cho các group của configSchema + `editorPanels`/`editorWidgets` từ `surfaces` nếu template có;
  - `preview-frame` (postMessage theo `preview-protocol`), `publish-dialog`, `version-list` + hook `useGameEditor` (draft/dirty/publish, test thuần nếu tách được);
  - `games-tab` → `game-list` + `create-game-dialog` (chọn template/skin bằng `Card`/`Radio`);
  - gỡ adapter tương thích tạm của A1 nếu có.

**P2 · `perf/templates-lazy-surfaces` · flash** — P3
- Phụ thuộc: R4. Sở hữu: `packages/templates/src/surfaces.ts` (+test), `apps/play/src/app/preview/**` (chỗ lấy surface).
- Làm: `surfaces` map `id@version → () => import('./spin-wheel/player')`; Play dùng `React.lazy` + `Suspense` (fallback `Skeleton` antd); test registry vẫn kiểm mọi template có surface.

### Đợt 5 — chốt

**X1 · `chore/ui-remove-shadcn` · flash**
- Phụ thuộc: mọi task UI ở trên. Sở hữu: `packages/ui/src/components/**` (xoá), `packages/ui/package.json` (bỏ `radix-ui`, `class-variance-authority`, `sonner`, `react-hook-form`, `@hookform/resolvers`, `tw-animate-css`; giữ `clsx`/`tailwind-merge` cho `cn`), `apps/*/package.json` (bỏ dep tương ứng), `packages/ui/src/styles.css` (bỏ token shadcn, giữ bridge class ngữ nghĩa → `var(--ant-*)`), `packages/ui/components.json` nếu có, `docs/13`.
- Xong khi: `git grep "@playora/ui/components\|react-hook-form\|radix-ui\|sonner"` chỉ còn trong docs lịch sử/ADR; ci xanh.

**R6 · `chore/lint-boundaries` · flash** — B3
- Phụ thuộc: X1. Sở hữu: `biome.json`, `docs/10` §1.
- Làm: `overrides` + `noRestrictedImports`:
  - `packages/{contracts,core,game-sdk,i18n,env}/**`: cấm `@playora/db`, `@playora/auth`, `@nestjs/*`, `drizzle-orm`, `ioredis`, `next`, `antd` (`game-sdk` được `react` type).
  - `packages/ui/**`: cấm `@playora/api-client`, `@playora/db`.
  - `apps/api/src/modules/*/**`: cấm `../*/*.repository` (ngoại lệ còn lại ghi vào docs).
  - `apps/studio/src/app/**`: cấm `@/app/**`, `**/_components/**`.
  - Toàn repo: cấm `react-hook-form`, `radix-ui`, `sonner`, `@playora/ui/components/*` (chặn tái phát).
- Xong khi: `bun run lint` xanh không cần `biome-ignore` mới; vi phạm thật thì liệt kê, không tự sửa ngoài phạm vi.

---

## 4. Lịch & phân công

| Đợt | Task (model) | Song song | Gate |
|---|---|---|---|
| 1 | R1 (flash) · R3 (flash) · F0 (argon) · D0 (argon) | 4 | 4 PR merge; e2e trên `main` |
| 2 | R2 (argon) · R5 (flash) · A1 (argon) · G1 (argon) · F4a (flash) · F3 (flash) | 6 | e2e xanh |
| 3 | F1 (flash) · F4b (flash) · F2b (flash) · F2c (argon) · R4 (argon) · P1 (argon) | 6 | e2e xanh |
| 4 | F2a (argon) · P2 (flash) | 2 | e2e xanh |
| 5 | X1 (flash) → R6 (flash) | 1 | ci + e2e xanh; docs cập nhật |

Tổng 19 task: 9 argon, 10 flash. Trong lúc chuyển (Đợt 2–4) shadcn và antd **cùng tồn tại**; trang nào đã chuyển thì không còn import shadcn.

Điểm dễ xung đột:
- `packages/i18n/src/messages/{vi,en}.json`: F1, P1, F2*, F4* cùng thêm key → mỗi task một namespace, rebase trước khi merge.
- `apps/studio/package.json`: F4a và F3 (Đợt 2) → merge F4a trước.
- `docs/10`: F0 (§3, §6.4), D0 (§6.1, §6.3), R3 (§4.2), R5 (bảng gotcha), R6 (§1) — mỗi task chỉ mục được giao.
- Contract: R3 (health), R5 (`rateLimit`), R4 (`localize.ts` mới) — đều là thêm, không đổi shape cũ.
- `packages/templates/src/surfaces.ts`: A1 (Đợt 2, thêm type) rồi P2 (Đợt 4, đổi sang lazy loader) — tuần tự, không song song.
- e2e: antd đổi DOM; mỗi task UI sở hữu spec của mình (cột Sở hữu) và **giữ `data-testid`**.

## 5. Định nghĩa xong (mọi task)
- `bun run ci` xanh, dán output cuối vào PR.
- Không đổi hành vi trừ chỗ plan ghi rõ; test cũ pass (chỉ sửa selector/URL ở spec mình sở hữu).
- PR: task ID, what changed, how verified, rủi ro; screenshot trước/sau cho UI (light + dark ở Studio, 1 skin ở Play).
- Dependency mới chỉ là `antd`, `@ant-design/nextjs-registry` (D0) — task khác cần thêm thì hỏi.
- Điều phối viên (Opus): review diff, chạy `bun run e2e` tuần tự, squash merge.

## 6. Ngoài phạm vi
- B7 (join lock / unique device) → story "nền dữ liệu campaign".
- API lượt chơi, UI giải/voucher, `/[slug]/g/[gameId]`, `/[slug]/prizes` → Đợt 4 sản phẩm (ADR-012 §7).
- UI gắn giải vào ô vòng quay (thay `prizeSlot` text) → story PRZ-01, dùng lối thoát `editorWidgets`/panel Giải thưởng của §2.5.
- Xoá hẳn widget `richtext`/`datetime-range`/`prize-picker` khỏi enum contract và game-sdk → làm sau khi không còn chỗ dùng (đổi contract, cần hỏi).
- Outbox, metrics/tracing → khi có thông báo M2.
