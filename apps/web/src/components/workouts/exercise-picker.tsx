"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useExercises } from "@/lib/hooks/use-exercises";
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from "@fittrack/shared";
import type { Database } from "@/lib/supabase/database.types";

type Exercise   = Database["public"]["Tables"]["exercises"]["Row"];
type MuscleGroup = Database["public"]["Enums"]["muscle_group"];
type Equipment  = Database["public"]["Enums"]["equipment_type"];

const EQUIPMENT_OPTIONS: { value: Equipment; label: string; emoji: string }[] = [
  { value: "barbell",    label: "Barbell",    emoji: "🏋️" },
  { value: "dumbbell",   label: "Dumbbell",   emoji: "💪" },
  { value: "cable",      label: "Cable",      emoji: "🔗" },
  { value: "machine",    label: "Machine",    emoji: "⚙️" },
  { value: "bodyweight", label: "Bodyweight", emoji: "🤸" },
  { value: "kettlebell", label: "Kettlebell", emoji: "🔔" },
  { value: "bands",      label: "Bands",      emoji: "〰️" },
  { value: "other",      label: "Other",      emoji: "➕" },
];

const EQUIPMENT_COLOR: Record<string, string> = {
  barbell: "#F59E0B", dumbbell: "#3B82F6", cable: "#8B5CF6",
  machine: "#6B7280", bodyweight: "#16A34A", kettlebell: "#EF4444",
  bands: "#EC4899", other: "#9CA3AF",
};

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

  const { data: exercises, isLoading } = useExercises(muscle, search, equipment);

  const activeFilterCount =
    (muscle !== "all" ? 1 : 0) + (equipment !== "all" ? 1 : 0);

  function clearAll() {
    setMuscle("all");
    setEquipment("all");
  }

  const chipStyle = (active: boolean, color?: string) => ({
    backgroundColor: active ? (color ?? "var(--color-amber)") : "var(--color-surface)",
    color: active ? (color ? "white" : "var(--color-void)") : "var(--color-text-secondary)",
    border: `1px solid ${active ? (color ?? "var(--color-amber)") : "var(--color-border)"}`,
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "var(--color-void)" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
        style={{ borderColor: "var(--color-border)" }}
      >
        <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--color-text-secondary)" }}>
          <X className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-base flex-1" style={{ color: "var(--color-text-primary)" }}>
          Choose Exercise
        </h2>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs font-medium px-2.5 py-1 rounded-lg"
            style={{ color: "var(--color-amber)", border: "1px solid var(--color-amber-dim)", backgroundColor: "var(--color-amber-dim)" }}
          >
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
            placeholder="Search exercises…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
            onBlur={(e)  => (e.target.style.borderColor = "var(--color-border)")}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-5 pb-2 shrink-0">
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          {(["equipment", "muscle"] as FilterTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-[120ms]"
              style={{
                backgroundColor: tab === t ? "var(--color-amber)" : "transparent",
                color: tab === t ? "var(--color-void)" : "var(--color-text-secondary)",
              }}
            >
              {t}{t === "equipment" && equipment !== "all" ? " ✓" : ""}{t === "muscle" && muscle !== "all" ? " ✓" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment chips */}
      {tab === "equipment" && (
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto shrink-0">
          <button
            onClick={() => setEquipment("all")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-[120ms]"
            style={chipStyle(equipment === "all")}
          >
            All
          </button>
          {EQUIPMENT_OPTIONS.map((eq) => (
            <button
              key={eq.value}
              onClick={() => setEquipment(equipment === eq.value ? "all" : eq.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all duration-[120ms]"
              style={chipStyle(equipment === eq.value, EQUIPMENT_COLOR[eq.value])}
            >
              <span>{eq.emoji}</span>
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
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-[120ms]"
            style={chipStyle(muscle === "all")}
          >
            All
          </button>
          {MUSCLE_GROUP_ORDER.map((mg) => (
            <button
              key={mg}
              onClick={() => setMuscle(muscle === mg ? "all" : (mg as MuscleGroup))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-[120ms]"
              style={chipStyle(muscle === mg)}
            >
              {MUSCLE_GROUP_LABELS[mg]}
            </button>
          ))}
        </div>
      )}

      {/* Result count */}
      {!isLoading && (
        <div className="px-5 pb-2 shrink-0">
          <p className="label-caps">{exercises?.length ?? 0} exercises</p>
        </div>
      )}

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : (exercises ?? []).length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p style={{ color: "var(--color-text-ghost)", fontSize: 14 }}>
              No exercises match your filters.
            </p>
            <button
              onClick={clearAll}
              className="text-sm font-medium"
              style={{ color: "var(--color-amber)" }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {(exercises ?? []).map((ex) => (
              <button
                key={ex.id}
                onClick={() => onSelect(ex)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-[120ms] hover:bg-[var(--color-surface)]"
                style={{ border: "1px solid var(--color-border)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                    {ex.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-amber)" }}>
                    {MUSCLE_GROUP_LABELS[ex.muscle_group as MuscleGroup] ?? ex.muscle_group}
                    {(ex.secondary_muscles as string[]).length > 0 &&
                      ` · ${(ex.secondary_muscles as string[])
                        .slice(0, 2)
                        .map((m) => MUSCLE_GROUP_LABELS[m as MuscleGroup] ?? m)
                        .join(", ")}`}
                  </p>
                </div>
                {/* Equipment badge */}
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded shrink-0"
                  style={{
                    backgroundColor: `${EQUIPMENT_COLOR[ex.equipment] ?? "#6B7280"}20`,
                    color: EQUIPMENT_COLOR[ex.equipment] ?? "#6B7280",
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
