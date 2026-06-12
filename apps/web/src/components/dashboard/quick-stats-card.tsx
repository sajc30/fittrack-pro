"use client";

import { useWorkouts } from "@/lib/hooks/use-workouts";
import { formatRelativeDate } from "@fittrack/shared";
import { startOfMonth } from "date-fns";

export function QuickStatsCard() {
  const { data: workouts, isLoading } = useWorkouts(200);

  const latest = workouts?.[0];
  const thisMonthCount = (workouts ?? []).filter(
    (w) => new Date(w.started_at) >= startOfMonth(new Date())
  ).length;
  const totalCount = workouts?.length ?? 0;

  const stats = [
    { label: "Last Workout",   value: latest ? formatRelativeDate(latest.started_at) : "—" },
    { label: "This Month",     value: `${thisMonthCount} session${thisMonthCount !== 1 ? "s" : ""}` },
    { label: "Total Workouts", value: totalCount > 0 ? String(totalCount) : "—" },
  ];

  return (
    <div
      className="rounded-xl border p-5 h-full"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <p className="label-caps mb-4">At a Glance</p>
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-5 w-full" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{stat.label}</span>
              <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{stat.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
