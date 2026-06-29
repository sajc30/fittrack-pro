import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// OAuth (Apple / Google) PKCE callback. Supabase redirects here with a `code`
// that we exchange for a session, setting the auth cookies. Onboarding/dashboard
// routing is then handled by the middleware based on profile completeness.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code, or exchange failed — surface a generic error on the login page.
  return NextResponse.redirect(`${origin}/auth/login?error=oauth`);
}
