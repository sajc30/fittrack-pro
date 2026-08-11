"use client";

import { useMemo } from "react";
import { assessExercise, type Assessment, type ProgressionSet, type RepRange } from "@fittrack/shared";
import { useWorkouts } from "./use-workouts";
import { useProfile } from "./use-profile";

export interface ExerciseProgress extends Assessment {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  /** Sessions logged for this exercise — below 3 the range is the profile default. */
  sessions: number;
}

interface WorkoutSetRow {
  exercise_id: string;
  reps: number | null;
  weight_kg: number | null;
  parent_set_id: string | null;
  exercises: { id: string; name: string; muscle_group: string } | null;
}

/**
 * Progression verdicts for every exercise with logged history.
 *
 * Reads through `useWorkouts`, which the app already has cached, so this costs
 * no extra request. Only finished sessions count — mid-session logging must not
 * become its own benchmark — and dropset rows are excluded, since a drop is
 * part of the set above it rather than a working set of its own.
 */
export function useProgression() {
  const { data: workouts, isLoading } = useWorkouts();
  const { data: profile } = useProfile();

  // Kept as primitives, with the object built inside the memo: a fresh
  // `fallback` object each render would defeat the memo, and listing its
  // fields as deps makes the compiler's inferred deps disagree with ours.
  const repMin = profile?.target_rep_min ?? 8;
  const repMax = profile?.target_rep_max ?? 10;

  const results = useMemo<ExerciseProgress[]>(() => {
    if (!workouts) return [];
    const fallback: RepRange = { min: repMin, max: repMax, inferred: false };

    const byExercise = new Map<
      string,
      { name: string; muscleGroup: string; sets: ProgressionSet[]; sessions: Set<string> }
    >();

    for (const workout of workouts) {
      if (!workout.finished_at) continue;
      for (const row of (workout.workout_sets ?? []) as WorkoutSetRow[]) {
        if (row.parent_set_id != null) continue;
        const ex = row.exercises;
        if (!ex) continue;

        let entry = byExercise.get(ex.id);
        if (!entry) {
          entry = { name: ex.name, muscleGroup: ex.muscle_group, sets: [], sessions: new Set() };
          byExercise.set(ex.id, entry);
        }
        entry.sets.push({
          weightKg: row.weight_kg,
          reps: row.reps,
          performedAt: workout.started_at,
        });
        entry.sessions.add(workout.started_at);
      }
    }

    return [...byExercise.entries()]
      .map(([exerciseId, e]) => ({
        exerciseId,
        name: e.name,
        muscleGroup: e.muscleGroup,
        sessions: e.sessions.size,
        ...assessExercise(e.sets, fallback),
      }))
      .filter((r) => r.readiness !== "unknown");
  }, [workouts, repMin, repMax]);

  return { data: results, isLoading };
}

/** Weekly training volume, Σ(weight × reps), oldest week first. */
export function useWeeklyVolume(weeks = 12) {
  const { data: workouts, isLoading } = useWorkouts();

  const data = useMemo(() => {
    if (!workouts) return [];

    const buckets = new Map<string, number>();
    const now = new Date();

    // Seed every week so gaps render as zero rather than closing up — a missed
    // week is information, not something to hide.
    for (let i = weeks - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      buckets.set(weekKey(d), 0);
    }

    for (const workout of workouts) {
      if (!workout.finished_at) continue;
      const key = weekKey(new Date(workout.started_at));
      if (!buckets.has(key)) continue;

      let volume = 0;
      for (const row of (workout.workout_sets ?? []) as WorkoutSetRow[]) {
        if (row.weight_kg != null && row.reps != null) volume += row.weight_kg * row.reps;
      }
      buckets.set(key, (buckets.get(key) ?? 0) + volume);
    }

    return [...buckets.entries()].map(([week, volumeKg]) => ({ week, volumeKg }));
  }, [workouts, weeks]);

  return { data, isLoading };
}

/** ISO date of the Monday starting that week. */
function weekKey(date: Date): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
