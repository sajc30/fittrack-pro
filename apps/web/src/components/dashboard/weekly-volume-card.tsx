"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function WeeklyVolumeCard() {
  const thisWeek = 14820; // kg — from Supabase in production
  const lastWeek = 13200;
  const diff = thisWeek - lastWeek;
  const pct = Math.round((diff / lastWeek) * 100);
  const isUp = diff > 0;
  const isSame = diff === 0;

  return (
    <div
      className="rounded-xl border p-5 h-full"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
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

      <div className="flex items-end gap-2">
        <span className="stat-large" style={{ color: "var(--color-text-primary)" }}>
          {(thisWeek / 1000).toFixed(1)}
        </span>
        <span
          className="text-sm font-medium mb-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          tonnes
        </span>
      </div>

      <p
        className="text-xs mt-2"
        style={{ color: isUp ? "var(--color-green)" : isSame ? "var(--color-text-ghost)" : "var(--color-red)" }}
      >
        {isSame
          ? "Same as last week"
          : `${isUp ? "+" : ""}${pct}% vs last week`}
      </p>
    </div>
  );
}
