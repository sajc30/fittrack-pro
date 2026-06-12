"use client";

import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";

export function TodayWorkoutCard() {
  return (
    <div className="sheet sheet-frame p-6 flex items-center justify-between gap-6">
      <div>
        <p className="fig-label mb-2">Work order — today</p>
        <h2
          className="text-xl font-semibold mb-1"
          style={{ color: "var(--color-text-primary)" }}
        >
          Ready to train?
        </h2>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
          No session on file for today. Open a new sheet and start logging sets.
        </p>
      </div>

      <Link
        href="/workouts/new"
        className="bp-btn group flex items-center gap-2.5 px-5 py-3 shrink-0"
      >
        <Plus className="w-4 h-4" />
        Begin session
        <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
