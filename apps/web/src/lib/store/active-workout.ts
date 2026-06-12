import { create } from "zustand";

export interface ActiveSet {
  tempId: string;
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
  sets: ActiveSet[];
}

interface ActiveWorkoutState {
  workoutId: string | null;
  workoutName: string;
  startedAt: Date | null;
  exercises: ActiveExercise[];
  currentExerciseIndex: number;
  restSeconds: number;
  isResting: boolean;
  elapsedSeconds: number;

  // Actions
  startWorkout: (id: string, name: string) => void;
  addExercise: (exercise: Omit<ActiveExercise, "sets">) => void;
  removeExercise: (index: number) => void;
  addSet: (exerciseIndex: number) => void;
  updateSet: (exerciseIndex: number, setIndex: number, updates: Partial<ActiveSet>) => void;
  markSetLogged: (exerciseIndex: number, setIndex: number, isPR: boolean) => void;
  setCurrentExercise: (index: number) => void;
  startRestTimer: (seconds: number) => void;
  tickRest: () => void;
  tickElapsed: () => void;
  resetWorkout: () => void;
}

const makeSet = (): ActiveSet => ({
  tempId: Math.random().toString(36).slice(2),
  reps: "",
  weight: "",
  rpe: "",
  logged: false,
  isPR: false,
});

export const useActiveWorkout = create<ActiveWorkoutState>((set) => ({
  workoutId: null,
  workoutName: "",
  startedAt: null,
  exercises: [],
  currentExerciseIndex: 0,
  restSeconds: 0,
  isResting: false,
  elapsedSeconds: 0,

  startWorkout: (id, name) =>
    set({ workoutId: id, workoutName: name, startedAt: new Date(), elapsedSeconds: 0 }),

  addExercise: (exercise) =>
    set((state) => ({
      exercises: [
        ...state.exercises,
        { ...exercise, sets: [makeSet()] },
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

  markSetLogged: (exerciseIndex, setIndex, isPR) =>
    set((state) => {
      const exercises = [...state.exercises];
      exercises[exerciseIndex] = {
        ...exercises[exerciseIndex],
        sets: exercises[exerciseIndex].sets.map((s, i) =>
          i === setIndex ? { ...s, logged: true, isPR } : s
        ),
      };
      return { exercises };
    }),

  setCurrentExercise: (index) => set({ currentExerciseIndex: index }),

  startRestTimer: (seconds) =>
    set({ restSeconds: seconds, isResting: true }),

  tickRest: () =>
    set((state) => ({
      restSeconds: Math.max(0, state.restSeconds - 1),
      isResting: state.restSeconds > 1,
    })),

  tickElapsed: () =>
    set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),

  resetWorkout: () =>
    set({
      workoutId: null,
      workoutName: "",
      startedAt: null,
      exercises: [],
      currentExerciseIndex: 0,
      restSeconds: 0,
      isResting: false,
      elapsedSeconds: 0,
    }),
}));
