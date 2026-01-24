import { cn } from "@/lib/utils";

interface TrustSignalsProps {
  id?: string;
  className?: string;
}

/**
 * TrustSignals Component
 * Displays privacy and security messaging to build user confidence.
 *
 * Features:
 * - Three trust badges (auto-delete, secure, private)
 * - Warm, reassuring copy (not legal jargon)
 * - Privacy policy link
 * - Accessible with role="region" and aria-label
 * - Responsive: 1 column mobile, 3 columns tablet+
 *
 * @see Story 2.4 - Trust Signals Section
 */
export function TrustSignals({ id, className }: TrustSignalsProps) {
  const trustItems = [
    {
      icon: "shield",
      title: "Secure checkout",
      description: "Payments are handled by Stripe",
    },
    {
      icon: "eye-off",
      title: "Private by default",
      description: "Your images are never shared",
    },
    {
      icon: "clock-trash",
      title: "Auto-deleted",
      description: "Deleted after 30 days (or anytime)",
    },
  ];

  return (
    <section
      id={id}
      role="region"
      aria-label="Trust and privacy information"
      className={cn("py-12", className)}
    >
      <h2 className="font-display text-2xl text-charcoal text-center mb-3">Trusted & private</h2>
      <p className="text-center text-warm-gray max-w-md mx-auto">
        Secure checkout, private processing, and automatic deletion.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
        {trustItems.map((item) => (
          <TrustBadge
            key={item.title}
            icon={item.icon}
            title={item.title}
            description={item.description}
          />
        ))}
      </div>

      <p className="text-center mt-8 text-warm-gray">
        <a
          href="/privacy"
          className={cn(
            "text-coral hover:underline",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2",
            "rounded px-2 py-2 inline-block min-h-[48px] leading-[32px]",
          )}
        >
          Read our privacy policy
        </a>
      </p>
    </section>
  );
}

interface TrustBadgeProps {
  icon: string;
  title: string;
  description: string;
}

/**
 * TrustBadge Component
 * Displays a single trust indicator with icon, title, and description.
 */
function TrustBadge({ icon, title, description }: TrustBadgeProps) {
  return (
    <div className="flex flex-col items-center text-center p-4">
      {/* Icon container - decorative, icons have aria-hidden */}
      <div className="w-12 h-12 rounded-full bg-coral-light flex items-center justify-center mb-3">
        <TrustIcon name={icon} />
      </div>

      <h3 className="font-body font-semibold text-charcoal mb-1">{title}</h3>
      <p className="text-sm text-warm-gray">{description}</p>
    </div>
  );
}

interface TrustIconProps {
  name: string;
  className?: string;
}

/**
 * TrustIcon Component
 * Renders inline SVG icons for trust badges.
 * Using inline SVGs for minimal bundle impact.
 */
function TrustIcon({ name, className }: TrustIconProps) {
  const iconClass = cn("w-6 h-6 text-coral", className);

  switch (name) {
    case "clock-trash":
      // Clock with trash concept - simplified timer/delete icon
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "shield":
      // Shield/lock icon for security
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      );
    case "eye-off":
      // Eye with line through for privacy
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
      );
    default:
      return null;
  }
}
