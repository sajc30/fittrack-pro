import { Metadata } from "next";
import { WorkoutHistory } from "@/components/workouts/workout-history";

export const metadata: Metadata = { title: "Workouts" };

export default function WorkoutsPage() {
  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="label-caps mb-1">Training Log</p>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          Workouts
        </h1>
      </div>
      <WorkoutHistory />
    </div>
  );
}
