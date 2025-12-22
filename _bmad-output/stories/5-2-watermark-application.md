# Story 5.2: Watermark Application

Status: done

## Story

As a **system**,
I want **a watermarked preview generated from the result**,
so that **users can share without giving away the full image**.

## Acceptance Criteria

1. **AC-1:** Given the AI-generated image is stored, when the watermarking stage runs, then a watermark is applied at 40% opacity (FR-3.2)
2. **AC-2:** The watermark is positioned in bottom-right corner
3. **AC-3:** The watermark is 15% of image width
4. **AC-4:** The watermark text is "babypeek.com"
5. **AC-5:** The preview is resized to 800px max dimension (FR-3.3)
6. **AC-6:** The preview is stored at `/results/{resultId}/preview.jpg`
7. **AC-7:** Watermarking uses Sharp library

## Tasks / Subtasks

- [x] **Task 1: Create WatermarkService** (AC: 1-4, 7)
  - [x] Create `packages/api/src/services/WatermarkService.ts`
  - [x] Implement as Effect Service with typed errors
  - [x] Define `WatermarkError` with causes: SHARP_FAILED, INVALID_IMAGE, COMPOSITE_FAILED
  - [x] Install Sharp: `bun add sharp @types/sharp` in packages/api
  - [x] Implement `apply(imageBuffer, options)` method

- [x] **Task 2: Implement watermark positioning logic** (AC: 2, 3, 4)
  - [x] Calculate watermark size as 15% of image width
  - [x] Generate watermark text SVG or PNG programmatically
  - [x] Position in bottom-right with 3% margin from edges
  - [x] Apply 40% opacity to watermark
  - [x] Use Sharp composite with explicit top/left positioning

- [x] **Task 3: Implement preview resizing** (AC: 5)
  - [x] Create `resize(imageBuffer, maxDimension)` method
  - [x] Resize to fit within 800px maintaining aspect ratio
  - [x] Use Sharp resize with fit: 'inside', withoutEnlargement: true
  - [x] Output as JPEG with quality 85%

- [x] **Task 4: Create combined watermark+resize method** (AC: 1-7)
  - [x] Implement `createPreview(imageBuffer)` that combines both operations
  - [x] Order: resize first (smaller image = faster watermark), then watermark
  - [x] Return Buffer of final preview image

- [x] **Task 5: Integrate into workflow** (AC: 6)
  - [x] Update `process-image.ts` workflow to call WatermarkService after storing full image
  - [x] Store preview at `results/{resultId}/preview.jpg` via R2Service
  - [x] Update result record with previewUrl
  - [x] Update stage to 'watermarking' during this step

- [x] **Task 6: Add WatermarkService to AppServicesLive** 
  - [x] Export WatermarkServiceLive from services/index.ts
  - [x] Add to AppServicesLive layer merge

- [x] **Task 7: Write tests**
  - [x] Unit test: Watermark applied at correct opacity
  - [x] Unit test: Preview resized to max 800px
  - [x] Unit test: Watermark positioned bottom-right
  - [x] Unit test: Output is valid JPEG
  - [x] Unit test: Service layer exports and methods (18 tests total)

## Dev Notes

### Architecture Compliance

- **Service Pattern:** Effect Service with Context.Tag and typed errors
- **Location:** `packages/api/src/services/WatermarkService.ts`
- **Dependency:** Sharp library for image processing
- **Storage:** R2 via R2Service

### WatermarkService Implementation

