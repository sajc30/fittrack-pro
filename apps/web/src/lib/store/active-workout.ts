import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ActiveSet {
  tempId: string;
  /** workout_sets row id once logged — null until then (and for sets persisted before this field existed). */
  dbId: string | null;
  /** Set this to the tempId of the set above to make this row a drop of it.
   *  Drops are real rows, so volume and PRs come out right; they just don't
   *  count as separate working sets. */
  parentTempId: string | null;
  reps: string;
  weight: string;
  rpe: string;
  logged: boolean;
  isPR: boolean;
}

export interface ActiveExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  equipment: string;
  /** Exercises sharing a group are performed as one superset. Null = on its own. */
  supersetGroup: number | null;
  sets: ActiveSet[];
}

/** Working sets only — drops belong to the set above them. */
export const workingSets = (sets: ActiveSet[]) => sets.filter((s) => s.parentTempId === null);

/** 1-based position of a set among working sets; a drop takes its parent's number. */
export function workingNumber(sets: ActiveSet[], index: number): number {
  let n = 0;
  for (let i = 0; i <= index; i++) if (sets[i].parentTempId === null) n++;
  return Math.max(1, n);
}

interface ActiveWorkoutState {
  workoutId: string | null;
  workoutName: string;
  /** ISO timestamp — elapsed time derives from this, so it survives refreshes and tab throttling. */
  startedAt: string | null;
  /** Free-form note for this session only. Kept here as well as in the DB so a
   *  refresh mid-sentence doesn't lose what's been typed. */
  notes: string;
  exercises: ActiveExercise[];
  currentExerciseIndex: number;

  // Actions
  startWorkout: (id: string, name: string) => void;
  setNotes: (notes: string) => void;
  /** initialWeight prefills the exercise's first set — used to default bodyweight load. */
  addExercise: (exercise: Omit<ActiveExercise, "sets" | "supersetGroup">, initialWeight?: string) => void;
  removeExercise: (index: number) => void;
  addSet: (exerciseIndex: number) => void;
  /** Append a drop to the set at parentIndex, below any drops it already has. */
  addDrop: (exerciseIndex: number, parentIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  /** Superset this exercise with any other in the session, joining that
   *  exercise's group if it already has one. */
  joinSuperset: (exerciseIndex: number, partnerIndex: number) => void;
  /** Break this exercise out of its superset. */
  leaveSuperset: (exerciseIndex: number) => void;
  updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<ActiveSet>) => void;
  markSetLogged: (exerciseIndex: number, setIndex: number, isPR: boolean, dbId: string) => void;
  setCurrentExercise: (index: number) => void;
  resetWorkout: () => void;
}

const makeSet = (): ActiveSet => ({
  tempId: Math.random().toString(36).slice(2),
  dbId: null,
  parentTempId: null,
  reps: "",
  weight: "",
  rpe: "",
  logged: false,
  isPR: false,
});

/** A superset needs two exercises; a group left with one is just an exercise. */
function dropLoneGroups(exercises: ActiveExercise[]): ActiveExercise[] {
  const counts = new Map<number, number>();
  for (const e of exercises) {
    if (e.supersetGroup !== null) counts.set(e.supersetGroup, (counts.get(e.supersetGroup) ?? 0) + 1);
  }
  return exercises.map((e) =>
    e.supersetGroup !== null && counts.get(e.supersetGroup)! < 2 ? { ...e, supersetGroup: null } : e
  );
}

