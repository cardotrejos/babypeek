import { cn } from "@/lib/utils";
import { ShieldCheck, EyeOff, Clock } from "lucide-react";

interface TrustSignalsProps {
  id?: string;
  className?: string;
}

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Secure checkout",
    description: "Encrypted payments via Stripe",
  },
  {
    icon: EyeOff,
    title: "Private by default",
    description: "Your images are never shared",
  },
  {
    icon: Clock,
    title: "Auto-deleted",
    description: "Removed after 30 days (or anytime)",
  },
];

export function TrustSignals({ id, className }: TrustSignalsProps) {
  return (
    <section
      id={id}
      role="region"
      aria-label="Trust and privacy information"
      className={cn("py-20 sm:py-28", className)}
    >
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <p className="text-center text-xs font-medium tracking-[0.2em] uppercase text-coral mb-4">
          Your privacy matters
        </p>
        <h2 className="font-display text-3xl sm:text-4xl text-charcoal text-center mb-4 font-medium">
          Trusted & private
        </h2>
        <p className="text-center text-warm-gray max-w-lg mx-auto text-base leading-relaxed">
          We handle your ultrasound images with the same care you'd expect from your doctor's office.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
          {trustItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={cn(
                  "relative flex flex-col items-center text-center p-6 sm:p-8",
                  "rounded-2xl bg-white/60 backdrop-blur-sm",
                  "ring-1 ring-charcoal/[0.04]",
                  "hover:bg-white/80 hover:shadow-sm transition-all duration-500",
                  "animate-fade-up",
                  index === 0 && "stagger-1",
                  index === 1 && "stagger-2",
                  index === 2 && "stagger-3",
                )}
              >
                <div className="w-12 h-12 rounded-2xl bg-coral/8 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-coral" strokeWidth={1.5} />
                </div>
                <h3 className="font-body font-semibold text-charcoal mb-1.5">{item.title}</h3>
                <p className="text-sm text-warm-gray leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>

        <p className="text-center mt-10">
          <a
            href="/privacy"
            className={cn(
              "inline-flex items-center gap-1.5",
              "text-sm text-warm-gray hover:text-coral transition-colors duration-300",
              "underline underline-offset-4 decoration-warm-gray/30 hover:decoration-coral/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2",
              "rounded px-2 py-2",
            )}
          >
            Read our privacy policy
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </p>
      </div>
    </section>
  );
}
