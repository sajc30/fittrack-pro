"use client";

import { useMemo } from "react";
import {
  suggestStartingWeight,
  type CandidateLift,
  type StartingPoint,
} from "@fittrack/shared";
import { useExerciseCatalog } from "./use-exercises";
import { useWorkouts } from "./use-workouts";
import { useProfile } from "./use-profile";

interface SetRow {
  exercise_id: string;
  weight_kg: number | null;
  reps: number | null;
  parent_set_id: string | null;
}

/**
 * Where to start on an exercise with no history, drawn from comparable lifts
 * the user already does.
 *
 * Reads entirely through the workout and catalog caches — both are already
 * populated by the time an active session is on screen, so this costs no
 * network. Returns null once the exercise has any history of its own, since
 * the last-performance card is the better answer then.
 */
export function useStartingPoint(exerciseId: string | null): StartingPoint | null {
  const { data: workouts } = useWorkouts();
  const { data: catalog } = useExerciseCatalog();
  const { data: profile } = useProfile();

  const repMax = profile?.target_rep_max ?? 10;

  return useMemo(() => {
    if (!exerciseId || !workouts || !catalog) return null;

    const target = catalog.find((e) => e.id === exerciseId);
    if (!target) return null;

    // Best working set per exercise, by estimated 1RM. Drops are excluded —
    // a drop is a deliberately reduced load and would understate the lift.
    const best = new Map<string, { weightKg: number; reps: number }>();
    for (const w of workouts) {
      for (const row of (w.workout_sets ?? []) as SetRow[]) {
        if (row.parent_set_id != null) continue;
        if (!row.weight_kg || !row.reps) continue;
        const current = best.get(row.exercise_id);
        const score = row.weight_kg * (1 + row.reps / 30);
        if (!current || score > current.weightKg * (1 + current.reps / 30)) {
          best.set(row.exercise_id, { weightKg: row.weight_kg, reps: row.reps });
        }
      }
    }

    // Already trained — the last-performance card owns this case.
    if (best.has(exerciseId)) return null;

    const candidates: CandidateLift[] = [];
    for (const [id, set] of best) {
      const ex = catalog.find((e) => e.id === id);
      if (!ex) continue;
      candidates.push({
        exerciseId: id,
        name: ex.name,
        equipment: ex.equipment,
        movementPattern: ex.movement_pattern,
        muscleGroup: ex.muscle_group,
        ...set,
      });
    }

    return suggestStartingWeight(
      {
        equipment: target.equipment,
        movementPattern: target.movement_pattern,
        muscleGroup: target.muscle_group,
      },
      candidates,
      repMax
    );
  }, [exerciseId, workouts, catalog, repMax]);
}
