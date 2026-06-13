import { Metadata } from "next";
import { BodyMetricsView } from "@/components/body/body-metrics-view";

export const metadata: Metadata = { title: "Body Metrics" };

export default function BodyPage() {
  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <div
        className="mb-7 pb-5 border-b flex items-end justify-between"
        style={{ borderColor: "var(--color-line)" }}
      >
        <div>
          <p className="fig-label mb-1.5">Sht 04 — Body</p>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Measurements
          </h1>
        </div>
        <p className="label-caps hidden sm:block">Weight, TDEE &amp; body specs</p>
      </div>
      <BodyMetricsView />
    </div>
  );
}
