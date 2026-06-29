"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile, useUpdateProfile } from "@/lib/hooks/use-profile";
import { useMeasurements, useAddMeasurement } from "@/lib/hooks/use-measurements";
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

export function SettingsForm() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: measurements } = useMeasurements();
  const addMeasurement = useAddMeasurement();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting,        setIsDeleting]        = useState(false);
  const [deleteError,       setDeleteError]       = useState<string | null>(null);

  const [name,       setName]       = useState("");
  const [dob,        setDob]        = useState("");
  const [gender,     setGender]     = useState<Gender | "">("");
  const [height,     setHeight]     = useState("");
  const [weight,     setWeight]     = useState("");
  const [activity,   setActivity]   = useState<ActivityLevel>("moderately_active");
  const [goal,       setGoal]       = useState<FitnessGoal>("build_muscle");
  const [saved,      setSaved]      = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);

  // Imperial-only across the app (ft/in + lbs). DB stores cm/kg; convert at display/entry.

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setDob(profile.date_of_birth ?? "");
      setGender((profile.gender as Gender) ?? "");
      setHeight(String(profile.height_cm ?? ""));
      // The measurement log is the source of truth for "current" weight once one exists;
      // the profile field is only the fallback for accounts with no logged entries yet.
      const kg = measurements?.[0]?.weight_kg ?? profile.weight_kg ?? 0;
      setWeight(kg ? String(Math.round(kg * 2.20462 * 10) / 10) : "");
      setActivity((profile.activity_level as ActivityLevel) ?? "moderately_active");
      setGoal((profile.goal as FitnessGoal) ?? "build_muscle");
    }
  }, [profile, measurements]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaveError(null);
    const rawWeight = parseFloat(weight);
    const weightKg  = rawWeight ? Math.round((rawWeight / 2.20462) * 10) / 10 : null;
    const currentKnownWeightKg = measurements?.[0]?.weight_kg ?? profile.weight_kg ?? null;
    const weightChanged = weightKg !== null &&
      (currentKnownWeightKg === null || Math.abs(weightKg - currentKnownWeightKg) > 0.05);

    try {
      await updateProfile.mutateAsync({
        user_id:        profile.user_id,
        name:           name.trim(),
        date_of_birth:  dob || null,
        gender:         (gender as Gender) || null,
        height_cm:      parseFloat(height) || null,
        activity_level: activity,
        goal,
      });
      // Logging a measurement (rather than patching profiles directly) keeps Settings
      // and the Body/Dashboard weight log on the same timeline, see use-measurements.ts.
      if (weightChanged && weightKg !== null) {
        await addMeasurement.mutateAsync({ weight_kg: weightKg, measured_at: new Date().toISOString() });
      }
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

  async function handleDeleteAccount() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete account");
      }

      await supabase.auth.signOut();
      router.push("/auth/login");
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account");
      setIsDeleting(false);
    }
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
            <HeightInput valueCm={height} onChange={setHeight} />
          </FieldRow>

          <FieldRow label="Body weight">
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 176"
                style={MONO_INPUT}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
                onBlur={(e)  => (e.target.style.borderColor = "var(--color-line)")}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-ghost)", whiteSpace: "nowrap" }}>
                lbs
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
        <div className="flex items-center gap-3 flex-wrap">
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
          <a
            href="/support"
            className="px-4 py-2.5 font-display uppercase transition-all duration-150"
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              borderRadius: 2,
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-line)",
            }}
          >
            SUPPORT
          </a>
          <a
            href="/privacy"
            className="px-4 py-2.5 font-display uppercase transition-all duration-150"
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              borderRadius: 2,
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-line)",
            }}
          >
            PRIVACY POLICY
          </a>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2.5 font-display uppercase transition-all duration-150"
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              borderRadius: 2,
              color: "var(--color-text-ghost)",
              border: "1px solid var(--color-line)",
            }}
          >
            DELETE ACCOUNT
          </button>
        </div>

        {showDeleteConfirm && (
          <div
            className="mt-4 px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
            style={{
              border: "1px solid var(--color-redline)",
              borderRadius: 2,
              backgroundColor: "color-mix(in srgb, var(--color-redline) 6%, transparent)",
            }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-redline)" }}>
                Delete your account?
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                Your profile, workouts, and all logged data are permanently erased. This cannot be undone.
              </p>
              {deleteError && (
                <p className="text-xs mt-1.5" style={{ color: "var(--color-redline)" }}>
                  ✕ {deleteError}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                className="bp-btn-outline h-8 px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="h-8 px-4 font-display uppercase disabled:opacity-60"
                style={{
                  backgroundColor: "var(--color-redline)",
                  color: "var(--color-ink)",
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  borderRadius: 2,
                }}
              >
                {isDeleting ? "DELETING…" : "DELETE PERMANENTLY"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
