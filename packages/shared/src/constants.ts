import type { ActivityLevel, Equipment, MuscleGroup } from "./types";

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (desk job, little exercise)",
  lightly_active: "Lightly Active (1–3 days/week)",
  moderately_active: "Moderately Active (3–5 days/week)",
  very_active: "Very Active (6–7 days/week)",
  extra_active: "Extra Active (2× per day or physical job)",
};

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  core: "Core",
  quadriceps: "Quadriceps",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  full_body: "Full Body",
  cardio: "Cardio",
};

export const MUSCLE_GROUP_ORDER: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quadriceps",
  "hamstrings",
  "glutes",
  "core",
  "calves",
  "forearms",
  "full_body",
  "cardio",
];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  cable: "Cable",
  machine: "Machine",
  bodyweight: "Bodyweight",
  kettlebell: "Kettlebell",
  bands: "Bands",
  other: "Other",
};

export const EQUIPMENT_ORDER: Equipment[] = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
  "kettlebell",
  "bands",
  "other",
];

export const DEFAULT_REST_TIMER_SECONDS = 90;

export const RPE_LABELS: Record<number, string> = {
  6: "6 – No effort",
  7: "7 – Very easy",
  8: "8 – Easy",
  9: "9 – Moderate",
  10: "10 – Somewhat hard",
  11: "11 – Hard",
  12: "12",
  13: "13 – Very hard",
  14: "14",
  15: "15 – Extremely hard",
  16: "16",
  17: "17 – Near max",
  18: "18",
  19: "19 – Max effort",
  20: "20 – Absolute maximum",
};
