"use client";

import { useProfile } from "@/lib/hooks/use-profile";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardHeader() {
  const { data: profile } = useProfile();
  const firstName = profile?.name?.split(" ")[0];

  const now = new Date();
  const isoDate = now.toLocaleDateString("en-CA");

  return (
    <div
      className="mb-7 pb-5 border-b flex items-end justify-between"
      style={{ borderColor: "var(--color-line)" }}
    >
      <div>
        <p className="fig-label mb-1.5">Sht 01 — Dashboard</p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          {getGreeting()}{firstName ? `, ${firstName}` : ""}
        </h1>
      </div>
      <div className="text-right space-y-0.5 hidden sm:block">
        {profile?.name && (
          <p className="label-caps">Drawn: {profile.name}</p>
        )}
        <p className="label-caps">Date: {isoDate}</p>
      </div>
    </div>
  );
}
