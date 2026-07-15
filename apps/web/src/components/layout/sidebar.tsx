"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveWorkout } from "@/lib/store/active-workout";

const navItems = [
  { href: "/dashboard", sheet: "01", label: "Dashboard" },
  { href: "/workouts",  sheet: "02", label: "Workouts" },
  { href: "/progress",  sheet: "03", label: "Progress" },
  { href: "/body",      sheet: "04", label: "Body" },
  { href: "/exercises", sheet: "05", label: "Exercises" },
];

export function Sidebar() {
  const pathname = usePathname();
  const year = new Date().getFullYear();
  const workoutId = useActiveWorkout((s) => s.workoutId);

  // Persisted store rehydrates after mount; render the neutral state until then.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const sessionActive = hydrated && workoutId !== null;

  return (
    <aside
      className="flex flex-col w-60 shrink-0 h-full border-r"
      style={{ backgroundColor: "var(--color-sheet)", borderColor: "var(--color-line)" }}
    >
      {/* Title block */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--color-line)" }}>
        <p
          className="font-display font-semibold"
          style={{ color: "var(--color-text-primary)", fontSize: 15, letterSpacing: "0.22em" }}
        >
          IRON BLUEPRINT
        </p>
        <p className="label-caps mt-1" style={{ fontSize: 11 }}>
          Personal training log
        </p>
      </div>

      {/* Begin / resume session */}
      <div className="px-4 pt-4 pb-2">
        <Link
          href="/workouts/new"
          className="bp-btn flex items-center justify-center gap-2 w-full py-2.5"
          style={
            sessionActive
              ? { backgroundColor: "var(--color-redline)", color: "var(--color-ink)" }
              : undefined
          }
        >
          {sessionActive ? (
            <>
              <span
                className="inline-flex w-2 h-2 shrink-0 animate-pulse"
                style={{ backgroundColor: "var(--color-ink)", borderRadius: "50%" }}
              />
              Resume session
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              Begin session
            </>
          )}
        </Link>
      </div>

      {/* Sheet index */}
      <nav className="flex-1 px-4 py-3">
        <p className="label-caps mb-2 px-1">Sheet index</p>
        <div className="space-y-px">
          {navItems.map(({ href, sheet, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-baseline gap-3 px-2.5 py-2 text-sm transition-all duration-150 border-l-2",
                  active ? "hatch" : "hover:bg-[var(--color-sheet-raised)]"
                )}
                style={{
                  borderLeftColor: active ? "var(--color-paper)" : "transparent",
                  color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                }}
              >
                <span
                  className="font-display shrink-0"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    color: active ? "var(--color-paper)" : "var(--color-text-ghost)",
                  }}
                >
                  {sheet}
                </span>
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Settings + title-block footer */}
      <div className="px-4 pb-4 border-t pt-3" style={{ borderColor: "var(--color-line)" }}>
        <Link
          href="/settings"
          className={cn(
            "flex items-baseline gap-3 px-2.5 py-2 text-sm transition-all duration-150 border-l-2",
            pathname.startsWith("/settings") ? "hatch" : "hover:bg-[var(--color-sheet-raised)]"
          )}
          style={{
            borderLeftColor: pathname.startsWith("/settings") ? "var(--color-paper)" : "transparent",
            color: pathname.startsWith("/settings")
              ? "var(--color-text-primary)"
              : "var(--color-text-secondary)",
          }}
        >
          <span
            className="font-display shrink-0"
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              color: pathname.startsWith("/settings")
                ? "var(--color-paper)"
                : "var(--color-text-ghost)",
            }}
          >
            06
          </span>
          <span className="font-medium">Settings</span>
        </Link>
        <div
          className="mt-3 px-2.5 pt-2.5 border-t flex items-center justify-between"
          style={{ borderColor: "var(--color-line)" }}
        >
          <span className="label-caps" style={{ fontSize: 11 }}>Scale 1:1</span>
          <span className="label-caps" style={{ fontSize: 11 }}>{year}</span>
        </div>
      </div>
    </aside>
  );
}
