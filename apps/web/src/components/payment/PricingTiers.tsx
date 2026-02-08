import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { posthog, isPostHogConfigured } from "@/lib/posthog";
import {
  PRICING_TIERS,
  TIER_ORDER,
  DEFAULT_TIER,
  type TierId,
  type PricingTier,
} from "@/lib/pricing";

interface PricingTiersProps {
  onSelect: (tier: TierId) => void;
  uploadId?: string;
  className?: string;
  disabled?: boolean;
}

export function PricingTiers({
  onSelect,
  uploadId,
  className,
  disabled = false,
}: PricingTiersProps) {
  const [selectedTier, setSelectedTier] = useState<TierId>(DEFAULT_TIER);

  const handleTierSelect = useCallback(
    (tierId: TierId) => {
      setSelectedTier(tierId);

      if (isPostHogConfigured()) {
        posthog.capture("pricing_tier_selected", {
          tier: tierId,
          price_cents: PRICING_TIERS[tierId].priceCents,
          upload_id: uploadId,
        });
      }
    },
    [uploadId],
  );

  const handleBuyClick = useCallback(() => {
    if (isPostHogConfigured()) {
      posthog.capture("pricing_tier_buy_clicked", {
        tier: selectedTier,
        price_cents: PRICING_TIERS[selectedTier].priceCents,
        upload_id: uploadId,
      });
    }
    onSelect(selectedTier);
  }, [selectedTier, uploadId, onSelect]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 gap-3">
        {TIER_ORDER.map((tierId) => {
          const tier = PRICING_TIERS[tierId];
          const isSelected = tierId === selectedTier;

          return (
            <TierCard
              key={tierId}
              tier={tier}
              isSelected={isSelected}
              onSelect={() => handleTierSelect(tierId)}
              disabled={disabled}
            />
          );
        })}
      </div>

      <button
        onClick={handleBuyClick}
        disabled={disabled}
        className={cn(
          "w-full py-4 rounded-xl text-lg font-bold text-white",
          "bg-gradient-to-r from-coral to-pink-500",
          "hover:opacity-90 active:scale-[0.98] transition-all",
          "shadow-lg shadow-coral/25",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
        data-testid="pricing-buy-button"
      >
        {disabled ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2 inline-block" />
            Processing...
          </>
        ) : (
          `Get ${PRICING_TIERS[selectedTier].name} - ${PRICING_TIERS[selectedTier].priceDisplay}`
        )}
      </button>
    </div>
  );
}

function TierCard({
  tier,
  isSelected,
  onSelect,
  disabled,
}: {
  tier: PricingTier;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "relative w-full text-left rounded-xl border-2 p-4 transition-all",
        isSelected
          ? "border-coral bg-coral-light shadow-md"
          : "border-charcoal/10 bg-white hover:border-charcoal/20",
        disabled && "opacity-50 cursor-not-allowed",
      )}
      data-testid={`tier-card-${tier.id}`}
    >
      {tier.popular && (
        <span className="absolute -top-2.5 left-4 bg-coral text-white text-xs font-bold px-2 py-0.5 rounded-full">
          Most Popular
        </span>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
              isSelected ? "border-coral" : "border-charcoal/30",
            )}
          >
            {isSelected && <div className="size-2.5 rounded-full bg-coral" />}
          </div>

          <div>
            <h3 className="font-semibold text-charcoal">{tier.name}</h3>
            <p className="text-xs text-warm-gray">{tier.description}</p>
          </div>
        </div>

        <div className="text-right">
          <span className="font-display text-xl text-charcoal">{tier.priceDisplay}</span>
        </div>
      </div>

      {isSelected && (
        <ul className="mt-3 ml-8 space-y-1 text-sm text-warm-gray">
          {tier.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <span className="text-green-500 flex-shrink-0 text-xs">&#10003;</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}
