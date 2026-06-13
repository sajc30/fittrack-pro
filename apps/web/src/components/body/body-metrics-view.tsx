"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useProfile } from "@/lib/hooks/use-profile";
import { useMeasurements, useAddMeasurement } from "@/lib/hooks/use-measurements";
import { calculateTDEE, calculateBMI } from "@fittrack/shared";
import { format } from "date-fns";

function kgToLbs(kg: number) { return Math.round(kg * 2.20462 * 10) / 10; }
function cmToFtIn(cm: number) {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  return `${ft}'${inches}"`;
}

const MACRO_SPLIT: Record<string, { protein: number; carbs: number; fat: number }> = {
  lose_fat:     { protein: 0.40, carbs: 0.30, fat: 0.30 },
  maintain:     { protein: 0.30, carbs: 0.40, fat: 0.30 },
  build_muscle: { protein: 0.30, carbs: 0.45, fat: 0.25 },
  strength:     { protein: 0.35, carbs: 0.45, fat: 0.20 },
};

const AXIS_TICK = {
  fontSize: 11,
  fill: "var(--color-text-ghost)",
  fontFamily: "var(--font-mono)",
} as const;

function WeightTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; weight: number } }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{
      backgroundColor: "var(--color-sheet-raised)",
      border: "1px solid var(--color-line-bright)",
      borderRadius: 2,
      padding: "8px 12px",
      fontFamily: "var(--font-mono)",
      letterSpacing: "0.06em",
    }}>
      <p style={{ color: "var(--color-text-primary)", fontSize: 13 }}>{p.weight} KG</p>
      <p style={{ color: "var(--color-text-secondary)", fontSize: 11, marginTop: 2 }}>{p.date.toUpperCase()}</p>
    </div>
  );
}

