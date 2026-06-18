"use client";

import { useState, useEffect } from "react";

export type WeightUnit = "kg" | "lbs";

export function useWeightUnit(): { unit: WeightUnit; label: string } {
  const [unit, setUnit] = useState<WeightUnit>("kg");

  useEffect(() => {
    setUnit((localStorage.getItem("settings_weightUnit") as WeightUnit) ?? "kg");
  }, []);

  return { unit, label: unit === "lbs" ? "LBS" : "KG" };
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
