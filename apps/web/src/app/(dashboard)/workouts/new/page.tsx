import { Metadata } from "next";
import { ActiveWorkoutView } from "@/components/workouts/active-workout-view";

export const metadata: Metadata = { title: "Active Workout" };

export default function NewWorkoutPage() {
  return <ActiveWorkoutView />;
}
