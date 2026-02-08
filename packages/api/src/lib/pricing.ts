// =============================================================================
// Server-Side Pricing Configuration
// =============================================================================
// SECURITY: This is the single source of truth for tier pricing.
// The server maps tier IDs to prices. Client-sent prices are NEVER trusted.

export const PRICING_TIERS = {
  basic: {
    id: "basic" as const,
    name: "Basic",
    priceCents: 999,
    priceDisplay: "$9.99",
    features: ["1 HD portrait", "No watermarks", "Instant download"],
  },
  plus: {
    id: "plus" as const,
    name: "Plus",
    priceCents: 1499,
    priceDisplay: "$14.99",
    popular: true,
    features: [
      "All 4 HD portraits",
      "No watermarks",
      "Instant download",
      "Email delivery",
    ],
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    priceCents: 2499,
    priceDisplay: "$24.99",
    features: [
      "All 4 HD portraits",
      "No watermarks",
      "Instant download",
      "Email delivery",
      "Print-ready resolution",
      "Priority processing",
    ],
  },
} as const;

export type TierId = keyof typeof PRICING_TIERS;
export type PricingTier = (typeof PRICING_TIERS)[TierId];

/** All valid tier IDs for zod validation */
export const VALID_TIER_IDS = Object.keys(PRICING_TIERS) as [TierId, ...TierId[]];

/** Default tier for backward compatibility */
export const DEFAULT_TIER_ID: TierId = "basic";

/** Get tier config by ID. Returns undefined for invalid IDs. */
export function getTierById(tierId: string): PricingTier | undefined {
  return PRICING_TIERS[tierId as TierId];
}

/** Get price in cents for a tier. Returns default (basic) price for unknown tiers. */
export function getTierPriceCents(tierId: string): number {
  return getTierById(tierId)?.priceCents ?? PRICING_TIERS.basic.priceCents;
}
