import { describe, expect, it } from "vitest";
import { suggestStartingWeight, type CandidateLift, type TargetExercise } from "./suggestion";

const lift = (over: Partial<CandidateLift>): CandidateLift => ({
  exerciseId: over.name ?? "id",
  name: "Lift",
  equipment: "barbell",
  movementPattern: "horizontal_push",
  muscleGroup: "chest",
  weightKg: 60,
  reps: 8,
  ...over,
});

const machinePress: TargetExercise = {
  equipment: "machine",
  movementPattern: "horizontal_push",
  muscleGroup: "chest",
};

describe("suggestStartingWeight", () => {
  it("says nothing when there's nothing comparable on file", () => {
    const result = suggestStartingWeight(machinePress, []);
    expect(result.basis).toBe("none");
    expect(result.rangeKg).toBeNull();
    expect(result.comparables).toEqual([]);
  });

  it("prefers same-equipment neighbours within the pattern", () => {
    const result = suggestStartingWeight(machinePress, [
      lift({ name: "Machine Press", equipment: "machine", weightKg: 50 }),
      lift({ name: "Barbell Bench", equipment: "barbell", weightKg: 100 }),
    ]);
    expect(result.basis).toBe("same_equipment");
    expect(result.comparables.map((c) => c.name)).toEqual(["Machine Press"]);
  });

  it("widens to the pattern when no equipment matches, and discounts harder", () => {
    const barbellOnly = [lift({ name: "Barbell Bench", equipment: "barbell", weightKg: 100 })];
    const wide = suggestStartingWeight(machinePress, barbellOnly);
    const close = suggestStartingWeight(
      { ...machinePress, equipment: "barbell" },
      barbellOnly
    );

    expect(wide.basis).toBe("same_pattern");
    expect(close.basis).toBe("same_equipment");
    // Same comparable, looser relationship — the wider net has to land lighter.
    expect(wide.rangeKg!.high).toBeLessThan(close.rangeKg!.high);
  });

  it("falls back to muscle group when the pattern is unclassified", () => {
    const result = suggestStartingWeight(
      { ...machinePress, movementPattern: null },
      [lift({ name: "Cable Flye", equipment: "cable", movementPattern: null })]
    );
    expect(result.basis).toBe("muscle_group");
    expect(result.rangeKg).not.toBeNull();
  });

  it("falls back to muscle group when the pattern matches nothing", () => {
    const result = suggestStartingWeight(machinePress, [
      lift({ name: "Cable Flye", equipment: "cable", movementPattern: "isolation" }),
    ]);
    expect(result.basis).toBe("muscle_group");
    expect(result.comparables.map((c) => c.name)).toEqual(["Cable Flye"]);
  });

  it("ignores exercises outside the target's pattern and muscle group", () => {
    const result = suggestStartingWeight(machinePress, [
      lift({ name: "Squat", movementPattern: "squat", muscleGroup: "quadriceps", weightKg: 180 }),
    ]);
    expect(result.basis).toBe("none");
  });

  it("takes the median so one outlier can't drag the estimate", () => {
    const withOutlier = suggestStartingWeight(machinePress, [
      lift({ name: "A", equipment: "machine", weightKg: 50 }),
      lift({ name: "B", equipment: "machine", weightKg: 55 }),
      lift({ name: "Freak Lift", equipment: "machine", weightKg: 300 }),
    ]);
    const without = suggestStartingWeight(machinePress, [
      lift({ name: "A", equipment: "machine", weightKg: 50 }),
      lift({ name: "B", equipment: "machine", weightKg: 55 }),
      lift({ name: "C", equipment: "machine", weightKg: 56 }),
    ]);
    expect(withOutlier.rangeKg!.high).toBeCloseTo(without.rangeKg!.high, 0);
  });

  it("lands below the comparable's own working weight", () => {
    // Starting a new movement at the load you already handle on a trained one
    // is the failure this whole feature exists to avoid.
    const result = suggestStartingWeight(machinePress, [
      lift({ name: "Machine Press", equipment: "machine", weightKg: 60, reps: 8 }),
    ]);
    expect(result.rangeKg!.high).toBeLessThan(60);
  });

  it("orders comparables heaviest first by estimated 1RM, not raw weight", () => {
    const result = suggestStartingWeight(machinePress, [
      lift({ name: "Heavy Single", equipment: "machine", weightKg: 90, reps: 1 }),
      lift({ name: "Moderate Eight", equipment: "machine", weightKg: 80, reps: 8 }),
    ]);
    // 80 × 8 → 101 e1RM beats 90 × 1 → 90, despite the lighter bar.
    expect(result.comparables.map((c) => c.name)).toEqual(["Moderate Eight", "Heavy Single"]);
  });

  it("aims at the top of the rep range, so a wider range starts lighter", () => {
    const candidates = [lift({ name: "Machine Press", equipment: "machine", weightKg: 60 })];
    const forTen = suggestStartingWeight(machinePress, candidates, 10);
    const forFive = suggestStartingWeight(machinePress, candidates, 5);
    expect(forTen.rangeKg!.high).toBeLessThan(forFive.rangeKg!.high);
  });

  it("ignores the isolation bucket and matches on muscle instead", () => {
    // A calf raise and a lateral raise are both `isolation` and share nothing
    // about load. Muscle group is the honest neighbour here.
    const calfRaise: TargetExercise = {
      equipment: "machine",
      movementPattern: "isolation",
      muscleGroup: "calves",
    };
    const lateralRaise = lift({
      name: "Lateral Raise",
      equipment: "machine",
      movementPattern: "isolation",
      muscleGroup: "shoulders",
      weightKg: 12,
    });

    expect(suggestStartingWeight(calfRaise, [lateralRaise]).basis).toBe("none");

    const calfHistory = lift({
      name: "Standing Calf Raise",
      equipment: "machine",
      movementPattern: "isolation",
      muscleGroup: "calves",
      weightKg: 90,
    });
    const matched = suggestStartingWeight(calfRaise, [lateralRaise, calfHistory]);
    expect(matched.basis).toBe("muscle_group");
    expect(matched.comparables.map((c) => c.name)).toEqual(["Standing Calf Raise"]);
  });

  it("never suggests less than an empty bar for a barbell movement", () => {
    // Light comparables on other equipment would otherwise put a barbell
    // suggestion below the 20 kg bar, which isn't a loadable weight.
    const result = suggestStartingWeight(
      { equipment: "barbell", movementPattern: "horizontal_push", muscleGroup: "chest" },
      [lift({ name: "Cable Press", equipment: "cable", weightKg: 15, reps: 10 })]
    );
    expect(result.rangeKg!.low).toBe(20);
    expect(result.rangeKg!.high).toBeGreaterThanOrEqual(20);
  });

  it("leaves the barbell floor alone once the estimate clears it", () => {
    const result = suggestStartingWeight(
      { equipment: "barbell", movementPattern: "horizontal_push", muscleGroup: "chest" },
      [lift({ name: "Barbell Bench", equipment: "barbell", weightKg: 100, reps: 8 })]
    );
    expect(result.rangeKg!.low).toBeGreaterThan(20);
  });

  it("skips candidates with no load or no reps on record", () => {
    const result = suggestStartingWeight(machinePress, [
      lift({ name: "Bodyweight Thing", equipment: "machine", weightKg: 0, reps: 12 }),
    ]);
    expect(result.basis).toBe("none");
  });
});
