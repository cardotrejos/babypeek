import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Scale, ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { cn } from "@/lib/utils";

export const Route = createLazyFileRoute("/compare/")({
  component: CompareIndexPage,
});

const comparisons = [
  {
    slug: "ai-baby-generators-2026",
    title: "AI Baby Generators 2026: Complete Comparison",
    description:
      "Compare ultrasound-based tools, parent-photo generators, and generic AI. See which one actually uses your real baby's features.",
    category: "Overview",
  },
  {
    slug: "babypeek-vs-seebaby",
    title: "BabyPeek vs SeeBaby: Choosing the Right AI for Your Ultrasound Clinic",
    description:
      "BabyPeek is a focused portrait tool. SeeBaby is a full clinic platform. Here's the honest comparison.",
    category: "For Clinics",
  },
];

export function CompareIndexPage() {
  return (
    <>
      <Helmet>
        <title>Compare AI Baby Portrait Tools - BabyPeek</title>
        <meta
          name="description"
          content="Compare AI baby portrait generators: ultrasound-based vs parent-photo tools, and clinic solutions. Find the best tool for your needs."
        />
        <link rel="canonical" href="https://babypeek.io/compare" />
        <meta property="og:title" content="Compare AI Baby Portrait Tools - BabyPeek" />
        <meta
          property="og:description"
          content="Compare AI baby portrait generators: ultrasound-based vs parent-photo tools, and clinic solutions."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://babypeek.io/compare" />
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
            <Link to="/" className="hover:text-coral transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-charcoal">Compare</span>
          </nav>

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-8 h-8 text-coral shrink-0" />
              <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight">
                Compare AI Baby Portrait Tools
              </h1>
            </div>
            <p className="text-warm-gray text-lg">
              Honest comparisons to help you choose the right AI baby portrait generator for your
              needs.
            </p>
          </div>

          {/* Comparison articles */}
          <div className="space-y-4 mb-10">
            {comparisons.map((comparison) => (
              <Link
                key={comparison.slug}
                to={`/compare/${comparison.slug}`}
                className="group block rounded-xl border border-charcoal/10 bg-white/60 p-6 hover:border-coral/30 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-coral uppercase tracking-wide">
                    {comparison.category}
                  </span>
                </div>
                <h2 className="font-display text-xl text-charcoal mb-2 group-hover:text-coral transition-colors">
                  {comparison.title}
                </h2>
                <p className="text-sm text-warm-gray mb-3">{comparison.description}</p>
                <div className="text-coral text-sm font-medium flex items-center gap-1">
                  Read comparison <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="rounded-2xl bg-coral-light border border-coral p-6 text-center">
            <h2 className="font-display text-lg text-charcoal mb-2">
              Ready to see your baby's face?
            </h2>
            <p className="text-sm text-warm-gray mb-4">
              Upload your 4D ultrasound and get a free AI portrait preview in 60 seconds.
            </p>
            <Link
              to="/"
              className={cn(
                "inline-flex items-center gap-2",
                "text-lg font-semibold",
                "bg-coral hover:bg-coral-hover text-white",
                "px-6 py-3 rounded-full",
                "shadow-lg hover:shadow-xl",
                "transition-all duration-200",
              )}
            >
              Try BabyPeek Free →
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
