"use client";

import Link from "next/link";
import { Dumbbell, ArrowRight, Clock } from "lucide-react";

export function TodayWorkoutCard() {
  // In production this would be fetched from Supabase
  const hasPlannedWorkout = false;

  if (!hasPlannedWorkout) {
    return (
      <div
        className="relative overflow-hidden rounded-xl border p-6 flex items-center justify-between group"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Ambient amber glow in the corner */}
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: "var(--color-amber)", opacity: 0.04 }}
        />

        <div>
          <p className="label-caps mb-2">Today</p>
          <h2
            className="text-xl font-semibold mb-1"
            style={{ color: "var(--color-text-primary)" }}
          >
            Ready to train?
          </h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
            Start a new session or pick a template to get going.
          </p>
        </div>

        <Link
          href="/workouts/new"
          className="flex items-center gap-2.5 px-5 py-3 rounded-lg font-semibold text-sm shrink-0 transition-all duration-[120ms] group-hover:gap-3"
          style={{
            backgroundColor: "var(--color-amber)",
            color: "var(--color-void)",
          }}
        >
          <Dumbbell className="w-4 h-4" />
          Start Workout
          <ArrowRight className="w-4 h-4 transition-transform duration-[120ms] group-hover:translate-x-0.5" />
        </Link>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl border p-6"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="label-caps mb-2">Today&apos;s Plan</p>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            Push Day — Chest & Triceps
          </h2>
          <div className="flex items-center gap-4">
            <span
              className="flex items-center gap-1.5 text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <Clock className="w-3.5 h-3.5" />
              ~60 min
            </span>
            <span
              className="flex items-center gap-1.5 text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              6 exercises
            </span>
          </div>
        </div>
        <Link
          href="/workouts/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-[120ms]"
          style={{
            backgroundColor: "var(--color-amber)",
            color: "var(--color-void)",
          }}
        >
          Begin
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
