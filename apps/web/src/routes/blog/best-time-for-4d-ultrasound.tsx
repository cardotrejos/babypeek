import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Calendar, User, Clock, ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";

export const Route = createFileRoute("/blog/best-time-for-4d-ultrasound")({
  component: BestTimeFor4DUtrasoundPage,
});

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Best Time for a 4D Ultrasound: Week-by-Week Guide",
  description:
    "Not sure when to book your 4D ultrasound? This week-by-week guide covers weeks 20–36 and helps you pick the perfect time to see your baby's face.",
  author: { "@type": "Organization", name: "BabyPeek Team" },
  publisher: { "@type": "Organization", name: "BabyPeek", url: "https://babypeek.io" },
  datePublished: "2026-03-22",
  dateModified: "2026-03-22",
  image: "https://babypeek.io/logo.png",
  url: "https://babypeek.io/blog/best-time-for-4d-ultrasound",
  mainEntityOfPage: { "@type": "WebPage", "@id": "https://babypeek.io/blog/best-time-for-4d-ultrasound" },
};

const postMeta = {
  title: "Best Time for a 4D Ultrasound: Week-by-Week Guide",
  date: "2026-03-22",
  author: "BabyPeek Team",
  category: "Ultrasound Guide",
  readTime: "7 min read",
};

