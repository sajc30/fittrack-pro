"use client";

import { useState } from "react";
import Link from "next/link";
import { useWeightUnit, formatKg, fromKg, toKg } from "@/lib/hooks/use-weight-unit";
import {
  useWorkouts,
  useDeleteWorkout,
  useUpdateWorkout,
  useUpdateSet,
  useDeleteSet,
  useLogSet,
} from "@/lib/hooks/use-workouts";
import {
  Clock, ChevronDown, ChevronUp,
  Plus, Trash2, Pencil, Check, Loader2, MoreHorizontal,
} from "lucide-react";
import { formatWorkoutDate } from "@fittrack/shared";
import { MUSCLE_GROUP_LABELS } from "@fittrack/shared";
import { ExercisePicker } from "./exercise-picker";
import type { Database } from "@/lib/supabase/database.types";

type MuscleGroup = Database["public"]["Enums"]["muscle_group"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkoutSet {
  id: string;
  exercise_id: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  is_pr: boolean;
  rpe?: number | null;
  exercises?: { name: string; muscle_group: string } | null;
}

interface Workout {
  id: string;
  name: string;
  notes?: string | null;
  started_at: string;
  finished_at?: string | null;
  duration_minutes?: number | null;
  workout_sets: WorkoutSet[];
}

// ─── Edit-mode row ────────────────────────────────────────────────────────────

interface DraftSet {
  id: string | null;       // null = new unsaved set
  set_number: number;
  weight: string;
  reps: string;
  is_pr: boolean;
  toDelete: boolean;
}

function EditExerciseBlock({
  exerciseName,
  muscle,
  sets,
  onAddSet,
  onChangeSet,
  onMarkDelete,
  onDeleteExercise,
}: {
  exerciseName: string;
  muscle: string;
  sets: DraftSet[];
  onAddSet: () => void;
  onChangeSet: (idx: number, field: "weight" | "reps", value: string) => void;
  onMarkDelete: (idx: number) => void;
  onDeleteExercise: () => void;
}) {
  const { label } = useWeightUnit();
  const inputStyle = {
    backgroundColor: "var(--color-sheet-inset)",
    border: "1px solid var(--color-line)",
    color: "var(--color-text-primary)",
    borderRadius: 2,
    padding: "7px 10px",
    fontSize: 14,
    fontFamily: "var(--font-mono)",
    outline: "none",
    textAlign: "center" as const,
    width: "100%",
  };

  const activeSets = sets.filter((s) => !s.toDelete);

  return (
    <div>
      {/* Exercise label */}
      <div className="flex items-baseline gap-3 mb-3">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {exerciseName}
        </p>
        <span className="label-caps" style={{ fontSize: 11 }}>
          {MUSCLE_GROUP_LABELS[muscle as MuscleGroup] ?? muscle}
        </span>
        <button
          onClick={onDeleteExercise}
          className="ml-auto flex items-center gap-1.5 px-2 py-1 transition-all hover:bg-[color-mix(in_srgb,var(--color-redline)_10%,transparent)]"
          style={{
            color: "var(--color-redline)",
            border: "1px solid color-mix(in srgb, var(--color-redline) 40%, transparent)",
            borderRadius: 2,
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.1em",
          }}
          title="Strike every set of this exercise"
        >
          <Trash2 className="w-3 h-3" /> STRIKE ALL
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-12 gap-2 px-1 mb-1.5">
        <span className="col-span-1 label-caps text-center">#</span>
        <span className="col-span-5 label-caps">Load ({label.toLowerCase()})</span>
        <span className="col-span-4 label-caps">Reps</span>
        <span className="col-span-2" />
      </div>

      {/* Set rows */}
      <div className="space-y-2">
        {sets.map((s, idx) => {
          if (s.toDelete) return null;
          const displayNum = activeSets.indexOf(s) + 1;
          return (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <span
                className="col-span-1 text-center font-display"
                style={{ color: "var(--color-text-ghost)", fontSize: 12 }}
              >
                {displayNum}
              </span>

              <div className="col-span-5">
                <input
                  type="number"
                  step="0.5"
                  value={s.weight}
                  onChange={(e) => onChangeSet(idx, "weight", e.target.value)}
                  placeholder="—"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-redline)")}
                  onBlur={(e)  => (e.target.style.borderColor = "var(--color-line)")}
                />
              </div>

              <div className="col-span-4">
                <input
                  type="number"
                  value={s.reps}
                  onChange={(e) => onChangeSet(idx, "reps", e.target.value)}
                  placeholder="—"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-redline)")}
                  onBlur={(e)  => (e.target.style.borderColor = "var(--color-line)")}
                />
              </div>

              <div className="col-span-2 flex justify-center">
                <button
                  onClick={() => onMarkDelete(idx)}
                  className="w-7 h-7 flex items-center justify-center transition-all hover:bg-[var(--color-sheet-raised)]"
                  style={{ borderRadius: 2 }}
                  title="Strike set"
                >
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--color-redline)" }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add set */}
      <button
        onClick={onAddSet}
        className="bp-btn-outline mt-2.5 flex items-center gap-1.5 px-3 py-1.5"
      >
        <Plus className="w-3.5 h-3.5" /> Add set
      </button>
    </div>
  );
}

// ─── Edit-mode panel — red markup, like a drawing revision ───────────────────

function EditWorkoutPanel({
  workout,
  onClose,
}: {
  workout: Workout;
  onClose: () => void;
}) {
  const updateSet  = useUpdateSet();
  const deleteSet  = useDeleteSet();
  const logSet     = useLogSet();
  const { unit }   = useWeightUnit();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  // Build draft state grouped by exercise
  type ExBlock = {
    exerciseId: string;
    name: string;
    muscle: string;
    sets: DraftSet[];
  };

  const buildDraft = (): ExBlock[] => {
    const map: Record<string, ExBlock> = {};
    for (const s of workout.workout_sets) {
      if (!map[s.exercise_id]) {
        map[s.exercise_id] = {
          exerciseId: s.exercise_id,
          name: s.exercises?.name ?? "Exercise",
          muscle: s.exercises?.muscle_group ?? "",
          sets: [],
        };
      }
      map[s.exercise_id].sets.push({
        id: s.id,
        set_number: s.set_number,
        // Inputs work in the display unit (lbs); the DB stores kg.
        weight: s.weight_kg != null ? String(Math.round(fromKg(s.weight_kg, unit) * 10) / 10) : "",
        reps: String(s.reps ?? ""),
        is_pr: s.is_pr,
        toDelete: false,
      });
    }
    return Object.values(map);
  };

  const [blocks, setBlocks] = useState<ExBlock[]>(buildDraft);

  function handleAddSet(blockIdx: number) {
    const prev = blocks[blockIdx].sets.filter((s) => !s.toDelete).at(-1);
    setBlocks((bs) =>
      bs.map((b, i) =>
        i !== blockIdx ? b : {
          ...b,
          sets: [
            ...b.sets,
            {
              id: null,
              set_number: b.sets.filter((s) => !s.toDelete).length + 1,
              weight: prev?.weight ?? "",
              reps: prev?.reps ?? "",
              is_pr: false,
              toDelete: false,
            },
          ],
        }
      )
    );
  }

  function handleChangeSet(blockIdx: number, setIdx: number, field: "weight" | "reps", value: string) {
    setBlocks((bs) =>
      bs.map((b, i) =>
        i !== blockIdx ? b : {
          ...b,
          sets: b.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s),
        }
      )
    );
  }

  function handleMarkDelete(blockIdx: number, setIdx: number) {
    setBlocks((bs) =>
      bs.map((b, i) =>
        i !== blockIdx ? b : {
          ...b,
          sets: b.sets.map((s, j) => j === setIdx ? { ...s, toDelete: true } : s),
        }
      )
    );
  }

  function handleDeleteExercise(blockIdx: number) {
    setBlocks((bs) =>
      bs.map((b, i) =>
        i !== blockIdx ? b : { ...b, sets: b.sets.map((s) => ({ ...s, toDelete: true })) }
      )
    );
  }

  function handleAddExercise(ex: { id: string; name: string; muscle_group: string }) {
    setShowPicker(false);
    setBlocks((bs) => {
      const existing = bs.findIndex((b) => b.exerciseId === ex.id);
      if (existing !== -1) {
        const prev = bs[existing].sets.filter((s) => !s.toDelete).at(-1);
        return bs.map((b, i) =>
          i !== existing ? b : {
            ...b,
            sets: [
              ...b.sets,
              {
                id: null,
                set_number: b.sets.filter((s) => !s.toDelete).length + 1,
                weight: prev?.weight ?? "",
                reps: prev?.reps ?? "",
                is_pr: false,
                toDelete: false,
              },
            ],
          }
        );
      }
      return [
        ...bs,
        {
          exerciseId: ex.id,
          name: ex.name,
          muscle: ex.muscle_group,
          sets: [{ id: null, set_number: 1, weight: "", reps: "", is_pr: false, toDelete: false }],
        },
      ];
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const ops: Promise<unknown>[] = [];

    for (const block of blocks) {
      const activeSets = block.sets.filter((s) => !s.toDelete);
      for (const s of block.sets) {
        if (s.toDelete && s.id) {
          ops.push(deleteSet.mutateAsync(s.id));
          continue;
        }
        if (s.toDelete) continue;

        const w = parseFloat(s.weight);
        const r = parseInt(s.reps);
        if (!w || !r || isNaN(w) || isNaN(r)) continue;

        // Renumber by position so set numbers stay gapless after deletes
        const setNum = activeSets.indexOf(s) + 1;

        const weightKg = toKg(w, unit);
        if (s.id) {
          ops.push(updateSet.mutateAsync({ setId: s.id, weight_kg: weightKg, reps: r, set_number: setNum }));
        } else {
          ops.push(
            logSet.mutateAsync({
              workout_id: workout.id,
              exercise_id: block.exerciseId,
              set_number: setNum,
              reps: r,
              weight_kg: weightKg,
              is_pr: false,
            })
          );
        }
      }
    }

    try {
      await Promise.all(ops);
      onClose();
    } catch {
      setSaveError("Some changes failed to save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t" style={{ borderColor: "var(--color-redline)" }}>
      {/* Header — revision markup */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{
          borderColor: "var(--color-line)",
          backgroundColor: "color-mix(in srgb, var(--color-redline) 6%, transparent)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <Pencil className="w-3.5 h-3.5" style={{ color: "var(--color-redline)" }} />
          <span
            className="font-display"
            style={{ color: "var(--color-redline)", fontSize: 12, letterSpacing: "0.14em" }}
          >
            REVISION MODE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="bp-btn-outline h-8 px-3">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bp-btn h-8 px-4 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save revision"}
          </button>
        </div>
      </div>

      {saveError && (
        <p
          className="mx-5 mt-3 px-3 py-2 text-sm"
          style={{
            color: "var(--color-redline)",
            border: "1px solid var(--color-redline)",
            borderRadius: 2,
          }}
        >
          {saveError}
        </p>
      )}

      {/* Blocks */}
      <div className="px-5 py-4 space-y-6">
        {blocks.map((block, blockIdx) => {
          const hasVisible = block.sets.some((s) => !s.toDelete);
          if (!hasVisible && block.sets.every((s) => s.id !== null)) return null;
          return (
            <EditExerciseBlock
              key={block.exerciseId}
              exerciseName={block.name}
              muscle={block.muscle}
              sets={block.sets}
              onAddSet={() => handleAddSet(blockIdx)}
              onChangeSet={(si, f, v) => handleChangeSet(blockIdx, si, f, v)}
              onMarkDelete={(si) => handleMarkDelete(blockIdx, si)}
              onDeleteExercise={() => handleDeleteExercise(blockIdx)}
            />
          );
        })}

        <button
          onClick={() => setShowPicker(true)}
          className="bp-btn-outline flex items-center gap-1.5 px-3 py-2"
        >
          <Plus className="w-3.5 h-3.5" /> Add exercise
        </button>
      </div>

      {showPicker && (
        <ExercisePicker
          onSelect={(ex) => handleAddExercise(ex)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// ─── Read-only expanded sets view — drafting table ───────────────────────────

function ReadOnlySets({
  byExercise,
}: {
  byExercise: Record<string, { name: string; muscle: string; sets: WorkoutSet[] }>;
}) {
  const { unit, label } = useWeightUnit();
  if (Object.keys(byExercise).length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-center" style={{ color: "var(--color-text-ghost)" }}>
        No sets on record for this session.
      </p>
    );
  }

  return (
    <div className="px-5 py-4 space-y-5">
      {Object.entries(byExercise).map(([id, ex]) => (
        <div key={id}>
          <div className="flex items-baseline gap-3 mb-1.5">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {ex.name}
            </p>
            <span className="label-caps" style={{ fontSize: 11 }}>
              {MUSCLE_GROUP_LABELS[ex.muscle as MuscleGroup] ?? ex.muscle}
            </span>
          </div>

          <div>
            {ex.sets.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-4 py-2 px-2"
                style={{
                  borderBottom: i < ex.sets.length - 1 ? "1px solid var(--color-line)" : "none",
                }}
              >
                <span
                  className="font-display w-5 text-center shrink-0"
                  style={{ color: "var(--color-text-ghost)", fontSize: 12 }}
                >
                  {i + 1}
                </span>
                <span
                  className="font-display flex-1"
                  style={{ color: "var(--color-text-primary)", fontSize: 14 }}
                >
                  {s.weight_kg != null ? formatKg(s.weight_kg, unit) : "—"}
                  <span style={{ color: "var(--color-text-ghost)", fontSize: 12 }}> {label}</span>
                  <span className="mx-2" style={{ color: "var(--color-text-ghost)" }}>×</span>
                  {s.reps ?? "—"}
                </span>
                {s.is_pr && <span className="stamp shrink-0">PR</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Workout card — one numbered session sheet ───────────────────────────────

function WorkoutCard({ workout, sessionNo }: { workout: Workout; sessionNo: number }) {
  const deleteWorkout = useDeleteWorkout();
  const updateWorkout = useUpdateWorkout();

  const [expanded,       setExpanded]       = useState(false);
  const [editing,        setEditing]        = useState(false);
  const [editingName,    setEditingName]    = useState(false);
  const [nameValue,      setNameValue]      = useState(workout.name);
  const [showDeleteConf, setShowDeleteConf] = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);

  const sets      = workout.workout_sets;
  const prCount   = sets.filter((s) => s.is_pr).length;
  const totalReps = sets.reduce((sum, s) => sum + (s.reps ?? 0), 0);

  const byExercise = sets.reduce<Record<string, { name: string; muscle: string; sets: WorkoutSet[] }>>((acc, s) => {
    const id = s.exercise_id;
    if (!acc[id]) acc[id] = { name: s.exercises?.name ?? "Exercise", muscle: s.exercises?.muscle_group ?? "", sets: [] };
    acc[id].sets.push(s);
    return acc;
  }, {});

  async function handleSaveName() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === workout.name) { setEditingName(false); return; }
    await updateWorkout.mutateAsync({ workoutId: workout.id, name: trimmed });
    setEditingName(false);
  }

  function handleOpenEdit() {
    setMenuOpen(false);
    setExpanded(true);
    setEditing(true);
  }

  return (
    <div
      className="sheet"
      style={{ borderColor: editing ? "var(--color-redline)" : undefined }}
    >
      {/* ── Header ── */}
      <div className="px-5 py-4">

        {/* Session no. + date + actions */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-baseline gap-3">
            <span className="fig-label">Session {String(sessionNo).padStart(3, "0")}</span>
            <span className="label-caps" style={{ fontSize: 11 }}>
              {formatWorkoutDate(workout.started_at)}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            {!editing && (
              <button
                onClick={handleOpenEdit}
                className="bp-btn-outline flex items-center gap-1.5 px-2.5 py-1 mr-1"
              >
                <Pencil className="w-3 h-3" />
                Mark up
              </button>
            )}

            {/* Kebab */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-7 h-7 flex items-center justify-center transition-all hover:bg-[var(--color-sheet-raised)]"
                style={{ borderRadius: 2 }}
              >
                <MoreHorizontal className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-8 z-20 border py-1 min-w-[168px]"
                    style={{
                      backgroundColor: "var(--color-sheet-raised)",
                      borderColor: "var(--color-line-bright)",
                      borderRadius: 2,
                    }}
                  >
                    <button
                      onClick={() => { setMenuOpen(false); setExpanded(true); setEditingName(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left transition-all hover:bg-[var(--color-line)]"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center text-xs" style={{ color: "var(--color-text-ghost)" }}>Aa</span>
                      Rename session
                    </button>
                    <div className="h-px my-1" style={{ backgroundColor: "var(--color-line)" }} />
                    <button
                      onClick={() => { setMenuOpen(false); setShowDeleteConf(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left transition-all hover:bg-[color-mix(in_srgb,var(--color-redline)_10%,transparent)]"
                      style={{ color: "var(--color-redline)" }}
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      Void session
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Chevron */}
            <button
              onClick={() => { setExpanded((v) => !v); if (editing) setEditing(false); }}
              className="w-7 h-7 flex items-center justify-center transition-all hover:bg-[var(--color-sheet-raised)]"
              style={{ borderRadius: 2 }}
            >
              {expanded
                ? <ChevronUp   className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
                : <ChevronDown className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />}
            </button>
          </div>
        </div>

        {/* Workout name */}
        {editingName ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              autoFocus
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  handleSaveName();
                if (e.key === "Escape") { setNameValue(workout.name); setEditingName(false); }
              }}
              className="flex-1 text-base font-semibold px-3 py-1.5"
              style={{
                backgroundColor: "var(--color-sheet-inset)",
                border: "1px solid var(--color-paper)",
                color: "var(--color-text-primary)",
                borderRadius: 2,
                outline: "none",
              }}
            />
            <button
              onClick={handleSaveName}
              disabled={updateWorkout.isPending}
              className="bp-btn h-8 px-3 flex items-center gap-1.5 shrink-0"
            >
              {updateWorkout.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
            <button
              onClick={() => { setNameValue(workout.name); setEditingName(false); }}
              className="bp-btn-outline h-8 px-3 shrink-0"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p
            className="text-base font-semibold cursor-pointer"
            style={{ color: "var(--color-text-primary)" }}
            onClick={() => setExpanded((v) => !v)}
          >
            {workout.name}
            {editing && (
              <span
                className="ml-2 font-display"
                style={{ color: "var(--color-redline)", fontSize: 11, letterSpacing: "0.12em" }}
              >
                — IN REVISION
              </span>
            )}
          </p>
        )}

        {/* Meta annotations */}
        {!editingName && (
          <div
            className="flex items-center gap-4 mt-2 flex-wrap cursor-pointer font-display"
            style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--color-text-secondary)" }}
            onClick={() => setExpanded((v) => !v)}
          >
            {workout.duration_minutes != null && workout.duration_minutes > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" style={{ color: "var(--color-text-ghost)" }} />
                {workout.duration_minutes} MIN
              </span>
            )}
            <span>{sets.length} SET{sets.length !== 1 ? "S" : ""}</span>
            {totalReps > 0 && <span>{totalReps} REP{totalReps !== 1 ? "S" : ""}</span>}
            {prCount > 0 && (
              <span style={{ color: "var(--color-redline)" }}>
                {prCount} PR{prCount > 1 ? "S" : ""}
              </span>
            )}
          </div>
        )}

        {/* Delete confirmation */}
        {showDeleteConf && (
          <div
            className="mt-3 px-4 py-3 flex items-center justify-between gap-3"
            style={{
              border: "1px solid var(--color-redline)",
              borderRadius: 2,
              backgroundColor: "color-mix(in srgb, var(--color-redline) 6%, transparent)",
            }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-redline)" }}>
                Void this session?
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                All sets are removed and records recalculate. This cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setShowDeleteConf(false)} className="bp-btn-outline h-8 px-3">
                Cancel
              </button>
              <button
                onClick={() => deleteWorkout.mutate(workout.id)}
                disabled={deleteWorkout.isPending}
                className="h-8 px-4 font-display flex items-center gap-1.5 disabled:opacity-60"
                style={{
                  backgroundColor: "var(--color-redline)",
                  color: "var(--color-ink)",
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  borderRadius: 2,
                }}
              >
                {deleteWorkout.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                VOID
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        editing
          ? <EditWorkoutPanel workout={workout} onClose={() => setEditing(false)} />
          : (
            <div className="border-t" style={{ borderColor: "var(--color-line)" }}>
              <ReadOnlySets byExercise={byExercise} />
            </div>
          )
      )}
    </div>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────────

export function WorkoutHistory() {
  const { data: workouts, isLoading } = useWorkouts(100);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
    );
  }

  if (!workouts || workouts.length === 0) {
    return (
      <div className="sheet sheet-frame text-center py-20 px-8">
        <p className="fig-label mb-3">No sessions on file</p>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
          Open your first sheet and start logging sets — the drawing set builds itself from here.
        </p>
        <Link href="/workouts/new" className="bp-btn inline-flex items-center gap-2 px-5 py-2.5">
          <Plus className="w-4 h-4" />
          Begin session 001
        </Link>
      </div>
    );
  }

  const total = workouts.length;

  return (
    <div className="space-y-3">
      {(workouts as unknown as Workout[]).map((workout, i) => (
        <WorkoutCard key={workout.id} workout={workout} sessionNo={total - i} />
      ))}
    </div>
  );
}
