import { Metadata } from "next";
import { WorkoutHistory } from "@/components/workouts/workout-history";

export const metadata: Metadata = { title: "Workouts" };

export default function WorkoutsPage() {
  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <div
        className="mb-7 pb-5 border-b flex items-end justify-between"
        style={{ borderColor: "var(--color-line)" }}
      >
        <div>
          <p className="fig-label mb-1.5">Sht 02 — Workouts</p>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            Training log
          </h1>
        </div>
        <p className="label-caps hidden sm:block">Sessions on file, newest first</p>
      </div>
      <WorkoutHistory />
    </div>
  );
}
