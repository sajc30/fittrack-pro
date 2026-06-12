"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { useMeasurements } from "@/lib/hooks/use-measurements";
import { format } from "date-fns";

function kgToLbs(kg: number) { return Math.round(kg * 2.20462 * 10) / 10; }

export function WeightTrendSparkline() {
  const { data: measurements, isLoading } = useMeasurements();
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");

  useEffect(() => {
    setWeightUnit((localStorage.getItem("settings_weightUnit") as "kg" | "lbs") ?? "kg");
  }, []);

  const convert = (kg: number) => weightUnit === "lbs" ? kgToLbs(kg) : kg;

  const weightData = (measurements ?? [])
    .filter((m) => m.weight_kg !== null)
    .slice(0, 12)
    .reverse()
    .map((m) => ({
      date: format(new Date(m.measured_at), "MMM d"),
      weight: convert(m.weight_kg as number),
    }));

  const latest = weightData.at(-1)?.weight ?? null;
  const first  = weightData.at(0)?.weight ?? null;
  const diff   = latest !== null && first !== null ? Math.round((latest - first) * 10) / 10 : null;
  const unit   = weightUnit === "lbs" ? "lbs" : "kg";

  return (
    <div
      className="rounded-xl border p-5 h-full"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="label-caps">Body Weight</p>
        {diff !== null && (
          <span
            className="text-xs font-medium"
            style={{ color: diff <= 0 ? "var(--color-green)" : "var(--color-red)" }}
          >
            {diff > 0 ? "+" : ""}{diff} {unit}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="skeleton h-10 w-20 mb-2" />
      ) : latest === null ? (
        <p className="text-sm mt-2" style={{ color: "var(--color-text-ghost)" }}>
          Log your weight in Body to see the trend.
        </p>
      ) : (
        <>
          <div className="flex items-end gap-1.5 mb-3">
            <span className="stat-large" style={{ color: "var(--color-text-primary)" }}>{latest}</span>
            <span className="text-sm font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>{unit}</span>
          </div>

          {weightData.length > 1 && (
            <div className="h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData}>
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--color-raised)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-text-primary)" }}
                    formatter={(v) => [`${v} ${unit}`, ""]}
                    labelStyle={{ color: "var(--color-text-secondary)" }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="var(--color-amber)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "var(--color-amber)", stroke: "none" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
