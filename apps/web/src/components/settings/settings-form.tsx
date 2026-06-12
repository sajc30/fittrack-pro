"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProfile, useUpdateProfile } from "@/lib/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { Loader2, LogOut, Save } from "lucide-react";
import { DobPicker } from "@/components/ui/dob-picker";
import { HeightInput } from "@/components/ui/height-input";
import type { Database } from "@/lib/supabase/database.types";

type ActivityLevel = Database["public"]["Enums"]["activity_level"];
type FitnessGoal   = Database["public"]["Enums"]["fitness_goal"];
type Gender        = Database["public"]["Enums"]["gender_type"];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary",         label: "Sedentary"         },
  { value: "lightly_active",    label: "Lightly Active"    },
  { value: "moderately_active", label: "Moderately Active" },
  { value: "very_active",       label: "Very Active"       },
  { value: "extra_active",      label: "Extra Active"      },
];

const GOAL_OPTIONS: { value: FitnessGoal; label: string }[] = [
  { value: "lose_fat",     label: "Lose Fat"      },
  { value: "maintain",     label: "Maintain"      },
  { value: "build_muscle", label: "Build Muscle"  },
  { value: "strength",     label: "Pure Strength" },
];

export function SettingsForm() {
  const router   = useRouter();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [name,     setName]     = useState("");
  const [dob,      setDob]      = useState("");
  const [gender,   setGender]   = useState<Gender | "">("");
  const [height,     setHeight]     = useState("");
  const [weight,     setWeight]     = useState("");
  const [heightUnit, setHeightUnit] = useState<"metric" | "imperial">(() => {
    if (typeof window === "undefined") return "metric";
    return (localStorage.getItem("settings_heightUnit") as "metric" | "imperial") ?? "metric";
  });
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">(() => {
    if (typeof window === "undefined") return "kg";
    return (localStorage.getItem("settings_weightUnit") as "kg" | "lbs") ?? "kg";
  });
  // Ref so the profile useEffect can read the current unit without becoming a dep
  const weightUnitRef = useRef(weightUnit);
  const [activity, setActivity] = useState<ActivityLevel>("moderately_active");
  const [goal,     setGoal]     = useState<FitnessGoal>("build_muscle");
  const [saved,    setSaved]    = useState(false);

  // Keep ref in sync and persist unit preferences to localStorage
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
      // Convert the stored kg value into whatever unit the user currently has selected,
      // so the display stays consistent and the toggle doesn't reset after a save.
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

  // Convert displayed weight when unit toggles
  function handleWeightUnitChange(unit: "kg" | "lbs") {
    const current = parseFloat(weight);
    if (current && !isNaN(current)) {
      if (unit === "lbs" && weightUnit === "kg") {
        setWeight(String(Math.round(current * 2.20462 * 10) / 10));
      } else if (unit === "kg" && weightUnit === "lbs") {
        setWeight(String(Math.round((current / 2.20462) * 10) / 10));
      }
    }
    setWeightUnit(unit);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const rawWeight = parseFloat(weight);
    const weightKg  = weightUnit === "lbs" ? rawWeight / 2.20462 : rawWeight;

    await updateProfile.mutateAsync({
      user_id: profile.user_id,
      name:           name.trim(),
      date_of_birth:  dob || null,
      gender:         gender as Gender || null,
      height_cm:      parseFloat(height) || null,
      weight_kg:      rawWeight ? Math.round(weightKg * 10) / 10 : null,
      activity_level: activity,
      goal,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-5">
        <div className="rounded-xl border p-6 space-y-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="label-caps">Personal Info</p>

          <div>
            <label className="label-caps block mb-1.5">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")} onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")} />
          </div>

          <div>
            <label className="label-caps block mb-2">Date of Birth</label>
            <DobPicker value={dob} onChange={setDob} />
          </div>

          <div>
            <label className="label-caps block mb-2">Sex</label>
            <div className="grid grid-cols-2 gap-3">
              {(["male", "female"] as Gender[]).map((g) => (
                <button key={g} type="button" onClick={() => setGender(g)}
                  className="py-2.5 rounded-lg font-semibold text-sm capitalize transition-all duration-[120ms]"
                  style={{
                    backgroundColor: gender === g ? "var(--color-amber)" : "var(--color-inset)",
                    color: gender === g ? "var(--color-void)" : "var(--color-text-secondary)",
                    border: `1px solid ${gender === g ? "var(--color-amber)" : "var(--color-border)"}`,
                  }}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-6 space-y-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="label-caps">Body Stats</p>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-caps">Height</label>
              <div className="flex gap-1.5">
                {(["metric", "imperial"] as const).map((u) => (
                  <button key={u} type="button" onClick={() => setHeightUnit(u)}
                    className="px-2.5 py-1 rounded text-xs font-semibold transition-all duration-[120ms]"
                    style={{ backgroundColor: heightUnit === u ? "var(--color-amber)" : "var(--color-inset)", color: heightUnit === u ? "var(--color-void)" : "var(--color-text-secondary)", border: `1px solid ${heightUnit === u ? "var(--color-amber)" : "var(--color-border)"}` }}>
                    {u === "metric" ? "cm" : "ft·in"}
                  </button>
                ))}
              </div>
            </div>
            <HeightInput valueCm={height} onChange={setHeight} unit={heightUnit} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-caps">Weight</label>
              <div className="flex gap-1.5">
                {(["kg", "lbs"] as const).map((u) => (
                  <button key={u} type="button" onClick={() => handleWeightUnitChange(u)}
                    className="px-2.5 py-1 rounded text-xs font-semibold transition-all duration-[120ms]"
                    style={{
                      backgroundColor: weightUnit === u ? "var(--color-amber)" : "var(--color-inset)",
                      color: weightUnit === u ? "var(--color-void)" : "var(--color-text-secondary)",
                      border: `1px solid ${weightUnit === u ? "var(--color-amber)" : "var(--color-border)"}`,
                    }}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={weightUnit === "lbs" ? "e.g. 176" : "e.g. 80"}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
                onBlur={(e)  => (e.target.style.borderColor = "var(--color-border)")}
              />
              <span className="text-sm shrink-0" style={{ color: "var(--color-text-secondary)" }}>
                {weightUnit}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-6 space-y-4" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="label-caps">Training</p>

          <div>
            <label className="label-caps block mb-2">Activity Level</label>
            <div className="space-y-2">
              {ACTIVITY_OPTIONS.map((a) => (
                <button key={a.value} type="button" onClick={() => setActivity(a.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-left text-sm font-semibold transition-all duration-[120ms]"
                  style={{
                    backgroundColor: activity === a.value ? "var(--color-amber-dim)" : "var(--color-inset)",
                    color: activity === a.value ? "var(--color-amber)" : "var(--color-text-secondary)",
                    border: `1px solid ${activity === a.value ? "var(--color-amber)" : "var(--color-border)"}`,
                  }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-caps block mb-2">Goal</label>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button key={g.value} type="button" onClick={() => setGoal(g.value)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-[120ms]"
                  style={{
                    backgroundColor: goal === g.value ? "var(--color-amber)" : "var(--color-inset)",
                    color: goal === g.value ? "var(--color-void)" : "var(--color-text-secondary)",
                    border: `1px solid ${goal === g.value ? "var(--color-amber)" : "var(--color-border)"}`,
                  }}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-[120ms] disabled:opacity-50"
          style={{ backgroundColor: saved ? "var(--color-green)" : "var(--color-amber)", color: "var(--color-void)" }}
        >
          {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {updateProfile.isPending ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </button>
      </form>

      {/* Danger zone */}
      <div className="rounded-xl border p-6" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <p className="label-caps mb-4">Account</p>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-[120ms] hover:bg-red-950"
          style={{ color: "var(--color-red)", border: "1px solid rgba(220,38,38,0.3)" }}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
