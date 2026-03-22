import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { CheckCircle2 } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "BabyPeek AI Baby Portrait",
  description: "High-definition AI baby portrait generated from your 4D ultrasound image.",
  offers: [
    {
      "@type": "Offer",
      name: "Free Preview",
      price: "0",
      priceCurrency: "USD",
      description: "Free low-resolution baby portrait preview",
    },
    {
      "@type": "Offer",
      name: "Basic",
      price: "9.99",
      priceCurrency: "USD",
      description: "1 HD portrait — one-time purchase",
    },
    {
      "@type": "Offer",
      name: "Plus",
      price: "14.99",
      priceCurrency: "USD",
      description: "All 4 HD portraits + email delivery — one-time purchase",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "24.99",
      priceCurrency: "USD",
      description: "All 4 HD portraits + print-ready resolution + priority processing — one-time purchase",
    },
  ],
  brand: {
    "@type": "Brand",
    name: "BabyPeek",
  },
};

const freeFeatures = [
  "Upload your 4D ultrasound",
  "Get an AI baby portrait preview",
  "No credit card required",
  "No account needed",
];

const basicFeatures = [
  "1 HD portrait (your pick)",
  "No watermarks",
  "Instant download",
];

const plusFeatures = [
  "All 4 HD portraits",
  "No watermarks",
  "Instant download",
  "Email delivery",
];

const proFeatures = [
  "All 4 HD portraits",
  "No watermarks",
  "Instant download",
  "Email delivery",
  "Print-ready resolution (300 DPI)",
  "Priority processing",
];

const comparisonRows = [
  {
    feature: "Starting price",
    babypeek: "From $9.99",
    traditional: "$50–$200",
    otherAi: "$15–$30",
  },
  {
    feature: "Speed",
    babypeek: "~60 seconds",
    traditional: "1–2 weeks",
    otherAi: "1–5 minutes",
  },
  {
    feature: "Free preview",
    babypeek: true,
    traditional: false,
    otherAi: "Varies",
  },
  {
    feature: "Uses your actual ultrasound",
    babypeek: true,
    traditional: false,
    otherAi: "Sometimes",
  },
  {
    feature: "From 4D ultrasound",
    babypeek: true,
    traditional: false,
    otherAi: false,
  },
  {
    feature: "No subscription",
    babypeek: true,
    traditional: false,
    otherAi: false,
  },
];

