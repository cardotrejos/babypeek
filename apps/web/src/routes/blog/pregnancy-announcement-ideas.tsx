import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Calendar, User, Clock, ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";

export const Route = createFileRoute("/blog/pregnancy-announcement-ideas")({
  component: PregnancyAnnouncementIdeasPage,
});

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "10 Creative Pregnancy Announcement Ideas Using Your Baby's AI Portrait",
  description:
    "Skip the generic pregnancy announcement. Use your AI baby portrait to create something parents and grandparents will actually remember.",
  author: { "@type": "Organization", name: "BabyPeek Team" },
  publisher: { "@type": "Organization", name: "BabyPeek", url: "https://babypeek.io" },
  datePublished: "2026-04-01",
  dateModified: "2026-04-01",
  image: "https://babypeek.io/logo.png",
  url: "https://babypeek.io/blog/pregnancy-announcement-ideas",
  mainEntityOfPage: { "@type": "WebPage", "@id": "https://babypeek.io/blog/pregnancy-announcement-ideas" },
};

const postMeta = {
  title: "10 Creative Pregnancy Announcement Ideas Using Your Baby's AI Portrait",
  date: "2026-04-01",
  author: "BabyPeek Team",
  category: "Inspiration",
  readTime: "7 min read",
};

export function PregnancyAnnouncementIdeasPage() {
  return (
    <>
      <Helmet>
        <title>10 Creative Pregnancy Announcement Ideas Using Your Baby's AI Portrait</title>
        <meta name="description" content="Skip the generic pregnancy announcement. Use your AI baby portrait to create something parents and grandparents will actually remember." />
        <link rel="canonical" href="https://babypeek.io/blog/pregnancy-announcement-ideas" />
        <meta property="og:title" content="10 Creative Pregnancy Announcement Ideas Using Your Baby's AI Portrait" />
        <meta property="og:description" content="Skip the generic pregnancy announcement. Use your AI baby portrait to create something parents and grandparents will actually remember." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://babypeek.io/blog/pregnancy-announcement-ideas" />
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
            <span className="text-charcoal line-clamp-1">Pregnancy Announcement Ideas</span>
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
                You've seen the ones on social media: a photo of shoes in a box, an ultrasound image with "Baby on
                Board" text, a "1+1=3" graphic. They're fine. They're fine. They're everywhere.
              </p>
              <p>
                Your AI baby portrait from BabyPeek changes what's possible. Instead of announcing with a medical
                scan, you can show family and friends exactly what your baby looks like — before they're born.
              </p>
              <p>Here are 10 ideas that actually stand out.</p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">For Sharing With Family</h2>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">1. The "First Look" Frame</h3>
              <p>
                Order a high-quality print of your BabyPeek portrait (8x10 or 11x14). Place it in a gift box lined
                with tissue paper. Record the moment you give it to the grandparents.
              </p>
              <p>
                Grandparents especially respond to this one — they can't resist a baby photo. The reveal moment
                becomes a family memory itself.
              </p>
              <p>
                <em>Pro tip:</em> Include the original ultrasound image underneath the portrait so they can see
                what the AI started with.
              </p>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">2. The Sibling Surprise</h3>
              <p>
                If you already have kids, let them be the messengers. Give your older child a small framed BabyPeek
                portrait and have them walk into the family gathering with it.
              </p>
              <p>
                The moment older kids realize they're going to be a big brother or sister — that's the content. You
                don't even need a caption.
              </p>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">3. The Shadow Box Mailer</h3>
              <p>
                Ship a shadow box frame to out-of-town family members. Inside: the BabyPeek portrait on one side,
                the ultrasound image on the other, with a small "coming [due date]" tag.
              </p>
              <p>
                This works especially well for grandparents who live far away. A text message announcement is
                forgettable. A physical package arriving in the mail is not.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">For Social Media</h2>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">4. The Before & After Reel</h3>
              <p>
                Post a Reel or TikTok with two sides: the ultrasound on the left, the BabyPeek portrait on the right.
                Audio: a soft heartbeat sound effect underneath.
              </p>
              <p>
                Format: split-screen, slow zoom. Text overlay: "This is what we're imagining. [Due date]."
              </p>
              <p>
                This format consistently performs well because it creates curiosity — viewers want to understand
                what they're looking at.
              </p>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">5. The "Face Reveal" Carousel</h3>
              <p>
                Upload 5–8 slides. Slide 1: the ultrasound. Slides 2–7: progressively more detailed AI renderings.
                Slide 8: the final BabyPeek portrait with the due date.
              </p>
              <p>
                The carousel format drives saves and shares — people save posts they're curious about. Caption:
                something personal about your journey to this moment, not just a product description.
              </p>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">6. The Billboard Frame</h3>
              <p>
                Take your BabyPeek portrait and drop it into a mockup of a billboard, a city bus stop ad, or a
                magazine cover. Use a free tool like Canva or Placeit.
              </p>
              <p>
                It's self-aware — you're making fun of the dramatic pregnancy announcement format. That irony tends
                to perform well with younger audiences.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">For Partners & Close Friends</h2>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">7. The "Proof of Life" Packet</h3>
              <p>
                Create a small PDF — one page, beautifully designed — with: the BabyPeek portrait, the due date,
                your name and your partner's name, and a fun "official document" design.
              </p>
              <p>
                Print it, frame it, or email it to your closest friends with the subject line: "Important: New
                Resident Approaching."
              </p>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">8. The Co-Ed Baby Shower Invite</h3>
              <p>
                Use the BabyPeek portrait as the hero image on your baby shower invitation. Add the date, time,
                location, and registry link.
              </p>
              <p>
                Your guests will keep the invitation as a memento. That's better than a generic Evite they'll
                forget existed.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">For the Extremely Extra (in the Best Way)</h2>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">9. The Times Square Mini</h3>
              <p>
                Some parents print a large-format poster of their BabyPeek portrait and take a photo in front of
                a landmark. Times Square is the classic, but any recognizable location works — the Eiffel Tower,
                your local city hall, the spot where you first met.
              </p>
              <p>
                You don't need to actually buy ad space. Just take the photo and post it with a caption like:
                "New tenant moving in [date]. Leasing office: [your names]."
              </p>

              <h3 className="font-display text-lg text-charcoal mt-6 mb-2">10. The Personality-Based Announcement</h3>
              <p>
                Here's the meta move: instead of using the portrait as the announcement, make the <em>creation of
                the portrait</em> the story.
              </p>
              <p>
                Post a photo of your phone or computer screen showing the BabyPeek process — "We just saw our
                baby's face for the first time. Here's what it looked like." Then reveal the portrait.
              </p>
              <p>
                This works because it's emotionally authentic. You're not pretending to have a professional photo;
                you're sharing a genuine moment.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">Quick Tips Before You Announce</h2>
              <p>
                <strong className="text-charcoal">Get the timing right.</strong> Most parents share their pregnancy
                announcement after the first trimester (weeks 12–14), when miscarriage risk drops significantly.
                Save the BabyPeek portrait reveal for when you're ready to go public.
              </p>
              <p>
                <strong className="text-charcoal">Mind the resolution.</strong> BabyPeek portraits work best at
                larger sizes if you upload the highest-quality ultrasound files your clinic provides. Ask for
                uncompressed video files if you're planning to print.
              </p>
              <p>
                <strong className="text-charcoal">Know your audience.</strong> Some family members prefer traditional
                announcements. A BabyPeek portrait is perfect for social media and close friends, but you might want
                to give grandparents a phone call with the image first.
              </p>
              <p>
                <strong className="text-charcoal">Share the backstory.</strong> The most engaging announcements include
                a short personal narrative — how long you've been waiting, how you felt when you first saw the
                portrait, what you're most excited about. People connect with stories, not specifications.
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
