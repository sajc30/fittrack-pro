"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function usePRs() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["prs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("personal_records")
        .select("*, exercises(id, name, muscle_group)")
        .eq("user_id", user.id)
        .order("achieved_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useExercisePRs(exerciseId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["prs", exerciseId],
    enabled: !!exerciseId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !exerciseId) return null;

      const { data } = await supabase
        .from("personal_records")
        .select("*")
        .eq("user_id", user.id)
        .eq("exercise_id", exerciseId)
        .single();

      return data ?? null;
    },
  });
}

export function usePreviousSets(exerciseId: string | null) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["previous-sets", exerciseId],
    enabled: !!exerciseId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !exerciseId) return [];

      const { data } = await supabase
        .from("workout_sets")
        .select("*, workouts!inner(user_id, started_at)")
        .eq("exercise_id", exerciseId)
        .eq("workouts.user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(10);

      return data ?? [];
    },
  });
}
