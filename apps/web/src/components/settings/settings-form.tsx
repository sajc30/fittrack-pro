"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProfile, useUpdateProfile } from "@/lib/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { DobPicker } from "@/components/ui/dob-picker";
import { HeightInput } from "@/components/ui/height-input";
import type { Database } from "@/lib/supabase/database.types";

type ActivityLevel = Database["public"]["Enums"]["activity_level"];
type FitnessGoal   = Database["public"]["Enums"]["fitness_goal"];
type Gender        = Database["public"]["Enums"]["gender_type"];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; annotation: string }[] = [
  { value: "sedentary",         label: "Sedentary",          annotation: "desk job, no exercise" },
  { value: "lightly_active",    label: "Lightly Active",     annotation: "1–3 days / week"       },
  { value: "moderately_active", label: "Moderately Active",  annotation: "3–5 days / week"       },
  { value: "very_active",       label: "Very Active",        annotation: "6–7 days / week"       },
  { value: "extra_active",      label: "Extra Active",       annotation: "twice/day training"    },
];

const GOAL_OPTIONS: { value: FitnessGoal; label: string }[] = [
  { value: "lose_fat",     label: "Lose Fat"      },
  { value: "maintain",     label: "Maintain"      },
  { value: "build_muscle", label: "Build Muscle"  },
  { value: "strength",     label: "Pure Strength" },
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

function Section({ fig, title, children }: { fig: string; title: string; children: React.ReactNode }) {
  return (
    <div className="sheet p-6 space-y-5">
      <div className="pb-3 border-b" style={{ borderColor: "var(--color-line)" }}>
        <p className="fig-label mb-0.5" style={{ fontSize: 11 }}>{fig}</p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-secondary)", letterSpacing: "0.06em" }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="fig-label mb-2" style={{ fontSize: 10 }}>{label}</p>
      {children}
    </div>
  );
}

