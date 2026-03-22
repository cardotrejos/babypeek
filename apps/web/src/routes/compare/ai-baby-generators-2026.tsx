import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Brain, Image, Camera, CheckCircle2, XCircle } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare/ai-baby-generators-2026")({
  component: AIBabyGeneratorsPage,
});

const comparisonData = [
  {
    category: "Ultrasound-Based Generators",
    tools: ["BabyPeek"],
    input: "4D / HD / 3D ultrasound image",
    accuracy: "High — uses real fetal features",
    price: "Free preview / from $9.99",
    speed: "~60 seconds",
    note: "Only tool in this category",
  },
  {
    category: "Parent-Photo-Based Generators",
    tools: ["Remini", "BabyGenerator.ai", "MeinaAI"],
    input: "Parent face photo(s)",
    accuracy: "Medium — predicts from parent DNA proxies",
    price: "$0–$15/mo",
    speed: "10–60 seconds",
    note: "Uses facial features of parents as proxy",
  },
  {
    category: "Generic AI Face Generators",
    tools: ["Midjourney", "DALL-E", "Stable Diffusion"],
    input: "Text prompt + optional image",
    accuracy: "Low for baby prediction",
    price: "$10–$120/mo",
    speed: "30–120 seconds",
    note: "General purpose; not designed for babies",
  },
  {
    category: "Embryo / DNA Prediction Services",
    tools: ["Various genetics clinics"],
    input: "Genetic data / embryo photos",
    accuracy: "Medical — specialized",
    price: "$200–$2,000+",
    speed: "Days to weeks",
    note: "Requires medical referral; not consumer-facing",
  },
];

