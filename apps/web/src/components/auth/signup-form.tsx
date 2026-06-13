"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const [name,            setName]            = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword,    setShowPassword]    = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [success,         setSuccess]         = useState(false);
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

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  const inputStyle = {
    fontFamily: "var(--font-mono)",
    backgroundColor: "var(--color-sheet-inset)",
    border: "1px solid var(--color-line)",
    color: "var(--color-text-primary)",
    borderRadius: 2,
    padding: "10px 12px",
    fontSize: 13,
    letterSpacing: "0.04em",
    width: "100%",
    outline: "none",
  } as const;

  if (success) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="fig-label" style={{ color: "rgb(34,197,94)" }}>✓ ACCOUNT FILED</p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-secondary)" }}>
          Check your email to confirm, then redirecting…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="fig-label mb-2" style={{ fontSize: 10 }}>Name</p>
        <input
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex Chen"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--color-line)")}
        />
      </div>

      <div>
        <p className="fig-label mb-2" style={{ fontSize: 10 }}>Email</p>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--color-line)")}
        />
      </div>

      <div>
        <p className="fig-label mb-2" style={{ fontSize: 10 }}>Password</p>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            style={{ ...inputStyle, paddingRight: 40 }}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-paper)")}
            onBlur={(e)  => (e.target.style.borderColor = "var(--color-line)")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
            style={{ color: "var(--color-text-ghost)" }}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
      </div>

      <div>
        <p className="fig-label mb-2" style={{ fontSize: 10 }}>Confirm password</p>
        <input
          type={showPassword ? "text" : "password"}
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat password"
          style={{
            ...inputStyle,
            borderColor: confirmPassword && confirmPassword !== password
              ? "var(--color-redline)"
              : "var(--color-line)",
          }}
          onFocus={(e) => {
            if (!confirmPassword || confirmPassword === password)
              e.target.style.borderColor = "var(--color-paper)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = confirmPassword && confirmPassword !== password
              ? "var(--color-redline)"
              : "var(--color-line)";
          }}
        />
        {confirmPassword && confirmPassword !== password && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-redline)", marginTop: 4 }}>
            ✕ Passwords don&apos;t match
          </p>
        )}
      </div>

      {error && (
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--color-redline)",
          border: "1px solid rgba(220,38,38,0.3)",
          backgroundColor: "rgba(220,38,38,0.06)",
          borderRadius: 2,
          padding: "8px 12px",
        }}>
          ✕ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 font-display uppercase tracking-widest transition-all duration-150 disabled:opacity-50"
        style={{ fontSize: 12, borderRadius: 2, backgroundColor: "var(--color-paper)", color: "var(--color-ink)", marginTop: 8 }}
      >
        {loading ? "FILING…" : "CREATE ACCOUNT"}
      </button>

      <p className="text-center" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-ghost)" }}>
        Already have an account?{" "}
        <Link href="/auth/login" style={{ color: "var(--color-paper)" }} className="hover:opacity-70 transition-opacity">
          Sign in
        </Link>
      </p>
    </form>
  );
}
