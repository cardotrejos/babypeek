import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Upload, Zap, Globe, Code, Palette } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createLazyFileRoute("/for-clinics/how-it-works")({
  component: ForClinicsHowItWorksPage,
});

const workflowSteps = [
  {
    icon: Upload,
    step: "1",
    title: "Perform Your Scan as Normal",
    description:
      "Nothing changes about your existing ultrasound workflow. Your sonographers capture 4D/HD images exactly as they always do. No new hardware, no new protocols.",
    detail: "BabyPeek works alongside your existing equipment and software.",
  },
  {
    icon: Upload,
    step: "2",
    title: "Select and Upload the Best Face Image",
    description:
      "After the scan, your sonographer picks the clearest image showing the baby's face. They upload it to BabyPeek — takes about 10 seconds. No special training required.",
    detail: "JPG, PNG, HEIC, and WebP formats up to 10MB are supported.",
  },
  {
    icon: Zap,
    step: "3",
    title: "AI Generates the Portrait in 60 Seconds",
    description:
      "BabyPeek's AI analyzes the ultrasound features — nose shape, lip contours, cheek structure — and generates a photorealistic baby portrait. The result appears on screen while the parents are still in the room.",
    detail: "The AI was trained on thousands of ultrasound-to-newborn photo pairs.",
  },
  {
    icon: Globe,
    step: "4",
    title: "Deliver to Parents",
    description:
      "The portrait is delivered to parents via email, printed at the front desk, or sent through your patient portal — your choice. Parents share it everywhere, generating organic word-of-mouth for your clinic.",
    detail: "Every share tags your clinic. Free marketing built in.",
  },
];

const integrationOptions = [
  {
    icon: Globe,
    name: "Web Upload",
    tagline: "No technical setup needed",
    description:
      "Your sonographer uploads directly from any browser. Best for small clinics doing 1–5 scans per day. Set up in 5 minutes.",
    features: ["Works in any browser", "Email delivery included", "BabyPeek branding", "No API knowledge needed"],
    timeline: "Live in 5 minutes",
  },
  {
    icon: Code,
    name: "API Integration",
    tagline: "Connect to your existing software",
    description:
      "Integrate BabyPeek directly into your clinic management software, patient portal, or app. A REST API handles portrait generation and delivery automatically.",
    features: ["REST API documentation", "Webhook delivery", "Your branding on portal", "Custom patient flow"],
    timeline: "Live in 1–2 days",
  },
  {
    icon: Palette,
    name: "White Label",
    tagline: "Fully branded experience",
    description:
      "Replace BabyPeek's branding entirely with your own. Your logo, your domain, your colors. The AI portrait experience becomes a seamless extension of your clinic brand.",
    features: ["Your domain / subdomain", "Your logo throughout", "Volume pricing", "Dedicated account manager"],
    timeline: "Live in ~1 week",
  },
];

const techRequirements = [
  { label: "Browser", value: "Chrome, Firefox, Safari, Edge (latest versions)" },
  { label: "Internet", value: "Stable connection for image upload (5–10 Mbps recommended)" },
  { label: "File formats", value: "JPG, PNG, HEIC, WebP — up to 10MB per image" },
  { label: "Hardware", value: "No additional hardware required" },
  { label: "No software install", value: "Fully cloud-based — nothing to install or maintain" },
];

export function ForClinicsHowItWorksPage() {
  return (
    <>
      <Helmet>
        <title>How BabyPeek Works for Clinics</title>
        <meta
          name="description"
          content="Integrate AI baby portraits into your ultrasound workflow in minutes. Upload scan, get portrait, delight patients."
        />
        <link rel="canonical" href="https://babypeek.io/for-clinics/how-it-works" />
        <meta property="og:title" content="How BabyPeek Works for Clinics" />
        <meta
          property="og:description"
          content="Integrate AI baby portraits into your ultrasound workflow in minutes. Upload scan, get portrait, delight patients."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://babypeek.io/for-clinics/how-it-works" />
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
            <Link to="/for-clinics" className="hover:text-coral transition-colors">For Clinics</Link>
            <span className="mx-2">/</span>
            <span className="text-charcoal">How It Works</span>
          </nav>

          {/* H1 */}
          <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight mb-4">
            How BabyPeek Works for Your Clinic
          </h1>
          <p className="text-warm-gray text-lg mb-8">
            From scan to shareable portrait in 60 seconds. Here's how it fits into your workflow.
          </p>

          {/* 4-step workflow */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-6">
              The Clinic Workflow
            </h2>
            <div className="space-y-8">
              {workflowSteps.map(({ icon: Icon, step, title, description, detail }) => (
                <div key={step} className="flex gap-4">
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-full bg-coral-light flex items-center justify-center">
                      <Icon className="w-5 h-5 text-coral" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-coral uppercase tracking-wide mb-1">
                      Step {step}
                    </div>
                    <h3 className="font-display text-xl text-charcoal mb-2">{title}</h3>
                    <p className="text-warm-gray text-sm leading-relaxed">{description}</p>
                    <p className="text-coral text-sm mt-2 font-medium">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Integration Options */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-2">
              Integration Options
            </h2>
            <p className="text-warm-gray text-sm mb-6">
              Three ways to add BabyPeek to your clinic. Pick what fits your setup.
            </p>
            <div className="space-y-4">
              {integrationOptions.map(({ icon: Icon, name, tagline, description, features, timeline }) => (
                <div
                  key={name}
                  className="rounded-2xl border border-charcoal/10 bg-white/70 p-5"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-coral-light flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-coral" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg text-charcoal">{name}</h3>
                      <p className="text-coral text-sm font-medium">{tagline}</p>
                    </div>
                  </div>
                  <p className="text-warm-gray text-sm leading-relaxed mb-4">{description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {features.map((f) => (
                      <span
                        key={f}
                        className="text-xs px-2 py-1 rounded-full bg-coral-light text-charcoal"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-coral">Setup: {timeline}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Technical Requirements */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-6">
              Technical Requirements
            </h2>
            <p className="text-warm-gray text-sm mb-4">
              BabyPeek is a cloud-based web application. Your only requirement is a browser and internet.
            </p>
            <div className="rounded-xl border border-charcoal/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-coral-light">
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Requirement</th>
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {techRequirements.map(({ label, value }) => (
                    <tr key={label} className="border-t border-charcoal/10">
                      <td className="px-4 py-3 text-charcoal font-medium">{label}</td>
                      <td className="px-4 py-3 text-warm-gray text-xs">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center mb-8">
            <Button
              asChild
              className={cn(
                "text-lg font-semibold",
                "bg-coral hover:bg-coral-hover text-white",
                "shadow-lg hover:shadow-xl",
                "transition-all duration-200",
              )}
            >
              <Link to="/">Start Your Free Pilot →</Link>
            </Button>
            <p className="mt-3 text-sm text-warm-gray">
              30-day free pilot with 20 complimentary portraits.
            </p>
          </section>

          {/* Internal links */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-warm-gray">
            <Link to="/for-clinics" className="hover:text-coral transition-colors">
              For Clinics Home →
            </Link>
            <Link to="/for-clinics/calculator" className="hover:text-coral transition-colors">
              Revenue Calculator →
            </Link>
            <Link to="/for-clinics/security" className="hover:text-coral transition-colors">
              Security & Privacy →
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
