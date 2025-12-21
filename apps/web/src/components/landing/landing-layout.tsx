import type React from "react"
import { cn } from "@/lib/utils"
import { LandingHeader } from "./landing-header"
import { Button } from "@/components/ui/button"

interface LandingLayoutProps {
  children: React.ReactNode
  className?: string
  showCta?: boolean
  ctaText?: string
  onCtaClick?: () => void
}

export function LandingLayout({
  children,
  className,
  showCta = true,
  ctaText = "Try it free",
  onCtaClick,
}: LandingLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-cream relative", className)}>
      <LandingHeader />
      
      <main
        id="main-content"
        className={cn(
          "px-4 sm:px-6",
          "sm:max-w-[560px] sm:mx-auto",
          "pt-20", // Space for absolute header
          showCta ? "pb-28" : "pb-8" // Space for fixed CTA when shown
        )}
      >
        {children}
      </main>

      {/* Fixed bottom CTA with iOS safe area handling */}
      {showCta && (
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-20",
            "p-4 safe-bottom",
            "bg-gradient-to-t from-cream via-cream to-transparent"
          )}
        >
          <div className="sm:max-w-[560px] sm:mx-auto">
            <Button
              onClick={onCtaClick}
              aria-label={ctaText}
              className={cn(
                "w-full touch-target-lg",
                "text-lg font-semibold",
                "bg-coral hover:bg-coral-hover text-white",
                "shadow-lg hover:shadow-xl",
                "transition-all duration-200"
              )}
            >
              {ctaText}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
