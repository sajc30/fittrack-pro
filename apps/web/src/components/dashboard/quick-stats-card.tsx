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
    { label: "Last session",  value: latest ? formatRelativeDate(latest.started_at) : "—" },
    { label: "This month",    value: `${thisMonthCount} session${thisMonthCount !== 1 ? "s" : ""}` },
    { label: "Total logged",  value: totalCount > 0 ? String(totalCount) : "—" },
    { label: "Next sheet",    value: `Session ${String(totalCount + 1).padStart(3, "0")}` },
  ];

  return (
    <div className="sheet sheet-frame p-5 h-full">
      <p className="fig-label mb-4">Title block — at a glance</p>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-5 w-full" />)}
        </div>
      ) : (
        <div className="space-y-3.5">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline">
              <span className="label-caps shrink-0" style={{ fontSize: 11 }}>
                {stat.label}
              </span>
              <span className="leader-dots" />
              <span
                className="font-display text-sm shrink-0"
                style={{ color: "var(--color-text-primary)" }}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
