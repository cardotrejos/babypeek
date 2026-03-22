import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, XCircle, Scale, ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare/babypeek-vs-seebaby")({
  component: BabypeekVsSeebabyPage,
});

const comparisonData = [
  { feature: "AI baby portrait generation", babypeek: true, seebaby: true },
  { feature: "Works with your existing ultrasound equipment", babypeek: true, seebaby: false },
  { feature: "No workflow change required", babypeek: true, seebaby: false },
  { feature: "Integrates into existing clinic software", babypeek: true, seebaby: false },
  { feature: "Patient scheduling system", babypeek: false, seebaby: true },
  { feature: "Online payments & billing", babypeek: false, seebaby: true },
  { feature: "Patient intake forms", babypeek: false, seebaby: true },
  { feature: "Portrait-only tool (no platform needed)", babypeek: true, seebaby: false },
  { feature: "Free trial available", babypeek: true, seebaby: true },
  { feature: "Setup in minutes", babypeek: true, seebaby: false },
  { feature: "Full clinic management platform", babypeek: false, seebaby: true },
  { feature: "Portrait quality (ultrasound-based)", babypeek: true, seebaby: true },
];

const faqs = [
  {
    question: "What's the difference between BabyPeek and SeeBaby?",
    answer:
      "SeeBaby is a full clinic management platform that includes scheduling, patient forms, payments, and AI baby portraits. BabyPeek is a standalone AI portrait tool that plugs into your existing workflow — if you already have scheduling and billing software you love, BabyPeek adds just the portrait piece.",
  },
  {
    question: "Can I use BabyPeek if I already have SeeBaby or another platform?",
    answer:
      "Yes. BabyPeek is designed to complement your existing setup. If you're already using SeeBaby, BabyPeek won't conflict with it — it's a separate tool you can add on top of your current platform for portrait generation.",
  },
  {
    question: "Which tool has better portrait quality?",
    answer:
      "Both BabyPeek and SeeBaby use AI trained on ultrasound-to-baby photo pairs. BabyPeek is purpose-built for portrait quality — that's its core focus — while SeeBaby spreads its AI work across a full platform. Many clinics report BabyPeek produces higher-quality portraits as a dedicated tool.",
  },
  {
    question: "Do I need to switch my entire clinic software to use BabyPeek?",
    answer:
      "No. BabyPeek is a standalone web tool. Your sonographer uploads the ultrasound image, gets the portrait, and delivers it to the patient. No new software to install, no migration, no training required.",
  },
  {
    question: "How long does BabyPeek take to set up?",
    answer:
      "About 5 minutes. Create an account, upload an image, get a portrait. There's nothing to install or configure. SeeBaby, as a full platform, typically requires a longer onboarding and may require migrating your existing patient data.",
  },
  {
    question: "What if I want both scheduling and AI portraits?",
    answer:
      "SeeBaby includes both. However, if you're already using a scheduling or practice management system you like, BabyPeek lets you add AI portraits without disrupting what already works. Evaluate whether the cost and friction of switching platforms makes sense for your clinic.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

export function BabypeekVsSeebabyPage() {
  return (
    <>
      <Helmet>
        <title>SeeBaby vs BabyPeek - AI Baby Portrait Comparison</title>
        <meta
          name="description"
          content="Compare BabyPeek vs SeeBaby: BabyPeek is the best-in-class AI baby portrait tool that plugs into your existing ultrasound workflow. SeeBaby is a full clinic platform. Here's how to choose."
        />
        <link rel="canonical" href="https://babypeek.io/compare/babypeek-vs-seebaby" />
        <meta property="og:title" content="SeeBaby vs BabyPeek - AI Baby Portrait Comparison" />
        <meta
          property="og:description"
          content="BabyPeek is the best-in-class AI baby portrait tool that plugs into your existing ultrasound workflow. SeeBaby is a full clinic platform. Here's how to choose."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://babypeek.io/compare/babypeek-vs-seebaby" />
      </Helmet>

      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-cream">
        {/* Minimal header */}
        <header className="p-4 sm:p-6 safe-top">
          <div className="sm:max-w-[640px] sm:mx-auto flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="BabyPeek" className="h-8 w-8" />
              <span className="font-display text-xl text-charcoal font-semibold">BabyPeek</span>
            </Link>
          </div>
        </header>

        <main id="main-content" className="px-4 sm:px-6 sm:max-w-[640px] sm:mx-auto pt-8 pb-12">
          {/* Breadcrumb */}
          <nav className="text-sm text-warm-gray mb-6">
            <Link to="/" className="hover:text-coral transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/compare/ai-baby-generators-2026" className="hover:text-coral transition-colors">Compare</Link>
            <span className="mx-2">/</span>
            <span className="text-charcoal">SeeBaby vs BabyPeek</span>
          </nav>

          {/* H1 */}
          <div className="flex items-start gap-3 mb-6">
            <Scale className="w-8 h-8 text-coral shrink-0 mt-1" />
            <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight">
              BabyPeek vs SeeBaby: Choosing the Right AI for Your Ultrasound Clinic
            </h1>
          </div>
          <p className="text-warm-gray text-lg mb-8">
            Both tools generate AI baby portraits from ultrasound images — but they take very different approaches.
            Here's the honest comparison.
          </p>

          {/* Summary cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            <div className="rounded-2xl border-2 border-coral bg-coral-light p-6">
              <div className="text-xs font-semibold text-coral uppercase tracking-wide mb-2">BabyPeek</div>
              <h2 className="font-display text-xl text-charcoal mb-2">Best for clinics that want AI portraits — nothing more</h2>
              <p className="text-sm text-warm-gray mb-4">
                A focused, best-in-class portrait tool. Plugs into your existing workflow. Live in 5 minutes.
              </p>
              <ul className="space-y-1.5 text-sm text-charcoal">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-coral mt-0.5 shrink-0" /> No workflow change</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-coral mt-0.5 shrink-0" /> Portrait quality focused</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-coral mt-0.5 shrink-0" /> Works with existing software</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-coral mt-0.5 shrink-0" /> Setup in 5 minutes</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-charcoal/10 bg-white/60 p-6">
              <div className="text-xs font-semibold text-warm-gray uppercase tracking-wide mb-2">SeeBaby</div>
              <h2 className="font-display text-xl text-charcoal mb-2">Best for clinics that want a full platform</h2>
              <p className="text-sm text-warm-gray mb-4">
                Scheduling, forms, payments, and AI portraits all in one. Great if you're starting fresh or willing to migrate.
              </p>
              <ul className="space-y-1.5 text-sm text-charcoal">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-warm-gray mt-0.5 shrink-0" /> Full clinic management</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-warm-gray mt-0.5 shrink-0" /> Built-in payments</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-warm-gray mt-0.5 shrink-0" /> Patient forms included</li>
                <li className="flex items-start gap-2"><XCircle className="w-4 h-4 text-warm-gray mt-0.5 shrink-0" /> Requires platform switch</li>
              </ul>
            </div>
          </div>

          {/* Comparison table */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-4">Feature Comparison</h2>
            <div className="rounded-xl border border-charcoal/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-coral-light">
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Feature</th>
                    <th className="text-center px-4 py-3 font-semibold text-coral">BabyPeek</th>
                    <th className="text-center px-4 py-3 font-semibold text-charcoal/60">SeeBaby</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map(({ feature, babypeek, seebaby }, i) => (
                    <tr key={feature} className={i % 2 === 0 ? "bg-white/40" : ""}>
                      <td className="px-4 py-3 text-charcoal font-medium">{feature}</td>
                      <td className="px-4 py-3 text-center">
                        {babypeek
                          ? <CheckCircle2 className="w-5 h-5 text-coral mx-auto" />
                          : <XCircle className="w-5 h-5 text-charcoal/30 mx-auto" />}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {seebaby
                          ? <CheckCircle2 className="w-5 h-5 text-charcoal/50 mx-auto" />
                          : <XCircle className="w-5 h-5 text-charcoal/20 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pros */}
          <div className="grid sm:grid-cols-2 gap-6 mb-12">
            <div>
              <h2 className="font-display text-xl text-charcoal mb-4">BabyPeek Pros</h2>
              <ul className="space-y-3">
                {[
                  "Zero workflow disruption — your sonographers won't need to learn anything new",
                  "Works alongside existing scheduling, EMR, or practice management software",
                  "Purpose-built AI for portrait quality, not spread across ten features",
                  "Free pilot — 20 complimentary portraits, no credit card",
                  "Live in 5 minutes — no data migration, no onboarding weeks",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-warm-gray">
                    <span className="text-coral shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-xl text-charcoal mb-4">SeeBaby Pros</h2>
              <ul className="space-y-3">
                {[
                  "All-in-one platform — no juggling multiple tools",
                  "Patient scheduling and intake forms built in",
                  "Online payment processing included",
                  "Good option if starting a new clinic from scratch",
                  "Single vendor for support and billing",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-warm-gray">
                    <span className="text-warm-gray shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Honest verdict */}
          <div className="rounded-2xl bg-white/60 border border-charcoal/10 p-6 mb-12">
            <h2 className="font-display text-xl text-charcoal mb-3">The Honest Verdict</h2>
            <p className="text-sm text-warm-gray leading-relaxed">
              If you already have a scheduling system, an EMR, or a patient management tool you like, BabyPeek is
              the better choice — it adds the AI portrait layer without forcing you to migrate everything else. If
              you're starting a new clinic and want one platform to handle everything, SeeBaby is worth evaluating.
              The key question is: <strong className="text-charcoal">do you want AI baby portraits, or do you want
              a full clinic management system that includes AI portraits?</strong> Those are different needs.
            </p>
          </div>

          {/* FAQ */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map(({ question, answer }) => (
                <details key={question} className="group rounded-xl border border-charcoal/10 bg-white/60 overflow-hidden">
                  <summary className="px-4 py-4 cursor-pointer text-sm font-medium text-charcoal hover:text-coral list-none flex items-center justify-between">
                    {question}
                    <span className="shrink-0 ml-2 text-coral group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="px-4 pb-4 text-sm text-warm-gray leading-relaxed border-t border-charcoal/5 pt-3">
                    {answer}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              className={cn(
                "text-lg font-semibold",
                "bg-coral hover:bg-coral-hover text-white",
                "shadow-lg hover:shadow-xl",
                "transition-all duration-200",
              )}
            >
              <Link to="/">Try BabyPeek Free →</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className={cn(
                "text-lg font-semibold border-coral text-coral hover:bg-coral-light",
                "transition-all duration-200",
              )}
            >
              <Link to="/for-clinics">
                For Clinics <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
