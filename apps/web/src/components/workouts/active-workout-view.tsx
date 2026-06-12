"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveWorkout } from "@/lib/store/active-workout";
import {
  useCreateWorkout,
  useDeleteWorkout,
  useFinishWorkout,
  useLogSet,
} from "@/lib/hooks/use-workouts";
import { ExercisePicker } from "./exercise-picker";
import { estimateOneRepMax } from "@fittrack/shared";
import { createClient } from "@/lib/supabase/client";
import { X, Plus, Check, Clock, Trophy, ArrowRight } from "lucide-react";

const DEFAULT_REST = 90;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Rest countdown drawn as a depleting dimension arc. */
function RestArc({ remaining, total }: { remaining: number; total: number }) {
  const R = 8;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0, Math.min(1, remaining / total));
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r={R} fill="none" stroke="var(--color-line)" strokeWidth="2" />
      <circle
        cx="10" cy="10" r={R} fill="none"
        stroke="var(--color-paper)" strokeWidth="2"
        strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
        transform="rotate(-90 10 10)"
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
    </svg>
  );
}

export function ActiveWorkoutView() {
  const router = useRouter();
  const store = useActiveWorkout();
  const createWorkout = useCreateWorkout();
  const deleteWorkout = useDeleteWorkout();
  const finishWorkout = useFinishWorkout();
  const logSet = useLogSet();

  const [showPicker, setShowPicker] = useState(false);
  const [workoutName, setWorkoutName] = useState("Morning Workout");
  const [prFlash, setPrFlash] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);
  // Persisted store rehydrates from localStorage after mount — render nothing until
  // then so server and client markup agree.
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => setHydrated(true), []);

  // Start or use existing workout
  const hasStarted = store.workoutId !== null;

  // Timers derive from timestamps instead of counting ticks, so they stay correct
  // through page refreshes and background-tab throttling.
  const elapsedSeconds = store.startedAt
    ? Math.max(0, Math.floor((now - new Date(store.startedAt).getTime()) / 1000))
    : 0;
  const restSeconds = store.restEndsAt
    ? Math.max(0, Math.ceil((store.restEndsAt - now) / 1000))
    : 0;
  const isResting = restSeconds > 0;

  async function handleStart() {
    setActionError(null);
    try {
      const data = await createWorkout.mutateAsync({ name: workoutName });
      store.startWorkout(data.id, workoutName);
    } catch {
      setActionError("Could not open the session — check your connection and try again.");
    }
  }

  useEffect(() => {
    if (!hasStarted) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [hasStarted]);

  async function handleLogSet(exerciseIndex: number, setIndex: number) {
    if (!store.workoutId) return;
    const ex = store.exercises[exerciseIndex];
    const s = ex.sets[setIndex];
    const weight = parseFloat(s.weight);
    const reps = parseInt(s.reps);
    if (!weight || !reps) return;

    setActionError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const e1rm = estimateOneRepMax(weight, reps);
      // Read the current PR only to decide the celebration UX — the DB trigger
      // on workout_sets is what actually maintains personal_records.
      const { data: currentPR } = await supabase
        .from("personal_records")
        .select("estimated_one_rep_max")
        .eq("user_id", user.id)
        .eq("exercise_id", ex.exerciseId)
        .maybeSingle();

      const isPR = !currentPR || e1rm > (currentPR.estimated_one_rep_max ?? 0);

      await logSet.mutateAsync({
        workout_id: store.workoutId,
        exercise_id: ex.exerciseId,
        set_number: setIndex + 1,
        reps,
        weight_kg: weight,
        is_pr: isPR,
      });

      if (isPR) {
        setPrFlash(true);
        setTimeout(() => setPrFlash(false), 2500);
      }

      store.markSetLogged(exerciseIndex, setIndex, isPR);
      store.startRest(DEFAULT_REST);
    } catch {
      setActionError("Could not save the set — check your connection and try again.");
    }
  }

  async function handleFinish() {
    if (!store.workoutId || !store.startedAt) return;
    setActionError(null);
    try {
      await finishWorkout.mutateAsync({ workoutId: store.workoutId, startedAt: new Date(store.startedAt) });
      store.resetWorkout();
      router.push("/workouts");
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

  // Pre-start screen — open a new sheet
  if (!hasStarted) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-8">
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
      {/* Rest countdown line at top — a depleting dimension */}
      {isResting && (
        <div className="h-0.5 w-full shrink-0" style={{ backgroundColor: "var(--color-line)" }}>
          <div
            className="h-full transition-all duration-1000"
            style={{
              width: `${(restSeconds / DEFAULT_REST) * 100}%`,
              backgroundColor: "var(--color-paper)",
            }}
          />
        </div>
      )}

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

        <div
          className="flex items-center gap-2 px-3.5 py-1.5"
          style={{ border: "1px solid var(--color-line)", borderRadius: 2 }}
        >
          <Clock className="w-3.5 h-3.5" style={{ color: "var(--color-text-ghost)" }} />
          <span
            className="font-display"
            style={{ color: "var(--color-text-primary)", fontSize: 14, letterSpacing: "0.08em" }}
          >
            {formatTime(elapsedSeconds)}
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
                  className={`px-3 py-1.5 font-display whitespace-nowrap transition-all duration-150 shrink-0 ${active ? "hatch" : ""}`}
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    borderRadius: 2,
                    border: `1px solid ${active ? "var(--color-paper)" : "var(--color-line)"}`,
                    color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  }}
                >
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

          {/* Rest timer chip — dimension arc */}
          {isResting && (
            <div className="flex justify-center mt-3 shrink-0">
              <div
                className="flex items-center gap-2.5 px-4 py-2"
                style={{
                  backgroundColor: "var(--color-sheet)",
                  border: "1px solid var(--color-line-bright)",
                  borderRadius: 2,
                }}
              >
                <RestArc remaining={restSeconds} total={DEFAULT_REST} />
                <span
                  className="font-display"
                  style={{ color: "var(--color-text-primary)", fontSize: 13, letterSpacing: "0.08em" }}
                >
                  REST {formatTime(restSeconds)}
                </span>
                <button
                  onClick={() => store.clearRest()}
                  className="label-caps ml-1 transition-colors hover:!text-[var(--color-text-primary)]"
                  style={{ fontSize: 11 }}
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Active exercise */}
          {currentEx && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-4">
                <p className="fig-label mb-0.5">{currentEx.muscleGroup}</p>
                <h2 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {currentEx.exerciseName}
                </h2>
              </div>

              {/* Set rows */}
              <div className="space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 px-1">
                  <span className="col-span-1 label-caps">#</span>
                  <span className="col-span-4 label-caps">Load (kg)</span>
                  <span className="col-span-4 label-caps">Reps</span>
                  <span className="col-span-3 label-caps">Log</span>
                </div>

                {currentEx.sets.map((s, si) => (
                  <SetRow
                    key={s.tempId}
                    setIndex={si}
                    set={s}
                    onUpdate={(updates) => store.updateSet(store.currentExerciseIndex, si, updates)}
                    onLog={() => handleLogSet(store.currentExerciseIndex, si)}
                    isLogging={logSet.isPending}
                  />
                ))}
              </div>

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
            store.addExercise({ exerciseId: ex.id, exerciseName: ex.name, muscleGroup: ex.muscle_group });
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function SetRow({
  setIndex, set, onUpdate, onLog, isLogging,
}: {
  setIndex: number;
  set: { weight: string; reps: string; logged: boolean; isPR: boolean };
  onUpdate: (updates: { weight?: string; reps?: string }) => void;
  onLog: () => void;
  isLogging: boolean;
}) {
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

  return (
    <div
      className="grid grid-cols-12 gap-2 items-center"
      style={{ opacity: set.logged ? 0.55 : 1 }}
    >
      <span
        className="col-span-1 text-center font-display"
        style={{ color: "var(--color-text-ghost)", fontSize: 12 }}
      >
        {setIndex + 1}
      </span>
      <div className="col-span-4">
        <input
          type="number"
          step="0.5"
          value={set.weight}
          onChange={(e) => onUpdate({ weight: e.target.value })}
          placeholder="—"
          disabled={set.logged}
          style={cellInput}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-line)")}
        />
      </div>
      <div className="col-span-4">
        <input
          type="number"
          value={set.reps}
          onChange={(e) => onUpdate({ reps: e.target.value })}
          placeholder="—"
          disabled={set.logged}
          style={cellInput}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-line)")}
        />
      </div>
      <div className="col-span-3 flex justify-center">
        <button
          onClick={onLog}
          disabled={set.logged || isLogging || !set.weight || !set.reps}
          className="w-9 h-9 flex items-center justify-center transition-all duration-150 disabled:opacity-40"
          style={{
            backgroundColor: "var(--color-sheet-inset)",
            borderRadius: 2,
            border: `1px solid ${
              set.logged
                ? set.isPR
                  ? "var(--color-redline)"
                  : "var(--color-green)"
                : "var(--color-line)"
            }`,
          }}
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
      </div>
    </div>
  );
}
