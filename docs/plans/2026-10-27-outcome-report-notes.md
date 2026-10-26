# P1.3 Studio Outcome Overview & One-Page Report (`PLB-03`, `PLB-04`, `ANL-01`) — 2026-10-27

## What Changed

1. **Contract-backed report query hook (`apps/studio/src/features/builder-lab/api.ts`)**:
   - Exported `CampaignReport` and `PlaybookKey` from `@playora/contracts` and added `useCampaignReport(orgId, campaignId, options)` over `campaignsApi.report` (`GET /orgs/:orgId/campaigns/:campaignId/report`), supporting `refetchInterval: 30_000` while live.
   - Added `options?: { enabled?: boolean; refetchInterval?: number }` to `useCampaignPlays`.
   - Added cache invalidation for `campaignsApi.report` across `useUpdateCampaign`, `usePublishCampaign`, `useRedeemVoucher`, and `useReopenVoucher`.

2. **Accessible inline SVG daily chart (`apps/studio/src/components/daily-outcome-chart.tsx`)**:
   - Built `DailyOutcomeChart` using inline SVG (`role="img"` with `<title>`) and Ant Design `theme.useToken()` tokens (`colorPrimary`, `colorWarning`, `colorBorderSecondary`, `colorTextTertiary`), without adding any new npm dependencies.
   - Renders daily bars for `plays` (`opacity={0.18}`), inner bars for `wins` (`opacity={0.7}`), and an accented line + point markers for `visits` (`Khách tới quầy`), with an empty state when all days have zero activity.

3. **Pure metric formatting, playbook key metric & 3-insight generator (`apps/studio/src/features/builder-lab/lib/report.ts`, `report.test.ts`)**:
   - Implemented pure formatting functions (`formatCount`, `returningRatePercent`, `formatReturningMetric`, `formatPrizeCostMetric`, `formatCostPerVisitMetric`, `redemptionRatePercent`, `dayWeekday`, `formatShortDay`).
   - Implemented `computePlaybookKeyMetric(report, options)` highlighting:
     - `tet_traffic` → visits/day (`visits / byDay.length`)
     - `second_visit` → returning customer rate (`returningVisitors / uniqueVisitors`)
     - `slow_days` → visits on open weekdays (`openDays` filter)
   - Implemented `buildReportInsights(report, options)` returning 3 deterministic, localized insightdescriptors (`busiest_day` / `no_activity`, `best_channel` / `no_channel`, `redemption_rate`, `cost_within_budget` / `cost_over_budget` / `cost_no_budget` / `no_visits_yet`) rendered via `next-intl` ICU parameters in Vietnamese and English.
   - Added unit tests in `apps/studio/src/features/builder-lab/lib/report.test.ts`.

4. **Campaign Overview & One-Page Printable Report (`apps/studio/src/features/builder-lab/components/studio/campaign-report.tsx`, `campaign-ops.tsx`, `apps/studio/src/app/(app)/orgs/[orgId]/campaigns/[campaignId]/report/page.tsx`)**:
   - Updated Campaign Overview (`CampaignOps` → `OverviewTab`) to lead with the playbook goal banner (`PlaybookGoalBanner`) and the 4 headline outcome numbers (`OutcomeMetricGrid` via `MetricGrid`: `Khách tới quầy`, `Khách quay lại (%)`, `Chi phí quà / ngân sách`, `Chi phí mỗi khách tới quầy`), followed by `DailyOutcomeCard` (`plays · wins · visits`), `ChannelsTableCard`, `PrizesOutcomeCard` (`Đã phát / Đã đổi / Còn lại`), and `RecentPlays`.
   - Kept all lifecycle operations (`pause`, `resume`, `end`, `share`, `draft-checklist`, `prize-stock`) working and auto-refreshing every 30 s while live.
   - Added `/orgs/[orgId]/campaigns/[campaignId]/report` (`CampaignReportView`) with `"In / Lưu PDF"` (`window.print()`), goal banner, dates, 4 key outcome metrics, daily chart, prizes by type, channels table, and the 3 auto-generated insights.
   - Added `@page { size: A4; margin: 12mm; }` and `@media print` rules in `apps/studio/src/app/globals.css` to hide Studio navigation chrome and prevent page breaks inside cards (`break-inside: avoid`).

5. **i18n, E2E & PRD status (`packages/i18n/src/messages/{vi,en}.json`, `tooling/e2e/tests/campaign-report.spec.ts`, `docs/product/prd.md`)**:
   - Added `campaigns.viewReport` and `campaigns.report.*` keys in both `vi.json` and `en.json`.
   - Added Playwright E2E spec `tooling/e2e/tests/campaign-report.spec.ts` covering API campaign creation/publish (`antiFraud: 'low'`), public API `join` + `play`, counter voucher redemption, and Studio Overview + one-page report verification (`Khách tới quầy = 1`).
   - Updated PRD status column in `docs/product/prd.md` for `PLB-03`, `PLB-04`, and `ANL-01` to `✅`.

## Verification

- `bun run ci` (Biome lint + Turborepo `typecheck`, `test`, `build` across all 18 packages): **36/36 tasks green** (`@playora/studio`: 100 unit tests passing; `@playora/api`: 107 integration tests passing; `@playora/i18n`: parity tests passing).
- Playwright E2E spec `tooling/e2e/tests/campaign-report.spec.ts` is typechecked and ready for the coordinator to run with `bun run e2e`.
