# Story 5.5: Before/After Comparison Slider

Status: ready-for-dev

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

- [ ] **Task 1: Create BeforeAfterSlider component** (AC: 1, 4)
  - [ ] Create `apps/web/src/components/reveal/BeforeAfterSlider.tsx`
  - [ ] Accept `beforeImage` (original ultrasound) and `afterImage` (AI result)
  - [ ] Use CSS clip-path or width to reveal/hide portions
  - [ ] Ensure both images fill container equally

- [ ] **Task 2: Implement drag interaction** (AC: 1, 2)
  - [ ] Track pointer position during drag (mouse + touch)
  - [ ] Convert position to percentage (0-100)
  - [ ] Apply percentage to reveal position
  - [ ] Handle touchstart, touchmove, touchend for mobile
  - [ ] Handle mousedown, mousemove, mouseup for desktop

- [ ] **Task 3: Create slider handle** (AC: 2)
  - [ ] Minimum 48px touch target (NFR-5.5)
  - [ ] Visual handle with drag indicator (vertical bar with arrows)
  - [ ] Add shadow/glow for visibility against image
  - [ ] Cursor: grab/grabbing states

- [ ] **Task 4: Add keyboard support** (AC: 3)
  - [ ] Make slider focusable (tabIndex={0})
  - [ ] Arrow keys: move slider 5% per press
  - [ ] Home/End: move to 0% / 100%
  - [ ] Add aria-label for screen readers
  - [ ] Visual focus indicator

- [ ] **Task 5: Normalize image dimensions** (AC: 4)
  - [ ] Use object-fit: cover for both images
  - [ ] Container maintains aspect ratio (e.g., 4:3)
  - [ ] Both images resize together
  - [ ] Handle different original/result aspect ratios

- [ ] **Task 6: Add comparison toggle** (AC: 1)
  - [ ] Create "Compare" button in RevealUI
  - [ ] Toggle between reveal view and comparison slider
  - [ ] Default: show reveal (AI image only)
  - [ ] On compare: show slider with both images

- [ ] **Task 7: Write tests**
  - [ ] Unit test: Slider position updates on drag
  - [ ] Unit test: Keyboard controls work correctly
  - [ ] Unit test: Touch interactions work
  - [ ] Accessibility test: Focus and ARIA attributes

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

### Integration with RevealUI

```typescript
// apps/web/src/components/reveal/RevealUI.tsx (update)
import { useState } from 'react'
import { BeforeAfterSlider } from './BeforeAfterSlider'

interface RevealUIProps {
  resultPreviewUrl: string
  originalImageUrl: string
  // ... other props
}

export function RevealUI({ resultPreviewUrl, originalImageUrl, ...props }: RevealUIProps) {
  const [showComparison, setShowComparison] = useState(false)
  
  return (
    <div className="space-y-4">
      {showComparison ? (
        <BeforeAfterSlider
          beforeImage={originalImageUrl}
          afterImage={resultPreviewUrl}
          beforeLabel="Your Ultrasound"
          afterLabel="AI Portrait"
        />
      ) : (
        <img src={resultPreviewUrl} alt="AI Portrait" className="w-full rounded-2xl" />
      )}
      
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setShowComparison(!showComparison)}
        >
          {showComparison ? 'Hide Comparison' : 'Compare'}
        </Button>
        {/* ... other buttons */}
      </div>
    </div>
  )
}
```

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
