"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { calculateStreak } from "@fittrack/shared";

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
  const supabase = createClient();

  // Dates only — fetching full workouts with nested sets just for a streak
  // is the dashboard's heaviest query for no reason.
  const { data } = useQuery({
    queryKey: ["workout-dates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("workouts")
        .select("started_at")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(365);

      if (error) throw error;
      return data ?? [];
    },
  });

  return calculateStreak((data ?? []).map((w) => w.started_at));
}

export function useWeeklySets() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["weekly-sets"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { thisWeek: 0, lastWeek: 0 };

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      const { data, error } = await supabase
        .from("workout_sets")
        .select("logged_at, workouts!inner(user_id)")
        .eq("workouts.user_id", user.id)
        .gte("logged_at", lastWeekStart.toISOString());

      if (error) throw error;

      const thisWeek = (data ?? []).filter(
        (s) => new Date(s.logged_at) >= weekStart
      ).length;
      const lastWeek = (data ?? []).filter(
        (s) =>
          new Date(s.logged_at) >= lastWeekStart &&
          new Date(s.logged_at) < weekStart
      ).length;

      return { thisWeek, lastWeek };
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["workout-dates"] });
    },
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
      queryClient.invalidateQueries({ queryKey: ["workout-dates"] });
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
    onSuccess: () => {
      // The DB trigger may have updated personal_records
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["prs"] });
    },
  });
}

export function useDeleteWorkout() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workoutId: string) => {
      // Sets cascade via FK; the workout_sets_recalc_pr trigger keeps
      // personal_records in sync transactionally.
      const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["workout-dates"] });
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
      set_number,
    }: {
      setId: string;
      weight_kg: number;
      reps: number;
      rpe?: number | null;
      set_number?: number;
    }) => {
      const { error } = await supabase
        .from("workout_sets")
        .update({
          weight_kg,
          reps,
          rpe: rpe ?? null,
          ...(set_number !== undefined ? { set_number } : {}),
        })
        .eq("id", setId);
      if (error) throw error;
    },
    onSuccess: () => {
      // The DB trigger recalculates PRs when set weight/reps change
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["prs"] });
    },
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
    onSuccess: () => {
      // The DB trigger recalculates PRs; deleting an exercise's last set
      // also changes which exercises are logged
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["prs"] });
      queryClient.invalidateQueries({ queryKey: ["logged-exercises"] });
    },
  });
}
