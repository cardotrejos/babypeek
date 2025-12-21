# Story 5.4: Reduced Motion Support

Status: ready-for-dev

## Story

As a **user with motion sensitivity**,
I want **the reveal to respect my accessibility settings**,
so that **I can still enjoy the product safely**.

## Acceptance Criteria

1. **AC-1:** Given my device has prefers-reduced-motion enabled, when the reveal happens, then the image appears immediately without blur animation
2. **AC-2:** All transitions are reduced to 0.01ms
3. **AC-3:** The experience is still emotionally satisfying (fade in allowed)
4. **AC-4:** UI buttons appear immediately

## Tasks / Subtasks

- [ ] **Task 1: Create useReducedMotion hook** (AC: 1)
  - [ ] Create `apps/web/src/hooks/use-reduced-motion.ts`
  - [ ] Use `window.matchMedia('(prefers-reduced-motion: reduce)')`
  - [ ] Listen for changes (user can toggle setting)
  - [ ] Return boolean `prefersReducedMotion`

- [ ] **Task 2: Update RevealAnimation for reduced motion** (AC: 1, 2, 4)
  - [ ] Import useReducedMotion hook
  - [ ] When reduced motion: skip blur/zoom animations
  - [ ] Show image immediately at final state (no blur, scale 1, opacity 1)
  - [ ] Show UI immediately (no delay)
  - [ ] Keep subtle fade-in (opacity only, short duration)

- [ ] **Task 3: Add global reduced motion CSS** (AC: 2)
  - [ ] Add to `apps/web/src/styles/globals.css`
  - [ ] Use `@media (prefers-reduced-motion: reduce)` query
  - [ ] Set all animation-duration and transition-duration to 0.01ms
  - [ ] This catches any animations we might miss

- [ ] **Task 4: Update ProcessingScreen for reduced motion** (AC: 2)
  - [ ] Disable animated spinner (show static or slow-pulse instead)
  - [ ] Disable baby facts rotation animation (show static fact)
  - [ ] Keep progress bar (it shows real progress, not decorative)
  - [ ] Reduce skeleton shimmer animation

- [ ] **Task 5: Add reduced motion fallback styles** (AC: 3)
  - [ ] Create `apps/web/src/styles/reduced-motion.css`
  - [ ] Define safe alternatives for each animation
  - [ ] Ensure visual hierarchy remains clear without animation
  - [ ] Test that experience is still engaging

- [ ] **Task 6: Write tests**
  - [ ] Unit test: useReducedMotion returns true when media query matches
  - [ ] Unit test: RevealAnimation shows image immediately when reduced motion
  - [ ] Unit test: UI buttons appear immediately when reduced motion
  - [ ] Manual test: Toggle macOS/Windows accessibility settings

## Dev Notes

### Architecture Compliance

- **Hook:** `apps/web/src/hooks/use-reduced-motion.ts`
- **CSS:** Global media query fallback
- **Pattern:** Conditional animation based on user preference

### useReducedMotion Hook

```typescript
// apps/web/src/hooks/use-reduced-motion.ts
import { useState, useEffect } from 'react'

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if running in browser
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches)

    // Listen for changes
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}
```

### Updated RevealAnimation

```typescript
// apps/web/src/components/reveal/RevealAnimation.tsx (update)
import { useReducedMotion } from '@/hooks/use-reduced-motion'

export function RevealAnimation({ imageUrl, alt, onRevealComplete }: RevealAnimationProps) {
  const prefersReducedMotion = useReducedMotion()
  const [isRevealing, setIsRevealing] = useState(false)
  const [showUI, setShowUI] = useState(false)
  
  useEffect(() => {
    if (prefersReducedMotion) {
      // Immediately show everything
      setIsRevealing(true)
      setShowUI(true)
      onRevealComplete?.()
      return
    }
    
    // Normal animation timing
    const startTimeout = setTimeout(() => setIsRevealing(true), 50)
    const uiTimeout = setTimeout(() => {
      setShowUI(true)
      onRevealComplete?.()
    }, 3500)
    
    return () => {
      clearTimeout(startTimeout)
      clearTimeout(uiTimeout)
    }
  }, [prefersReducedMotion, onRevealComplete])
  
  return (
    <div className="relative w-full max-w-md mx-auto">
      <img
        src={imageUrl}
        alt={alt ?? "Your baby's portrait"}
        className="w-full rounded-2xl shadow-2xl"
        style={prefersReducedMotion ? {
          // Immediate final state
          filter: 'blur(0px)',
          transform: 'scale(1)',
          opacity: 1,
        } : {
          // Animated state
          filter: isRevealing ? 'blur(0px)' : 'blur(20px)',
          transform: isRevealing ? 'scale(1)' : 'scale(1.05)',
          opacity: isRevealing ? 1 : 0.7,
          transitionDuration: '2s, 2.5s, 2s',
          transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
          transitionProperty: 'filter, transform, opacity',
          willChange: 'transform, filter, opacity',
        }}
      />
      
      {/* UI - immediate in reduced motion, delayed otherwise */}
      {showUI && (
        <div className={cn(
          "absolute inset-0 flex items-end justify-center p-4",
          !prefersReducedMotion && "animate-fade-in"
        )}>
          <RevealUI />
        </div>
      )}
    </div>
  )
}
```

