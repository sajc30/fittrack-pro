"use client";

import { CornerLeftDown } from "lucide-react";
import { useLastPerformance } from "@/lib/hooks/use-exercise-context";
import { useExercisePRs } from "@/lib/hooks/use-prs";
import { useWeightUnit, formatKg } from "@/lib/hooks/use-weight-unit";
import { formatRelativeDate } from "@fittrack/shared";

interface Props {
  exerciseId: string;
  /**
   * Loads a set's *load* into the next open row — never the reps. Reps are
   * what this session is trying to find out; carrying them over would presume
   * the answer. Never fires on its own.
   */
  onApply: (weight: string) => void;
}

/**
 * What you did last time, offered rather than applied. Prefilling the load
 * would assert that last session's numbers are today's target, which is wrong
 * coming back from a layoff or an injury — so nothing reaches an input until
 * the user taps a row.
 */
export function LastPerformanceCard({ exerciseId, onApply }: Props) {
  const { data: last } = useLastPerformance(exerciseId);
  const { data: pr } = useExercisePRs(exerciseId);
  const { unit, label } = useWeightUnit();

  if (!last || last.sets.length === 0) return null;

  return (
    <div
      className="mb-4 px-4 py-3"
      style={{
        backgroundColor: "var(--color-sheet-inset)",
        border: "1px solid var(--color-line)",
        borderRadius: 2,
      }}
    >
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="fig-label" style={{ fontSize: 9 }}>
          Last — {formatRelativeDate(last.lastPerformedAt)}
        </p>
        {pr && (
          <p className="label-caps" style={{ fontSize: 10 }}>
            Best {formatKg(pr.weight_kg, unit)} {label.toLowerCase()} × {pr.reps}
          </p>
        )}
      </div>

      <div className="space-y-1">
        {last.sets.map((s, i) => {
          // formatKg, not fromKg — the raw conversion puts 187.3927 in the input.
          const weight = s.weight_kg != null ? formatKg(s.weight_kg, unit) : "";
          const reps = s.reps != null ? String(s.reps) : "";
          const canApply = weight !== "";

          return (
            <button
              key={i}
              onClick={() => canApply && onApply(weight)}
              disabled={!canApply}
              className="w-full flex items-center gap-3 px-2 py-1.5 text-left transition-colors duration-150 hover:bg-[var(--color-sheet-raised)] disabled:opacity-50"
              style={{ borderRadius: 2 }}
              title={canApply ? "Load this weight into the next open set" : undefined}
            >
              <span
                className="shrink-0"
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-ghost)", width: 14 }}
              >
                {s.set_number}
              </span>
              <span
                className="flex-1"
                style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-primary)" }}
              >
                {s.weight_kg != null ? `${formatKg(s.weight_kg, unit)} ${label.toLowerCase()}` : "—"} × {reps || "—"}
              </span>
              {canApply && (
                <CornerLeftDown className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-text-ghost)" }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
