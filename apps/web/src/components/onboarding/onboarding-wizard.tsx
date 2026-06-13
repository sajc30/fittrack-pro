"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DobPicker } from "@/components/ui/dob-picker";
import { HeightInput } from "@/components/ui/height-input";
import type { Database } from "@/lib/supabase/database.types";

type ActivityLevel = Database["public"]["Enums"]["activity_level"];
type FitnessGoal   = Database["public"]["Enums"]["fitness_goal"];
type Gender        = Database["public"]["Enums"]["gender_type"];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; annotation: string }[] = [
  { value: "sedentary",         label: "Sedentary",         annotation: "desk job, no exercise"   },
  { value: "lightly_active",    label: "Lightly Active",    annotation: "1–3 days / week"         },
  { value: "moderately_active", label: "Moderately Active", annotation: "3–5 days / week"         },
  { value: "very_active",       label: "Very Active",       annotation: "6–7 days / week"         },
  { value: "extra_active",      label: "Extra Active",      annotation: "twice/day training"      },
];

const GOAL_OPTIONS: { value: FitnessGoal; label: string; annotation: string }[] = [
  { value: "lose_fat",     label: "Lose Fat",      annotation: "reduce body fat %" },
  { value: "maintain",     label: "Maintain",      annotation: "hold current composition" },
  { value: "build_muscle", label: "Build Muscle",  annotation: "gain strength + mass" },
  { value: "strength",     label: "Pure Strength", annotation: "maximise 1RM" },
];

const STEPS = [
  { num: "01", label: "IDENTITY" },
  { num: "02", label: "BIOMETRICS" },
  { num: "03", label: "PROGRAMME" },
];

const MONO_INPUT = {
  fontFamily: "var(--font-mono)",
  backgroundColor: "var(--color-sheet-inset)",
  border: "1px solid var(--color-line)",
  color: "var(--color-text-primary)",
  borderRadius: 2,
  padding: "10px 12px",
  fontSize: 13,
  letterSpacing: "0.04em",
  width: "100%",
  outline: "none",
} as const;

