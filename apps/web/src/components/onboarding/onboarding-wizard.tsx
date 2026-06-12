"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { DobPicker } from "@/components/ui/dob-picker";
import { HeightInput } from "@/components/ui/height-input";
import type { Database } from "@/lib/supabase/database.types";

type ActivityLevel = Database["public"]["Enums"]["activity_level"];
type FitnessGoal = Database["public"]["Enums"]["fitness_goal"];
type Gender = Database["public"]["Enums"]["gender_type"];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: "sedentary",         label: "Sedentary",         desc: "Desk job, little to no exercise" },
  { value: "lightly_active",    label: "Lightly Active",    desc: "Light exercise 1–3 days/week" },
  { value: "moderately_active", label: "Moderately Active", desc: "Moderate exercise 3–5 days/week" },
  { value: "very_active",       label: "Very Active",       desc: "Hard exercise 6–7 days/week" },
  { value: "extra_active",      label: "Extra Active",      desc: "Very hard exercise or physical job" },
];

const GOAL_OPTIONS: { value: FitnessGoal; label: string; desc: string; emoji: string }[] = [
  { value: "lose_fat",      label: "Lose Fat",      desc: "Reduce body fat percentage",      emoji: "🔥" },
  { value: "maintain",      label: "Maintain",      desc: "Keep current weight and fitness", emoji: "⚖️" },
  { value: "build_muscle",  label: "Build Muscle",  desc: "Gain strength and muscle mass",   emoji: "💪" },
  { value: "strength",      label: "Pure Strength", desc: "Maximize 1RM on key lifts",       emoji: "🏋️" },
];

const STEPS = ["About You", "Body Stats", "Your Goal"];

export function OnboardingWizard({ userId, existingName }: { userId: string; existingName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 0 — About You
  const [name, setName] = useState(existingName || "");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender | "">("");

  // Step 1 — Body Stats
  const [heightCm, setHeightCm] = useState("");
  const [weightVal, setWeightVal] = useState("");
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");

  // Step 2 — Goal
  const [activity, setActivity] = useState<ActivityLevel>("moderately_active");
  const [goal, setGoal] = useState<FitnessGoal>("build_muscle");

  const inputStyle = {
    backgroundColor: "var(--color-inset)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    outline: "none",
  } as const;

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
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200"
                style={{
                  backgroundColor: i < step ? "var(--color-green)" : i === step ? "var(--color-amber)" : "var(--color-border)",
                  color: i <= step ? "var(--color-void)" : "var(--color-text-ghost)",
                }}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className="text-xs font-medium hidden sm:block"
                style={{ color: i === step ? "var(--color-text-primary)" : "var(--color-text-ghost)" }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-2" style={{ backgroundColor: i < step ? "var(--color-green)" : "var(--color-border)" }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div
        className="rounded-2xl border p-8"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* ── Step 0: About You ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                Tell us about yourself
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                This helps personalise your experience.
              </p>
            </div>

            <div>
              <label className="label-caps block mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
              />
            </div>

            <div>
              <label className="label-caps block mb-2">Date of Birth</label>
              <DobPicker value={dob} onChange={setDob} />
            </div>

            <div>
              <label className="label-caps block mb-2">Sex</label>
              <div className="grid grid-cols-2 gap-3">
                {(["male", "female"] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className="py-3 rounded-xl font-semibold text-sm capitalize transition-all duration-[120ms]"
                    style={{
                      backgroundColor: gender === g ? "var(--color-amber)" : "var(--color-inset)",
                      color: gender === g ? "var(--color-void)" : "var(--color-text-secondary)",
                      border: `1px solid ${gender === g ? "var(--color-amber)" : "var(--color-border)"}`,
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Body Stats ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                Your body stats
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Used to calculate your TDEE and track progress.
              </p>
            </div>

            {/* Unit system toggle */}
            <div>
              <label className="label-caps block mb-2">Unit System</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "metric",   label: "Metric (cm / kg)" },
                  { value: "imperial", label: "Imperial (ft·in / lbs)" },
                ] as const).map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setUnit(u.value)}
                    className="py-2.5 px-3 rounded-lg font-semibold text-sm transition-all duration-[120ms]"
                    style={{
                      backgroundColor: unit === u.value ? "var(--color-amber)" : "var(--color-inset)",
                      color: unit === u.value ? "var(--color-void)" : "var(--color-text-secondary)",
                      border: `1px solid ${unit === u.value ? "var(--color-amber)" : "var(--color-border)"}`,
                    }}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label-caps block mb-1.5">Height</label>
              <HeightInput valueCm={heightCm} onChange={setHeightCm} unit={unit} />
            </div>

            <div>
              <label className="label-caps block mb-1.5">
                Weight ({unit === "imperial" ? "lbs" : "kg"})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={weightVal}
                  onChange={(e) => setWeightVal(e.target.value)}
                  placeholder={unit === "imperial" ? "e.g. 176" : "e.g. 80"}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
                />
                <span className="text-sm shrink-0" style={{ color: "var(--color-text-secondary)" }}>
                  {unit === "imperial" ? "lbs" : "kg"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Goal ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                What&apos;s your goal?
              </h2>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                We&apos;ll tailor your calorie targets and suggestions.
              </p>
            </div>

            <div className="space-y-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-[120ms]"
                  style={{
                    backgroundColor: goal === g.value ? "var(--color-amber-dim)" : "var(--color-inset)",
                    border: `1px solid ${goal === g.value ? "var(--color-amber)" : "var(--color-border)"}`,
                  }}
                >
                  <span className="text-xl">{g.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: goal === g.value ? "var(--color-amber)" : "var(--color-text-primary)" }}>
                      {g.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{g.desc}</p>
                  </div>
                  {goal === g.value && <Check className="w-4 h-4 shrink-0" style={{ color: "var(--color-amber)" }} />}
                </button>
              ))}
            </div>

            <div>
              <label className="label-caps block mb-2">Activity Level</label>
              <div className="space-y-2">
                {ACTIVITY_OPTIONS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setActivity(a.value)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-[120ms]"
                    style={{
                      backgroundColor: activity === a.value ? "var(--color-amber-dim)" : "var(--color-inset)",
                      border: `1px solid ${activity === a.value ? "var(--color-amber)" : "var(--color-border)"}`,
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: activity === a.value ? "var(--color-amber)" : "var(--color-text-primary)" }}>
                        {a.label}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{a.desc}</p>
                    </div>
                    {activity === a.value && <Check className="w-4 h-4 shrink-0" style={{ color: "var(--color-amber)" }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm mt-4 px-3 py-2 rounded-lg" style={{ color: "var(--color-red)", backgroundColor: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)" }}>
            {error}
          </p>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-8">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-[120ms]"
              style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)", backgroundColor: "var(--color-inset)" }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <button
            type="button"
            disabled={!canAdvance() || saving}
            onClick={() => {
              if (step < STEPS.length - 1) setStep((s) => s + 1);
              else handleFinish();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all duration-[120ms] disabled:opacity-50"
            style={{ backgroundColor: "var(--color-amber)", color: "var(--color-void)" }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {step < STEPS.length - 1 ? (
              <>Continue <ChevronRight className="w-4 h-4" /></>
            ) : saving ? "Saving…" : "Let's Go →"}
          </button>
        </div>
      </div>
    </div>
  );
}
