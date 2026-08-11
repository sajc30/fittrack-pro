# FitTrack Pro — Feature Plan, August 2026

Nine ideas, worked through to a recommended solution for each. Nothing is implemented yet.

**Status: decisions locked (see §13). Ready to implement on approval.**

Scope: every item lands on **both** `apps/web` and `apps/ios`. `apps/mobile` (Expo) stays frozen.

---

## 0. Summary table

| # | Idea | Verdict | Effort | Notes |
|---|------|---------|--------|-------|
| 1 | Last-time weight suggestion | **Build — suggestion, not autofill** | M | Your instinct on suggestion-over-autofill is right; see §3 |
| 2 | Cache exercise selection | **Web: already works. iOS: real bug** | S | Zustand `persist` already covers web |
| 3 | Chart node tooltips | **Web: already works. iOS: build** | S | Web has crosshair + tooltip; iOS chart has none |
| 4 | Supersets & dropsets | **Build — but land the schema early** | L | Changes what "a set" means everywhere |
| 5 | Analytics improvements | **Build a focused subset** | M–L | 5 recommended, 6 rejected; see §7 |
| 6 | Notes | **Build — two tiers** | M | Standing note + session note |
| 7 | Recent exercises in picker | **Build — highest value/effort ratio** | S | Free once §1's data layer exists |
| 8 | Suggested weight for a new exercise | **Build last, scoped down** | S–M | Show comparable lifts, not a single number. `movement_pattern` lands in Phase 0 |
| 9 | Autocorrect in exercise search | **Build — client-side** | M | 743-row catalog; no DB extension needed |

**Three of the nine are partly built already** (2, 3, and the DB half of 4 and 6). Worth knowing
before estimating.

---

## 1. Cross-cutting fix (do this first)

### The e1RM formula is inconsistent across the three places it lives

| Where | Formula | Value for 100 kg × 10 |
|---|---|---|
| `packages/shared/src/calculations.ts:60` | Epley `w × (1 + reps/30)` | 133 |
| `supabase/migrations/002_pr_integrity.sql:60` | Epley, rounded to int kg | 133 |
| `apps/ios/.../ProgressView.swift:305` — named `epley1RM` | **Brzycki** `w / (1.0278 − 0.0278·reps)` | 133.4 |

They agree near 10 reps and diverge at the edges (~4% at 5 reps, ~9% at 15). The practical
symptom: the iOS strength chart plots one number while the PR stamp on the same screen comes
from a different one.

**Fix:** change `epley1RM` in `ProgressView.swift` to match shared/DB, and rename it honestly.
Small change, but ideas 1, 5 and 8 all key off e1RM, so it should land before them.

Also worth noting: the DB rounds e1RM to whole kg before storing. In lbs that's a ±1 lb wobble
on the PR display. Recommend widening `personal_records.estimated_one_rep_max` handling to
`round(…, 2)` in the trigger at the same time. Low risk — the trigger recomputes everything on
any set change anyway.

---

## 2. Foundation layer

Ideas 1, 5, 7 and 8 all need the same thing: *"what did this user last do on this exercise, and
what's their best?"* Building that once is the difference between a clean implementation and
four overlapping queries.

### Migration `004_training_context.sql`

```sql
-- ── Per user+exercise training context ───────────────────────────────────────
-- Powers last-time suggestions, recent-exercise lists, and progression hints.
-- Only completed sessions count, so an in-progress workout never shadows the
-- previous one as "last time".

create or replace view exercise_last_performance
with (security_invoker = true) as
with last_session as (
  select distinct on (ws.user_id, ws.exercise_id)
         ws.user_id, ws.exercise_id, ws.workout_id, w.started_at
    from workout_sets ws
    join workouts w on w.id = ws.workout_id
   where w.finished_at is not null
   order by ws.user_id, ws.exercise_id, w.started_at desc
)
select ls.user_id,
       ls.exercise_id,
       ls.workout_id as last_workout_id,
       ls.started_at as last_performed_at,
       (select jsonb_agg(
                 jsonb_build_object('set_number', s.set_number,
                                    'weight_kg',  s.weight_kg,
                                    'reps',       s.reps,
                                    'set_type',   s.set_type)
                 order by s.set_number)
          from workout_sets s
         where s.workout_id  = ls.workout_id
           and s.exercise_id = ls.exercise_id
           and s.parent_set_id is null) as last_sets
  from last_session ls;
```

