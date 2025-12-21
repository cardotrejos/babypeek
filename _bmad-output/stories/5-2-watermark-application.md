# Story 5.2: Watermark Application

Status: ready-for-dev

## Story

As a **system**,
I want **a watermarked preview generated from the result**,
so that **users can share without giving away the full image**.

## Acceptance Criteria

1. **AC-1:** Given the AI-generated image is stored, when the watermarking stage runs, then a watermark is applied at 40% opacity (FR-3.2)
2. **AC-2:** The watermark is positioned in bottom-right corner
3. **AC-3:** The watermark is 15% of image width
4. **AC-4:** The watermark text is "3d-ultra.com"
5. **AC-5:** The preview is resized to 800px max dimension (FR-3.3)
6. **AC-6:** The preview is stored at `/results/{resultId}/preview.jpg`
7. **AC-7:** Watermarking uses Sharp library

## Tasks / Subtasks

- [ ] **Task 1: Create WatermarkService** (AC: 1-4, 7)
  - [ ] Create `packages/api/src/services/WatermarkService.ts`
  - [ ] Implement as Effect Service with typed errors
  - [ ] Define `WatermarkError` with causes: SHARP_FAILED, INVALID_IMAGE, COMPOSITE_FAILED
  - [ ] Install Sharp: `bun add sharp @types/sharp` in packages/api
  - [ ] Implement `apply(imageBuffer, options)` method

- [ ] **Task 2: Implement watermark positioning logic** (AC: 2, 3, 4)
  - [ ] Calculate watermark size as 15% of image width
  - [ ] Generate watermark text SVG or PNG programmatically
  - [ ] Position in bottom-right with 3% margin from edges
  - [ ] Apply 40% opacity to watermark
  - [ ] Use Sharp composite with gravity: 'southeast'

- [ ] **Task 3: Implement preview resizing** (AC: 5)
  - [ ] Create `resize(imageBuffer, maxDimension)` method
  - [ ] Resize to fit within 800px maintaining aspect ratio
  - [ ] Use Sharp resize with fit: 'inside', withoutEnlargement: true
  - [ ] Output as JPEG with quality 85%

- [ ] **Task 4: Create combined watermark+resize method** (AC: 1-7)
  - [ ] Implement `createPreview(imageBuffer)` that combines both operations
  - [ ] Order: resize first (smaller image = faster watermark), then watermark
  - [ ] Return Buffer of final preview image

- [ ] **Task 5: Integrate into workflow** (AC: 6)
  - [ ] Update `process-image.ts` workflow to call WatermarkService after storing full image
  - [ ] Store preview at `results/{resultId}/preview.jpg` via R2Service
  - [ ] Update result record with previewUrl
  - [ ] Update stage to 'watermarking' during this step

- [ ] **Task 6: Add WatermarkService to AppServicesLive** 
  - [ ] Export WatermarkServiceLive from services/index.ts
  - [ ] Add to AppServicesLive layer merge

- [ ] **Task 7: Write tests**
  - [ ] Unit test: Watermark applied at correct opacity
  - [ ] Unit test: Preview resized to max 800px
  - [ ] Unit test: Watermark positioned bottom-right
  - [ ] Unit test: Output is valid JPEG
  - [ ] Integration test: Workflow creates preview in R2

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
  text?: string       // Default: "3d-ultra.com"
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
          text = '3d-ultra.com',
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
| Text | "3d-ultra.com" |
| Margin | 3% from edges |
| Font | DM Sans (system fallback) |

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
├── WatermarkService.ts       <- NEW: Watermarking service
├── WatermarkService.test.ts  <- NEW: Unit tests
├── index.ts                  <- UPDATE: Export WatermarkServiceLive

packages/api/src/workflows/
├── process-image.ts          <- UPDATE: Add watermarking step
```

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

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
