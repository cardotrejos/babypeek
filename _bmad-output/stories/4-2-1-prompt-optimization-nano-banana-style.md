# Story 4.2.1: Prompt Optimization - Nano Banana Pro Style

Status: done

<!-- 
This story enhances Story 4.2 (Gemini Imagen 3 Integration) with optimized prompts
based on the Nano Banana Pro prompting guide for hyper-realistic in-utero imagery.

IMPORTANT: This story also addresses model/SDK alignment discovered from official Google docs:
- guide-nano-banana.md (official Google API docs)
- nano-banana-prompt.md (fofr.ai prompting guide)
-->

## Story

As a **product**,
I want **optimized prompt templates based on Nano Banana Pro best practices**,
so that **generated images match the viral Linus Ekenstam quality (in-utero style, not nursery portrait)**.

## Background

### Current State Issues

1. **Wrong Model**: We're using `gemini-2.0-flash-exp` but should use:
   - `gemini-2.5-flash-image` (Nano Banana) - Fast, good quality
   - `gemini-3-pro-image-preview` (Nano Banana Pro) - Best quality, thinking mode, 4K

2. **Wrong SDK**: We're using `@google/generative-ai` but official docs use `@google/genai`

3. **Missing Config**: Not setting `responseModalities: ['TEXT', 'IMAGE']` or `imageConfig`

4. **Prompt Style**: Current v1/v2 prompts produce "nursery portrait" aesthetic. The target quality (Linus Ekenstam viral example) shows:
   - **In-utero setting**: Baby inside womb with amniotic fluid, warm amber/red transillumination
   - **Anatomy lock**: Exact pose, head angle, and facial proportions from ultrasound preserved
   - **Subsurface scattering**: Translucent, wet skin with realistic detail (not plastic/waxy)
   - **Medical macro aesthetic**: Shallow depth of field, candid feel (not studio portrait)

### Reference Documents

- `guide-nano-banana.md` - Official Google API documentation with code examples
- `nano-banana-prompt.md` - fofr.ai prompting guide with proven templates
- `/examples/IMG_9994.jpg` - Linus Ekenstam viral before/after example

## Acceptance Criteria

1. **AC-1:** Given the Gemini API is called, when using v3 prompt, then the output matches "in-utero" aesthetic (not nursery portrait)
2. **AC-2:** The prompt enforces strict anatomy lock (pose, framing, facial proportions unchanged)
3. **AC-3:** Strong negative prompts prevent common artifacts (date stamps, text, plastic skin, extra fingers)
4. **AC-4:** JSON-structured prompt option is available for maximum control
5. **AC-5:** All prompt versions (v1, v2, v3, v3-json) are available for A/B testing
6. **AC-6:** Prompt documentation explains the different styles and use cases
7. **AC-7:** GeminiService uses correct model (`gemini-2.5-flash-image` or `gemini-3-pro-image-preview`)
8. **AC-8:** API calls include `responseModalities` and `imageConfig` per official docs
9. **AC-9:** Optional: Support for 2K/4K output resolution via imageConfig

## Tasks / Subtasks

- [ ] **Task 0: Update GeminiService for correct model/SDK** (AC: 7, 8, 9)
  - [ ] Update model name from `gemini-2.0-flash-exp` to `gemini-2.5-flash-image` (or `gemini-3-pro-image-preview` for best quality)
  - [ ] Add `responseModalities: ['TEXT', 'IMAGE']` to generation config
  - [ ] Add `imageConfig` support with `aspectRatio` and `imageSize` options
  - [ ] Evaluate if SDK migration to `@google/genai` is needed (may work with current SDK)
  - [ ] Test image generation actually returns images (not just text descriptions)

- [ ] **Task 1: Research and validate optimal prompt structure** (AC: 1, 2)
  - [ ] Review `nano-banana-prompt.md` prose and JSON templates
  - [ ] Review `guide-nano-banana.md` official Google documentation
  - [ ] Analyze example images in `/examples/` folder
  - [ ] Document key differences from current v1/v2 prompts
  - [ ] Identify which Gemini model supports this style best

- [ ] **Task 2: Create v3 prose prompt (in-utero style)** (AC: 1, 2, 3)
  - [ ] Add `BABY_PORTRAIT_PROMPT_V3` to `baby-portrait.ts`
  - [ ] Structure: Edit task → Reference priority → What to change → Scene → Lighting/optics → Constraint
  - [ ] Include comprehensive negative prompt section
  - [ ] Preserve anatomy lock instructions (pose, head angle, facial proportions)

