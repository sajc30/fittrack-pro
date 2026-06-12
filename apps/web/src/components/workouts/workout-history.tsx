"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  useWorkouts,
  useDeleteWorkout,
  useUpdateWorkout,
  useUpdateSet,
  useDeleteSet,
  useLogSet,
} from "@/lib/hooks/use-workouts";
import {
  Clock, Dumbbell, Trophy, ChevronDown, ChevronUp,
  Plus, Trash2, Pencil, Check, X, Loader2, MoreHorizontal,
} from "lucide-react";
import { formatWorkoutDate } from "@fittrack/shared";
import { MUSCLE_GROUP_LABELS } from "@fittrack/shared";
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
  exerciseId,
  exerciseName,
  muscle,
  sets,
  onAddSet,
  onChangeSet,
  onMarkDelete,
}: {
  exerciseId: string;
  exerciseName: string;
  muscle: string;
  sets: DraftSet[];
  onAddSet: () => void;
  onChangeSet: (idx: number, field: "weight" | "reps", value: string) => void;
  onMarkDelete: (idx: number) => void;
}) {
  const inputStyle = {
    backgroundColor: "var(--color-inset)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 14,
    fontWeight: 600,
    outline: "none",
    textAlign: "center" as const,
    width: "100%",
  };

  const activeSets = sets.filter((s) => !s.toDelete);

  return (
    <div>
      {/* Exercise label */}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {exerciseName}
        </p>
        <span
          className="label-caps px-2 py-0.5 rounded"
          style={{ color: "var(--color-amber)", backgroundColor: "var(--color-amber-dim)" }}
        >
          {MUSCLE_GROUP_LABELS[muscle as MuscleGroup] ?? muscle}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-12 gap-2 px-1 mb-1.5">
        <span className="col-span-1 label-caps text-center">#</span>
        <span className="col-span-5 label-caps">Weight (kg)</span>
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
                className="col-span-1 text-xs font-bold text-center"
                style={{ color: "var(--color-text-ghost)" }}
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
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
                  onBlur={(e)  => (e.target.style.borderColor = "var(--color-border)")}
                />
              </div>

              <div className="col-span-4">
                <input
                  type="number"
                  value={s.reps}
                  onChange={(e) => onChangeSet(idx, "reps", e.target.value)}
                  placeholder="—"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
                  onBlur={(e)  => (e.target.style.borderColor = "var(--color-border)")}
                />
              </div>

              <div className="col-span-2 flex justify-center">
                <button
                  onClick={() => onMarkDelete(idx)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-red-950"
                  title="Remove set"
                >
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--color-red)" }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add set */}
      <button
        onClick={onAddSet}
        className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:bg-[var(--color-raised)]"
        style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
      >
        <Plus className="w-3.5 h-3.5" /> Add set
      </button>
    </div>
  );
}

// ─── Edit-mode panel ──────────────────────────────────────────────────────────

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

  const [saving, setSaving] = useState(false);

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
        weight: String(s.weight_kg ?? ""),
        reps: String(s.reps ?? ""),
        is_pr: s.is_pr,
        toDelete: false,
      });
    }
    return Object.values(map);
  };

  const [blocks, setBlocks] = useState<ExBlock[]>(buildDraft);

  function updateBlock(blockIdx: number, newSets: DraftSet[]) {
    setBlocks((prev) => prev.map((b, i) => i === blockIdx ? { ...b, sets: newSets } : b));
  }

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

  async function handleSave() {
    setSaving(true);
    const ops: Promise<unknown>[] = [];

    for (const block of blocks) {
      const activeSets = block.sets.filter((s) => !s.toDelete);
      for (let i = 0; i < block.sets.length; i++) {
        const s = block.sets[i];

        if (s.toDelete && s.id) {
          ops.push(deleteSet.mutateAsync(s.id));
          continue;
        }
        if (s.toDelete) continue;

        const w = parseFloat(s.weight);
        const r = parseInt(s.reps);
        if (!w || !r || isNaN(w) || isNaN(r)) continue;

        if (s.id) {
          // Existing set — update
          ops.push(updateSet.mutateAsync({ setId: s.id, weight_kg: w, reps: r }));
        } else {
          // New set — insert
          const setNum = activeSets.indexOf(s) + 1;
          ops.push(
            logSet.mutateAsync({
              workout_id: workout.id,
              exercise_id: block.exerciseId,
              set_number: setNum,
              reps: r,
              weight_kg: w,
              is_pr: false,
            })
          );
        }
      }
    }

    await Promise.all(ops);
    setSaving(false);
    onClose();
  }

  return (
    <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-raised)" }}
      >
        <div className="flex items-center gap-2">
          <Pencil className="w-3.5 h-3.5" style={{ color: "var(--color-amber)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--color-amber)" }}>
            Editing workout
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg text-xs font-semibold transition-all"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
            style={{ backgroundColor: "var(--color-amber)", color: "var(--color-void)" }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Blocks */}
      <div className="px-5 py-4 space-y-6">
        {blocks.map((block, blockIdx) => {
          const hasVisible = block.sets.some((s) => !s.toDelete);
          if (!hasVisible && block.sets.every((s) => s.id !== null)) return null;
          return (
            <EditExerciseBlock
              key={block.exerciseId}
              exerciseId={block.exerciseId}
              exerciseName={block.name}
              muscle={block.muscle}
              sets={block.sets}
              onAddSet={() => handleAddSet(blockIdx)}
              onChangeSet={(si, f, v) => handleChangeSet(blockIdx, si, f, v)}
              onMarkDelete={(si) => handleMarkDelete(blockIdx, si)}
            />
          );
        })}
      </div>

    </div>
  );
}

