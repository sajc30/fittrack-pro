"use client";

import { Flame } from "lucide-react";
import { useStreak } from "@/lib/hooks/use-workouts";

export function StreakCard() {
  const streak = useStreak();

  return (
    <div
      className="rounded-xl border p-5 h-full"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">Streak</p>
        <Flame className="w-4 h-4" style={{ color: "var(--color-amber)" }} />
      </div>

      <div className="flex items-end gap-2">
        <span
          className="stat-large"
          style={{ color: streak > 0 ? "var(--color-amber)" : "var(--color-text-ghost)" }}
        >
          {streak}
        </span>
        <span className="text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
          days
        </span>
      </div>

      <p className="text-xs mt-2" style={{ color: "var(--color-text-ghost)" }}>
        {streak === 0 ? "Start your streak today" : streak === 1 ? "Keep it going tomorrow" : "Keep it alive"}
      </p>
    </div>
  );
}
