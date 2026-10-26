# Load Testing (`k6`)

Load test scripts for the Playora Campaign Play API (`docs/engineering/architecture.md` §6.2, `docs/product/prd.md` §6 & §7.4).

## Prerequisites

`k6` is an external binary (not an npm dependency). Install it on macOS via Homebrew:

```bash
brew install k6
```

## Scripts

### `play.js` — Campaign Join + Play Load Test

Targets a published campaign at **500 plays/s for 60 s** (`constant-arrival-rate`) and asserts the M1 pilot SLO thresholds:
- `http_req_duration`: `p(95) < 200 ms`
- `http_req_duration{endpoint:play}`: `p(95) < 200 ms`
- `http_req_failed`: `rate < 0.1%` (`rate<0.001`)

#### Flow per Virtual User (VU)

1. **Join (`POST /v1/p/:slug/join`)** — Contract: `publicApi.join` (`packages/contracts/src/api/public.ts`).
   Sends a random `deviceId`, player `displayName` / `fields`, and `consents` (`participation`, `marketing`) to obtain a signed `playerToken`.
2. **Play (`POST /v1/p/:slug/plays`)** — Contract: `playsApi.play` (`packages/contracts/src/api/plays.ts`).
   Calls the play endpoint with header `Authorization: Bearer <playerToken>` and body `{ requestId: <uuid v4> }`.
3. **Turn rotation** — Caches `playerToken` per VU while `turnsLeftToday > 0` and automatically joins as a new player device once daily turns are exhausted (`turnsLeftToday <= 0` or `outcome === 'no_turns'`).

#### Running

```bash
BASE_URL=http://localhost:4000 SLUG=tet-2027 k6 run tooling/loadtest/play.js
```

#### Environment Variables

| Variable   | Default                 | Description                                               |
| ---------- | ----------------------- | --------------------------------------------------------- |
| `BASE_URL` | `http://localhost:4000` | Base URL of the running `apps/api` server (without `/v1`) |
| `SLUG`     | `tet-2027`              | Slug of a published, live campaign                        |