export const useActiveWorkout = create<ActiveWorkoutState>()(
  persist(
    (set) => ({
      workoutId: null,
      workoutName: "",
      startedAt: null,
      notes: "",
      exercises: [],
      currentExerciseIndex: 0,

      startWorkout: (id, name) =>
        set({ workoutId: id, workoutName: name, startedAt: new Date().toISOString(), notes: "" }),

      setNotes: (notes) => set({ notes }),

      addExercise: (exercise, initialWeight) =>
        set((state) => ({
          exercises: [
            ...state.exercises,
            { ...exercise, supersetGroup: null, sets: [{ ...makeSet(), weight: initialWeight ?? "" }] },
          ],
          currentExerciseIndex: state.exercises.length,
        })),

      removeExercise: (index) =>
        set((state) => ({
          exercises: dropLoneGroups(state.exercises.filter((_, i) => i !== index)),
          currentExerciseIndex: Math.max(0, state.currentExerciseIndex - 1),
        })),

      addSet: (exerciseIndex) =>
        set((state) => {
          const exercises = [...state.exercises];
          // Copy the last *working* set, not the last row — carrying a drop's
          // reduced load into a fresh set would quietly walk the weight down.
          const lastSet = workingSets(exercises[exerciseIndex].sets).at(-1);
          exercises[exerciseIndex] = {
            ...exercises[exerciseIndex],
            sets: [
              ...exercises[exerciseIndex].sets,
              { ...makeSet(), weight: lastSet?.weight ?? "", reps: lastSet?.reps ?? "" },
            ],
          };
          return { exercises };
        }),

      addDrop: (exerciseIndex, parentIndex) =>
        set((state) => {
          const exercises = [...state.exercises];
          const sets = exercises[exerciseIndex].sets;
          const parent = sets[parentIndex];
          if (!parent || parent.parentTempId !== null) return {};

          // Drops sit directly under their parent, so insert past any it already has.
          let at = parentIndex + 1;
          while (at < sets.length && sets[at].parentTempId === parent.tempId) at++;

          // Prefill the load from the row above — a drop is that weight, reduced.
          const drop = { ...makeSet(), parentTempId: parent.tempId, weight: sets[at - 1].weight };
          exercises[exerciseIndex] = {
            ...exercises[exerciseIndex],
            sets: [...sets.slice(0, at), drop, ...sets.slice(at)],
          };
          return { exercises };
        }),

      removeSet: (exerciseIndex, setIndex) =>
        set((state) => {
          const exercises = [...state.exercises];
          const sets = exercises[exerciseIndex].sets;
          const removed = sets[setIndex];
          // A drop can't outlive its parent — the DB cascades, so the store must too.
          const doomed = new Set([removed.tempId]);
          exercises[exerciseIndex] = {
            ...exercises[exerciseIndex],
            sets: sets.filter(
              (s, i) => i !== setIndex && !(s.parentTempId != null && doomed.has(s.parentTempId))
            ),
          };
          return { exercises };
        }),

      joinSuperset: (exerciseIndex, partnerIndex) =>
        set((state) => {
          const exercises = [...state.exercises];
          const ex = exercises[exerciseIndex];
          const partner = exercises[partnerIndex];
          if (!ex || !partner || exerciseIndex === partnerIndex) return {};

          // Joining an exercise that's already supersetted pulls you into that
          // group rather than starting a new one — that's how a third exercise
          // gets added to an existing pairing.
          const group =
            partner.supersetGroup ??
            Math.max(0, ...exercises.map((e) => e.supersetGroup ?? 0)) + 1;

          exercises[partnerIndex] = { ...partner, supersetGroup: group };
          exercises[exerciseIndex] = { ...ex, supersetGroup: group };
          return { exercises: dropLoneGroups(exercises) };
        }),

      leaveSuperset: (exerciseIndex) =>
        set((state) => {
          const exercises = [...state.exercises];
          const ex = exercises[exerciseIndex];
          if (!ex) return {};
          exercises[exerciseIndex] = { ...ex, supersetGroup: null };
          return { exercises: dropLoneGroups(exercises) };
        }),

      updateSet: (exerciseIndex, setIndex, updates) =>
        set((state) => {
          const exercises = [...state.exercises];
          exercises[exerciseIndex] = {
            ...exercises[exerciseIndex],
            sets: exercises[exerciseIndex].sets.map((s, i) =>
              i === setIndex ? { ...s, ...updates } : s
            ),
          };
          return { exercises };
        }),

      markSetLogged: (exerciseIndex, setIndex, isPR, dbId) =>
        set((state) => {
          const exercises = [...state.exercises];
          exercises[exerciseIndex] = {
            ...exercises[exerciseIndex],
            sets: exercises[exerciseIndex].sets.map((s, i) =>
              i === setIndex ? { ...s, logged: true, isPR, dbId } : s
            ),
          };
          return { exercises };
        }),

      setCurrentExercise: (index) => set({ currentExerciseIndex: index }),

      resetWorkout: () =>
        set({
          workoutId: null,
          workoutName: "",
          startedAt: null,
          notes: "",
          exercises: [],
          currentExerciseIndex: 0,
        }),
    }),
    {
      name: "fittrack-active-workout",
      version: 2,
      // Sets persisted before `dbId` existed get null — edit/delete affordances
      // stay hidden for them rather than erroring on a missing row id. Anything
      // persisted before supersets/dropsets is, by definition, neither.
      migrate: (persisted) => {
        const state = persisted as ActiveWorkoutState;
        return {
          ...state,
          exercises: (state.exercises ?? []).map((ex) => ({
            ...ex,
            supersetGroup: ex.supersetGroup ?? null,
            sets: ex.sets.map((s) => ({ ...s, dbId: s.dbId ?? null, parentTempId: s.parentTempId ?? null })),
          })),
        };
      },
    }
  )
);
