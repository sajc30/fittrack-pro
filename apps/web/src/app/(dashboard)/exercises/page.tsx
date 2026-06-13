import { Metadata } from "next";
import { ExerciseLibrary } from "@/components/exercises/exercise-library";

export const metadata: Metadata = { title: "Exercise Library" };

export default function ExercisesPage() {
  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <div
        className="mb-7 pb-5 border-b flex items-end justify-between"
        style={{ borderColor: "var(--color-line)" }}
      >
        <div>
          <p className="fig-label mb-1.5">Sht 05 — Exercises</p>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Exercise Index
          </h1>
        </div>
        <p className="label-caps hidden sm:block">Catalog &amp; reference</p>
      </div>
      <ExerciseLibrary />
    </div>
  );
}
