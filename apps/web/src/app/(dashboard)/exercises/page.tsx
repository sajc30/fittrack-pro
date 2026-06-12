import { Metadata } from "next";
import { ExerciseLibrary } from "@/components/exercises/exercise-library";

export const metadata: Metadata = { title: "Exercise Library" };

export default function ExercisesPage() {
  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="label-caps mb-1">Library</p>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          Exercises
        </h1>
      </div>
      <ExerciseLibrary />
    </div>
  );
}
