"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useExercises } from "@/lib/hooks/use-exercises";
import { CreateExerciseForm } from "@/components/exercises/create-exercise-form";
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from "@fittrack/shared";
import type { Database } from "@/lib/supabase/database.types";

type Exercise   = Database["public"]["Tables"]["exercises"]["Row"];
type MuscleGroup = Database["public"]["Enums"]["muscle_group"];
type Equipment  = Database["public"]["Enums"]["equipment_type"];

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: "barbell",    label: "Barbell" },
  { value: "dumbbell",   label: "Dumbbell" },
  { value: "cable",      label: "Cable" },
  { value: "machine",    label: "Machine" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "bands",      label: "Bands" },
  { value: "other",      label: "Other" },
];

type FilterTab = "muscle" | "equipment";

interface Props {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExercisePicker({ onSelect, onClose }: Props) {
  const [search,    setSearch]    = useState("");
  const [muscle,    setMuscle]    = useState<MuscleGroup | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [tab,       setTab]       = useState<FilterTab>("equipment");
  const [creating,  setCreating]  = useState(false);

  const { data: exercises, isLoading } = useExercises(muscle, search, equipment);

  const activeFilterCount =
    (muscle !== "all" ? 1 : 0) + (equipment !== "all" ? 1 : 0);

  function clearAll() {
    setMuscle("all");
    setEquipment("all");
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

  if (creating) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "var(--color-ink)" }}>
        <div
          className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--color-line)", backgroundColor: "var(--color-sheet)" }}
        >
          <button onClick={() => setCreating(false)} className="p-1.5" style={{ color: "var(--color-text-secondary)", borderRadius: 2 }}>
            <X className="w-5 h-5" />
          </button>
          <h2 className="fig-label flex-1">Index — new custom exercise</h2>
        </div>
        <CreateExerciseForm
          onCreated={(ex) => onSelect(ex)}
          onCancel={() => setCreating(false)}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "var(--color-ink)" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
        style={{ borderColor: "var(--color-line)", backgroundColor: "var(--color-sheet)" }}
      >
        <button onClick={onClose} className="p-1.5" style={{ color: "var(--color-text-secondary)", borderRadius: 2 }}>
          <X className="w-5 h-5" />
        </button>
        <h2 className="fig-label flex-1">Index — choose exercise</h2>
        <button
          onClick={() => setCreating(true)}
          className="bp-btn-outline px-2.5 py-1 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> New
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearAll} className="bp-btn-outline px-2.5 py-1">
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-5 pt-4 pb-2 shrink-0">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--color-text-ghost)" }}
          />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the index…"
            className="w-full pl-10 pr-4 py-2.5 text-sm"
            style={{
              backgroundColor: "var(--color-sheet-inset)",
              border: "1px solid var(--color-line)",
              color: "var(--color-text-primary)",
              borderRadius: 2,
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
            onBlur={(e)  => (e.target.style.borderColor = "var(--color-line)")}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-5 pb-2 shrink-0">
        <div
          className="flex gap-1 p-1"
          style={{ backgroundColor: "var(--color-sheet)", border: "1px solid var(--color-line)", borderRadius: 2 }}
        >
          {(["equipment", "muscle"] as FilterTab[]).map((t) => {
            const active = tab === t;
            const filtered = (t === "equipment" && equipment !== "all") || (t === "muscle" && muscle !== "all");
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-1.5 font-display uppercase transition-all duration-150"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  borderRadius: 1,
                  backgroundColor: active ? "var(--color-paper)" : "transparent",
                  color: active ? "var(--color-ink)" : "var(--color-text-secondary)",
                }}
              >
                {t}{filtered ? " ◆" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Equipment chips */}
      {tab === "equipment" && (
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto shrink-0">
          <button
            onClick={() => setEquipment("all")}
            className="px-3 py-1.5 whitespace-nowrap shrink-0 transition-all duration-150"
            style={chip(equipment === "all")}
          >
            All
          </button>
          {EQUIPMENT_OPTIONS.map((eq) => (
            <button
              key={eq.value}
              onClick={() => setEquipment(equipment === eq.value ? "all" : eq.value)}
              className="px-3 py-1.5 whitespace-nowrap shrink-0 transition-all duration-150"
              style={chip(equipment === eq.value)}
            >
              {eq.label}
            </button>
          ))}
        </div>
      )}

      {/* Muscle chips */}
      {tab === "muscle" && (
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto shrink-0">
          <button
            onClick={() => setMuscle("all")}
            className="px-3 py-1.5 whitespace-nowrap shrink-0 transition-all duration-150"
            style={chip(muscle === "all")}
          >
            All
          </button>
          {MUSCLE_GROUP_ORDER.map((mg) => (
            <button
              key={mg}
              onClick={() => setMuscle(muscle === mg ? "all" : (mg as MuscleGroup))}
              className="px-3 py-1.5 whitespace-nowrap shrink-0 transition-all duration-150"
              style={chip(muscle === mg)}
            >
              {MUSCLE_GROUP_LABELS[mg]}
            </button>
          ))}
        </div>
      )}

      {/* Result count */}
      {!isLoading && (
        <div className="px-5 pb-2 shrink-0">
          <p className="label-caps">{exercises?.length ?? 0} on file</p>
        </div>
      )}

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-14" />
            ))}
          </div>
        ) : (exercises ?? []).length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p style={{ color: "var(--color-text-ghost)", fontSize: 14 }}>
              Nothing in the index matches your filters.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={clearAll} className="bp-btn-outline px-3 py-1.5">
                Clear all filters
              </button>
              <button
                onClick={() => setCreating(true)}
                className="bp-btn-outline px-3 py-1.5 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> New custom exercise
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {(exercises ?? []).map((ex) => (
              <button
                key={ex.id}
                onClick={() => onSelect(ex)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 hover:bg-[var(--color-sheet-raised)]"
                style={{
                  backgroundColor: "var(--color-sheet)",
                  border: "1px solid var(--color-line)",
                  borderRadius: 2,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                    {ex.name}
                  </p>
                  <p className="label-caps mt-0.5" style={{ fontSize: 11 }}>
                    {MUSCLE_GROUP_LABELS[ex.muscle_group as MuscleGroup] ?? ex.muscle_group}
                    {(ex.secondary_muscles as string[]).length > 0 &&
                      ` · ${(ex.secondary_muscles as string[])
                        .slice(0, 2)
                        .map((m) => MUSCLE_GROUP_LABELS[m as MuscleGroup] ?? m)
                        .join(", ")}`}
                  </p>
                </div>
                <span
                  className="font-display shrink-0 px-2 py-0.5"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-text-secondary)",
                    border: "1px solid var(--color-line)",
                    borderRadius: 1,
                  }}
                >
                  {EQUIPMENT_OPTIONS.find((e) => e.value === ex.equipment)?.label ?? ex.equipment}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
