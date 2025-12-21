# Story 4.2: Gemini Imagen 3 Integration

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system**,
I want **to call Gemini Imagen 3 API with the ultrasound**,
so that **a photorealistic baby portrait is generated**.

## Acceptance Criteria

1. **AC-1:** Given a workflow job is running, when the Gemini API is called (FR-2.1), then the original image URL is passed to the API
2. **AC-2:** A structured prompt template is used (FR-2.2)
3. **AC-3:** The prompt template is documented in `/packages/api/src/prompts/`
4. **AC-4:** The generated image is returned as a `Buffer` (or `{ data: Buffer, mimeType }` aligned with GeminiService)
5. **AC-5:** The call is wrapped in Effect.tryPromise with GeminiError typed error
6. **AC-6:** API call has 60 second timeout

## Tasks / Subtasks

- [ ] **Task 1: Install and configure Google AI SDK** (AC: 1)
  - [ ] Install `@google/generative-ai` SDK
  - [ ] Verify Imagen 3 API access in Google AI Studio
  - [ ] Add `GEMINI_API_KEY` to env schema (already defined)
  - [ ] Create `packages/api/src/lib/gemini.ts` for client initialization
  - [ ] Export typed Gemini client

- [ ] **Task 2: Create structured prompt template** (AC: 2, 3)
  - [ ] Create `packages/api/src/prompts/baby-portrait.ts`
  - [ ] Design prompt for ultrasound-to-photorealistic conversion
  - [ ] Include safety guidelines to avoid controversial outputs
  - [ ] Make prompt configurable for future A/B testing
  - [ ] Document prompt rationale in comments

- [ ] **Task 3: Update GeminiService Effect service** (AC: 1, 4, 5, 6)
  - [ ] Update existing `packages/api/src/services/GeminiService.ts` (currently placeholder)
  - [ ] Align service interface return type with downstream consumers (`Buffer` or `{ data: Buffer, mimeType }`)
  - [ ] Implement using Effect.tryPromise
  - [ ] Add 60 second timeout using Effect.timeout
  - [ ] Return image as Buffer (preferred for R2 upload)
  - [ ] Create GeminiServiceLive layer

- [ ] **Task 4: Define GeminiError typed errors** (AC: 5)
  - [ ] Update existing GeminiError in `packages/api/src/lib/errors.ts`
  - [ ] Define causes: RATE_LIMITED, INVALID_IMAGE, CONTENT_POLICY, API_ERROR, TIMEOUT
  - [ ] Map Gemini SDK errors to typed errors
  - [ ] Include original error message for Sentry logging

- [ ] **Task 5: Integrate GeminiService into workflow** (AC: 1, 4)
  - [ ] Update `packages/api/src/workflows/process-image.ts`
  - [ ] Fetch original image from R2 (note: `originalUrl` is an R2 key; use `R2Service.generatePresignedDownloadUrl`)
  - [ ] Call GeminiService.generateImage with image and prompt
  - [ ] Pass generated image buffer to next stage (watermarking)

- [ ] **Task 6: Add Gemini analytics tracking**
  - [ ] Track `gemini_call_started` with uploadId
  - [ ] Track `gemini_call_completed` with durationMs
  - [ ] Track `gemini_call_failed` with errorType
  - [ ] Send to PostHog server-side

- [ ] **Task 7: Write comprehensive tests**
  - [ ] Unit test: GeminiService returns image buffer
  - [ ] Unit test: Timeout after 60s
  - [ ] Unit test: Error mapping for different failure types
  - [ ] Unit test: Prompt template is used correctly
  - [ ] Mock test: Simulate Gemini API response

## Dev Notes

### Architecture Compliance

- **Framework:** Effect services with typed errors
- **External API:** Gemini Imagen 3 via @google/generative-ai SDK
- **Pattern:** Effect.tryPromise + Effect.timeout
- **Error Handling:** GeminiError tagged error type

### Gemini Imagen 3 API Overview

Gemini Imagen 3 is Google's latest image generation model. For 3d-ultra, we use image-to-image generation:
- Input: 4D ultrasound image
- Output: Photorealistic baby portrait

**API Endpoint:** `generateImage` via Google AI SDK
**Model:** `imagen-3.0-generate-001` (verify latest model name)