export function PricingPage() {
  return (
    <>
      <Helmet>
        <title>BabyPeek Pricing - Free Preview, HD From $9.99</title>
        <meta
          name="description"
          content="Get your baby's AI portrait free in preview quality. Upgrade to HD from $9.99. Basic, Plus, and Pro plans available. No subscription. No hidden fees."
        />
        <link rel="canonical" href="https://babypeek.io/pricing" />
        <meta property="og:title" content="BabyPeek Pricing - Free Preview, HD From $9.99" />
        <meta
          property="og:description"
          content="Get your baby's AI portrait free in preview quality. Upgrade to HD from $9.99. No subscription."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://babypeek.io/pricing" />
      </Helmet>

      <Helmet>
        <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-cream">
        {/* Minimal header */}
        <header className="p-4 sm:p-6 safe-top">
          <div className="sm:max-w-[560px] sm:mx-auto flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="BabyPeek" className="h-8 w-8" />
              <span className="font-display text-xl text-charcoal font-semibold">BabyPeek</span>
            </Link>
          </div>
        </header>

        <main id="main-content" className="px-4 sm:px-6 sm:max-w-[560px] sm:mx-auto pt-8 pb-12">
          {/* Breadcrumb */}
          <nav className="text-sm text-warm-gray mb-6">
            <Link to="/" className="hover:text-coral transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-charcoal">Pricing</span>
          </nav>

          {/* H1 */}
          <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight mb-3">
            Simple Pricing, No Surprises
          </h1>
          <p className="text-warm-gray text-lg mb-10">
            Start free. Upgrade only if you love it.
          </p>

          {/* Free preview header */}
          <div className="rounded-2xl border border-charcoal/10 bg-white/70 backdrop-blur-sm p-6 shadow-sm mb-4">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-xl text-charcoal">Free Preview</h2>
                <p className="text-sm text-warm-gray mt-1">No commitment. No credit card.</p>
              </div>
              <div className="text-right">
                <div className="font-display text-3xl text-charcoal">$0</div>
                <div className="text-xs text-warm-gray">forever</div>
              </div>
            </div>
            <ul className="space-y-2 mb-6">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-warm-gray">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              asChild
              className={cn(
                "w-full text-lg font-semibold",
                "bg-coral hover:bg-coral-hover text-white",
                "shadow-md hover:shadow-lg",
                "transition-all duration-200",
              )}
            >
              <Link to="/">Upload & Preview Free →</Link>
            </Button>
          </div>

          {/* Pricing cards */}
          <div className="space-y-4">
            {/* Basic */}
            <div className="rounded-2xl border border-charcoal/10 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
              <div className="flex items-baseline justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display text-xl text-charcoal">Basic</h2>
                  <p className="text-sm text-warm-gray mt-1">One-time purchase. No subscription.</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl text-charcoal">$9.99</div>
                  <div className="text-xs text-warm-gray">one-time</div>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                {basicFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-warm-gray">
                    <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={cn(
                  "w-full text-lg font-semibold",
                  "bg-charcoal hover:bg-charcoal/80 text-white",
                  "shadow-md hover:shadow-lg",
                  "transition-all duration-200",
                )}
              >
                <Link to="/">Get Your Free Preview →</Link>
              </Button>
            </div>

            {/* Plus — Most Popular */}
            <div className="rounded-2xl border-2 border-coral bg-white/80 backdrop-blur-sm p-6 shadow-md relative">
              <div className="absolute -top-3 left-6">
                <span className="bg-coral text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display text-xl text-charcoal">Plus</h2>
                  <p className="text-sm text-warm-gray mt-1">One-time purchase. No subscription.</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl text-charcoal">$14.99</div>
                  <div className="text-xs text-warm-gray">one-time</div>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                {plusFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-warm-gray">
                    <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={cn(
                  "w-full text-lg font-semibold",
                  "bg-coral hover:bg-coral-hover text-white",
                  "shadow-lg hover:shadow-xl",
                  "transition-all duration-200",
                )}
              >
                <Link to="/">Get Your Free Preview →</Link>
              </Button>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border border-charcoal/10 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
              <div className="flex items-baseline justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display text-xl text-charcoal">Pro</h2>
                  <p className="text-sm text-warm-gray mt-1">One-time purchase. No subscription.</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl text-charcoal">$24.99</div>
                  <div className="text-xs text-warm-gray">one-time</div>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-warm-gray">
                    <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={cn(
                  "w-full text-lg font-semibold",
                  "bg-charcoal hover:bg-charcoal/80 text-white",
                  "shadow-md hover:shadow-lg",
                  "transition-all duration-200",
                )}
              >
                <Link to="/">Get Your Free Preview →</Link>
              </Button>
            </div>
          </div>

          {/* Comparison table */}
          <section className="mt-12">
            <h2 className="font-display text-2xl text-charcoal mb-1 text-center">
              How BabyPeek Compares
            </h2>
            <p className="text-warm-gray text-sm mb-4 text-center">
              No hidden fees. No subscriptions. Just better technology.
            </p>
            <div className="rounded-xl border border-charcoal/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-coral-light">
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Feature</th>
                    <th className="text-center px-3 py-3 font-semibold text-coral">BabyPeek</th>
                    <th className="text-center px-3 py-3 font-semibold text-charcoal">Traditional Artist</th>
                    <th className="text-center px-3 py-3 font-semibold text-charcoal">Other AI</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(({ feature, babypeek, traditional, otherAi }) => (
                    <tr key={feature} className="border-t border-charcoal/10">
                      <td className="px-4 py-3 text-charcoal font-medium">{feature}</td>
                      <td className="px-3 py-3 text-center text-charcoal font-medium">
                        {typeof babypeek === "boolean" ? (
                          babypeek ? (
                            <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                          ) : (
                            <span className="text-warm-gray">—</span>
                          )
                        ) : (
                          babypeek
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-warm-gray">
                        {typeof traditional === "boolean" ? (
                          traditional ? (
                            <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                          ) : (
                            <span>—</span>
                          )
                        ) : (
                          traditional
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-warm-gray">
                        {typeof otherAi === "boolean" ? (
                          otherAi ? (
                            <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                          ) : (
                            <span>—</span>
                          )
                        ) : (
                          otherAi
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* CTA */}
          <div className="mt-10 text-center">
            <Button
              asChild
              className={cn(
                "w-full sm:w-auto sm:min-w-[240px]",
                "text-lg font-semibold",
                "bg-coral hover:bg-coral-hover text-white",
                "shadow-lg hover:shadow-xl",
                "transition-all duration-200",
              )}
            >
              <Link to="/">Get Your Free Preview →</Link>
            </Button>
            <p className="mt-3 text-sm text-warm-gray">
              No credit card. No account required. Just upload and go.
            </p>
            <p className="mt-2 text-xs text-warm-gray">
              No subscriptions. No hidden fees. Secure checkout via Stripe.
            </p>
          </div>

          {/* Internal links */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-warm-gray">
            <Link to="/how-it-works" className="hover:text-coral transition-colors">
              How it works →
            </Link>
            <Link to="/faq" className="hover:text-coral transition-colors">
              Read FAQ →
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
