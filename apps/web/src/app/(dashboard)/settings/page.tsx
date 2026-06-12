import { Metadata } from "next";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="label-caps mb-1">Account</p>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          Settings
        </h1>
      </div>
      <SettingsForm />
    </div>
  );
}
