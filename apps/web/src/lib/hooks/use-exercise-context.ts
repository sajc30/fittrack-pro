"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type MuscleGroup = Database["public"]["Enums"]["muscle_group"];

/** One working set from the previous session. Drops are excluded by the view. */
export interface LastSet {
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  set_type: Database["public"]["Enums"]["set_type"];
}

export interface LastPerformance {
  lastPerformedAt: string;
  sets: LastSet[];
}

export interface RecentExercise {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  lastPerformedAt: string;
}

/**
 * What this user did on this exercise in their previous *finished* session.
 * The view excludes the workout in progress, so mid-session logging never
 * shadows the session being compared against.
 */
export function useLastPerformance(exerciseId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["last-performance", exerciseId],
    enabled: !!exerciseId,
    queryFn: async (): Promise<LastPerformance | null> => {
      const { data, error } = await supabase
        .from("exercise_last_performance")
        .select("last_performed_at, last_sets")
        .eq("exercise_id", exerciseId!)
        .maybeSingle();

      if (error) throw error;
      if (!data?.last_performed_at) return null;

      return {
        lastPerformedAt: data.last_performed_at,
        sets: (data.last_sets as LastSet[] | null) ?? [],
      };
    },
  });
}

/**
 * Every exercise this user has trained, most recent first. One row per
 * exercise, so it stays small — the picker slices the head for its recents
 * row and uses the whole set to rank search results.
 */
export function useRecentExercises() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["recent-exercises"],
    queryFn: async (): Promise<RecentExercise[]> => {
      const { data, error } = await supabase
        .from("exercise_last_performance")
        .select("last_performed_at, exercises(id, name, muscle_group)")
        .order("last_performed_at", { ascending: false });

      if (error) throw error;

      return (data ?? [])
        .flatMap((row) => {
          const ex = row.exercises;
          return ex && row.last_performed_at
            ? [{ ...ex, lastPerformedAt: row.last_performed_at }]
            : [];
        })
        // Name breaks date ties. Postgres leaves ties in an arbitrary order, so
        // without this two exercises trained the same day could sort differently
        // here than on iOS. Both clients apply the same rule.
        .sort(
          (a, b) =>
            b.lastPerformedAt.localeCompare(a.lastPerformedAt) ||
            a.name.localeCompare(b.name)
        );
    },
  });
}
