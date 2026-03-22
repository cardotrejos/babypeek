import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Shield, Lock, Trash2, Server, FileWarning, CheckCircle2 } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/for-clinics/security")({
  component: SecurityPage,
});

const securityPrinciples = [
  {
    icon: Trash2,
    title: "Automatic Image Deletion",
    description:
      "Ultrasound images are processed by our AI to generate the portrait and then automatically deleted from our servers within 24 hours. We do not retain patient images long-term.",
  },
  {
    icon: Lock,
    title: "Encryption in Transit and at Rest",
    description:
      "All images are encrypted using TLS 1.2+ during upload and download. At rest, images are stored in encrypted storage (AES-256) until processing is complete and deletion occurs.",
  },
  {
    icon: Shield,
    title: "No Patient PII Stored",
    description:
      "BabyPeek does not store names, dates of birth, medical record numbers, or any other patient-identifying information linked to ultrasound images. We don't need it.",
  },
  {
    icon: Server,
    title: "No Third-Party Data Sharing",
    description:
      "Patient images are never sold, licensed, or shared with any third party. Our subprocessors (cloud infrastructure) are bound by strict data processing agreements.",
  },
];

const complianceItems = [
  {
    status: "done",
    label: "GDPR compliance (EU users)",
  },
  {
    status: "done",
    label: "CCPA compliance (California users)",
  },
  {
    status: "done",
    label: "AES-256 encryption at rest",
  },
  {
    status: "done",
    label: "TLS 1.2+ encryption in transit",
  },
  {
    status: "done",
    label: "Automatic image deletion",
  },
  {
    status: "done",
    label: "No PII storage",
  },
  {
    status: "done",
    label: "Annual third-party security audit",
  },
  {
    status: "roadmap",
    label: "SOC 2 Type II certification",
  },
  {
    status: "roadmap",
    label: "HIPAA Business Associate Agreement (BAA)",
  },
];

