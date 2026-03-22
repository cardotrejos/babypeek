import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import {
  LandingLayout,
  HeroImage,
  ExampleGallery,
  TrustSignals,
  PricingSection,
  FaqSection,
  UploadSection,
} from "@/components/landing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRICE_DISPLAY } from "@/lib/pricing";

// 🧪 A/B Testing Experiments
import { MobileStickyCTA, TrustBadges } from "@/components/experiments";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const handleCtaClick = () => {
    // Scroll to the upload section
    const uploadSection = document.getElementById("upload");
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "BabyPeek",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web",
    "url": "https://babypeek.io",
    "description": "Upload your 4D ultrasound and get a realistic AI portrait of your baby's face in approximately 60 seconds.",
    "offers": [
      {
        "@type": "Offer",
        "name": "Free Preview",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free low-resolution baby portrait preview",
      },
      {
        "@type": "Offer",
        "name": "HD Portrait",
        "price": "9.99",
        "priceCurrency": "USD",
        "description": "High-definition baby portrait download",
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>BabyPeek - See Your Baby's Face Before Birth | AI Ultrasound Portrait</title>
        <meta
          name="description"
          content="Upload your 4D ultrasound and get a realistic AI portrait of your baby in ~60 seconds. Free preview, HD $9.99. Private & secure."
        />
        <link rel="canonical" href="https://babypeek.io/" />
        <meta property="og:title" content="BabyPeek - See Your Baby's Face Before Birth" />
        <meta
          property="og:description"
          content="Upload your 4D ultrasound and get a realistic AI portrait of your baby in ~60 seconds. Free preview, HD $9.99."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://babypeek.io/" />
      </Helmet>

      {/* SoftwareApplication JSON-LD schema for homepage */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(softwareAppSchema)}
        </script>
      </Helmet>

    <LandingLayout
      onCtaClick={handleCtaClick}
      ctaText="Try it free"
      ctaSubtext={`Free preview • HD download ${PRICE_DISPLAY}`}
    >
      {/* Hero Section - Story 2.2 Implementation */}
      <section id="hero" className="min-h-[60vh] flex flex-col justify-center py-8">
        {/* Headline - AC1 */}
        <h1 className="font-display text-3xl sm:text-5xl text-charcoal leading-tight">
          See your future baby before they arrive
        </h1>

        {/* Value Proposition - AC1 */}
        <p className="font-body text-warm-gray mt-4 text-lg sm:text-xl max-w-md">
          Upload a clear 4D ultrasound of your baby's face. BabyPeek uses AI to generate a realistic
          baby portrait you can share in about a minute.
        </p>

        {/* Inline CTA Button - AC3, AC4, AC7 */}
        <Button
          onClick={handleCtaClick}
          aria-label="Try it free - Upload your ultrasound"
          className={cn(
            "mt-6 w-full sm:w-auto sm:min-w-[200px]",
            "touch-target-lg",
            "text-lg font-semibold",
            "bg-coral hover:bg-coral-hover text-white",
            "shadow-lg hover:shadow-xl",
            "transition-all duration-200",
            "hover:animate-[signature-glow_2s_ease-in-out_infinite]",
            "focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2",
          )}
        >
          Try it free
        </Button>

        <p className="mt-3 text-sm text-warm-gray">
          Free preview. HD download {PRICE_DISPLAY}. No subscription.
        </p>

        {/* Before/After Example Image - AC2, AC6, AC7 */}
        <div className="mt-8">
          <HeroImage />
        </div>
      </section>

      {/* 🧪 Trust Badges Experiment - Build confidence before upload */}
      <TrustBadges />

      {/* 🚀 Upload Section - MOVED TO TOP for better mobile conversion!
          Previously buried at bottom (0.16% conversion). Now visible without scrolling. */}
      <UploadSection id="upload" />

      {/* Gallery Section - Story 2.3 Implementation */}
      <section id="gallery" className="py-12">
        <h2 className="font-display text-2xl text-charcoal mb-2">
          See before &amp; after examples
        </h2>
        <p className="text-warm-gray mb-6">
          A clear 4D ultrasound in → a realistic AI baby portrait out.
        </p>
        <ExampleGallery />
      </section>

      {/* Trust Signals Section - Story 2.4 Implementation */}
      <TrustSignals id="trust" />

      {/* Pricing Section - SEO + Clarity */}
      <PricingSection id="pricing" />

      {/* FAQ Section - Story 2.5 Implementation */}
      <FaqSection id="faq" />

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-warm-gray text-sm font-body">
          © {new Date().getFullYear()} BabyPeek. Made with love for expecting parents.
        </p>
      </footer>

      {/* 🧪 Mobile Sticky CTA Experiment - Always visible on mobile */}
      <MobileStickyCTA />
    </LandingLayout>
    </>
  );
}
