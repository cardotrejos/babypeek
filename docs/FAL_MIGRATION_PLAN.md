# Gemini → fal.ai Migration Plan

## Goal
Replace GeminiService with fal.ai for baby portrait generation.
Copy the proven pattern from Vizcraft's fal client.

## Why fal.ai
- Already used in Vizcraft (proven, tested)
- `@fal-ai/serverless-client` is simple: config → subscribe → get URL back
- Returns CDN URLs directly (no buffer handling, no base64, simpler R2 storage)
- Faster, cheaper, better image quality for this use case
- Works great on Vercel serverless

## Model to use
`fal-ai/nano-banana-pro` — same as Vizcraft (image editing/generation from input image)
Input: ultrasound image URL + prompt
Output: realistic baby portrait image URL

## Phase 1: Install & configure

```bash
cd packages/api
bun add @fal-ai/serverless-client
```

Add to `packages/api/src/lib/env.ts`:
```
FAL_KEY: z.string().min(1, "FAL_KEY cannot be empty").optional()
```

Add to Vercel env (babypeek-api project):
```
FAL_KEY=<from 1Password>
```

## Phase 2: Create FalService

Create `packages/api/src/services/FalService.ts`:

```typescript
import { Effect, Context, Layer } from "effect";
import { config, subscribe } from "@fal-ai/serverless-client";
import { env } from "../lib/env";

// Initialize once
let isConfigured = false;
function ensureConfig(): void {
  if (isConfigured) return;
  if (!env.FAL_KEY) throw new Error("FAL_KEY is required");
  config({ credentials: env.FAL_KEY });
  isConfigured = true;
}

const FAL_MODEL = "fal-ai/nano-banana-pro";

export interface FalGeneratedImage {
  url: string;     // CDN URL from fal.ai
  mimeType: string; // "image/jpeg" or "image/png"
}

export class FalService extends Context.Tag("FalService")<
  FalService,
  {
    generateImageFromUrl: (imageUrl: string, prompt: string) => Effect.Effect<FalGeneratedImage, Error>;
  }
>() {}

export const FalServiceLive = Layer.succeed(FalService, {
  generateImageFromUrl: (imageUrl: string, prompt: string) =>
    Effect.tryPromise({
      try: async () => {
        ensureConfig();
        const result = await subscribe(FAL_MODEL, {
          input: {
            prompt,
            image_url: imageUrl,
          },
          logs: false,
        }) as { images?: Array<{ url: string; content_type?: string }> };

        const image = result.images?.[0];
        if (!image?.url) throw new Error("No image returned from fal.ai");

        return {
          url: image.url,
          mimeType: image.content_type || "image/jpeg",
        };
      },
      catch: (e) => e instanceof Error ? e : new Error(String(e)),
    }),
});
```

## Phase 3: Update process route

In `packages/api/src/routes/process.ts`:
- Import FalService instead of GeminiService
- Replace `gemini.generateImageFromUrl(imageUrl, prompt)` with `fal.generateImageFromUrl(imageUrl, prompt)`
- Result now has `.url` (CDN URL) instead of `.data` (Buffer)
- Store the CDN URL in R2 by downloading it OR store directly as resultUrl

**Key difference:** fal returns a URL, Gemini returned a Buffer. Two options:
1. **Simple:** store fal CDN URL directly as `result_url` (skip R2 upload for results)
2. **Better:** download from fal CDN → upload to R2 (our CDN, persistent storage)

Go with option 2 (fetch fal URL → upload buffer to R2) to keep consistency.

```typescript
// In the generation loop, replace:
const generatedImage = yield* gemini.generateImageFromUrl(imageUrl, prompt);
// With:
const falResult = yield* fal.generateImageFromUrl(imageUrl, prompt);
// Then fetch the buffer from the CDN URL:
const imageBuffer = yield* Effect.tryPromise({
  try: async () => {
    const res = await fetch(falResult.url);
    const buf = await res.arrayBuffer();
    return { data: Buffer.from(buf), mimeType: falResult.mimeType };
  },
  catch: (e) => e instanceof Error ? e : new Error(String(e)),
});
// Then pass imageBuffer.data + imageBuffer.mimeType to resultService.create (same as before)
```

## Phase 4: Update AppServicesLive

