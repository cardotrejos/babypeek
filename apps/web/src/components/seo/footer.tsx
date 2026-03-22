import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface SiteFooterProps {
  className?: string;
}

const footerLinks = [
  { to: "/how-it-works" as const, label: "How It Works" },
  { to: "/pricing" as const, label: "Pricing" },
  { to: "/faq" as const, label: "FAQ" },
  { to: "/for-clinics" as const, label: "For Clinics" },
  { to: "/blog" as const, label: "Blog" },
];

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer className={cn("relative", className)}>
      {/* Warm gradient divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-charcoal/10 to-transparent" />

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <div className="flex flex-col items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="BabyPeek" className="h-6 w-6 opacity-60" />
            <span className="font-display text-lg text-charcoal/40 font-medium tracking-wide">
              BabyPeek
            </span>
          </div>

          {/* Nav */}
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "text-sm text-warm-gray/70 hover:text-coral",
                  "transition-colors duration-300",
                  "underline-offset-4 hover:underline decoration-coral/30",
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/privacy"
              className={cn(
                "text-sm text-warm-gray/70 hover:text-coral",
                "transition-colors duration-300",
                "underline-offset-4 hover:underline decoration-coral/30",
              )}
            >
              Privacy
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-warm-gray/50 text-xs tracking-wide">
            &copy; {new Date().getFullYear()} BabyPeek. Made with love for expecting parents.
          </p>
        </div>
      </div>
    </footer>
  );
}