export function BodyMetricsView() {
  const { data: profile } = useProfile();
  const { data: measurements, isLoading } = useMeasurements();
  const addMeasurement = useAddMeasurement();

  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [heightUnit, setHeightUnit] = useState<"metric" | "imperial">("metric");
  useEffect(() => {
    setWeightUnit((localStorage.getItem("settings_weightUnit") as "kg" | "lbs") ?? "kg");
    setHeightUnit((localStorage.getItem("settings_heightUnit") as "metric" | "imperial") ?? "metric");
  }, []);

  const latest = measurements?.[0];

  // Use latest logged weight for TDEE if available, otherwise fall back to profile weight
  const weightForCalcs = latest?.weight_kg ?? profile?.weight_kg;

  const tdee = useMemo(() => {
    if (!weightForCalcs || !profile?.height_cm || !profile?.date_of_birth || !profile?.gender || !profile?.activity_level) return null;
    const dob = new Date(profile.date_of_birth);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
    return calculateTDEE(
      weightForCalcs,
      profile.height_cm,
      age,
      profile.gender as "male" | "female",
      profile.activity_level as Parameters<typeof calculateTDEE>[4]
    ).tdee;
  }, [weightForCalcs, profile]);

  const goal = profile?.goal ?? "maintain";
  const macros = MACRO_SPLIT[goal] ?? MACRO_SPLIT.maintain;
  const proteinCals = tdee ? Math.round(tdee * macros.protein) : null;
  const carbsCals   = tdee ? Math.round(tdee * macros.carbs)   : null;
  const fatCals     = tdee ? Math.round(tdee * macros.fat)     : null;

  const bmi = weightForCalcs && profile?.height_cm
    ? calculateBMI(weightForCalcs, profile.height_cm)
    : null;

  const wUnit = weightUnit === "lbs" ? "lbs" : "kg";
  const displayLatestWeight = latest?.weight_kg
    ? weightUnit === "lbs" ? kgToLbs(latest.weight_kg) : latest.weight_kg
    : null;
  const displayProfileWeight = profile?.weight_kg
    ? weightUnit === "lbs" ? kgToLbs(profile.weight_kg) : profile.weight_kg
    : null;
  const displayHeight = profile?.height_cm
    ? heightUnit === "imperial" ? cmToFtIn(profile.height_cm) : `${profile.height_cm} cm`
    : "—";

  const weightHistory = useMemo(() =>
    (measurements ?? [])
      .filter((m) => m.weight_kg !== null)
      .slice(0, 30)
      .reverse()
      .map((m) => ({
        date: format(new Date(m.measured_at), "MMM d"),
        weight: weightUnit === "lbs" ? kgToLbs(m.weight_kg as number) : (m.weight_kg as number),
      })),
    [measurements, weightUnit]
  );

  async function handleAddWeight() {
    const raw = parseFloat(weight);
    if (!raw) return;
    const kg = weightUnit === "lbs" ? raw / 2.20462 : raw;
    setSaving(true);
    setSaveError(null);
    try {
      await addMeasurement.mutateAsync({
        weight_kg: Math.round(kg * 10) / 10,
        measured_at: new Date().toISOString(),
      });
      setWeight("");
      setShowForm(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save measurement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Weight Trend */}
      <div className="sheet p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="fig-label mb-1.5">Fig. 1 — Weight trend ({wUnit})</p>
            {displayLatestWeight != null ? (
              <div className="flex items-end gap-2">
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 28,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {displayLatestWeight}
                </span>
                <span className="mb-1" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-ghost)" }}>
                  {wUnit}
                </span>
              </div>
            ) : (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-ghost)" }}>
                NO MEASUREMENT ON FILE
              </p>
            )}
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setSaveError(null); }}
            className="bp-btn-outline"
            style={{ fontSize: 12 }}
          >
            + LOG
          </button>
        </div>

        {showForm && (
          <div
            className="flex flex-col gap-3 mb-5 p-4"
            style={{
              backgroundColor: "var(--color-sheet-inset)",
              border: "1px solid var(--color-line-bright)",
              borderRadius: 2,
            }}
          >
            <p className="fig-label" style={{ fontSize: 11 }}>New entry — weight ({wUnit})</p>
            <div className="flex gap-3">
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddWeight()}
                placeholder={`e.g. ${weightUnit === "lbs" ? "185.0" : "84.0"}`}
                className="flex-1 px-3 py-2 text-sm"
                style={{
                  fontFamily: "var(--font-mono)",
                  backgroundColor: "var(--color-sheet)",
                  border: "1px solid var(--color-line)",
                  color: "var(--color-text-primary)",
                  borderRadius: 2,
                  outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--color-line)")}
                autoFocus
              />
              <button
                onClick={handleAddWeight}
                disabled={!weight || saving}
                className="bp-btn"
                style={{ fontSize: 12, opacity: (!weight || saving) ? 0.5 : 1 }}
              >
                {saving ? "FILING…" : "FILE"}
              </button>
            </div>
            {saveError && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-redline)" }}>
                ✕ {saveError}
              </p>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="skeleton h-40" />
        ) : weightHistory.length < 2 ? (
          <div className="h-40 flex items-center justify-center border" style={{ borderColor: "var(--color-line)", borderStyle: "dashed", borderRadius: 2 }}>
            <p className="fig-label" style={{ fontSize: 12 }}>Log twice to draw the trend</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weightHistory} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-line)" strokeWidth={0.5} />
              <XAxis dataKey="date" tick={AXIS_TICK} axisLine={{ stroke: "var(--color-line-bright)" }} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={{ stroke: "var(--color-line-bright)" }} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip content={<WeightTooltip />} cursor={false} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--color-paper)"
                strokeWidth={1.5}
                dot={{ r: 2.5, fill: "var(--color-sheet)", stroke: "var(--color-text-secondary)", strokeWidth: 1 }}
                activeDot={{ r: 4, fill: "none", stroke: "var(--color-paper)", strokeWidth: 1.5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* TDEE & Macros */}
      {tdee && (
        <div className="sheet p-6">
          <p className="fig-label mb-1">Fig. 2 — Daily energy target</p>
          <p className="label-caps mb-5" style={{ fontSize: 11 }}>
            {profile?.goal?.replace(/_/g, " ").toUpperCase() ?? "MAINTAIN"} · TDEE estimate
          </p>

          <div className="flex items-end gap-3 mb-6 pb-5" style={{ borderBottom: "1px solid var(--color-line)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 36, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>
              {tdee.toLocaleString()}
            </span>
            <span className="mb-1.5" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-ghost)" }}>
              kcal / day
            </span>
          </div>

          <div className="space-y-4">
            {[
              { label: "PROTEIN", cals: proteinCals!, grams: Math.round(proteinCals! / 4), pct: macros.protein },
              { label: "CARBS",   cals: carbsCals!,   grams: Math.round(carbsCals! / 4),   pct: macros.carbs },
              { label: "FAT",     cals: fatCals!,     grams: Math.round(fatCals! / 9),      pct: macros.fat },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex items-center mb-1.5">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)", letterSpacing: "0.08em", minWidth: 72 }}>
                    {m.label}
                  </span>
                  <span className="leader-dots flex-1" />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-primary)" }}>
                    {m.grams}g
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-ghost)", marginLeft: 8 }}>
                    {m.cals} kcal
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden" style={{ backgroundColor: "var(--color-sheet-inset)", borderRadius: 0 }}>
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${m.pct * 100}%`,
                      background: `repeating-linear-gradient(
                        -45deg,
                        var(--color-text-secondary) 0px,
                        var(--color-text-secondary) 1px,
                        transparent 1px,
                        transparent 5px
                      )`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body stats */}
      <div className="sheet p-6">
        <p className="fig-label mb-4">Fig. 3 — Body specs</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-0 divide-x divide-y" style={{ borderColor: "var(--color-line)" }}>
          {[
            { label: "HEIGHT",       value: displayHeight },
            { label: "WEIGHT",       value: displayLatestWeight != null ? `${displayLatestWeight} ${wUnit}` : displayProfileWeight != null ? `${displayProfileWeight} ${wUnit}` : "—" },
            { label: "BMI",          value: bmi ? String(bmi) : "—" },
            { label: "ACTIVITY",     value: profile?.activity_level?.replace(/_/g, " ").toUpperCase() ?? "—" },
            { label: "GOAL",         value: profile?.goal?.replace(/_/g, " ").toUpperCase() ?? "—" },
            { label: "ENTRIES",      value: measurements ? `${measurements.length}` : "—" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4"
              style={{ borderColor: "var(--color-line)" }}
            >
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--color-text-ghost)", marginBottom: 6 }}>
                {stat.label}
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
