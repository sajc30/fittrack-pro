"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useExercises } from "@/lib/hooks/use-exercises";
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from "@fittrack/shared";
import type { Database } from "@/lib/supabase/database.types";

type MuscleGroup = Database["public"]["Enums"]["muscle_group"];
type Equipment   = Database["public"]["Enums"]["equipment_type"];

const EQUIPMENT_OPTIONS: { value: Equipment; label: string; color: string }[] = [
  { value: "barbell",     label: "Barbell",     color: "#F59E0B" },
  { value: "dumbbell",    label: "Dumbbell",    color: "#3B82F6" },
  { value: "cable",       label: "Cable",       color: "#8B5CF6" },
  { value: "machine",     label: "Machine",     color: "#6B7280" },
  { value: "bodyweight",  label: "Bodyweight",  color: "#16A34A" },
  { value: "kettlebell",  label: "Kettlebell",  color: "#EF4444" },
  { value: "bands",       label: "Bands",       color: "#EC4899" },
  { value: "other",       label: "Other",       color: "#9CA3AF" },
];

const EQUIPMENT_COLOR: Record<string, string> = Object.fromEntries(
  EQUIPMENT_OPTIONS.map((e) => [e.value, e.color])
);

function FilterChip({
  label,
  active,
  activeColor,
  onClick,
}: {
  label: string;
  active: boolean;
  activeColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-[120ms]"
      style={{
        backgroundColor: active ? (activeColor ?? "var(--color-amber)") : "var(--color-surface)",
        color: active ? (activeColor ? "white" : "var(--color-void)") : "var(--color-text-secondary)",
        border: `1px solid ${active ? (activeColor ?? "var(--color-amber)") : "var(--color-border)"}`,
      }}
    >
      {label}
    </button>
  );
}

export function ExerciseLibrary() {
  const [search,    setSearch]    = useState("");
  const [muscle,    setMuscle]    = useState<MuscleGroup | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");

  const { data: exercises, isLoading } = useExercises(muscle, search, equipment);

  const hasFilters = muscle !== "all" || equipment !== "all" || search.trim() !== "";

  function clearAll() {
    setSearch("");
    setMuscle("all");
    setEquipment("all");
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--color-text-ghost)" }}
        />
        <input
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

      {/* Equipment filter */}
      <div>
        <p className="label-caps mb-2">Equipment</p>
        <div className="flex gap-2 flex-wrap">
          <FilterChip label="All" active={equipment === "all"} onClick={() => setEquipment("all")} />
          {EQUIPMENT_OPTIONS.map((eq) => (
            <FilterChip
              key={eq.value}
              label={eq.label}
              active={equipment === eq.value}
              activeColor={eq.color}
              onClick={() => setEquipment(equipment === eq.value ? "all" : eq.value)}
            />
          ))}
        </div>
      </div>

      {/* Muscle group filter */}
      <div>
        <p className="label-caps mb-2">Muscle Group</p>
        <div className="flex gap-2 flex-wrap">
          <FilterChip label="All" active={muscle === "all"} onClick={() => setMuscle("all")} />
          {MUSCLE_GROUP_ORDER.map((mg) => (
            <FilterChip
              key={mg}
              label={MUSCLE_GROUP_LABELS[mg]}
              active={muscle === mg}
              onClick={() => setMuscle(muscle === mg ? "all" : (mg as MuscleGroup))}
            />
          ))}
        </div>
      </div>

      {/* Active filter summary + clear */}
      <div className="flex items-center justify-between">
        <p className="label-caps">
          {isLoading ? "Loading…" : `${exercises?.length ?? 0} exercises`}
        </p>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors duration-[120ms] hover:opacity-80"
            style={{ color: "var(--color-amber)" }}
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : (exercises ?? []).length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p style={{ color: "var(--color-text-ghost)", fontSize: 14 }}>
            {search ? `No exercises matching "${search}"` : "No exercises match the selected filters."}
          </p>
          <button onClick={clearAll} className="text-sm font-medium" style={{ color: "var(--color-amber)" }}>
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(exercises ?? []).map((ex) => (
            <div
              key={ex.id}
              className="rounded-xl border p-4 transition-all duration-[120ms] hover:border-[var(--color-border-bright)]"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-semibold leading-snug" style={{ color: "var(--color-text-primary)" }}>
                  {ex.name}
                </p>
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold shrink-0"
                  style={{
                    backgroundColor: `${EQUIPMENT_COLOR[ex.equipment] ?? "#6B7280"}18`,
                    color: EQUIPMENT_COLOR[ex.equipment] ?? "#6B7280",
                    border: `1px solid ${EQUIPMENT_COLOR[ex.equipment] ?? "#6B7280"}30`,
                  }}
                >
                  {EQUIPMENT_OPTIONS.find((e) => e.value === ex.equipment)?.label ?? ex.equipment}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="label-caps" style={{ color: "var(--color-amber)" }}>
                  {MUSCLE_GROUP_LABELS[ex.muscle_group as MuscleGroup] ?? ex.muscle_group}
                </span>
                {(ex.secondary_muscles as string[]).slice(0, 2).map((m) => (
                  <span key={m} className="label-caps">
                    {MUSCLE_GROUP_LABELS[m as MuscleGroup] ?? m}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
