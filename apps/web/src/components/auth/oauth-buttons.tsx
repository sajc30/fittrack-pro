"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

type Provider = "google" | "apple";

export function OAuthButtons() {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInWith(provider: Provider) {
    setLoading(provider);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser is redirected to the provider; we only land here on error.
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  const btn: React.CSSProperties = {
    backgroundColor: "var(--color-inset)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
    borderRadius: 2,
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    cursor: "pointer",
    transition: "border-color 120ms",
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        style={btn}
        disabled={loading !== null}
        onClick={() => signInWith("google")}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
      >
        {loading === "google" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <GoogleMark />
        )}
        Continue with Google
      </button>

      <button
        type="button"
        style={btn}
        disabled={loading !== null}
        onClick={() => signInWith("apple")}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-amber)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
      >
        {loading === "apple" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <AppleMark />
        )}
        Continue with Apple
      </button>

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

      <div className="flex items-center gap-3 pt-1">
        <span className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
        <span className="label-caps">or</span>
        <span className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="var(--color-text-primary)"
    >
      <path d="M17.05 12.78c-.02-2.07 1.69-3.06 1.77-3.11-.96-1.41-2.46-1.6-2.99-1.62-1.27-.13-2.49.75-3.13.75-.65 0-1.64-.73-2.7-.71-1.39.02-2.67.81-3.39 2.05-1.45 2.51-.37 6.22 1.03 8.26.69.99 1.5 2.1 2.57 2.06 1.04-.04 1.43-.67 2.68-.67 1.25 0 1.6.67 2.69.65 1.11-.02 1.81-1.01 2.49-2.01.78-1.15 1.1-2.27 1.12-2.33-.02-.01-2.15-.83-2.17-3.27ZM15.0 6.5c.57-.69.96-1.65.85-2.6-.83.03-1.83.55-2.42 1.24-.53.61-.99 1.59-.87 2.52.92.07 1.87-.47 2.44-1.16Z" />
    </svg>
  );
}