function UnitToggle({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="px-2.5 py-1 font-display uppercase transition-all duration-150"
          style={{
            fontSize: 11,
            letterSpacing: "0.1em",
            borderRadius: 2,
            backgroundColor: value === o.value ? "var(--color-paper)" : "transparent",
            color: value === o.value ? "var(--color-ink)" : "var(--color-text-ghost)",
            border: `1px solid ${value === o.value ? "var(--color-paper)" : "var(--color-line)"}`,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsForm() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [name,       setName]       = useState("");
  const [dob,        setDob]        = useState("");
  const [gender,     setGender]     = useState<Gender | "">("");
  const [height,     setHeight]     = useState("");
  const [weight,     setWeight]     = useState("");
  const [activity,   setActivity]   = useState<ActivityLevel>("moderately_active");
  const [goal,       setGoal]       = useState<FitnessGoal>("build_muscle");
  const [saved,      setSaved]      = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);

  const [heightUnit, setHeightUnit] = useState<"metric" | "imperial">(() => {
    if (typeof window === "undefined") return "metric";
    return (localStorage.getItem("settings_heightUnit") as "metric" | "imperial") ?? "metric";
  });
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">(() => {
    if (typeof window === "undefined") return "kg";
    return (localStorage.getItem("settings_weightUnit") as "kg" | "lbs") ?? "kg";
  });
  const weightUnitRef = useRef(weightUnit);

  useEffect(() => {
    weightUnitRef.current = weightUnit;
    localStorage.setItem("settings_weightUnit", weightUnit);
  }, [weightUnit]);

  useEffect(() => {
    localStorage.setItem("settings_heightUnit", heightUnit);
  }, [heightUnit]);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setDob(profile.date_of_birth ?? "");
      setGender((profile.gender as Gender) ?? "");
      setHeight(String(profile.height_cm ?? ""));
      const kg = profile.weight_kg ?? 0;
      setWeight(
        kg
          ? weightUnitRef.current === "lbs"
            ? String(Math.round(kg * 2.20462 * 10) / 10)
            : String(kg)
          : ""
      );
      setActivity((profile.activity_level as ActivityLevel) ?? "moderately_active");
      setGoal((profile.goal as FitnessGoal) ?? "build_muscle");
    }
  }, [profile]);

  function handleWeightUnitChange(unit: string) {
    const u = unit as "kg" | "lbs";
    const current = parseFloat(weight);
    if (current && !isNaN(current)) {
      if (u === "lbs" && weightUnit === "kg") {
        setWeight(String(Math.round(current * 2.20462 * 10) / 10));
      } else if (u === "kg" && weightUnit === "lbs") {
        setWeight(String(Math.round((current / 2.20462) * 10) / 10));
      }
    }
    setWeightUnit(u);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaveError(null);
    const rawWeight = parseFloat(weight);
    const weightKg  = weightUnit === "lbs" ? rawWeight / 2.20462 : rawWeight;
    try {
      await updateProfile.mutateAsync({
        user_id:        profile.user_id,
        name:           name.trim(),
        date_of_birth:  dob || null,
        gender:         (gender as Gender) || null,
        height_cm:      parseFloat(height) || null,
        weight_kg:      rawWeight ? Math.round(weightKg * 10) / 10 : null,
        activity_level: activity,
        goal,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save settings");
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-32" style={{ borderRadius: 2 }} />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-5">
        {/* Personal info */}
        <Section fig="Spec A — Personal" title="IDENTITY">
          <FieldRow label="Display name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Chen"
              style={MONO_INPUT}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
              onBlur={(e)  => (e.target.style.borderColor = "var(--color-line)")}
            />
          </FieldRow>

          <FieldRow label="Date of birth">
            <DobPicker value={dob} onChange={setDob} />
          </FieldRow>

          <FieldRow label="Sex">
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
          </FieldRow>
        </Section>

        {/* Body stats */}
        <Section fig="Spec B — Biometrics" title="BODY STATS">
          <FieldRow label="Height">
            <div className="flex items-center justify-between mb-2">
              <span />
              <UnitToggle
                options={[{ value: "metric", label: "CM" }, { value: "imperial", label: "FT·IN" }]}
                value={heightUnit}
                onChange={(v) => setHeightUnit(v as "metric" | "imperial")}
              />
            </div>
            <HeightInput valueCm={height} onChange={setHeight} unit={heightUnit} />
          </FieldRow>

          <FieldRow label="Body weight">
            <div className="flex items-center justify-between mb-2">
              <span />
              <UnitToggle
                options={[{ value: "kg", label: "KG" }, { value: "lbs", label: "LBS" }]}
                value={weightUnit}
                onChange={handleWeightUnitChange}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={weightUnit === "lbs" ? "e.g. 176" : "e.g. 80"}
                style={MONO_INPUT}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
                onBlur={(e)  => (e.target.style.borderColor = "var(--color-line)")}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-ghost)", whiteSpace: "nowrap" }}>
                {weightUnit}
              </span>
            </div>
          </FieldRow>
        </Section>

        {/* Training */}
        <Section fig="Spec C — Training" title="PROGRAMME">
          <FieldRow label="Activity level">
            <div className="space-y-1.5">
              {ACTIVITY_OPTIONS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setActivity(a.value)}
                  className="w-full px-4 py-2.5 text-left flex items-center justify-between transition-all duration-150"
                  style={{
                    borderRadius: 2,
                    backgroundColor: activity === a.value ? "rgba(143,180,217,0.08)" : "transparent",
                    border: `1px solid ${activity === a.value ? "var(--color-line-bright)" : "var(--color-line)"}`,
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: activity === a.value ? "var(--color-text-primary)" : "var(--color-text-secondary)", letterSpacing: "0.06em" }}>
                    {a.label.toUpperCase()}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-ghost)", letterSpacing: "0.06em" }}>
                    {a.annotation}
                  </span>
                </button>
              ))}
            </div>
          </FieldRow>

          <FieldRow label="Goal">
            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  className="py-2.5 font-display uppercase transition-all duration-150"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    borderRadius: 2,
                    backgroundColor: goal === g.value ? "var(--color-paper)" : "transparent",
                    color: goal === g.value ? "var(--color-ink)" : "var(--color-text-secondary)",
                    border: `1px solid ${goal === g.value ? "var(--color-paper)" : "var(--color-line)"}`,
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </FieldRow>
        </Section>

        {saveError && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-redline)" }}>
            ✕ {saveError}
          </p>
        )}

        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="w-full py-3 font-display uppercase tracking-widest transition-all duration-150 disabled:opacity-50"
          style={{
            fontSize: 12,
            borderRadius: 2,
            backgroundColor: saved ? "rgba(34,197,94,0.15)" : "var(--color-paper)",
            color: saved ? "rgb(34,197,94)" : "var(--color-ink)",
            border: `1px solid ${saved ? "rgba(34,197,94,0.5)" : "var(--color-paper)"}`,
          }}
        >
          {updateProfile.isPending ? "FILING…" : saved ? "✓ FILED" : "FILE CHANGES"}
        </button>
      </form>

      {/* Account */}
      <div className="sheet p-6">
        <div className="pb-3 mb-4 border-b" style={{ borderColor: "var(--color-line)" }}>
          <p className="fig-label" style={{ fontSize: 11 }}>Spec D — Account</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 font-display uppercase transition-all duration-150"
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            borderRadius: 2,
            color: "var(--color-redline)",
            border: "1px solid rgba(220,38,38,0.3)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          SIGN OUT
        </button>
      </div>
    </div>
  );
}
