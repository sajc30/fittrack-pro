"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWeightUnit, formatKg } from "@/lib/hooks/use-weight-unit";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLoggedExercises, useStrengthHistory } from "@/lib/hooks/use-exercises";
import { useWorkouts } from "@/lib/hooks/use-workouts";
import { estimateOneRepMax } from "@fittrack/shared";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { ChevronDown } from "lucide-react";

const AXIS_TICK = {
  fontSize: 11,
  fill: "var(--color-text-ghost)",
  fontFamily: "var(--font-mono)",
} as const;

/** Full-bleed crosshair at the active point — the plot measures itself. */
function CrosshairDot(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <line x1={cx} y1={-2000} x2={cx} y2={2000} stroke="var(--color-line-bright)" strokeWidth={0.75} strokeDasharray="5 4" />
      <line x1={-2000} y1={cy} x2={2000} y2={cy} stroke="var(--color-line-bright)" strokeWidth={0.75} strokeDasharray="5 4" />
      <circle cx={cx} cy={cy} r={4.5} fill="none" stroke="var(--color-paper)" strokeWidth={1.25} />
      <circle cx={cx} cy={cy} r={1.8} fill="var(--color-paper)" />
    </g>
  );
}

interface E1rmPoint {
  date: string;
  e1rm: number;
  weight: number;
  reps: number;
  isPR: boolean;
}

function StrengthTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: E1rmPoint }> }) {
  const { unit, label } = useWeightUnit();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: "var(--color-sheet-raised)",
        border: "1px solid var(--color-line-bright)",
        borderRadius: 2,
        padding: "8px 12px",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.06em",
      }}
    >
      <p style={{ color: "var(--color-text-primary)", fontSize: 13 }}>
        {formatKg(p.e1rm, unit)} {label} <span style={{ color: "var(--color-text-ghost)", fontSize: 11 }}>E1RM</span>
        {p.isPR && <span style={{ color: "var(--color-redline)", fontSize: 11 }}> · PR</span>}
      </p>
      <p style={{ color: "var(--color-text-secondary)", fontSize: 11, marginTop: 2 }}>
        {formatKg(p.weight, unit)} {label} × {p.reps} — {p.date.toUpperCase()}
      </p>
    </div>
  );
}

function SetsTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { week: string; sets: number } }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: "var(--color-sheet-raised)",
        border: "1px solid var(--color-line-bright)",
        borderRadius: 2,
        padding: "8px 12px",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.06em",
      }}
    >
      <p style={{ color: "var(--color-text-primary)", fontSize: 13 }}>
        {p.sets} SET{p.sets !== 1 ? "S" : ""}
      </p>
      <p style={{ color: "var(--color-text-secondary)", fontSize: 11, marginTop: 2 }}>
        WK OF {p.week.toUpperCase()}
      </p>
    </div>
  );
}

