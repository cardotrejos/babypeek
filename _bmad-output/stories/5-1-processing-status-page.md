# Story 5.1: Processing Status Page

Status: ready-for-dev

## Story

As a **user**,
I want **to see engaging content while waiting**,
so that **the 60-90 second wait feels shorter**.

## Acceptance Criteria

1. **AC-1:** Given I'm on the processing page, when I'm waiting for my result, then I see a 3-stage progress indicator (Analyzing, Creating, Finishing)
2. **AC-2:** The current stage is highlighted with animation
3. **AC-3:** Copy changes per stage ("Analyzing your ultrasound...", "Creating your baby's portrait...", "Adding final touches...")
4. **AC-4:** Baby facts rotate every 10 seconds
5. **AC-5:** Skeleton loading is shown for the image area
6. **AC-6:** aria-live region announces stage changes for screen readers

## Tasks / Subtasks

- [ ] **Task 1: Create ProcessingScreen component** (AC: 1, 2, 3)
  - [ ] Create `apps/web/src/components/processing/ProcessingScreen.tsx`
  - [ ] Add 3-stage progress indicator with stages: Analyzing, Creating, Finishing
  - [ ] Map backend stages to UI stages: validating→Analyzing, generating→Creating, storing/watermarking/complete→Finishing
  - [ ] Highlight current stage with coral accent and animation
  - [ ] Animate transitions between stages (slide/fade)

- [ ] **Task 2: Implement stage-specific copy** (AC: 3)
  - [ ] Create `apps/web/src/components/processing/stage-copy.ts` with messaging map
  - [ ] Analyzing: "Analyzing your ultrasound..." / "Finding your baby's unique features"
  - [ ] Creating: "Creating your baby's portrait..." / "Our AI is working its magic"
  - [ ] Finishing: "Adding final touches..." / "Almost there!"
  - [ ] Include sub-copy that rotates within each stage

- [ ] **Task 3: Create baby facts carousel** (AC: 4)
  - [ ] Create `apps/web/src/components/processing/BabyFacts.tsx`
  - [ ] Curate 15-20 fun baby facts (size, development milestones, etc.)
  - [ ] Rotate facts every 10 seconds with fade animation
  - [ ] Facts should be warm, engaging, and pregnancy-related
  - [ ] Use `useEffect` with interval, clean up on unmount

- [ ] **Task 4: Add skeleton loading for image area** (AC: 5)
  - [ ] Create shimmer skeleton placeholder (800px max width, 4:3 aspect ratio)
  - [ ] Use Tailwind animate-pulse or custom shimmer animation
  - [ ] Position skeleton where result image will appear
  - [ ] Transition smoothly to actual image on completion

- [ ] **Task 5: Implement accessibility** (AC: 6)
  - [ ] Add `aria-live="polite"` region for stage announcements
  - [ ] Announce stage changes: "Stage 1 of 3: Analyzing your ultrasound"
  - [ ] Add progress percentage to aria-label on progress bar
  - [ ] Ensure skip link exists to main content
  - [ ] Test with VoiceOver

- [ ] **Task 6: Integrate with existing processing route** (AC: 1-6)
  - [ ] Replace basic spinner in `processing.$jobId.tsx` with ProcessingScreen
  - [ ] Pass stage, progress, and status from useStatus hook
  - [ ] Maintain all existing error handling and retry logic
  - [ ] Keep dev debug panel at bottom

- [ ] **Task 7: Add visual polish** (AC: 2)
  - [ ] Add subtle background animation (soft gradient pulse or particles)
  - [ ] Use design system colors (coral, cream, warm-gray)
  - [ ] Ensure 60fps animation performance
  - [ ] Add prefers-reduced-motion fallback (just show static stages)

- [ ] **Task 8: Write tests**
  - [ ] Unit test: Stage indicator shows correct stage based on backend stage
  - [ ] Unit test: Copy changes with stage
  - [ ] Unit test: Baby facts rotate on interval
  - [ ] Unit test: aria-live region updates on stage change
  - [ ] Accessibility audit with axe-core

## Dev Notes

### Architecture Compliance

- **Components:** Located in `apps/web/src/components/processing/`
- **Pattern:** Presentational component receiving props from processing route
- **Styling:** Tailwind + shadcn/ui components, design system colors
- **State:** Stage/progress from useStatus hook (Story 4.5)

### Stage Mapping

```typescript
// Backend stages → UI stages
const stageMapping: Record<string, { ui: string; step: number }> = {
  'validating': { ui: 'Analyzing', step: 1 },
  'generating': { ui: 'Creating', step: 2 },
  'storing': { ui: 'Finishing', step: 3 },
  'watermarking': { ui: 'Finishing', step: 3 },
  'complete': { ui: 'Finishing', step: 3 },
}
```

### 3-Stage Progress Component

