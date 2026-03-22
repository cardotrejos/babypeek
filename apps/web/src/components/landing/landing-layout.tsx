import type React from "react";
import { cn } from "@/lib/utils";
import { LandingHeader } from "./landing-header";

interface LandingLayoutProps {
  children: React.ReactNode;
  className?: string;
  onCtaClick?: () => void;
}

export function LandingLayout({
  children,
  className,
  onCtaClick,
}: LandingLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-cream relative grain-overlay", className)}>
      <LandingHeader onCtaClick={onCtaClick} />

      <main id="main-content" className="relative">
        {children}
      </main>
    </div>
  );
}
