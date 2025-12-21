# Story 5.3: Blur-to-Sharp Reveal Animation

Status: ready-for-dev

## Story

As a **user**,
I want **a dramatic reveal of my baby's portrait**,
so that **the moment feels magical and emotional**.

## Acceptance Criteria

1. **AC-1:** Given processing is complete, when the reveal begins, then the image starts with blur(20px) and opacity 0.7
2. **AC-2:** Blur clears to 0 over 2 seconds with easeOutCubic
3. **AC-3:** Subtle zoom settles from 1.05 to 1.0 over 2.5 seconds
4. **AC-4:** UI buttons appear after 3.5 second delay
5. **AC-5:** Animation runs at 60fps (NFR-1.5)
6. **AC-6:** Image is preloaded during processing to avoid delay
7. **AC-7:** Animation uses CSS transforms for GPU acceleration

## Tasks / Subtasks

- [ ] **Task 1: Create RevealAnimation component** (AC: 1, 2, 3, 7)
  - [ ] Create `apps/web/src/components/reveal/RevealAnimation.tsx`
  - [ ] Start with blur(20px), opacity 0.7, scale 1.05
  - [ ] Animate to blur(0), opacity 1, scale 1.0
  - [ ] Use CSS transitions with transform (GPU accelerated)
  - [ ] Timing: blur 2s, zoom 2.5s, easeOutCubic

- [ ] **Task 2: Implement animation timing** (AC: 2, 3, 4)
  - [ ] Use CSS keyframes or Framer Motion for sequencing
  - [ ] Blur transition: 0 → 2000ms
  - [ ] Zoom transition: 0 → 2500ms
  - [ ] UI delay: 3500ms before showing buttons
  - [ ] Use `useEffect` with timeouts or animation events

- [ ] **Task 3: Create reveal UI overlay** (AC: 4)
  - [ ] Create `apps/web/src/components/reveal/RevealUI.tsx`
  - [ ] Include "Get HD Version" CTA button
  - [ ] Include share buttons (preview)
  - [ ] Include "Download Preview" link
  - [ ] Fade in after 3.5s delay with opacity transition

- [ ] **Task 4: Implement image preloading** (AC: 6)
  - [ ] Create `apps/web/src/hooks/use-preload-image.ts`
  - [ ] Start preloading preview URL when processing reaches 80%+
  - [ ] Use `new Image()` to load into browser cache
  - [ ] Return loading state and loaded flag
  - [ ] Ensure reveal doesn't start until image is loaded

- [ ] **Task 5: Optimize for 60fps** (AC: 5, 7)
  - [ ] Use only transform and opacity (compositing-only properties)
  - [ ] Avoid layout-triggering properties during animation
  - [ ] Use `will-change: transform, opacity, filter` on animated element
  - [ ] Test with Chrome DevTools Performance panel
  - [ ] Target: No frames > 16.67ms

- [ ] **Task 6: Create reveal route/page** (AC: 1-7)
  - [ ] Create `apps/web/src/routes/result.$resultId.tsx`
  - [ ] Fetch result data (preview URL, upload info)
  - [ ] Show RevealAnimation with preloaded image
  - [ ] Navigate here from processing page on completion

- [ ] **Task 7: Add reveal analytics**
  - [ ] Track `reveal_started` when animation begins
  - [ ] Track `reveal_completed` when UI appears
  - [ ] Track `reveal_duration` (actual time)
  - [ ] Track `reveal_preload_time` (image load time)

- [ ] **Task 8: Write tests**
  - [ ] Unit test: Animation starts with correct initial state
  - [ ] Unit test: UI appears after delay
  - [ ] Unit test: Image preloading triggers at correct stage
  - [ ] Visual regression test: Animation sequence
  - [ ] Performance test: 60fps verification

## Dev Notes

### Architecture Compliance

- **Components:** Located in `apps/web/src/components/reveal/`
- **Pattern:** CSS animations for GPU acceleration, React state for sequencing
- **Styling:** Tailwind + custom CSS animations
- **Route:** `apps/web/src/routes/result.$resultId.tsx`

### Animation Specification (from UX)

```typescript
// apps/web/src/components/reveal/animation-config.ts
export const revealAnimation = {
  blur: { from: 20, to: 0, duration: 2000, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' },
  scale: { from: 1.05, to: 1, duration: 2500, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' },
  opacity: { from: 0.7, to: 1, duration: 2000, easing: 'ease-out' },
  uiDelay: 3500, // Wait before showing buttons
}

// CSS easeOutCubic: cubic-bezier(0.33, 1, 0.68, 1)
```

