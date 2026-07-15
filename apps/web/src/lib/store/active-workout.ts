import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ActiveSet {
  tempId: string;
  /** workout_sets row id once logged — null until then (and for sets persisted before this field existed). */
  dbId: string | null;
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
  sets: ActiveSet[];
}

interface ActiveWorkoutState {
  workoutId: string | null;
  workoutName: string;
  /** ISO timestamp — elapsed time derives from this, so it survives refreshes and tab throttling. */
  startedAt: string | null;
  exercises: ActiveExercise[];
  currentExerciseIndex: number;

  // Actions
  startWorkout: (id: string, name: string) => void;
  /** initialWeight prefills the exercise's first set — used to default bodyweight load. */
  addExercise: (exercise: Omit<ActiveExercise, "sets">, initialWeight?: string) => void;
  removeExercise: (index: number) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<ActiveSet>) => void;
  markSetLogged: (exerciseIndex: number, setIndex: number, isPR: boolean, dbId: string) => void;
  setCurrentExercise: (index: number) => void;
  resetWorkout: () => void;
}

const makeSet = (): ActiveSet => ({
  tempId: Math.random().toString(36).slice(2),
  dbId: null,
  reps: "",
  weight: "",
  rpe: "",
  logged: false,
  isPR: false,
});

export const useActiveWorkout = create<ActiveWorkoutState>()(
  persist(
    (set) => ({
      workoutId: null,
      workoutName: "",
      startedAt: null,
      exercises: [],
      currentExerciseIndex: 0,

      startWorkout: (id, name) =>
        set({ workoutId: id, workoutName: name, startedAt: new Date().toISOString() }),

      addExercise: (exercise, initialWeight) =>
        set((state) => ({
          exercises: [
            ...state.exercises,
            { ...exercise, sets: [{ ...makeSet(), weight: initialWeight ?? "" }] },
          ],
          currentExerciseIndex: state.exercises.length,
        })),

      removeExercise: (index) =>
        set((state) => ({
          exercises: state.exercises.filter((_, i) => i !== index),
          currentExerciseIndex: Math.max(0, state.currentExerciseIndex - 1),
        })),

      addSet: (exerciseIndex) =>
        set((state) => {
          const exercises = [...state.exercises];
          const lastSet = exercises[exerciseIndex].sets.at(-1);
          exercises[exerciseIndex] = {
            ...exercises[exerciseIndex],
            sets: [
              ...exercises[exerciseIndex].sets,
              { ...makeSet(), weight: lastSet?.weight ?? "", reps: lastSet?.reps ?? "" },
            ],
          };
          return { exercises };
        }),

      removeSet: (exerciseIndex, setIndex) =>
        set((state) => {
          const exercises = [...state.exercises];
          exercises[exerciseIndex] = {
            ...exercises[exerciseIndex],
            sets: exercises[exerciseIndex].sets.filter((_, i) => i !== setIndex),
          };
          return { exercises };
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
          exercises: [],
          currentExerciseIndex: 0,
        }),
    }),
    {
      name: "fittrack-active-workout",
      version: 1,
      // Sets persisted before `dbId` existed get null — edit/delete affordances
      // stay hidden for them rather than erroring on a missing row id.
      migrate: (persisted) => {
        const state = persisted as ActiveWorkoutState;
        return {
          ...state,
          exercises: (state.exercises ?? []).map((ex) => ({
            ...ex,
            sets: ex.sets.map((s) => ({ ...s, dbId: s.dbId ?? null })),
          })),
        };
      },
    }
  )
);
