"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Supabase sends a confirmation email by default.
    // If email confirmation is disabled in the dashboard, redirect straight to dashboard.
    setSuccess(true);
    setLoading(false);

    // Give the user a moment to read the success message, then redirect.
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  const inputStyle = {
    backgroundColor: "var(--color-inset)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    outline: "none",
    transition: "border-color 120ms",
  } as const;

  if (success) {
    return (
      <div className="text-center py-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.3)" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 9l4.5 4.5L15 5" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
          Account created!
        </p>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Check your email to confirm, then you&apos;ll be redirected.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label-caps block mb-1.5" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
        />
      </div>

      <div>
        <label className="label-caps block mb-1.5" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
        />
      </div>

      <div>
        <label className="label-caps block mb-1.5" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            style={{ ...inputStyle, paddingRight: 40 }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-amber)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-ghost)" }}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="label-caps block mb-1.5" htmlFor="confirm-password">
          Confirm Password
        </label>
        <input
          id="confirm-password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat your password"
          style={{
            ...inputStyle,
            borderColor:
              confirmPassword && confirmPassword !== password
                ? "var(--color-red)"
                : "var(--color-border)",
          }}
          onFocus={(e) => {
            if (!confirmPassword || confirmPassword === password) {
              e.target.style.borderColor = "var(--color-amber)";
            }
          }}
          onBlur={(e) => {
            e.target.style.borderColor =
              confirmPassword && confirmPassword !== password
                ? "var(--color-red)"
                : "var(--color-border)";
          }}
        />
        {confirmPassword && confirmPassword !== password && (
          <p className="text-xs mt-1.5" style={{ color: "var(--color-red)" }}>
            Passwords don&apos;t match
          </p>
        )}
      </div>

      {error && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          style={{
            color: "var(--color-red)",
            backgroundColor: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.2)",
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-[120ms] disabled:opacity-60"
        style={{
          backgroundColor: "var(--color-amber)",
          color: "var(--color-void)",
          marginTop: 8,
        }}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Creating account…" : "Create Account"}
      </button>

      <p className="text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Already have an account?{" "}
        <Link
          href="/auth/login"
          style={{ color: "var(--color-amber)" }}
          className="font-medium hover:opacity-80 transition-opacity"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
