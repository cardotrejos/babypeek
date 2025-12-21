import { createFileRoute } from "@tanstack/react-router"
import { LandingLayout, HeroImage, ExampleGallery, TrustSignals, FaqSection, UploadSection } from "@/components/landing"
import { StructuredData } from "@/components/seo/structured-data"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// SEO constants - meta tags are in index.html for SPA
const SEO = {
  siteUrl: "https://babypeek.io/",
  description: "See your baby before they're born. Upload your 4D ultrasound and get a beautiful AI-generated portrait in 60 seconds. Free preview, instant results.",
} as const

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  const handleCtaClick = () => {
    // Scroll to the upload section
    const uploadSection = document.getElementById("upload")
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <LandingLayout onCtaClick={handleCtaClick}>
      {/* JSON-LD Structured Data for SEO (AC2) */}
      <StructuredData
        siteUrl={SEO.siteUrl}
        siteName="BabyPeek"
        description={SEO.description}
      />
      {/* Hero Section - Story 2.2 Implementation */}
      <section
        id="hero"
        className="min-h-[60vh] flex flex-col justify-center py-8"
      >
        {/* Headline - AC1 */}
        <h1 className="font-display text-3xl sm:text-5xl text-charcoal leading-tight">
          Meet your baby before they're born
        </h1>

        {/* Value Proposition - AC1 */}
        <p className="font-body text-warm-gray mt-4 text-lg sm:text-xl max-w-md">
          Transform your 4D ultrasound into a beautiful, photorealistic
          portrait in seconds.
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
            "focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
          )}
        >
          Try it free
        </Button>

        {/* Before/After Example Image - AC2, AC6, AC7 */}
        <div className="mt-8">
          <HeroImage />
        </div>
      </section>

      {/* Gallery Section - Story 2.3 Implementation */}
      <section id="gallery" className="py-12">
        <h2 className="font-display text-2xl text-charcoal mb-6">
          See the magic
        </h2>
        <ExampleGallery />
      </section>

      {/* Trust Signals Section - Story 2.4 Implementation */}
      <TrustSignals id="trust" />

      {/* Upload Section - Story 3.6 Implementation */}
      <UploadSection id="upload" />

      {/* FAQ Section - Story 2.5 Implementation */}
      <FaqSection id="faq" />

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-warm-gray text-sm font-body">
          © {new Date().getFullYear()} BabyPeek. Made with love for expecting
          parents.
        </p>
      </footer>
    </LandingLayout>
  )
}
