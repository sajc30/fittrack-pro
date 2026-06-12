"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveWorkout } from "@/lib/store/active-workout";
import {
  useCreateWorkout,
  useFinishWorkout,
  useLogSet,
  useUpsertPR,
} from "@/lib/hooks/use-workouts";
import { usePreviousSets, useExercisePRs } from "@/lib/hooks/use-prs";
import { ExercisePicker } from "./exercise-picker";
import { estimateOneRepMax } from "@fittrack/shared";
import { createClient } from "@/lib/supabase/client";
import {
  X, Plus, Check, Clock, Dumbbell, ChevronLeft, ChevronRight, Trophy, RotateCcw
} from "lucide-react";

const DEFAULT_REST = 90;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function ActiveWorkoutView() {
  const router = useRouter();
  const store = useActiveWorkout();
  const createWorkout = useCreateWorkout();
  const finishWorkout = useFinishWorkout();
  const logSet = useLogSet();
  const upsertPR = useUpsertPR();

  const [showPicker, setShowPicker] = useState(false);
  const [workoutName, setWorkoutName] = useState("Morning Workout");
  const [prFlash, setPrFlash] = useState(false);
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
    const data = await createWorkout.mutateAsync({ name: workoutName });
    store.startWorkout(data.id, workoutName);
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

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const e1rm = estimateOneRepMax(weight, reps);
    // Check for PR
    const { data: currentPR } = await supabase
      .from("personal_records")
      .select("estimated_one_rep_max")
      .eq("user_id", user.id)
      .eq("exercise_id", ex.exerciseId)
      .single();

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
      await upsertPR.mutateAsync({
        user_id: user.id,
        exercise_id: ex.exerciseId,
        weight_kg: weight,
        reps,
        estimated_one_rep_max: e1rm,
      });
      setPrFlash(true);
      setTimeout(() => setPrFlash(false), 2500);
    }

    store.markSetLogged(exerciseIndex, setIndex, isPR);
    store.startRest(DEFAULT_REST);
  }

  async function handleFinish() {
    if (!store.workoutId || !store.startedAt) return;
    await finishWorkout.mutateAsync({ workoutId: store.workoutId, startedAt: new Date(store.startedAt) });
    store.resetWorkout();
    router.push("/workouts");
  }

  if (!hydrated) return null;

  const currentEx = store.exercises[store.currentExerciseIndex];

  // Pre-start screen
  if (!hasStarted) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-8" style={{ backgroundColor: "var(--color-void)" }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--color-amber)" }}>
              <Dumbbell className="w-7 h-7" style={{ color: "var(--color-void)" }} />
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>Start a Workout</h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Name it, then add your exercises.</p>
          </div>
          <div className="mb-4">
            <label className="label-caps block mb-2">Workout Name</label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", outline: "none" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
            />
          </div>
          <button
            onClick={handleStart}
            disabled={!workoutName.trim() || createWorkout.isPending}
            className="w-full py-3.5 rounded-xl font-bold text-base disabled:opacity-50"
            style={{ backgroundColor: "var(--color-amber)", color: "var(--color-void)" }}
          >
            {createWorkout.isPending ? "Starting…" : "Start Workout"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: "var(--color-void)" }}>
      {/* Rest timer bar at top */}
      {isResting && (
        <div className="h-0.5 w-full" style={{ backgroundColor: "var(--color-border)" }}>
          <div
            className="h-full transition-all duration-1000"
            style={{
              width: `${(restSeconds / DEFAULT_REST) * 100}%`,
              backgroundColor: "var(--color-amber)",
            }}
          />
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: "var(--color-border)" }}
      >
        <button
          onClick={() => { if (confirm("Cancel workout? Your progress will be lost.")) { store.resetWorkout(); router.push("/workouts"); }}}
          className="p-2 rounded-lg"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <Clock className="w-3.5 h-3.5" style={{ color: "var(--color-amber)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--color-amber)" }}>{formatTime(elapsedSeconds)}</span>
        </div>

        <button
          onClick={handleFinish}
          disabled={finishWorkout.isPending}
          className="px-4 py-2 rounded-lg font-semibold text-sm"
          style={{ backgroundColor: "var(--color-amber)", color: "var(--color-void)" }}
        >
          {finishWorkout.isPending ? "Saving…" : "Finish"}
        </button>
      </div>

      {store.exercises.length === 0 ? (
        /* Empty state — pick first exercise */
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
          <p style={{ color: "var(--color-text-secondary)" }}>Add your first exercise to get started.</p>
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold"
            style={{ backgroundColor: "var(--color-amber)", color: "var(--color-void)" }}
          >
            <Plus className="w-4 h-4" /> Add Exercise
          </button>
        </div>
      ) : (
        <>
          {/* Exercise nav tabs */}
          <div
            className="flex items-center gap-1 px-4 py-3 border-b overflow-x-auto shrink-0"
            style={{ borderColor: "var(--color-border)" }}
          >
            {store.exercises.map((ex, i) => (
              <button
                key={i}
                onClick={() => store.setCurrentExercise(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-[120ms] shrink-0"
                style={{
                  backgroundColor: store.currentExerciseIndex === i ? "var(--color-amber)" : "var(--color-surface)",
                  color: store.currentExerciseIndex === i ? "var(--color-void)" : "var(--color-text-secondary)",
                  border: `1px solid ${store.currentExerciseIndex === i ? "var(--color-amber)" : "var(--color-border)"}`,
                }}
              >
                {ex.exerciseName}
              </button>
            ))}
            <button
              onClick={() => setShowPicker(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-all duration-[120ms] hover:bg-[var(--color-surface)]"
              style={{ color: "var(--color-text-ghost)", border: "1px solid var(--color-border)" }}
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>

          {/* PR flash */}
          {prFlash && (
            <div
              className="mx-6 mt-4 px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse"
              style={{ backgroundColor: "var(--color-amber-dim)", border: "1px solid var(--color-amber)" }}
            >
              <Trophy className="w-5 h-5" style={{ color: "var(--color-amber)" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--color-amber)" }}>New Personal Record!</p>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>You just hit a new all-time best.</p>
              </div>
            </div>
          )}

          {/* Rest timer chip */}
          {isResting && (
            <div className="flex justify-center mt-3">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-amber)" }}
              >
                <RotateCcw className="w-3.5 h-3.5" style={{ color: "var(--color-amber)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--color-amber)" }}>
                  Rest: {formatTime(restSeconds)}
                </span>
                <button onClick={() => store.clearRest()} className="text-xs ml-1" style={{ color: "var(--color-text-ghost)" }}>
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Active exercise */}
          {currentEx && (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-4">
                <p className="label-caps mb-0.5" style={{ color: "var(--color-amber)" }}>{currentEx.muscleGroup.toUpperCase()}</p>
                <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>{currentEx.exerciseName}</h2>
              </div>

              {/* Set rows */}
              <div className="space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 px-1">
                  <span className="col-span-1 label-caps">#</span>
                  <span className="col-span-4 label-caps">Weight (kg)</span>
                  <span className="col-span-4 label-caps">Reps</span>
                  <span className="col-span-3 label-caps">Done</span>
                </div>

                {currentEx.sets.map((s, si) => (
                  <SetRow
                    key={s.tempId}
                    setIndex={si}
                    set={s}
                    exerciseIndex={store.currentExerciseIndex}
                    onUpdate={(updates) => store.updateSet(store.currentExerciseIndex, si, updates)}
                    onLog={() => handleLogSet(store.currentExerciseIndex, si)}
                    isLogging={logSet.isPending}
                  />
                ))}
              </div>

              <button
                onClick={() => store.addSet(store.currentExerciseIndex)}
                className="mt-3 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all duration-[120ms] hover:bg-[var(--color-surface)]"
                style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
              >
                <Plus className="w-4 h-4" /> Add Set
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
  setIndex, set, exerciseIndex, onUpdate, onLog, isLogging,
}: {
  setIndex: number;
  set: { weight: string; reps: string; logged: boolean; isPR: boolean };
  exerciseIndex: number;
  onUpdate: (updates: { weight?: string; reps?: string }) => void;
  onLog: () => void;
  isLogging: boolean;
}) {
  const cellInput = {
    backgroundColor: "var(--color-inset)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 15,
    fontWeight: 600,
    width: "100%",
    outline: "none",
    textAlign: "center" as const,
  };

  return (
    <div
      className="grid grid-cols-12 gap-2 items-center"
      style={{ opacity: set.logged ? 0.5 : 1 }}
    >
      <span className="col-span-1 text-sm text-center" style={{ color: "var(--color-text-ghost)" }}>
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
          onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
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
          onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
        />
      </div>
      <div className="col-span-3 flex justify-center">
        <button
          onClick={onLog}
          disabled={set.logged || isLogging || !set.weight || !set.reps}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-[120ms] disabled:opacity-40"
          style={{
            backgroundColor: set.logged ? "var(--color-green)" : "var(--color-inset)",
            border: `1px solid ${set.logged ? "var(--color-green)" : set.isPR ? "var(--color-amber)" : "var(--color-border)"}`,
          }}
        >
          {set.isPR ? (
            <Trophy className="w-4 h-4" style={{ color: "var(--color-amber)" }} />
          ) : (
            <Check className="w-4 h-4" style={{ color: set.logged ? "white" : "var(--color-text-ghost)" }} />
          )}
        </button>
      </div>
    </div>
  );
}
