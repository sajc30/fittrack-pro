import { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BentoGrid } from "@/components/dashboard/bento-grid";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <DashboardHeader />
      <BentoGrid />
    </div>
  );
}