### Global Reduced Motion CSS

```css
/* apps/web/src/styles/globals.css (add) */

/* Respect user's motion preferences globally */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  /* Allow subtle opacity transitions (they don't cause motion sickness) */
  .safe-transition {
    transition-duration: 150ms !important;
    transition-property: opacity !important;
  }
}
```

### Updated ProcessingScreen

```typescript
// apps/web/src/components/processing/ProcessingScreen.tsx (update)
import { useReducedMotion } from '@/hooks/use-reduced-motion'

export function ProcessingScreen({ stage, progress }: ProcessingScreenProps) {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <div className="...">
      {/* Spinner - static in reduced motion */}
      {prefersReducedMotion ? (
        <div className="size-16 rounded-full border-4 border-coral border-t-transparent" />
      ) : (
        <div className="size-16 animate-spin rounded-full border-4 border-coral border-t-transparent" />
      )}
      
      {/* Progress bar - keeps animation (shows real progress) */}
      <div className="w-full bg-charcoal/10 rounded-full h-3">
        <div 
          className={cn(
            "bg-coral h-full rounded-full",
            !prefersReducedMotion && "transition-all duration-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Baby facts - static in reduced motion */}
      <BabyFacts static={prefersReducedMotion} />
    </div>
  )
}
```

### Updated BabyFacts

```typescript
// apps/web/src/components/processing/BabyFacts.tsx (update)
interface BabyFactsProps {
  static?: boolean
}

export function BabyFacts({ static: isStatic }: BabyFactsProps) {
  const [currentFact, setCurrentFact] = useState(0)
  
  useEffect(() => {
    if (isStatic) return // Don't rotate when static
    
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % babyFacts.length)
    }, 10000)
    
    return () => clearInterval(interval)
  }, [isStatic])
  
  return (
    <div className={cn(
      "mt-8 p-4 bg-rose/30 rounded-xl max-w-md text-center",
      !isStatic && "animate-fade-in"
    )}>
      <p className="text-sm text-warm-gray font-body">
        💡 Did you know?
      </p>
      <p className="text-charcoal font-body mt-2">
        {babyFacts[currentFact]}
      </p>
    </div>
  )
}
```

### Tailwind Config for Reduced Motion

```typescript
// tailwind.config.js (update)
module.exports = {
  theme: {
    extend: {
      // ...existing config
    },
  },
  plugins: [],
  // Enable motion-safe and motion-reduce variants
  variants: {
    extend: {
      animation: ['motion-safe', 'motion-reduce'],
      transition: ['motion-safe', 'motion-reduce'],
    },
  },
}

// Usage in components:
// motion-safe:animate-spin - only animate when motion is OK
// motion-reduce:animate-none - disable animation for reduced motion
```

### Testing Reduced Motion

**macOS:**
System Preferences → Accessibility → Display → Reduce motion

**Windows:**
Settings → Ease of Access → Display → Show animations in Windows (off)

**iOS:**
Settings → Accessibility → Motion → Reduce Motion

**Chrome DevTools:**
Rendering tab → Emulate CSS media feature → prefers-reduced-motion: reduce

### Accessibility Considerations (WCAG 2.1)

- **WCAG 2.3.1 (Level A):** No content flashes more than 3 times per second
- **WCAG 2.3.3 (Level AAA):** Animation triggered by interaction can be disabled
- Our approach: Respect `prefers-reduced-motion` system setting

### Safe vs Unsafe Animations

**Safe (keep even with reduced motion):**
- Opacity fades (don't cause vestibular issues)
- Progress bar movement (shows real state)
- Color changes

**Unsafe (disable with reduced motion):**
- Spinning/rotating
- Zooming/scaling
- Blur transitions
- Parallax effects
- Auto-playing carousels

### File Structure

```
apps/web/src/hooks/
├── use-reduced-motion.ts     <- NEW: Motion preference hook
├── use-reduced-motion.test.ts <- NEW: Tests

apps/web/src/styles/
├── globals.css               <- UPDATE: Add reduced motion rules
├── reduced-motion.css        <- NEW: Detailed fallbacks (optional)

apps/web/src/components/reveal/
├── RevealAnimation.tsx       <- UPDATE: Check reduced motion

apps/web/src/components/processing/
├── ProcessingScreen.tsx      <- UPDATE: Static alternatives
├── BabyFacts.tsx             <- UPDATE: Static prop
```

### Dependencies

- **Story 5.3 (Reveal Animation):** Must exist to add reduced motion variant
- **Story 5.1 (Processing Screen):** Apply to processing animations

### References

- [Source: _bmad-output/epics.md#Story 5.4] - Acceptance criteria
- [Source: _bmad-output/ux-design-specification.md#Responsive Design & Accessibility] - Reduced motion CSS
- [Source: _bmad-output/prd.md#NFR-5: Accessibility] - WCAG 2.1 Level AA requirement

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
