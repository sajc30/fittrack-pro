import { describe, it, expect } from "vitest";
import {
  assessExercise,
  groupSessions,
  inferRepRange,
  nextWeightUp,
  type ProgressionSet,
  type RepRange,
} from "./progression";

const DEFAULT: RepRange = { min: 8, max: 10, inferred: false };

/** Sets for one session. `d` is a day number, turned into an ISO timestamp. */
const session = (d: number, ...sets: [number, number][]): ProgressionSet[] =>
  sets.map(([weightKg, reps]) => ({
    weightKg,
    reps,
    performedAt: `2026-06-${String(d).padStart(2, "0")}T10:00:00Z`,
  }));

describe("groupSessions", () => {
  it("buckets by timestamp, newest session first", () => {
    const sets = [...session(1, [100, 5]), ...session(3, [100, 5], [100, 4])];
    const grouped = groupSessions(sets);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]).toHaveLength(2); // the 3rd, most recent
    expect(grouped[1]).toHaveLength(1);
  });

  it("returns nothing for no sets", () => {
    expect(groupSessions([])).toEqual([]);
  });
});

describe("inferRepRange", () => {
  it("falls back until there are three sessions", () => {
    const sets = [...session(1, [100, 5]), ...session(2, [100, 5])];
    expect(inferRepRange(sets, DEFAULT)).toEqual({ min: 8, max: 10, inferred: false });
  });

  it("centres the user's own width on their median reps", () => {
    // Consistently 5 reps → width 2 kept, centred on 5 → 4–6.
    const sets = [
      ...session(1, [100, 5], [100, 5]),
      ...session(2, [100, 5], [100, 5]),
      ...session(3, [100, 5], [100, 5]),
    ];
    expect(inferRepRange(sets, DEFAULT)).toEqual({ min: 4, max: 6, inferred: true });
  });

  it("leaves a matching trainee on their default range", () => {
    const sets = [
      ...session(1, [50, 9], [50, 9]),
      ...session(2, [50, 9], [50, 9]),
      ...session(3, [50, 9], [50, 9]),
    ];
    expect(inferRepRange(sets, DEFAULT)).toMatchObject({ min: 8, max: 10 });
  });

  it("does NOT chase someone sitting at the top of their range", () => {
    // The regression that matters: a median of 10 on a default 8–10 must not
    // become 9–11, or "add load" can never fire for the person who earned it.
    const sets = [
      ...session(1, [60, 10], [60, 10]),
      ...session(2, [60, 10], [60, 10]),
      ...session(3, [60, 10], [60, 10]),
    ];
    expect(inferRepRange(sets, DEFAULT)).toEqual({ min: 8, max: 10, inferred: false });
  });

  it("never suggests a range starting below 1 rep", () => {
    const wide: RepRange = { min: 10, max: 20, inferred: false };
    const sets = [...session(1, [100, 2]), ...session(2, [100, 2]), ...session(3, [100, 2])];
    expect(inferRepRange(sets, wide).min).toBeGreaterThanOrEqual(1);
  });
});

describe("nextWeightUp", () => {
  it("uses the user's own next rung, not a fixed increment", () => {
    // Machine stack the user has actually loaded.
    expect(nextWeightUp([45, 65, 80, 95], 65)).toBe(80);
  });

  it("repeats their smallest real jump once past their heaviest", () => {
    expect(nextWeightUp([45, 65, 80, 95], 95)).toBe(110); // smallest gap is 15
  });

  it("declines to guess from a single logged weight", () => {
    expect(nextWeightUp([60], 60)).toBeNull();
    expect(nextWeightUp([], 60)).toBeNull();
  });

  it("ignores duplicates and zero-weight entries", () => {
    expect(nextWeightUp([0, 20, 20, 22.5], 20)).toBe(22.5);
  });
});

