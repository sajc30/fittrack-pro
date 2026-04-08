"use client";

import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart,
} from "recharts";
import { estimateOneRepMax } from "@fittrack/shared";

type Range = "1M" | "3M" | "6M" | "1Y" | "ALL";

const strengthData = [
  { date: "Jan 8",  weight: 115, reps: 5 },
  { date: "Jan 15", weight: 117.5, reps: 5 },
  { date: "Jan 22", weight: 120, reps: 5 },
  { date: "Feb 5",  weight: 122.5, reps: 4 },
  { date: "Feb 12", weight: 120, reps: 5 },
  { date: "Feb 19", weight: 125, reps: 4 },
  { date: "Mar 1",  weight: 127.5, reps: 4 },
  { date: "Mar 8",  weight: 125, reps: 5 },
  { date: "Mar 15", weight: 130, reps: 3 },
  { date: "Mar 22", weight: 132.5, reps: 3 },
  { date: "Apr 1",  weight: 135, reps: 3 },
].map((d) => ({
  ...d,
  e1rm: estimateOneRepMax(d.weight, d.reps),
}));

const volumeData = [
  { week: "Mar 3",  volume: 11200 },
  { week: "Mar 10", volume: 12800 },
  { week: "Mar 17", volume: 11600 },
  { week: "Mar 24", volume: 14200 },
  { week: "Mar 31", volume: 13800 },
  { week: "Apr 7",  volume: 14820 },
];

const RANGES: Range[] = ["1M", "3M", "6M", "1Y", "ALL"];

const customTooltipStyle = {
  backgroundColor: "var(--color-raised)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--color-text-primary)",
  padding: "8px 12px",
};

export function ProgressCharts() {
  const [activeRange, setActiveRange] = useState<Range>("3M");
  const [selectedExercise, setSelectedExercise] = useState("Bench Press");

  const exercises = ["Bench Press", "Squat", "Deadlift", "Overhead Press"];

  return (
    <div className="space-y-6">
      {/* Strength chart */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="label-caps mb-1.5">Strength Progress</p>
            <div className="flex gap-2 flex-wrap">
              {exercises.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setSelectedExercise(ex)}
                  className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-[120ms]"
                  style={{
                    backgroundColor:
                      selectedExercise === ex
                        ? "var(--color-amber)"
                        : "var(--color-inset)",
                    color:
                      selectedExercise === ex
                        ? "var(--color-void)"
                        : "var(--color-text-secondary)",
                    border: selectedExercise === ex
                      ? "none"
                      : "1px solid var(--color-border)",
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Range selector */}
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setActiveRange(r)}
                className="px-2.5 py-1 rounded text-xs font-medium transition-all duration-[120ms]"
                style={{
                  color:
                    activeRange === r
                      ? "var(--color-amber)"
                      : "var(--color-text-ghost)",
                  backgroundColor: activeRange === r ? "var(--color-amber-dim)" : "transparent",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Current E1RM callout */}
        <div className="mb-4">
          <span className="stat-large" style={{ color: "var(--color-amber)" }}>
            {strengthData[strengthData.length - 1].e1rm}
          </span>
          <span
            className="text-sm font-medium ml-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            kg estimated 1RM
          </span>
        </div>

        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={strengthData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--color-text-ghost)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-text-ghost)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                contentStyle={customTooltipStyle}
                formatter={(value, name) => [
                  `${value} kg`,
                  name === "e1rm" ? "Est. 1RM" : "Weight",
                ]}
                labelStyle={{ color: "var(--color-text-secondary)", marginBottom: 4 }}
              />
              <Line
                type="monotone"
                dataKey="e1rm"
                stroke="var(--color-amber)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "var(--color-amber)", stroke: "var(--color-void)", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--color-text-ghost)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume chart */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <p className="label-caps mb-6">Weekly Volume</p>

        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <XAxis
                dataKey="week"
                tick={{ fill: "var(--color-text-ghost)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-text-ghost)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}t`}
              />
              <Tooltip
                contentStyle={customTooltipStyle}
                formatter={(v) => [`${(Number(v) / 1000).toFixed(1)} tonnes`, "Volume"]}
                labelStyle={{ color: "var(--color-text-secondary)" }}
                cursor={{ fill: "var(--color-raised)" }}
              />
              <Bar
                dataKey="volume"
                fill="var(--color-amber)"
                radius={[4, 4, 0, 0]}
                opacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
