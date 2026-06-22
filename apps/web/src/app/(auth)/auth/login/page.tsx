import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Cover-sheet wordmark */}
      <div className="text-center mb-10">
        <p
          className="font-display font-semibold"
          style={{
            color: "var(--color-text-primary)",
            fontSize: 22,
            letterSpacing: "0.28em",
          }}
        >
          IRON BLUEPRINT
        </p>
        <p className="label-caps mt-1.5">Personal training log</p>
      </div>

      <div className="sheet sheet-frame w-full max-w-sm p-8">
        <p className="fig-label mb-1.5">Access — sign in</p>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Enter your credentials to open the drawing set.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
