import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import {
  LandingLayout,
  HeroImage,
  ExampleGallery,
  TrustSignals,
  PricingSection,
  FaqSection,
} from "@/components/landing";
import {
  LazyUploadSection,
  preloadUploadSection,
} from "@/components/landing/lazy-upload-section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRICE_DISPLAY } from "@/lib/pricing";
import { SiteFooter } from "@/components/seo/footer";
import { Upload, Sparkles, Download } from "lucide-react";

import { MobileStickyCTA, TrustBadges } from "@/components/experiments";
import {
  LANDING_META_DESCRIPTION,
  LANDING_OG_DESCRIPTION,
  LANDING_SOFTWARE_APP_SCHEMA,
} from "./marketing-pricing";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const [uploadCtaPrimed, setUploadCtaPrimed] = useState(false);

  const handleCtaClick = async () => {
    await preloadUploadSection().catch(() => {});
    setUploadCtaPrimed(true);
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Helmet>
        <title>
          BabyPeek - See Your Baby's Face Before Birth | AI Ultrasound Portrait
        </title>
        <meta
          name="description"
          content={LANDING_META_DESCRIPTION}
        />
        <link rel="canonical" href="https://babypeek.io/" />
        <meta
          property="og:title"
          content="BabyPeek - See Your Baby's Face Before Birth"
        />
        <meta
          property="og:description"
          content={LANDING_OG_DESCRIPTION}
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://babypeek.io/" />
      </Helmet>

      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(LANDING_SOFTWARE_APP_SCHEMA)}
        </script>
      </Helmet>

      <LandingLayout onCtaClick={handleCtaClick}>
        {/* ─── HERO ─── */}
        <section
          id="hero"
          className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden"
        >
          {/* Background gradient */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-cream via-cream to-blush"
            aria-hidden="true"
          />
          {/* Decorative orbs */}
          <div
            className="absolute top-20 -right-32 w-96 h-96 bg-rose/30 rounded-full blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-20 -left-32 w-80 h-80 bg-coral/5 rounded-full blur-3xl"
            aria-hidden="true"
          />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-24 sm:py-32 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Copy */}
              <div className="order-2 lg:order-1">
                <p className="text-xs font-medium tracking-[0.2em] uppercase text-coral mb-5">
                  AI-powered baby portraits
                </p>

                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-charcoal leading-[1.1] font-medium">
                  Meet your baby
                  <br />
                  <span className="italic text-coral">before</span> they arrive
                </h1>

                <p className="font-body text-warm-gray mt-6 text-lg sm:text-xl max-w-md leading-relaxed font-light">
                  Upload a clear 4D ultrasound. Our AI creates a realistic
                  portrait of your baby's face in about a minute.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-4 mt-8">
                  <Button
                    onClick={handleCtaClick}
                    aria-label="Try it free - Upload your ultrasound"
                    className={cn(
                      "w-full sm:w-auto",
                      "px-8 py-4 rounded-full",
                      "touch-target-lg",
                      "text-base font-medium tracking-wide",
                      "bg-coral hover:bg-coral-hover text-white",
                      "shadow-lg shadow-coral/20 hover:shadow-xl hover:shadow-coral/30",
                      "transition-all duration-300",
                      "hover:animate-[signature-glow_2s_ease-in-out_infinite]",
                      "focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2",
                    )}
                  >
                    Try it free
                  </Button>

                  <p className="text-sm text-warm-gray/70 self-center font-light">
                    Free preview &middot; HD from {PRICE_DISPLAY}
                  </p>
                </div>

                {/* Social proof nudge */}
                <div className="mt-10 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-rose ring-2 ring-cream flex items-center justify-center"
                      >
                        <span className="text-[10px] text-warm-gray font-medium">
                          {["S", "M", "J", "A"][i - 1]}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-warm-gray">
                    <span className="font-medium text-charcoal">10,000+</span>{" "}
                    happy parents
                  </p>
                </div>
              </div>

              {/* Hero Image */}
              <div className="order-1 lg:order-2">
                <HeroImage />
              </div>
            </div>
          </div>
        </section>

        {/* ─── TRUST BADGES (A/B experiment) ─── */}
        <section className="relative bg-blush/50 cv-btf-sm">
          <div className="max-w-4xl mx-auto px-5 sm:px-8">
            <TrustBadges />
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="py-20 sm:py-28 bg-white/40 cv-btf-md">
          <div className="max-w-4xl mx-auto px-5 sm:px-8">
            <p className="text-center text-xs font-medium tracking-[0.2em] uppercase text-coral mb-4">
              How it works
            </p>
            <h2 className="font-display text-3xl sm:text-4xl text-charcoal text-center mb-14 font-medium">
              Three simple steps
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
              {[
                {
                  icon: Upload,
                  step: "01",
                  title: "Upload your ultrasound",
                  desc: "Upload a clear 4D ultrasound image where the baby's face is visible.",
                },
                {
                  icon: Sparkles,
                  step: "02",
                  title: "AI generates portrait",
                  desc: "Our AI analyzes facial features and creates a realistic baby portrait in ~60 seconds.",
                },
                {
                  icon: Download,
                  step: "03",
                  title: "Preview & download",
                  desc: "See your free preview. Love it? Download the HD version to share with family.",
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className={cn(
                      "relative text-center",
                      "animate-fade-up",
                      index === 0 && "stagger-1",
                      index === 1 && "stagger-2",
                      index === 2 && "stagger-3",
                    )}
                  >
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cream-deep/80 mb-5">
                      <Icon
                        className="w-6 h-6 text-coral"
                        strokeWidth={1.5}
                      />
                    </div>
                    <span className="block font-display text-xs text-warm-gray/40 tracking-widest mb-2">
                      {item.step}
                    </span>
                    <h3 className="font-body font-semibold text-charcoal mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-warm-gray leading-relaxed max-w-[240px] mx-auto">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── UPLOAD ─── */}
        <section className="py-20 sm:py-28 relative">
          {/* Warm gradient BG */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-cream via-blush/30 to-cream"
            aria-hidden="true"
          />
          <div className="relative max-w-lg mx-auto px-5 sm:px-8">
            <LazyUploadSection id="upload" ctaPreloaded={uploadCtaPrimed} />
          </div>
        </section>

        {/* ─── GALLERY ─── */}
        <section id="gallery" className="py-20 sm:py-28 bg-white/40 cv-btf-xl">
          <div className="max-w-4xl mx-auto px-5 sm:px-8">
            <p className="text-center text-xs font-medium tracking-[0.2em] uppercase text-coral mb-4">
              Real results
            </p>
            <h2 className="font-display text-3xl sm:text-4xl text-charcoal text-center mb-4 font-medium">
              See the transformation
            </h2>
            <p className="text-center text-warm-gray max-w-lg mx-auto mb-12 text-base leading-relaxed">
              Clear 4D ultrasound in, realistic AI baby portrait out.
            </p>
            <ExampleGallery />
          </div>
        </section>

        {/* ─── TRUST SIGNALS ─── */}
        <TrustSignals id="trust" className="cv-btf-md" />

        {/* ─── PRICING ─── */}
        <section className="bg-white/40 cv-btf-lg">
          <PricingSection id="pricing" />
        </section>

        {/* ─── FAQ ─── */}
        <FaqSection id="faq" className="cv-btf-xl" />

        {/* ─── FINAL CTA ─── */}
        <section className="py-20 sm:py-28 relative overflow-hidden cv-btf-md">
          <div
            className="absolute inset-0 bg-gradient-to-br from-charcoal to-charcoal-soft"
            aria-hidden="true"
          />
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] bg-coral/10 rounded-full blur-3xl"
            aria-hidden="true"
          />

          <div className="relative max-w-2xl mx-auto px-5 sm:px-8 text-center">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white font-medium leading-tight">
              Ready to meet your
              <br />
              <span className="italic text-coral">little one?</span>
            </h2>
            <p className="mt-5 text-white/60 text-lg font-light max-w-md mx-auto">
              Upload your 4D ultrasound and see their face in about a minute. It's free to try.
            </p>
            <Button
              onClick={handleCtaClick}
              className={cn(
                "mt-8 px-10 py-4 rounded-full",
                "text-base font-medium tracking-wide",
                "bg-coral hover:bg-coral-hover text-white",
                "shadow-lg shadow-coral/30 hover:shadow-xl hover:shadow-coral/40",
                "transition-all duration-300",
              )}
            >
              Upload your ultrasound
            </Button>
            <p className="mt-4 text-white/40 text-sm">
              Free preview &middot; No credit card required
            </p>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <SiteFooter className="cv-btf-sm" />

        {/* ─── MOBILE STICKY CTA (A/B experiment) ─── */}
        <MobileStickyCTA />
      </LandingLayout>
    </>
  );
}
