"use client";

import { formatRelativeDate } from "@fittrack/shared";

const stats = [
  { label: "Last Workout",       value: "Yesterday" },
  { label: "This Month",         value: "14 sessions" },
  { label: "Total Workouts",     value: "247" },
];

export function QuickStatsCard() {
  return (
    <div
      className="rounded-xl border p-5 h-full"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <p className="label-caps mb-4">At a Glance</p>
      <div className="space-y-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <span
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {stat.label}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
