"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useWeeklyVolume } from "@/lib/hooks/use-workouts";

export function WeeklyVolumeCard() {
  const { data, isLoading } = useWeeklyVolume();
  const thisWeek = data?.thisWeek ?? 0;
  const pct = data?.pct ?? 0;
  const isUp = pct > 0;
  const isSame = pct === 0;

  return (
    <div
      className="rounded-xl border p-5 h-full"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">Weekly Volume</p>
        {isUp ? (
          <TrendingUp className="w-4 h-4" style={{ color: "var(--color-green)" }} />
        ) : isSame ? (
          <Minus className="w-4 h-4" style={{ color: "var(--color-text-ghost)" }} />
        ) : (
          <TrendingDown className="w-4 h-4" style={{ color: "var(--color-red)" }} />
        )}
      </div>

      {isLoading ? (
        <div className="skeleton h-10 w-24 mb-2" />
      ) : thisWeek === 0 ? (
        <p className="text-sm mt-1" style={{ color: "var(--color-text-ghost)" }}>
          No sessions yet this week
        </p>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <span className="stat-large" style={{ color: "var(--color-text-primary)" }}>
              {(thisWeek / 1000).toFixed(1)}
            </span>
            <span className="text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
              tonnes
            </span>
          </div>
          <p
            className="text-xs mt-2"
            style={{
              color: isUp ? "var(--color-green)" : isSame ? "var(--color-text-ghost)" : "var(--color-red)",
            }}
          >
            {isSame ? "Same as last week" : `${isUp ? "+" : ""}${pct}% vs last week`}
          </p>
        </>
      )}
    </div>
  );
}
