import { Metadata } from "next";
import { BodyMetricsView } from "@/components/body/body-metrics-view";

export const metadata: Metadata = { title: "Body Metrics" };

export default function BodyPage() {
  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="label-caps mb-1">Measurements</p>
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          Body Metrics
        </h1>
      </div>
      <BodyMetricsView />
    </div>
  );
}
