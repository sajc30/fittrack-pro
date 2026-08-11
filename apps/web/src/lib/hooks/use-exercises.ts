"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { searchExercises } from "@fittrack/shared";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type MuscleGroup = Database["public"]["Enums"]["muscle_group"] | "all";
type Equipment  = Database["public"]["Enums"]["equipment_type"] | "all";

/** The columns the catalog query selects — keep the two in sync. */
export type CatalogExercise = Pick<
  Database["public"]["Tables"]["exercises"]["Row"],
  | "id"
  | "name"
  | "muscle_group"
  | "secondary_muscles"
  | "equipment"
  | "is_custom"
  | "movement_pattern"
>;

/**
 * The whole catalog in the columns the pickers actually read — ~130 KB for 730
 * rows, versus 600 KB for `select("*")`. Fetched once and held, so filtering
 * and fuzzy search run locally instead of hitting Postgres per keystroke.
 */
export function useExerciseCatalog() {
  const supabase = createClient();

  return useQuery<CatalogExercise[]>({
    queryKey: ["exercise-catalog"],
    staleTime: 60 * 60 * 1000, // catalog is effectively static within a session
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name, muscle_group, secondary_muscles, equipment, is_custom, movement_pattern")
        .order("name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Catalog narrowed by muscle/equipment, then ranked by fuzzy name match.
 * `trainedIds` breaks ties between equally-close typo matches in favour of
 * exercises the user actually does.
 */
export function useExercises(
  muscleGroup: MuscleGroup = "all",
  search = "",
  equipment: Equipment = "all",
  trainedIds?: Set<string>
) {
  const { data, isLoading } = useExerciseCatalog();

  const filtered = useMemo(() => {
    const pool = (data ?? []).filter(
      (ex) =>
        (muscleGroup === "all" || ex.muscle_group === muscleGroup) &&
        (equipment === "all" || ex.equipment === equipment)
    );
    return searchExercises(pool, search, {
      prefer: trainedIds && ((ex) => trainedIds.has(ex.id)),
    });
  }, [data, muscleGroup, search, equipment, trainedIds]);

  return { data: filtered, isLoading };
}

export function useCreateExercise() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exercise: {
      name: string;
      muscle_group: Database["public"]["Enums"]["muscle_group"];
      secondary_muscles: Database["public"]["Enums"]["muscle_group"][];
      equipment: Database["public"]["Enums"]["equipment_type"];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // RLS requires BOTH user_id = auth.uid() AND is_custom = true — the
      // insert is rejected if either is missing.
      const { data, error } = await supabase
        .from("exercises")
        .insert({ ...exercise, is_custom: true, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

/** Returns only the exercises the authenticated user has actually logged sets for. */
export function useLoggedExercises() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["logged-exercises"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Fetch distinct exercise_ids from the user's workout sets
      const { data, error } = await supabase
        .from("workout_sets")
        .select("exercise_id, exercises(id, name, muscle_group), workouts!inner(user_id)")
        .eq("workouts.user_id", user.id)
        .not("exercise_id", "is", null);

      if (error) throw error;

      // Deduplicate by exercise_id and return as a clean list sorted by name
      const seen = new Set<string>();
      const unique: { id: string; name: string; muscle_group: string }[] = [];
      for (const row of data ?? []) {
        const ex = row.exercises as { id: string; name: string; muscle_group: string } | null;
        if (ex && !seen.has(ex.id)) {
          seen.add(ex.id);
          unique.push(ex);
        }
      }
      return unique.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export function useStrengthHistory(exerciseId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["strength-history", exerciseId],
    enabled: !!exerciseId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !exerciseId) return [];

      const { data, error } = await supabase
        .from("workout_sets")
        .select("weight_kg, reps, logged_at, is_pr, workouts!inner(user_id, started_at)")
        .eq("exercise_id", exerciseId)
        .eq("workouts.user_id", user.id)
        .order("logged_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}
