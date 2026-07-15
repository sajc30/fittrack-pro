"use client";

import { useState } from "react";
import { useCreateExercise } from "@/lib/hooks/use-exercises";
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_ORDER,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUP_ORDER,
} from "@fittrack/shared";
import type { Database } from "@/lib/supabase/database.types";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type MuscleGroup = Database["public"]["Enums"]["muscle_group"];
type Equipment = Database["public"]["Enums"]["equipment_type"];

interface Props {
  onCreated: (exercise: Exercise) => void;
  onCancel: () => void;
}

export function CreateExerciseForm({ onCreated, onCancel }: Props) {
  const createExercise = useCreateExercise();
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [secondary, setSecondary] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<Equipment>("barbell");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && muscle !== null && !createExercise.isPending;

  function toggleSecondary(mg: MuscleGroup) {
    setSecondary((prev) =>
      prev.includes(mg) ? prev.filter((m) => m !== mg) : [...prev, mg]
    );
  }

  async function handleSubmit() {
    if (!muscle) return;
    setError(null);
    try {
      const created = await createExercise.mutateAsync({
        name: name.trim(),
        muscle_group: muscle,
        secondary_muscles: secondary.filter((m) => m !== muscle),
        equipment,
      });
      onCreated(created);
    } catch {
      setError("Could not file the exercise — check your connection and try again.");
    }
  }

  const chip = (active: boolean) => ({
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    borderRadius: 2,
    backgroundColor: active ? "var(--color-paper)" : "transparent",
    color: active ? "var(--color-ink)" : "var(--color-text-secondary)",
    border: `1px solid ${active ? "var(--color-paper)" : "var(--color-line)"}`,
  });

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-8 pt-4">
      <p className="fig-label mb-1.5">New entry — custom exercise</p>
      <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
        Filed to your personal index only — it won&apos;t appear for other lifters.
      </p>

      <label className="label-caps block mb-2" htmlFor="exercise-name">Exercise name</label>
      <input
        id="exercise-name"
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Landmine Press"
        className="w-full px-4 py-3 text-sm font-medium mb-5"
        style={{
          backgroundColor: "var(--color-sheet-inset)",
          border: "1px solid var(--color-line)",
          color: "var(--color-text-primary)",
          borderRadius: 2,
          outline: "none",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--color-line)")}
      />

      <p className="label-caps mb-2">Primary muscle</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {MUSCLE_GROUP_ORDER.map((mg) => (
          <button
            key={mg}
            onClick={() => setMuscle(mg as MuscleGroup)}
            className="px-3 py-1.5 transition-all duration-150"
            style={chip(muscle === mg)}
          >
            {MUSCLE_GROUP_LABELS[mg]}
          </button>
        ))}
      </div>

      <p className="label-caps mb-2">Secondary muscles (optional)</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {MUSCLE_GROUP_ORDER.filter((mg) => mg !== muscle).map((mg) => (
          <button
            key={mg}
            onClick={() => toggleSecondary(mg as MuscleGroup)}
            className="px-3 py-1.5 transition-all duration-150"
            style={chip(secondary.includes(mg as MuscleGroup))}
          >
            {MUSCLE_GROUP_LABELS[mg]}
          </button>
        ))}
      </div>

      <p className="label-caps mb-2">Equipment</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {EQUIPMENT_ORDER.map((eq) => (
          <button
            key={eq}
            onClick={() => setEquipment(eq as Equipment)}
            className="px-3 py-1.5 transition-all duration-150"
            style={chip(equipment === eq)}
          >
            {EQUIPMENT_LABELS[eq]}
          </button>
        ))}
      </div>

      {error && (
        <p
          className="text-sm mb-4 px-3 py-2"
          style={{ color: "var(--color-redline)", border: "1px solid var(--color-redline)", borderRadius: 2 }}
        >
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bp-btn flex-1 py-3"
        >
          {createExercise.isPending ? "Filing…" : "File exercise"}
        </button>
        <button onClick={onCancel} className="bp-btn-outline px-5 py-3">
          Cancel
        </button>
      </div>
    </div>
  );
}
