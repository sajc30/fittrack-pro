"use client";

import { useWeightUnit, fromKg } from "@/lib/hooks/use-weight-unit";
import type { StartingPoint } from "@fittrack/shared";
import { CornerDownLeft } from "lucide-react";

/** Round to something you can actually load on a machine or a bar. */
const toPlate = (value: number) => Math.round(value / 5) * 5;

const BASIS_NOTE: Record<StartingPoint["basis"], string> = {
  same_equipment: "Same movement, same equipment — the closest read available.",
  same_pattern: "Same movement on different equipment, so the load transfers loosely.",
  muscle_group: "Matched on muscle group only — treat this as a rough starting point.",
  none: "",
};

/**
 * What to do on an exercise with no history.
 *
 * Deliberately leads with the user's own comparable lifts rather than a single
 * confident number: the range is an estimate, and a number presented alone
 * invites loading a bar that hasn't been earned. Tapping a comparable loads its
 * weight, same as the last-performance card — the estimate is a suggestion, the
 * user's own lift is a fact.
 */
export function StartingPointCard({
  startingPoint,
  patternLabel,
  onApply,
}: {
  startingPoint: StartingPoint;
  /** The target's movement pattern, for the header annotation. */
  patternLabel: string | null;
  onApply: (weight: string) => void;
}) {
  const { unit, label } = useWeightUnit();
  const { basis, comparables, rangeKg } = startingPoint;

  const display = (kg: number) => toPlate(fromKg(kg, unit));

  return (
    <div
      className="mb-4 px-3 py-2.5"
      style={{
        backgroundColor: "var(--color-sheet-inset)",
        border: "1px solid var(--color-line)",
        borderRadius: 2,
      }}
    >
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="fig-label" style={{ fontSize: 9 }}>
          No history on file
        </p>
        {patternLabel && (
          <p className="label-caps" style={{ fontSize: 9, color: "var(--color-text-ghost)" }}>
            {patternLabel}
          </p>
        )}
      </div>

      {rangeKg === null ? (
        <p className="text-xs" style={{ color: "var(--color-text-ghost)" }}>
          Nothing comparable in your log yet. Start light, see how it moves, and the next
          session will have something to go on.
        </p>
      ) : (
        <>
          <p
            className="text-xs mb-1.5"
            style={{ color: "var(--color-text-ghost)" }}
          >
            Your comparable lifts
          </p>

          <div className="space-y-0.5 mb-2.5">
            {comparables.slice(0, 3).map((c) => {
              const weight = String(Math.round(fromKg(c.weightKg, unit) * 10) / 10);
              return (
                <button
                  key={c.exerciseId}
                  onClick={() => onApply(weight)}
                  className="w-full flex items-center gap-3 py-1.5 text-left transition-colors hover:text-[var(--color-paper)]"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <span className="truncate flex-1 text-xs">{c.name}</span>
                  <span
                    className="shrink-0"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {weight} {label.toLowerCase()} × {c.reps}
                  </span>
                  <CornerDownLeft className="w-3 h-3 shrink-0" style={{ color: "var(--color-text-ghost)" }} />
                </button>
              );
            })}
          </div>

          <div
            className="pt-2"
            style={{ borderTop: "1px solid var(--color-line)" }}
          >
            <div className="flex items-baseline gap-2">
              <span className="label-caps" style={{ fontSize: 10 }}>
                Suggested start
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 15,
                  color: "var(--color-text-primary)",
                }}
              >
                {display(rangeKg.low)}–{display(rangeKg.high)} {label.toLowerCase()}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-ghost)" }}>
              {BASIS_NOTE[basis]} Start at the low end and add load once you clear the top of
              your rep range.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