describe("assessExercise", () => {
  it("says add load when every set cleared the top of the range", () => {
    const sets = [
      ...session(1, [60, 10], [60, 10]),
      ...session(2, [60, 10], [60, 10]),
      ...session(3, [60, 10], [60, 10]),
    ];
    const a = assessExercise(sets, DEFAULT);
    expect(a.readiness).toBe("add_load");
    expect(a.lastWeightKg).toBe(60);
  });

  it("judges on the worst set, not the best", () => {
    // Opener clears 10, last set only managed 7 → not ready.
    const sets = [
      ...session(1, [60, 9], [60, 9]),
      ...session(2, [60, 9], [60, 9]),
      ...session(3, [60, 10], [60, 7]),
    ];
    const a = assessExercise(sets, DEFAULT);
    expect(a.readiness).toBe("build_reps");
    expect(a.lowestReps).toBe(7);
  });

  it("says keep going inside the range", () => {
    const sets = [
      ...session(1, [60, 9], [60, 9]),
      ...session(2, [60, 9], [60, 9]),
      ...session(3, [60, 9], [60, 9]),
    ];
    expect(assessExercise(sets, DEFAULT).readiness).toBe("keep_going");
  });

  it("suggests a load only when ready, and only from real history", () => {
    const sets = [
      ...session(1, [45, 10], [45, 10]),
      ...session(2, [65, 10], [65, 10]),
      ...session(3, [65, 10], [65, 10]),
    ];
    const a = assessExercise(sets, DEFAULT);
    expect(a.readiness).toBe("add_load");
    expect(a.suggestedWeightKg).toBe(85); // 45→65 is their only jump: 20
  });

  it("offers no suggestion when not ready to add load", () => {
    const sets = [
      ...session(1, [45, 6], [45, 6]),
      ...session(2, [65, 6], [65, 6]),
      ...session(3, [65, 6], [65, 6]),
    ];
    const a = assessExercise(sets, DEFAULT);
    expect(a.readiness).toBe("keep_going"); // inferred range centres on 6
    expect(a.suggestedWeightKg).toBeNull();
  });

  it("reports unknown rather than guessing with no history", () => {
    const a = assessExercise([], DEFAULT);
    expect(a.readiness).toBe("unknown");
    expect(a.lastWeightKg).toBeNull();
  });

  // Real logged history, transcribed from the training log. These are the cases
  // that matter: synthetic fixtures agree with whatever rule you wrote.
  describe("against real training history", () => {
    const from = (rows: [string, number, number][]): ProgressionSet[] =>
      rows.map(([performedAt, weightKg, reps]) => ({ performedAt, weightKg, reps }));

    it("Machine Row — mid-range, keep going", () => {
      const a = assessExercise(
        from([
          ["2026-07-13", 58.97, 9], ["2026-07-13", 54.43, 10],
          ["2026-07-16", 65.77, 10], ["2026-07-16", 61.24, 10],
          ["2026-07-20", 45.36, 10], ["2026-07-20", 54.43, 7],
          ["2026-07-23", 72.57, 9], ["2026-07-23", 68.04, 12],
          ["2026-07-27", 72.57, 9], ["2026-07-27", 72.57, 8],
          ["2026-08-03", 72.57, 10], ["2026-08-03", 72.57, 9],
          ["2026-08-06", 74.84, 9], ["2026-08-06", 72.57, 10],
          ["2026-08-10", 77.11, 8], ["2026-08-10", 74.84, 10],
        ]),
        DEFAULT
      );
      expect(a.readiness).toBe("keep_going"); // worst set of 8 is inside 8–10
      expect(a.lowestReps).toBe(8);
    });

    it("Cable Pull-Over — every set at 10, add load from their own ladder", () => {
      const a = assessExercise(
        from([
          ["2026-07-13", 19.28, 10], ["2026-07-13", 22.68, 10],
          ["2026-07-16", 22.68, 10], ["2026-07-16", 26.08, 8],
          ["2026-07-20", 26.08, 10], ["2026-07-20", 27.22, 10],
          ["2026-07-23", 26.08, 10], ["2026-07-23", 26.08, 9],
          ["2026-08-06", 22.68, 10], ["2026-08-06", 27.22, 10],
          ["2026-08-10", 26.08, 10], ["2026-08-10", 23.81, 10],
        ]),
        DEFAULT
      );
      expect(a.readiness).toBe("add_load");
      expect(a.lastWeightKg).toBe(26.08);
      expect(a.suggestedWeightKg).toBe(27.22); // a rung they've actually loaded
    });

    it("Seated Leg Curl — a lighter back-off set must not veto the verdict", () => {
      // 100lb x10 then 90lb x8. Judging every set reads the 8 and says "keep
      // going"; the 10 reps at top weight is what actually earned the increase.
      const a = assessExercise(
        from([
          ["2026-07-15", 36.29, 12], ["2026-07-15", 40.82, 13],
          ["2026-07-29", 45.36, 10], ["2026-07-29", 40.82, 8],
        ]),
        DEFAULT
      );
      expect(a.lowestReps).toBe(10); // the back-off 8 is ignored
      expect(a.lastWeightKg).toBe(45.36);
      expect(a.readiness).toBe("add_load");
    });

    it("Seated Calf Raise — high-rep back-off sets don't inflate the range", () => {
      // Back-offs run 15 reps by design; pooling them would drag the median up
      // and make "add load" harder to reach.
      const sets = from([
        ["2026-07-15", 24.95, 13], ["2026-07-15", 20.41, 15],
        ["2026-07-29", 29.48, 12], ["2026-07-29", 24.95, 12],
        ["2026-08-05", 31.75, 10], ["2026-08-05", 27.22, 15],
      ]);
      // Top-weight reps are 13, 12, 10 → median 12, not the 12.5 you'd get by
      // pooling the 15s.
      expect(inferRepRange(sets, DEFAULT)).toEqual({ min: 11, max: 13, inferred: true });
    });

    it("Machine Chest Press — trained heavy, range recentres and holds load", () => {
      const a = assessExercise(
        from([
          ["2026-07-13", 27.22, 10], ["2026-07-13", 29.48, 5],
          ["2026-07-16", 29.48, 8], ["2026-07-16", 31.75, 5],
          ["2026-07-23", 31.75, 6], ["2026-07-23", 22.68, 4], ["2026-07-23", 31.75, 4],
          ["2026-08-03", 29.48, 6], ["2026-08-03", 31.75, 5],
          ["2026-08-06", 29.48, 6], ["2026-08-06", 31.75, 6],
          ["2026-08-10", 31.75, 4], ["2026-08-10", 31.75, 7],
        ]),
        DEFAULT
      );
      // Top-weight reps are 5,5,6,4,5,6,4,7 → median 5, so 4–6. Pooling the
      // lighter sets would read median 6 and claim 5–7, overstating the range.
      expect(a.range).toEqual({ min: 4, max: 6, inferred: true });
      // 4 reps is the floor of that range, not below it: hold the load.
      expect(a.readiness).toBe("keep_going");
    });
  });

  it("ignores sets with no reps recorded", () => {
    const sets = [
      { weightKg: 60, reps: null, performedAt: "2026-06-03T10:00:00Z" },
      ...session(3, [60, 10]),
    ];
    expect(assessExercise(sets, DEFAULT).lowestReps).toBe(10);
  });
});
