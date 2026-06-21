"use client";

import { useEffect, useRef, useState } from "react";
import { useWeeklySets } from "@/lib/hooks/use-workouts";

/** Animate a number from 0 to its target, like a dial settling on a measurement. */
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, durationMs]);

  return value;
}

export function WeeklySetsCard() {
  const { data, isLoading } = useWeeklySets();
  const thisWeek = data?.thisWeek ?? 0;
  const lastWeek = data?.lastWeek ?? 0;
  const delta = thisWeek - lastWeek;
  const isUp = delta > 0;
  const isSame = delta === 0;
  const noBaseline = lastWeek === 0;
  const animated = useCountUp(thisWeek);

  return (
    <div className="sheet p-5 h-full">
      <p className="fig-label mb-4">Weekly sets</p>

      {isLoading ? (
        <div className="skeleton h-10 w-24 mb-2" />
      ) : thisWeek === 0 ? (
        <p className="text-sm mt-1" style={{ color: "var(--color-text-ghost)" }}>
          No sets on record this week.
        </p>
      ) : (
        <>
          <div className="flex items-end gap-2 mb-4">
            <span className="stat-large" style={{ color: "var(--color-text-primary)" }}>
              {Math.round(animated)}
            </span>
            <span className="label-caps mb-1">sets</span>
          </div>

          <p
            className="font-display"
            style={{
              fontSize: 12,
              letterSpacing: "0.08em",
              color: noBaseline || isSame
                ? "var(--color-text-ghost)"
                : isUp
                  ? "var(--color-green)"
                  : "var(--color-redline)",
            }}
          >
            {noBaseline
              ? "FIRST WEEK ON RECORD"
              : isSame
                ? "Δ ±0 VS LAST WK"
                : `Δ ${isUp ? "+" : ""}${delta} VS LAST WK`}
          </p>
          <p className="label-caps mt-1" style={{ fontSize: 11 }}>
            All exercises
          </p>
        </>
      )}
    </div>
  );
}
