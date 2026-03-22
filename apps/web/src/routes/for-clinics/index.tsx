import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Phone } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/for-clinics/")({
  component: ForClinicsPage,
});

const integrationOptions = [
  {
    option: "Web Upload",
    bestFor: "Small clinics (1–5 scans/day)",
    setupTime: "5 minutes",
    features: ["No technical setup", "Email delivery", "BabyPeek branding"],
  },
  {
    option: "API Integration",
    bestFor: "Medium–large clinics with existing software",
    setupTime: "1–2 days",
    features: ["REST API access", "Custom delivery", "Your branding"],
  },
  {
    option: "White Label",
    bestFor: "Clinics wanting fully branded experience",
    setupTime: "1 week",
    features: ["Fully white-label", "Volume pricing", "Dedicated support"],
  },
];

const revenueTable = [
  { scans: 5, price: 15, monthly: 1500, annual: 18000 },
  { scans: 10, price: 15, monthly: 3000, annual: 36000 },
  { scans: 15, price: 15, monthly: 4500, annual: 54000 },
  { scans: 20, price: 15, monthly: 6000, annual: 72000 },
];

const whyReasons = [
  {
    title: "Zero Workflow Disruption",
    description:
      "No new scheduling system. No patient portal migration. No training beyond 'upload this image.' BabyPeek plugs into your existing process.",
  },
  {
    title: "Patients Share = Free Marketing",
    description:
      "Parents share their AI baby portrait on Instagram, Facebook, TikTok, and in family group chats. Every share is organic exposure for your clinic.",
  },
  {
    title: "Competitive Differentiation",
    description:
      "Most 4D ultrasound studios offer the same thing: a scan and a USB drive. Offering AI baby portraits makes you the clinic that goes beyond.",
  },
  {
    title: "Consumer-Proven Technology",
    description:
      "Thousands of parents have already used BabyPeek directly. The technology is proven, the portraits are loved, and the reviews speak for themselves.",
  },
];

