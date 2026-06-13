import { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create Account" };

export default function SignupPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-ink)" }}
    >
      <div className="mb-10 text-center">
        <p
          className="font-display font-bold tracking-[0.25em] uppercase mb-1"
          style={{ fontSize: 22, color: "var(--color-text-primary)" }}
        >
          FITTRACK
        </p>
        <p className="fig-label" style={{ fontSize: 11 }}>PERSONAL TRAINING LOG</p>
      </div>

      <div
        className="w-full max-w-sm p-8"
        style={{
          backgroundColor: "var(--color-sheet)",
          border: "1px solid var(--color-line)",
          borderRadius: 2,
        }}
      >
        <div className="mb-6 pb-4" style={{ borderBottom: "1px solid var(--color-line)" }}>
          <p className="fig-label mb-1" style={{ fontSize: 11 }}>Access — Create account</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-secondary)" }}>
            File a new drawing set.
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
