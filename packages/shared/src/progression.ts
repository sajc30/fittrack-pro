// Double progression, encoded.
//
// The model: hold a load until every working set clears the top of your rep
// range, then add weight and let the reps fall back. This file turns logged
// sets into "what should I do next" for one exercise.
//
// The Swift port in apps/ios/FitTrack/Services/Progression.swift must stay
// behaviourally identical — iOS cannot import this package.

/** One logged working set. Dropsets are excluded upstream (parent_set_id null). */
export interface ProgressionSet {
  weightKg: number | null;
  reps: number | null;
  /** Workout start, ISO. Sets sharing this belong to the same session. */
  performedAt: string;
}

export interface RepRange {
  min: number;
  max: number;
  /** True when derived from this exercise's own history rather than the default. */
  inferred: boolean;
}

export type Readiness =
  /** Every working set cleared the top of the range — add weight. */
  | "add_load"
  /** Reps fell below the range — hold the load and build reps back up. */
  | "build_reps"
  /** Inside the range — keep the load, keep pushing reps. */
  | "keep_going"
  /** Not enough logged history to say anything honest. */
  | "unknown";

export interface Assessment {
  readiness: Readiness;
  range: RepRange;
  /** Heaviest working load of the most recent session. */
  lastWeightKg: number | null;
  /** Lowest rep count of that session — the set that decides the verdict. */
  lowestReps: number | null;
  /**
   * Next load up, taken from weights this user has actually used on this
   * exercise. Null when there's no basis to guess.
   */
  suggestedWeightKg: number | null;
}

/** Sessions newest-first, each an array of that session's sets. */
export function groupSessions(sets: ProgressionSet[]): ProgressionSet[][] {
  const byDate = new Map<string, ProgressionSet[]>();
  for (const s of sets) {
    const bucket = byDate.get(s.performedAt);
    if (bucket) bucket.push(s);
    else byDate.set(s.performedAt, [s]);
  }
  return [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, v]) => v);
}

/**
 * The sets performed at the heaviest load of their session — the working sets.
 *
 * Everything lighter is a back-off set. Real logs are rarely straight sets:
 * `160×6, 160×6, 155×9` is one hard double and a lighter third, not three sets
 * that "failed" at 6. Back-off sets are volume, and volume is a different
 * question from whether the load is ready to go up.
 *
 * Unweighted work (bodyweight, cardio) has no top load, so every set counts.
 */
function workingSets(session: ProgressionSet[]): ProgressionSet[] {
  const withReps = session.filter((s) => s.reps != null && s.reps > 0);
  const weighted = withReps.filter((s) => s.weightKg != null);
  if (weighted.length === 0) return withReps;

  const top = Math.max(...weighted.map((s) => s.weightKg!));
  return weighted.filter((s) => s.weightKg! >= top - 1e-9);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * The rep range this exercise is actually trained in.
 *
 * Only recentres when the median sits *outside* the user's default range, so a
 * heavy squat at 5 reps gets 4–6 while machine work stays on 8–10.
 *
 * That guard is load-bearing, not a tidy-up. Recentring unconditionally moves
 * the goalposts with the athlete: someone reliably hitting 10 on a default 8–10
 * has a median of 10, which would infer 9–11 and demand 11 reps before ever
 * saying "add load" — the feature would go quiet for exactly the person it
 * exists to serve. Inference is for spotting an exercise trained differently,
 * not for re-deriving a target the user already told us.
 *
 * Needs 3+ sessions first: two noisy early sessions shouldn't lock in a target.
 */
export function inferRepRange(sets: ProgressionSet[], fallback: RepRange): RepRange {
  const sessions = groupSessions(sets);
  if (sessions.length < 3) return { ...fallback, inferred: false };

  // Working sets only. Back-off sets carry higher reps by design, and pooling
  // them drags the median up — which would raise the bar for "add load" for
  // exactly the same reason the unguarded inference did.
  const reps = sessions.flatMap((session) => workingSets(session).map((s) => s.reps!));
  if (reps.length === 0) return { ...fallback, inferred: false };

  const centre = Math.round(median(reps));
  if (centre >= fallback.min && centre <= fallback.max) {
    return { ...fallback, inferred: false };
  }

  const width = Math.max(0, fallback.max - fallback.min);
  const min = Math.max(1, centre - Math.floor(width / 2));
  return { min, max: min + width, inferred: true };
}

/**
 * The next load up, drawn from this user's own history on this exercise.
 *
 * Avoids hardcoding "+5 lb", which is wrong for most equipment. A machine stack
 * that jumps 65 → 80 suggests 80; a dumbbell rack suggests the next dumbbell.
 * At the top of their ladder, repeat the smallest jump they've actually made.
 * One weight ever logged gives no basis to guess, so return null.
 */
export function nextWeightUp(allWeightsKg: number[], currentKg: number): number | null {
  const ladder = [...new Set(allWeightsKg.filter((w) => w > 0))].sort((a, b) => a - b);
  if (ladder.length < 2) return null;

  const heavier = ladder.find((w) => w > currentKg + 1e-9);
  if (heavier != null) return heavier;

  // Already at or above their heaviest — reuse their smallest real increment.
  let smallestStep = Infinity;
  for (let i = 1; i < ladder.length; i++) {
    const step = ladder[i] - ladder[i - 1];
    if (step > 1e-9) smallestStep = Math.min(smallestStep, step);
  }
  return Number.isFinite(smallestStep) ? currentKg + smallestStep : null;
}

/**
 * What to do next on this exercise.
 *
 * Judged on the working sets of the last session — those at its heaviest load —
 * and on the *worst* of them, since one strong opener doesn't mean the load is
 * ready to go up. A lighter back-off set never counts against you.
 */
export function assessExercise(sets: ProgressionSet[], fallback: RepRange): Assessment {
  const range = inferRepRange(sets, fallback);
  const sessions = groupSessions(sets);
  const working = workingSets(sessions[0] ?? []);

  if (working.length === 0) {
    return { readiness: "unknown", range, lastWeightKg: null, lowestReps: null, suggestedWeightKg: null };
  }

  const lowestReps = Math.min(...working.map((s) => s.reps!));
  const lastWeightKg = working[0].weightKg ?? null; // all working sets share the top load

  const readiness: Readiness =
    lowestReps >= range.max ? "add_load" : lowestReps < range.min ? "build_reps" : "keep_going";

  const suggestedWeightKg =
    readiness === "add_load" && lastWeightKg != null
      ? nextWeightUp(
          sets.map((s) => s.weightKg).filter((w): w is number => w != null),
          lastWeightKg
        )
      : null;

  return { readiness, range, lastWeightKg, lowestReps, suggestedWeightKg };
}
