"use client";

import { useState } from "react";
import { useExercises } from "@/lib/hooks/use-exercises";
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from "@fittrack/shared";
import type { Database } from "@/lib/supabase/database.types";

type MuscleGroup = Database["public"]["Enums"]["muscle_group"];
type Equipment   = Database["public"]["Enums"]["equipment_type"];

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: "barbell",    label: "Barbell"    },
  { value: "dumbbell",   label: "Dumbbell"   },
  { value: "cable",      label: "Cable"      },
  { value: "machine",    label: "Machine"    },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "bands",      label: "Bands"      },
  { value: "other",      label: "Other"      },
];

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 font-display uppercase whitespace-nowrap transition-all duration-150"
      style={{
        fontSize: 11,
        letterSpacing: "0.1em",
        borderRadius: 2,
        backgroundColor: active ? "var(--color-paper)" : "transparent",
        color: active ? "var(--color-ink)" : "var(--color-text-secondary)",
        border: `1px solid ${active ? "var(--color-paper)" : "var(--color-line)"}`,
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
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          width="14" height="14" viewBox="0 0 16 16" fill="none"
          style={{ color: "var(--color-text-ghost)" }}
        >
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.25" />
          <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search index…"
          className="w-full pl-9 pr-4 py-2.5 text-sm"
          style={{
            fontFamily: "var(--font-mono)",
            backgroundColor: "var(--color-sheet-inset)",
            border: "1px solid var(--color-line)",
            color: "var(--color-text-primary)",
            borderRadius: 2,
            outline: "none",
            letterSpacing: "0.04em",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--color-line)")}
        />
      </div>

      {/* Equipment filter */}
      <div>
        <p className="fig-label mb-2" style={{ fontSize: 11 }}>Equipment type</p>
        <div className="flex gap-1.5 flex-wrap">
          <FilterChip label="All" active={equipment === "all"} onClick={() => setEquipment("all")} />
          {EQUIPMENT_OPTIONS.map((eq) => (
            <FilterChip
              key={eq.value}
              label={eq.label}
              active={equipment === eq.value}
              onClick={() => setEquipment(equipment === eq.value ? "all" : eq.value)}
            />
          ))}
        </div>
      </div>

      {/* Muscle group filter */}
      <div>
        <p className="fig-label mb-2" style={{ fontSize: 11 }}>Muscle group</p>
        <div className="flex gap-1.5 flex-wrap">
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

      {/* Count + clear */}
      <div
        className="flex items-center justify-between py-2 border-b"
        style={{ borderColor: "var(--color-line-bright)" }}
      >
        <p className="fig-label" style={{ fontSize: 11 }}>
          {isLoading ? "SCANNING…" : `${exercises?.length ?? 0} ENTRIES`}
        </p>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="fig-label transition-opacity duration-150 hover:opacity-60"
            style={{ fontSize: 11, color: "var(--color-redline)" }}
          >
            ✕ CLEAR FILTERS
          </button>
        )}
      </div>

      {/* Catalog index */}
      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton h-12" style={{ borderRadius: 0 }} />
          ))}
        </div>
      ) : (exercises ?? []).length === 0 ? (
        <div
          className="py-16 flex flex-col items-center gap-3 border"
          style={{ borderColor: "var(--color-line)", borderStyle: "dashed", borderRadius: 2 }}
        >
          <p className="fig-label" style={{ fontSize: 12 }}>
            {search ? `NO MATCH — "${search.toUpperCase()}"` : "NO ENTRIES MATCH FILTERS"}
          </p>
          <button onClick={clearAll} className="bp-btn-outline" style={{ fontSize: 11 }}>
            CLEAR FILTERS
          </button>
        </div>
      ) : (
        <div className="sheet overflow-hidden">
          {/* Table header */}
          <div
            className="grid px-4 py-2 border-b gap-x-4"
            style={{
              gridTemplateColumns: "2.5rem 1fr 7rem",
              borderColor: "var(--color-line-bright)",
              backgroundColor: "var(--color-sheet-inset)",
            }}
          >
            {["NO.", "EXERCISE", "EQUIPMENT"].map((h) => (
              <span key={h} className="fig-label" style={{ fontSize: 10 }}>{h}</span>
            ))}
          </div>

          {(exercises ?? []).map((ex, i) => (
            <div
              key={ex.id}
              className="grid px-4 py-3 border-b gap-x-4 transition-colors duration-100"
              style={{
                gridTemplateColumns: "2.5rem 1fr 7rem",
                borderColor: "var(--color-line)",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-sheet-inset)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {/* Row number */}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-ghost)", paddingTop: 1 }}>
                {String(i + 1).padStart(3, "0")}
              </span>

              {/* Name + muscle info */}
              <div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.3 }}>
                  {ex.name}
                </p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2, letterSpacing: "0.06em" }}>
                  {MUSCLE_GROUP_LABELS[ex.muscle_group as MuscleGroup] ?? ex.muscle_group}
                  {(ex.secondary_muscles as string[]).length > 0 && (
                    <span style={{ color: "var(--color-text-ghost)" }}>
                      {" · "}
                      {(ex.secondary_muscles as string[]).slice(0, 2).map((m) => MUSCLE_GROUP_LABELS[m as MuscleGroup] ?? m).join(", ")}
                    </span>
                  )}
                </p>
              </div>

              {/* Equipment */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  color: "var(--color-text-ghost)",
                  border: "1px solid var(--color-line)",
                  borderRadius: 2,
                  padding: "2px 6px",
                  display: "inline-flex",
                  alignItems: "center",
                  width: "fit-content",
                  height: "fit-content",
                  marginTop: 2,
                }}
              >
                {EQUIPMENT_OPTIONS.find((e) => e.value === ex.equipment)?.label.toUpperCase() ?? ex.equipment.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
