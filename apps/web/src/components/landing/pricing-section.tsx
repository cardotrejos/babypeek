import { cn } from "@/lib/utils";
import { PRICING_TIERS, TIER_ORDER } from "@/lib/pricing";
import { Check } from "lucide-react";

interface PricingSectionProps {
  id?: string;
  className?: string;
}

export function PricingSection({ id, className }: PricingSectionProps) {
  return (
    <section id={id} className={cn("py-20 sm:py-28", className)}>
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <p className="text-center text-xs font-medium tracking-[0.2em] uppercase text-coral mb-4">
          Simple pricing
        </p>
        <h2 className="font-display text-3xl sm:text-4xl text-charcoal text-center mb-4 font-medium">
          Start free. Pay only if you love it.
        </h2>
        <p className="text-center text-warm-gray max-w-lg mx-auto text-base leading-relaxed">
          Preview your baby's portrait for free. Upgrade to HD when you're ready.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-12">
          {TIER_ORDER.map((tierId, index) => {
            const tier = PRICING_TIERS[tierId];
            const isPopular = tier.popular;

            return (
              <div
                key={tier.id}
                className={cn(
                  "relative flex flex-col rounded-2xl p-6 sm:p-7",
                  "transition-all duration-500",
                  "animate-fade-up",
                  index === 0 && "stagger-1",
                  index === 1 && "stagger-2",
                  index === 2 && "stagger-3",
                  isPopular
                    ? "bg-charcoal text-white ring-2 ring-coral/30 shadow-xl sm:-translate-y-2"
                    : "bg-white/70 ring-1 ring-charcoal/[0.06] hover:shadow-md",
                )}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-coral text-white text-[10px] font-semibold tracking-widest uppercase rounded-full shadow-md">
                    Most Popular
                  </span>
                )}

                <h3 className={cn(
                  "font-body font-semibold text-sm tracking-wide uppercase",
                  isPopular ? "text-white/70" : "text-warm-gray",
                )}>
                  {tier.name}
                </h3>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className={cn(
                    "font-display text-4xl font-medium",
                    isPopular ? "text-white" : "text-charcoal",
                  )}>
                    {tier.priceDisplay}
                  </span>
                  <span className={cn(
                    "text-sm",
                    isPopular ? "text-white/50" : "text-warm-gray",
                  )}>
                    one-time
                  </span>
                </div>

                <p className={cn(
                  "mt-2 text-sm leading-relaxed",
                  isPopular ? "text-white/60" : "text-warm-gray",
                )}>
                  {tier.description}
                </p>

                <ul className="mt-5 space-y-2.5 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className={cn(
                        "w-4 h-4 mt-0.5 flex-shrink-0",
                        isPopular ? "text-coral" : "text-coral/70",
                      )} strokeWidth={2} />
                      <span className={cn(
                        "text-sm leading-snug",
                        isPopular ? "text-white/80" : "text-charcoal-soft",
                      )}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-warm-gray/60 mt-8">
          No subscriptions. No hidden fees. Secure checkout via Stripe.
        </p>
      </div>
    </section>
  );
}
