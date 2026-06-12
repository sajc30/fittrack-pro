"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLoggedExercises, useStrengthHistory } from "@/lib/hooks/use-exercises";
import { useWeeklyVolume, useWorkouts } from "@/lib/hooks/use-workouts";
import { estimateOneRepMax } from "@fittrack/shared";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { ChevronDown } from "lucide-react";

const CHART_STYLE = {
  backgroundColor: "var(--color-surface)",
  borderColor: "var(--color-border)",
};

export function ProgressCharts() {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [range, setRange] = useState<"3m" | "6m" | "1y" | "all">("3m");

  const { data: exercises } = useLoggedExercises();
  const { data: strengthData, isLoading: strengthLoading } = useStrengthHistory(selectedExerciseId || null);
  const { data: workouts } = useWorkouts(200);

  // Set default exercise once exercises load
  useMemo(() => {
    if (exercises && exercises.length > 0 && !selectedExerciseId) {
      setSelectedExerciseId(exercises[0].id);
    }
  }, [exercises, selectedExerciseId]);

  // Build strength / e1RM line chart data
  const rangeDate = useMemo(() => {
    const now = new Date();
    if (range === "3m") return subWeeks(now, 12);
    if (range === "6m") return subWeeks(now, 26);
    if (range === "1y") return subWeeks(now, 52);
    return new Date(0);
  }, [range]);

  const e1rmData = useMemo(() => {
    if (!strengthData) return [];
    return strengthData
      .filter((s) => new Date(s.logged_at) >= rangeDate)
      .filter((s) => s.weight_kg !== null && s.reps !== null)
      .map((s) => ({
        date: format(new Date(s.logged_at), "MMM d"),
        e1rm: Math.round(estimateOneRepMax(s.weight_kg!, s.reps!) * 10) / 10,
        weight: s.weight_kg,
        reps: s.reps,
      }));
  }, [strengthData, rangeDate]);

  // Weekly volume bar chart
  const volumeData = useMemo(() => {
    if (!workouts) return [];
    const weeks: { week: string; volume: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i));
      const weekEnd = endOfWeek(weekStart);
      const weekWorkouts = workouts.filter((w) => {
        const d = new Date(w.started_at);
        return d >= weekStart && d <= weekEnd;
      });
      const volume = weekWorkouts.reduce((sum, w) => {
        const sets = (w.workout_sets as any[]) ?? [];
        return sum + sets.reduce((s: number, set: any) => s + (set.reps ?? 0) * (set.weight_kg ?? 0), 0);
      }, 0);
      weeks.push({ week: format(weekStart, "MMM d"), volume: Math.round(volume / 100) / 10 });
    }
    return weeks;
  }, [workouts]);

  return (
    <div className="space-y-8">
      {/* Strength progress */}
      <div className="rounded-xl border p-6" style={CHART_STYLE}>
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-caps mb-1">Strength Progress</p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Estimated 1-Rep Max over time</p>
            </div>
            {/* Range buttons */}
            <div className="flex gap-1 shrink-0">
              {(["3m","6m","1y","all"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-[120ms]"
                  style={{
                    backgroundColor: range === r ? "var(--color-amber)" : "var(--color-inset)",
                    color: range === r ? "var(--color-void)" : "var(--color-text-secondary)",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {/* Exercise selector — only shows exercises the user has actually logged */}
          {exercises && exercises.length > 0 ? (
            <div className="relative w-full">
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="appearance-none w-full pl-3 pr-8 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "var(--color-inset)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", outline: "none" }}
              >
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--color-text-ghost)" }} />
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-ghost)" }}>
              No exercises logged yet — start a workout to see your progress here.
            </p>
          )}
        </div>

        {strengthLoading ? (
          <div className="skeleton h-48 rounded-xl" />
        ) : e1rmData.length < 2 ? (
          <div className="h-48 flex items-center justify-center">
            <p style={{ color: "var(--color-text-ghost)", fontSize: 14 }}>
              Log at least 2 sessions of this exercise to see the trend.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={e1rmData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-text-ghost)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-ghost)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--color-raised)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${v} kg`, "Est. 1RM"]}
              />
              <Line type="monotone" dataKey="e1rm" stroke="var(--color-amber)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-amber)", stroke: "none" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weekly volume */}
      <div className="rounded-xl border p-6" style={CHART_STYLE}>
        <div className="mb-5">
          <p className="label-caps mb-1">Weekly Volume</p>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Total tonnage lifted per week (tonnes)</p>
        </div>
        {volumeData.every((d) => d.volume === 0) ? (
          <div className="h-48 flex items-center justify-center">
            <p style={{ color: "var(--color-text-ghost)", fontSize: 14 }}>No workout data yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={volumeData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--color-text-ghost)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-ghost)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--color-raised)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${v}t`, "Volume"]}
              />
              <Bar dataKey="volume" fill="var(--color-amber)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