### RevealAnimation Component

```typescript
// apps/web/src/components/reveal/RevealAnimation.tsx
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface RevealAnimationProps {
  imageUrl: string
  alt?: string
  onRevealComplete?: () => void
}

export function RevealAnimation({ imageUrl, alt, onRevealComplete }: RevealAnimationProps) {
  const [isRevealing, setIsRevealing] = useState(false)
  const [showUI, setShowUI] = useState(false)
  
  // Start animation on mount
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const startTimeout = setTimeout(() => setIsRevealing(true), 50)
    
    // Show UI after full reveal
    const uiTimeout = setTimeout(() => {
      setShowUI(true)
      onRevealComplete?.()
    }, 3500)
    
    return () => {
      clearTimeout(startTimeout)
      clearTimeout(uiTimeout)
    }
  }, [onRevealComplete])
  
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Dimmed background */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 transition-opacity duration-300",
          isRevealing ? "opacity-100" : "opacity-0"
        )} 
      />
      
      {/* Image with reveal animation */}
      <div className="relative">
        <img
          src={imageUrl}
          alt={alt ?? "Your baby's portrait"}
          className={cn(
            "w-full rounded-2xl shadow-2xl transition-all will-change-[transform,filter,opacity]",
            isRevealing ? "reveal-active" : "reveal-initial"
          )}
          style={{
            filter: isRevealing ? 'blur(0px)' : 'blur(20px)',
            transform: isRevealing ? 'scale(1)' : 'scale(1.05)',
            opacity: isRevealing ? 1 : 0.7,
            transitionDuration: '2s, 2.5s, 2s', // blur, scale, opacity
            transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)',
            transitionProperty: 'filter, transform, opacity',
          }}
        />
      </div>
      
      {/* UI Overlay - appears after delay */}
      {showUI && (
        <div className="absolute inset-0 flex items-end justify-center p-4 animate-fade-in">
          <div className="w-full">
            <RevealUI />
          </div>
        </div>
      )}
    </div>
  )
}
```

### CSS Animation (Alternative Approach)

```css
/* apps/web/src/styles/reveal.css */
@keyframes reveal-blur {
  from { filter: blur(20px); }
  to { filter: blur(0px); }
}

@keyframes reveal-zoom {
  from { transform: scale(1.05); }
  to { transform: scale(1); }
}

@keyframes reveal-opacity {
  from { opacity: 0.7; }
  to { opacity: 1; }
}

.reveal-animation {
  animation: 
    reveal-blur 2s cubic-bezier(0.33, 1, 0.68, 1) forwards,
    reveal-zoom 2.5s cubic-bezier(0.33, 1, 0.68, 1) forwards,
    reveal-opacity 2s ease-out forwards;
  will-change: transform, filter, opacity;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out forwards;
}
```

### Image Preloading Hook

```typescript
// apps/web/src/hooks/use-preload-image.ts
import { useState, useEffect } from 'react'

export function usePreloadImage(url: string | null) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!url) {
      setIsLoaded(false)
      return
    }

    setIsLoading(true)
    
    const img = new Image()
    
    img.onload = () => {
      setIsLoaded(true)
      setIsLoading(false)
    }
    
    img.onerror = () => {
      setError(new Error('Failed to preload image'))
      setIsLoading(false)
    }
    
    img.src = url
    
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [url])

  return { isLoaded, isLoading, error }
}
```

### Result Route

```typescript
// apps/web/src/routes/result.$resultId.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { usePreloadImage } from '@/hooks/use-preload-image'
import { RevealAnimation } from '@/components/reveal/RevealAnimation'
import { getSession } from '@/lib/session'

export const Route = createFileRoute('/result/$resultId')({
  component: ResultPage,
})

function ResultPage() {
  const { resultId } = Route.useParams()
  
  // Get session from the upload that created this result
  const uploadId = localStorage.getItem(`3d-ultra-result-upload-${resultId}`)
  const sessionToken = uploadId ? getSession(uploadId) : null
  
  // Fetch result data
  const { data: result, isLoading } = useQuery({
    queryKey: ['result', resultId],
    queryFn: async () => {
      const response = await fetch(`/api/result/${resultId}`, {
        headers: sessionToken ? { 'X-Session-Token': sessionToken } : {},
      })
      if (!response.ok) throw new Error('Failed to fetch result')
      return response.json()
    },
  })
  
  // Preload the image
  const { isLoaded: imageLoaded } = usePreloadImage(result?.previewUrl)
  
  if (isLoading || !imageLoaded) {
    return <LoadingScreen />
  }
  
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <RevealAnimation 
        imageUrl={result.previewUrl}
        alt="Your AI-generated baby portrait"
        onRevealComplete={() => {
          posthog.capture('reveal_completed', { result_id: resultId })
        }}
      />
    </div>
  )
}
```

