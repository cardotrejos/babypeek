// =============================================================================
// Client-Side Pricing Configuration
// =============================================================================

export type TierId = "basic" | "plus" | "pro";

export interface PricingTier {
  id: TierId;
  name: string;
  priceCents: number;
  priceDisplay: string;
  popular?: boolean;
  features: string[];
  description: string;
}

export const PRICING_TIERS: Record<TierId, PricingTier> = {
  basic: {
    id: "basic",
    name: "Basic",
    priceCents: 999,
    priceDisplay: "$9.99",
    description: "Your favorite portrait in HD",
    features: [
      "1 HD portrait (your pick)",
      "No watermarks",
      "Instant download",
    ],
  },
  plus: {
    id: "plus",
    name: "Plus",
    priceCents: 1499,
    priceDisplay: "$14.99",
    popular: true,
    description: "All 4 styles, ready to share",
    features: [
      "All 4 HD portraits",
      "No watermarks",
      "Instant download",
      "Email delivery",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceCents: 2499,
    priceDisplay: "$24.99",
    description: "Print-ready, priority quality",
    features: [
      "All 4 HD portraits",
      "No watermarks",
      "Instant download",
      "Email delivery",
      "Print-ready resolution",
      "Priority processing",
    ],
  },
};

export const TIER_ORDER: TierId[] = ["basic", "plus", "pro"];

export const DEFAULT_TIER: TierId = "plus";

// ─────────────────────────────────────────────────────────────────────────────
// Backward Compatibility Exports
// ─────────────────────────────────────────────────────────────────────────────
// Used by landing page, FAQ, and other components that reference a single price.
// They now reflect the "starting at" price (Basic tier).

export const PRICE_CENTS = PRICING_TIERS.basic.priceCents;
export const PRICE_DISPLAY = PRICING_TIERS.basic.priceDisplay;