export function BestTimeFor4DUtrasoundPage() {
  return (
    <>
      <Helmet>
        <title>Best Time for a 4D Ultrasound: Week-by-Week Guide</title>
        <meta name="description" content="Not sure when to book your 4D ultrasound? This week-by-week guide covers weeks 20–36 and helps you pick the perfect time to see your baby's face." />
        <link rel="canonical" href="https://babypeek.io/blog/best-time-for-4d-ultrasound" />
        <meta property="og:title" content="Best Time for a 4D Ultrasound: Week-by-Week Guide" />
        <meta property="og:description" content="Not sure when to book your 4D ultrasound? This week-by-week guide covers weeks 20–36 and helps you pick the perfect time to see your baby's face." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://babypeek.io/blog/best-time-for-4d-ultrasound" />
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
            <span className="text-charcoal line-clamp-1">Best Time for 4D Ultrasound</span>
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
                One of the most exciting moments of pregnancy is seeing your baby's face for the first time — not just
                as a grainy 2D blob, but in real, moving color. That's what 4D ultrasound delivers. But timing matters
                more than most people realize. Book too early and your baby looks like a tiny alien. Book too late and
                there's barely room to move.
              </p>
              <p>This guide breaks down every week from 20 to 36 so you know exactly when to schedule.</p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">How 4D Ultrasound Works Technically</h2>
              <p>
                A 4D ultrasound captures three dimensions of space plus time, producing live video of your baby in utero.
                The machine emits sound waves that bounce off tissues and return as data, which software reconstructs into
                a moving, full-color image. The better the angle, the more fat under the skin, and the more fluid around
                your baby — the clearer the result.
              </p>
              <p>That last factor is why timing is everything.</p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">Week-by-Week Breakdown</h2>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">Weeks 20–22: Too Early</h3>
              <p>
                Your baby is developing rapidly, but there's not enough subcutaneous fat yet to give features definition.
                Most 4D images from this window look skeletal — you can see the skull, the spine, and maybe a hand. The
                face appears sunken and alien-like. Not what you're paying for.
              </p>
              <p><strong className="text-charcoal">Verdict:</strong> Skip it. You'll be disappointed and likely rebook.</p>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">Weeks 23–25: Getting There, But Early</h3>
              <p>
                By week 23, your baby starts accumulating the thin layer of fat that will eventually round out features.
                The eyelids are formed. Fingers are distinct. Some parents get usable images at this stage.
              </p>
              <p>
                But success rates are inconsistent. The probability of a crystal-clear face shot is roughly 40–50%. If
                your clinic offers a free rescan policy, this window is worth a shot. Otherwise, wait.
              </p>
              <p><strong className="text-charcoal">Verdict:</strong> Marginally acceptable. Expect some great angles and some misses.</p>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">Weeks 26–30: The Sweet Spot ⭐</h3>
              <p><strong className="text-charcoal">This is the best window for a 4D ultrasound.</strong></p>
              <p>
                Your baby now has enough facial fat to give cheeks, lips, and eye sockets definition. There's typically
                good amniotic fluid for acoustic windows — meaning the sound waves have a clean path to bounce off your
                baby's face. Baby is also still small enough to move freely and show different angles in a single session.
              </p>
              <p>
                Most professional 4D ultrasound studios recommend this window specifically. The success rate for high-quality
                face images climbs to 80–90%.
              </p>
              <p><strong className="text-charcoal">What you'll likely see:</strong></p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Full cheeks and rounded face</li>
                <li>Eyelids opening and closing</li>
                <li>Sucking or yawning motions</li>
                <li>Hand-to-face movements</li>
                <li>Classic "he has my nose" moments</li>
              </ul>
              <p>
                At <Link to="/how-it-works" className="text-coral hover:underline">BabyPeek</Link>, we process your 4D
                ultrasound data using AI to generate a photorealistic baby portrait — the kind you can print, frame, and
                share. The images from weeks 26–30 give our AI the best raw material to work from.
              </p>
              <p><strong className="text-charcoal">Verdict:</strong> Book here. This is the optimal window.</p>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">Weeks 31–34: Still Good, With Caveats</h3>
              <p>
                Your baby is running out of room. Movement is more restricted, and the face may be pressed against the
                uterine wall or placenta. This can obscure key features.
              </p>
              <p>
                That said, many parents actually prefer this window because babies develop more facial expressions —
                smiling, frowning, sticking out tongues. The emotional content of the footage often outweighs the
                reduced clarity.
              </p>
              <p>Success rate drops to 60–75% for studio-quality face shots.</p>
              <p><strong className="text-charcoal">Verdict:</strong> Still worth doing. Manage expectations.</p>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">Weeks 35–36: Last Chance</h3>
              <p>
                By week 35, your baby is running out of space and starting to "engage" — dropping into the pelvis in
                preparation for birth. The face is fully formed and, if positioned well, can still produce stunning images.
              </p>
              <p>After week 36, most clinics won't book 4D sessions because:</p>
              <ol className="list-decimal list-inside space-y-1 pl-2">
                <li>The baby is too large and too low for good imaging</li>
                <li>There's increased risk of early labor</li>
                <li>Amniotic fluid levels can decrease</li>
              </ol>
              <p><strong className="text-charcoal">Verdict:</strong> Late-window sessions are a gamble. Do them only if you can't earlier.</p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">Quick Reference Table</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-charcoal/10">
                      <th className="text-left py-2 pr-4 font-semibold text-charcoal">Weeks</th>
                      <th className="text-left py-2 pr-4 font-semibold text-charcoal">Face Clarity</th>
                      <th className="text-left py-2 pr-4 font-semibold text-charcoal">Success Rate</th>
                      <th className="text-left py-2 font-semibold text-charcoal">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="text-warm-gray">
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4">20–22</td><td className="py-2 pr-4">Low — skeletal</td><td className="py-2 pr-4">&lt; 30%</td><td className="py-2 text-coral font-medium">Skip</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4">23–25</td><td className="py-2 pr-4">Moderate</td><td className="py-2 pr-4">40–50%</td><td className="py-2 text-coral font-medium">Only with free rescan</td></tr>
                    <tr className="border-b border-charcoal/5 bg-coral-light/30"><td className="py-2 pr-4 font-semibold text-charcoal">26–30</td><td className="py-2 pr-4 font-semibold text-charcoal">High</td><td className="py-2 pr-4 font-semibold text-charcoal">80–90%</td><td className="py-2 font-semibold text-coral">Book here</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4">31–34</td><td className="py-2 pr-4">Good (may be obscured)</td><td className="py-2 pr-4">60–75%</td><td className="py-2 text-coral font-medium">Acceptable</td></tr>
                    <tr><td className="py-2 pr-4">35–36</td><td className="py-2 pr-4">Variable</td><td className="py-2 pr-4">50–65%</td><td className="py-2 text-coral font-medium">Last chance</td></tr>
                  </tbody>
                </table>
              </div>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">Factors That Affect Your Results</h2>
              <p>Beyond weeks, a few things determine image quality:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong className="text-charcoal">Body composition:</strong> Higher BMI can reduce acoustic window clarity</li>
                <li><strong className="text-charcoal">Placenta position:</strong> Anterior placenta (front-facing) can block the baby's face</li>
                <li><strong className="text-charcoal">Amniotic fluid levels:</strong> Too little or too much affects sound wave transmission</li>
                <li><strong className="text-charcoal">Baby's position:</strong> Face-up or face-down both create challenges; sideways is ideal</li>
                <li><strong className="text-charcoal">Equipment quality:</strong> Higher-frequency transducers (6–12 MHz) produce better 4D images</li>
              </ul>
              <p>
                Most clinics will attempt to "wake baby up" with cold gel or position changes. If you can feel movement
                after the session, that's a good sign the images came out.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">The Bottom Line</h2>
              <p>
                <strong className="text-charcoal">Book your 4D ultrasound between weeks 26 and 30.</strong> This is the consensus
                across the industry and backed by imaging physics. You'll get the best combination of facial development,
                movement, and amniotic fluid clarity.
              </p>
              <p>
                After your session, use BabyPeek to transform your 4D images into a lifelike portrait you can keep forever.
              </p>
            </div>

            <div className="mt-10 rounded-2xl bg-coral-light border border-coral p-6 text-center">
              <h2 className="font-display text-lg text-charcoal mb-2">Ready to see your baby's face?</h2>
              <p className="text-sm text-warm-gray mb-4">
                Upload your 4D ultrasound and get a free AI portrait preview in 60 seconds.
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
                <Link to="/">Try BabyPeek Free <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-between text-sm text-warm-gray">
              <Link to="/blog" className="hover:text-coral transition-colors">← Back to Blog</Link>
              <Link to="/how-it-works" className="hover:text-coral transition-colors">How it works →</Link>
            </div>
          </article>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
