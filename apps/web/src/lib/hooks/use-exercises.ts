"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type MuscleGroup = Database["public"]["Enums"]["muscle_group"] | "all";
type Equipment  = Database["public"]["Enums"]["equipment_type"] | "all";

export function useExercises(
  muscleGroup: MuscleGroup = "all",
  search = "",
  equipment: Equipment = "all"
) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["exercises", muscleGroup, search, equipment],
    queryFn: async () => {
      let query = supabase
        .from("exercises")
        .select("*")
        .order("name", { ascending: true });

      if (muscleGroup !== "all") {
        query = query.eq("muscle_group", muscleGroup);
      }

      if (equipment !== "all") {
        query = query.eq("equipment", equipment);
      }

      if (search.trim()) {
        query = query.ilike("name", `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
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
