"use client";

import { useState, useEffect } from "react";
import { useMeasurements } from "@/lib/hooks/use-measurements";

function kgToLbs(kg: number) { return Math.round(kg * 2.20462 * 10) / 10; }

const W = 200;
const H = 56;
const PAD = 5;

export function WeightTrendSparkline() {
  const { data: measurements, isLoading } = useMeasurements();
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");

  useEffect(() => {
    setWeightUnit((localStorage.getItem("settings_weightUnit") as "kg" | "lbs") ?? "kg");
  }, []);

  const convert = (kg: number) => weightUnit === "lbs" ? kgToLbs(kg) : kg;

  const weights = (measurements ?? [])
    .filter((m) => m.weight_kg !== null)
    .slice(0, 12)
    .reverse()
    .map((m) => convert(m.weight_kg as number));

  const latest = weights.at(-1) ?? null;
  const first  = weights.at(0) ?? null;
  const diff   = latest !== null && first !== null ? Math.round((latest - first) * 10) / 10 : null;
  const unit   = weightUnit === "lbs" ? "lbs" : "kg";

  // Plot points across the viewBox; flat data sits on the centerline
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min;
  const points = weights.map((w, i) => {
    const x = weights.length === 1
      ? W / 2
      : PAD + (i / (weights.length - 1)) * (W - PAD * 2);
    const y = span === 0
      ? H / 2
      : PAD + (1 - (w - min) / span) * (H - PAD * 2);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as const;
  });
  const last = points.at(-1);

  return (
    <div className="sheet p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="fig-label">Bodyweight</p>
        {diff !== null && diff !== 0 && (
          <span
            className="font-display"
            style={{
              fontSize: 12,
              letterSpacing: "0.08em",
              color: diff < 0 ? "var(--color-green)" : "var(--color-text-secondary)",
            }}
          >
            Δ {diff > 0 ? "+" : ""}{diff} {unit.toUpperCase()}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="skeleton h-10 w-20 mb-2" />
      ) : latest === null ? (
        <p className="text-sm mt-2" style={{ color: "var(--color-text-ghost)" }}>
          Log your weight on Body to plot the curve.
        </p>
      ) : (
        <>
          <div className="flex items-end gap-1.5 mb-3">
            <span className="stat-large" style={{ color: "var(--color-text-primary)" }}>{latest}</span>
            <span className="label-caps mb-1">{unit}</span>
          </div>

          {points.length > 1 && (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full"
              style={{ height: 52 }}
              role="img"
              aria-label={`Bodyweight trend, last ${points.length} entries`}
            >
              {[0.25, 0.5, 0.75].map((f) => (
                <line
                  key={f}
                  x1="0" y1={H * f} x2={W} y2={H * f}
                  stroke="var(--color-line)" strokeWidth="0.5"
                />
              ))}
              <polyline
                points={points.map(([x, y]) => `${x},${y}`).join(" ")}
                fill="none"
                stroke="var(--color-paper)"
                strokeWidth="1.5"
                pathLength={1}
                className="bp-draw"
              />
              {points.slice(0, -1).map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x} cy={y} r="1.8"
                  fill="var(--color-sheet)"
                  stroke="var(--color-text-secondary)"
                  strokeWidth="0.8"
                  className="bp-fade-in"
                />
              ))}
              {last && (
                <circle cx={last[0]} cy={last[1]} r="2.5" fill="var(--color-paper)" className="bp-fade-in" />
              )}
            </svg>
          )}
        </>
      )}
    </div>
  );
}