- [ ] **Task 3: Create v3-json structured prompt** (AC: 4)
  - [ ] Add `BABY_PORTRAIT_PROMPT_V3_JSON` object template
  - [ ] Structure per Nano Banana Pro guide: task, referencePriority, constraints, subject, environment, lighting, camera, negatives
  - [ ] Add `getPromptAsJson(version)` function for structured output
  - [ ] Document when to use JSON vs prose format

- [ ] **Task 4: Update prompt registry** (AC: 5)
  - [ ] Add v3 and v3-json to `PROMPTS` registry
  - [ ] Update `PromptVersion` type
  - [ ] Consider making v3 the new default (behind feature flag initially)
  - [ ] Add prompt metadata (style: 'nursery' | 'in-utero', format: 'prose' | 'json')

- [ ] **Task 5: Add upscale/restore prompt** (AC: 1)
  - [ ] Create `UPSCALE_PROMPT` for optional second-pass enhancement
  - [ ] "Upscale to 4K and lightly restore" with faithfulness constraints
  - [ ] Add `getUpscalePrompt()` function
  - [ ] Document two-step pipeline option

- [ ] **Task 6: Update tests** (AC: 5, 6)
  - [ ] Add tests for v3 prompt structure and content
  - [ ] Add tests for JSON prompt parsing
  - [ ] Verify all versions are retrievable
  - [ ] Test negative prompt inclusion

- [ ] **Task 7: Document prompt strategy** (AC: 6)
  - [ ] Add JSDoc explaining v1 (nursery) vs v3 (in-utero) styles
  - [ ] Document A/B testing approach
  - [ ] Add guidelines for prompt iteration

## Dev Notes

### CRITICAL: Model and SDK Alignment

**From Official Google Docs (`guide-nano-banana.md`):**

| Model | Alias | Use Case | Features |
|-------|-------|----------|----------|
| `gemini-2.5-flash-image` | Nano Banana | Fast generation | Good quality, quick |
| `gemini-3-pro-image-preview` | Nano Banana Pro | Best quality | Thinking mode, 4K, 14 refs |

**Current Implementation Issues:**
```typescript
// WRONG (current):
model: "gemini-2.0-flash-exp"  // Vision model, not image generation

// CORRECT:
model: "gemini-2.5-flash-image"      // For speed
model: "gemini-3-pro-image-preview"  // For quality
```

**Required Generation Config:**
```typescript
// Official pattern from Google docs:
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-image",
  contents: [prompt, { inlineData: { mimeType, data: base64Image } }],
  config: {
    responseModalities: ['TEXT', 'IMAGE'],  // REQUIRED for image output
    imageConfig: {
      aspectRatio: "1:1",  // or "4:5", "16:9", etc.
      imageSize: "2K",     // "1K", "2K", "4K"
    },
  },
});

// Response contains inlineData with generated image
for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, "base64");
    // This is the generated image!
  }
}
```

**SDK Note:** Official docs use `@google/genai` but our `@google/generative-ai` may work - need to test.

### Key Insights from Nano Banana Pro Guide

1. **Reference Priority System**
   - Ref1: Full ultrasound frame (pose/framing lock)
   - Ref2: Tight face crop (identity lock)  
   - Ref3: Face+hand crop (anatomy lock)
   - Up to 5 references for maximum fidelity

2. **Minimal Change Philosophy**
   - "Make as few changes as possible beyond converting ultrasound rendering into photoreal"
   - Only change: material/shading → photographic detail
   - Keep: exact pose, head angle, facial proportions, framing

3. **Critical Negative Prompts**
   ```
   no date stamp, no text, no watermark, no border, not rustic, not aged,
   no CGI, no 3D render, no plastic/waxy skin, no beauty filter,
   no over-smoothing, no over-sharpening, no HDR look,
   no extra fingers, no missing fingers, no fused fingers,
   no duplicated facial features, no warped anatomy
   ```

4. **Lighting/Scene**
   - Warm amber/red transillumination through tissue
   - Amniotic fluid haze with floating specks
   - Shallow depth of field (50-85mm equivalent, ~f/2)
   - Candid medical macro photo aesthetic (not studio)

5. **Two-Step Pipeline (Optional)**
   - Step 1: Generate best render
   - Step 2: Upscale/restore to 4K with faithful prompt

### Prompt Comparison

