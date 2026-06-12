import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute      = path.startsWith("/auth");
  const isSignOut        = path === "/auth/signout";
  const isOnboarding     = path === "/onboarding";
  const isPublicRoute    = path === "/" || isAuthRoute;
  const isApiRoute       = path.startsWith("/api");

  // Unauthenticated — redirect to login
  if (!user && !isPublicRoute && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Authenticated on an auth page (but not signout) — redirect to dashboard
  if (user && isAuthRoute && !isSignOut) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Authenticated user — check if onboarding is needed
  if (user && !isAuthRoute && !isOnboarding && !isApiRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("height_cm, weight_kg, date_of_birth")
      .eq("user_id", user.id)
      .single();

    const needsOnboarding =
      !profile || !profile.height_cm || !profile.weight_kg || !profile.date_of_birth;

    if (needsOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
