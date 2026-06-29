"use client";

export type WeightUnit = "kg" | "lbs";

// Weight is lbs-only across the app. The database always stores kg; conversion
// happens only at the display/entry layer (toKg / fromKg / formatKg below).
// Kept as a hook-shaped API so existing call sites need no changes.
export function useWeightUnit(): { unit: WeightUnit; label: string } {
  return { unit: "lbs", label: "LBS" };
}

export function toKg(value: number, unit: WeightUnit): number {
  return unit === "lbs" ? value / 2.20462 : value;
}

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === "lbs" ? kg * 2.20462 : kg;
}

export function formatKg(kg: number, unit: WeightUnit): string {
  const v = fromKg(kg, unit);
  return v % 1 === 0 ? v.toFixed(0) : v.toFixed(1);
}