```typescript
// apps/web/src/components/processing/ProcessingScreen.tsx
interface ProcessingScreenProps {
  stage: string | null
  progress: number
  isComplete: boolean
  isFailed: boolean
}

const stages = [
  { id: 'analyzing', label: 'Analyzing', icon: '🔍' },
  { id: 'creating', label: 'Creating', icon: '✨' },
  { id: 'finishing', label: 'Finishing', icon: '🎨' },
]

export function ProcessingScreen({ stage, progress, isComplete, isFailed }: ProcessingScreenProps) {
  const currentStep = getStepFromBackendStage(stage)
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-cream">
      {/* Stage indicator */}
      <div className="flex items-center gap-4 mb-8">
        {stages.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
              i + 1 <= currentStep ? "bg-coral text-white" : "bg-charcoal/10 text-warm-gray"
            )}
          >
            <span>{s.icon}</span>
            <span className="font-body">{s.label}</span>
          </div>
        ))}
      </div>
      
      {/* Progress bar */}
      <div className="w-full max-w-md bg-charcoal/10 rounded-full h-3 mb-6">
        <div 
          className="bg-coral h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Processing ${progress}% complete`}
        />
      </div>
      
      {/* Stage copy */}
      <StageCopy stage={stage} />
      
      {/* Baby facts */}
      <BabyFacts />
      
      {/* Skeleton image placeholder */}
      <ImageSkeleton />
      
      {/* Accessibility live region */}
      <div aria-live="polite" className="sr-only">
        {stage && `Stage ${currentStep} of 3: ${getStageLabel(stage)}`}
      </div>
    </div>
  )
}
```

### Stage Copy Data

```typescript
// apps/web/src/components/processing/stage-copy.ts
export const stageCopy = {
  analyzing: {
    main: "Analyzing your ultrasound...",
    sub: ["Finding your baby's unique features", "Scanning for details", "Understanding the image"],
  },
  creating: {
    main: "Creating your baby's portrait...",
    sub: ["Our AI is working its magic", "Bringing your baby to life", "Almost there..."],
  },
  finishing: {
    main: "Adding final touches...",
    sub: ["Making it perfect", "Just a few more seconds", "Polishing the details"],
  },
}
```

### Baby Facts

```typescript
// apps/web/src/components/processing/BabyFacts.tsx
const babyFacts = [
  "Your baby can hear your voice from inside the womb!",
  "Babies start dreaming before they're born.",
  "A baby's fingerprints form at 10 weeks.",
  "Babies can taste what you eat through the amniotic fluid.",
  "At 20 weeks, your baby is about the size of a banana.",
  "Babies practice breathing movements in the womb.",
  "Your baby has been making facial expressions since 14 weeks.",
  "Newborns can recognize their mother's voice immediately.",
  // ... more facts
]

export function BabyFacts() {
  const [currentFact, setCurrentFact] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % babyFacts.length)
    }, 10000) // 10 seconds
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="mt-8 p-4 bg-rose/30 rounded-xl max-w-md text-center">
      <p className="text-sm text-warm-gray font-body animate-fade-in">
        💡 Did you know?
      </p>
      <p className="text-charcoal font-body mt-2">
        {babyFacts[currentFact]}
      </p>
    </div>
  )
}
```

### Image Skeleton

```typescript
// apps/web/src/components/processing/ImageSkeleton.tsx
export function ImageSkeleton() {
  return (
    <div className="w-full max-w-md aspect-[4/3] bg-charcoal/5 rounded-2xl overflow-hidden mt-8">
      <div className="w-full h-full animate-pulse bg-gradient-to-r from-charcoal/5 via-charcoal/10 to-charcoal/5" />
    </div>
  )
}
```

### UX Spec Reference (Processing Wait)

From UX design spec:
- **Duration:** 60-90 seconds
- **3-Stage Progress:**
  - Stage 1 (0-20s): "Analyzing your ultrasound..." - Scan animation
  - Stage 2 (20-60s): "Creating your baby's portrait..." - Particle effect
  - Stage 3 (60-90s): "Adding final touches..." - Polish animation
- **Engagement Elements:** Reassuring copy, subtle background animation, progress %, baby facts

### Dependencies

- **Story 4.5 (Processing Status Updates):** ✅ useStatus hook provides stage/progress
- **Design System:** Coral (#E8927C), Cream (#FDF8F5), Warm-gray (#8B7E74)
- **Fonts:** Playfair Display (headline), DM Sans (body)

### What This Enables

- Story 5.3: Reveal animation triggers when this shows complete
- Story 5.7: Session recovery returns to this screen

### File Structure

```
apps/web/src/components/processing/
├── ProcessingScreen.tsx      <- NEW: Main processing UI
├── StageIndicator.tsx        <- NEW: 3-stage progress
├── StageCopy.tsx             <- NEW: Stage-specific messaging
├── BabyFacts.tsx             <- NEW: Rotating facts
├── ImageSkeleton.tsx         <- NEW: Placeholder shimmer
├── stage-copy.ts             <- NEW: Copy data
└── index.ts                  <- NEW: Barrel export

apps/web/src/routes/
├── processing.$jobId.tsx     <- UPDATE: Use ProcessingScreen
```

### References

- [Source: _bmad-output/epics.md#Story 5.1] - Acceptance criteria
- [Source: _bmad-output/ux-design-specification.md#Processing Wait Experience] - 3-stage design
- [Source: _bmad-output/ux-design-specification.md#Desired Emotional Response] - Anticipation building
- [Source: _bmad-output/architecture.md#Contextual Loading States] - Stage messaging

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
