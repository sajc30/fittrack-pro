"use client";

import { TodayWorkoutCard } from "./today-workout-card";
import { StreakCard } from "./streak-card";
import { WeeklySetsCard } from "./weekly-sets-card";
import { RecentPRsCard } from "./recent-prs-card";
import { QuickStatsCard } from "./quick-stats-card";
import { WeightTrendSparkline } from "./weight-trend-sparkline";

export function BentoGrid() {
  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Today's workout — full width, most important */}
      <div className="col-span-12">
        <TodayWorkoutCard />
      </div>

      {/* Streak + Weekly Sets side by side */}
      <div className="col-span-12 md:col-span-4">
        <StreakCard />
      </div>
      <div className="col-span-12 md:col-span-4">
        <WeeklySetsCard />
      </div>
      <div className="col-span-12 md:col-span-4">
        <WeightTrendSparkline />
      </div>

      {/* Recent PRs — wider */}
      <div className="col-span-12 md:col-span-7">
        <RecentPRsCard />
      </div>

      {/* Quick stats */}
      <div className="col-span-12 md:col-span-5">
        <QuickStatsCard />
      </div>
    </div>
  );
}
