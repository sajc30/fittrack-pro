"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveWorkout } from "@/lib/store/active-workout";
import { ArrowRight } from "lucide-react";

/**
 * Floating "session in progress" strip shown on every logged-in page except
 * the live session itself. The session is a background fact — this is how the
 * user sees it exists and jumps back in.
 */
export function ActiveSessionBanner() {
  const pathname = usePathname();
  const { workoutId, workoutName, exercises } = useActiveWorkout();

  // Persisted store rehydrates from localStorage after mount — render nothing
  // until then so server and client markup agree.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated || workoutId === null || pathname === "/workouts/new") return null;

  const loggedSets = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.logged).length,
    0
  );

  return (
    <Link
      href="/workouts/new"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-3 pl-4 pr-3 py-2.5 transition-transform duration-150 hover:-translate-y-0.5"
      style={{
        border: "1px solid var(--color-redline)",
        borderRadius: 2,
        backgroundColor: "color-mix(in srgb, var(--color-redline) 8%, var(--color-sheet))",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
      }}
      title="Return to the live session"
    >
      <span className="relative flex w-2 h-2 shrink-0">
        <span
          className="animate-ping absolute inline-flex h-full w-full opacity-60"
          style={{ backgroundColor: "var(--color-redline)", borderRadius: "50%" }}
        />
        <span
          className="relative inline-flex w-2 h-2"
          style={{ backgroundColor: "var(--color-redline)", borderRadius: "50%" }}
        />
      </span>
      <span className="flex flex-col min-w-0">
        <span
          className="font-display"
          style={{ color: "var(--color-redline)", fontSize: 11, letterSpacing: "0.14em" }}
        >
          SESSION IN PROGRESS
        </span>
        <span
          className="font-display truncate max-w-56"
          style={{ color: "var(--color-text-primary)", fontSize: 13, letterSpacing: "0.04em" }}
        >
          {workoutName} · {loggedSets} set{loggedSets !== 1 ? "s" : ""} logged
        </span>
      </span>
      <span
        className="flex items-center gap-1 px-2.5 py-1.5 shrink-0 font-display"
        style={{
          backgroundColor: "var(--color-redline)",
          color: "var(--color-ink)",
          fontSize: 11,
          letterSpacing: "0.12em",
          borderRadius: 2,
        }}
      >
        RESUME <ArrowRight className="w-3 h-3" />
      </span>
    </Link>
  );
}
