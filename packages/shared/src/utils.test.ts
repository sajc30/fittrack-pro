import { describe, expect, it } from "vitest";
import {
  calculateStreak,
  clamp,
  formatDuration,
  formatWeight,
  groupBy,
} from "./utils";

/** ISO string for N days ago at the given local hour. */
function daysAgoAt(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

describe("calculateStreak", () => {
  it("returns 0 with no workouts", () => {
    expect(calculateStreak([])).toBe(0);
  });

  it("counts a single workout today", () => {
    expect(calculateStreak([daysAgoAt(0, 10)])).toBe(1);
  });

  it("counts a late-evening workout for the local day, not the UTC day", () => {
    // Regression: previously day keys came from toISOString(), so a 23:30
    // local workout could land on tomorrow's (or today's) UTC date and break the streak.
    expect(calculateStreak([daysAgoAt(0, 23, 30)])).toBe(1);
  });

  it("counts an early-morning workout for the local day", () => {
    expect(calculateStreak([daysAgoAt(0, 0, 30)])).toBe(1);
  });

  it("counts consecutive days", () => {
    expect(
      calculateStreak([daysAgoAt(0, 9), daysAgoAt(1, 22), daysAgoAt(2, 7)])
    ).toBe(3);
  });

  it("keeps the streak alive if the last workout was yesterday", () => {
    expect(calculateStreak([daysAgoAt(1, 18), daysAgoAt(2, 18)])).toBe(2);
  });

  it("breaks the streak after a missed day", () => {
    expect(calculateStreak([daysAgoAt(0, 9), daysAgoAt(2, 9)])).toBe(1);
  });

  it("returns 0 when the last workout is older than yesterday", () => {
    expect(calculateStreak([daysAgoAt(2, 9), daysAgoAt(3, 9)])).toBe(0);
  });

  it("dedupes multiple workouts on the same day", () => {
    expect(
      calculateStreak([daysAgoAt(0, 8), daysAgoAt(0, 19), daysAgoAt(1, 8)])
    ).toBe(2);
  });
});

describe("formatWeight", () => {
  it("hides decimals for whole numbers", () => {
    expect(formatWeight(100)).toBe("100");
  });

  it("shows one decimal when needed", () => {
    expect(formatWeight(102.5)).toBe("102.5");
  });

  it("converts to lbs", () => {
    expect(formatWeight(100, "lbs")).toBe("220.5");
  });
});

describe("formatDuration", () => {
  it("formats mm:ss", () => {
    expect(formatDuration(65)).toBe("01:05");
  });

  it("formats hh:mm:ss past an hour", () => {
    expect(formatDuration(3725)).toBe("1:02:05");
  });
});

describe("groupBy", () => {
  it("groups by key function", () => {
    const grouped = groupBy(
      [{ g: "a" }, { g: "b" }, { g: "a" }],
      (x) => x.g
    );
    expect(grouped.a).toHaveLength(2);
    expect(grouped.b).toHaveLength(1);
  });
});

describe("clamp", () => {
  it("clamps to bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
