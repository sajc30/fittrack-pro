"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  TrendingUp,
  Scale,
  Library,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/workouts",   label: "Workouts",   icon: Dumbbell },
  { href: "/progress",   label: "Progress",   icon: TrendingUp },
  { href: "/body",       label: "Body",       icon: Scale },
  { href: "/exercises",  label: "Exercises",  icon: Library },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col w-56 shrink-0 h-full border-r"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 py-5 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div
          className="w-7 h-7 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: "var(--color-amber)" }}
        >
          <Zap className="w-4 h-4" style={{ color: "var(--color-void)" }} />
        </div>
        <span
          className="font-display font-bold text-lg tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          FitTrack
        </span>
      </div>

      {/* Start Workout CTA */}
      <div className="px-3 pt-4 pb-2">
        <Link
          href="/workouts/new"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-[120ms]"
          style={{
            backgroundColor: "var(--color-amber)",
            color: "var(--color-void)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "var(--color-amber-glow)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "var(--color-amber)";
          }}
        >
          <Dumbbell className="w-4 h-4" />
          Start Workout
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-[120ms] group",
                active ? "" : "hover:bg-[var(--color-raised)]"
              )}
              style={{
                backgroundColor: active ? "var(--color-amber-dim)" : undefined,
                color: active
                  ? "var(--color-amber)"
                  : "var(--color-text-secondary)",
              }}
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={{
                  color: active
                    ? "var(--color-amber)"
                    : "var(--color-text-ghost)",
                }}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div
        className="px-3 pb-4 border-t pt-3"
        style={{ borderColor: "var(--color-border)" }}
      >
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-[120ms] hover:bg-[var(--color-raised)]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <Settings
            className="w-4 h-4 shrink-0"
            style={{ color: "var(--color-text-ghost)" }}
          />
          Settings
        </Link>
      </div>
    </aside>
  );
}
