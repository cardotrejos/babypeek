// Blog post metadata registry
// Add new posts here as they're created

export interface BlogPostMeta {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: "Pregnancy" | "Ultrasound Guide" | "AI Technology" | "For Clinics";
  readTime: string; // e.g. "8 min read"
  featured?: boolean;
}

export const blogPosts: BlogPostMeta[] = [
  {
    slug: "what-will-my-baby-look-like",
    title: "What Will My Baby Look Like? The Science of Baby Face Prediction",
    excerpt:
      "From genetics to AI — how predicting a baby's face has evolved from guesswork to science. An inside look at how BabyPeek turns ultrasound data into a portrait.",
    date: "2026-03-22",
    author: "BabyPeek Team",
    category: "AI Technology",
    readTime: "8 min read",
    featured: true,
  },
];

export function getPostBySlug(slug: string): BlogPostMeta | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getPostsByCategory(category: BlogPostMeta["category"]): BlogPostMeta[] {
  return blogPosts.filter((p) => p.category === category);
}
