// ─── User & Profile ────────────────────────────────────────────────────────

export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extra_active";

export type FitnessGoal = "lose_fat" | "maintain" | "build_muscle" | "strength";

export type Gender = "male" | "female";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel;
  goal: FitnessGoal;
  created_at: string;
  updated_at: string;
}

// ─── Exercise ──────────────────────────────────────────────────────────────

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "core"
  | "quadriceps"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "full_body"
  | "cardio";

export type ExerciseType = "strength" | "cardio" | "bodyweight" | "olympic";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "cable"
  | "machine"
  | "bodyweight"
  | "kettlebell"
  | "bands"
  | "other";

export interface Exercise {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  equipment: Equipment;
  exercise_type: ExerciseType;
  description: string | null;
  instructions: string[];
  image_url: string | null;
  video_url: string | null;
  is_custom: boolean;
  user_id: string | null;
  created_at: string;
}

// ─── Workout & Sets ────────────────────────────────────────────────────────

export type SetType = "normal" | "warmup" | "dropset" | "failure" | "superset";

export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise?: Exercise;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  set_type: SetType;
  is_pr: boolean;
  notes: string | null;
  logged_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  started_at: string;
  finished_at: string | null;
  duration_minutes: number | null;
  template_id: string | null;
  sets?: WorkoutSet[];
  created_at: string;
}

// ─── Templates ─────────────────────────────────────────────────────────────

export interface TemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string;
  exercise?: Exercise;
  order: number;
  default_sets: number;
  default_reps: number | null;
  default_weight_kg: number | null;
}

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  exercises?: TemplateExercise[];
  created_at: string;
  updated_at: string;
}

// ─── Personal Records ───────────────────────────────────────────────────────

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  exercise?: Exercise;
  weight_kg: number;
  reps: number;
  estimated_one_rep_max: number;
  achieved_at: string;
  created_at: string;
}

// ─── Body Measurements ─────────────────────────────────────────────────────

export interface BodyMeasurement {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  bicep_cm: number | null;
  thigh_cm: number | null;
  notes: string | null;
  created_at: string;
}

// ─── Goals ─────────────────────────────────────────────────────────────────

export type GoalType =
  | "weight_target"
  | "lift_target"
  | "body_fat_target"
  | "workout_frequency";

export interface Goal {
  id: string;
  user_id: string;
  type: GoalType;
  title: string;
  target_value: number;
  current_value: number | null;
  unit: string;
  deadline: string | null;
  completed: boolean;
  created_at: string;
}

// ─── TDEE / Calorie Calculations ───────────────────────────────────────────

export interface TDEEResult {
  bmr: number;
  tdee: number;
  cutting: number;
  maintenance: number;
  bulking: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

// ─── Active Workout Session (client-side only) ────────────────────────────

export interface ActiveSet {
  tempId: string;
  exercise_id: string;
  set_number: number;
  reps: string;
  weight_kg: string;
  rpe: string;
  set_type: SetType;
  is_pr: boolean;
  logged: boolean;
}

export interface ActiveExercise {
  exercise: Exercise;
  sets: ActiveSet[];
  previousSets?: WorkoutSet[];
}

export interface ActiveWorkoutSession {
  workoutId: string | null;
  name: string;
  startedAt: Date;
  exercises: ActiveExercise[];
  currentExerciseIndex: number;
  restTimerActive: boolean;
  restTimerSeconds: number;
  restTimerTotal: number;
}
