import { Metadata } from "next";
import { ProgressCharts } from "@/components/charts/progress-charts";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="label-caps mb-1">Analytics</p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          Progress
        </h1>
      </div>
      <ProgressCharts />
    </div>
  );
}
