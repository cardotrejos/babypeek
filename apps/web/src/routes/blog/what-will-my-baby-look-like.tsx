import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Calendar, User, Clock, ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/blog/what-will-my-baby-look-like")({
  component: WhatWillMyBabyLookLikePage,
});

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "What Will My Baby Look Like? The Science of Baby Face Prediction",
  description:
    "From genetics to AI — how predicting a baby's face has evolved from guesswork to science. An inside look at how BabyPeek turns ultrasound data into a portrait.",
  author: {
    "@type": "Organization",
    name: "BabyPeek Team",
  },
  publisher: {
    "@type": "Organization",
    name: "BabyPeek",
    url: "https://babypeek.io",
  },
  datePublished: "2026-03-22",
  dateModified: "2026-03-22",
  image: "https://babypeek.io/logo.png",
  url: "https://babypeek.io/blog/what-will-my-baby-look-like",
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://babypeek.io/blog/what-will-my-baby-look-like",
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const postMeta = {
  title: "What Will My Baby Look Like? The Science of Baby Face Prediction",
  date: "2026-03-22",
  author: "BabyPeek Team",
  category: "AI Technology",
  readTime: "8 min read",
};

export function WhatWillMyBabyLookLikePage() {
  return (
    <>
      <Helmet>
        <title>What Will My Baby Look Like? The Science of Baby Face Prediction</title>
        <meta
          name="description"
          content="From genetics to AI — how predicting a baby's face has evolved from guesswork to science. An inside look at how BabyPeek turns ultrasound data into a portrait."
        />
        <link rel="canonical" href="https://babypeek.io/blog/what-will-my-baby-look-like" />
        <meta property="og:title" content="What Will My Baby Look Like? The Science of Baby Face Prediction" />
        <meta
          property="og:description"
          content="From genetics to AI — how predicting a baby's face has evolved from guesswork to science. An inside look at how BabyPeek turns ultrasound data into a portrait."
        />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://babypeek.io/blog/what-will-my-baby-look-like" />
      </Helmet>

      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
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
            <Link to="/" className="hover:text-coral transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/blog" className="hover:text-coral transition-colors">Blog</Link>
            <span className="mx-2">/</span>
            <span className="text-charcoal line-clamp-1">What Will My Baby Look Like?</span>
          </nav>

          {/* Article header */}
          <article>
            <div className="mb-2">
              <span className="text-xs font-semibold text-coral uppercase tracking-wide">
                {postMeta.category}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight mb-4">
              {postMeta.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-warm-gray">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {postMeta.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(postMeta.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {postMeta.readTime}
              </span>
            </div>

            {/* Article body */}
            <div className="prose-blog space-y-6 text-warm-gray text-base leading-relaxed">
              <p className="text-lg text-charcoal font-medium">
                It's the question every expecting parent asks at some point: <em>what will my baby actually look
                like?</em> For centuries, the answer was pure speculation. Today, AI and ultrasound technology
                are turning that question into something you can actually see.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">
                The Genetics Behind Your Baby's Face
              </h2>
              <p>
                Your baby's appearance is determined by roughly 20,000–25,000 genes from you and your partner.
                Each parent contributes roughly 50% of the genetic material — but which specific versions of
                each gene get passed down is essentially a random lottery. This is why siblings can look
                dramatically different from each other, and why a baby might resemble one parent more than
                the other, or surprise you with features from a grandparent you've never met.
              </p>
              <p>
                Dominant and recessive genes play a role: dark hair is dominant over light hair, brown eyes
                over blue. But most physical traits — nose shape, lip fullness, cheekbone structure, ear
                shape — are polygenic, meaning they're influenced by dozens or hundreds of genes acting
                simultaneously. Predicting the exact outcome of that genetic lottery is, scientifically
                speaking, nearly impossible.
              </p>
              <p>
                This is why parent-photo-based AI tools, while entertaining, are fundamentally limited.
                They can apply the general geometry of your faces to a baby template, but they can't know
                which specific genetic combinations your baby actually received.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">
                Ultrasound: The Window Into Your Actual Baby
              </h2>
              <p>
                A 4D ultrasound — the kind you get at a boutique ultrasound studio between weeks 24 and 32
                — captures real images of your baby <strong className="text-charcoal">as they actually are</strong>.
                The face is formed by this point: the nose is the nose your baby has, the lips are the lips
                your baby has, the facial structure is the structure your baby has. It's not a prediction —
                it's a observation.
              </p>
              <p>
                The limitation is that ultrasound images are captured through amniotic fluid and maternal
                tissue, which creates the characteristic "grainy" look and soft outlines. You can see the
                general shape of the face, but the fine details — exact skin texture, precise eye color,
                precise lip color — aren't visible in the ultrasound.
              </p>
              <p>
                This is where AI fills the gap. By training on thousands of matched pairs — ultrasound
                images paired with photos of the same babies after birth — AI can learn how to "fill in"
                those missing details in a way that's consistent with what was actually there.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">
                How BabyPeek's AI Works: From Ultrasound to Portrait
              </h2>
              <p>
                BabyPeek uses a specialized AI model trained specifically on ultrasound-to-baby-photo pairs.
                Here's the process:
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-2">
                <li>
                  <strong className="text-charcoal">Input:</strong> You upload a 4D, HD (5D), or 3D ultrasound
                  image showing your baby's face clearly.
                </li>
                <li>
                  <strong className="text-charcoal">Feature extraction:</strong> The AI identifies key facial
                  landmarks — nose bridge, nostril shape, lip contours, cheekbone definition, forehead slope,
                  chin shape. These are the features that are actually visible in the ultrasound.
                </li>
                <li>
                  <strong className="text-charcoal">Prediction:</strong> For details not visible in the
                  ultrasound (skin color, eye color, exact hair), the model applies learned priors from the
                  training data, weighted by the ultrasound evidence available.
                </li>
                <li>
                  <strong className="text-charcoal">Rendering:</strong> The full portrait is rendered with
                  photorealistic skin, lighting, and texture — creating a complete face that reflects your
                  baby's actual features.
                </li>
              </ol>
              <p>
                The result is not a medically accurate reconstruction — it's an artistic prediction based on
                real data. But unlike parent-photo generators, BabyPeek starts with your actual baby's
                features, not proxies.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">
                The Accuracy Question: How Close Is Close Enough?
              </h2>
              <p>
                No AI baby prediction — from any tool, using any method — is 100% accurate. Facial
                development in the womb is influenced by factors beyond genetics, including uterine
                environment, position, and fluid levels. The AI can't see everything.
              </p>
              <p>
                That said, parents who have used BabyPeek frequently report being struck by the resemblance
                after birth. The key factor is the quality of the input ultrasound: clearer images with the
                baby's face fully visible produce better results.
              </p>
              <p>
                Think of it this way: a professional sketch artist who sees your baby in person will produce
                a more accurate portrait than one working from a description. BabyPeek works the same way —
                better input data (a clear ultrasound) means better output.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">
                Why AI From Ultrasounds Is Different From AI From Parent Photos
              </h2>
              <p>
                Most consumer AI baby generators use parent photos as input. The AI extracts facial features
                from Mom and Dad, combines them in various ways, and generates a plausible baby. This is
                scientifically interesting — you're essentially seeing what your combined genetics might
                produce — but it has a fundamental limitation: <strong className="text-charcoal">it's working from
                proxies, not from the actual baby</strong>.
              </p>
              <p>
                Your baby has features that are entirely their own — combinations of genetic traits that
                don't appear in either parent's face, or recessive traits from ancestors. Parent-photo AI
                can't capture these. Ultrasound-based AI can.
              </p>
              <p>
                The distinction matters most when you have a 4D ultrasound available. If you don't, a
                parent-photo generator is the next best thing — but it's a fundamentally different kind of
                prediction.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">
                What the Research Says (and Doesn't Say)
              </h2>
              <p>
                The academic literature on fetal facial reconstruction is limited. Most AI research in
                this area has focused on medical applications — detecting fetal abnormalities, analyzing
                facial development for clinical indicators — rather than artistic portrait generation.
              </p>
              <p>
                What's clear is that AI image generation has advanced dramatically. Models trained
                specifically on ultrasound-to-photo pairs can produce increasingly realistic results.
                BabyPeek's model was trained on thousands of such pairs, with human evaluators rating
                output quality at each iteration.
              </p>
              <p>
                The field is moving fast. As training data grows and models improve, the gap between
                AI prediction and actual appearance will continue to narrow.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">
                When Is the Best Time to Use BabyPeek?
              </h2>
              <p>
                The optimal window is <strong className="text-charcoal">26–32 weeks of pregnancy</strong>.
                At this stage, the baby's facial features are well-developed and clearly visible in a 4D
                ultrasound, but there's still enough amniotic fluid and room for good capture angles. After
                32 weeks, the baby often descends into the pelvis, making face-on shots more difficult.
              </p>
              <p>
                If you've already had your 4D ultrasound and saved the images, you can use BabyPeek at
                any point — the images are yours to use however you'd like.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">
                Is It Safe? Your Data, Your Privacy
              </h2>
              <p>
                With any AI tool that processes personal images, privacy matters. BabyPeek deletes your
                ultrasound image immediately after processing — it's not stored, shared, or used to train
                models. Your portrait is generated and delivered to you, and that's the end of it. See our{" "}
                <Link to="/privacy" className="text-coral hover:underline">privacy policy</Link> for full details.
              </p>

              <h2 className="font-display text-xl text-charcoal mt-8 mb-3">
                The Bottom Line
              </h2>
              <p>
                Predicting what your baby will look like has moved from folk wisdom and ultrasound grain
                to AI-powered precision. If you've had a 4D ultrasound, you already have the most valuable
                input there is: a real image of your baby. BabyPeek uses that image to generate a portrait
                that's based on actual features — not inferences from parental genetics.
              </p>
              <p>
                It's not a crystal ball. It's a best-effort artistic prediction from real data. And for
                thousands of parents, the results have been remarkable.
              </p>
              <p>
                <Link to="/how-it-works" className="text-coral hover:underline">
                  See exactly how it works →
                </Link>
              </p>
            </div>

            {/* CTA */}
            <div className="mt-10 rounded-2xl bg-coral-light border border-coral p-6 text-center">
              <h2 className="font-display text-lg text-charcoal mb-2">
                Ready to see your baby's face?
              </h2>
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
                <Link to="/">
                  Try BabyPeek Free <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>

            {/* Article footer */}
            <div className="mt-8 flex items-center justify-between text-sm text-warm-gray">
              <Link to="/blog" className="hover:text-coral transition-colors">
                ← Back to Blog
              </Link>
              <Link to="/how-it-works" className="hover:text-coral transition-colors">
                How it works →
              </Link>
            </div>
          </article>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
