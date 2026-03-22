import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Calendar, User, Clock, ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPostBySlug } from "@/content/blog";
import { formatDate } from "@/lib/date-utils";

export const Route = createFileRoute("/blog/seebaby-vs-babypeek")({
  component: SeeBabyVsBabyPeekPage,
});

const postMeta = getPostBySlug("seebaby-vs-babypeek")!;

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: postMeta.title,
  description: postMeta.excerpt,
  author: {
    "@type": "Organization",
    name: postMeta.author,
  },
  publisher: {
    "@type": "Organization",
    name: "BabyPeek",
    url: "https://babypeek.io",
  },
  datePublished: postMeta.date,
  dateModified: postMeta.date,
  image: "https://babypeek.io/logo.png",
  url: "https://babypeek.io/blog/seebaby-vs-babypeek",
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://babypeek.io/blog/seebaby-vs-babypeek",
  },
};

export function SeeBabyVsBabyPeekPage() {
  return (
    <>
      <Helmet>
        <title>SeeBaby vs BabyPeek: Choosing the Right AI for Your Ultrasound Clinic</title>
        <meta name="description" content="SeeBaby vs BabyPeek: honest comparison of two AI tools for ultrasound clinics. Different goals, different tools — here's how to pick the right one." />
        <link rel="canonical" href="https://babypeek.io/blog/seebaby-vs-babypeek" />
        <meta property="og:title" content="SeeBaby vs BabyPeek: Choosing the Right AI for Your Ultrasound Clinic" />
        <meta property="og:description" content="SeeBaby vs BabyPeek: honest comparison of two AI tools for ultrasound clinics. Different goals, different tools — here's how to pick the right one." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://babypeek.io/blog/seebaby-vs-babypeek" />
      </Helmet>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-cream">
        <header className="p-4 sm:p-6 safe-top">
          <div className="sm:max-w-[640px] sm:mx-auto flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="BabyPeek" className="h-8 w-8" />
              <span className="font-display text-xl text-charcoal font-semibold">BabyPeek</span>
            </Link>
          </div>
        </header>

        <main id="main-content" className="px-4 sm:px-6 sm:max-w-[640px] sm:mx-auto pt-8 pb-12">
          <nav className="text-sm text-warm-gray mb-6">
            <Link to="/" className="hover:text-coral transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/blog" className="hover:text-coral transition-colors">Blog</Link>
            <span className="mx-2">/</span>
            <span className="text-charcoal line-clamp-1">SeeBaby vs BabyPeek</span>
          </nav>

          <article>
            <div className="mb-2">
              <span className="text-xs font-semibold text-coral uppercase tracking-wide">{postMeta.category}</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight mb-4">{postMeta.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-warm-gray">
              <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{postMeta.author}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(postMeta.date)}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{postMeta.readTime}</span>
            </div>

            <div className="prose-blog space-y-6 text-warm-gray text-base leading-relaxed">
              <p className="text-lg text-charcoal font-medium">
                If you're running an ultrasound clinic and you've started looking at AI tools, you've probably hit
                two names: SeeBaby and BabyPeek. They sound similar. They both involve ultrasound and AI. But they're
                fundamentally different products aimed at different buyers.
              </p>
              <p>Let's be direct about both.</p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">What SeeBaby Actually Is</h2>
              <p>
                SeeBaby (seebaby.net) is a <strong className="text-charcoal">full practice management platform</strong> for
                ultrasound studios. It includes:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Online booking and intake forms</li>
                <li>Payment processing</li>
                <li>Client management and CRM</li>
                <li>Marketing tools (email sequences, SMS reminders)</li>
                <li>A mobile app for clients to view and download their images</li>
                <li>Reporting and analytics dashboard</li>
              </ul>
              <p>
                SeeBaby is not primarily an AI baby portrait tool. It's an operational software platform for studios
                that want to run their business more efficiently. The AI features exist within the broader platform —
                if you want them, they're there.
              </p>
              <p>
                <strong className="text-charcoal">The AI features in SeeBaby</strong> include automated image enhancement,
                basic gender prediction, and some wellness check automation (heartbeat detection, movement tracking).
                These are functional features, not the product's core selling point.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">What BabyPeek Actually Is</h2>
              <p>
                BabyPeek is a <strong className="text-charcoal">specialized AI portrait generation tool</strong>. Its
                entire focus is one thing: taking your 4D ultrasound data and producing the most photorealistic,
                emotionally compelling image of your client's baby.
              </p>
              <p>That's it. That's the product.</p>
              <p>
                BabyPeek doesn't do booking, payments, CRM, or marketing automation. It doesn't need to — it does
                one thing better than anyone else in the space.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">Head-to-Head Comparison</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-charcoal/10">
                      <th className="text-left py-2 pr-4 font-semibold text-charcoal">Feature</th>
                      <th className="text-left py-2 pr-4 font-semibold text-charcoal">SeeBaby</th>
                      <th className="text-left py-2 font-semibold text-charcoal">BabyPeek</th>
                    </tr>
                  </thead>
                  <tbody className="text-warm-gray">
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">Primary function</td><td className="py-2 pr-4">Studio practice management</td><td className="py-2">AI baby portrait generation</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">Booking & payments</td><td className="py-2 pr-4">Yes — full suite</td><td className="py-2">No</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">CRM & client management</td><td className="py-2 pr-4">Yes</td><td className="py-2">No</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">AI portrait quality</td><td className="py-2 pr-4">Basic enhancement</td><td className="py-2 text-coral font-medium">Photorealistic rendering</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">4D/HD input optimization</td><td className="py-2 pr-4">Partial</td><td className="py-2 text-coral font-medium">Full</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">Social media export</td><td className="py-2 pr-4">Yes — basic</td><td className="py-2 text-coral font-medium">Yes — optimized for sharing</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">Print-ready output</td><td className="py-2 pr-4">Basic</td><td className="py-2 text-coral font-medium">High-resolution, print-grade</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">White-label option</td><td className="py-2 pr-4">No</td><td className="py-2 text-coral font-medium">Yes</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">Revenue share model</td><td className="py-2 pr-4">No</td><td className="py-2 text-coral font-medium">Yes</td></tr>
                    <tr><td className="py-2 pr-4 font-medium text-charcoal">Best for</td><td className="py-2 pr-4">Full studio operations</td><td className="py-2">Keepsake add-on revenue</td></tr>
                  </tbody>
                </table>
              </div>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">When to Choose SeeBaby</h2>
              <p>SeeBaby is the right choice if:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>
                  <strong className="text-charcoal">You're starting a new studio and need everything.</strong> Booking
                  software, payment processing, client management, marketing — SeeBaby gives you a complete
                  operational backbone from day one.
                </li>
                <li>
                  <strong className="text-charcoal">Your main pain point is administrative.</strong> If you're spending
                  too much time on intake forms, appointment reminders, and payment follow-ups, SeeBaby solves
                  that directly.
                </li>
                <li>
                  <strong className="text-charcoal">You don't need the best possible portrait quality.</strong> SeeBaby's
                  AI features are functional improvements, not best-in-class. If your clients are satisfied with
                  enhanced standard images, SeeBaby covers it.
                </li>
                <li>
                  <strong className="text-charcoal">You're a larger studio with complex scheduling needs.</strong>
                  Multi-location, multiple sonographers, complex package structures — SeeBaby's reporting and
                  scheduling tools are built for scale.
                </li>
              </ul>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">When to Choose BabyPeek</h2>
              <p>BabyPeek is the right choice if:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>
                  <strong className="text-charcoal">Your differentiator is keepsake quality.</strong> If you're
                  competing on the emotional wow factor — if parents choose your studio because the images are
                  beautiful — BabyPeek is the upgrade your clients are looking for.
                </li>
                <li>
                  <strong className="text-charcoal">You already have practice management.</strong> If you're using
                  Square for payments, Calendly for booking, and a CRM you like, BabyPeek slots in as a premium
                  add-on without forcing you to rip and replace your existing stack.
                </li>
                <li>
                  <strong className="text-charcoal">You want a new revenue stream without a monthly subscription.</strong>
                  BabyPeek's partnership model means you can offer AI portraits to your clients and either take a
                  revenue share or pass the cost through as a premium add-on. There's no recurring subscription
                  eating into your margin.
                </li>
                <li>
                  <strong className="text-charcoal">You're marketing to affluent expectant parents.</strong> The
                  parents who pay $300 for a deluxe 4D package are the same parents who will pay $75 for a BabyPeek
                  portrait they can frame and share. BabyPeek's output quality matches their expectations.
                </li>
              </ul>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">The Honest Answer</h2>
              <p><strong className="text-charcoal">You probably want both.</strong></p>
              <p>
                SeeBaby handles operations. BabyPeek handles the keepsake crown jewel. The two products are not
                competitors — they solve different problems.
              </p>
              <p>
                Most studios we talk to started with SeeBaby (or a similar platform), then added BabyPeek when
                they realized their clients wanted something beyond what their existing platform offered.
              </p>
              <p>
                If you have to pick one: start with SeeBaby if you're drowning in operations, start with BabyPeek
                if your operations are under control and you need a competitive edge on product.
              </p>
              <p>
                If you're ready to see what BabyPeek looks like for your clinic:{" "}
                <Link to="/for-clinics" className="text-coral hover:underline">Start Your Free Pilot →</Link>
              </p>
            </div>

            <div className="mt-10 rounded-2xl bg-coral-light border border-coral p-6 text-center">
              <h2 className="font-display text-lg text-charcoal mb-2">Want to offer AI baby portraits?</h2>
              <p className="text-sm text-warm-gray mb-4">
                Start your free BabyPeek pilot and see the difference specialized AI makes.
              </p>
              <Button
                asChild
                className={cn(
                  "text-lg font-semibold",
                  "bg-coral hover:bg-coral-hover text-white",
                  "shadow-lg hover:shadow-xl",
                  "transition-all duration-200",
                )}
              >
                <Link to="/for-clinics">Start Your Free Pilot <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-between text-sm text-warm-gray">
              <Link to="/blog" className="hover:text-coral transition-colors">← Back to Blog</Link>
              <Link to="/for-clinics" className="hover:text-coral transition-colors">For Clinics →</Link>
            </div>
          </article>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
