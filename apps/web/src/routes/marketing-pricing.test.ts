import { describe, expect, it } from "vitest";

import { PRICE_DISPLAY, PRICING_TIERS } from "@/lib/pricing";

import {
  FAQ_PRICING_ANSWER,
  HOW_IT_WORKS_HD_TIP,
  HOW_IT_WORKS_ROUTE_STEP_DESCRIPTION,
  HOW_IT_WORKS_SCHEMA_STEP_TEXT,
  LANDING_META_DESCRIPTION,
  LANDING_OG_DESCRIPTION,
  LANDING_SOFTWARE_APP_SCHEMA,
  PRICING_COMPARISON_STARTING_PRICE,
  PRICING_PAGE_DESCRIPTION,
  PRICING_PAGE_OG_DESCRIPTION,
  PRICING_PAGE_TITLE,
  PRICING_PRODUCT_SCHEMA,
  STARTING_AT_PRICE_COPY,
  STARTING_AT_PRICE_COPY_TITLE,
} from "./marketing-pricing";

describe("marketing pricing copy", () => {
  it("derives shared starting price copy from PRICE_DISPLAY", () => {
    expect(STARTING_AT_PRICE_COPY).toBe(`from ${PRICE_DISPLAY}`);
    expect(STARTING_AT_PRICE_COPY_TITLE).toBe(`From ${PRICE_DISPLAY}`);
  });

  it("keeps landing meta copy in sync with the starting price", () => {
    expect(LANDING_META_DESCRIPTION).toContain(STARTING_AT_PRICE_COPY);
    expect(LANDING_OG_DESCRIPTION).toContain(STARTING_AT_PRICE_COPY);
  });

  it("derives landing software schema offer prices from PRICING_TIERS", () => {
    expect(LANDING_SOFTWARE_APP_SCHEMA.offers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: PRICING_TIERS.basic.name,
          price: (PRICING_TIERS.basic.priceCents / 100).toFixed(2),
        }),
        expect.objectContaining({
          name: PRICING_TIERS.plus.name,
          price: (PRICING_TIERS.plus.priceCents / 100).toFixed(2),
        }),
        expect.objectContaining({
          name: PRICING_TIERS.pro.name,
          price: (PRICING_TIERS.pro.priceCents / 100).toFixed(2),
        }),
      ]),
    );
  });

  it("keeps pricing page seo copy and schema in sync with PRICING_TIERS", () => {
    expect(PRICING_PAGE_TITLE).toContain(STARTING_AT_PRICE_COPY_TITLE);
    expect(PRICING_PAGE_DESCRIPTION).toContain(STARTING_AT_PRICE_COPY);
    expect(PRICING_PAGE_OG_DESCRIPTION).toContain(STARTING_AT_PRICE_COPY);
    expect(PRICING_COMPARISON_STARTING_PRICE).toBe(STARTING_AT_PRICE_COPY_TITLE);

    expect(PRICING_PRODUCT_SCHEMA.offers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: PRICING_TIERS.basic.name,
          price: (PRICING_TIERS.basic.priceCents / 100).toFixed(2),
        }),
        expect.objectContaining({
          name: PRICING_TIERS.plus.name,
          price: (PRICING_TIERS.plus.priceCents / 100).toFixed(2),
        }),
        expect.objectContaining({
          name: PRICING_TIERS.pro.name,
          price: (PRICING_TIERS.pro.priceCents / 100).toFixed(2),
        }),
      ]),
    );
  });

  it("keeps how-it-works and faq pricing copy in sync with PRICE_DISPLAY", () => {
    expect(HOW_IT_WORKS_SCHEMA_STEP_TEXT).toContain(STARTING_AT_PRICE_COPY);
    expect(HOW_IT_WORKS_ROUTE_STEP_DESCRIPTION).toContain(STARTING_AT_PRICE_COPY);
    expect(HOW_IT_WORKS_HD_TIP).toContain(STARTING_AT_PRICE_COPY);

    expect(FAQ_PRICING_ANSWER).toContain(
      `${PRICING_TIERS.basic.name} at ${PRICING_TIERS.basic.priceDisplay}`,
    );
    expect(FAQ_PRICING_ANSWER).toContain(
      `${PRICING_TIERS.plus.name} at ${PRICING_TIERS.plus.priceDisplay}`,
    );
    expect(FAQ_PRICING_ANSWER).toContain(
      `${PRICING_TIERS.pro.name} at ${PRICING_TIERS.pro.priceDisplay}`,
    );
  });
});
