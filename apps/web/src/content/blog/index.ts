// Blog post metadata registry
// Add new posts here as they're created

export interface BlogPostMeta {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: "Pregnancy" | "Ultrasound Guide" | "AI Technology" | "For Clinics" | "Inspiration";
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
  {
    slug: "best-time-for-4d-ultrasound",
    title: "Best Time for a 4D Ultrasound: Week-by-Week Guide",
    excerpt:
      "Not sure when to book your 4D ultrasound? This week-by-week guide covers weeks 20–36 and helps you pick the perfect time to see your baby's face.",
    date: "2026-03-22",
    author: "BabyPeek Team",
    category: "Ultrasound Guide",
    readTime: "7 min read",
  },
  {
    slug: "3d-vs-4d-vs-hd-ultrasound",
    title: "3D vs 4D vs HD Ultrasound: What's the Difference?",
    excerpt:
      "Confused by 3D, 4D, and HD ultrasound? Here's a clear breakdown of what each technology delivers and which one works best with BabyPeek.",
    date: "2026-03-25",
    author: "BabyPeek Team",
    category: "Ultrasound Guide",
    readTime: "6 min read",
  },
  {
    slug: "how-ai-baby-portrait-technology-works",
    title: "How AI Baby Portrait Technology Works (2026 Guide)",
    excerpt:
      "Curious how AI predicts what your unborn baby will look like? This guide explains the technology behind AI baby portraits — clearly and without hype.",
    date: "2026-03-29",
    author: "BabyPeek Team",
    category: "AI Technology",
    readTime: "10 min read",
  },
  {
    slug: "pregnancy-announcement-ideas",
    title: "10 Creative Pregnancy Announcement Ideas Using Your Baby's AI Portrait",
    excerpt:
      "Skip the generic pregnancy announcement. Use your AI baby portrait to create something parents and grandparents will actually remember.",
    date: "2026-04-01",
    author: "BabyPeek Team",
    category: "Inspiration",
    readTime: "7 min read",
  },
  {
    slug: "add-on-services-ultrasound-clinic",
    title: "7 Add-On Services That Increase Revenue Per Ultrasound Visit",
    excerpt:
      "Ultrasound clinics leaving money on the table: here's how add-on services — led by AI baby portraits — can meaningfully increase revenue per client visit.",
    date: "2026-04-05",
    author: "BabyPeek Team",
    category: "For Clinics",
    readTime: "8 min read",
  },
  {
    slug: "ai-changing-keepsake-ultrasound",
    title: "How AI Is Changing the Keepsake Ultrasound Industry in 2026",
    excerpt:
      "Keepsake ultrasound studios face a pivotal moment. AI baby portraits are shifting client expectations — here's what the industry looks like now.",
    date: "2026-04-08",
    author: "BabyPeek Team",
    category: "For Clinics",
    readTime: "7 min read",
  },
  {
    slug: "seebaby-vs-babypeek",
    title: "SeeBaby vs BabyPeek: Choosing the Right AI for Your Ultrasound Clinic",
    excerpt:
      "SeeBaby vs BabyPeek: honest comparison of two AI tools for ultrasound clinics. Different goals, different tools — here's how to pick the right one.",
    date: "2026-04-12",
    author: "BabyPeek Team",
    category: "For Clinics",
    readTime: "6 min read",
  },
  {
    slug: "ai-baby-face-prediction-complete-guide",
    title: "AI Baby Face Prediction: The Complete Guide (2026)",
    excerpt:
      "Everything you need to know about AI baby face prediction in 2026: how it works, what tools exist, accuracy rates, ethics, and how to get the best results.",
    date: "2026-04-15",
    author: "BabyPeek Team",
    category: "AI Technology",
    readTime: "12 min read",
  },
];

export function getPostBySlug(slug: string): BlogPostMeta | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getPostsByCategory(category: BlogPostMeta["category"]): BlogPostMeta[] {
  return blogPosts.filter((p) => p.category === category);
}