const faqs = [
  {
    question: "What is the most accurate AI baby generator?",
    answer:
      "Ultrasound-based tools like BabyPeek are the most accurate because they start with real images of the actual baby — not proxies. Parent-photo generators infer traits from parental DNA proxies, which is less direct. Generic AI tools are the least accurate for this specific use case.",
  },
  {
    question: "Is BabyPeek the only tool that uses ultrasound images?",
    answer:
      "Yes — BabyPeek is currently the only consumer-facing AI tool that generates baby portraits directly from 4D/HD ultrasound images. This gives it a fundamental advantage in accuracy: it's analyzing real fetal features rather than inferring them from parent photos.",
  },
  {
    question: "How does an ultrasound-based baby generator work?",
    answer:
      "BabyPeek's AI analyzes the baby's actual facial features visible in the 4D ultrasound — nose shape, lip contours, cheek structure, forehead — and maps these to a photorealistic baby face. It's trained on thousands of ultrasound-to-newborn photo pairs to learn how those features translate to a real baby portrait.",
  },
  {
    question: "Are free AI baby generators accurate?",
    answer:
      "Most free AI baby generators are parent-photo-based tools with free tiers. They produce results by applying parent facial features to a baby template, which is fundamentally less accurate than starting from the actual fetus. Free tiers typically produce low-resolution images. BabyPeek offers a free preview so you can test the ultrasound-based approach at no cost.",
  },
  {
    question: "What's the difference between AI baby generators and AI portrait apps like Remini?",
    answer:
      "Remini and similar apps predict baby features from parent photos — they use your face (and your partner's) as the primary input. BabyPeek uses your actual baby's ultrasound image. If you've had a 4D ultrasound, BabyPeek starts with real data about your baby, not inferences from parental genetics.",
  },
  {
    question: "Which AI baby generator should I use?",
    answer:
      "If you've had a 4D or HD ultrasound, use BabyPeek — it's the only tool that uses your actual baby's features. If you haven't had an ultrasound yet and want a preview, a parent-photo tool like Remini can give you a general idea. Generic AI tools like Midjourney are not designed for this and will produce unreliable results.",
  },
  {
    question: "Is BabyPeek safe to use?",
    answer:
      "Yes. Your ultrasound image is processed by AI and then automatically deleted from our servers. We don't store, share, or use your images for any purpose other than generating your portrait. BabyPeek is an entertainment service, not a medical device.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

export function AIBabyGeneratorsPage() {
  return (
    <>
      <Helmet>
        <title>AI Baby Generators 2026 - Complete Comparison & Guide</title>
        <meta
          name="description"
          content="Compare the best AI baby generators of 2026: ultrasound-based tools (BabyPeek), parent-photo generators (Remini), and generic AI. See which one actually predicts what your baby looks like."
        />
        <link rel="canonical" href="https://babypeek.io/compare/ai-baby-generators-2026" />
        <meta property="og:title" content="AI Baby Generators 2026 - Complete Comparison & Guide" />
        <meta
          property="og:description"
          content="Compare the best AI baby generators of 2026: ultrasound-based tools (BabyPeek), parent-photo generators (Remini), and generic AI. See which one actually predicts what your baby looks like."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://babypeek.io/compare/ai-baby-generators-2026" />
      </Helmet>

      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-cream">
        {/* Minimal header */}
        <header className="p-4 sm:p-6 safe-top">
          <div className="sm:max-w-[640px] sm:mx-auto flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="BabyPeek" className="h-8 w-8" />
              <span className="font-display text-xl text-charcoal font-semibold">BabyPeek</span>
            </Link>
          </div>
        </header>

        <main id="main-content" className="px-4 sm:px-6 sm:max-w-[640px] sm:mx-auto pt-8 pb-12">
          {/* Breadcrumb */}
          <nav className="text-sm text-warm-gray mb-6">
            <Link to="/" className="hover:text-coral transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link to="/compare" className="hover:text-coral transition-colors">
              Compare
            </Link>
            <span className="mx-2">/</span>
            <span className="text-charcoal">AI Baby Generators 2026</span>
          </nav>

          {/* H1 */}
          <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight mb-4">
            AI Baby Generators 2026: Complete Comparison
          </h1>
          <p className="text-warm-gray text-lg mb-8">
            Four types of tools promise to show you what your baby will look like. Here's how they
            differ, how accurate they are, and which one actually uses your real baby's features.
          </p>

          {/* Category icons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {[
              { icon: Image, label: "Ultrasound-Based", highlight: true },
              { icon: Camera, label: "Parent-Photo", highlight: false },
              { icon: Brain, label: "Generic AI", highlight: false },
              { icon: CheckCircle2, label: "DNA / Medical", highlight: false },
            ].map(({ icon: Icon, label, highlight }) => (
              <div
                key={label}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl text-center",
                  highlight
                    ? "bg-coral-light border-2 border-coral"
                    : "bg-white/40 border border-charcoal/10",
                )}
              >
                <Icon className={cn("w-6 h-6", highlight ? "text-coral" : "text-warm-gray")} />
                <span
                  className={cn("text-xs font-medium", highlight ? "text-coral" : "text-warm-gray")}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-4">How They Compare</h2>
            <div className="rounded-xl border border-charcoal/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-coral-light">
                    <th className="text-left px-3 py-3 font-semibold text-charcoal">Tool Type</th>
                    <th className="text-left px-3 py-3 font-semibold text-charcoal">Input</th>
                    <th className="text-left px-3 py-3 font-semibold text-charcoal">Accuracy</th>
                    <th className="text-left px-3 py-3 font-semibold text-charcoal">Price</th>
                    <th className="text-left px-3 py-3 font-semibold text-charcoal">Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map(({ category, tools, input, accuracy, price, speed }, i) => (
                    <tr key={category} className={i % 2 === 0 ? "bg-white/40" : ""}>
                      <td className="px-3 py-3">
                        <div className="font-medium text-charcoal text-xs">{category}</div>
                        <div className="text-warm-gray text-xs mt-0.5">{tools.join(", ")}</div>
                      </td>
                      <td className="px-3 py-3 text-warm-gray text-xs">{input}</td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            accuracy === "High — uses real fetal features"
                              ? "bg-coral-light text-coral"
                              : "bg-charcoal/5 text-warm-gray",
                          )}
                        >
                          {accuracy}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-warm-gray text-xs">{price}</td>
                      <td className="px-3 py-3 text-warm-gray text-xs">{speed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* BabyPeek spotlight */}
          <div className="rounded-2xl bg-coral-light border-2 border-coral p-6 mb-10">
            <div className="flex items-center gap-2 mb-3">
              <Image className="w-5 h-5 text-coral" />
              <span className="text-xs font-semibold text-coral uppercase tracking-wide">
                The Only Ultrasound-Based Tool
              </span>
            </div>
            <h2 className="font-display text-xl text-charcoal mb-2">
              Why BabyPeek is Fundamentally Different
            </h2>
            <p className="text-sm text-warm-gray leading-relaxed mb-4">
              Every other AI baby generator works with{" "}
              <strong className="text-charcoal">proxies</strong> — parent faces, text descriptions,
              or generic models. BabyPeek starts with an actual image of your baby, captured in your
              4D ultrasound. The AI analyzes your baby's real features — not estimates of what those
              features might be based on parental genetics.
            </p>
            <p className="text-sm text-warm-gray">
              If you've had a 4D ultrasound, this is the only tool that uses it.
            </p>
          </div>

          {/* Why ultrasound-based is better */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-6">
              Why the Input Type Matters More Than Anything
            </h2>
            <div className="space-y-4">
              {[
                {
                  title: "Ultrasound: Your baby's actual face",
                  desc: "A 4D ultrasound captures your baby's real facial features — nose shape, lip fullness, cheek structure — as they actually are. AI trained on this data produces portraits that reflect what your baby actually looks like.",
                  highlight: true,
                },
                {
                  title: "Parent photos: Inherited traits only",
                  desc: "Tools like Remini use your and your partner's faces as proxies for what the baby might inherit. This misses the random combination of genetic traits and doesn't capture anything specific to your baby.",
                  highlight: false,
                },
                {
                  title: "Text prompts: Pure imagination",
                  desc: "Generic AI like Midjourney generates a baby face based on language, not data. There's no connection to your actual baby — it's just a plausible-looking baby.",
                  highlight: false,
                },
              ].map(({ title, desc, highlight }) => (
                <div
                  key={title}
                  className={cn(
                    "rounded-xl p-5",
                    highlight
                      ? "bg-coral-light border border-coral"
                      : "bg-white/40 border border-charcoal/10",
                  )}
                >
                  <h3
                    className={cn(
                      "font-display text-base mb-1",
                      highlight ? "text-coral" : "text-charcoal",
                    )}
                  >
                    {title}
                  </h3>
                  <p className="text-sm text-warm-gray">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12">
            <h2 className="font-display text-2xl text-charcoal mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map(({ question, answer }) => (
                <details
                  key={question}
                  className="group rounded-xl border border-charcoal/10 bg-white/60 overflow-hidden"
                >
                  <summary className="px-4 py-4 cursor-pointer text-sm font-medium text-charcoal hover:text-coral list-none flex items-center justify-between">
                    {question}
                    <span className="shrink-0 ml-2 text-coral group-open:rotate-180 transition-transform">
                      ▾
                    </span>
                  </summary>
                  <div className="px-4 pb-4 text-sm text-warm-gray leading-relaxed border-t border-charcoal/5 pt-3">
                    {answer}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="text-center">
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
            <p className="mt-3 text-sm text-warm-gray">
              The only AI that uses your{" "}
              <strong className="text-charcoal">actual ultrasound</strong> →
            </p>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