In `packages/api/src/services/index.ts`:
- Replace `GeminiServiceLive` with `FalServiceLive`
- Remove GeminiService export/import

## Phase 5: Update env + cleanup

- Remove `GEMINI_API_KEY` from required env (keep optional for fallback)
- Add `FAL_KEY` to env schema
- Delete or archive `GeminiService.ts` (keep for reference)
- Add `FAL_KEY` to Vercel env vars for babypeek-api project

## Phase 6: Add FAL_KEY to Vercel

```bash
vercel env add FAL_KEY production --project babypeek-api
vercel env add FAL_KEY preview --project babypeek-api  
vercel env add FAL_KEY development --project babypeek-api
```
Get the key from 1Password → "fal.ai API Key" or similar.

## Files to change

### New:
- `packages/api/src/services/FalService.ts`

### Modified:
- `packages/api/src/routes/process.ts` (swap Gemini → Fal)
- `packages/api/src/services/index.ts` (swap layer)
- `packages/api/src/lib/env.ts` (add FAL_KEY)
- `packages/api/package.json` (add @fal-ai/serverless-client)

### Deleted:
- `packages/api/src/services/GeminiService.ts`
- `packages/api/src/lib/gemini.ts` (gemini client config)
- `packages/api/src/prompts/baby-portrait.ts` (replace with simpler fal prompt)

## Prompt for BabyPeek fal generation

```
Transform this 4D ultrasound image into a photorealistic baby portrait photo. 
Generate a beautiful, lifelike photograph of the newborn baby's face with soft 
natural lighting, warm skin tones, and gentle features. The portrait should look 
like a professional newborn photography session.
```

---

## UPDATE: Model & Prompt Strategy

Generate 4 images total:
- 2 × `fal-ai/nano-banana-pro` (each with a different prompt)
- 2 × `fal-ai/nano-banana-2` (each with a different prompt)

Replace the PROMPT_VARIANTS array with this approach:

```typescript
const BABY_PORTRAIT_PROMPTS = [
  // Prompt A — warm, golden hour newborn
  "Transform this 4D ultrasound image into a photorealistic newborn baby portrait. Generate a beautiful photograph with soft golden hour lighting, warm skin tones, delicate features, and a peaceful expression. Style: professional newborn photography, bokeh background, warm tones.",

  // Prompt B — studio, clean white
  "Convert this ultrasound scan into a lifelike newborn baby photo. Generate a studio-quality portrait with clean white background, soft diffused lighting, perfect skin detail, and a serene sleeping pose. Style: high-end baby portrait photography, crisp and clean.",

  // Prompt C — natural light, cozy
  "From this 4D ultrasound, generate a realistic newborn baby portrait photo. Use natural window light, soft shadows, warm blanket setting, tiny hands visible. Style: lifestyle newborn photography, authentic and tender.",

  // Prompt D — dreamy pastel
  "Create a photorealistic baby portrait from this ultrasound image. Generate a dreamy portrait with soft pastel tones, gentle lighting, angelic features, peaceful sleeping expression. Style: fine art newborn photography, ethereal and soft.",
] as const;

const FAL_MODELS = ["fal-ai/nano-banana-pro", "fal-ai/nano-banana-2"] as const;

// Assignment:
// Variant 1: nano-banana-pro + prompt A
// Variant 2: nano-banana-pro + prompt B  
// Variant 3: nano-banana-2  + prompt C
// Variant 4: nano-banana-2  + prompt D
const PROMPT_MODEL_VARIANTS = [
  { model: "fal-ai/nano-banana-pro", prompt: BABY_PORTRAIT_PROMPTS[0] },
  { model: "fal-ai/nano-banana-pro", prompt: BABY_PORTRAIT_PROMPTS[1] },
  { model: "fal-ai/nano-banana-2",   prompt: BABY_PORTRAIT_PROMPTS[2] },
  { model: "fal-ai/nano-banana-2",   prompt: BABY_PORTRAIT_PROMPTS[3] },
] as const;
```

FalService must accept `model` as a parameter:
```typescript
generateImageFromUrl: (imageUrl: string, prompt: string, model: string) => Effect.Effect<FalGeneratedImage, Error>
```

In process.ts, loop over PROMPT_MODEL_VARIANTS (4 items) instead of PROMPT_VARIANTS.
