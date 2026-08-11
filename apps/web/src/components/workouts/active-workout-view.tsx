"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveWorkout, workingNumber } from "@/lib/store/active-workout";
import {
  useCreateWorkout,
  useDeleteExerciseSets,
  useDeleteSet,
  useDeleteWorkout,
  useFinishWorkout,
  useLogSet,
  useSetSupersetGroup,
  useUpdateSet,
  useUpdateWorkout,
} from "@/lib/hooks/use-workouts";
import { useWeightUnit, toKg, fromKg } from "@/lib/hooks/use-weight-unit";
import { useProfile } from "@/lib/hooks/use-profile";
import { useMeasurements } from "@/lib/hooks/use-measurements";
import { ExercisePicker } from "./exercise-picker";
import { LastPerformanceCard } from "./last-performance-card";
import { StartingPointCard } from "./starting-point-card";
import { useStartingPoint } from "@/lib/hooks/use-starting-point";
import { useExerciseCatalog } from "@/lib/hooks/use-exercises";
import { MOVEMENT_PATTERN_LABELS } from "@fittrack/shared";
import { SessionSummary, type SessionSummaryData } from "./session-summary";
import { estimateOneRepMax } from "@fittrack/shared";
import { createClient } from "@/lib/supabase/client";
import { X, Plus, Check, Trophy, ArrowRight, Pencil, Trash2, NotebookPen, Link2, CornerDownRight } from "lucide-react";

/** Group 1 → A, 2 → B. Numbers would read as set counts; letters don't. */
const supersetLabel = (group: number) => String.fromCharCode(64 + group);

function defaultSessionName() {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  return `${part} Workout`;
}

