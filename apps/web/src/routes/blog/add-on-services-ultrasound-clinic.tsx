import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Calendar, User, Clock, ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPostBySlug } from "@/content/blog";
import { formatDate } from "@/lib/date-utils";

export const Route = createFileRoute("/blog/add-on-services-ultrasound-clinic")({
  component: AddOnServicesUltrasoundClinicPage,
});

const postMeta = getPostBySlug("add-on-services-ultrasound-clinic")!;

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
  url: "https://babypeek.io/blog/add-on-services-ultrasound-clinic",
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://babypeek.io/blog/add-on-services-ultrasound-clinic",
  },
};

export function AddOnServicesUltrasoundClinicPage() {
  return (
    <>
      <Helmet>
        <title>7 Add-On Services That Increase Revenue Per Ultrasound Visit</title>
        <meta name="description" content="Ultrasound clinics leaving money on the table: here's how add-on services — led by AI baby portraits — can meaningfully increase revenue per client visit." />
        <link rel="canonical" href="https://babypeek.io/blog/add-on-services-ultrasound-clinic" />
        <meta property="og:title" content="7 Add-On Services That Increase Revenue Per Ultrasound Visit" />
        <meta property="og:description" content="Ultrasound clinics leaving money on the table: here's how add-on services — led by AI baby portraits — can meaningfully increase revenue per client visit." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://babypeek.io/blog/add-on-services-ultrasound-clinic" />
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
            <span className="text-charcoal line-clamp-1">Add-On Services for Ultrasound Clinics</span>
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
                The math on a standalone ultrasound session is tough. You're covering equipment costs, facility
                overhead, staffing, and the session itself — and if you're only billing once per visit, the margins
                are thin.
              </p>
              <p>
                The clinics doing well in 2026 have one thing in common: they don't sell sessions. They sell
                experiences.
              </p>
              <p>
                Add-on services let you increase average revenue per client (ARPU) without booking additional scan
                time. One visit can generate two, three, even four revenue streams.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">1. AI Baby Portraits — The New Standard Add-On</h2>
              <p><strong className="text-charcoal">Revenue potential:</strong> $25–$75 per session</p>
              <p><strong className="text-charcoal">Implementation difficulty:</strong> Low (API integration or standalone upload)</p>
              <p>
                AI baby portraits are the keepsake upgrade every expectant parent is quietly hoping for. They come in
                after their 4D session with one burning question: <em>what will my baby actually look like?</em>
              </p>
              <p>
                You offer them an AI-generated portrait — clear, photorealistic, shareable. Parents buy it. They
                share it on social media. Your clinic name appears in their post.
              </p>
              <p>
                The organic marketing value alone is worth the integration. A single viral post from a happy client
                can drive 10–20 new bookings.
              </p>
              <p>
                <strong className="text-charcoal">How to implement with BabyPeek:</strong> Partner with BabyPeek as a
                clinic. Your clients upload their 4D files post-session, and BabyPeek generates a portrait. You
                retain a revenue share or white-label the experience. Clients never leave your ecosystem.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">2. Gender Reveal Packages</h2>
              <p><strong className="text-charcoal">Revenue potential:</strong> $30–$60 per session</p>
              <p><strong className="text-charcoal">Implementation difficulty:</strong> Low</p>
              <p>
                Gender reveals are an emotional event. Parents will pay for the "official" moment.
              </p>
              <p>
                Create a gender reveal package: a specially sealed envelope, a balloon inflation, or a
                smoke/confetti cannon that releases the appropriate color on cue. The 4D ultrasound session becomes
                the backdrop.
              </p>
              <p>
                Some clinics offer a "gender reveal viewing party" — family members watch via live stream while the
                parents see the gender for the first time in-person. The social media potential is enormous.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">3. Priority Scheduling and Flexible Time Slots</h2>
              <p><strong className="text-charcoal">Revenue potential:</strong> $20–$100 per session</p>
              <p><strong className="text-charcoal">Implementation difficulty:</strong> Very low</p>
              <p>
                Not every parent can come during weekday mornings. If you offer evening or weekend slots, charge a
                premium. Even $25–$40 for a guaranteed preferred time slot adds up with zero marginal cost.
              </p>
              <p>
                More sophisticated version: a VIP membership ($150–$300/season) that includes priority booking, a
                free rescan guarantee, and a discount on add-ons. Lock in recurring revenue from your most engaged
                clients.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">4. Extended Video Packages</h2>
              <p><strong className="text-charcoal">Revenue potential:</strong> $40–$120 per session</p>
              <p><strong className="text-charcoal">Implementation difficulty:</strong> Medium</p>
              <p>
                Standard 4D packages often include 5–10 minutes of video. An extended package offers 20–30 minutes
                with more angles, multiple outfit changes (baby moves between positions), and a longer highlight reel.
              </p>
              <p>
                The marginal cost to you is storage and editing time. The perceived value to parents is enormous —
                this is the only video they'll ever have of their baby at this age.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">5. Professional Photo Printing and Framing</h2>
              <p><strong className="text-charcoal">Revenue potential:</strong> $50–$300 per session</p>
              <p><strong className="text-charcoal">Implementation difficulty:</strong> Medium</p>
              <p>
                Offer on-site printing: canvas wraps, framed prints, and photo books. The raw materials cost $10–$30;
                you're selling them for $80–$250.
              </p>
              <p>
                This works best when the prints are available immediately after the session — parents walk out with
                a product that day. For high-margin items like custom photo books, a 1-week turnaround with home
                delivery works well.
              </p>
              <p>
                <strong className="text-charcoal">Pair it with BabyPeek:</strong> The AI portrait makes an
                exceptional print. The photorealistic quality justifies a higher price point than a raw ultrasound print.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">6. Seasonal Themed Sessions</h2>
              <p><strong className="text-charcoal">Revenue potential:</strong> $30–$80 per session premium</p>
              <p><strong className="text-charcoal">Implementation difficulty:</strong> Medium</p>
              <p>
                Halloween "ghost-baby" sessions (done tastefully), holiday sessions with a Santa hat digitally
                added, spring sessions with flower crown overlays. These rotate seasonally and give parents a reason
                to come back.
              </p>
              <p>The key: market these as limited-time offerings. Scarcity drives bookings.</p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">7. Membership and Subscription Programs</h2>
              <p><strong className="text-charcoal">Revenue potential:</strong> $150–$400+ per client per pregnancy</p>
              <p><strong className="text-charcoal">Implementation difficulty:</strong> High</p>
              <p>
                Offer a "Peek Club" membership: unlimited 2D peek sessions ($80/month), one free 4D session per
                month, 20% off all prints and add-ons, and first access to seasonal themed sessions.
              </p>
              <p>
                This model converts one-time visitors into long-term clients. A parent who joins at 20 weeks and
                stays until delivery is worth $400–$600 — versus $150 for a single session.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">Revenue Comparison: Base Session vs. With Add-Ons</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-charcoal/10">
                      <th className="text-left py-2 pr-4 font-semibold text-charcoal">Revenue Stream</th>
                      <th className="text-left py-2 font-semibold text-charcoal">Per-Client Value</th>
                    </tr>
                  </thead>
                  <tbody className="text-warm-gray">
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4">Base 4D session</td><td className="py-2">$150–$250</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4">+ AI Baby Portrait</td><td className="py-2">+$25–$75</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4">+ Extended video</td><td className="py-2">+$40–$120</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4">+ Print package</td><td className="py-2">+$50–$150</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4">+ Gender reveal add-on</td><td className="py-2">+$30–$60</td></tr>
                    <tr className="bg-coral-light/30"><td className="py-2 pr-4 font-semibold text-charcoal">Fully bundled client</td><td className="py-2 font-semibold text-coral">$295–$655</td></tr>
                  </tbody>
                </table>
              </div>
              <p>
                A single well-trained client advisor can increase average ticket size by 2–3x through thoughtful
                add-on recommendations. Train your staff to mention AI portraits, prints, and video packages in
                every closing conversation.
              </p>
            </div>

            <div className="mt-10 rounded-2xl bg-coral-light border border-coral p-6 text-center">
              <h2 className="font-display text-lg text-charcoal mb-2">Want to offer AI baby portraits?</h2>
              <p className="text-sm text-warm-gray mb-4">
                Partner with BabyPeek and add a new revenue stream to every ultrasound visit.
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
