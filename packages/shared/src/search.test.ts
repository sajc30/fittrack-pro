import { describe, it, expect } from "vitest";
import { scoreExerciseName, searchExercises } from "./search";

// A slice of the real catalog — names taken verbatim from the exercises table.
const CATALOG = [
  { name: "Bench Press" },
  { name: "Bent Press" }, // real catalog entry, one edit from "benh" like "Bench"
  { name: "Barbell Bench Press" },
  { name: "Decline Barbell Bench Press" },
  { name: "Incline Dumbbell Bench Press" },
  { name: "Dumbbell Bench Press" },
  { name: "Machine Chest Press" },
  { name: "Overhead Press" },
  { name: "Military Press" },
  { name: "Romanian Deadlift" },
  { name: "Deadlift" },
  { name: "Sumo Deadlift" },
  { name: "Lat Pulldown" },
  { name: "Close-Grip Lat Pulldown" },
  { name: "Barbell Row" },
  { name: "Seated Cable Row" },
  { name: "Bulgarian Split Squat" },
  { name: "Barbell Back Squat" },
  { name: "Dumbbell Lateral Raise" },
  { name: "Pull-Ups" },
  { name: "Leg Press" },
];

const names = (query: string, limit = 3) =>
  searchExercises(CATALOG, query, { limit }).map((e) => e.name);

describe("scoreExerciseName", () => {
  it("ranks exact above prefix above substring", () => {
    expect(scoreExerciseName("Bench Press", "bench press")).toBe(1);
    expect(scoreExerciseName("Bench Press Machine", "bench press")).toBe(0.9);
    expect(scoreExerciseName("Barbell Bench Press", "bench press")).toBe(0.8);
  });

  it("ignores punctuation and case", () => {
    expect(scoreExerciseName("Pull-Ups", "pull ups")).toBe(1);
    expect(scoreExerciseName("Close-Grip Lat Pulldown", "CLOSE GRIP")).toBe(0.9);
  });

  it("returns 0 for genuinely unrelated names", () => {
    expect(scoreExerciseName("Bench Press", "calf raise")).toBe(0);
  });

  it("treats an empty query as matching everything", () => {
    expect(scoreExerciseName("Bench Press", "   ")).toBe(1);
  });
});

describe("gym shorthand", () => {
  it.each([
    ["ohp", "Overhead Press"],
    ["rdl", "Romanian Deadlift"],
    ["bss", "Bulgarian Split Squat"],
    ["db bench", "Dumbbell Bench Press"],
    ["military", "Overhead Press"],
  ])("resolves %s → %s", (query, expected) => {
    expect(names(query)).toContain(expected);
  });

  it("maps 'military' to the overhead press despite no shared word", () => {
    // "Military Press" exists too, but the alias must not break its own match.
    expect(names("military press")).toContain("Military Press");
  });
});

describe("typo tolerance", () => {
  it.each([
    ["dumbell bench", "Dumbbell Bench Press"],
    ["romanain deadlift", "Romanian Deadlift"],
    ["benh press", "Bench Press"],
    ["squt", "Barbell Back Squat"],
  ])("recovers from %s", (query, expected) => {
    expect(names(query, 5)).toContain(expected);
  });

  it("stays strict on short words so 'row' never matches 'raise'", () => {
    expect(scoreExerciseName("Dumbbell Lateral Raise", "row")).toBe(0);
  });
});

describe("abbreviated and reordered queries", () => {
  it("matches ordered word prefixes", () => {
    expect(names("inc db bench")).toContain("Incline Dumbbell Bench Press");
  });

  it("matches words given out of order", () => {
    expect(names("press bench")).toContain("Bench Press");
  });
});

describe("ranking", () => {
  it("puts the shortest exact-ish name first", () => {
    expect(names("bench press")[0]).toBe("Bench Press");
  });

  it("prefers a strong long match over a weak short one", () => {
    // "Deadlift" is shorter, but "romanian" only matches the full name.
    expect(names("romanian deadlift")[0]).toBe("Romanian Deadlift");
  });

  it("respects the limit", () => {
    expect(searchExercises(CATALOG, "press", { limit: 2 })).toHaveLength(2);
  });

  it("returns the head of the list for an empty query", () => {
    expect(searchExercises(CATALOG, "", { limit: 3 })).toHaveLength(3);
  });
});

describe("prefer tie-break", () => {
  // "benh pres" is one edit from both "Bent Press" and "Bench Press", so text
  // alone cannot separate them — the shorter name would otherwise win.
  const trained = new Set(["Barbell Bench Press"]);

  it("leaves the wrong exercise on top without a preference", () => {
    expect(names("benh pres")[0]).toBe("Bent Press");
  });

  it("promotes an exercise the user actually trains", () => {
    const ranked = searchExercises(CATALOG, "benh pres", {
      prefer: (e) => trained.has(e.name),
    });
    expect(ranked[0].name).toBe("Barbell Bench Press");
  });

  it("never promotes a preferred item above a genuinely better match", () => {
    const ranked = searchExercises(CATALOG, "deadlift", {
      prefer: (e) => e.name === "Sumo Deadlift",
    });
    expect(ranked[0].name).toBe("Deadlift"); // exact match still wins
  });

  it("ignores preference when browsing with an empty query", () => {
    const ranked = searchExercises(CATALOG, "", {
      prefer: (e) => e.name === "Leg Press",
    });
    expect(ranked[0].name).toBe(CATALOG[0].name);
  });
});