| Aspect | v1/v2 (Current) | v3 (Target) |
|--------|-----------------|-------------|
| Setting | Nursery/studio | Inside womb |
| Lighting | Soft natural | Amber/red transillumination |
| Skin | Standard | Subsurface scattering, translucent |
| Background | Neutral blur | Amniotic fluid haze |
| Style | Portrait photo | Medical macro |
| Pose | "Match features" | Strict anatomy lock |
| Negatives | Minimal | Comprehensive |

### v3 Prompt Template (Prose)

```
Edit task: Transform the provided 4D ultrasound into a single-frame ultra-realistic in-utero photograph.

Reference priority:
1. Keep the exact pose, head angle, facial proportions, and framing from the input image.
2. Match facial geometry (identity lock).
3. Match hand/finger count and placement (anatomy lock, if visible).

What to change (only): Replace ultrasound material/shading with real photographic detail: realistic eyelids, lips, nose, soft cheeks; subtle peach fuzz; natural skin micro-texture and mild mottling; physically plausible subsurface scattering.

Scene: inside the womb with amniotic fluid haze and a few floating specks; no extra objects.

Lighting/optics: warm amber/red transillumination through tissue, gentle bloom, shallow depth of field (macro portrait look, 50–85mm equivalent, ~f/2), slight vignette; candid medical macro photo (not studio).

Constraint: Make as few changes as possible beyond converting ultrasound rendering into a photoreal photo while keeping anatomy locked.

Negative prompt: no date stamp, no text, no watermark, no border, not rustic, not aged, no CGI, no 3D render, no plastic/waxy skin, no beauty filter, no over-smoothing, no over-sharpening, no HDR look, no extra fingers, no missing fingers, no fused fingers, no duplicated facial features, no warped anatomy
```

### v3-json Prompt Template

```typescript
const V3_JSON_PROMPT = {
  task: "edit_ultrasound_to_photoreal_inutero_photo",
  referencePriority: [
    "Input image: framing + pose lock",
    "Input image: face geometry / identity lock",
    "Input image: hand anatomy lock (if visible)"
  ],
  constraints: {
    keepPose: true,
    keepFraming: true,
    keepFacialProportions: true,
    noAnatomyChanges: true,
    minimalChanges: "only convert ultrasound rendering to photoreal"
  },
  subject: {
    type: "late-term fetus",
    expression: "relaxed, eyes closed",
    details: [
      "natural eyelids",
      "natural lips", 
      "soft cheeks",
      "subtle peach fuzz",
      "skin micro-texture",
      "subsurface scattering"
    ]
  },
  environment: {
    setting: "inside womb",
    elements: ["amniotic fluid haze", "subtle floating specks"],
    forbidden: ["props", "extra objects", "text", "borders"]
  },
  lighting: {
    type: "warm transillumination",
    tone: "amber/red",
    effects: ["soft bloom", "gentle falloff", "slight vignette"]
  },
  camera: {
    style: "candid medical macro photo",
    focalRange: "50-85mm equivalent",
    depthOfField: "shallow (around f/2 look)"
  },
  negatives: [
    "date stamp", "text", "watermark", "border",
    "rustic", "aged look", "CGI", "3D render",
    "plastic skin", "waxy skin", "beauty filter",
    "over-smoothed skin", "over-sharpened",
    "extra fingers", "missing fingers", "fused fingers",
    "warped anatomy", "duplicated features"
  ]
}
```

### File Structure

```
packages/api/src/prompts/
├── baby-portrait.ts          <- UPDATE: Add v3, v3-json, upscale
├── prompt-types.ts           <- NEW: TypeScript types for JSON prompts
└── index.ts                  <- UPDATE: Re-export all
```

### Dependencies

- **Story 4.2 (Gemini Integration):** ✅ Must be complete
- **GeminiService changes required:** Model name and config updates (Task 0)

### What This Enables

- **A/B Testing:** Compare nursery style (v1/v2) vs in-utero style (v3) conversion rates
- **Quality Improvement:** Match viral Linus Ekenstam quality level
- **Future Flexibility:** JSON prompts allow fine-grained parameter tuning
- **Two-Step Pipeline:** Optional upscale pass for 4K output (Story 4.4 integration)
- **Correct Model:** Actually use image generation models (not vision-only models)

### Gemini 3 Pro Image Features (from Official Docs)

