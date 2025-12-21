import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { revealAnimation } from "./animation-config"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface RevealAnimationProps {
  imageUrl: string
  alt?: string
  onRevealComplete?: () => void
  /** External control for UI visibility (for testing/parent control) */
  showUI?: boolean
  className?: string
  children?: React.ReactNode
}

/**
 * RevealAnimation Component
 * Story 5.3: Blur-to-Sharp Reveal Animation
 * Story 5.4: Reduced Motion Support
 *
 * Creates a dramatic reveal effect for the baby portrait:
 * - AC-1: Starts with blur(20px), opacity 0.7, scale 1.05
 * - AC-2: Blur clears to 0 over 2s with easeOutCubic
 * - AC-3: Zoom settles from 1.05 to 1.0 over 2.5s
 * - AC-4: UI appears after 3.5s delay
 * - AC-5: Targets 60fps performance
 * - AC-7: Uses CSS transforms for GPU acceleration
 * - 5.4 AC-1: Respects prefers-reduced-motion setting
 */
export function RevealAnimation({
  imageUrl,
  alt = "Your baby's portrait",
  onRevealComplete,
  showUI: externalShowUI,
  className,
  children,
}: RevealAnimationProps) {
  const [isRevealing, setIsRevealing] = useState(false)
  const [internalShowUI, setInternalShowUI] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Use external showUI if provided, otherwise use internal state
  const showUI = externalShowUI ?? internalShowUI

  // Start animation on mount with small delay for DOM readiness
  useEffect(() => {
    // If user prefers reduced motion, skip animation and show UI immediately
    if (prefersReducedMotion) {
      setIsRevealing(true)
      if (externalShowUI === undefined) {
        setInternalShowUI(true)
        onRevealComplete?.()
      }
      return
    }

    const startTimeout = setTimeout(() => {
      setIsRevealing(true)
    }, revealAnimation.startDelay)

    // Show UI after full reveal delay (only if not externally controlled)
    let uiTimeout: NodeJS.Timeout | undefined
    if (externalShowUI === undefined) {
      uiTimeout = setTimeout(() => {
        setInternalShowUI(true)
        onRevealComplete?.()
      }, revealAnimation.uiDelay)
    }

    return () => {
      clearTimeout(startTimeout)
      if (uiTimeout) clearTimeout(uiTimeout)
    }
  }, [onRevealComplete, externalShowUI, prefersReducedMotion])

  // Call onRevealComplete when externally controlled showUI becomes true
  useEffect(() => {
    if (externalShowUI === true && onRevealComplete) {
      onRevealComplete()
    }
  }, [externalShowUI, onRevealComplete])

  // Animation styles computed based on state
  // Skip transitions for users who prefer reduced motion
  const animationStyles = isRevealing
    ? {
        filter: `blur(${revealAnimation.blur.to}px)`,
        transform: `scale(${revealAnimation.scale.to})`,
        opacity: revealAnimation.opacity.to,
        ...(prefersReducedMotion
          ? {} // No transition for reduced motion
          : {
              transitionDuration: `${revealAnimation.blur.duration}ms, ${revealAnimation.scale.duration}ms, ${revealAnimation.opacity.duration}ms`,
              transitionTimingFunction: `${revealAnimation.blur.easing}, ${revealAnimation.scale.easing}, ${revealAnimation.opacity.easing}`,
              transitionProperty: "filter, transform, opacity",
            }),
      }
    : {
        filter: `blur(${revealAnimation.blur.from}px)`,
        transform: `scale(${revealAnimation.scale.from})`,
        opacity: revealAnimation.opacity.from,
      }

  return (
    <div
      data-testid="reveal-container"
      className={cn("relative w-full max-w-md mx-auto", className)}
    >
      {/* Dimmed background overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/20 -z-10",
          // Skip transition for reduced motion (5.4)
          !prefersReducedMotion && "transition-opacity duration-300",
          isRevealing ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />

      {/* Image with reveal animation */}
      <div className="relative">
        <img
          src={imageUrl}
          alt={alt}
          className={cn(
            "w-full rounded-2xl shadow-2xl",
            // GPU acceleration via will-change (AC-7)
            "will-change-[transform,filter,opacity]",
            // State classes for testing
            isRevealing ? "reveal-active" : "reveal-initial"
          )}
          style={animationStyles}
        />
      </div>

      {/* UI Overlay slot - appears after delay (AC-4) */}
      {showUI && (
        <div
          data-testid="reveal-ui"
          className={cn(
            "absolute inset-0 flex items-end justify-center p-4 pointer-events-none",
            // Skip fade animation for reduced motion (5.4)
            !prefersReducedMotion && "animate-fade-in"
          )}
        >
          <div className="w-full pointer-events-auto">{children}</div>
        </div>
      )}
    </div>
  )
}
