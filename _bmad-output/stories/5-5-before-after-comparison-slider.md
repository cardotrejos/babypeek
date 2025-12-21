# Story 5.5: Before/After Comparison Slider

Status: review

## Story

As a **user**,
I want **to compare my ultrasound with the result**,
so that **I can appreciate the transformation**.

## Acceptance Criteria

1. **AC-1:** Given I'm viewing my result, when I interact with the comparison slider, then I can drag left/right to reveal original vs result (FR-3.5)
2. **AC-2:** The slider handle is touch-friendly (48px minimum)
3. **AC-3:** Keyboard users can control with arrow keys
4. **AC-4:** Both images are the same dimensions

## Tasks / Subtasks

- [x] **Task 1: Create BeforeAfterSlider component** (AC: 1, 4)
  - [x] Create `apps/web/src/components/reveal/BeforeAfterSlider.tsx`
  - [x] Accept `beforeImage` (original ultrasound) and `afterImage` (AI result)
  - [x] Use CSS clip-path or width to reveal/hide portions
  - [x] Ensure both images fill container equally

- [x] **Task 2: Implement drag interaction** (AC: 1, 2)
  - [x] Track pointer position during drag (mouse + touch)
  - [x] Convert position to percentage (0-100)
  - [x] Apply percentage to reveal position
  - [x] Handle touchstart, touchmove, touchend for mobile
  - [x] Handle mousedown, mousemove, mouseup for desktop

- [x] **Task 3: Create slider handle** (AC: 2)
  - [x] Minimum 48px touch target (NFR-5.5)
  - [x] Visual handle with drag indicator (vertical bar with arrows)
  - [x] Add shadow/glow for visibility against image
  - [x] Cursor: grab/grabbing states

- [x] **Task 4: Add keyboard support** (AC: 3)
  - [x] Make slider focusable (tabIndex={0})
  - [x] Arrow keys: move slider 5% per press
  - [x] Home/End: move to 0% / 100%
  - [x] Add aria-label for screen readers
  - [x] Visual focus indicator

- [x] **Task 5: Normalize image dimensions** (AC: 4)
  - [x] Use object-fit: cover for both images
  - [x] Container maintains aspect ratio (e.g., 4:3)
  - [x] Both images resize together
  - [x] Handle different original/result aspect ratios

- [x] **Task 6: Add comparison toggle** (AC: 1)
  - [x] Create "Compare" button in RevealUI
  - [x] Toggle between reveal view and comparison slider
  - [x] Default: show reveal (AI image only)
  - [x] On compare: show slider with both images

- [x] **Task 7: Write tests**
  - [x] Unit test: Slider position updates on drag
  - [x] Unit test: Keyboard controls work correctly
  - [x] Unit test: Touch interactions work
  - [x] Accessibility test: Focus and ARIA attributes

## Dev Notes

### Architecture Compliance

- **Location:** `apps/web/src/components/reveal/BeforeAfterSlider.tsx`
- **Styling:** Tailwind for layout, inline styles for dynamic positioning
- **Pattern:** Controlled component with position state

### BeforeAfterSlider Component

```typescript
// apps/web/src/components/reveal/BeforeAfterSlider.tsx
import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface BeforeAfterSliderProps {
  beforeImage: string
  afterImage: string
  beforeLabel?: string
  afterLabel?: string
  initialPosition?: number // 0-100
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Original',
  afterLabel = 'AI Generated',
  initialPosition = 50,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate position from pointer event
  const calculatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return position
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = (x / rect.width) * 100
    return Math.max(0, Math.min(100, percentage))
  }, [position])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    setPosition(calculatePosition(e.clientX))
  }, [calculatePosition])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    setPosition(calculatePosition(e.clientX))
  }, [isDragging, calculatePosition])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true)
    setPosition(calculatePosition(e.touches[0].clientX))
  }, [calculatePosition])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    setPosition(calculatePosition(e.touches[0].clientX))
  }, [isDragging, calculatePosition])

  // Keyboard handlers
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 5 // 5% per key press
    switch (e.key) {
      case 'ArrowLeft':
        setPosition((p) => Math.max(0, p - step))
        e.preventDefault()
        break
      case 'ArrowRight':
        setPosition((p) => Math.min(100, p + step))
        e.preventDefault()
        break
      case 'Home':
        setPosition(0)
        e.preventDefault()
        break
      case 'End':
        setPosition(100)
        e.preventDefault()
        break
    }
  }, [])

  // Add/remove global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchend', handleMouseUp)
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize select-none"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="Image comparison slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      aria-valuetext={`${Math.round(position)}% showing AI generated image`}
    >
      {/* After image (AI result) - full width background */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Before image (original) - clipped by position */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            width: `${100 / (position / 100)}%`, 
            maxWidth: 'none' 
          }}
        />
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        {/* Handle grip */}
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-12 h-12 rounded-full bg-white shadow-lg", // 48px touch target
            "flex items-center justify-center",
            "cursor-grab",
            isDragging && "cursor-grabbing scale-110"
          )}
        >
          <div className="flex gap-0.5">
            <ChevronLeft className="w-4 h-4 text-charcoal" />
            <ChevronRight className="w-4 h-4 text-charcoal" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 px-2 py-1 bg-black/50 rounded text-white text-sm">
        {beforeLabel}
      </div>
      <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/50 rounded text-white text-sm">
        {afterLabel}
      </div>
    </div>
  )
}
```

