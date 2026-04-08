"use client";

import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { calculateTDEE, calculateBMI, bmiCategory } from "@fittrack/shared";
import type { ActivityLevel, Gender } from "@fittrack/shared";
import { Info } from "lucide-react";

const weightData = [
  { date: "Mar 1",  weight: 82.0 },
  { date: "Mar 8",  weight: 81.6 },
  { date: "Mar 15", weight: 81.2 },
  { date: "Mar 22", weight: 81.0 },
  { date: "Mar 29", weight: 80.6 },
  { date: "Apr 5",  weight: 80.4 },
];

const measurements = [
  { label: "Chest",     value: 102, unit: "cm", change: -1 },
  { label: "Waist",     value: 84,  unit: "cm", change: -2 },
  { label: "Hips",      value: 96,  unit: "cm", change: -1 },
  { label: "Bicep",     value: 38,  unit: "cm", change: +0.5 },
  { label: "Thigh",     value: 60,  unit: "cm", change: -1.5 },
  { label: "Body Fat",  value: 16,  unit: "%",  change: -1 },
];

const customTooltipStyle = {
  backgroundColor: "var(--color-raised)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--color-text-primary)",
  padding: "8px 12px",
};

export function BodyMetricsView() {
  // In production, read from Supabase profile
  const weight_kg = 80.4;
  const height_cm = 178;
  const age = 26;
  const gender: Gender = "male";
  const activity: ActivityLevel = "moderately_active";

  const tdee = calculateTDEE(weight_kg, height_cm, age, gender, activity);
  const bmi = calculateBMI(weight_kg, height_cm);
  const bmiLabel = bmiCategory(bmi);

  return (
    <div className="space-y-6">
      {/* Weight trend */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-end gap-3 mb-6">
          <div>
            <p className="label-caps mb-1">Current Weight</p>
            <div className="flex items-end gap-2">
              <span className="stat-large" style={{ color: "var(--color-text-primary)" }}>
                {weight_kg}
              </span>
              <span
                className="text-sm font-medium mb-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                kg
              </span>
            </div>
          </div>
          <div
            className="ml-6 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: "var(--color-inset)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
            }}
          >
            BMI {bmi} — {bmiLabel}
          </div>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weightData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--color-amber)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--color-amber)" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                domain={["dataMin - 0.5", "dataMax + 0.5"]}
              />
              <Tooltip
                contentStyle={customTooltipStyle}
                formatter={(v) => [`${v} kg`, "Weight"]}
                labelStyle={{ color: "var(--color-text-secondary)" }}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="var(--color-amber)"
                strokeWidth={2.5}
                fill="url(#weightGrad)"
                dot={false}
                activeDot={{ r: 5, fill: "var(--color-amber)", stroke: "var(--color-void)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TDEE Card */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-center gap-2 mb-6">
          <p className="label-caps">Calorie Targets</p>
          <Info className="w-3.5 h-3.5" style={{ color: "var(--color-text-ghost)" }} />
        </div>

        {/* Three targets */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Cut",         value: tdee.cutting,      desc: "−400 kcal/day" },
            { label: "Maintain",    value: tdee.maintenance,  desc: "TDEE baseline",  highlight: true },
            { label: "Bulk",        value: tdee.bulking,      desc: "+400 kcal/day" },
          ].map((t) => (
            <div
              key={t.label}
              className="rounded-lg p-4 text-center"
              style={{
                backgroundColor: t.highlight ? "var(--color-amber-dim)" : "var(--color-inset)",
                border: t.highlight ? "1px solid var(--color-amber)" : "1px solid var(--color-border)",
              }}
            >
              <p
                className="label-caps mb-2"
                style={{ color: t.highlight ? "var(--color-amber)" : undefined }}
              >
                {t.label}
              </p>
              <p
                className="stat-mid"
                style={{ color: t.highlight ? "var(--color-amber)" : "var(--color-text-primary)" }}
              >
                {t.value.toLocaleString()}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-text-ghost)" }}
              >
                {t.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Macros */}
        <div className="flex items-center gap-6 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
          <p className="label-caps">Macro Split</p>
          <div className="flex gap-6">
            {[
              { label: "Protein", value: tdee.protein_g, color: "var(--color-amber)" },
              { label: "Carbs",   value: tdee.carbs_g,   color: "var(--color-blue)" },
              { label: "Fat",     value: tdee.fat_g,     color: "var(--color-green)" },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
                  <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                    {m.value}g
                  </span>{" "}
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Measurements grid */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <p className="label-caps mb-4">Measurements</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {measurements.map((m) => (
            <div
              key={m.label}
              className="rounded-lg p-4"
              style={{
                backgroundColor: "var(--color-inset)",
                border: "1px solid var(--color-border)",
              }}
            >
              <p className="label-caps mb-2">{m.label}</p>
              <div className="flex items-end justify-between">
                <span className="stat-small" style={{ color: "var(--color-text-primary)" }}>
                  {m.value} {m.unit}
                </span>
                <span
                  className="text-xs font-medium"
                  style={{
                    color:
                      m.change === 0
                        ? "var(--color-text-ghost)"
                        : m.label === "Waist" || m.label === "Body Fat" || m.label === "Hips"
                        ? m.change < 0
                          ? "var(--color-green)"
                          : "var(--color-red)"
                        : m.change > 0
                        ? "var(--color-green)"
                        : "var(--color-red)",
                  }}
                >
                  {m.change > 0 ? "+" : ""}{m.change} {m.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