export function SecurityPage() {
  return (
    <>
      <Helmet>
        <title>Security & Privacy - BabyPeek for Clinics</title>
        <meta
          name="description"
          content="How BabyPeek protects patient data. Image handling, data retention, and compliance information for clinics."
        />
        <link rel="canonical" href="https://babypeek.io/for-clinics/security" />
        <meta property="og:title" content="Security & Privacy - BabyPeek for Clinics" />
        <meta
          property="og:description"
          content="How BabyPeek protects patient data. Image handling, data retention, and compliance information for clinics."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://babypeek.io/for-clinics/security" />
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
            <span className="text-charcoal">Security & Privacy</span>
          </nav>

          {/* H1 */}
          <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight mb-4">
            Security & Privacy for Clinical Use
          </h1>
          <p className="text-warm-gray text-lg mb-8">
            Your patients' data is handled with the same care you'd expect from a medical provider.
          </p>

          {/* HIPAA Note */}
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 mb-8">
            <div className="flex items-start gap-3">
              <FileWarning className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-amber-900 text-sm mb-1">HIPAA Note</h2>
                <p className="text-amber-800 text-sm leading-relaxed">
                  BabyPeek is <strong>not</strong> a Covered Entity or Business Associate under HIPAA
                  and does not currently execute HIPAA Business Associate Agreements (BAAs). We are
                  working toward offering BAAs for Enterprise clinics in Q3 2026. If your clinic
                  requires a BAA today, please contact us at{" "}
                  <a href="mailto:clinics@babypeek.io" className="underline">
                    clinics@babypeek.io
                  </a>{" "}
                  to discuss options.
                </p>
              </div>
            </div>
          </div>

          {/* Not a medical device */}
          <div className="rounded-xl bg-coral-light border border-rose p-5 mb-8">
            <p className="text-charcoal text-sm leading-relaxed">
              <strong className="font-semibold">Important:</strong> BabyPeek is an entertainment and
              keepsake service. It is not a medical device and does not provide medical diagnoses.
              Ultrasound images are used solely to generate artistic portraits, not for any clinical
              purpose.
            </p>
          </div>

          {/* Security Principles */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-6">
              How We Protect Patient Data
            </h2>
            <div className="space-y-5">
              {securityPrinciples.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-coral-light flex items-center justify-center">
                    <Icon className="w-5 h-5 text-coral" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-charcoal mb-1">{title}</h3>
                    <p className="text-warm-gray text-sm leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Image handling details */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-4">
              Image Handling Details
            </h2>
            <div className="rounded-xl border border-charcoal/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-coral-light">
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Stage</th>
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">What Happens</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { stage: "Upload", what: "Image encrypted (TLS) and received by BabyPeek servers" },
                    { stage: "Processing", what: "AI generates portrait; image held in ephemeral memory" },
                    { stage: "Portrait delivery", what: "Portrait sent to parent via email or portal; image deleted" },
                    { stage: "Post-processing", what: "Image permanently deleted within 24 hours" },
                    { stage: "No archival copy", what: "We do not keep backups of patient images" },
                  ].map(({ stage, what }) => (
                    <tr key={stage} className="border-t border-charcoal/10">
                      <td className="px-4 py-3 text-charcoal font-medium">{stage}</td>
                      <td className="px-4 py-3 text-warm-gray text-xs">{what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Compliance Status */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-4">
              Compliance & Certifications
            </h2>
            <div className="rounded-xl border border-charcoal/10 bg-white/70 overflow-hidden">
              {complianceItems.map(({ status, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-4 py-3 border-b border-charcoal/10 last:border-0"
                >
                  {status === "done" ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-charcoal/30 shrink-0 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30" />
                    </span>
                  )}
                  <span className="text-sm text-charcoal">{label}</span>
                  {status === "roadmap" && (
                    <span className="ml-auto text-xs text-warm-gray">On roadmap</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Third-party subprocessors */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-4">
              Subprocessors
            </h2>
            <p className="text-warm-gray text-sm mb-4">
              We use trusted cloud infrastructure providers, all bound by data processing agreements:
            </p>
            <ul className="space-y-2">
              {["Cloud infrastructure (compute & storage)", "AI processing (GPU compute)", "Email delivery (transactional email)", "Payment processing (for HD portrait purchases)"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-warm-gray">
                    <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                    {item}
                  </li>
                )
              )}
            </ul>
          </section>

          {/* Data Retention */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-4">
              Data Retention Policy
            </h2>
            <div className="rounded-xl border border-charcoal/10 bg-white/70 p-5 space-y-3">
              {[
                { data: "Ultrasound images", retention: "Deleted within 24 hours of processing" },
                { data: "AI-generated portraits", retention: "Stored 30 days; deleted automatically" },
                { data: "Email address (for delivery)", retention: "Stored until portrait delivery + 30 days" },
                { data: "Aggregate/anonymized analytics", retention: "Indefinite (no individual images)" },
              ].map(({ data, retention }) => (
                <div key={data} className="flex justify-between gap-4 text-sm">
                  <span className="text-charcoal font-medium">{data}</span>
                  <span className="text-warm-gray text-right">{retention}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Security contact */}
          <section className="mb-10 p-6 rounded-2xl bg-coral-light border border-rose">
            <h2 className="font-display text-xl text-charcoal mb-2">
              Security Questions?
            </h2>
            <p className="text-warm-gray text-sm mb-4 leading-relaxed">
              For security concerns, vulnerability reports, or compliance questions, contact our team
              directly at{" "}
              <a href="mailto:security@babypeek.io" className="text-coral hover:text-coral-hover underline">
                security@babypeek.io
              </a>
              . We respond to security researchers within 48 hours.
            </p>
            <p className="text-warm-gray text-xs">
              For clinic sales and onboarding inquiries:{" "}
              <a href="mailto:clinics@babypeek.io" className="text-coral hover:text-coral-hover">
                clinics@babypeek.io
              </a>
            </p>
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
            <Link to="/for-clinics/how-it-works" className="hover:text-coral transition-colors">
              How It Works →
            </Link>
            <Link to="/for-clinics/calculator" className="hover:text-coral transition-colors">
              Revenue Calculator →
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
