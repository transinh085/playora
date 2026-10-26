# P0.6 (Part 1) — Prize Engine 1M-Play Acceptance & k6 Load Script Report

## Files Added / Updated

| File                                         | Purpose                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/prize/acceptance.test.ts` | 1,000,000-play deterministic acceptance test suite (`createSeededRng`) across 4 campaign rule sets built via `toPrizeRules` (`overall_win_rate` with budget, `per_prize_probability` with per-player limits, `guaranteed`, and `time_uniform` pacing with opening hours) across 50,000 players and 50 concurrent player streams. Supports `PRIZE_SIM_FULL=1` for 4,000,000 plays (1M per case). |
| `tooling/loadtest/play.js`                   | k6 load test script targeting 500 plays/s for 60 s (`p(95) < 200 ms`, `http_req_failed < 0.1%`) against `POST /v1/p/:slug/join` and `POST /v1/p/:slug/plays`.                                                                                                                                                                                                                                   |
| `tooling/loadtest/README.md`                 | Usage documentation and `brew install k6` setup instructions.                                                                                                                                                                                                                                                                                                                                   |
| `tooling/loadtest/REPORT.md`                 | Summary of test timings, invariants verified, and prize engine findings.                                                                                                                                                                                                                                                                                                                        |

## Timings (`packages/core/src/prize/acceptance.test.ts`)

Measured on Bun `1.4.4`:

| Mode                                         | Plays Executed | Case 1 (`overall_win_rate` + budget) | Case 2 (`per_prize_probability` + limits) | Case 3 (`guaranteed`) | Case 4 (`time_uniform` + opening hours) | Total File Time                      |
| -------------------------------------------- | -------------- | ------------------------------------ | ----------------------------------------- | --------------------- | --------------------------------------- | ------------------------------------ |
| Default (`1,000,000` plays total, 250k/case) | `1,000,000`    | ~83 ms                               | ~85 ms                                    | ~66 ms                | ~104 ms                                 | **~414 ms** (well under 20 s target) |
| Full (`PRIZE_SIM_FULL=1`, 1M/case)           | `4,000,000`    | ~277 ms                              | ~323 ms                                   | ~246 ms               | ~400 ms                                 | **~1,299 ms**                        |

## Invariants Verified

Across all 4 rule sets (50,000 players, 50 concurrent streams):
- **0 stock over-issue**: `remainingByPrize[id] >= 0`, `issuedByPrize[id] <= quantity`, and `remaining + issued === quantity` at every play and at campaign end.
- **0 budget overrun**: `budgetUsedVnd <= budgetVnd` on every win; when remaining budget can only afford cheaper prizes, only affordable prizes are awarded until remaining budget is less than the cheapest in-stock prize.
- **0 per-player limit violations**: `perPlayerTotal` (`maxWinsPerPlayer`), `perPlayerPerDay`, and `perPrizePerPlayer` are never exceeded for any of the 50,000 players.
- **Opening hours & `time_uniform` pacing**: 0 wins occur outside `08:00–20:00` (`Asia/Ho_Chi_Minh`), and at every tenth of the campaign (`10%, 20%, …, 100%`), cumulative issued prizes stay within `±10%` of the planned curve (both relative to total stock and relative to planned issued at that checkpoint).

## Engine Observations / Potential Bugs Found (Engine Logic Unchanged)

Per task instructions, no engine logic was modified. The following observations were identified during inspection and testing:
1. **`toPrizeRules()` in `packages/core/src/prize/campaign.ts` (line 41) does not enable `smoothing: true` for `time_uniform` pacing:**
   - `toPrizeRules` sets `pacing: { strategy: rules.pacing && !opts.rehearsal ? 'time_uniform' : 'none' }`, leaving `smoothing` undefined (which defaults to `false` in `PrizePacing`, `schemas.ts` line 61).
   - Consequently, `decide()` (`decide.ts` line 196: `if (rules.pacing?.smoothing)`) never invokes `computeSmoothingFactor()` for rules built via `toPrizeRules`.
   - When `plays * baseWinRate >= totalStock * 1.1`, the hard pacing cap `allowed = totalQuantity * elapsed * (1 + buffer)` still keeps issued prizes within `+10%` of the plan. However, if a campaign has a conservative base win rate (`plays * baseWinRate < totalStock`) or recovers from a low-traffic window, upward smoothing never boosts the win probability to catch up to the plan (`docs/product/specs/prizes-redemption.md` §3).
2. **`toPrizeRules()` allocates a fresh `openingHours` array on every call (`campaign.ts` line 44):**
   - `schedule.ts` (line 137) caches compiled opening hours in a `WeakMap` keyed by the `openingHours` array reference (`compiledOpeningHoursCache`).
   - If a caller invokes `toPrizeRules()` on every play request rather than once per published campaign version, the newly allocated `[{ start, end }]` array misses the `WeakMap` cache on every play and also allocates an unused `new Date()` (`campaign.ts` line 23) when `rehearsal: false`.
3. **`per_prize_probability` checks RNG roll and stock before player limits (`decide.ts` lines 239–274):**
   - Unlike `overall_win_rate` and `guaranteed` (which check `perPlayerTotal` and `perPlayerPerDay` before rolling when any prize is in stock), `per_prize_probability` rolls first and checks `rem <= 0` before checking `playerTotal >= limits.perPlayerTotal`. This never violates limits (a capped player still cannot win), but a capped player may receive `reason: 'lose'` or `reason: 'out_of_stock'` instead of `reason: 'limit'`.
4. **`simulate()` in `packages/core/src/prize/simulate.ts` (line 161) computes `currentLocalDay` once per hour at `hourStartMs`:**
   - If `window.startsAt` is not aligned to a whole-hour boundary in the campaign timezone, plays in the latter part of an hour that crosses local midnight use the previous day's `localDayIndex` for `perPlayerPerDay` tracking.

## Run 26/10/2026 — Play API at 500 plays/s (P0.6, PRD §7.4)

Setup: MacBook (Apple silicon), one API process (`bun dist/main.js`, `NODE_ENV=production`, `TRUST_PROXY=1`, `LOG_LEVEL=warn`) on port 4100, Postgres and Valkey from the dev compose. Campaign from `seed-campaign.ts` (anonymous, `overall_win_rate` 20%, 120k stock, 5 plays/day, anti-fraud `low`). Each k6 VU sends its own `X-Forwarded-For`, as guests behind Cloudflare would.

```
API=http://localhost:4100 bun tooling/loadtest/seed-campaign.ts   # prints the slug
BASE_URL=http://localhost:4100 SLUG=<slug> k6 run tooling/loadtest/play.js
```

| Metric                     | Result                                                                                                      | Target   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| Plays                      | 29,949 in 60 s (499/s), 6,069 players                                                                       | 500/s    |
| p95 play latency           | 150 ms (median 11 ms, max 353 ms)                                                                           | < 200 ms |
| Failed requests            | 0 / 36,018                                                                                                  | < 0.1%   |
| Stock ledger after the run | p1: 4,919 issued = 4,919 awards = 4,919 wins, remaining 95,081; p2: 1,007 = 1,007 = 1,007, remaining 18,993 | 0 drift  |

Gate P0 load criterion met on a single node; repeat on the production VM before the pilot (runbook checklist).
