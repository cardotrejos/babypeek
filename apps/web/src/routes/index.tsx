import { createFileRoute } from "@tanstack/react-router"
import { LandingLayout } from "@/components/landing"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

function LandingPage() {
  const handleCtaClick = () => {
    // Scroll to upload section (Story 2.2+ will implement actual upload)
    const uploadSection = document.getElementById("upload")
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <LandingLayout onCtaClick={handleCtaClick}>
      {/* Hero Section - Placeholder for Story 2.2 */}
      <section
        id="hero"
        className="min-h-[60vh] flex flex-col justify-center py-8"
      >
        <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight">
          Meet your baby before they're born
        </h1>
        <p className="font-body text-warm-gray mt-4 text-lg">
          Transform your 4D ultrasound into a beautiful, photorealistic
          portrait in seconds.
        </p>
        <div className="mt-8 aspect-video bg-coral-light rounded-xl flex items-center justify-center">
          <span className="text-warm-gray font-body">
            [Before/after example - Story 2.2]
          </span>
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

      {/* Footer placeholder */}
      <footer className="py-8 text-center">
        <p className="text-warm-gray text-sm font-body">
          © 2024 3d-ultra. Made with love for expecting parents.
        </p>
      </footer>
    </LandingLayout>
  )
}
