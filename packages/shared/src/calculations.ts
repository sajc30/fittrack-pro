import type { ActivityLevel, Gender, TDEEResult } from "./types";

// ─── Activity multipliers ───────────────────────────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

/**
 * Mifflin-St Jeor equation — most accurate for healthy adults.
 * weight_kg, height_cm, age in years.
 */
export function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: Gender
): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return Math.round(gender === "male" ? base + 5 : base - 161);
}

export function calculateTDEE(
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: Gender,
  activity_level: ActivityLevel
): TDEEResult {
  const bmr = calculateBMR(weight_kg, height_cm, age, gender);
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity_level]);

  // Macro breakdown based on maintenance
  const protein_g = Math.round(weight_kg * 2.2); // 1g per lb body weight
  const fat_g = Math.round((tdee * 0.25) / 9);
  const carbs_g = Math.round((tdee - protein_g * 4 - fat_g * 9) / 4);

  return {
    bmr,
    tdee,
    cutting: tdee - 400,
    maintenance: tdee,
    bulking: tdee + 400,
    protein_g,
    carbs_g,
    fat_g,
  };
}

/**
 * Epley formula for estimated one-rep max.
 * weight × (1 + reps / 30)
 */
export function estimateOneRepMax(weight_kg: number, reps: number): number {
  if (reps === 1) return weight_kg;
  return Math.round(weight_kg * (1 + reps / 30));
}

/**
 * Calculate BMI.
 */
export function calculateBMI(weight_kg: number, height_cm: number): number {
  const height_m = height_cm / 100;
  return Math.round((weight_kg / (height_m * height_m)) * 10) / 10;
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

/**
 * Calculate age from date of birth string (YYYY-MM-DD).
 */
export function ageFromDOB(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * Determine progressive overload suggestion.
 * Returns the suggested weight for the next session given recent performance.
 */
export function suggestNextWeight(
  currentWeight: number,
  repsAchieved: number,
  targetReps: number
): number {
  if (repsAchieved >= targetReps) {
    // Increase by 2.5kg if target met
    return Math.round((currentWeight + 2.5) * 4) / 4;
  }
  return currentWeight;
}
