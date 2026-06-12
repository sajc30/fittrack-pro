import { describe, expect, it } from "vitest";
import {
  ageFromDOB,
  bmiCategory,
  calculateBMI,
  calculateBMR,
  calculateTDEE,
  estimateOneRepMax,
  suggestNextWeight,
} from "./calculations";

describe("calculateBMR (Mifflin-St Jeor)", () => {
  it("matches the male formula", () => {
    // 10×80 + 6.25×180 − 5×25 + 5 = 1805
    expect(calculateBMR(80, 180, 25, "male")).toBe(1805);
  });

  it("matches the female formula", () => {
    // 10×60 + 6.25×165 − 5×30 − 161 = 1320 (rounded)
    expect(calculateBMR(60, 165, 30, "female")).toBe(1320);
  });
});

describe("calculateTDEE", () => {
  it("applies the activity multiplier", () => {
    const result = calculateTDEE(80, 180, 25, "male", "sedentary");
    expect(result.bmr).toBe(1805);
    expect(result.tdee).toBe(Math.round(1805 * 1.2));
    expect(result.cutting).toBe(result.tdee - 400);
    expect(result.bulking).toBe(result.tdee + 400);
  });

  it("macro calories roughly sum to the TDEE", () => {
    const r = calculateTDEE(80, 180, 25, "male", "moderately_active");
    const kcal = r.protein_g * 4 + r.carbs_g * 4 + r.fat_g * 9;
    expect(Math.abs(kcal - r.tdee)).toBeLessThan(10);
  });
});

describe("estimateOneRepMax (Epley)", () => {
  it("returns the weight itself for a single", () => {
    expect(estimateOneRepMax(140, 1)).toBe(140);
  });

  it("estimates from a set of five", () => {
    // 100 × (1 + 5/30) = 116.67 → 117
    expect(estimateOneRepMax(100, 5)).toBe(117);
  });
});

describe("calculateBMI", () => {
  it("computes weight over height squared", () => {
    expect(calculateBMI(80, 180)).toBe(24.7);
  });
});

describe("bmiCategory", () => {
  it("buckets correctly at the boundaries", () => {
    expect(bmiCategory(18.4)).toBe("Underweight");
    expect(bmiCategory(18.5)).toBe("Normal");
    expect(bmiCategory(25)).toBe("Overweight");
    expect(bmiCategory(30)).toBe("Obese");
  });
});

describe("ageFromDOB", () => {
  it("computes age accounting for whether the birthday has passed", () => {
    const today = new Date();
    const dob = `${today.getFullYear() - 25}-01-01`;
    expect(ageFromDOB(dob)).toBe(25);
  });
});

describe("suggestNextWeight", () => {
  it("adds 2.5kg when the rep target is met", () => {
    expect(suggestNextWeight(100, 8, 8)).toBe(102.5);
  });

  it("holds the weight when the target is missed", () => {
    expect(suggestNextWeight(100, 6, 8)).toBe(100);
  });
});