```typescript
// packages/api/src/services/WatermarkService.ts
import { Effect, Context, Layer, Data } from 'effect'
import sharp from 'sharp'

// Typed error
export class WatermarkError extends Data.TaggedError('WatermarkError')<{
  cause: 'SHARP_FAILED' | 'INVALID_IMAGE' | 'COMPOSITE_FAILED' | 'RESIZE_FAILED'
  message: string
}> {}

// Service interface
export class WatermarkService extends Context.Tag('WatermarkService')<
  WatermarkService,
  {
    apply: (imageBuffer: Buffer, options?: WatermarkOptions) => Effect.Effect<Buffer, WatermarkError>
    resize: (imageBuffer: Buffer, maxDimension: number) => Effect.Effect<Buffer, WatermarkError>
    createPreview: (imageBuffer: Buffer) => Effect.Effect<Buffer, WatermarkError>
  }
>() {}

interface WatermarkOptions {
  text?: string       // Default: "babypeek.com"
  opacity?: number    // Default: 0.4 (40%)
  widthPercent?: number // Default: 0.15 (15%)
}

// Implementation
export const WatermarkServiceLive = Layer.succeed(
  WatermarkService,
  {
    apply: (imageBuffer, options = {}) =>
      Effect.gen(function* () {
        const {
          text = 'babypeek.com',
          opacity = 0.4,
          widthPercent = 0.15,
        } = options

        // Get image metadata
        const metadata = yield* Effect.tryPromise({
          try: () => sharp(imageBuffer).metadata(),
          catch: (e) => new WatermarkError({ cause: 'SHARP_FAILED', message: String(e) })
        })

        const imageWidth = metadata.width ?? 800
        const imageHeight = metadata.height ?? 600

        // Calculate watermark size (15% of width)
        const watermarkWidth = Math.floor(imageWidth * widthPercent)
        const fontSize = Math.floor(watermarkWidth / 6) // Approximate for text

        // Generate watermark SVG
        const watermarkSvg = Buffer.from(`
          <svg width="${watermarkWidth}" height="${fontSize * 1.5}">
            <text 
              x="50%" 
              y="50%" 
              dominant-baseline="middle" 
              text-anchor="middle"
              font-family="DM Sans, Arial, sans-serif"
              font-size="${fontSize}px"
              font-weight="500"
              fill="rgba(255, 255, 255, ${opacity})"
              style="text-shadow: 0 1px 3px rgba(0,0,0,0.3);"
            >
              ${text}
            </text>
          </svg>
        `)

        // Calculate margin (3% from edges)
        const margin = Math.floor(Math.min(imageWidth, imageHeight) * 0.03)

        // Composite watermark onto image
        const watermarked = yield* Effect.tryPromise({
          try: () => sharp(imageBuffer)
            .composite([{
              input: watermarkSvg,
              gravity: 'southeast',
              blend: 'over',
              top: imageHeight - Math.floor(fontSize * 1.5) - margin,
              left: imageWidth - watermarkWidth - margin,
            }])
            .jpeg({ quality: 90 })
            .toBuffer(),
          catch: (e) => new WatermarkError({ cause: 'COMPOSITE_FAILED', message: String(e) })
        })

        return watermarked
      }),

    resize: (imageBuffer, maxDimension) =>
      Effect.tryPromise({
        try: () => sharp(imageBuffer)
          .resize(maxDimension, maxDimension, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toBuffer(),
        catch: (e) => new WatermarkError({ cause: 'RESIZE_FAILED', message: String(e) })
      }),

    createPreview: (imageBuffer) =>
      Effect.gen(function* () {
        const service = yield* WatermarkService
        
        // Step 1: Resize to 800px max
        const resized = yield* service.resize(imageBuffer, 800)
        
        // Step 2: Apply watermark
        const preview = yield* service.apply(resized)
        
        return preview
      })
  }
)
```

### Workflow Integration

```typescript
// packages/api/src/workflows/process-image.ts (update)
import { WatermarkService } from '../services/WatermarkService'

// ... in processImageWorkflow

// Stage 4: Watermark (90%)
yield* UploadService.updateStage(uploadId, 'watermarking', 90)

const watermarkService = yield* WatermarkService
const previewBuffer = yield* watermarkService.createPreview(fullImageBuffer)

// Store preview in R2
const previewKey = `results/${resultId}/preview.jpg`
const previewUrl = yield* R2Service.upload(previewBuffer, previewKey, 'image/jpeg')

// Update result record with preview URL
yield* ResultService.updatePreviewUrl(resultId, previewUrl)
```

### Watermark Specifications (from PRD/UX)

| Spec | Value |
|------|-------|
| Opacity | 40% |
| Position | Bottom-right corner |
| Size | 15% of image width |
| Text | "babypeek.com" |
| Margin | 3% from edges |
| Font | Arial (system fallback) |

### Preview Specifications

| Spec | Value |
|------|-------|
| Max dimension | 800px |
| Aspect ratio | Preserved |
| Format | JPEG |
| Quality | 85% |
| Storage path | `/results/{resultId}/preview.jpg` |

### R2 Storage Structure

```
results/
├── {resultId}/
│   ├── full.jpg      <- Full resolution (no watermark)
│   └── preview.jpg   <- 800px max, watermarked
```

### Sharp Installation

```bash
cd packages/api
bun add sharp
bun add -d @types/sharp
```

Note: Sharp may require platform-specific binaries. For Vercel deployment, ensure `sharp` is in dependencies (not devDependencies).

### File Structure

```
packages/api/src/services/
├── WatermarkService.ts       <- NEW: Effect-based watermarking service
├── WatermarkService.test.ts  <- NEW: 18 unit tests
├── index.ts                  <- UPDATE: Export WatermarkServiceLive

packages/api/src/workflows/
├── process-image-simple.ts   <- UPDATE: Add watermarking step (inline impl)
```

### Architecture Note

