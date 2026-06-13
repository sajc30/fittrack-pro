import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile?.height_cm && profile?.weight_kg && profile?.date_of_birth) {
    redirect("/dashboard");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
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

      <div className="mb-6 text-center">
        <p className="fig-label mb-1" style={{ fontSize: 12 }}>
          NEW SESSION{profile?.name ? ` — ${profile.name.split(" ")[0].toUpperCase()}` : ""}
        </p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-ghost)" }}>
          Complete your spec sheet to open the drawing set.
        </p>
      </div>

      <OnboardingWizard userId={user.id} existingName={profile?.name ?? ""} />
    </div>
  );
}
