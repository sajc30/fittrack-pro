"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useProfile } from "@/lib/hooks/use-profile";
import { useMeasurements, useAddMeasurement } from "@/lib/hooks/use-measurements";
import { calculateTDEE, calculateBMI } from "@fittrack/shared";
import { format } from "date-fns";
import { Plus, Loader2 } from "lucide-react";

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

export function BodyMetricsView() {
  const { data: profile } = useProfile();
  const { data: measurements, isLoading } = useMeasurements();
  const addMeasurement = useAddMeasurement();

  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

  // Read unit preferences saved in Settings
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [heightUnit, setHeightUnit] = useState<"metric" | "imperial">("metric");
  useEffect(() => {
    setWeightUnit((localStorage.getItem("settings_weightUnit") as "kg" | "lbs") ?? "kg");
    setHeightUnit((localStorage.getItem("settings_heightUnit") as "metric" | "imperial") ?? "metric");
  }, []);

  const latest = measurements?.[0];

  // TDEE calculation
  let tdee: number | null = null;
  if (profile?.weight_kg && profile?.height_cm && profile?.date_of_birth && profile?.gender && profile?.activity_level) {
    const dob = new Date(profile.date_of_birth);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
    const tdeeResult = calculateTDEE(
      profile.weight_kg,
      profile.height_cm,
      age,
      profile.gender as "male" | "female",
      profile.activity_level as Parameters<typeof calculateTDEE>[4]
    );
    tdee = tdeeResult.tdee;
  }

  const goal = profile?.goal ?? "maintain";
  const macros = MACRO_SPLIT[goal] ?? MACRO_SPLIT.maintain;
  const proteinCals = tdee ? Math.round(tdee * macros.protein) : null;
  const carbsCals   = tdee ? Math.round(tdee * macros.carbs)   : null;
  const fatCals     = tdee ? Math.round(tdee * macros.fat)     : null;

  const bmi = profile?.weight_kg && profile?.height_cm
    ? calculateBMI(profile.weight_kg, profile.height_cm)
    : null;

  const weightHistory = (measurements ?? [])
    .filter((m) => m.weight_kg !== null)
    .slice(0, 30)
    .reverse()
    .map((m) => ({
      date: format(new Date(m.measured_at), "MMM d"),
      weight: weightUnit === "lbs" ? kgToLbs(m.weight_kg as number) : (m.weight_kg as number),
    }));

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

  async function handleAddWeight() {
    const raw = parseFloat(weight);
    if (!raw) return;
    const kg = weightUnit === "lbs" ? raw / 2.20462 : raw;
    setSaving(true);
    await addMeasurement.mutateAsync({
      weight_kg: Math.round(kg * 10) / 10,
      measured_at: new Date().toISOString(),
    });
    setWeight("");
    setSaving(false);
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      {/* Weight Trend */}
      <div className="rounded-xl border p-6" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="label-caps mb-1">Weight Trend</p>
            {displayLatestWeight && (
              <div className="flex items-end gap-1.5">
                <span className="stat-mid" style={{ color: "var(--color-text-primary)" }}>{displayLatestWeight}</span>
                <span className="text-sm mb-0.5" style={{ color: "var(--color-text-secondary)" }}>{wUnit}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-[120ms]"
            style={{ backgroundColor: "var(--color-amber)", color: "var(--color-void)" }}
          >
            <Plus className="w-4 h-4" /> Log
          </button>
        </div>

        {showForm && (
          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ backgroundColor: "var(--color-inset)", border: "1px solid var(--color-border)" }}>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={`Weight (${wUnit})`}
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", outline: "none" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
            />
            <button
              onClick={handleAddWeight}
              disabled={!weight || saving}
              className="px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-amber)", color: "var(--color-void)" }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="skeleton h-40 rounded-xl" />
        ) : weightHistory.length < 2 ? (
          <div className="h-40 flex items-center justify-center">
            <p style={{ color: "var(--color-text-ghost)", fontSize: 14 }}>
              Log your weight at least twice to see the trend.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weightHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-text-ghost)" }} axisLine={false} tickLine={false} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "var(--color-text-ghost)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--color-raised)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${v} ${wUnit}`, "Weight"]}
              />
              <Line type="monotone" dataKey="weight" stroke="var(--color-amber)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "var(--color-amber)", stroke: "none" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* TDEE & Macros */}
      {tdee && (
        <div className="rounded-xl border p-6" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="label-caps mb-5">Daily Calorie Target</p>
          <div className="flex items-end gap-2 mb-6">
            <span className="stat-large" style={{ color: "var(--color-amber)" }}>{tdee.toLocaleString()}</span>
            <span className="text-sm mb-1.5" style={{ color: "var(--color-text-secondary)" }}>kcal / day (TDEE)</span>
          </div>

          {/* Macro bars */}
          <div className="space-y-4">
            {[
              { label: "Protein", cals: proteinCals!, grams: Math.round(proteinCals! / 4), color: "var(--color-amber)", pct: macros.protein },
              { label: "Carbs",   cals: carbsCals!,   grams: Math.round(carbsCals! / 4),   color: "var(--color-blue)",  pct: macros.carbs },
              { label: "Fat",     cals: fatCals!,     grams: Math.round(fatCals! / 9),      color: "var(--color-red)",   pct: macros.fat },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{m.label}</span>
                  <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{m.grams}g · {m.cals} kcal</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-inset)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.pct * 100}%`, backgroundColor: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Height", value: displayHeight },
          { label: "Weight", value: displayLatestWeight ? `${displayLatestWeight} ${wUnit}` : displayProfileWeight ? `${displayProfileWeight} ${wUnit}` : "—" },
          { label: "BMI",           value: bmi ? String(bmi) : "—" },
          { label: "Activity",      value: profile?.activity_level?.replace("_", " ") ?? "—" },
          { label: "Goal",          value: profile?.goal?.replace("_", " ") ?? "—" },
          { label: "Measurements",  value: measurements ? `${measurements.length} entries` : "—" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border p-4" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="label-caps mb-2">{stat.label}</p>
            <p className="stat-small capitalize" style={{ color: "var(--color-text-primary)" }}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