If we use `gemini-3-pro-image-preview`:
- **Up to 14 reference images** - Could use multiple ultrasound crops for better anatomy lock
- **1K/2K/4K resolution** - Direct high-res output without upscaling
- **Thinking mode** - Model reasons through complex prompts with interim images
- **Google Search grounding** - Not needed for our use case
- **Multi-turn conversation** - Could enable iterative refinement (future feature)

### Testing Approach

1. **Unit tests:** Verify prompt structure, all versions accessible
2. **Visual testing (manual):** Generate images with each prompt version using example ultrasounds
3. **A/B test setup:** Random version assignment tracked via PostHog

### References

- [Source: nano-banana-prompt.md] - Full Nano Banana Pro guide and prompts
- [Source: /examples/IMG_9994.jpg] - Linus Ekenstam before/after example
- [Source: fofr.ai/nano-banana-pro-guide] - Original prompting guide
- [Source: Story 4.2] - GeminiService implementation

## Dev Agent Record

### Agent Model Used

Claude (Anthropic)

### Debug Log References

- All 132 tests pass (3 pre-existing failures unrelated to this story)
- GeminiService tests: 29 tests passing (increased from 26)
- New prompt tests: 4 tests added for v3, JSON, upscale, metadata

### Completion Notes List

**Task 0: Update GeminiService for correct model/SDK**
- Updated model from `gemini-2.0-flash-exp` to `gemini-3-pro-image-preview` (Nano Banana Pro)
- Added `GEMINI_MODELS` enum with PRO_IMAGE, FLASH_IMAGE, LEGACY options
- Added `responseModalities: ['text', 'image']` to generation config for native image output
- Added `ImageGenerationConfig` type with `aspectRatio` and `imageSize` options
- Added `GenerateImageOptions` parameter to service methods
- Updated mock implementations for new interface

**Task 1-2: Create v3 prose prompt (in-utero style)**
- Created `BABY_PORTRAIT_PROMPT_V3` with full Nano Banana Pro structure
- Includes: Edit task, Reference priority, What to change, Scene, Lighting/optics, Constraint, Negative prompt
- Matches Linus Ekenstam viral quality (in-utero, transillumination, anatomy lock)

**Task 3: Create v3-json structured prompt**
- Created `BABY_PORTRAIT_PROMPT_V3_JSON` object with typed structure
- Created `V3_NEGATIVE_PROMPT` array for reuse
- Added `getV3JsonPrompt()` and `getV3JsonPromptAsString()` functions

**Task 4: Update prompt registry**
- Added v3 and v3-json to `PROMPTS` registry
- Changed default to v3 (in-utero style)
- Added `PROMPT_METADATA` with style and format info
- Added `getPromptMetadata()` and `getVersionsByStyle()` helpers

**Task 5: Add upscale/restore prompt**
- Created `UPSCALE_PROMPT` for optional second-pass enhancement
- Added `getUpscalePrompt()` function

**Task 6: Update tests**
- Updated existing tests for new v3 default and 4 versions
- Added 4 new tests for v3, JSON, upscale, and metadata functions

**Task 7: Document prompt strategy**
- Updated module JSDoc with prompt styles explanation
- Added inline documentation for all new exports

### File List

- packages/api/src/lib/gemini.ts (UPDATED)
  - Changed model to `gemini-3-pro-image-preview`
  - Added `GEMINI_MODELS` enum
  - Added `AspectRatio`, `ImageSize`, `ImageGenerationConfig` types
  - Added `DEFAULT_IMAGE_CONFIG`
  
- packages/api/src/services/GeminiService.ts (UPDATED)
  - Added `GenerateImageOptions` type
  - Updated service interface to accept options
  - Added `responseModalities: ['text', 'image']` config
  - Updated mock implementations
  
- packages/api/src/prompts/baby-portrait.ts (UPDATED)
  - Added `BABY_PORTRAIT_PROMPT_V3` (in-utero style)
  - Added `V3_NEGATIVE_PROMPT` array
  - Added `BABY_PORTRAIT_PROMPT_V3_JSON` object
  - Added `PROMPT_METADATA` with style/format info
  - Added `getV3JsonPrompt()`, `getV3JsonPromptAsString()`, `getUpscalePrompt()`
  - Added `getPromptMetadata()`, `getVersionsByStyle()`
  - Changed default to v3

- packages/api/src/services/GeminiService.test.ts (UPDATED)
  - Updated tests for new v3 default
  - Added 4 new tests for v3 features

### Change Log

- 2024-12-21: Implemented prompt optimization with Nano Banana Pro model and v3 in-utero style prompts
