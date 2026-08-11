"use client";

import { Trophy } from "lucide-react";
import { MUSCLE_GROUP_LABELS, formatDuration } from "@fittrack/shared";

export interface SessionSummaryData {
  name: string;
  durationSeconds: number;
  sets: number;
  reps: number;
  /** Already in display units — the store holds what the user typed. */
  volume: number;
  prs: number;
  muscleGroups: string[];
}

/**
 * Shown once, on closing out a session. Every number here is already known the
 * moment the last set is logged — the value is in stating it plainly at the one
 * moment the user is looking for a verdict on the session.
 */
export function SessionSummary({
  data,
  unitLabel,
  onDone,
}: {
  data: SessionSummaryData;
  unitLabel: string;
  onDone: () => void;
}) {
  const stat = (label: string, value: string) => (
    <div className="flex-1 min-w-0">
      <p className="fig-label" style={{ fontSize: 9 }}>{label}</p>
      <p
        className="truncate"
        style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--color-text-primary)", marginTop: 2 }}
      >
        {value}
      </p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ backgroundColor: "rgba(5, 10, 18, 0.85)" }}
    >
      <div
        className="w-full max-w-md px-6 py-6"
        style={{ backgroundColor: "var(--color-sheet)", border: "1px solid var(--color-line)", borderRadius: 2 }}
      >
        <p className="fig-label" style={{ fontSize: 10 }}>Sheet filed</p>
        <h2 className="text-xl font-semibold mb-5" style={{ color: "var(--color-text-primary)" }}>
          {data.name}
        </h2>

        <div className="flex gap-4 mb-4">
          {stat("Duration", formatDuration(data.durationSeconds))}
          {stat("Sets", String(data.sets))}
          {stat("Reps", String(data.reps))}
        </div>

        <div
          className="px-4 py-3 mb-4"
          style={{ backgroundColor: "var(--color-sheet-inset)", border: "1px solid var(--color-line)", borderRadius: 2 }}
        >
          <p className="fig-label" style={{ fontSize: 9 }}>Total load moved</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: "var(--color-text-primary)", marginTop: 2 }}>
            {Math.round(data.volume).toLocaleString()} {unitLabel.toLowerCase()}
          </p>
        </div>

        {data.prs > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 mb-4"
            style={{ border: "1px solid var(--color-redline)", borderRadius: 2 }}
          >
            <Trophy className="w-4 h-4 shrink-0" style={{ color: "var(--color-redline)" }} />
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-redline)" }}>
              {data.prs} new record{data.prs > 1 ? "s" : ""}
            </p>
          </div>
        )}

        {data.muscleGroups.length > 0 && (
          <div className="mb-5">
            <p className="fig-label mb-1.5" style={{ fontSize: 9 }}>Worked</p>
            <div className="flex flex-wrap gap-1.5">
              {data.muscleGroups.map((m) => (
                <span
                  key={m}
                  className="px-2 py-1"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.06em",
                    color: "var(--color-text-secondary)",
                    border: "1px solid var(--color-line)",
                    borderRadius: 2,
                  }}
                >
                  {(MUSCLE_GROUP_LABELS[m as keyof typeof MUSCLE_GROUP_LABELS] ?? m).toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={onDone} className="bp-btn w-full py-2.5">
          Done
        </button>
      </div>
    </div>
  );
}
