import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface SiteFooterProps {
  className?: string;
}

export function SiteFooter({ className }: SiteFooterProps) {
  return (
    <footer
      className={cn(
        "py-8 mt-16 border-t border-charcoal/10",
        "text-center",
        className,
      )}
    >
      <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4 text-sm">
        <Link
          to="/how-it-works"
          className="text-warm-gray hover:text-coral transition-colors"
        >
          How It Works
        </Link>
        <Link
          to="/pricing"
          className="text-warm-gray hover:text-coral transition-colors"
        >
          Pricing
        </Link>
        <Link
          to="/faq"
          className="text-warm-gray hover:text-coral transition-colors"
        >
          FAQ
        </Link>
        <Link
          to="/privacy"
          className="text-warm-gray hover:text-coral transition-colors"
        >
          Privacy
        </Link>
      </nav>
      <p className="text-warm-gray text-sm">
        &copy; {new Date().getFullYear()} BabyPeek. Made with love for expecting parents.
      </p>
    </footer>
  );
}