export function ActiveWorkoutView() {
  const router = useRouter();
  const store = useActiveWorkout();
  const createWorkout = useCreateWorkout();
  const deleteWorkout = useDeleteWorkout();
  const finishWorkout = useFinishWorkout();
  const updateWorkout = useUpdateWorkout();
  const logSet = useLogSet();
  const updateSetMut = useUpdateSet();
  const deleteSetMut = useDeleteSet();
  const deleteExerciseSets = useDeleteExerciseSets();
  const setSupersetGroup = useSetSupersetGroup();
  const { unit, label } = useWeightUnit();
  const { data: profile } = useProfile();
  const { data: measurements } = useMeasurements();
  const { data: catalog } = useExerciseCatalog();

  // Read here rather than beside `currentEx` below: that sits after the
  // hydration early-return, and a hook can't live behind one.
  const currentExerciseId =
    store.exercises[store.currentExerciseIndex]?.exerciseId ?? null;
  // Null once the exercise has history of its own — see useStartingPoint.
  const startingPoint = useStartingPoint(currentExerciseId);
  const currentPattern =
    catalog?.find((e) => e.id === currentExerciseId)?.movement_pattern ?? null;

  // Latest logged body weight wins over the profile field, mirroring the Body page.
  const currentBodyweightKg = measurements?.[0]?.weight_kg ?? profile?.weight_kg ?? null;
  const bodyweightDisplay = currentBodyweightKg != null ? fromKg(currentBodyweightKg, unit) : null;

  const [showPicker, setShowPicker] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [supersetPicker, setSupersetPicker] = useState(false);
  const [summary, setSummary] = useState<SessionSummaryData | null>(null);
  const [workoutName, setWorkoutName] = useState(defaultSessionName);
  const [prFlash, setPrFlash] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);
  // Persisted store rehydrates from localStorage after mount — render nothing until
  // then so server and client markup agree.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  // Start or use existing workout
  const hasStarted = store.workoutId !== null;

  async function handleStart() {
    setActionError(null);
    try {
      const data = await createWorkout.mutateAsync({ name: workoutName });
      store.startWorkout(data.id, workoutName);
    } catch {
      setActionError("Could not open the session — check your connection and try again.");
    }
  }

  async function handleLogSet(exerciseIndex: number, setIndex: number) {
    if (!store.workoutId) return;
    const ex = store.exercises[exerciseIndex];
    const s = ex.sets[setIndex];
    const weightInUnit = parseFloat(s.weight);
    const reps = parseInt(s.reps);
    if (!weightInUnit || !reps) return;

    const weightKg = toKg(weightInUnit, unit);
    setActionError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const e1rm = estimateOneRepMax(weightKg, reps);
      // Read the current PR only to decide the celebration UX — the DB trigger
      // on workout_sets is what actually maintains personal_records.
      const { data: currentPR } = await supabase
        .from("personal_records")
        .select("estimated_one_rep_max")
        .eq("user_id", user.id)
        .eq("exercise_id", ex.exerciseId)
        .maybeSingle();

      const isPR = !currentPR || e1rm > (currentPR.estimated_one_rep_max ?? 0);

      // A drop inherits its parent's set number and points at its row, so the
      // chain reads as one working set everywhere downstream.
      const parent = s.parentTempId
        ? ex.sets.find((p) => p.tempId === s.parentTempId)
        : undefined;

      const data = await logSet.mutateAsync({
        workout_id: store.workoutId,
        exercise_id: ex.exerciseId,
        set_number: workingNumber(ex.sets, setIndex),
        reps,
        weight_kg: weightKg,
        is_pr: isPR,
        parent_set_id: parent?.dbId ?? null,
        superset_group: ex.supersetGroup,
      });

      if (isPR) {
        setPrFlash(true);
        setTimeout(() => setPrFlash(false), 2500);
      }

      store.markSetLogged(exerciseIndex, setIndex, isPR, data.id);
    } catch {
      setActionError("Could not save the set — check your connection and try again.");
    }
  }

  async function handleSaveSetEdit(exerciseIndex: number, setIndex: number, weight: string, reps: string) {
    const s = store.exercises[exerciseIndex].sets[setIndex];
    const weightInUnit = parseFloat(weight);
    const parsedReps = parseInt(reps);
    if (!s.dbId || !weightInUnit || !parsedReps) return;

    setActionError(null);
    try {
      await updateSetMut.mutateAsync({
        setId: s.dbId,
        weight_kg: toKg(weightInUnit, unit),
        reps: parsedReps,
      });
      store.updateSet(exerciseIndex, setIndex, { weight, reps });
    } catch {
      setActionError("Could not revise the set — check your connection and try again.");
      throw new Error("save failed"); // keep the row in edit mode
    }
  }

  async function handleRemoveSet(exerciseIndex: number, setIndex: number) {
    const ex = store.exercises[exerciseIndex];
    const s = ex.sets[setIndex];
    setActionError(null);
    try {
      if (s.dbId) {
        // Deleting a working set takes its drops with it — the FK cascades.
        await deleteSetMut.mutateAsync(s.dbId);

        // Keep set_number gapless. Renumber against what's actually left rather
        // than by index arithmetic, since drops share their parent's number.
        const remaining = ex.sets.filter(
          (r, i) => i !== setIndex && r.parentTempId !== s.tempId
        );
        for (let i = 0; i < remaining.length; i++) {
          const later = remaining[i];
          const n = workingNumber(remaining, i);
          if (!later.logged || !later.dbId || n === workingNumber(ex.sets, ex.sets.indexOf(later))) continue;
          await updateSetMut.mutateAsync({
            setId: later.dbId,
            weight_kg: toKg(parseFloat(later.weight), unit),
            reps: parseInt(later.reps),
            set_number: n,
          });
        }
      }
      store.removeSet(exerciseIndex, setIndex);
    } catch {
      setActionError("Could not strike the set — check your connection and try again.");
    }
  }

  /**
   * Load a previous set's weight into the first row that hasn't been logged,
   * appending a row if they're all logged. Weight only — reps are what this
   * session is testing, so they stay empty for the user to fill in. Only ever
   * runs from an explicit tap on the last-performance card.
   */
  function applyToNextOpenSet(weight: string) {
    const exerciseIndex = store.currentExerciseIndex;
    const ex = store.exercises[exerciseIndex];
    if (!ex) return;

    // Working sets only — a drop's load is derived from the set above it.
    const target = ex.sets.findIndex((s) => !s.logged && s.parentTempId === null);
    if (target === -1) {
      store.addSet(exerciseIndex);
      store.updateSet(exerciseIndex, ex.sets.length, { weight, reps: "" });
      return;
    }
    store.updateSet(exerciseIndex, target, { weight });
  }

  /**
   * Apply a superset change and carry it onto sets already logged. Writes every
   * exercise whose group actually moved, not just the ones tapped — leaving a
   * pair of two also un-groups the exercise left behind.
   */
  async function syncSupersetGroups(mutate: () => void) {
    const before = new Map(store.exercises.map((e) => [e.exerciseId, e.supersetGroup]));
    mutate();
    if (!store.workoutId) return;

    setActionError(null);
    const after = useActiveWorkout.getState().exercises;
    try {
      for (const ex of after) {
        if (before.get(ex.exerciseId) === ex.supersetGroup) continue;
        await setSupersetGroup.mutateAsync({
          workoutId: store.workoutId,
          exerciseId: ex.exerciseId,
          group: ex.supersetGroup,
        });
      }
    } catch {
      setActionError("The pairing is set for new sets, but earlier ones couldn't be updated.");
    }
  }

  async function handleRemoveExercise(index: number) {
    const ex = store.exercises[index];
    if (!ex) return;
    if (!confirm(`Remove ${ex.exerciseName} and its logged sets from this session?`)) return;
    setActionError(null);
    try {
      if (store.workoutId && ex.sets.some((s) => s.dbId)) {
        await deleteExerciseSets.mutateAsync({ workoutId: store.workoutId, exerciseId: ex.exerciseId });
      }
      store.removeExercise(index);
    } catch {
      setActionError("Could not remove the exercise — check your connection and try again.");
    }
  }

  /**
   * Push the note to the DB. Fires on blur and again on close-out, so the
   * store holds the live draft and the database holds the committed one.
   * Failure is deliberately silent — losing a note is bad, but interrupting a
   * workout with an error banner over one is worse, and the draft survives in
   * the persisted store either way.
   */
  function saveNotes() {
    if (!store.workoutId) return;
    updateWorkout
      .mutateAsync({ workoutId: store.workoutId, name: store.workoutName, notes: store.notes })
      .catch(() => {});
  }

  /** Everything the summary needs, read off the store before it's reset. */
  function buildSummary(): SessionSummaryData {
    let sets = 0, reps = 0, volume = 0, prs = 0;
    const muscleGroups: string[] = [];

    for (const ex of store.exercises) {
      // Only exercises actually worked — adding one to the sheet and logging
      // nothing shouldn't put its muscle group in the summary. Matches iOS,
      // which reads muscle groups off logged sets.
      if (ex.sets.some((s) => s.logged) && !muscleGroups.includes(ex.muscleGroup)) {
        muscleGroups.push(ex.muscleGroup);
      }
      for (const s of ex.sets) {
        if (!s.logged) continue;
        // A dropset is one working set with extra volume, not four sets.
        if (s.parentTempId === null) sets += 1;
        const r = parseInt(s.reps, 10);
        const w = parseFloat(s.weight);
        if (Number.isFinite(r)) reps += r;
        if (Number.isFinite(r) && Number.isFinite(w)) volume += r * w;
        if (s.isPR) prs += 1;
      }
    }

    return {
      name: store.workoutName || "Session",
      durationSeconds: store.startedAt
        ? Math.max(0, Math.round((Date.now() - new Date(store.startedAt).getTime()) / 1000))
        : 0,
      sets, reps, volume, prs, muscleGroups,
    };
  }

  async function handleFinish() {
    if (!store.workoutId || !store.startedAt) return;
    setActionError(null);
    try {
      await updateWorkout
        .mutateAsync({ workoutId: store.workoutId, name: store.workoutName, notes: store.notes })
        .catch(() => {}); // never block closing out over a note
      const built = buildSummary(); // capture before the store is cleared
      await finishWorkout.mutateAsync({ workoutId: store.workoutId, startedAt: new Date(store.startedAt) });
      store.resetWorkout();
      setSummary(built);
    } catch {
      setActionError("Could not close out the session — try again.");
    }
  }

  // Void = hard-delete the sheet. The workout row is created at start, so
  // abandoning without deleting would leave orphans in the training log.
  async function handleVoid() {
    if (!confirm("Void this session? The sheet and any logged sets are discarded.")) return;
    setActionError(null);
    setVoiding(true);
    try {
      if (store.workoutId) await deleteWorkout.mutateAsync(store.workoutId);
      store.resetWorkout();
      router.push("/workouts");
    } catch {
      setActionError("Could not void the session — try again.");
      setVoiding(false);
    }
  }

  if (!hydrated) return null;

  const currentEx = store.exercises[store.currentExerciseIndex];

  // Which set, if any, the "add drop" control extends. A drop needs its parent's
  // row id, so only logged sets qualify; and one pending drop at a time keeps
  // the chain unambiguous.
  const dropAnchor = (() => {
    if (!currentEx) return null;
    const sets = currentEx.sets;
    if (sets.some((s) => s.parentTempId !== null && !s.logged)) return null;
    for (let i = sets.length - 1; i >= 0; i--) {
      const s = sets[i];
      if (s.parentTempId === null && s.logged && s.dbId) {
        return { parentIndex: i, number: workingNumber(sets, i) };
      }
    }
    return null;
  })();

  // Rendered from both branches below. Closing out resets the store, which
  // flips this component to the pre-start screen — so the summary has to
  // survive that transition or it never appears at all.
  const summaryOverlay = summary && (
    <SessionSummary
      data={summary}
      unitLabel={label}
      onDone={() => { setSummary(null); router.push("/workouts"); }}
    />
  );

  // Pre-start screen — open a new sheet
  if (!hasStarted) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-8">
        {summaryOverlay}
        <div className="sheet sheet-frame w-full max-w-md p-8">
          <p className="fig-label mb-1.5">New session — open a sheet</p>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
            Name the session, then add exercises and log sets.
          </p>
          <label className="label-caps block mb-2" htmlFor="workout-name">Session name</label>
          <input
            id="workout-name"
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            className="w-full px-4 py-3 text-sm font-medium mb-4"
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
          {actionError && (
            <p className="text-sm mb-4 px-3 py-2" style={{ color: "var(--color-redline)", border: "1px solid var(--color-redline)", borderRadius: 2 }}>
              {actionError}
            </p>
          )}
          <button
            onClick={handleStart}
            disabled={!workoutName.trim() || createWorkout.isPending}
            className="bp-btn w-full py-3.5 flex items-center justify-center gap-2"
          >
            {createWorkout.isPending ? "Opening…" : "Begin session"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: "var(--color-line)", backgroundColor: "var(--color-sheet)" }}
      >
        <button
          onClick={handleVoid}
          disabled={voiding}
          className="p-2 transition-colors hover:text-[var(--color-redline)] disabled:opacity-50"
          style={{ color: "var(--color-text-secondary)", borderRadius: 2 }}
          title="Void session"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center min-w-0 px-3">
          <span className="fig-label" style={{ fontSize: 9 }}>Active session</span>
          <span
            className="font-display truncate max-w-[40vw]"
            style={{ color: "var(--color-text-primary)", fontSize: 14, letterSpacing: "0.06em" }}
          >
            {store.workoutName}
          </span>
        </div>

        <button
          onClick={handleFinish}
          disabled={finishWorkout.isPending}
          className="bp-btn px-4 py-2"
        >
          {finishWorkout.isPending ? "Filing…" : "Close out"}
        </button>
      </div>

      {actionError && (
        <p
          className="mx-6 mt-3 px-3 py-2 text-sm shrink-0"
          style={{ color: "var(--color-redline)", border: "1px solid var(--color-redline)", borderRadius: 2 }}
        >
          {actionError}
        </p>
      )}

      {/* Session note — one free-form note for this workout, available from the
          moment the session starts. Collapsed by default so it costs nothing
          when unused; the preview keeps it visible once written. */}
      <div className="px-6 pt-3 shrink-0">
        {notesOpen ? (
          <div className="space-y-1.5">
            <p className="fig-label" style={{ fontSize: 9 }}>Session note</p>
            <textarea
              autoFocus
              value={store.notes}
              onChange={(e) => store.setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Anything worth remembering about today's session."
              style={{
                width: "100%",
                minHeight: 72,
                padding: "8px 10px",
                backgroundColor: "var(--color-sheet-inset)",
                border: "1px solid var(--color-line)",
                borderRadius: 2,
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                lineHeight: 1.5,
                resize: "vertical",
              }}
            />
            <button
              onClick={() => { saveNotes(); setNotesOpen(false); }}
              className="label-caps"
              style={{ fontSize: 10, color: "var(--color-text-secondary)" }}
            >
              Done
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNotesOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:border-[var(--color-text-ghost)]"
            style={{
              backgroundColor: "var(--color-sheet-inset)",
              border: "1px solid var(--color-line)",
              borderRadius: 2,
            }}
          >
            <NotebookPen className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-text-ghost)" }} />
            <span
              className="truncate"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: store.notes ? "var(--color-text-secondary)" : "var(--color-text-ghost)",
              }}
            >
              {store.notes || "Add a note for this session"}
            </span>
          </button>
        )}
      </div>

      {store.exercises.length === 0 ? (
        /* Empty state — pick first exercise */
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
          <p className="label-caps">Blank sheet — add your first exercise</p>
          <button
            onClick={() => setShowPicker(true)}
            className="bp-btn flex items-center gap-2 px-5 py-3"
          >
            <Plus className="w-4 h-4" /> Add exercise
          </button>
        </div>
      ) : (
        <>
          {/* Exercise nav tabs */}
          <div
            className="flex items-center gap-1.5 px-4 py-3 border-b overflow-x-auto shrink-0"
            style={{ borderColor: "var(--color-line)" }}
          >
            {store.exercises.map((ex, i) => {
              const active = store.currentExerciseIndex === i;
              return (
                <button
                  key={i}
                  onClick={() => store.setCurrentExercise(i)}
                  className={`px-3 py-1.5 font-display whitespace-nowrap transition-all duration-150 shrink-0 flex items-center gap-1.5 ${active ? "hatch" : ""}`}
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    borderRadius: 2,
                    border: `1px solid ${active ? "var(--color-paper)" : "var(--color-line)"}`,
                    color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  }}
                >
                  {ex.supersetGroup !== null && (
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.1em",
                        color: "var(--color-ink)",
                        backgroundColor: "var(--color-text-ghost)",
                        borderRadius: 2,
                        padding: "1px 4px",
                      }}
                    >
                      {supersetLabel(ex.supersetGroup)}
                    </span>
                  )}
                  {ex.exerciseName}
                </button>
              );
            })}
            <button
              onClick={() => setShowPicker(true)}
              className="bp-btn-outline px-3 py-1.5 shrink-0 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>

          {/* PR flash — record filed in red markup */}
          {prFlash && (
            <div
              className="mx-6 mt-4 px-4 py-3 flex items-center gap-4 shrink-0"
              style={{
                border: "1px solid var(--color-redline)",
                borderRadius: 2,
                backgroundColor: "color-mix(in srgb, var(--color-redline) 7%, transparent)",
              }}
            >
              <span className="stamp">PR</span>
              <div>
                <p
                  className="font-display"
                  style={{ color: "var(--color-redline)", fontSize: 13, letterSpacing: "0.12em" }}
                >
                  NEW RECORD FILED
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  All-time best for this exercise — entered into the record table.
                </p>
              </div>
            </div>
          )}

          {/* Active exercise */}
          {currentEx && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-4">
                <p className="fig-label mb-0.5">{currentEx.muscleGroup}</p>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {currentEx.exerciseName}
                  </h2>
                  <button
                    onClick={() => handleRemoveExercise(store.currentExerciseIndex)}
                    disabled={deleteExerciseSets.isPending}
                    className="p-2 transition-colors hover:text-[var(--color-redline)] disabled:opacity-50"
                    style={{ color: "var(--color-text-ghost)", borderRadius: 2 }}
                    title="Remove exercise from session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {/* Supersets are a plan, not a property of a set — pairing lives
                    here and rides along on every set logged for the exercise.
                    Any exercise in the session can be the partner; picking one
                    that's already supersetted joins that group. */}
                {store.exercises.length > 1 && (
                  <div className="relative mt-2">
                    <button
                      onClick={() => setSupersetPicker((v) => !v)}
                      className="bp-btn-outline px-3 py-1.5 flex items-center gap-1.5"
                      style={
                        currentEx.supersetGroup !== null
                          ? { borderColor: "var(--color-text-ghost)" }
                          : undefined
                      }
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      {currentEx.supersetGroup !== null
                        ? `Superset ${supersetLabel(currentEx.supersetGroup)}`
                        : "Superset with…"}
                    </button>

                    {supersetPicker && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setSupersetPicker(false)} />
                        <div
                          className="absolute left-0 top-9 z-20 py-1 min-w-[220px] max-h-64 overflow-y-auto"
                          style={{
                            backgroundColor: "var(--color-sheet-raised)",
                            border: "1px solid var(--color-line-bright)",
                            borderRadius: 2,
                          }}
                        >
                          <p className="fig-label px-3 py-1.5" style={{ fontSize: 9 }}>
                            Pair with
                          </p>
                          {store.exercises.map((ex, i) => {
                            if (i === store.currentExerciseIndex) return null;
                            const together =
                              currentEx.supersetGroup !== null &&
                              currentEx.supersetGroup === ex.supersetGroup;
                            return (
                              <button
                                key={ex.exerciseId}
                                onClick={() => {
                                  setSupersetPicker(false);
                                  syncSupersetGroups(() =>
                                    together
                                      ? store.leaveSuperset(store.currentExerciseIndex)
                                      : store.joinSuperset(store.currentExerciseIndex, i)
                                  );
                                }}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-left transition-all hover:bg-[var(--color-line)]"
                                style={{ color: "var(--color-text-primary)" }}
                              >
                                <span className="truncate">{ex.exerciseName}</span>
                                {together ? (
                                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-green)" }} />
                                ) : ex.supersetGroup !== null ? (
                                  <span
                                    className="shrink-0"
                                    style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-ghost)" }}
                                  >
                                    {supersetLabel(ex.supersetGroup)}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                          {currentEx.supersetGroup !== null && (
                            <>
                              <div className="h-px my-1" style={{ backgroundColor: "var(--color-line)" }} />
                              <button
                                onClick={() => {
                                  setSupersetPicker(false);
                                  syncSupersetGroups(() => store.leaveSuperset(store.currentExerciseIndex));
                                }}
                                className="w-full px-3 py-2.5 text-sm text-left transition-all hover:bg-[color-mix(in_srgb,var(--color-redline)_10%,transparent)]"
                                style={{ color: "var(--color-redline)" }}
                              >
                                Leave superset {supersetLabel(currentEx.supersetGroup)}
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {currentEx.equipment === "bodyweight" && (
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-ghost)" }}>
                    Bodyweight exercise — load defaults to your logged body weight
                    {bodyweightDisplay != null ? ` (${Math.round(bodyweightDisplay * 10) / 10} ${label.toLowerCase()})` : ""}.
                    Edit it to add a weighted vest or belt.
                  </p>
                )}
              </div>

              {/* Exactly one of these applies: a trained exercise has a last
                  performance, an untrained one gets comparables to reason from. */}
              {startingPoint ? (
                <StartingPointCard
                  startingPoint={startingPoint}
                  patternLabel={
                    currentPattern ? MOVEMENT_PATTERN_LABELS[currentPattern] ?? null : null
                  }
                  onApply={applyToNextOpenSet}
                />
              ) : (
                <LastPerformanceCard
                  exerciseId={currentEx.exerciseId}
                  onApply={applyToNextOpenSet}
                />
              )}

              {/* Set rows */}
              <div className="space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 px-1">
                  <span className="col-span-1 label-caps">#</span>
                  <span className="col-span-4 label-caps">Load ({label.toLowerCase()})</span>
                  <span className="col-span-4 label-caps">Reps</span>
                  <span className="col-span-3 label-caps">Log</span>
                </div>

                {currentEx.sets.map((s, si) => (
                  <SetRow
                    key={s.tempId}
                    displayNumber={workingNumber(currentEx.sets, si)}
                    isDrop={s.parentTempId !== null}
                    set={s}
                    onUpdate={(updates) => store.updateSet(store.currentExerciseIndex, si, updates)}
                    onLog={() => handleLogSet(store.currentExerciseIndex, si)}
                    onSaveEdit={(weight, reps) => handleSaveSetEdit(store.currentExerciseIndex, si, weight, reps)}
                    onRemove={() => handleRemoveSet(store.currentExerciseIndex, si)}
                    isLogging={logSet.isPending}
                    isSaving={updateSetMut.isPending}
                    isRemoving={deleteSetMut.isPending}
                  />
                ))}
              </div>

              {/* Extend the set you just finished into a dropset. Offered on the
                  latest logged set only — a drop is something you decide to do
                  while still standing at the machine, not weeks later. */}
              {dropAnchor !== null && (
                <button
                  onClick={() => store.addDrop(store.currentExerciseIndex, dropAnchor.parentIndex)}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 transition-colors hover:border-[var(--color-text-ghost)]"
                  style={{
                    border: "1px dashed var(--color-line)",
                    borderRadius: 2,
                    color: "var(--color-text-ghost)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                  }}
                  title="Drop the weight and keep going — still counts as one set"
                >
                  <CornerDownRight className="w-3.5 h-3.5" /> ADD DROPSET TO SET {dropAnchor.number}
                </button>
              )}

              <button
                onClick={() => store.addSet(store.currentExerciseIndex)}
                className="bp-btn-outline mt-3 flex items-center gap-2 px-4 py-2"
              >
                <Plus className="w-4 h-4" /> Add set
              </button>
            </div>
          )}
        </>
      )}

      {/* Exercise Picker Modal */}
      {showPicker && (
        <ExercisePicker
          onSelect={(ex) => {
            const isBodyweight = ex.equipment === "bodyweight";
            const initialWeight = isBodyweight && bodyweightDisplay != null
              ? String(Math.round(bodyweightDisplay * 10) / 10)
              : undefined;
            store.addExercise(
              { exerciseId: ex.id, exerciseName: ex.name, muscleGroup: ex.muscle_group, equipment: ex.equipment },
              initialWeight
            );
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {summaryOverlay}
    </div>
  );
}

function SetRow({
  displayNumber, isDrop, set, onUpdate, onLog, onSaveEdit, onRemove, isLogging, isSaving, isRemoving,
}: {
  displayNumber: number;
  isDrop: boolean;
  set: { dbId: string | null; weight: string; reps: string; logged: boolean; isPR: boolean };
  onUpdate: (updates: { weight?: string; reps?: string }) => void;
  onLog: () => void;
  onSaveEdit: (weight: string, reps: string) => Promise<void>;
  onRemove: () => void;
  isLogging: boolean;
  isSaving: boolean;
  isRemoving: boolean;
}) {
  // Draft state while revising an already-logged set — the store keeps the
  // saved values until the DB update succeeds.
  const [editing, setEditing] = useState(false);
  const [draftWeight, setDraftWeight] = useState("");
  const [draftReps, setDraftReps] = useState("");

  function startEdit() {
    setDraftWeight(set.weight);
    setDraftReps(set.reps);
    setEditing(true);
  }

  async function confirmEdit() {
    try {
      await onSaveEdit(draftWeight, draftReps);
      setEditing(false);
    } catch {
      // save failed — stay in edit mode; the parent surfaced the error
    }
  }

  const weightValue = editing ? draftWeight : set.weight;
  const repsValue = editing ? draftReps : set.reps;
  const inputsDisabled = set.logged && !editing;
  // Logged sets can only be revised/struck once we know their DB row id.
  const canRevise = set.logged && set.dbId !== null;
  const cellInput = {
    backgroundColor: "var(--color-sheet-inset)",
    border: "1px solid var(--color-line)",
    color: "var(--color-text-primary)",
    borderRadius: 2,
    padding: "8px 10px",
    fontSize: 15,
    fontFamily: "var(--font-mono)",
    width: "100%",
    outline: "none",
    textAlign: "center" as const,
  };

  const smallAction = {
    backgroundColor: "var(--color-sheet-inset)",
    border: "1px solid var(--color-line)",
    borderRadius: 2,
  };

  return (
    <div
      className="grid grid-cols-12 gap-2 items-center"
      style={{
        opacity: inputsDisabled ? 0.55 : 1,
        // A rail down the left marks the chain without shifting the columns
        // out of line with the headers.
        borderLeft: `2px solid ${isDrop ? "var(--color-line-bright)" : "transparent"}`,
        marginLeft: -8,
        paddingLeft: 6,
      }}
    >
      <span
        className="col-span-1 text-center font-display"
        style={{ color: "var(--color-text-ghost)", fontSize: 12 }}
        title={isDrop ? `Drop of set ${displayNumber}` : undefined}
      >
        {isDrop ? "↳" : displayNumber}
      </span>
      <div className="col-span-4">
        <input
          type="number"
          step="0.5"
          value={weightValue}
          onChange={(e) => (editing ? setDraftWeight(e.target.value) : onUpdate({ weight: e.target.value }))}
          placeholder="—"
          disabled={inputsDisabled}
          style={cellInput}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-line)")}
        />
      </div>
      <div className="col-span-4">
        <input
          type="number"
          value={repsValue}
          onChange={(e) => (editing ? setDraftReps(e.target.value) : onUpdate({ reps: e.target.value }))}
          placeholder="—"
          disabled={inputsDisabled}
          style={cellInput}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-line)")}
        />
      </div>
      <div className="col-span-3 flex justify-center items-center gap-1.5">
        {editing ? (
          <>
            <button
              onClick={confirmEdit}
              disabled={isSaving || !draftWeight || !draftReps}
              className="w-9 h-9 flex items-center justify-center transition-all duration-150 disabled:opacity-40"
              style={{ ...smallAction, borderColor: "var(--color-green)" }}
              title="Save revision"
            >
              <Check className="w-4 h-4" style={{ color: "var(--color-green)" }} />
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={isSaving}
              className="w-9 h-9 flex items-center justify-center transition-all duration-150 disabled:opacity-40"
              style={smallAction}
              title="Discard revision"
            >
              <X className="w-4 h-4" style={{ color: "var(--color-text-ghost)" }} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onLog}
              disabled={set.logged || isLogging || !set.weight || !set.reps}
              className="w-9 h-9 flex items-center justify-center transition-all duration-150 disabled:opacity-40"
              style={{
                ...smallAction,
                borderColor: set.logged
                  ? set.isPR
                    ? "var(--color-redline)"
                    : "var(--color-green)"
                  : "var(--color-line)",
              }}
              title={set.logged ? "Set logged" : "Log set"}
            >
              {set.isPR ? (
                <Trophy className="w-4 h-4" style={{ color: "var(--color-redline)" }} />
              ) : (
                <Check
                  className="w-4 h-4"
                  style={{ color: set.logged ? "var(--color-green)" : "var(--color-text-ghost)" }}
                />
              )}
            </button>
            {canRevise && (
              <button
                onClick={startEdit}
                disabled={isSaving || isRemoving}
                className="w-7 h-7 flex items-center justify-center transition-colors disabled:opacity-40 hover:text-[var(--color-paper)]"
                style={{ ...smallAction, color: "var(--color-text-ghost)" }}
                title="Revise set"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {(canRevise || !set.logged) && (
              <button
                onClick={onRemove}
                disabled={isSaving || isRemoving}
                className="w-7 h-7 flex items-center justify-center transition-colors disabled:opacity-40 hover:text-[var(--color-redline)]"
                style={{ ...smallAction, color: "var(--color-text-ghost)" }}
                title="Strike set"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