export function ForClinicsPage() {
  return (
    <>
      <Helmet>
        <title>BabyPeek for Clinics - AI Baby Portraits for Ultrasound Studios</title>
        <meta
          name="description"
          content="Add AI baby portraits to your ultrasound services. New revenue stream, zero workflow change. Free pilot available."
        />
        <link rel="canonical" href="https://babypeek.io/for-clinics" />
        <meta property="og:title" content="BabyPeek for Clinics - AI Baby Portraits for Ultrasound Studios" />
        <meta
          property="og:description"
          content="Add AI baby portraits to your ultrasound services. New revenue stream, zero workflow change. Free pilot available."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://babypeek.io/for-clinics" />
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
            <span className="text-charcoal">For Clinics</span>
          </nav>

          {/* H1 */}
          <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight mb-4">
            Add AI Baby Portraits to Your Ultrasound Services
          </h1>
          <p className="text-warm-gray text-lg mb-6">
            A new revenue stream your patients will love.
          </p>

          {/* Value prop */}
          <div className="rounded-2xl bg-coral-light border border-rose p-6 mb-8">
            <p className="text-charcoal text-base leading-relaxed">
              Your patients already come to you for the magic of seeing their baby. Now give them something
              they'll share with everyone — a photorealistic AI portrait of their baby's face, generated
              from your 4D ultrasound images in 60 seconds.
            </p>
            <p className="text-charcoal text-base leading-relaxed mt-3 font-semibold">
              No new software to learn. No workflow changes. Just upload and deliver.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Button
              asChild
              className={cn(
                "flex-1 text-lg font-semibold",
                "bg-coral hover:bg-coral-hover text-white",
                "shadow-lg hover:shadow-xl",
                "transition-all duration-200",
              )}
            >
              <Link to="/for-clinics/calculator">
                Calculate Revenue →
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className={cn(
                "flex-1 text-lg font-semibold border-charcoal/20",
                "hover:bg-charcoal/5 text-charcoal",
                "transition-all duration-200",
              )}
            >
              <a href="mailto:clinics@babypeek.io?subject=Schedule a Call">
                <Phone className="w-4 h-4 mr-2 inline" />
                Schedule a Call
              </a>
            </Button>
          </div>

          {/* Sub-nav */}
          <div className="flex flex-wrap gap-3 mb-10 text-sm">
            <Link
              to="/for-clinics/how-it-works"
              className="px-3 py-1.5 rounded-full border border-charcoal/20 text-charcoal hover:bg-coral-light hover:border-coral transition-colors"
            >
              How It Works
            </Link>
            <Link
              to="/for-clinics/calculator"
              className="px-3 py-1.5 rounded-full border border-charcoal/20 text-charcoal hover:bg-coral-light hover:border-coral transition-colors"
            >
              Revenue Calculator
            </Link>
            <Link
              to="/for-clinics/security"
              className="px-3 py-1.5 rounded-full border border-charcoal/20 text-charcoal hover:bg-coral-light hover:border-coral transition-colors"
            >
              Security & Privacy
            </Link>
          </div>

          {/* How It Works */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-6">
              How It Works for Your Clinic
            </h2>
            <div className="space-y-6">
              {[
                {
                  step: "1",
                  title: "Perform Your Scan as Normal",
                  desc: "Nothing changes about your existing ultrasound workflow. Capture your 4D/HD images as you always do.",
                },
                {
                  step: "2",
                  title: "Upload the Best Face Image",
                  desc: "Your sonographer selects the clearest face image and uploads it to BabyPeek. Takes 10 seconds.",
                },
                {
                  step: "3",
                  title: "Portrait Ready in 60 Seconds",
                  desc: "The AI generates a photorealistic baby portrait. Show it to the parents on screen — watch their reaction.",
                },
                {
                  step: "4",
                  title: "Patient Gets Their Portrait",
                  desc: "Deliver via email, printout, or your clinic's patient portal. Parents share it everywhere — free marketing for your clinic.",
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-coral text-white flex items-center justify-center font-bold text-sm">
                    {step}
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-charcoal mb-1">{title}</h3>
                    <p className="text-warm-gray text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Revenue Table */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-1">
              Revenue Calculator
            </h2>
            <p className="text-warm-gray text-sm mb-4">
              See how much BabyPeek can add to your bottom line.
            </p>
            <div className="rounded-xl border border-charcoal/10 overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-coral-light">
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Scans/Day</th>
                    <th className="text-center px-4 py-3 font-semibold text-charcoal">Price/Portrait</th>
                    <th className="text-center px-4 py-3 font-semibold text-charcoal">Monthly Revenue</th>
                    <th className="text-center px-4 py-3 font-semibold text-charcoal">Annual Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueTable.map(({ scans, price, monthly, annual }) => (
                    <tr key={scans} className="border-t border-charcoal/10">
                      <td className="px-4 py-3 text-charcoal font-medium">{scans}</td>
                      <td className="px-4 py-3 text-center text-charcoal">${price}</td>
                      <td className="px-4 py-3 text-center font-semibold text-coral">${monthly.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center font-semibold text-coral">${annual.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-center">
              <Link
                to="/for-clinics/calculator"
                className="text-coral hover:text-coral-hover font-semibold text-sm transition-colors inline-flex items-center gap-1"
              >
                Try the interactive calculator →
              </Link>
            </div>
            <p className="text-xs text-warm-gray mt-2">
              * Assumes 100% adoption rate. Use our{" "}
              <Link to="/for-clinics/calculator" className="underline hover:text-coral">
                calculator
              </Link>{" "}
              for custom projections.
            </p>
          </section>

          {/* Why Clinics Choose */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-6">
              Why Clinics Choose BabyPeek
            </h2>
            <div className="space-y-4">
              {whyReasons.map(({ title, description }) => (
                <div key={title} className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-coral shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-charcoal text-sm mb-1">{title}</h3>
                    <p className="text-warm-gray text-sm leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Integration Options */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-6">
              Integration Options
            </h2>
            <div className="rounded-xl border border-charcoal/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-coral-light">
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Option</th>
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Best For</th>
                    <th className="text-center px-4 py-3 font-semibold text-charcoal">Setup Time</th>
                  </tr>
                </thead>
                <tbody>
                  {integrationOptions.map(({ option, bestFor, setupTime }) => (
                    <tr key={option} className="border-t border-charcoal/10">
                      <td className="px-4 py-3 text-charcoal font-semibold">{option}</td>
                      <td className="px-4 py-3 text-warm-gray text-xs">{bestFor}</td>
                      <td className="px-4 py-3 text-center text-warm-gray">{setupTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Contact Us */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-6">
              Let's Build a Plan for Your Clinic
            </h2>
            <div className="rounded-2xl border-2 border-coral bg-white/80 p-6">
              <p className="text-charcoal text-base leading-relaxed mb-4">
                Interested in offering AI baby portraits at your clinic?
              </p>
              <p className="text-charcoal text-base leading-relaxed mb-6">
                Get in touch and we'll build a custom plan for your practice.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  className={cn(
                    "flex-1 text-lg font-semibold",
                    "bg-coral hover:bg-coral-hover text-white",
                    "shadow-lg hover:shadow-xl",
                    "transition-all duration-200",
                  )}
                >
                  <a href="mailto:clinics@babypeek.io">
                    Contact Us
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className={cn(
                    "flex-1 text-lg font-semibold border-charcoal/20",
                    "hover:bg-charcoal/5 text-charcoal",
                    "transition-all duration-200",
                  )}
                >
                  <a href="mailto:clinics@babypeek.io?subject=Schedule a Call">
                    <Phone className="w-4 h-4 mr-2 inline" />
                    Schedule a Call
                  </a>
                </Button>
              </div>
            </div>
          </section>

          {/* Security summary */}
          <section className="mb-10 p-6 rounded-2xl bg-coral-light border border-rose">
            <h2 className="font-display text-xl text-charcoal mb-3">
              Security & Patient Privacy
            </h2>
            <ul className="space-y-2 text-sm text-warm-gray">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-coral shrink-0 mt-0.5" />
                Images processed and deleted — no long-term storage
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-coral shrink-0 mt-0.5" />
                HTTPS encryption in transit
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-coral shrink-0 mt-0.5" />
                No patient data shared with third parties
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-coral shrink-0 mt-0.5" />
                Compliant with standard data protection practices
              </li>
            </ul>
            <Link
              to="/for-clinics/security"
              className="inline-flex items-center gap-1 mt-4 text-coral hover:text-coral-hover font-semibold text-sm transition-colors"
            >
              Full details: Security & Privacy →
            </Link>
          </section>

          {/* Final CTA */}
          <section className="text-center mb-8">
            <h2 className="font-display text-2xl text-charcoal mb-2">
              Ready to Get Started?
            </h2>
            <p className="text-warm-gray text-sm mb-6">
              Start your free 30-day pilot with 20 complimentary portraits.
              <br />No credit card. No contract.
            </p>
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
                <Link to="/">Start Free Pilot →</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className={cn(
                  "text-lg font-semibold border-charcoal/20",
                  "hover:bg-charcoal/5 text-charcoal",
                  "transition-all duration-200",
                )}
              >
                <a href="mailto:clinics@babypeek.io">
                  <Phone className="w-4 h-4 mr-2 inline" />
                  clinics@babypeek.io
                </a>
              </Button>
            </div>
          </section>

          {/* Internal links */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-warm-gray">
            <Link to="/for-clinics/how-it-works" className="hover:text-coral transition-colors">
              How It Works →
            </Link>
            <Link to="/for-clinics/calculator" className="hover:text-coral transition-colors">
              Calculator →
            </Link>
            <Link to="/for-clinics/security" className="hover:text-coral transition-colors">
              Security →
            </Link>
            <Link to="/faq" className="hover:text-coral transition-colors">
              FAQ (Parents) →
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
