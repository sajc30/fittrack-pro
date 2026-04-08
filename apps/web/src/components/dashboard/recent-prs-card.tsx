"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";

const mockPRs = [
  { exercise: "Barbell Back Squat", weight: 140, reps: 5, date: "2 days ago" },
  { exercise: "Bench Press",        weight: 100, reps: 3, date: "4 days ago" },
  { exercise: "Deadlift",           weight: 180, reps: 1, date: "1 week ago" },
];

export function RecentPRsCard() {
  return (
    <div
      className="rounded-xl border p-5 h-full"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4" style={{ color: "var(--color-amber)" }} />
          <p className="label-caps">Recent PRs</p>
        </div>
        <Link
          href="/progress"
          className="text-xs font-medium transition-colors duration-[120ms]"
          style={{ color: "var(--color-text-ghost)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--color-amber)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--color-text-ghost)";
          }}
        >
          View all →
        </Link>
      </div>

      {mockPRs.length === 0 ? (
        <div className="py-8 text-center">
          <p style={{ color: "var(--color-text-ghost)", fontSize: 14 }}>
            Log 3 sessions of the same exercise to set your first PR.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {mockPRs.map((pr, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2.5 rounded-lg px-3 transition-colors duration-[120ms] hover:bg-[var(--color-raised)] cursor-pointer"
            >
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {pr.exercise}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-ghost)" }}>
                  {pr.date}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="stat-small"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {pr.weight} kg
                </span>
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold tracking-widest uppercase"
                  style={{
                    backgroundColor: "var(--color-amber-dim)",
                    color: "var(--color-amber)",
                    fontSize: 10,
                  }}
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
