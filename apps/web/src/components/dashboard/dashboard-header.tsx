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

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mb-8">
      <p className="label-caps mb-1">{today}</p>
      <h1
        className="text-2xl font-semibold tracking-tight"
        style={{ color: "var(--color-text-primary)" }}
      >
        {getGreeting()}{firstName ? `, ${firstName}` : ""}
      </h1>
    </div>
  );
}