export function OnboardingWizard({ userId, existingName }: { userId: string; existingName: string }) {
  const router = useRouter();
  const [step,   setStep]   = useState(0);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  // Step 0
  const [name,   setName]   = useState(existingName || "");
  const [dob,    setDob]    = useState("");
  const [gender, setGender] = useState<Gender | "">("");

  // Step 1
  const [heightCm,  setHeightCm]  = useState("");
  const [weightVal, setWeightVal] = useState("");
  const [unit,      setUnit]      = useState<"metric" | "imperial">("metric");

  // Step 2
  const [activity, setActivity] = useState<ActivityLevel>("moderately_active");
  const [goal,     setGoal]     = useState<FitnessGoal>("build_muscle");

  function canAdvance(): boolean {
    if (step === 0) return name.trim().length > 0 && dob !== "" && gender !== "";
    if (step === 1) return heightCm !== "" && weightVal !== "";
    return true;
  }

  async function handleFinish() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    let weightKg = parseFloat(weightVal);
    if (unit === "imperial") weightKg = weightKg / 2.20462;

    const { error: err } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        date_of_birth: dob,
        gender: gender as Gender,
        height_cm: Math.round(parseFloat(heightCm) * 10) / 10,
        weight_kg: Math.round(weightKg * 10) / 10,
        activity_level: activity,
        goal,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <span
                className="font-display"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  color: i === step ? "var(--color-paper)" : i < step ? "var(--color-text-secondary)" : "var(--color-text-ghost)",
                  borderBottom: i === step ? "1px solid var(--color-paper)" : "1px solid transparent",
                  paddingBottom: 2,
                }}
              >
                {s.num} {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 mx-3 h-px"
                style={{ backgroundColor: i < step ? "var(--color-line-bright)" : "var(--color-line)" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step card */}
      <div
        className="p-8 space-y-5"
        style={{
          backgroundColor: "var(--color-sheet)",
          border: "1px solid var(--color-line)",
          borderRadius: 2,
        }}
      >
        <div className="pb-4 border-b" style={{ borderColor: "var(--color-line)" }}>
          <p className="fig-label mb-0.5" style={{ fontSize: 11 }}>{STEPS[step].num} — {STEPS[step].label}</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-ghost)" }}>
            {step === 0 && "Personal details for your drawing set"}
            {step === 1 && "Body measurements — used for TDEE calculation"}
            {step === 2 && "Training programme parameters"}
          </p>
        </div>

        {/* ── Step 0: Identity ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <p className="fig-label mb-2" style={{ fontSize: 10 }}>Display name</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Chen"
                style={MONO_INPUT}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
                onBlur={(e)  => (e.target.style.borderColor = "var(--color-line)")}
              />
            </div>

            <div>
              <p className="fig-label mb-2" style={{ fontSize: 10 }}>Date of birth</p>
              <DobPicker value={dob} onChange={setDob} />
            </div>

            <div>
              <p className="fig-label mb-2" style={{ fontSize: 10 }}>Sex</p>
              <div className="grid grid-cols-2 gap-2">
                {(["male", "female"] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className="py-2.5 font-display uppercase transition-all duration-150"
                    style={{
                      fontSize: 12,
                      letterSpacing: "0.08em",
                      borderRadius: 2,
                      backgroundColor: gender === g ? "var(--color-paper)" : "transparent",
                      color: gender === g ? "var(--color-ink)" : "var(--color-text-secondary)",
                      border: `1px solid ${gender === g ? "var(--color-paper)" : "var(--color-line)"}`,
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Biometrics ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="fig-label mb-2" style={{ fontSize: 10 }}>Unit system</p>
              <div className="flex gap-1.5">
                {([
                  { value: "metric",   label: "METRIC" },
                  { value: "imperial", label: "IMPERIAL" },
                ] as const).map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setUnit(u.value)}
                    className="px-3 py-1.5 font-display uppercase transition-all duration-150"
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      borderRadius: 2,
                      backgroundColor: unit === u.value ? "var(--color-paper)" : "transparent",
                      color: unit === u.value ? "var(--color-ink)" : "var(--color-text-ghost)",
                      border: `1px solid ${unit === u.value ? "var(--color-paper)" : "var(--color-line)"}`,
                    }}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="fig-label mb-2" style={{ fontSize: 10 }}>Height</p>
              <HeightInput valueCm={heightCm} onChange={setHeightCm} unit={unit} />
            </div>

            <div>
              <p className="fig-label mb-2" style={{ fontSize: 10 }}>Body weight ({unit === "imperial" ? "lbs" : "kg"})</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={weightVal}
                  onChange={(e) => setWeightVal(e.target.value)}
                  placeholder={unit === "imperial" ? "e.g. 176" : "e.g. 80"}
                  style={MONO_INPUT}
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
                  onBlur={(e)  => (e.target.style.borderColor = "var(--color-line)")}
                />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-ghost)", whiteSpace: "nowrap" }}>
                  {unit === "imperial" ? "lbs" : "kg"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Programme ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <p className="fig-label mb-2" style={{ fontSize: 10 }}>Goal</p>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGoal(g.value)}
                    className="px-3 py-3 text-left transition-all duration-150"
                    style={{
                      borderRadius: 2,
                      backgroundColor: goal === g.value ? "rgba(143,180,217,0.08)" : "transparent",
                      border: `1px solid ${goal === g.value ? "var(--color-line-bright)" : "var(--color-line)"}`,
                    }}
                  >
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: goal === g.value ? "var(--color-text-primary)" : "var(--color-text-secondary)", letterSpacing: "0.06em" }}>
                      {g.label.toUpperCase()}
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-ghost)", marginTop: 2, letterSpacing: "0.04em" }}>
                      {g.annotation}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="fig-label mb-2" style={{ fontSize: 10 }}>Activity level</p>
              <div className="space-y-1.5">
                {ACTIVITY_OPTIONS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setActivity(a.value)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-all duration-150"
                    style={{
                      borderRadius: 2,
                      backgroundColor: activity === a.value ? "rgba(143,180,217,0.08)" : "transparent",
                      border: `1px solid ${activity === a.value ? "var(--color-line-bright)" : "var(--color-line)"}`,
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: activity === a.value ? "var(--color-text-primary)" : "var(--color-text-secondary)", letterSpacing: "0.06em" }}>
                      {a.label.toUpperCase()}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-ghost)", letterSpacing: "0.04em" }}>
                      {a.annotation}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-redline)",
            border: "1px solid rgba(220,38,38,0.3)",
            backgroundColor: "rgba(220,38,38,0.06)",
            borderRadius: 2,
            padding: "8px 12px",
          }}>
            ✕ {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--color-line)" }}>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="bp-btn-outline"
              style={{ fontSize: 11 }}
            >
              ← BACK
            </button>
          )}
          <button
            type="button"
            disabled={!canAdvance() || saving}
            onClick={() => {
              if (step < STEPS.length - 1) setStep((s) => s + 1);
              else handleFinish();
            }}
            className="flex-1 py-3 font-display uppercase tracking-widest transition-all duration-150 disabled:opacity-50"
            style={{
              fontSize: 12,
              borderRadius: 2,
              backgroundColor: "var(--color-paper)",
              color: "var(--color-ink)",
            }}
          >
            {saving ? "FILING…" : step < STEPS.length - 1 ? "CONTINUE →" : "FILE & OPEN →"}
          </button>
        </div>
      </div>
    </div>
  );
}