### RevealUI Component

```typescript
// apps/web/src/components/reveal/RevealUI.tsx
import { Button } from '@/components/ui/button'

interface RevealUIProps {
  resultId: string
  onPurchase: () => void
  onShare: () => void
  onDownloadPreview: () => void
}

export function RevealUI({ resultId, onPurchase, onShare, onDownloadPreview }: RevealUIProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl space-y-4">
      {/* Primary CTA */}
      <Button 
        size="lg" 
        className="w-full bg-coral hover:bg-coral/90 text-white font-body text-lg py-6"
        onClick={onPurchase}
      >
        Get HD Version - $9.99
      </Button>
      
      {/* Secondary actions */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={onShare}
        >
          Share
        </Button>
        <Button 
          variant="ghost" 
          className="flex-1 text-warm-gray"
          onClick={onDownloadPreview}
        >
          Download Preview
        </Button>
      </div>
    </div>
  )
}
```

### Performance Optimization

```typescript
// GPU-accelerated properties only
const gpuAcceleratedStyles = {
  transform: 'scale(...)',  // ✅ Composited
  opacity: '...',           // ✅ Composited  
  filter: 'blur(...)',      // ✅ Composited (in modern browsers)
}

// Avoid during animation
const avoidDuringAnimation = {
  width: '...',    // ❌ Triggers layout
  height: '...',   // ❌ Triggers layout
  margin: '...',   // ❌ Triggers layout
  padding: '...',  // ❌ Triggers layout
}

// Performance checklist
// 1. Use will-change: transform, filter, opacity
// 2. Test with Chrome DevTools → Performance
// 3. Target: All frames < 16.67ms (60fps)
// 4. Disable other animations during reveal
```

### Emotional Design (from UX Spec)

**Reveal Sequence:**
1. Screen dims slightly (0.3s)
2. Image appears blurred (instant)
3. Blur slowly clears (2s ease-out)
4. Subtle zoom settle (0.5s)
5. Pause for emotional beat (1.5s)
6. UI fades in (0.5s)

**Key Principles:**
- Peak-End Rule: Reveal is the peak moment
- Let the image speak - minimal UI during reveal
- Surprise creates memory - exceed expectations

### File Structure

```
apps/web/src/components/reveal/
├── RevealAnimation.tsx       <- NEW: Core animation component
├── RevealUI.tsx              <- NEW: Post-reveal UI overlay
├── animation-config.ts       <- NEW: Animation timing constants
└── index.ts                  <- NEW: Barrel export

apps/web/src/hooks/
├── use-preload-image.ts      <- NEW: Image preloading

apps/web/src/routes/
├── result.$resultId.tsx      <- NEW: Result/reveal page

apps/web/src/styles/
├── reveal.css                <- NEW: CSS animations (if not using Tailwind)
```

### Dependencies

- **Story 5.2 (Watermark):** ✅ Preview image available
- **Story 4.5 (Status Updates):** ✅ Know when complete to navigate
- **TanStack Query:** Fetch result data
- **Framer Motion (optional):** For complex animation sequencing

### What This Enables

- Story 5.5: Before/after slider shown after reveal
- Story 5.6: Download preview button in RevealUI
- Story 6.1: Purchase flow triggered from RevealUI

### References

- [Source: _bmad-output/epics.md#Story 5.3] - Acceptance criteria
- [Source: _bmad-output/ux-design-specification.md#Reveal Animation] - Animation sequence
- [Source: _bmad-output/ux-design-specification.md#Core Action: THE REVEAL] - Emotional design
- [Source: _bmad-output/prd.md#FR-3.4] - Blur-to-sharp reveal requirement

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
