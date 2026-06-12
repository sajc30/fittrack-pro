"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";
import { usePRs } from "@/lib/hooks/use-prs";
import { formatRelativeDate } from "@fittrack/shared";

export function RecentPRsCard() {
  const { data: prs, isLoading } = usePRs();
  const recent = (prs ?? []).slice(0, 4);

  return (
    <div
      className="rounded-xl border p-5 h-full"
      style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4" style={{ color: "var(--color-amber)" }} />
          <p className="label-caps">Recent PRs</p>
        </div>
        <Link
          href="/progress"
          className="text-xs font-medium transition-colors duration-[120ms] hover:text-amber-400"
          style={{ color: "var(--color-text-ghost)" }}
        >
          View all →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-10 w-full" />)}
        </div>
      ) : recent.length === 0 ? (
        <div className="py-8 text-center">
          <p style={{ color: "var(--color-text-ghost)", fontSize: 14 }}>
            Complete 3 sessions of any exercise to set your first PR.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {recent.map((pr, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2.5 rounded-lg px-3 transition-colors duration-[120ms] hover:bg-[var(--color-raised)] cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {(pr.exercises as { name: string } | null)?.name ?? "Exercise"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-ghost)" }}>
                  {formatRelativeDate(pr.achieved_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="stat-small" style={{ color: "var(--color-text-primary)" }}>
                  {pr.weight_kg} kg × {pr.reps}
                </span>
                <span
                  className="px-2 py-0.5 rounded font-bold tracking-widest uppercase"
                  style={{ backgroundColor: "var(--color-amber-dim)", color: "var(--color-amber)", fontSize: 10 }}
                >
                  PR
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