### GeminiService Pattern (from Architecture)

```typescript
// packages/api/src/services/GeminiService.ts
import { Effect, Context, Layer, Data } from 'effect'

// 1. Service interface
export class GeminiService extends Context.Tag('GeminiService')<
  GeminiService,
  {
    generateImage: (imageUrl: string, prompt: string) => 
      Effect.Effect<{ data: Buffer, mimeType: string }, GeminiError>
  }
>() {}

// 2. Typed error
export class GeminiError extends Data.TaggedError('GeminiError')<{
  cause: 'RATE_LIMITED' | 'INVALID_IMAGE' | 'CONTENT_POLICY' | 'API_ERROR' | 'TIMEOUT'
  message: string
  originalError?: unknown
}> {}

// 3. Implementation
export const GeminiServiceLive = Layer.succeed(
  GeminiService,
  {
    generateImage: (imageUrl, prompt) =>
      Effect.gen(function* () {
        // Fetch image from R2
        const imageBuffer = yield* fetchImageFromUrl(imageUrl)
        
        // Call Gemini API
        const result = yield* Effect.tryPromise({
          try: () => callGeminiImagenApi(imageBuffer, prompt),
          catch: (e) => mapGeminiError(e)
        })
        
        return result
      }).pipe(
        Effect.timeout('60 seconds'),
        Effect.mapError((e) => 
          e._tag === 'TimeoutException' 
            ? new GeminiError({ cause: 'TIMEOUT', message: 'Gemini API timed out after 60s' })
            : e
        )
      )
  }
)
```

### Prompt Template Design

```typescript
// packages/api/src/prompts/baby-portrait.ts

export const BABY_PORTRAIT_PROMPT = `
Transform this 4D ultrasound image into a photorealistic portrait of the baby.

Instructions:
- Create a warm, soft portrait of a newborn baby
- Match the facial features visible in the ultrasound (face shape, nose, lips)
- Use soft, natural lighting as if in a nursery
- Background should be neutral and blurred
- Baby should appear peaceful and serene
- Skin tone should be realistic and healthy
- Eyes can be gently closed or softly gazing

Style guidelines:
- Photorealistic, not cartoonish
- Professional newborn photography aesthetic
- Warm color palette with soft pinks and creams
- High resolution and detailed

Safety guidelines:
- Do not generate any inappropriate content
- Maintain dignity and respect for the baby
- No medical instruments or clinical elements in output

This is a gift for expecting parents - make it magical.
`

// Versioned for A/B testing
export const PROMPTS = {
  v1: BABY_PORTRAIT_PROMPT,
  // v2: alternate prompt for testing
} as const

export type PromptVersion = keyof typeof PROMPTS

export function getPrompt(version: PromptVersion = 'v1'): string {
  return PROMPTS[version]
}
```

### Google AI SDK Usage

```typescript
// packages/api/src/lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from './env'

export const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)

// For Imagen 3 image generation
export async function callGeminiImagenApi(
  inputImage: Buffer, 
  prompt: string
): Promise<Buffer> {
  const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' })
  
  // Convert buffer to base64 for API
  const imageBase64 = inputImage.toString('base64')
  
  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    },
  ])
  
  // Extract generated image from response
  const generatedImageBase64 = result.response.candidates[0].content.parts[0].inlineData.data
  
  return Buffer.from(generatedImageBase64, 'base64')
}
```

**Note:** The exact SDK API may vary - verify against latest @google/generative-ai docs.

### Error Mapping

```typescript
// packages/api/src/services/GeminiService.ts
function mapGeminiError(error: unknown): GeminiError {
  const message = error instanceof Error ? error.message : String(error)
  
  // Rate limiting
  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
    return new GeminiError({ 
      cause: 'RATE_LIMITED', 
      message: 'Gemini API rate limit exceeded',
      originalError: error 
    })
  }
  
  // Content policy
  if (message.includes('SAFETY') || message.includes('blocked')) {
    return new GeminiError({ 
      cause: 'CONTENT_POLICY', 
      message: 'Content was blocked by safety filters',
      originalError: error 
    })
  }
  
  // Invalid input image
  if (message.includes('INVALID_ARGUMENT') || message.includes('image')) {
    return new GeminiError({ 
      cause: 'INVALID_IMAGE', 
      message: 'Invalid or corrupted input image',
      originalError: error 
    })
  }
  
  // Generic API error
  return new GeminiError({ 
    cause: 'API_ERROR', 
    message: `Gemini API error: ${message}`,
    originalError: error 
  })
}
```

