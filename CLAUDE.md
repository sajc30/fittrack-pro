# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

FitTrack Pro — a gym tracking app. Turborepo + pnpm monorepo with a Next.js web dashboard and a native SwiftUI iOS app, both backed by Supabase (Postgres + Auth + RLS).

There are **two mobile clients** in this repo, not one:
- `apps/ios` — native SwiftUI app, **actively developed**, the real iOS client.
- `apps/mobile` — the original Expo/React Native scaffold. It is **frozen/legacy**: it hasn't changed since the initial commit and was superseded by `apps/ios`. Don't extend it unless explicitly asked to; assume new mobile work goes into `apps/ios`.

## Commands

```bash
pnpm install              # install all workspace deps

pnpm dev                  # turbo dev — runs all apps
pnpm dev:web              # Next.js dev server (apps/web), http://localhost:3000
pnpm dev:mobile           # expo start (apps/mobile — legacy, see above)

pnpm build                # turbo build — all apps
pnpm build:web            # build apps/web only

pnpm lint                 # turbo lint (ESLint, flat config, eslint-config-next)
```

**Typechecking**: `turbo.json` declares a `typecheck` pipeline, but no package currently implements a `typecheck` script, so `pnpm typecheck` is a no-op. To actually typecheck the web app, run `npx tsc --noEmit` from `apps/web/`.

**Tests**: only `packages/shared` has tests (Vitest).
```bash
pnpm --filter @fittrack/shared test          # run all shared tests
cd packages/shared && npx vitest run -t "name"   # run a single test by name
```

**iOS** (`apps/ios`): Xcode project is generated from `project.yml` via [XcodeGen](https://github.com/yonaskolb/XcodeGen) — re-run after adding/removing/moving Swift files:
```bash
cd apps/ios && xcodegen generate
xcodebuild -project FitTrack.xcodeproj -scheme FitTrack -destination 'platform=iOS Simulator,name=<device>' build
```
Swift 6, deployment target iOS 17. Dependency is the `Supabase` umbrella package (supabase-swift) — depend on the `Supabase` product, not individual `Auth`/`PostgREST`/`Realtime` products.

**Supabase**: no migration CLI/history is wired up. Schema lives in `supabase/migrations/*.sql` as hand-written, sequentially-numbered files intended to be pasted into the Supabase SQL editor (or applied with the Supabase MCP tools) — there's no automatic apply-on-deploy step.

## Architecture

### Monorepo layout
- `apps/web` — Next.js 16 (App Router), shadcn/ui, Tailwind v4.
- `apps/ios` — SwiftUI, supabase-swift. The active mobile client.
- `apps/mobile` — Expo SDK 54 scaffold. Legacy, frozen.
- `packages/shared` (`@fittrack/shared`) — cross-platform TS: domain types (`types.ts`), formulas (`calculations.ts`: Mifflin-St Jeor BMR/TDEE, Epley 1RM), labels/enums (`constants.ts`), date/formatting helpers (`utils.ts`). Consumed by both `apps/web` and `apps/mobile` via `workspace:*`. **`apps/ios` has no code-sharing mechanism with this package** — Swift doesn't import it, so any formula change here needs a manual hand-port to Swift if/when iOS needs that formula.
- `packages/config` — shared ESLint/TS/Tailwind config exports. `packages/ui` is an empty, unused scaffold (no components yet).
- `supabase/migrations` — schema, see above.

### Next.js version warning
`apps/web` is on Next.js 16.2.2, which has APIs/conventions that diverge from older training data (the root `README.md` says "15" — that's stale). `apps/web/AGENTS.md` (pulled in automatically via `apps/web/CLAUDE.md`'s `@AGENTS.md` import) requires reading the bundled docs in `apps/web/node_modules/next/dist/docs/` before writing or changing any Next.js-specific code in that app.

### Supabase client pattern (`apps/web/src/lib/supabase/`)
Three separate client constructors, each for a different runtime:
- `client.ts` — browser client (`createBrowserClient`), for Client Components.
- `server.ts` — server client using `next/headers` cookies, for Server Components/Actions.
- `middleware.ts` — `updateSession()`, called from the root `src/middleware.ts`. This is also where **all auth/onboarding route-gating lives**: redirects unauthenticated users to `/auth/login`, redirects authenticated users away from auth pages, and redirects users with an incomplete profile to `/onboarding`. Pages themselves don't re-implement this gating.

### Personal records are DB-owned, not client-owned
`personal_records` is maintained entirely by Postgres triggers (`supabase/migrations/002_pr_integrity.sql`), not application code. Inserting/updating/deleting a `workout_sets` row fires `handle_workout_set_change()` → `recalc_personal_record()`, which recomputes the best estimated-1RM set for that user+exercise and upserts/deletes the PR row. `execute` on those functions is revoked from `anon`/`authenticated`. **Clients (web and iOS) must never write to `personal_records` directly** — log/edit/delete sets and let the trigger derive the PR. Similarly, `workout_sets.user_id` is set by a `before insert/update` trigger from the parent workout, not by client code, so RLS can check it as a plain column instead of a join.

### State management (web)
- Server state (workouts, exercises, profile, PRs, measurements) — TanStack Query hooks in `src/lib/hooks/use-*.ts`.
- Active in-progress workout — a Zustand store with `persist` middleware (`src/lib/store/active-workout.ts`), so a refresh or locked phone doesn't lose the session. Elapsed/rest timers are derived from stored timestamps (`startedAt`, `restEndsAt`), not interval ticks, so they stay correct across tab throttling/reloads.
- Weight unit (kg/lbs) is a client-only display preference (`localStorage` on web, not synced through the profile) via `useWeightUnit`/`toKg`/`fromKg`/`formatKg` in `src/lib/hooks/use-weight-unit.ts`. The database always stores `weight_kg`; conversion happens only at the display layer. iOS mirrors this with `UserDefaults` rather than sharing the hook.

### Design system — "Blueprint"
Both web and iOS implement the same dark, engineering-drawing-styled design language: ink-blue near-black surfaces, hairline strokes, IBM Plex Mono for stats/annotations, Inter for UI text, dimension-line/grid backgrounds, and red "revision stamp" styling for PRs and destructive actions. Sheets are numbered/labeled like drawing plates (`FIG. n`, `Sht 0n`) in the UI copy itself.
- Web tokens: `@theme` block in `apps/web/src/app/globals.css` (`--color-ink`, `--color-sheet`, `--color-line`, `--color-redline`, etc.).
- iOS tokens: `apps/ios/FitTrack/Theme/Colors.swift` (`bpInk`, `bpSheet`, `bpLine`, `bpRedline`, ...), `Typography.swift`, `Components.swift` — same palette, mirrored names.
- `globals.css` also defines a block of **legacy color aliases** (`--color-void`, `--color-amber`, `--color-border`, etc.) that point at the new blueprint tokens, so pages not yet migrated to the blueprint look still render with the right palette. These are meant to be deleted once every page uses the new token names directly — don't build new features on the legacy alias names.

### Muscle map
Both clients render an anatomical muscle activity map using path data adapted from MuscleMapJS (MIT): silhouette outline pass + diagonal-hatch fill pass for active muscle groups. Web: `apps/web/src/components/body/muscle-map{,-paths}.tsx/ts`. iOS: `apps/ios/FitTrack/Views/Body/MuscleMapView.swift` / `MuscleMapPaths.swift`. The two implementations are independently maintained (separate path data, no shared generator), so a change to muscle regions on one platform doesn't automatically apply to the other.