export function ProgressCharts() {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [range, setRange] = useState<"3m" | "6m" | "1y" | "all">("3m");
  const { unit, label } = useWeightUnit();

  const { data: exercises } = useLoggedExercises();
  const { data: strengthData, isLoading: strengthLoading } = useStrengthHistory(selectedExerciseId || null);
  const { data: workouts } = useWorkouts(200);

  // Default to the first logged exercise once the list arrives
  useEffect(() => {
    if (exercises && exercises.length > 0 && !selectedExerciseId) {
      setSelectedExerciseId(exercises[0].id);
    }
  }, [exercises, selectedExerciseId]);

  const rangeDate = useMemo(() => {
    const now = new Date();
    if (range === "3m") return subWeeks(now, 12);
    if (range === "6m") return subWeeks(now, 26);
    if (range === "1y") return subWeeks(now, 52);
    return new Date(0);
  }, [range]);

  const dateFmt = range === "1y" || range === "all" ? "MMM d ''yy" : "MMM d";

  // Best e1RM per day — plotting every set would sawtooth downward with
  // fatigue inside each session and bury the actual trend.
  const e1rmData = useMemo<E1rmPoint[]>(() => {
    if (!strengthData) return [];
    const byDay = new Map<string, { date: Date; e1rm: number; weight: number; reps: number; isPR: boolean }>();
    for (const s of strengthData) {
      if (s.weight_kg == null || s.reps == null) continue;
      const d = new Date(s.logged_at);
      if (d < rangeDate) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const e1rm = estimateOneRepMax(s.weight_kg, s.reps);
      const cur = byDay.get(key);
      if (!cur || e1rm > cur.e1rm) {
        byDay.set(key, { date: d, e1rm, weight: s.weight_kg, reps: s.reps, isPR: s.is_pr ?? false });
      }
    }
    return [...byDay.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((p) => ({
        date: format(p.date, dateFmt),
        e1rm: unit === "lbs" ? p.e1rm * 2.20462 : p.e1rm,
        weight: unit === "lbs" ? p.weight * 2.20462 : p.weight,
        reps: p.reps,
        isPR: p.isPR,
      }));
  }, [strengthData, rangeDate, dateFmt, unit]);

  // Total sets / reps / best set for the selected exercise within range
  const exerciseStats = useMemo(() => {
    if (!strengthData) return null;
    let totalSets = 0;
    let totalReps = 0;
    let bestE1rm = 0;
    let bestWeightKg = 0;
    let bestReps = 0;
    for (const s of strengthData) {
      if (s.weight_kg == null || s.reps == null) continue;
      if (new Date(s.logged_at) < rangeDate) continue;
      totalSets += 1;
      totalReps += s.reps;
      const e1rm = estimateOneRepMax(s.weight_kg, s.reps);
      if (e1rm > bestE1rm) {
        bestE1rm = e1rm;
        bestWeightKg = s.weight_kg;
        bestReps = s.reps;
      }
    }
    return totalSets > 0 ? { totalSets, totalReps, bestWeightKg, bestReps } : null;
  }, [strengthData, rangeDate]);

  // Weekly sets — 12-week history
  const setsData = useMemo(() => {
    if (!workouts) return [];
    const weeks: { week: string; sets: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i));
      const weekEnd = endOfWeek(weekStart);
      const weekWorkouts = workouts.filter((w) => {
        const d = new Date(w.started_at);
        return d >= weekStart && d <= weekEnd;
      });
      const setCount = weekWorkouts.reduce((sum, w) => {
        const sets = (w.workout_sets as Array<unknown>) ?? [];
        return sum + sets.length;
      }, 0);
      weeks.push({ week: format(weekStart, "MMM d"), sets: setCount });
    }
    return weeks;
  }, [workouts]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderDot = (props: any) => {
    const { key, cx, cy, payload } = props as { key?: React.Key | null; cx?: number; cy?: number; payload?: E1rmPoint };
    if (cx == null || cy == null) return <g key={key} />;
    if (payload?.isPR) {
      return (
        <g key={key}>
          <circle cx={cx} cy={cy} r={3.5} fill="none" stroke="var(--color-redline)" strokeWidth={1.25} />
          <circle cx={cx} cy={cy} r={1.2} fill="var(--color-redline)" />
        </g>
      );
    }
    return (
      <circle
        key={key}
        cx={cx} cy={cy} r={2.5}
        fill="var(--color-sheet)"
        stroke="var(--color-text-secondary)"
        strokeWidth={1}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* FIG. 1 — strength plot */}
      <div className="sheet p-6">
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="fig-label mb-1">Strength (est. 1RM, {label.toLowerCase()})</p>
              <p className="label-caps" style={{ fontSize: 11 }}>
                Best set per session · <span style={{ color: "var(--color-redline)" }}>◦ record</span>
              </p>
            </div>
            {/* Range buttons */}
            <div className="flex gap-1 shrink-0">
              {(["3m", "6m", "1y", "all"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="px-2.5 py-1 font-display uppercase transition-all duration-150"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    borderRadius: 2,
                    backgroundColor: range === r ? "var(--color-paper)" : "transparent",
                    color: range === r ? "var(--color-ink)" : "var(--color-text-secondary)",
                    border: `1px solid ${range === r ? "var(--color-paper)" : "var(--color-line)"}`,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {/* Exercise selector — only exercises with logged sets */}
          {exercises && exercises.length > 0 ? (
            <div className="relative w-full">
              <select
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
                className="appearance-none w-full pl-3 pr-8 py-2 text-sm font-medium"
                style={{
                  backgroundColor: "var(--color-sheet-inset)",
                  border: "1px solid var(--color-line)",
                  color: "var(--color-text-primary)",
                  borderRadius: 2,
                  outline: "none",
                }}
              >
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--color-text-ghost)" }} />
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-ghost)" }}>
              Nothing plotted yet — log a session and the curve draws itself.
            </p>
          )}
        </div>

        {strengthLoading ? (
          <div className="skeleton h-48" />
        ) : e1rmData.length < 2 ? (
          <div className="h-48 flex items-center justify-center">
            <p style={{ color: "var(--color-text-ghost)", fontSize: 14 }}>
              Two sessions of this exercise are needed to draw a trend.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={e1rmData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-line)" strokeWidth={0.5} />
              <XAxis dataKey="date" tick={AXIS_TICK} axisLine={{ stroke: "var(--color-line-bright)" }} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={{ stroke: "var(--color-line-bright)" }} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip content={<StrengthTooltip />} cursor={false} />
              <Line
                type="linear"
                dataKey="e1rm"
                stroke="var(--color-paper)"
                strokeWidth={1.5}
                dot={renderDot}
                activeDot={<CrosshairDot />}
                isAnimationActive={true}
                animationDuration={900}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {exerciseStats && (
          <div
            className="grid gap-0 divide-x mt-5 pt-5 border-t"
            style={{ borderColor: "var(--color-line)", gridTemplateColumns: "1fr 1fr 1.6fr" }}
          >
            {[
              { label: "TOTAL SETS", value: String(exerciseStats.totalSets) },
              { label: "TOTAL REPS", value: String(exerciseStats.totalReps) },
              { label: "BEST SET", value: `${formatKg(exerciseStats.bestWeightKg, unit)} ${label} × ${exerciseStats.bestReps}` },
            ].map((stat) => (
              <div key={stat.label} className="px-4 first:pl-0" style={{ borderColor: "var(--color-line)" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--color-text-ghost)", marginBottom: 6, whiteSpace: "nowrap" }}>
                  {stat.label}
                </p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FIG. 2 — weekly sets */}
      <div className="sheet p-6">
        <div className="mb-5">
          <p className="fig-label mb-1">Weekly sets</p>
          <p className="label-caps" style={{ fontSize: 11 }}>Total sets, 12-week history</p>
        </div>
        {setsData.every((d) => d.sets === 0) ? (
          <div className="h-48 flex items-center justify-center">
            <p style={{ color: "var(--color-text-ghost)", fontSize: 14 }}>No sets on record yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={setsData} barCategoryGap="28%" margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <pattern id="bp-bar-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-text-secondary)" strokeWidth="1" opacity="0.5" />
                </pattern>
              </defs>
              <CartesianGrid stroke="var(--color-line)" strokeWidth={0.5} vertical={false} />
              <XAxis dataKey="week" tick={AXIS_TICK} axisLine={{ stroke: "var(--color-line-bright)" }} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={{ stroke: "var(--color-line-bright)" }} tickLine={false} />
              <Tooltip content={<SetsTooltip />} cursor={{ fill: "rgba(143, 180, 217, 0.06)" }} />
              <Bar dataKey="sets" fill="url(#bp-bar-hatch)" radius={[0, 0, 0, 0]}>
                {setsData.map((_, i) => (
                  <Cell
                    key={i}
                    stroke={i === setsData.length - 1 ? "var(--color-paper)" : "var(--color-line-bright)"}
                    strokeWidth={i === setsData.length - 1 ? 1.25 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
