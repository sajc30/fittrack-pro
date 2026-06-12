"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TablesInsert } from "@/lib/supabase/database.types";

export function useMeasurements() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["measurements"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("body_measurements")
        .select("*")
        .eq("user_id", user.id)
        .order("measured_at", { ascending: false })
        .limit(90);

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddMeasurement() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      measurement: Omit<TablesInsert<"body_measurements">, "user_id">
    ) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("body_measurements")
        .insert({ ...measurement, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["measurements"] }),
  });
}
