# Playora P1 — Player App Anti-Fraud & Playbook Rules Report

## 1. What Changed

### Cloudflare Turnstile (Anti-Fraud "Chuẩn", EVT-13)

- **Typed Wrapper (`apps/play/src/features/captcha/turnstile.ts`)**: Minimal typed interface over `window.turnstile` with `renderTurnstile`, `resetTurnstile`, `removeTurnstile`, and `isTurnstileReady`.
- **Script Loading (`apps/play/src/features/campaign/campaign-shell.tsx`)**: Loads `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` using `next/script` (`lazyOnload`) strictly on campaign pages when `captchaSiteKey` is set.
- **Challenge Modal (`apps/play/src/features/captcha/turnstile-modal.tsx`)**: Renders Turnstile widget in managed mode with `size: 'flexible'` inside an Ant Design `Modal`.
- **Pre-play Acquisition & 403 `CAPTCHA_REQUIRED` Retry Flow (`apps/play/src/features/campaign/play-captcha.ts`)**:
  - Automatically initiates challenge solving before the first play of the session on the Game screen.
  - Sends the acquired token as `captchaToken` in the play request body.
  - On 403 `CAPTCHA_REQUIRED`: resets the Turnstile widget, prompts for challenge re-verification, and upon solution, retries the request with the **same idempotency `requestId`** and the fresh `captchaToken`.

### Rate Limiting (429 `RATE_LIMITED`)

- In `PlayRequester` (`apps/play/src/features/campaign/play-request.ts`), 429 `RATE_LIMITED` stops immediate automatic retry loops (avoiding repeated rate limit hits within the 60-second window) while **preserving `pendingRequestId`**.
- Displays a friendly warning toast via `App.useApp().message.warning` using `errors.RATE_LIMITED`. Subsequent player taps reuse the same `requestId`.

### Require Redeem Before Replay (`redeem_first`)

- In `packages/ui/src/campaign/campaign-player.tsx`, when `onPlay` returns `no_turns` with `reason: 'redeem_first'`, or when `me.blockedReason === 'redeem_first'`:
  - Displays `RedeemFirstBanner` on the Game screen: _"Đổi quà ở quầy trước để chơi lượt tiếp theo"_ (Vietnamese) / _"Redeem your prize at the counter before playing the next turn"_ (English).
  - Provides a button that directly opens the _"Quà của tôi"_ (My prizes) drawer.
  - When the counter redeems the voucher via the API, the block clears and the next turn is enabled.

### Open Days & Next Turn Formatting

- **Next Turn Time**: Formats `PlayerState.nextTurnAt` in the campaign's timezone with next-intl `useFormatter`. Shown in `NoticeSheet` when turns run out and in the turns-left indicator when 0 turns remain.
- **Open Days (`openDays`)**: Added `formatOpenDays` (`apps/play/src/features/campaign/open-days.ts`) to format active weekdays (0=Sun..6=Sat). Displayed on closed notices (`NoticeSheet`, `CampaignNotice`) and as an item in `RulesSheet`.
- **Translations**: Added all keys in both `packages/i18n/src/messages/vi.json` and `en.json` (verified by `messages.test.ts`).

### E2E Test Extension

- Extended `tooling/e2e/tests/play-campaign.spec.ts` with a test for `requireRedeemBeforeReplay: true`:
  - Creates and publishes a campaign with `requireRedeemBeforeReplay: true`, `playsPerDay: 3`, `mode: 'guaranteed'`, and `antiFraud: 'low'`.
  - First play: player wins a voucher.
  - Second play attempt: server returns `no_turns` + `redeem_first`, displaying the message and the _"Quà của tôi"_ button on the game screen.
  - Counter redeems the voucher via API.
  - Third tap plays and successfully wins.

---

## 2. How to Test

### Automated Verification

Run the complete CI pipeline (Biome lint, TypeScript typecheck across all packages, Bun tests across all modules, and Turborepo builds):
```bash
bun run ci
```

Scope testing to individual packages:
```bash
# Play app unit tests (including turnstile, retry flow, redeem_first, and formatting)
bun test apps/play

# UI package tests
bun test packages/ui

# i18n locale and error code parity tests
bun test packages/i18n

# Typecheck play app
bunx turbo run typecheck --filter=@playora/play
```