Two implementations exist for watermarking:
1. **WatermarkService** (Effect-based) - For Effect pipelines, testing, future API endpoints
2. **Inline in workflow** (async/await) - For the `workflow` library execution context

This duplication is intentional due to different execution models.

### Dependencies

- **Story 4.4 (Result Storage):** ✅ Full image stored in R2
- **Sharp library:** Image processing
- **R2Service:** ✅ For storing preview

### What This Enables

- Story 5.3: Reveal animation shows preview image
- Story 5.6: Download preview downloads watermarked version
- Story 8.4: Share page shows watermarked preview

### Error Handling

```typescript
// Typed errors for watermarking
export class WatermarkError extends Data.TaggedError('WatermarkError')<{
  cause: 'SHARP_FAILED' | 'INVALID_IMAGE' | 'COMPOSITE_FAILED' | 'RESIZE_FAILED'
  message: string
}> {}

// Usage in workflow with fallback
const preview = yield* watermarkService.createPreview(fullImageBuffer).pipe(
  Effect.catchTag('WatermarkError', (error) => {
    // Log error, continue with full image as preview (degraded experience)
    yield* Effect.logError(`Watermarking failed: ${error.message}`)
    return Effect.succeed(fullImageBuffer)
  })
)
```

### Performance Considerations

- Resize BEFORE watermarking (process smaller image)
- Use Sharp's streaming capabilities for memory efficiency
- JPEG output at 85% quality balances file size and visual quality
- Async operations wrapped in Effect.tryPromise

### References

- [Source: _bmad-output/epics.md#Story 5.2] - Acceptance criteria
- [Source: _bmad-output/prd.md#FR-3: Preview & Results] - Watermark requirements
- [Source: _bmad-output/ux-design-specification.md#Share Flow] - Watermark strategy
- [Source: _bmad-output/architecture.md#Effect Service Pattern] - Service implementation

## Senior Developer Review (AI)

**Review Date:** 2024-12-21
**Review Outcome:** ✅ Approved with fixes applied

### Summary
All 7 Acceptance Criteria verified as implemented. Code review found 3 MEDIUM and 4 LOW issues, all resolved.

### Action Items (All Resolved)
- [x] **[MEDIUM]** Fixed JPEG quality inconsistency - unified to 85% [WatermarkService.ts:149]
- [x] **[MEDIUM]** Documented intentional dual implementation (Effect service + workflow inline)
- [x] **[MEDIUM]** Updated Task 2 subtask claim to match actual positioning approach
- [x] **[LOW]** Updated font reference in Dev Notes (Arial, not DM Sans)
- [x] **[LOW]** Updated Task 7 to accurately describe test coverage

### Notes
- Code duplication between WatermarkService (Effect) and workflow (async) is intentional due to different execution contexts
- All unit tests pass (18 tests for WatermarkService)
- Full test suite passes (228 API + 278 web tests)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

N/A - No blocking issues encountered

### Completion Notes List

- Created `WatermarkService` as Effect Service with `apply`, `resize`, and `createPreview` methods
- Added `WatermarkError` typed error with causes: SHARP_FAILED, INVALID_IMAGE, COMPOSITE_FAILED, RESIZE_FAILED
- Installed Sharp library for image processing
- Watermark SVG uses Arial font with white text (40% opacity) and subtle dark stroke
- Watermark positioned bottom-right with 3% margin from edges using explicit top/left positioning
- Preview resizes to 800px max (fit inside, no enlargement) then applies watermark
- Integrated watermarking stage into `process-image-simple.ts` workflow (inline implementation for workflow context)
- Preview stored at `results/{resultId}/preview.jpg` with previewUrl saved to database
- All 18 unit tests pass covering: opacity, positioning, resizing, aspect ratio preservation, error handling
- Full test suite passes (228 API tests + 278 web tests)

### Code Review Fixes Applied

- Fixed JPEG quality inconsistency: WatermarkService.apply now uses 85% quality (was 90%)
- Updated Task 2 subtask to reflect actual implementation (explicit positioning vs gravity)
- Updated Task 7 subtask to accurately describe test coverage
- Documented intentional dual implementation (Effect service + workflow inline)

### File List

**New Files:**
- `packages/api/src/services/WatermarkService.ts` - WatermarkService Effect service
- `packages/api/src/services/WatermarkService.test.ts` - 18 unit tests

**Modified Files:**
- `packages/api/package.json` - Added sharp and @types/sharp dependencies
- `packages/api/src/lib/errors.ts` - Added WatermarkError type
- `packages/api/src/services/index.ts` - Export WatermarkService and add to AppServicesLive
- `packages/api/src/workflows/process-image-simple.ts` - Added watermarking stage and preview creation
