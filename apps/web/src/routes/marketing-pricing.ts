import { PRICE_DISPLAY, PRICING_TIERS } from "@/lib/pricing";

const basicTier = PRICING_TIERS.basic;
const plusTier = PRICING_TIERS.plus;
const proTier = PRICING_TIERS.pro;

function toSchemaPrice(priceCents: number): string {
  return (priceCents / 100).toFixed(2);
}

function createPaidOffer(
  tierName: string,
  priceCents: number,
  description: string,
) {
  return {
    "@type": "Offer",
    name: tierName,
    price: toSchemaPrice(priceCents),
    priceCurrency: "USD",
    description,
  };
}

const paidOffers = [
  createPaidOffer(
    basicTier.name,
    basicTier.priceCents,
    "1 HD portrait - one-time purchase",
  ),
  createPaidOffer(
    plusTier.name,
    plusTier.priceCents,
    "All 4 HD portraits + email delivery - one-time purchase",
  ),
  createPaidOffer(
    proTier.name,
    proTier.priceCents,
    "All 4 HD portraits + print-ready resolution + priority processing - one-time purchase",
  ),
];

export const STARTING_AT_PRICE_COPY = `from ${PRICE_DISPLAY}`;
export const STARTING_AT_PRICE_COPY_TITLE = `From ${PRICE_DISPLAY}`;

export const LANDING_META_DESCRIPTION =
  `Upload your 4D ultrasound and get a realistic AI portrait of your baby in ~60 seconds. Free preview, HD ${STARTING_AT_PRICE_COPY}. Private & secure.`;
export const LANDING_OG_DESCRIPTION =
  `Upload your 4D ultrasound and get a realistic AI portrait of your baby in ~60 seconds. Free preview, HD ${STARTING_AT_PRICE_COPY}.`;

export const LANDING_SOFTWARE_APP_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "BabyPeek",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  url: "https://babypeek.io",
  description:
    "Upload your 4D ultrasound and get a realistic AI portrait of your baby's face in approximately 60 seconds.",
  offers: [
    {
      "@type": "Offer",
      name: "Free Preview",
      price: "0",
      priceCurrency: "USD",
      description: "Free low-resolution baby portrait preview",
    },
    ...paidOffers,
  ],
};

export const PRICING_PAGE_TITLE =
  `BabyPeek Pricing - Free Preview, HD ${STARTING_AT_PRICE_COPY_TITLE}`;
export const PRICING_PAGE_DESCRIPTION =
  `Get your baby's AI portrait free in preview quality. Upgrade to HD ${STARTING_AT_PRICE_COPY}. Basic, Plus, and Pro plans available. No subscription. No hidden fees.`;
export const PRICING_PAGE_OG_DESCRIPTION =
  `Get your baby's AI portrait free in preview quality. Upgrade to HD ${STARTING_AT_PRICE_COPY}. No subscription.`;
export const PRICING_COMPARISON_STARTING_PRICE = STARTING_AT_PRICE_COPY_TITLE;

export const PRICING_PRODUCT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "BabyPeek AI Baby Portrait",
  description:
    "High-definition AI baby portrait generated from your 4D ultrasound image.",
  offers: [
    {
      "@type": "Offer",
      name: "Free Preview",
      price: "0",
      priceCurrency: "USD",
      description: "Free low-resolution baby portrait preview",
    },
    ...paidOffers,
  ],
  brand: {
    "@type": "Brand",
    name: "BabyPeek",
  },
};

export const HOW_IT_WORKS_SCHEMA_STEP_TEXT =
  `View your free preview. Upgrade to HD (${STARTING_AT_PRICE_COPY}) to download and share the high-resolution portrait.`;
export const HOW_IT_WORKS_ROUTE_STEP_DESCRIPTION =
  `Get an instant free preview of your baby's portrait. Upgrade to HD (${STARTING_AT_PRICE_COPY}) for the full high-resolution download. Send to family and friends with a unique shareable link.`;
export const HOW_IT_WORKS_HD_TIP =
  `HD (${STARTING_AT_PRICE_COPY}): full high-resolution download`;

export const FAQ_PRICING_ANSWER =
  `BabyPeek has three plans: ${basicTier.name} at ${basicTier.priceDisplay} (1 HD portrait), ${plusTier.name} at ${plusTier.priceDisplay} (all 4 HD portraits + email delivery), and ${proTier.name} at ${proTier.priceDisplay} (all 4 portraits + print-ready resolution + priority processing). Every plan is a one-time purchase - no subscription. You can preview your portrait for free before deciding.`;
