import { createFileRoute } from "@tanstack/react-router"
import { LandingLayout, HeroImage } from "@/components/landing"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  const handleCtaClick = () => {
    // For now, scroll to the gallery section as a preview of "see more"
    // Will be updated in Epic 3 to navigate to upload section
    const gallerySection = document.getElementById("gallery")
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <LandingLayout onCtaClick={handleCtaClick}>
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

      {/* Gallery Section - Placeholder for Story 2.3 */}
      <section id="gallery" className="py-12">
        <h2 className="font-display text-2xl text-charcoal mb-6">
          See the magic
        </h2>
        <div className="h-48 bg-muted rounded-xl flex items-center justify-center">
          <span className="text-muted-foreground font-body">
            [Example gallery - Story 2.3]
          </span>
        </div>
      </section>

      {/* Trust Signals Section - Placeholder for Story 2.4 */}
      <section id="trust" className="py-12">
        <div className="h-32 bg-muted rounded-xl flex items-center justify-center">
          <span className="text-muted-foreground font-body">
            [Trust signals - Story 2.4]
          </span>
        </div>
      </section>

      {/* FAQ Section - Placeholder for Story 2.5 */}
      <section id="faq" className="py-12">
        <h2 className="font-display text-2xl text-charcoal mb-6">
          Questions? We've got answers
        </h2>
        <div className="h-64 bg-muted rounded-xl flex items-center justify-center">
          <span className="text-muted-foreground font-body">
            [FAQ accordion - Story 2.5]
          </span>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-warm-gray text-sm font-body">
          © {new Date().getFullYear()} 3d-ultra. Made with love for expecting
          parents.
        </p>
      </footer>
    </LandingLayout>
  )
}
