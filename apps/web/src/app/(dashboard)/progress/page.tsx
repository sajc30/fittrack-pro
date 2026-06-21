import { Metadata } from "next";
import { ProgressCharts } from "@/components/charts/progress-charts";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <div
        className="mb-7 pb-5 border-b flex items-end justify-between"
        style={{ borderColor: "var(--color-line)" }}
      >
        <div>
          <p className="fig-label mb-1.5">Progress</p>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Analytics
          </h1>
        </div>
        <p className="label-caps hidden sm:block">Strength &amp; sets plots</p>
      </div>
      <ProgressCharts />
    </div>
  );
}
