/**
 * Format weight for display. Shows decimals only when needed.
 * 100 → "100", 102.5 → "102.5"
 */
export function formatWeight(kg: number, unit: "kg" | "lbs" = "kg"): string {
  const value = unit === "lbs" ? kg * 2.20462 : kg;
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

/**
 * Format duration in seconds to "mm:ss" or "hh:mm:ss".
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Format a date string to a human-readable relative string.
 * "Today", "Yesterday", "3 days ago", or full date.
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Format a date string to "Mon, Apr 7".
 */
export function formatWorkoutDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Day key in the user's local timezone — a 9pm workout must count for the local day, not the UTC one. */
function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Calculate the current streak from an array of workout dates (ISO strings).
 * Returns number of consecutive local-timezone days with at least one workout,
 * counting back from today (or yesterday, so a streak survives until midnight).
 */
export function calculateStreak(workoutDates: string[]): number {
  if (workoutDates.length === 0) return 0;

  const uniqueDays = [
    ...new Set(workoutDates.map((d) => localDayKey(new Date(d)))),
  ]
    .sort()
    .reverse();

  const today = localDayKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDayKey(yesterdayDate);

  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = parseDayKey(uniqueDays[i - 1]);
    const curr = parseDayKey(uniqueDays[i]);
    // Round to absorb DST days that aren't exactly 24h long
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Group an array by a key function.
 */
export function groupBy<T>(
  arr: T[],
  key: (item: T) => string
): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = key(item);
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
