import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";

import { SiteFooter } from "@/components/seo/footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/faq")({
  component: FaqPage,
});

const faqs = [
  {
    question: "How much does BabyPeek cost?",
    answer:
      "BabyPeek has three plans: Basic at $9.99 (1 HD portrait), Plus at $14.99 (all 4 HD portraits + email delivery), and Pro at $24.99 (all 4 portraits + print-ready resolution + priority processing). Every plan is a one-time purchase — no subscription. You can preview your portrait for free before deciding.",
  },
  {
    question: "How accurate is BabyPeek's AI baby prediction?",
    answer:
      "BabyPeek creates an artistic prediction based on your baby's visible ultrasound features. It uses AI trained on thousands of ultrasound-to-baby photo pairs. Many parents report a strong resemblance after birth, but results are predictions, not medical diagnoses.",
  },
  {
    question: "What type of ultrasound image do I need?",
    answer:
      "BabyPeek works best with 4D or HD (5D) ultrasound images where the baby's face is clearly visible. 3D ultrasounds also work. Standard 2D ultrasound images are not supported. Best results come from scans done between 26–32 weeks.",
  },
  {
    question: "Is my ultrasound image kept private?",
    answer:
      "Yes. Your ultrasound image is processed by our AI and then automatically deleted from our servers. We do not store, share, or use your images for any purpose other than generating your portrait. See our privacy policy for details.",
  },
  {
    question: "How long does it take to get my baby's portrait?",
    answer:
      "About 60 seconds from upload to preview. The full HD download is available immediately after purchase.",
  },
  {
    question: "Can I get a refund if I'm not satisfied?",
    answer:
      "Yes. If you're unhappy with your HD portrait, contact us within 7 days for a full refund. No questions asked.",
  },
  {
    question: "When is the best time during pregnancy to use BabyPeek?",
    answer:
      "The best results come from 4D ultrasounds taken between 26–32 weeks of pregnancy, when your baby's facial features are most developed and visible.",
  },
  {
    question: "Does BabyPeek work with twin pregnancies?",
    answer:
      "Yes, as long as each baby's face is clearly visible in a separate ultrasound image. Upload one image per baby.",
  },
  {
    question: "Can I share my baby's portrait with family?",
    answer:
      "Yes! Every portrait comes with a unique shareable link. You can share via text, email, social media, or print it.",
  },
  {
    question: "How is BabyPeek different from other AI baby generators?",
    answer:
      "Most AI baby generators predict what a baby will look like based on parent photos. BabyPeek uses your actual 4D ultrasound — your real baby's features — to create a portrait of the baby you're actually carrying.",
  },
  {
    question: "Is this a medical tool?",
    answer:
      "No. BabyPeek is an entertainment and keepsake service. It is not a medical device and should not be used for diagnostic purposes.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: {
      "@type": "Answer",
      text: answer,
    },
  })),
};

export function FaqPage() {
  return (
    <>
      <Helmet>
        <title>BabyPeek FAQ - AI Baby Portrait Questions Answered</title>
        <meta
          name="description"
          content="Is AI baby prediction accurate? What ultrasound do I need? Is my data private? Get answers to common BabyPeek questions."
        />
        <link rel="canonical" href="https://babypeek.io/faq" />
        <meta property="og:title" content="BabyPeek FAQ - AI Baby Portrait Questions Answered" />
        <meta
          property="og:description"
          content="Is AI baby prediction accurate? What ultrasound do I need? Is my data private? Get answers to common BabyPeek questions."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://babypeek.io/faq" />
      </Helmet>

      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
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
            <span className="text-charcoal">FAQ</span>
          </nav>

          {/* H1 */}
          <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-warm-gray text-lg mb-8">
            Everything you need to know about BabyPeek.
          </p>

          {/* FAQ Accordion */}
          <Accordion type="multiple" className="space-y-0 rounded-xl border border-charcoal/10 overflow-hidden bg-white/60 backdrop-blur-sm">
            {faqs.map(({ question, answer }, index) => (
              <AccordionItem key={question} value={`faq-${index}`}>
                <AccordionTrigger className="px-4 py-4 text-sm font-medium text-charcoal hover:text-coral text-left">
                  {question}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 text-sm text-warm-gray leading-relaxed">
                  {answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Still have questions */}
          <div className="mt-8 p-6 rounded-2xl bg-coral-light border border-rose text-center">
            <p className="text-sm text-warm-gray">
              Still have questions?{" "}
              <a href="mailto:hello@babypeek.io" className="text-coral hover:underline font-medium">
                Send us a message
              </a>{" "}
              — we typically reply within a few hours.
            </p>
          </div>

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
              <Link to="/">Ready to see your baby's face? Try BabyPeek Free →</Link>
            </Button>
          </div>

          {/* Internal links */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-warm-gray">
            <Link to="/how-it-works" className="hover:text-coral transition-colors">
              How it works →
            </Link>
            <Link to="/pricing" className="hover:text-coral transition-colors">
              See pricing →
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
