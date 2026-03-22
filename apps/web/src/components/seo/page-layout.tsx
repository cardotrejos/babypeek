import { Link } from "@tanstack/react-router";
import { ReactNode } from "react";

interface SeoPageLayoutProps {
  breadcrumbLabel: string;
  children: ReactNode;
}

export function SeoPageLayout({ breadcrumbLabel, children }: SeoPageLayoutProps) {
  return (
    <div className="min-h-screen bg-cream">
      {/* Minimal header */}
      <header className="p-4 sm:p-6 safe-top">
        <div className="sm:max-w-[560px] sm:mx-auto flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="BabyPeek" className="h-8 w-8" />
            <span className="font-display text-xl text-charcoal font-semibold">BabyPeek</span>
          </Link>
        </div>
      </header>

      <main id="main-content" className="px-4 sm:px-6 sm:max-w-[560px] sm:mx-auto pt-8 pb-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm-gray mb-6">
          <Link to="/" className="hover:text-coral transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-charcoal">{breadcrumbLabel}</span>
        </nav>

        {children}
      </main>
    </div>
  );
}