// ─── Read-only expanded sets view ─────────────────────────────────────────────

function ReadOnlySets({
  byExercise,
}: {
  byExercise: Record<string, { name: string; muscle: string; sets: WorkoutSet[] }>;
}) {
  if (Object.keys(byExercise).length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-center" style={{ color: "var(--color-text-ghost)" }}>
        No sets logged for this workout.
      </p>
    );
  }

  return (
    <div className="px-5 py-4 space-y-5">
      {Object.entries(byExercise).map(([id, ex]) => (
        <div key={id}>
          <div className="flex items-center gap-2 mb-2.5">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {ex.name}
            </p>
            <span
              className="label-caps px-2 py-0.5 rounded"
              style={{ color: "var(--color-amber)", backgroundColor: "var(--color-amber-dim)" }}
            >
              {MUSCLE_GROUP_LABELS[ex.muscle as MuscleGroup] ?? ex.muscle}
            </span>
          </div>

          <div className="space-y-1.5">
            {ex.sets.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                style={{
                  backgroundColor: s.is_pr ? "var(--color-amber-dim)" : "var(--color-inset)",
                  border: `1px solid ${s.is_pr ? "var(--color-amber)" : "var(--color-border)"}`,
                }}
              >
                <span
                  className="text-xs font-bold w-5 text-center shrink-0"
                  style={{ color: s.is_pr ? "var(--color-amber)" : "var(--color-text-ghost)" }}
                >
                  {s.set_number}
                </span>
                <span className="text-sm font-bold flex-1" style={{ color: s.is_pr ? "var(--color-amber)" : "var(--color-text-primary)" }}>
                  {s.weight_kg ?? "—"}
                  <span className="text-xs font-normal" style={{ color: "var(--color-text-secondary)" }}> kg</span>
                  <span className="mx-2" style={{ color: "var(--color-text-ghost)" }}>×</span>
                  {s.reps ?? "—"}
                  <span className="text-xs font-normal" style={{ color: "var(--color-text-secondary)" }}> reps</span>
                </span>
                {s.is_pr && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded tracking-wider shrink-0"
                    style={{ backgroundColor: "var(--color-amber)", color: "var(--color-void)" }}
                  >
                    PR
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Workout card ─────────────────────────────────────────────────────────────

function WorkoutCard({ workout }: { workout: Workout }) {
  const deleteWorkout = useDeleteWorkout();
  const updateWorkout = useUpdateWorkout();

  const [expanded,       setExpanded]       = useState(false);
  const [editing,        setEditing]        = useState(false);
  const [editingName,    setEditingName]    = useState(false);
  const [nameValue,      setNameValue]      = useState(workout.name);
  const [showDeleteConf, setShowDeleteConf] = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);

  const sets        = workout.workout_sets;
  const prCount     = sets.filter((s) => s.is_pr).length;
  const totalVolume = sets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weight_kg ?? 0), 0);

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
      className="rounded-xl border"
      style={{ backgroundColor: "var(--color-surface)", borderColor: editing ? "var(--color-amber)" : "var(--color-border)", transition: "border-color 150ms" }}
    >
      {/* ── Header ── */}
      <div className="px-5 py-4">

        {/* Date row + actions */}
        <div className="flex items-center justify-between mb-1">
          <p className="label-caps">{formatWorkoutDate(workout.started_at)}</p>

          <div className="flex items-center gap-0.5">
            {/* Edit shortcut pill */}
            {!editing && (
              <button
                onClick={handleOpenEdit}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold mr-1 transition-all hover:bg-[var(--color-raised)]"
                style={{ color: "var(--color-text-primary)", border: "1px solid var(--color-border-bright)" }}
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            )}

            {/* Kebab */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--color-raised)]"
              >
                <MoreHorizontal className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-8 z-20 rounded-xl border py-1 min-w-[168px] shadow-2xl"
                    style={{ backgroundColor: "var(--color-raised)", borderColor: "var(--color-border-bright)" }}
                  >
                    <button
                      onClick={() => { setMenuOpen(false); setExpanded(true); setEditingName(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left transition-all"
                      style={{ color: "var(--color-text-primary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-border)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center text-xs" style={{ color: "var(--color-text-ghost)" }}>Aa</span>
                      Rename workout
                    </button>
                    <div className="h-px my-1" style={{ backgroundColor: "var(--color-border)" }} />
                    <button
                      onClick={() => { setMenuOpen(false); setShowDeleteConf(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left transition-all"
                      style={{ color: "var(--color-red)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      Delete workout
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Chevron */}
            <button
              onClick={() => { setExpanded((v) => !v); if (editing) setEditing(false); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-[var(--color-raised)]"
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
              className="flex-1 text-base font-semibold px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: "var(--color-inset)", border: "1px solid var(--color-amber)", color: "var(--color-text-primary)", outline: "none" }}
            />
            <button
              onClick={handleSaveName}
              disabled={updateWorkout.isPending}
              className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-green)", color: "white" }}
            >
              {updateWorkout.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
            <button
              onClick={() => { setNameValue(workout.name); setEditingName(false); }}
              className="h-8 px-3 rounded-lg text-xs font-semibold shrink-0"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
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
              <span className="ml-2 text-xs font-semibold" style={{ color: "var(--color-amber)" }}>
                — editing
              </span>
            )}
          </p>
        )}

        {/* Meta */}
        {!editingName && (
          <div className="flex items-center gap-4 mt-2 flex-wrap cursor-pointer" onClick={() => setExpanded((v) => !v)}>
            {workout.duration_minutes != null && workout.duration_minutes > 0 && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                <Clock className="w-3.5 h-3.5" />{workout.duration_minutes} min
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              <Dumbbell className="w-3.5 h-3.5" />{sets.length} set{sets.length !== 1 ? "s" : ""}
            </span>
            {totalVolume > 0 && (
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {(totalVolume / 1000).toFixed(1)}t volume
              </span>
            )}
            {prCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--color-amber)" }}>
                <Trophy className="w-3.5 h-3.5" />{prCount} PR{prCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Delete confirmation */}
        {showDeleteConf && (
          <div
            className="mt-3 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            style={{ backgroundColor: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.25)" }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-red)" }}>Delete workout?</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                All sets will be removed. This cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowDeleteConf(false)}
                className="h-8 px-3 rounded-lg text-xs font-semibold"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteWorkout.mutate(workout.id)}
                disabled={deleteWorkout.isPending}
                className="h-8 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
                style={{ backgroundColor: "var(--color-red)", color: "white" }}
              >
                {deleteWorkout.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Delete
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
            <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
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
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!workouts || workouts.length === 0) {
    return (
      <div className="text-center py-20">
        <Dumbbell className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--color-text-ghost)" }} />
        <p className="text-lg font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
          No workouts yet
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
          Start logging sessions to see your history here.
        </p>
        <Link
          href="/workouts/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: "var(--color-amber)", color: "var(--color-void)" }}
        >
          <Plus className="w-4 h-4" />
          Start First Workout
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(workouts as unknown as Workout[]).map((workout) => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </div>
  );
}
