import { createFileRoute, Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Calendar, User, Clock, ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/seo/footer";
import { blogPosts, type BlogPostMeta } from "@/content/blog";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";

export const Route = createFileRoute("/blog/")({
  component: BlogIndexPage,
});

const categoryColors: Record<BlogPostMeta["category"], string> = {
  Pregnancy: "bg-rose/20 text-rose",
  "Ultrasound Guide": "bg-coral-light text-coral",
  "AI Technology": "bg-blue-100 text-blue-600",
  "For Clinics": "bg-emerald-100 text-emerald-700",
  Inspiration: "bg-purple-100 text-purple-700",
};

export function BlogIndexPage() {
  return (
    <>
      <Helmet>
        <title>BabyPeek Blog - Pregnancy, Ultrasound & AI Insights</title>
        <meta
          name="description"
          content="Tips for expecting parents, 4D ultrasound guides, and the latest in AI baby portrait technology. Expert insights on pregnancy, ultrasound, and AI."
        />
        <link rel="canonical" href="https://babypeek.io/blog" />
        <meta property="og:title" content="BabyPeek Blog - Pregnancy, Ultrasound & AI Insights" />
        <meta
          property="og:description"
          content="Tips for expecting parents, 4D ultrasound guides, and the latest in AI baby portrait technology."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://babypeek.io/blog" />
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
            <span className="text-charcoal">Blog</span>
          </nav>

          {/* Header */}
          <div className="mb-10">
            <h1 className="font-display text-3xl sm:text-4xl text-charcoal leading-tight mb-3">
              BabyPeek Blog
            </h1>
            <p className="text-warm-gray text-lg">
              Pregnancy insights, 4D ultrasound guides, and the science behind AI baby portraits.
            </p>
          </div>

          {/* Featured post */}
          {blogPosts
            .filter((p) => p.featured)
            .map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="group block rounded-2xl bg-coral-light border-2 border-coral p-6 mb-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded-full",
                      categoryColors[post.category],
                    )}
                  >
                    {post.category}
                  </span>
                  <span className="text-xs text-warm-gray font-medium">Featured</span>
                </div>
                <h2 className="font-display text-xl text-charcoal mb-2 group-hover:text-coral transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-warm-gray mb-4 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center gap-4 text-xs text-warm-gray">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {post.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(post.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readTime}
                  </span>
                </div>
                <div className="mt-3 text-coral text-sm font-medium flex items-center gap-1">
                  Read article <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}

          {/* All posts */}
          {blogPosts.length > 0 && (
            <div>
              <h2 className="font-display text-xl text-charcoal mb-4">All Articles</h2>
              <div className="space-y-4">
                {blogPosts.map((post) => (
                  <Link
                    key={post.slug}
                    to={`/blog/${post.slug}`}
                    className="group block rounded-xl border border-charcoal/10 bg-white/60 p-5 hover:border-coral/30 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full",
                          categoryColors[post.category],
                        )}
                      >
                        {post.category}
                      </span>
                    </div>
                    <h3 className="font-display text-base text-charcoal mb-1 group-hover:text-coral transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-warm-gray mb-3 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center gap-4 text-xs text-warm-gray">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {post.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(post.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {post.readTime}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {blogPosts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-warm-gray">New articles coming soon!</p>
            </div>
          )}

          {/* Newsletter / CTA */}
          <div className="mt-12 rounded-2xl bg-coral-light border border-coral p-6 text-center">
            <h2 className="font-display text-lg text-charcoal mb-2">
              Want to see your baby's face?
            </h2>
            <p className="text-sm text-warm-gray mb-4">
              Upload your 4D ultrasound and get a free AI portrait preview in 60 seconds.
            </p>
            <Link
              to="/"
              className={cn(
                "inline-flex items-center gap-2",
                "text-lg font-semibold",
                "bg-coral hover:bg-coral-hover text-white",
                "px-6 py-3 rounded-full",
                "shadow-lg hover:shadow-xl",
                "transition-all duration-200",
              )}
            >
              Try BabyPeek Free →
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
