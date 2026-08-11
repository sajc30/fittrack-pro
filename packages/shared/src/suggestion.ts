// Where to start on a movement you've never logged.
//
// Deliberately conservative and deliberately not a single number. The output
// leads with the user's own comparable lifts and offers a range underneath —
// being wrong here costs a failed rep under a loaded bar, so the design goal is
// "obviously an estimate", not "confident answer".
//
// The Swift port in apps/ios/FitTrack/Services/StartingPoint.swift must stay
// behaviourally identical — iOS cannot import this package.

import { estimateOneRepMax } from "./calculations";

/** An exercise the user has actually trained, with their best working set on it. */
export interface CandidateLift {
  exerciseId: string;
  name: string;
  equipment: string;
  /** Null when the rule-based seed couldn't classify it. */
  movementPattern: string | null;
  muscleGroup: string;
  weightKg: number;
  reps: number;
}

export interface TargetExercise {
  equipment: string;
  movementPattern: string | null;
  muscleGroup: string;
}

/**
 * How the comparables were chosen. Narrower is more trustworthy, and the UI
 * says which one it used rather than presenting every estimate alike.
 */
export type SuggestionBasis =
  /** Same movement pattern and same equipment — the closest neighbours available. */
  | "same_equipment"
  /** Same movement pattern, different equipment. Load transfers loosely at best. */
  | "same_pattern"
  /** Pattern unknown or unmatched, so muscle group had to do. Roughest of the three. */
  | "muscle_group"
  /** Nothing comparable on file. */
  | "none";

export interface StartingPoint {
  basis: SuggestionBasis;
  /** The lifts the estimate came from, heaviest first. Shown to the user. */
  comparables: CandidateLift[];
  /** Null whenever basis is "none" — an empty state beats an invented number. */
  rangeKg: { low: number; high: number } | null;
}

/**
 * Discount applied to the comparable load. A new movement is unpracticed even
 * when the muscles are trained, and the cost of starting light is one easy set.
 */
const DISCOUNT: Record<Exclude<SuggestionBasis, "none">, number> = {
  same_equipment: 0.85,
  same_pattern: 0.7,
  muscle_group: 0.7,
};

/** A standard olympic bar. Nothing lighter is loadable on a barbell movement. */
const BAR_KG = 20;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Patterns too broad to say anything about load. `isolation` covers calf raises
 * and lateral raises alike, and `core`/`cardio` are categories rather than
 * movements — for these, muscle group is the better neighbour, so they're
 * treated the same as an unclassified exercise.
 */
const VAGUE_PATTERNS = new Set(["isolation", "core", "cardio"]);

const usePattern = (pattern: string | null): pattern is string =>
  pattern !== null && !VAGUE_PATTERNS.has(pattern);

/**
 * Pick the neighbours to reason from, narrowest pool first.
 *
 * Movement pattern beats muscle group because the pattern is what determines
 * load: barbell bench press and cable flyes are both `chest`, and differ by
 * 3–4× in working weight.
 */
function selectNeighbours(
  target: TargetExercise,
  candidates: CandidateLift[]
): { basis: SuggestionBasis; pool: CandidateLift[] } {
  const byPattern = usePattern(target.movementPattern)
    ? candidates.filter((c) => c.movementPattern === target.movementPattern)
    : [];

  const pool = byPattern.length
    ? byPattern
    : candidates.filter((c) => c.muscleGroup === target.muscleGroup);
  if (!pool.length) return { basis: "none", pool: [] };

  // Same equipment within the pattern is the closest comparison there is —
  // a machine press and a barbell press are the same movement at very
  // different loads.
  const sameEquipment = pool.filter((c) => c.equipment === target.equipment);
  if (byPattern.length && sameEquipment.length) {
    return { basis: "same_equipment", pool: sameEquipment };
  }
  return { basis: byPattern.length ? "same_pattern" : "muscle_group", pool };
}

/**
 * A starting range for `target`, drawn from what this user already lifts.
 *
 * `repMax` is the top of the working rep range: the estimate targets the load
 * they could carry for that many reps, so the first set errs light and there's
 * somewhere to go rather than a grind on rep three.
 */
export function suggestStartingWeight(
  target: TargetExercise,
  candidates: CandidateLift[],
  repMax = 10
): StartingPoint {
  const usable = candidates.filter((c) => c.weightKg > 0 && c.reps > 0);
  const { basis, pool } = selectNeighbours(target, usable);
  if (basis === "none") return { basis, comparables: [], rangeKg: null };

  const comparables = [...pool].sort(
    (a, b) => estimateOneRepMax(b.weightKg, b.reps) - estimateOneRepMax(a.weightKg, a.reps)
  );

  // Median rather than mean: one outlier lift shouldn't drag the estimate.
  const base = median(pool.map((c) => estimateOneRepMax(c.weightKg, c.reps)));
  // Epley, inverted — the load that supports `repMax` reps.
  const atRepMax = base / (1 + repMax / 30);
  const high = atRepMax * DISCOUNT[basis];
  const low = high * 0.85;

  // A barbell suggestion under the weight of the bar is unloadable, and reads
  // as the tool not knowing what a barbell is. Floor it at the empty bar.
  if (target.equipment === "barbell" && low < BAR_KG) {
    return { basis, comparables, rangeKg: { low: BAR_KG, high: Math.max(high, BAR_KG) } };
  }

  return { basis, comparables, rangeKg: { low, high } };
}
