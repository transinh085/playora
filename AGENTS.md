# AGENTS.md — Playora

Instructions for AI coding agents (Claude Code, Codex, Antigravity…) working in this repo. Human docs live in `docs/`; this file is the short, binding version.

## What this is

Playora is a gamified campaign builder: branded prize minigames (spin wheel, scratch card, gift box, catch items) built from template × seasonal skin, with a server-side prize engine (odds, inventory, pacing, limits, budget), agency white-label, and a Live add-on (multiplayer LED games, transparent lucky draw). No quiz/poll. Product source of truth: `docs/00-product-strategy.md`. Requirements by phase (M1…M4): `docs/prd.md`. Code architecture and conventions: `docs/10-dev-setup-conventions.md` — read §3 before adding a feature.

## Stack

Bun 1.4 workspaces + Turborepo · Next.js 16 (studio, play, web) · NestJS 12 on Bun (api, realtime, worker) · Drizzle + PostgreSQL · Valkey/Redis + BullMQ · Better Auth · zod 4 · shadcn/ui + Tailwind v4 · Biome · TypeScript 6 (not 7).

## Commands

```bash
bun install                      # deps + git hooks
bun run infra:up                 # Postgres :54329, Valkey :63799 (needed for API tests)
bun run db:migrate && bun run db:seed
bun run dev                      # all apps
bun run ci                       # lint + typecheck + test + build — MUST pass before you say "done"
bun run e2e                      # Playwright; run when you touch studio/play UI
bun run format                   # Biome autofix
bun run db:generate              # after changing packages/db/src/schema/*
```

Scope a check to one package with `bunx turbo run typecheck test --filter=@playora/<name>`.

## How to add a feature (follow the `events` module exactly)

1. **Contract first** — `packages/contracts/src/api/<feature>.ts`: zod schemas + `defineRoute({ method, path, auth, permission, params, query, body, response })`; add to `allRoutes`.
2. **Permissions** — new resource → `packages/auth/src/permissions.ts` + test.
3. **DB** — schema in `packages/db/src/schema/`, then `bun run db:generate`; commit the generated SQL.
4. **API** — `apps/api/src/modules/<feature>/`: repository (every method takes `organizationId` first and filters by it) → service → controller using only `@Route(contract)` + `@Args()`.
5. **Integration test** — `apps/api/test/<feature>.e2e.test.ts` with `createTestApp()`; must cover happy path, 400, 401 and **cross-tenant 403/404**.
6. **Studio** — `useRouteQuery` / `useRouteMutation` from `@playora/api-client/react`; forms use `zodResolver(<contract schema>)` + `applyApiError`; all text via next-intl with keys in **both** `vi.json` and `en.json`.
7. **E2E** for the main user flow in `tooling/e2e/tests/`.

## Hard rules

- Never weaken tenant isolation: no query on org-owned tables without `organizationId`.
- Never validate or authorize by hand in controllers — the contract does it.
- New error → add to `ErrorCode` **and** `packages/i18n` `errors.*` (a test enforces it).
- Server decides every game outcome and prize; clients only render. Never add a way to pre-select lottery winners.
- Do not edit generated files: `packages/db/src/schema/auth.ts` (regenerate with `bun run --cwd packages/auth generate:schema`), `packages/db/drizzle/**`, `bun.lock` by hand.
- Do not change pinned versions or add dependencies without saying why in the PR. Pin exact versions (`bunfig.toml` has `exact = true`).
- NestJS: import injectable classes as values (`import { X }`, not `import type`); decorator flags stay in each Nest app's own `tsconfig.json`.
- UI: only `@playora/ui/components/*` and theme tokens (`bg-primary`, `text-muted-foreground`), no hard-coded colors. Adding a shadcn component: follow `docs/10` §6.3 (CLI writes a bogus `cn` import).
- Never commit `.env` or secrets. Dev DB/Redis use ports 54329/63799.

## Git

- Work on a branch (`feat/…`, `fix/…`, `chore/…`), never directly on `main`.
- Conventional Commits, enforced by lefthook: `feat(api): add guest list import`.
- Small PRs (aim < 400 changed lines), one PRD ID per PR (e.g. `EVT-02`), with: what changed, how it was verified (`bun run ci` output), screenshots for UI.
- Pre-commit runs Biome on staged files; do not bypass hooks with `--no-verify`.

## Parallel agents (Orca worktrees)

Several agents may work at once, each in its own Orca worktree (setup: `orca.yaml` copies `.env`, runs `bun install` and `db:migrate`). They share one Postgres/Valkey and the fixed dev ports 3000–4002, so:
- `bun run ci` and `bun test` are safe in parallel (API tests listen on a random port and use random test data).
- Do **not** leave `bun run dev` running, and run `bun run e2e` only when no other worktree is running it — Playwright reuses whatever server is on those ports, which may belong to another worktree.
- Migrations are shared: never run `db:generate` for someone else's schema change, and coordinate before merging two branches that both add migrations (renumber the later one).
- Stay inside the scope of your task brief; if you must touch a shared contract (`packages/contracts`) beyond it, stop and ask.

## Definition of done

`bun run ci` green · new code has tests at the right layer (`docs/10` §7) · e2e green if UI changed · docs/ADR updated if architecture changed · no new console errors in the browser.

## Where things are

| Need                                    | Look at                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| Reference backend module                | `apps/api/src/modules/events/` + `apps/api/test/events.e2e.test.ts`                    |
| Reference Studio page                   | `apps/studio/src/app/(app)/orgs/[orgId]/events/`                                       |
| Request pipeline (guards, filters)      | `apps/api/src/app.module.ts`, `apps/api/src/bootstrap/configure-app.ts`                |
| Realtime engine (LiveRoom, RoundRunner) | `apps/realtime/src/live/`, `docs/05-architecture.md` §5–6                              |
| Game template interfaces                | `packages/game-sdk/src/index.ts`, `docs/04-game-catalog.md`, `docs/12-builder-spec.md` |
| Background jobs                         | `packages/jobs/src/definitions.ts`, `apps/worker/src/processors/`                      |
| Decisions and their reasons             | `docs/adr/`                                                                            |