`security_invoker = true` (PG15+; we're on 17) means RLS on `workout_sets` applies to the caller
— no `security definer` hole. The existing `workout_sets (user_id, exercise_id)` index from
migration 002 serves it.

Migration 004 also carries three things the locked decisions pulled forward:

```sql
-- Superset / dropset structure (UI lands in Phase 4, schema lands now — see §6)
alter table workout_sets
  add column parent_set_id  uuid references workout_sets(id) on delete cascade,
  add column superset_group smallint;
create index on workout_sets (parent_set_id);

-- Movement pattern — better neighbours than muscle_group for §10, and it
-- independently enables push/pull/legs balance analytics in §7.
create type movement_pattern as enum (
  'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull',
  'squat', 'hinge', 'lunge', 'carry', 'isolation', 'core', 'cardio'
);
alter table exercises add column movement_pattern movement_pattern;  -- nullable on purpose
create index on exercises (movement_pattern);

-- Target rep range fallback (§7); per-exercise ranges are inferred, not stored
alter table profiles
  add column target_rep_min int not null default 8,
  add column target_rep_max int not null default 10;
```

**`movement_pattern` stays nullable deliberately.** It gets seeded by rule from name +
`muscle_group` + `equipment` across the 743-row catalog, and rule-based classification will
miss some. An unclassified exercise should read as *unknown* and fall back to `muscle_group`
matching — never as a confident wrong guess, since §10 makes load suggestions off the back of
it. Custom exercises created by users start null too, unless we ask at creation time.

**Scale note:** at 374 sets this is instant. `distinct on` across the whole table gets slower as
the log grows; if it ever matters, convert to an RPC with an explicit `auth.uid()` filter. Not
worth pre-optimising.

### Client data layer

- **Web** — `apps/web/src/lib/hooks/use-exercise-context.ts`:
  - `useLastPerformance(exerciseId)` — one exercise, for the active session.
  - `useRecentExercises(limit)` — unfiltered view read, ordered by `last_performed_at`. Powers §7.
- **iOS** — `WorkoutViewModel.loadExerciseContext()`, caching `[UUID: ExerciseContext]`.

---

## 3. Idea 1 — Last-time weight suggestion

> *"…default to the best weight they did last… OR this can be like a suggestion… because
> sometimes injuries and stuff can happen which can cause regressions."*

### Options considered

| Option | Verdict |
|---|---|
| **A.** Silently prefill weight+reps from last session | ✗ Rejected — a prefilled field reads as "this is what you're doing." After an injury layoff that's actively wrong, and the user has to clear a number they never entered. |
| **B.** Suggestion card only, no fill | ~ Safe, but you retype the same number every set. Loses the ease-of-life win. |
| **C.** Suggestion card + one-tap apply | ✓ **LOCKED.** Nothing enters the field until you tap. Fast path preserved, no assumption made. |
| **D.** Prefill with an obvious "undo" | ✗ Same failure as A with an extra step bolted on. |

### Recommended design

When an exercise is selected in the active session, a card appears above the set rows:

```
LAST — 3 AUG                                 BEST — 70 LB × 8 · 12 JUL
  1   65 LB × 10   ⤵          ← tap to load the WEIGHT into the next open set
  2   65 LB × 9    ⤵
  3   60 LB × 8    ⤵
```

**Weight only — never reps.** Reps are what the session is there to find out; carrying them
over presumes the answer and works against the double-progression model in §7, where you hold
the load and push reps until you clear the range. Last session's reps stay visible on the card
as information, but only the load ever reaches an input.

Empty state (first time doing an exercise) hands off to idea 8.

### Cut: the "+5 vs last" delta

Built, verified, then removed. A live delta under the load input read `+5 vs last` / `−7.5 vs
last` as you typed.

Two reasons it went:
- **A bare number implies exercises are comparable.** +5 lb on a cable lateral raise and +5 lb
  on a squat are not the same event; one shared format asserts they are.
- **Its reference point has no universally right answer** — last session's top set, or the
  matching set number? Those disagree whenever load drops within a session, and neither is
  correct for every exercise or every lifter.

The card already shows exactly what you did last time. Subtracting it for you added a number
without adding information.

### Where it changes

- Web: `components/workouts/active-workout-view.tsx` (new `LastPerformanceCard`),
  `lib/hooks/use-exercise-context.ts`
- iOS: `Views/Workouts/ActiveWorkoutView.swift`, `ViewModels/WorkoutViewModel.swift`

### Interaction with existing behaviour

`active-workout.ts:89` already carries weight+reps forward from the previous set *within* a
session. That stays — it's a different mechanism (intra-session) and it works well. The new card
is strictly about the *previous* session.

---

## 4. Idea 2 — Cache the exercise selection

> *"…if possible do it if not it's whatever"*

Cheaper than you'd expect, because half of it exists.

**Web — already works.** `lib/store/active-workout.ts` is a Zustand store with `persist`
middleware writing to `localStorage` under `fittrack-active-workout`. `addExercise` pushes the
exercise with one empty set, and that survives navigation *and* a full page reload. Worth a
manual confirm, but no code needed.

**iOS — genuinely broken.** `ActiveWorkoutView.swift:8` holds `selectedExercise` as `@State`,
and the exercise list on screen is derived from `workout.activeSets` — i.e. from rows that are
already in the database. An exercise you picked but haven't logged a set for exists nowhere but
that one `@State` var, and `ActiveWorkoutView` is presented as a `.sheet`, so dismissing it
destroys the state. Pick "Machine Chest Press", swipe down to check something, come back: gone.

**Fix:** hoist selection into `WorkoutViewModel` (which lives at app scope via `@Environment`),
and persist it to `UserDefaults` keyed by the active workout id so it also survives an app
relaunch. This mirrors how the weight-unit preference is already handled on iOS.

Deliberately *not* recommending: replicating web's full multi-exercise tab bar on iOS. That's a
larger redesign of the iOS session screen and it isn't what this idea asked for.

---

## 5. Idea 3 — Chart node tooltips

**Web — already built.** `components/charts/progress-charts.tsx:51` has `StrengthTooltip`
showing e1RM, the actual `weight × reps`, the date, and a PR marker, with a full-bleed crosshair
(`CrosshairDot`, line 30). Try it before spending anything here.

**iOS — missing.** `E1rmChartContent` (`ProgressView.swift:311`) is a bare `Chart` with
`LineMark` + `PointMark` and no selection handling.

**Fix:** iOS 17 (our deployment target) ships `.chartXSelection(value:)`. That gives a native
drag-to-scrub with no gesture plumbing:

```swift
@State private var selectedDate: Date?
Chart(data, id: \.date) { … }
    .chartXSelection(value: $selectedDate)
```

Render the callout as a blueprint-styled `RuleMark` + annotation matching the web tooltip's
content, so the two platforms read the same.

### The extra ask — "last weight used on that exercise"

> *"…maybe add what the last weight used on that exercise was as well"*

The strength card already has a `TOTAL SETS / TOTAL REPS / BEST SET` stat row (web
`progress-charts.tsx:437`, iOS `ProgressView.swift:128`). Add a fourth cell: **`LAST SESSION`** —
`65 LB × 10 · 3 AUG`. Free, since the foundation view (§2) already returns it.

---

## 6. Idea 4 — Supersets & dropsets

The biggest surface area of the nine, and the one with a **sequencing constraint**: it changes
what counts as "a set", which every analytics number in idea 5 is built on. Land the schema
before building new charts, or you'll write those aggregations twice.

### What already exists

`set_type` is already an enum with `'normal' | 'warmup' | 'dropset' | 'failure' | 'superset'`
(`001_initial_schema.sql:33`). But it's written as a hardcoded `"normal"` everywhere
(`use-workouts.ts:180`) and nothing reads it.

More importantly, **the enum models supersets wrong.** A superset isn't a property of one set —
it's a *grouping across exercises*. A dropset isn't one set either — it's a chain of mini-sets at
descending load. Neither fits in a single-value column.

### Recommended schema (part of migration 004)

```sql
alter table workout_sets
  add column parent_set_id  uuid references workout_sets(id) on delete cascade,
  add column superset_group smallint;

create index on workout_sets (parent_set_id);
```

- **Dropset** — the top set is a normal row. Each drop is its own row with
  `parent_set_id` → the top set and `set_type = 'dropset'`, inheriting the parent's `set_number`
  and ordered by `logged_at`. Displayed as `100 × 8 ⤷ 80 × 6 ⤷ 60 × 5`.
- **Superset** — sets sharing `(workout_id, superset_group)` are one superset. Labelled A1/B1,
  A2/B2 in the UI. The *plan* (which exercises are paired, before anything is logged) lives in
  the web Zustand store / iOS view model, same as the exercise list does.

### Why rows-not-JSON for dropsets

The alternative — one row with a JSON array of drops — breaks every existing aggregation:
volume, the PR trigger, the strength chart, weekly set counts. Keeping each drop as a real row
means **the PR trigger needs no changes at all** (`recalc_personal_record` just sees more rows,
and a lighter drop legitimately can't beat the top set's e1RM unless it genuinely is better).

### Counting — LOCKED

A dropset of 3 drops counts as **1 working set + full volume**. Set-count charts filter on
`parent_set_id is null`; volume/tonnage sums every row.

Rationale (yours, and it's the right one): a dropset is a way of squeezing more out of the set
you're already doing, not a way of doing four sets. Counting it as four would inflate weekly
set totals and make the 10–20 sets/week reference band in §7 meaningless.

Supersets count each exercise separately — a superset of A and B for 3 rounds is 3 sets of A
plus 3 sets of B. Conventional reading, and it keeps per-muscle-group totals honest.

**Consequence to expect:** existing weekly set-count charts keep their current numbers, since
every set logged to date has `parent_set_id is null`. Volume charts are new, so there's no
before/after to reconcile.

---

## 7. Idea 5 — Analytics improvements

> *"…have AI do some looking into the analytics selection of the app and see if I can potentially
> improve it"*

Current state: three figures — strength e1RM line, 12-week set count bars, sets by muscle group
for one calendar week.

The gap: **everything is measured in set counts, which ignores load entirely.** Three sets of
95 lb and three sets of 135 lb are the same bar. That's the single biggest analytical blind spot.

### Recommended (in priority order)

**A. Volume / tonnage over time** — `Σ(weight × reps)` per week, alongside the existing set-count
bars. This is the number that actually reflects whether you're doing more work. Cheap: same data
the set chart already loads.

**B. "Ready to progress" list** — the most valuable thing here, and it's really *your own
training model turned into a feature*. You described double progression:

> *"increase weight until a certain amount of reps is hit (for me like 8-10) and then increase
> the weight again"*

So encode it. For each exercise, given a target rep range (default 8–10, per-exercise
overridable):

- All working sets at or above the top of the range last session → **"ready to add load"**
- Below the bottom of the range → **"hold load, build reps"**
- In range → **"keep going"**

This single feature subsumes the useful half of ideas 1 and 8, and it turns the app from a
logbook into something that answers *what should I do today*.

**How much to add:** don't hardcode +5 lb. Read the distinct weights the user has actually used
on that exercise and suggest the next one up from their own history. A machine stack that jumps
65 → 80 gets a 15 lb suggestion; a dumbbell rack gets 5. Self-calibrating, no equipment
database, no curation. This is the neatest trick in the whole plan.

**C. Rep-range distribution** — a small histogram per exercise showing where your reps actually
land vs. your 8–10 target. Directly answers "am I training the way I think I am."

**D. Per-muscle-group weekly volume with a target band** — upgrade FIG. 3 from a raw count to a
count against a shaded 10–20 sets/week reference band (the commonly cited hypertrophy range),
so under/over-training reads at a glance. Pair with the existing muscle map on the Body page,
tinted by weekly volume rather than binary active/inactive.

**E. Session summary card** — on finishing a workout: duration, total volume, set count, PRs hit,
muscle groups worked. High perceived value, near-zero new data.

### Considered and rejected

- **Consistency/streak heatmap** — `useStreak()` already covers this; a calendar grid is decoration.
- **Fatigue / recovery scoring** — needs RPE, sleep, or HRV data we don't collect. Anything we
  computed would be invented.
- **1RM regression trendlines with projections** — projecting future strength from a handful of
  noisy points produces confident-looking nonsense.
- **Estimated bodyfat from measurements** — the Body page has circumference data, but
  Navy-method estimates carry error bars wide enough to be misleading.
- **Muscle-group "balance score"** — collapses to a single number that hides more than it shows.
- **Social/percentile comparison** — 3 users in the database.

### Target rep range — LOCKED: global default + inferred per exercise

A single global range can't govern every lift. 8–10 is right for machine chest press and wrong
for deadlifts, where 10 reps is already a high-rep day rather than a signal to add load.

**The rule:**

1. `profiles.target_rep_min` / `target_rep_max` (default 8–10) is the fallback.
2. Once an exercise has **3+ completed sessions**, its range is inferred from the median rep
   count actually performed on it. Always doing 4–6 on squats means squats get 4–6, with no
   configuration.
3. An explicit per-exercise override stays available for pinning something deliberately —
   but nothing has to be configured for the feature to work correctly.

No per-exercise UI to maintain, and no new table: the inference is pure computation over data
the progression card already loads.

**On the circularity concern** — the range is inferred from the reps you did, and then drives
the reps you'll do. It holds up: hitting 10 and adding load pushes you back to 7–8 next session,
so the median stays put. The inferred range describes *how you train that lift*; progression
moves you within it.

The 3-session floor exists so two noisy early sessions can't lock in a bad range.

This is strictly an upgrade over a global-only setting rather than an alternative to it — the
profile default is still the fallback, so nothing is wasted if manual control is wanted later.

---

## 8. Idea 6 — Notes

> *"…for users to add special notes about an exercise they just did like if they felt something
> was off and wanted to note it for a future workout. this can be workshopped."*

Workshopping it: the quoted use case is actually **two different needs** that look alike.

1. *"My left shoulder felt off on incline press today"* — a **dated observation**, tied to one
   session. Value comes from being able to look back.
2. *"Seat at notch 4. Go slow on the eccentric."* — a **standing note** about the exercise
   itself. Value comes from it appearing every single time you select that exercise.

Conflating them gives you either a journal you never re-read, or a sticky note that gets buried.

### What exists

- `workouts.notes` — column exists, accepted by `useCreateWorkout`/`useUpdateWorkout`, but there
  is **no UI to write or read it**. Free session-note tier.
- `workout_sets.notes` — column exists, entirely unused.

### Recommended: two tiers

**Tier 1 — session note.** Use the existing `workouts.notes`. A text field on the session
close-out screen and on the history detail view. Zero schema change.

**Tier 2 — exercise notes.** New table:

```sql
create table exercise_notes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  workout_id  uuid references workouts(id) on delete cascade,  -- null = standing note
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- exactly one standing note per exercise
create unique index on exercise_notes (user_id, exercise_id) where workout_id is null;
create unique index on exercise_notes (user_id, exercise_id, workout_id) where workout_id is not null;
create index on exercise_notes (user_id, exercise_id, created_at desc);
```

`workout_id is null` **is** the standing note — no extra `pinned` flag needed.

### Where notes surface

| Surface | Shows |
|---|---|
| Exercise picker | 📝 badge if a standing note exists |
| Active session | Standing note inline under the exercise name; "add note" per exercise |
| Workout history detail | That session's notes, per exercise + the session note |
| Exercise library page | Standing note + full dated history for that exercise |
| Progress chart | Small tick on dates that have a note — click to read |

That last one is the payoff: a dip in the strength line with *"shoulder felt off"* attached
explains itself six weeks later.

**Skipping:** per-*set* notes (`workout_sets.notes`). Too granular to be worth the UI weight —
revisit only if per-exercise notes prove too coarse in practice.

---

## 9. Idea 7 — Recent exercises in the picker

> *"…quickly go back to the old ones that they have done before instead of having to search for
> it again"*

Highest value-to-effort ratio of the nine, and essentially free once §2's view exists.

**Recommended:** add two sections above the search field in the picker, keeping the existing
search/filter/create path completely intact:

```
RECENT                                          Sht 01
[ Machine Chest Press ] [ Lat Pulldown ] [ Incline DB Press ] …

  ↻  REPEAT LAST SESSION — Push A, 3 Aug (5 exercises)
```

- **RECENT** — last ~8 distinct exercises by `last_performed_at`, horizontally scrolling chips
  in the existing blueprint chip style (`exercise-picker.tsx:49`).
- **REPEAT LAST SESSION** — one tap loads every exercise from your previous workout into the
  current one. This is the real time-saver if you run a fixed split; it makes starting a session
  a single tap instead of five searches.

Considered a "FREQUENT" section alongside RECENT — rejected as redundant at this catalog size;
for most users the two lists would be nearly identical.

**Where:** `components/workouts/exercise-picker.tsx` (web),
`ActiveWorkoutView.swift` → `ExercisePickerSheet` (iOS).

---

## 10. Idea 8 — Suggested weight for a new exercise

> *"…referencing how other weights for similar exercises are and recommend a weight based on
> that"*

The most speculative of the nine, and the one where being wrong has a physical cost. Scoping it
down accordingly, and building it **last**.

### Options considered

| Option | Verdict |
|---|---|
| **A.** Curated exercise-to-exercise ratio table (incline DB ≈ 0.8 × flat DB, etc.) | ✗ Accurate but needs hundreds of hand-curated pairs across a 743-exercise catalog, and rots as the catalog grows. |
| **B.** Same `muscle_group` + `equipment` nearest neighbour, conservatively scaled | ~ Workable, no curation — but `muscle_group` is a blunt neighbour. Bench press and cable flyes are both `chest` and share almost no load profile. |
| **C.** Population/crowd-sourced averages | ✗ Three users in the database. |
| **D.** Add a `movement_pattern` column (horizontal push, vertical pull, hinge, squat, …), seeded by rule from name + muscle group | ✓ **LOCKED — from the start.** Much better neighbours than raw muscle group, one-time seeding job, and it independently improves the push/pull/legs balance analytics in §7. |

**Why D from day one:** the pattern is what determines the load, not the muscle. Grouping by
`muscle_group` puts barbell bench press and cable flyes in the same bucket despite a 3–4×
difference in working load, which would produce a badly wrong suggestion — the exact failure
mode this feature must not have. `horizontal_push` separates them correctly.

Column and enum land in migration 004 (§2), nullable, seeded by rule. Unclassified exercises
fall back to option B's `muscle_group` matching rather than guessing.

Optional later refinement: per-equipment modifiers within a pattern (machine vs. barbell vs.
dumbbell for the same movement). That's ~8 equipment types × 11 patterns rather than hundreds
of exercise pairs — but it's only worth adding if the comparables display below proves too
vague in practice.

### The framing matters more than the algorithm

A single confident number — *"Try 65 lb"* — invites someone to load a bar they haven't earned on
a movement they've never performed. So don't lead with the number. Lead with **the user's own
comparable lifts**, and let them draw the conclusion:

```
NO HISTORY ON FILE — MACHINE CHEST PRESS          HORIZONTAL PUSH

Your comparable horizontal pushing movements:
  Dumbbell Bench Press      70 LB × 8      (working)
  Barbell Bench Press      155 LB × 8      (working)

  Suggested starting point:  ~55–65 LB
  Estimate only. Start at the low end and add load once you clear 10 reps.
```

Comparables are drawn from the same `movement_pattern`, falling back to `muscle_group` when the
pattern is unclassified.

Estimate targets the **top** of the rep range (10), not the bottom, so the first working set errs
light. Warm-up ladder suggested alongside.

Empty state (no comparable lifts either) says so plainly rather than inventing a number.

---

## 11. Idea 9 — Autocorrect in exercise search

> *"…for when users miss spell something in the exercise selection section"*

**Current behaviour:** web sends `ilike '%query%'` to Postgres (`use-exercises.ts:34`); iOS uses
`localizedCaseInsensitiveContains` over all exercises already in memory
(`ActiveWorkoutView.swift:357`). Either way, one typo → zero results → dead end.

### Options considered

| Option | Verdict |
|---|---|
| **A.** `pg_trgm` extension + `similarity()` + GIN index, via an RPC | ~ Robust and the extension is available (not currently installed). But: a migration, an RPC, and a network round trip per keystroke, for a catalog that fits in memory. |
| **B.** Client-side fuzzy matching | ✓ **LOCKED.** |
| **C.** Hybrid — server exact, client fuzzy on zero results | ✗ Two code paths, two behaviours to keep in sync, no real benefit over B. |

### Why client-side

The catalog is **743 exercises** (12 of them custom) and near-static. Slimmed to
`id, name, muscle_group, secondary_muscles, equipment` it's roughly 60 KB — fetched once,
cached with a long `staleTime`. **iOS already loads the entire catalog into memory**
(`WorkoutViewModel.loadExercises()`), so it's a pure win there. Zero per-keystroke latency,
works offline, identical behaviour on both platforms.

⚠️ Note for web: `useExercises` currently does `select("*")`, which pulls `instructions` arrays
and image URLs. Fetching all 743 rows that way would be heavy. This needs a **separate slim
catalog query** — not a change to the existing one.

### Matching strategy — ranked cascade

1. Exact match
2. Prefix match on the full name
3. Word-prefix match (`"inc db p"` → *Incline Dumbbell Press*)
4. Alias/synonym hit (see below)
5. Subsequence match
6. Levenshtein distance ≤ 2 on any word

Below a score threshold, show **"Did you mean *Bench Press*?"** rather than an empty list.

### Aliases beat edit distance for real-world typos

Most failed searches aren't typos, they're **vocabulary mismatches**. A small alias map handles
more real cases than any distance metric:

```
bench, bp            → Bench Press
ohp, military        → Overhead Press
rdl                  → Romanian Deadlift
pulldown, lats       → Lat Pulldown
db, dumbell, dumbell → dumbbell
bb                   → barbell
skullcrusher         → Lying Triceps Extension
```

Note the existing `MUSCLE_GROUP_SYNONYMS` map (`progress-charts.tsx:105`, mirrored in
`ProgressView.swift:218`) already does exactly this for *muscle groups* — this extends the same
proven idea to exercise names.

### Where the code lives

Scoring function → `packages/shared/src/search.ts`, with Vitest coverage (shared is the only
package with tests). Web imports it directly. **iOS needs a hand-port to Swift** — per
`CLAUDE.md`, `apps/ios` has no code-sharing mechanism with `packages/shared`. Budget for keeping
the two in sync, and mirror the test cases in Swift.

---

## 12. Recommended sequencing

Ordered by dependency, not by excitement.

**Phase 0 — foundation** *(nothing user-visible)*
- Fix the iOS e1RM formula (§1)
- Migration `004`: `exercise_last_performance` view · `parent_set_id` + `superset_group` columns ·
  `movement_pattern` enum, column and rule-based seed · `profiles` rep-range columns ·
  `exercise_notes` table
- Web hooks + iOS view-model methods for exercise context

Everything schema-shaped lands here even where the UI is phases away, so §7's analytics get
written against the final shape of the data exactly once. The `movement_pattern` seed is the
long pole — 743 rows classified by rule, then spot-checked.

**Phase 1 — the session-quality wins** ← *biggest felt improvement, shipping as one release*
- Idea 7 (recent exercises) · Idea 1 (last-time suggestion) · Idea 2 (iOS selection fix) · Idea 9 (fuzzy search)

Grouped deliberately: all four touch the exercise picker and set-entry screens. Doing them
together means touching `exercise-picker.tsx` and `ActiveWorkoutView.swift` once instead of four
times.

**Phase 2 — notes** (idea 6)

**Phase 3 — analytics** (idea 3 iOS tooltips + idea 5's five recommended charts, including the
inferred rep-range progression logic)

**Phase 4 — supersets & dropsets UI** (idea 4) — schema already landed in Phase 0

**Phase 5 — new-exercise weight suggestion** (idea 8) — smaller than originally scoped now that
`movement_pattern` arrives in Phase 0; mostly a UI surface over data that already exists by then

---

## 13. Decisions — locked

| # | Decision | Outcome |
|---|---|---|
| — | **Idea 1** — suggestion vs. autofill | **Option C** — suggestion card with one-tap apply per set. Nothing enters a field untapped. |
| — | **Idea 9** — fuzzy search | **Client-side.** No `pg_trgm`, no RPC, no per-keystroke round trip. Needs a slim catalog query on web. |
| 1 | **Dropset counting** (§6) | **1 working set + full volume.** A dropset extends the set you're already doing; counting it as four would make the 10–20 sets/week band meaningless. |
| 2 | **Target rep range** (§7) | **Global default + inferred per exercise.** `profiles` default 8–10; each exercise infers its own range from median reps after 3+ sessions. Explicit override available, nothing required. |
| 3 | **Phase 1 grouping** | **Ship all four together.** One release, picker rebuilt once. |
| 4 | **Idea 8 scope** (§10) | **Option D from the start** — `movement_pattern` column in migration 004. Pattern determines load; `muscle_group` would put bench press and cable flyes in one bucket. |
| 5 | **`workout_sets.notes`** (§8) | **Leave unused.** Per-set annotation is too granular to earn its UI weight. |

### Carried assumptions worth re-checking during build

- `movement_pattern` is seeded **by rule** across 743 exercises and will misclassify some. It's
  nullable, and unclassified falls back to `muscle_group` — but the seed deserves a spot-check
  pass over the compound lifts before §10 ships.
- The inferred rep range needs the **3-session floor** honoured, or early noisy data locks in a
  bad target.
- Custom exercises are created with `movement_pattern` null. Worth deciding in Phase 0 whether
  `CreateExerciseForm` / `CreateExerciseSheet` should ask.