### Workflow Integration

```typescript
// packages/api/src/workflows/process-image.ts
import { Effect, pipe } from 'effect'
import { GeminiService, GeminiError } from '../services/GeminiService'
import { R2Service } from '../services/R2Service'
import { getPrompt } from '../prompts/baby-portrait'

export const processImageWorkflow = (uploadId: string) =>
  pipe(
    // Stage 1: Get original image URL from R2
    Effect.flatMap(() => R2Service.getSignedUrl(`uploads/${uploadId}/original.jpg`, 300)),
    
    // Stage 2: Call Gemini (THIS STORY)
    Effect.flatMap((imageUrl) => 
      GeminiService.generateImage(imageUrl, getPrompt('v1'))
    ),
    
    // Stage 3: Pass to watermarking (Story 4.4)
    // ...
  )
```

### File Structure

```
packages/api/src/
├── lib/
│   ├── gemini.ts            <- NEW: Gemini client
│   └── errors.ts            <- UPDATE: Add GeminiError
├── prompts/
│   └── baby-portrait.ts     <- NEW: Prompt template
├── services/
│   ├── GeminiService.ts     <- NEW: Effect service
│   └── index.ts             <- UPDATE: Export GeminiServiceLive
├── workflows/
│   └── process-image.ts     <- UPDATE: Add Gemini call
```

### Environment Variables

Already defined in architecture:
```bash
GEMINI_API_KEY=your-api-key-here
```

Env schema already has:
```typescript
GEMINI_API_KEY: z.string().min(1),
```

### Analytics Events (Server-Side)

```typescript
// In workflow or GeminiService
yield* PostHogService.capture('gemini_call_started', uploadId, {
  upload_id: uploadId
})

// On completion
yield* PostHogService.capture('gemini_call_completed', uploadId, {
  upload_id: uploadId,
  duration_ms: endTime - startTime,
  prompt_version: 'v1'
})

// On failure
yield* PostHogService.capture('gemini_call_failed', uploadId, {
  upload_id: uploadId,
  error_type: error.cause,
  error_message: error.message
})
```

### Dependencies

- **Story 4.1 (Workflow):** ✅ Workflow scaffold must exist
- **R2Service:** ✅ Already implemented for fetching original image
- **@google/generative-ai:** Need to install

```bash
cd packages/api && bun add @google/generative-ai
```

### What This Enables

- Story 4.3: Retry logic wraps this service
- Story 4.4: Generated image passed to R2 storage
- Story 4.5: Progress updates around this call
- Story 4.6: Timeout handling at workflow level

### Risk Mitigation (from Risk Register)

**Risk #1: Gemini API quality/stability**
- Quality validation gate (Story 4.4/4.5)
- Fallback messaging for failures
- Retry logic (Story 4.3)
- Log all failures to Sentry for analysis

### Testing Approach

Since Gemini API calls are expensive, use mocks:

```typescript
// packages/api/src/services/GeminiService.test.ts
import { Effect, Layer } from 'effect'
import { GeminiService, GeminiServiceLive, GeminiError } from './GeminiService'

// Mock implementation
const GeminiServiceMock = Layer.succeed(
  GeminiService,
  {
    generateImage: (imageUrl, prompt) =>
      Effect.succeed(Buffer.from('mock-image-data'))
  }
)

// Test error handling
const GeminiServiceErrorMock = Layer.succeed(
  GeminiService,
  {
    generateImage: () =>
      Effect.fail(new GeminiError({ cause: 'API_ERROR', message: 'Test error' }))
  }
)
```

### References

- [Source: _bmad-output/epics.md#Story 4.2] - Acceptance criteria
- [Source: _bmad-output/architecture.md#Effect Service Pattern] - Service structure
- [Source: _bmad-output/architecture.md#Effect for AI Processing] - Workflow integration
- [Source: _bmad-output/prd.md#FR-2.1] - Process through Gemini Imagen 3
- [Source: _bmad-output/prd.md#FR-2.2] - Structured prompt template

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
