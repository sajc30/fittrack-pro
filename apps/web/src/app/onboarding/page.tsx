import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Zap } from "lucide-react";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Already completed onboarding — send to dashboard
  if (profile?.height_cm && profile?.weight_kg && profile?.date_of_birth) {
    redirect("/dashboard");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: "var(--color-void)" }}
    >
      <div className="flex items-center gap-2.5 mb-8">
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

      <div className="text-center mb-8">
        <h1
          className="text-2xl font-semibold tracking-tight mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Welcome{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}!
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
          Let&apos;s get you set up. It only takes a minute.
        </p>
      </div>

      <OnboardingWizard userId={user.id} existingName={profile?.name ?? ""} />
    </div>
  );
}
