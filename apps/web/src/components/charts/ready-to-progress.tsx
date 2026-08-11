"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowUp } from "lucide-react";
import { useProgression, type ExerciseProgress } from "@/lib/hooks/use-progression";
import { useWeightUnit, formatKg } from "@/lib/hooks/use-weight-unit";

/**
 * Double progression, surfaced.
 *
 * Leads with the exercises that earned a load increase and collapses the rest.
 * Showing every verdict at once turns a decision into a wall of amber — the
 * page should answer "what do I change today", and for most exercises the
 * honest answer is "nothing".
 */
export function ReadyToProgress() {
  const { data, isLoading } = useProgression();
  const { unit, label } = useWeightUnit();
  const [showRest, setShowRest] = useState(false);

  const ready = data.filter((d) => d.readiness === "add_load");
  const holding = data.filter((d) => d.readiness === "keep_going");
  const building = data.filter((d) => d.readiness === "build_reps");

  if (isLoading || data.length === 0) return null;

  const weight = (kg: number | null) => (kg == null ? "—" : `${formatKg(kg, unit)} ${label.toLowerCase()}`);

  const Row = ({ item, tone }: { item: ExerciseProgress; tone: "ready" | "muted" }) => (
    <div
      className="flex items-baseline justify-between gap-4 py-2 border-b last:border-b-0"
      style={{ borderColor: "var(--color-line)" }}
    >
      <div className="min-w-0">
        <p
          className="truncate"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: tone === "ready" ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          }}
        >
          {item.name}
        </p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-ghost)", marginTop: 1 }}>
          {item.lowestReps} rep{item.lowestReps === 1 ? "" : "s"} at {weight(item.lastWeightKg)} · target{" "}
          {item.range.min}–{item.range.max}
          {item.range.inferred ? " (from your history)" : ""}
        </p>
      </div>

      {tone === "ready" && (
        <div className="shrink-0 text-right">
          {item.suggestedWeightKg != null ? (
            <>
              <p className="flex items-center gap-1 justify-end" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-primary)" }}>
                <ArrowUp className="w-3 h-3" style={{ color: "var(--color-text-ghost)" }} />
                {weight(item.suggestedWeightKg)}
              </p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-text-ghost)" }}>
                try next session
              </p>
            </>
          ) : (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-ghost)" }}>
              add a little
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <section
      className="px-5 py-4"
      style={{ backgroundColor: "var(--color-sheet)", border: "1px solid var(--color-line)", borderRadius: 2 }}
    >
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <p className="fig-label" style={{ fontSize: 10 }}>Ready to progress</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-ghost)", marginTop: 2 }}>
            Every working set cleared the top of your rep range
          </p>
        </div>
        <p className="label-caps" style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
          {ready.length} of {data.length}
        </p>
      </div>

      {ready.length > 0 ? (
        <div>{ready.map((item) => <Row key={item.exerciseId} item={item} tone="ready" />)}</div>
      ) : (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-ghost)" }}>
          Nothing due for a load increase — hold what you&apos;re on and keep pushing reps.
        </p>
      )}

      {(holding.length > 0 || building.length > 0) && (
        <>
          <button
            onClick={() => setShowRest((v) => !v)}
            className="mt-3 flex items-center gap-1.5 label-caps"
            style={{ fontSize: 10, color: "var(--color-text-ghost)" }}
          >
            {showRest ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {holding.length} holding · {building.length} building reps
          </button>

          {showRest && (
            <div className="mt-2">
              {[...holding, ...building].map((item) => (
                <Row key={item.exerciseId} item={item} tone="muted" />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
