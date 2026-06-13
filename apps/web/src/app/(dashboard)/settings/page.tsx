import { Metadata } from "next";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <div
        className="mb-7 pb-5 border-b flex items-end justify-between"
        style={{ borderColor: "var(--color-line)" }}
      >
        <div>
          <p className="fig-label mb-1.5">Sht 06 — Settings</p>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Configuration
          </h1>
        </div>
        <p className="label-caps hidden sm:block">Profile &amp; preferences</p>
      </div>
      <SettingsForm />
    </div>
  );
}
