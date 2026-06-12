"use client";

import { useStreak } from "@/lib/hooks/use-workouts";

export function StreakCard() {
  const streak = useStreak();
  const filled = Math.min(streak, 7);

  return (
    <div className="sheet p-5 h-full">
      <p className="fig-label mb-4">Fig. 1 — Training streak</p>

      <div className="flex items-end gap-2 mb-4">
        <span
          className="stat-large"
          style={{ color: streak > 0 ? "var(--color-paper)" : "var(--color-text-ghost)" }}
        >
          {streak}
        </span>
        <span className="label-caps mb-1">days</span>
      </div>

      {/* Last seven days as hatched section cells */}
      <div className="flex gap-1.5 mb-2">
        {Array.from({ length: 7 }).map((_, i) => {
          const isFilled = i >= 7 - filled;
          return (
            <div
              key={i}
              className={isFilled ? "hatch-bright" : ""}
              style={{
                width: 22,
                height: 22,
                border: isFilled
                  ? "1px solid var(--color-paper)"
                  : "1px dashed var(--color-line)",
                borderRadius: 1,
              }}
            />
          );
        })}
      </div>

      <p className="label-caps" style={{ fontSize: 11 }}>
        {streak === 0
          ? "No active streak — begin today"
          : `Streak = ${streak} d, holding`}
      </p>
    </div>
  );
}
