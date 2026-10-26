# P0.5 Studio Builder Lab → Real API Report (2026-10-26)

## What Changed

1. **Contract-backed Studio hooks (`apps/studio/src/features/builder-lab/api.ts`)**:
   - Replaced `apps/studio/src/features/builder-lab/mock/hooks.ts` with real React Query hooks over `@playora/contracts` (`campaignsApi`, `vouchersApi`) using `useRouteQuery`, `useRouteMutation`, `routeKey`, and `routePrefix` from `@playora/api-client`:
     - Queries: `useCampaigns`, `useCampaign`, `useCampaignStats`, `useCampaignsStats`, `useCampaignPlays`, `useCampaignVouchers`, `useVoucherLookup`.
     - Mutations: `useCreateCampaign`, `useUpdateCampaign` (with optimistic cache update on `campaignsApi.get` and rollback on error), `usePublishCampaign`, `useDeleteCampaign`, `usePauseCampaign`, `useResumeCampaign`, `useEndCampaign`, `useRehearsalPlay`, `useRedeemVoucher`, `useReopenVoucher`.
   - Adapted Studio components (`CampaignHome`, `CampaignList`, `CampaignOps`, `LabPlayer`, `PhonePreview`, `PublishDialog`, `BuilderEditor`, `TemplateGallery`) to contract shapes (`voucher.code`, `CampaignListItem` without `screens` using `buildScreens(templateKey, skinKey).cover` for thumbnails, server `phase`, `hasUnpublishedChanges`).

2. **Starter catalogue & pure rules simulation (`apps/studio/src/features/builder-lab/lib/starter.ts`, `lib/rules-sim.ts`, `lib/phase.ts`)**:
   - Moved `TEMPLATES`, `getTemplate`, `getSkin`, `buildScreens`, `defaultPrizes`, `defaultRules`, and `skinBrand` out of `mock/templates.ts` into `lib/starter.ts`; `useCreateCampaign` sends the client-built starter document (`brand`, `screens`, `prizes`, `rules`) to `campaignsApi.create`.
   - Moved `simulateCampaign` and `CAFE_TRAFFIC_SHAPE` (using `toPrizeRules` and `simulate` from `@playora/core/prize`) into `lib/rules-sim.ts`.
   - Updated `lib/phase.ts` to use the server `phase` when no custom timestamp is passed and delegate timestamped evaluation to `@playora/core/prize`'s `campaignPhase`.
   - Deleted the entire `apps/studio/src/features/builder-lab/mock/` directory (`api.ts`, `api.test.ts`, `db.ts`, `hooks.ts`, `templates.ts`, `types.ts`).

3. **Asset upload for editor images (`apps/studio/src/features/builder-lab/lib/upload-image.ts`)**:
   - Implemented `uploadCampaignImage` / `useUploadCampaignImage` over `assetsApi.createUpload` → `PUT` → `assetsApi.completeUpload`.
   - Wired image uploads into Quick Edit (`SlotCard`), Rules & Prizes (`PrizeImagePicker`), and Free Canvas (`PropertiesPanel` + `CanvasWorkspace` + `CustomizeMode`), preventing uploaded `data:` URLs from being stored in campaign documents while keeping bundled SVG presets (`presetSrc`).

4. **Debounced draft saving & publish error handling (`use-campaign-draft.ts`, `publish-dialog.tsx`)**:
   - Debounced draft saves at `800ms` with optimistic cache updates on `campaignsApi.get`, in-flight save tracking on `flush()`, save-state indicator, and 400 error reporting via `applyApiError` and `App.useApp()` toasts.
   - `PublishDialog` flushes pending draft saves before calling `campaignsApi.publish` and surfaces `INVALID_PRIZE_RULES`, `PRIZE_QUANTITY_BELOW_ISSUED`, and other `ErrorCode` messages via `errors.*` translations.

5. **Phone preview & Studio player (`phone-preview.tsx`, `lab-player.tsx`)**:
   - Wired Studio phone preview and rehearsal player (`?rehearsal=1`) to `campaignsApi.rehearsalPlay` with a per-browser `testerKey` and a fresh `requestId` (`crypto.randomUUID()`) per play.
   - Wired Studio live player (`/orgs/:orgId/play/:campaignId`) to `publicApi.join` + `playsApi.play` + `playsApi.me`.

6. **Redeem desk & `redeemer` role (`redeem-desk.tsx`, `permissions.ts`, `app-shell.tsx`)**:
   - Wired `RedeemDesk` to `vouchersApi.lookup`, `vouchersApi.redeem`, and owner-only `vouchersApi.reopen` (with a required reason modal validated by `useZodForm(ReopenVoucherBody)` and `applyApiError`), with responsive phone-first layout for counter staff.
   - Added `'redeemer'` to `ORG_ROLES` and `isRedeemerOnly` in `apps/studio/src/lib/permissions.ts`.
   - Filtered `AppShell` navigation items by permission so `redeemer`-only members do not see campaign/brand navigation and land directly on `/orgs/:orgId/redeem` (on `/`, `/orgs/:orgId`, org switcher, and invitation acceptance).

7. **E2E & i18n (`tooling/e2e/tests/builder-lab.spec.ts`, `packages/i18n/src/messages/{vi,en}.json`)**:
   - Updated `tooling/e2e/tests/builder-lab.spec.ts` for the real API flow.
   - Added all new redeem/canvas upload i18n keys to both `vi.json` and `en.json`.

## Contract Issue Found & Resolved

- **Bundled preset SVG data URLs on `CampaignPrize.image` (`packages/contracts/src/api/campaigns.ts`)**:
  - `presetSrc(key)` in `@playora/ui/campaign` returns inline UTF-8 SVG data URLs (`data:image/svg+xml;utf8,...`), which are used by `defaultPrizes()`, new prize rows in `PrizeListStep`, and preset stickers in `PrizeImagePicker`.
  - `CampaignImageRef` in `packages/contracts/src/api/campaigns.ts` previously had `.refine((v) => !v.startsWith('data:'))`, which rejected bundled `presetSrc` values on `campaignsApi.create` and `campaignsApi.update` even though bundled preset images are intended to be allowed as-is while uploaded base64 `data:` URLs are forbidden.
  - Updated `CampaignImageRef` refinement to `.refine((v) => !v.startsWith('data:') || v.startsWith('data:image/svg+xml;utf8,'))` and added a contract validation test in `apps/studio/src/features/builder-lab/lib/starter.test.ts` covering all `TEMPLATES × skins` starter documents against `CreateCampaignBody`.

## What's Left

- Run Playwright E2E suite (`bun run e2e`, specifically `tooling/e2e/tests/builder-lab.spec.ts` and `tooling/e2e/tests/org-members.spec.ts`) from the coordinator once all parallel branches are merged and dev ports are free.