### Integration with RevealUI / Result Page

- Comparison toggle lives in the result route (`apps/web/src/routes/result.$resultId.tsx`).
- When `showComparison` is true and `originalUrl` is available, the page swaps the reveal animation for `BeforeAfterSlider`.
- `RevealUI` receives `resultId`, `previewUrl`, and the toggle props; it renders the Compare button only when `originalUrl` exists.

### UX Spec Reference (BeforeAfterSlider)

From UX design spec:
- Touch-friendly handle
- Smooth scrubbing
- Keyboard accessible

### Accessibility Requirements

```typescript
// ARIA attributes for slider
role="slider"
aria-label="Image comparison slider"
aria-valuemin={0}
aria-valuemax={100}
aria-valuenow={position}
aria-valuetext={`${position}% showing AI generated image`}

// Keyboard controls
ArrowLeft: -5%
ArrowRight: +5%
Home: 0%
End: 100%
```

### Touch Target Size (NFR-5.5)

```css
/* Minimum 48px touch target */
.slider-handle {
  min-width: 48px;
  min-height: 48px;
}
```

### Performance Considerations

- Use `transform` for handle positioning (GPU accelerated)
- Debounce rapid position changes if needed
- Use `will-change: transform` on handle
- Avoid re-renders of images during drag

### Image Dimension Handling

```typescript
// Both images use same container with object-fit: cover
// This ensures they align perfectly regardless of original aspect ratio
<div className="relative w-full aspect-[4/3]">
  <img className="absolute inset-0 w-full h-full object-cover" />
</div>
```

### File Structure

```
apps/web/src/components/reveal/
├── BeforeAfterSlider.tsx     <- NEW: Comparison slider
├── BeforeAfterSlider.test.tsx <- NEW: Tests
├── RevealUI.tsx              <- UPDATE: Add compare toggle
```

### Dependencies

- **Story 5.3 (Reveal Animation):** Must have RevealUI to integrate slider
- **Original Image URL:** Need access to uploaded original image

### API Consideration

The result endpoint needs to return the original image URL:

```typescript
// GET /api/result/:id response
{
  id: string
  previewUrl: string      // Watermarked AI result
  originalUrl: string     // Original ultrasound upload
  // ...
}
```

### References

- [Source: _bmad-output/epics.md#Story 5.5] - Acceptance criteria
- [Source: _bmad-output/prd.md#FR-3.5] - Before/after comparison slider
- [Source: _bmad-output/ux-design-specification.md#Custom Components] - BeforeAfterSlider spec

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None - implementation proceeded without blockers.

### Completion Notes List

1. Created `BeforeAfterSlider` component with full drag, touch, and keyboard support
2. Slider handle uses 48px (w-12) touch target per NFR-5.5
3. Full ARIA support: role="slider", aria-valuemin/max/now/valuetext
4. Keyboard controls: ArrowLeft/Right (±5%), Home (0%), End (100%)
5. Both images use object-fit: cover with 4:3 aspect ratio container
6. Added "Compare with Original" toggle button to RevealUI
7. Updated status API to return signed `originalUrl` for comparison
8. Result page toggles between RevealAnimation and BeforeAfterSlider views
9. Added PostHog analytics for comparison_opened/comparison_closed events
10. Comprehensive test coverage: 25 tests for BeforeAfterSlider, 6 tests for comparison toggle

### File List

**New Files:**
- `apps/web/src/components/reveal/BeforeAfterSlider.tsx` - Main slider component
- `apps/web/src/components/reveal/BeforeAfterSlider.test.tsx` - 25 unit tests

**Modified Files:**
- `apps/web/src/components/reveal/index.ts` - Export BeforeAfterSlider and DownloadPreviewButton
- `apps/web/src/components/reveal/RevealUI.tsx` - Comparison toggle props + DownloadPreviewButton integration
- `apps/web/src/components/reveal/RevealUI.test.tsx` - Tests for comparison toggle
- `apps/web/src/components/reveal/DownloadPreviewButton.tsx` - Shared download button used by RevealUI
- `apps/web/src/routes/result.$resultId.tsx` - Integration with comparison slider toggle
- `packages/api/src/routes/status.ts` - Return originalUrl in response

## Change Log

- 2024-12-21: Implemented Story 5.5 - Before/After Comparison Slider with all acceptance criteria met
