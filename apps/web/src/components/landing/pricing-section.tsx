import { cn } from "@/lib/utils";
import { PRICE_DISPLAY } from "@/lib/pricing";

interface PricingSectionProps {
  id?: string;
  className?: string;
}

export function PricingSection({ id, className }: PricingSectionProps) {
  return (
    <section id={id} className={cn("py-12", className)}>
      <h2 className="font-display text-2xl text-charcoal text-center mb-3">Simple pricing</h2>
      <p className="text-center text-warm-gray max-w-md mx-auto">
        Start with a free preview. Upgrade only if you love the result.
      </p>

      <div className="mt-8 rounded-2xl border border-charcoal/10 bg-white/70 backdrop-blur-sm p-6 shadow-sm">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h3 className="font-body font-semibold text-charcoal">HD baby portrait</h3>
            <p className="text-sm text-warm-gray mt-1">One-time purchase. No subscription.</p>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl text-charcoal">{PRICE_DISPLAY}</div>
            <div className="text-xs text-warm-gray mt-1">After free preview</div>
          </div>
        </div>

        <ul className="mt-5 space-y-2 text-sm text-warm-gray">
          <li>Free watermarked preview before you pay</li>
          <li>HD download + shareable link</li>
          <li>Secure checkout via Stripe</li>
          <li>Private by default (auto-deletes after 30 days)</li>
        </ul>
      </div>
    </section>
  );
}
