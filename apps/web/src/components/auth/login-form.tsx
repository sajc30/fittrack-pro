"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          className="label-caps block mb-1.5"
          htmlFor="email"
        >
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
          onFocus={(e) =>
            (e.target.style.borderColor = "var(--color-amber)")
          }
          onBlur={(e) =>
            (e.target.style.borderColor = "var(--color-border)")
          }
        />
      </div>

      <div>
        <label
          className="label-caps block mb-1.5"
          htmlFor="password"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ ...inputStyle, paddingRight: 40 }}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--color-amber)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "var(--color-border)")
            }
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-ghost)" }}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
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
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <p
        className="text-center text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/signup"
          style={{ color: "var(--color-amber)" }}
          className="font-medium hover:opacity-80 transition-opacity"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
