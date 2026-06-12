import { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { Zap } from "lucide-react";

export const metadata: Metadata = { title: "Create Account" };

export default function SignupPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-void)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "var(--color-amber)" }}
        >
          <Zap className="w-4 h-4" style={{ color: "var(--color-void)" }} />
        </div>
        <span
          className="font-display font-bold text-xl tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          FitTrack Pro
        </span>
      </div>

      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <h1
          className="text-xl font-semibold mb-1"
          style={{ color: "var(--color-text-primary)" }}
        >
          Create your account
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
          Start tracking your progress today.
        </p>
        <SignupForm />
      </div>
    </div>
  );
}
