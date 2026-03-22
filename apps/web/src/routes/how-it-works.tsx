import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Upload, Sparkles, Share2, CheckCircle2, XCircle } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/how-it-works")({
  component: HowItWorksPage,
});

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Get an AI Baby Portrait from Your 4D Ultrasound",
  description:
    "Transform your 4D ultrasound image into a realistic baby portrait in 3 simple steps.",
  step: [
    {
      "@type": "HowToStep",
      name: "Upload Your 4D Ultrasound",
      text: "Upload a clear 4D ultrasound image showing your baby's face. JPG, PNG, and HEIC formats accepted.",
      position: 1,
    },
    {
      "@type": "HowToStep",
      name: "AI Generates Your Baby's Portrait",
      text: "Our AI analyzes the ultrasound features and generates a photorealistic portrait in approximately 60 seconds.",
      position: 2,
    },
    {
      "@type": "HowToStep",
      name: "Download and Share",
      text: "View your free preview. Upgrade to HD ($9.99) to download and share the high-resolution portrait.",
      position: 3,
    },
  ],
  totalTime: "PT2M",
};

const steps = [
  {
    icon: Upload,
    step: "1",
    title: "Upload Your 4D Ultrasound",
    description:
      "Upload a clear photo from your 4D or HD ultrasound session. The clearer the face, the better the result. We accept JPG, PNG, HEIC, and WebP formats up to 10MB.",
    tips: [
      "Use an image where the baby's face is clearly visible",
      "4D/HD ultrasounds work best (3D works too)",
      "Best weeks: 26–32 weeks of pregnancy",
      "Avoid images with heavy shadows or obstructions",
    ],
  },
  {
    icon: Sparkles,
    step: "2",
    title: "AI Generates Your Baby's Portrait",
    description:
      "Our AI analyzes your baby's facial features — nose shape, lip structure, cheek contours, forehead — and generates a photorealistic portrait in approximately 60 seconds. The AI was trained on thousands of ultrasound-to-newborn photo pairs to learn how ultrasound features translate to real baby faces.",
    tips: [],
  },
  {
    icon: Share2,
    step: "3",
    title: "Preview, Upgrade, and Share",
    description:
      "Get an instant free preview of your baby's portrait. Upgrade to HD ($9.99) for the full high-resolution download. Send to family and friends with a unique shareable link.",
    tips: [
      "Free: get an instant preview",
      "HD ($9.99): full high-resolution download",
      "Share: unique link for family and friends",
    ],
  },
];

const ultrasoundTypes = [
  { type: "4D Ultrasound", supported: true, quality: "Excellent" },
  { type: "HD / 5D Ultrasound", supported: true, quality: "Excellent" },
  { type: "3D Ultrasound", supported: true, quality: "Good" },
  { type: "2D Ultrasound", supported: false, quality: "Not supported" },
];

export function HowItWorksPage() {
  return (
    <>
      <Helmet>
        <title>How BabyPeek Works - AI Baby Portrait From Ultrasound</title>
        <meta
          name="description"
          content="Upload a 4D ultrasound photo, our AI generates a realistic baby portrait in 60 seconds. See how the technology works step by step."
        />
        <link rel="canonical" href="https://babypeek.io/how-it-works" />
        <meta property="og:title" content="How BabyPeek Works - AI Baby Portrait From Ultrasound" />
        <meta
          property="og:description"
          content="Upload a 4D ultrasound photo, our AI generates a realistic baby portrait in 60 seconds. See how the technology works step by step."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://babypeek.io/how-it-works" />
      </Helmet>

      <Helmet>
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
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
            <span className="text-charcoal">How It Works</span>
          </nav>

          {/* H1 */}
          <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight mb-4">
            How BabyPeek Turns Your Ultrasound Into a Baby Portrait
          </h1>
          <p className="text-warm-gray text-lg mb-10">
            Three simple steps to see your baby's face before they arrive.
          </p>

          {/* Steps */}
          <div className="space-y-10">
            {steps.map(({ icon: Icon, step, title, description, tips }) => (
              <div key={step} className="flex gap-4">
                <div className="shrink-0">
                  <div className="w-12 h-12 rounded-full bg-coral-light flex items-center justify-center">
                    <Icon className="w-6 h-6 text-coral" />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-coral uppercase tracking-wide mb-1">
                    Step {step}
                  </div>
                  <h2 className="font-display text-xl text-charcoal mb-2">{title}</h2>
                  <p className="text-warm-gray text-sm leading-relaxed">{description}</p>
                  {tips.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-warm-gray">
                          <span className="text-coral mt-0.5 shrink-0">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Ultrasound compatibility table */}
          <section className="mt-12">
            <h2 className="font-display text-2xl text-charcoal mb-1">
              What Type of Ultrasound Do I Need?
            </h2>
            <p className="text-warm-gray text-sm mb-4">
              BabyPeek works with most modern ultrasound types. Here's what to use.
            </p>
            <div className="rounded-xl border border-charcoal/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-coral-light">
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Ultrasound Type</th>
                    <th className="text-center px-4 py-3 font-semibold text-charcoal">Works?</th>
                    <th className="text-center px-4 py-3 font-semibold text-charcoal">Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {ultrasoundTypes.map(({ type, supported, quality }) => (
                    <tr key={type} className="border-t border-charcoal/10">
                      <td className="px-4 py-3 text-charcoal font-medium">{type}</td>
                      <td className="px-4 py-3 text-center">
                        {supported ? (
                          <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-error mx-auto" />
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-center",
                          supported ? "text-charcoal" : "text-warm-gray",
                        )}
                      >
                        {quality}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tips for best results */}
          <section className="mt-12 p-6 rounded-2xl bg-coral-light border border-rose">
            <h2 className="font-display text-xl text-charcoal mb-3">
              Tips for the Best Results
            </h2>
            <ul className="space-y-2 text-sm text-warm-gray">
              <li className="flex items-start gap-2">
                <span className="text-coral shrink-0">💡</span>
                Use an image where the baby's face is clearly visible
              </li>
              <li className="flex items-start gap-2">
                <span className="text-coral shrink-0">💡</span>
                4D/HD ultrasounds give the best results
              </li>
              <li className="flex items-start gap-2">
                <span className="text-coral shrink-0">💡</span>
                Best weeks: 26–32 weeks of pregnancy
              </li>
              <li className="flex items-start gap-2">
                <span className="text-coral shrink-0">💡</span>
                Avoid images with heavy shadows or obstructions over the face
              </li>
            </ul>
          </section>

          {/* Accuracy disclaimer */}
          <section className="mt-8 p-4 rounded-xl bg-white/50 border border-charcoal/10">
            <p className="text-sm text-warm-gray">
              <strong className="text-charcoal">Is it accurate?</strong> BabyPeek creates an artistic
              prediction based on your baby's visible ultrasound features. Many parents are amazed by the
              resemblance after birth — but it's a prediction, not a medical diagnosis.
            </p>
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
              <Link to="/">Try BabyPeek Free →</Link>
            </Button>
            <p className="mt-3 text-sm text-warm-gray">Free preview • No credit card required</p>
          </div>

          {/* Internal links */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-warm-gray">
            <Link to="/pricing" className="hover:text-coral transition-colors">
              See pricing →
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
