"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { calculateStreak, calculateWeeklyVolume, estimateOneRepMax } from "@fittrack/shared";

export function useWorkouts(limit = 50) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["workouts", limit],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("workouts")
        .select(`
          *,
          workout_sets (
            id, exercise_id, set_number, reps, weight_kg, set_type, is_pr, logged_at,
            exercises ( id, name, muscle_group )
          )
        `)
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStreak() {
  const { data: workouts } = useWorkouts(200);

  const dates = (workouts ?? []).map((w) => w.started_at);
  return calculateStreak(dates);
}

export function useWeeklyVolume() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["weekly-volume"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { thisWeek: 0, lastWeek: 0, pct: 0 };

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      const { data, error } = await supabase
        .from("workout_sets")
        .select("reps, weight_kg, logged_at, workouts!inner(user_id)")
        .eq("workouts.user_id", user.id)
        .gte("logged_at", lastWeekStart.toISOString());

      if (error) throw error;

      const thisWeekSets = (data ?? []).filter(
        (s) => new Date(s.logged_at) >= weekStart
      );
      const lastWeekSets = (data ?? []).filter(
        (s) =>
          new Date(s.logged_at) >= lastWeekStart &&
          new Date(s.logged_at) < weekStart
      );

      const thisWeek = calculateWeeklyVolume(thisWeekSets);
      const lastWeek = calculateWeeklyVolume(lastWeekSets);
      const pct = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

      return { thisWeek, lastWeek, pct };
    },
  });
}

export function useCreateWorkout() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workout: { name: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("workouts")
        .insert({ ...workout, user_id: user.id, started_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });
}

export function useFinishWorkout() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workoutId,
      startedAt,
    }: {
      workoutId: string;
      startedAt: Date;
    }) => {
      const finished = new Date();
      const duration = Math.round(
        (finished.getTime() - startedAt.getTime()) / 60000
      );

      const { error } = await supabase
        .from("workouts")
        .update({ finished_at: finished.toISOString(), duration_minutes: duration })
        .eq("id", workoutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["logged-exercises"] });
    },
  });
}

export function useLogSet() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (set: {
      workout_id: string;
      exercise_id: string;
      set_number: number;
      reps: number;
      weight_kg: number;
      set_type?: string;
      is_pr?: boolean;
      rpe?: number;
    }) => {
      const { data, error } = await supabase
        .from("workout_sets")
        .insert({
          workout_id: set.workout_id,
          exercise_id: set.exercise_id,
          set_number: set.set_number,
          reps: set.reps,
          weight_kg: set.weight_kg,
          set_type: (set.set_type ?? "normal") as "normal",
          is_pr: set.is_pr ?? false,
          rpe: set.rpe ?? null,
          logged_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });
}

export function useDeleteWorkout() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workoutId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Collect which exercises were in this workout before deleting
      const { data: setsInWorkout } = await supabase
        .from("workout_sets")
        .select("exercise_id")
        .eq("workout_id", workoutId);

      const affectedExerciseIds = [...new Set((setsInWorkout ?? []).map((s) => s.exercise_id))];

      // Delete workout — sets cascade via FK
      const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
      if (error) throw error;

      // Recalculate PRs for each affected exercise
      for (const exerciseId of affectedExerciseIds) {
        const { data: remaining } = await supabase
          .from("workout_sets")
          .select("weight_kg, reps, logged_at, workouts!inner(user_id)")
          .eq("exercise_id", exerciseId)
          .eq("workouts.user_id", user.id)
          .not("weight_kg", "is", null)
          .not("reps", "is", null);

        if (!remaining || remaining.length === 0) {
          // No sets left for this exercise — remove the stale PR
          await supabase
            .from("personal_records")
            .delete()
            .eq("user_id", user.id)
            .eq("exercise_id", exerciseId);
        } else {
          // Find the best set by estimated 1RM
          const best = remaining.reduce((top, s) =>
            estimateOneRepMax(s.weight_kg!, s.reps!) > estimateOneRepMax(top.weight_kg!, top.reps!) ? s : top
          );
          await supabase.from("personal_records").upsert(
            [{
              user_id:               user.id,
              exercise_id:           exerciseId,
              weight_kg:             best.weight_kg!,
              reps:                  best.reps!,
              achieved_at:           best.logged_at,
              estimated_one_rep_max: estimateOneRepMax(best.weight_kg!, best.reps!),
            }],
            { onConflict: "user_id,exercise_id" }
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["prs"] });
      queryClient.invalidateQueries({ queryKey: ["logged-exercises"] });
    },
  });
}

export function useUpdateWorkout() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workoutId, name, notes }: { workoutId: string; name: string; notes?: string }) => {
      const { error } = await supabase
        .from("workouts")
        .update({ name, notes: notes ?? null })
        .eq("id", workoutId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });
}

export function useUpdateSet() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      setId,
      weight_kg,
      reps,
      rpe,
    }: {
      setId: string;
      weight_kg: number;
      reps: number;
      rpe?: number | null;
    }) => {
      const { error } = await supabase
        .from("workout_sets")
        .update({ weight_kg, reps, rpe: rpe ?? null })
        .eq("id", setId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });
}

export function useDeleteSet() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (setId: string) => {
      const { error } = await supabase
        .from("workout_sets")
        .delete()
        .eq("id", setId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });
}

export function useUpsertPR() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pr: {
      user_id: string;
      exercise_id: string;
      weight_kg: number;
      reps: number;
      estimated_one_rep_max: number;
    }) => {
      const { error } = await supabase.from("personal_records").upsert(
        { ...pr, achieved_at: new Date().toISOString() },
        { onConflict: "user_id,exercise_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prs"] }),
  });
}
