"use client";

import Link from "next/link";
import { usePRs } from "@/lib/hooks/use-prs";
import { formatRelativeDate } from "@fittrack/shared";
import { useWeightUnit, formatKg } from "@/lib/hooks/use-weight-unit";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function RecentPRsCard() {
  const { data: prs, isLoading } = usePRs();
  const { unit, label } = useWeightUnit();
  const recent = (prs ?? []).slice(0, 4);

  return (
    <div className="sheet p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="fig-label">Fig. 4 — Revision history · personal records</p>
        <Link
          href="/progress"
          className="label-caps transition-colors duration-150 hover:!text-[var(--color-text-primary)]"
          style={{ fontSize: 11 }}
        >
          Full table →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-10 w-full" />)}
        </div>
      ) : recent.length === 0 ? (
        <div className="py-8 text-center">
          <p style={{ color: "var(--color-text-ghost)", fontSize: 14 }}>
            No revisions on file — log sets to establish your first records.
          </p>
        </div>
      ) : (
        <div>
          {recent.map((pr, i) => {
            const isFresh =
              Date.now() - new Date(pr.achieved_at).getTime() < SEVEN_DAYS_MS;
            const rev = recent.length - i;
            return (
              <div
                key={i}
                className="flex items-center gap-4 py-2.5 px-2 transition-colors duration-150 hover:bg-[var(--color-sheet-raised)]"
                style={{
                  borderBottom:
                    i < recent.length - 1 ? "1px solid var(--color-line)" : "none",
                }}
              >
                <span
                  className="font-display shrink-0 w-7"
                  style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--color-text-ghost)" }}
                >
                  R{rev}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {(pr.exercises as { name: string } | null)?.name ?? "Exercise"}
                  </p>
                  <p className="label-caps mt-0.5" style={{ fontSize: 11 }}>
                    {formatRelativeDate(pr.achieved_at)}
                  </p>
                </div>
                <span className="stat-small" style={{ color: "var(--color-text-primary)" }}>
                  {pr.weight_kg != null ? formatKg(pr.weight_kg, unit) : "—"} {label.toLowerCase()} × {pr.reps}
                </span>
                {isFresh && <span className="stamp shrink-0">PR</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
