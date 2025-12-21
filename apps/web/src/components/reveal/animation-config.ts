/**
 * Reveal Animation Configuration
 * Story 5.3: Blur-to-Sharp Reveal Animation
 *
 * AC-1: Image starts with blur(20px) and opacity 0.7
 * AC-2: Blur clears to 0 over 2 seconds with easeOutCubic
 * AC-3: Subtle zoom settles from 1.05 to 1.0 over 2.5 seconds
 * AC-4: UI buttons appear after 3.5 second delay
 */

// CSS easeOutCubic: cubic-bezier(0.33, 1, 0.68, 1)
export const EASE_OUT_CUBIC = "cubic-bezier(0.33, 1, 0.68, 1)"

export const revealAnimation = {
  blur: {
    from: 20,
    to: 0,
    duration: 2000,
    easing: EASE_OUT_CUBIC,
  },
  scale: {
    from: 1.05,
    to: 1,
    duration: 2500,
    easing: EASE_OUT_CUBIC,
  },
  opacity: {
    from: 0.7,
    to: 1,
    duration: 2000,
    easing: "ease-out",
  },
  // UI delay before showing buttons (AC-4)
  uiDelay: 3500,
  // Small delay to ensure DOM is ready before starting animation
  startDelay: 50,
} as const

export type RevealAnimationConfig = typeof revealAnimation
