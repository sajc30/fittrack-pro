import { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div
      className="min-h-screen px-4 py-16"
      style={{ backgroundColor: "var(--color-ink)" }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <p className="fig-label mb-1.5">Sht 07 — Legal</p>
          <h1
            className="text-3xl font-semibold tracking-tight mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            Privacy Policy
          </h1>
          <p className="label-caps" style={{ fontSize: 11 }}>
            Effective June 22, 2026
          </p>
        </div>

        <div
          className="sheet sheet-frame p-8 space-y-8"
          style={{ color: "var(--color-text-secondary)", fontSize: 15, lineHeight: 1.7 }}
        >
          <section>
            <p>
              Iron Blueprint (&ldquo;the app&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a personal training
              log. This page explains what information the app collects, how it&rsquo;s used, and how you can
              control it.
            </p>
          </section>

          <section>
            <h2 className="fig-label mb-3" style={{ fontSize: 13 }}>
              Information we collect
            </h2>
            <ul className="space-y-3 list-disc pl-5">
              <li>
                <strong style={{ color: "var(--color-text-primary)" }}>Account information</strong> — your
                email address, used to authenticate you via Supabase Authentication.
              </li>
              <li>
                <strong style={{ color: "var(--color-text-primary)" }}>Profile information</strong> — name,
                date of birth, sex, height, weight, activity level, and fitness goal, which you provide
                during onboarding.
              </li>
              <li>
                <strong style={{ color: "var(--color-text-primary)" }}>Fitness data</strong> — the workouts,
                exercises, sets, reps, and weights you log, plus body-weight measurements over time and the
                personal records calculated from them.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="fig-label mb-3" style={{ fontSize: 13 }}>
              How we use your information
            </h2>
            <p>
              We use the information above solely to provide the app&rsquo;s core functionality: logging your
              workouts, calculating your strength and energy estimates, tracking your progress over time, and
              surfacing your personal records. We do not use your data for advertising, and we do not run any
              third-party analytics or tracking SDKs.
            </p>
          </section>

          <section>
            <h2 className="fig-label mb-3" style={{ fontSize: 13 }}>
              Data storage and security
            </h2>
            <p>
              Your data is stored in a Supabase-hosted Postgres database with row-level security enabled, so
              only your authenticated account can read or write your own records. Data is encrypted in transit
              over HTTPS.
            </p>
          </section>

          <section>
            <h2 className="fig-label mb-3" style={{ fontSize: 13 }}>
              Data sharing
            </h2>
            <p>
              We do not sell or share your personal information with third parties. Supabase, our database and
              authentication provider, processes data on our behalf and does not use it for its own purposes.
            </p>
          </section>

          <section>
            <h2 className="fig-label mb-3" style={{ fontSize: 13 }}>
              Data retention and deletion
            </h2>
            <p>
              Your data is retained for as long as your account remains active. To request deletion of your
              account and all associated data, contact us at the email below — we&rsquo;ll process the request
              promptly.
            </p>
          </section>

          <section>
            <h2 className="fig-label mb-3" style={{ fontSize: 13 }}>
              Children&rsquo;s privacy
            </h2>
            <p>
              Iron Blueprint is not directed at children under 13, and we do not knowingly collect information
              from children under 13.
            </p>
          </section>

          <section>
            <h2 className="fig-label mb-3" style={{ fontSize: 13 }}>
              Changes to this policy
            </h2>
            <p>
              We may update this policy from time to time. Material changes will be reflected by updating the
              effective date above.
            </p>
          </section>

          <section>
            <h2 className="fig-label mb-3" style={{ fontSize: 13 }}>
              Contact us
            </h2>
            <p>
              Questions about this policy or your data?{" "}
              <a
                href="mailto:TODO@example.com"
                style={{ color: "var(--color-text-primary)", textDecoration: "underline" }}
              >
                TODO@example.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
