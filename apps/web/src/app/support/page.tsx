import { Metadata } from "next";

export const metadata: Metadata = { title: "Support" };

const faqs = [
  {
    q: "How do I switch between kg and lbs?",
    a: "Open Settings → Spec B (Biometrics) and tap the KG / LBS chip next to the weight field. The whole app — dashboard, workouts, and progress charts — follows that setting.",
  },
  {
    q: "How are personal records calculated?",
    a: "Every set you log is converted to an estimated one-rep max (Epley formula). The highest estimate for each exercise becomes its personal record automatically — there's nothing to log manually.",
  },
  {
    q: "How do I delete my account and data?",
    a: "Email us at the address below and we'll delete your account and all associated data.",
  },
];

export default function SupportPage() {
  return (
    <div
      className="min-h-screen px-4 py-16"
      style={{ backgroundColor: "var(--color-ink)" }}
    >
      <div className="max-w-2xl mx-auto">
        <a
          href="/dashboard"
          className="inline-block mb-6 label-caps"
          style={{ fontSize: 12, color: "var(--color-text-ghost)" }}
        >
          ← Back to Iron Blueprint
        </a>

        <div className="mb-10">
          <p className="fig-label mb-1.5">Sht 08 — Support</p>
          <h1
            className="text-3xl font-semibold tracking-tight mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            Support
          </h1>
          <p className="label-caps" style={{ fontSize: 11 }}>
            Help with Iron Blueprint
          </p>
        </div>

        <div
          className="sheet sheet-frame p-8 mb-6"
          style={{ color: "var(--color-text-secondary)", fontSize: 15, lineHeight: 1.7 }}
        >
          <p>
            Run into a bug, have a question, or want to request a feature? Email us and we&rsquo;ll get back to
            you directly.
          </p>
          <p className="mt-4">
            <a
              href="mailto:ironblueprint6@gmail.com"
              className="font-display font-semibold"
              style={{ color: "var(--color-text-primary)", fontSize: 18, textDecoration: "underline" }}
            >
              ironblueprint6@gmail.com
            </a>
          </p>
        </div>

        <div className="sheet sheet-frame p-8 space-y-6">
          <p className="fig-label" style={{ fontSize: 13 }}>
            Frequently asked
          </p>
          {faqs.map((item) => (
            <div key={item.q}>
              <p className="font-semibold mb-1.5" style={{ color: "var(--color-text-primary)", fontSize: 15 }}>
                {item.q}
              </p>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 14, lineHeight: 1.6 }}>{item.a}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center" style={{ fontSize: 13 }}>
          <a href="/privacy" style={{ color: "var(--color-text-ghost)", textDecoration: "underline" }}>
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
