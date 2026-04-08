"use client";

import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

const mockData = [
  { date: "Mar 1",  weight: 82.0 },
  { date: "Mar 5",  weight: 81.8 },
  { date: "Mar 9",  weight: 81.5 },
  { date: "Mar 14", weight: 81.2 },
  { date: "Mar 19", weight: 81.4 },
  { date: "Mar 24", weight: 80.9 },
  { date: "Mar 29", weight: 80.6 },
  { date: "Apr 3",  weight: 80.4 },
];

export function WeightTrendSparkline() {
  const latest = mockData[mockData.length - 1].weight;
  const first = mockData[0].weight;
  const diff = latest - first;

  return (
    <div
      className="rounded-xl border p-5 h-full"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="label-caps">Body Weight</p>
        <span
          className="text-xs font-medium"
          style={{ color: diff < 0 ? "var(--color-green)" : "var(--color-red)" }}
        >
          {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
        </span>
      </div>

      <div className="flex items-end gap-1.5 mb-3">
        <span className="stat-large" style={{ color: "var(--color-text-primary)" }}>
          {latest}
        </span>
        <span
          className="text-sm font-medium mb-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          kg
        </span>
      </div>

      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockData}>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--color-text-primary)",
              }}
              formatter={(value) => [`${value} kg`, ""]}
              labelStyle={{ color: "var(--color-text-secondary)" }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="var(--color-amber)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-amber)", stroke: "none" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
