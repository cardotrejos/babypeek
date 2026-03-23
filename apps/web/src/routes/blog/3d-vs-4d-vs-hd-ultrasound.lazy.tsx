import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Calendar, User, Clock, ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createLazyFileRoute("/blog/3d-vs-4d-vs-hd-ultrasound")({
  component: ThreeDVFourDVHDUltrasoundPage,
});

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "3D vs 4D vs HD Ultrasound: What's the Difference?",
  description:
    "Confused by 3D, 4D, and HD ultrasound? Here's a clear breakdown of what each technology delivers and which one works best with BabyPeek.",
  author: { "@type": "Organization", name: "BabyPeek Team" },
  publisher: { "@type": "Organization", name: "BabyPeek", url: "https://babypeek.io" },
  datePublished: "2026-03-25",
  dateModified: "2026-03-25",
  image: "https://babypeek.io/logo.png",
  url: "https://babypeek.io/blog/3d-vs-4d-vs-hd-ultrasound",
  mainEntityOfPage: { "@type": "WebPage", "@id": "https://babypeek.io/blog/3d-vs-4d-vs-hd-ultrasound" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const postMeta = {
  title: "3D vs 4D vs HD Ultrasound: What's the Difference?",
  date: "2026-03-25",
  author: "BabyPeek Team",
  category: "Ultrasound Guide",
  readTime: "6 min read",
};

export function ThreeDVFourDVHDUltrasoundPage() {
  return (
    <>
      <Helmet>
        <title>3D vs 4D vs HD Ultrasound: What's the Difference?</title>
        <meta name="description" content="Confused by 3D, 4D, and HD ultrasound? Here's a clear breakdown of what each technology delivers and which one works best with BabyPeek." />
        <link rel="canonical" href="https://babypeek.io/blog/3d-vs-4d-vs-hd-ultrasound" />
        <meta property="og:title" content="3D vs 4D vs HD Ultrasound: What's the Difference?" />
        <meta property="og:description" content="Confused by 3D, 4D, and HD ultrasound? Here's a clear breakdown of what each technology delivers and which one works best with BabyPeek." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://babypeek.io/blog/3d-vs-4d-vs-hd-ultrasound" />
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
            <span className="text-charcoal line-clamp-1">3D vs 4D vs HD Ultrasound</span>
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
                Walk into any ultrasound studio and you'll see packages labeled 3D, 4D, and HD. They sound incremental,
                but the differences matter — especially if you're trying to capture the clearest possible image of your
                baby's face.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">2D Ultrasound: The Baseline</h2>
              <p>
                Every ultrasound starts with 2D. This is the black-and-white, cross-sectional imaging your doctor
                uses at standard prenatal appointments. It shows internal structures — bones appear white, fluids
                black, tissues in grayscale.
              </p>
              <p>
                2D is medical. It answers clinical questions: How's the heartbeat? Is the placenta healthy? How's
                the baby positioned?
              </p>
              <p><em>It's not what you're here for.</em></p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">3D Ultrasound: A Still Photo in Three Dimensions</h2>
              <p>
                3D ultrasound takes multiple 2D slices from different angles and reconstructs them into a single
                three-dimensional still image. Think of it like a CT scan — you get depth perception on a frozen moment.
              </p>
              <p><strong className="text-charcoal">What you get:</strong></p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>A still photo of your baby's face or body</li>
                <li>Surface detail: nose, lips, fingers, feet</li>
                <li>The ability to rotate the image on screen</li>
                <li>Full color rendering</li>
              </ul>
              <p><strong className="text-charcoal">What you don't get:</strong></p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Movement</li>
                <li>Real-time footage</li>
                <li>Video</li>
              </ul>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">4D Ultrasound: Live Video in Three Dimensions</h2>
              <p>
                4D adds the time dimension to 3D. Instead of a photo, you get a video — real-time moving footage of
                your baby in utero.
              </p>
              <p>
                This is the experience most parents are after. You watch baby yawn, stretch, suck their thumb, and
                make facial expressions. The footage typically runs 15–30 minutes per session.
              </p>
              <p><strong className="text-charcoal">Advantages over 3D:</strong></p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Captures movement and expression</li>
                <li>More chances to get a good angle (baby doesn't stay still)</li>
                <li>Better for seeing behavioral patterns</li>
                <li>More emotionally engaging footage</li>
              </ul>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">HD Ultrasound: The High-Definition Upgrade</h2>
              <p>
                HD (sometimes marketed as "HDLive" by GE, or simply "HD ultrasound") is a rendering technology applied
                to 3D/4D data — not a different scanning method. It uses advanced lighting algorithms to simulate how
                light falls on surfaces, dramatically increasing the realism of rendered images.
              </p>
              <p><strong className="text-charcoal">HD specifically improves:</strong></p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Skin tone rendering with realistic shadow and highlight</li>
                <li>"Glass-like" clarity on facial features</li>
                <li>Volumetric lighting that makes the womb environment feel real</li>
                <li>Reduced "plastic" look common in standard 3D rendering</li>
              </ul>
              <p>
                GE's Voluson E10 — the top-of-the-line obstetrics ultrasound machine — introduced HDLive Imaging.
                Some studios charge significantly more for HD packages because of the equipment cost.
              </p>
              <p>
                <em>Note:</em> "HD ultrasound" is a marketing term, not a standardized medical classification.
                Ask specifically what machine they use and what rendering software they apply.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">Direct Comparison</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-charcoal/10">
                      <th className="text-left py-2 pr-4 font-semibold text-charcoal">Feature</th>
                      <th className="text-left py-2 pr-3 font-semibold text-charcoal">2D</th>
                      <th className="text-left py-2 pr-3 font-semibold text-charcoal">3D</th>
                      <th className="text-left py-2 pr-3 font-semibold text-charcoal">4D</th>
                      <th className="text-left py-2 font-semibold text-charcoal">HD</th>
                    </tr>
                  </thead>
                  <tbody className="text-warm-gray">
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">Dimension</td><td className="py-2 pr-3">2D cross-section</td><td className="py-2 pr-3">3D still</td><td className="py-2 pr-3">3D + time</td><td className="py-2">3D/4D + HD render</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">Color</td><td className="py-2 pr-3">Grayscale</td><td className="py-2 pr-3">Full color</td><td className="py-2 pr-3">Full color</td><td className="py-2">Photorealistic</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">Movement</td><td className="py-2 pr-3">None</td><td className="py-2 pr-3">None</td><td className="py-2 pr-3">Yes — video</td><td className="py-2">Usually 3D/4D base</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">Keepsake quality</td><td className="py-2 pr-3">Low</td><td className="py-2 pr-3">Good</td><td className="py-2 pr-3">Very good</td><td className="py-2">Excellent</td></tr>
                    <tr className="border-b border-charcoal/5"><td className="py-2 pr-4 font-medium text-charcoal">Avg. cost</td><td className="py-2 pr-3">Covered by insurance</td><td className="py-2 pr-3">$50–$150</td><td className="py-2 pr-3">$100–$300</td><td className="py-2">$150–$400</td></tr>
                    <tr><td className="py-2 pr-4 font-medium text-charcoal">Best for</td><td className="py-2 pr-3">Clinical</td><td className="py-2 pr-3">Portrait</td><td className="py-2 pr-3">Video + expressions</td><td className="py-2">Most realistic</td></tr>
                  </tbody>
                </table>
              </div>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">Which Works Best with BabyPeek?</h2>
              <p><strong className="text-charcoal">Best input → BabyPeek:</strong></p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong className="text-charcoal">HD ultrasound footage</strong> — highest quality base for AI processing</li>
                <li><strong className="text-charcoal">4D video clips</strong> — excellent, especially from weeks 26–30</li>
              </ul>
              <p><strong className="text-charcoal">Still usable:</strong></p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong className="text-charcoal">3D still images</strong> — works, though the AI has less facial expression data to draw from</li>
              </ul>
              <p><strong className="text-charcoal">Not recommended as primary input:</strong></p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong className="text-charcoal">2D images</strong> — AI reconstruction works best with volumetric (3D) data</li>
              </ul>
              <p>
                The best results come from studios that offer <strong className="text-charcoal">4D + HD rendering</strong> combined.
                You get live video footage AND high-definition surface rendering. Upload the best frame to BabyPeek
                and the AI takes it from there.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">What to Ask Your Ultrasound Studio</h2>
              <ol className="list-decimal list-inside space-y-2 pl-2">
                <li>What machine do you use? (GE Voluson E8/E10 are industry leaders)</li>
                <li>Do you offer HD rendering, and what's the upcharge?</li>
                <li>What's your session length?</li>
                <li>Do you provide digital files, and in what format?</li>
                <li>What's your policy on rescan if images don't come out?</li>
              </ol>
              <p>
                Most boutique studios charge $150–$300 for a 30-minute 4D session with digital deliverables.
                If they're not providing downloadable files, find another studio — you need those files for BabyPeek.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">The Short Version</h2>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong className="text-charcoal">2D:</strong> Medical grayscale — not for keepsakes</li>
                <li><strong className="text-charcoal">3D:</strong> A single color still photo — good for portraits</li>
                <li><strong className="text-charcoal">4D:</strong> Live video — the emotional experience most parents want</li>
                <li><strong className="text-charcoal">HD:</strong> Photorealistic rendering applied to 3D/4D data — the best visual quality</li>
              </ul>
              <p>
                For BabyPeek, <strong className="text-charcoal">4D with HD rendering</strong> is the ideal input. Ask your
                studio for digital files, not just printed images.
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
