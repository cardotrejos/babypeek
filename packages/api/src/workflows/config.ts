/**
 * Workflow Configuration (Isolated from Effect)
 * 
 * Plain TypeScript configuration for the workflow.
 * No Effect dependencies - safe to use in workflow steps.
 */

// =============================================================================
// Model Configuration
// =============================================================================

/**
 * Gemini model for image generation.
 * Using Nano Banana Pro for highest quality output.
 */
export const GEMINI_MODEL = "gemini-3-pro-image-preview" as const

/**
 * Safety settings for Gemini API.
 */
export const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
] as const

// =============================================================================
// Prompt Configuration
// =============================================================================

/**
 * V3 Prompt: In-utero photorealistic style based on Nano Banana Pro guide.
 *
 * This prompt produces the "Linus Ekenstam" viral quality:
 * - Baby appears inside the womb with amniotic fluid
 * - Warm amber/red transillumination lighting
 * - Strict anatomy lock (preserves pose, facial proportions)
 * - Subsurface scattering for realistic translucent skin
 * - Medical macro photography aesthetic
 */
export const BABY_PORTRAIT_PROMPT = `
Edit task: Transform this 4D ultrasound into a single-frame ultra-realistic in-utero photograph.

Reference priority:
1. Keep the exact pose, head angle, facial proportions, and framing from the input image.
2. Match facial geometry exactly (identity lock).
3. Match hand/finger count and placement if visible (anatomy lock).

What to change (only): Replace ultrasound material/shading with real photographic detail:
- Realistic eyelids, lips, nose, soft cheeks
- Subtle peach fuzz (lanugo)
- Natural skin micro-texture and mild mottling
- Physically plausible subsurface scattering (translucent, not plastic)

Scene: Inside the womb with amniotic fluid haze and a few floating specks. No extra objects.

Lighting/optics:
- Warm amber/red transillumination through tissue
- Gentle bloom and soft falloff
- Shallow depth of field (macro portrait look, 50-85mm equivalent, ~f/2)
- Slight vignette
- Candid medical macro photo aesthetic (not studio portrait)

Constraint: Make as few changes as possible beyond converting ultrasound rendering into a photoreal photo while keeping anatomy locked.

Negative prompt: no date stamp, no text, no watermark, no border, not rustic, not aged, no CGI, no 3D render, no plastic/waxy skin, no beauty filter, no over-smoothing, no over-sharpening, no HDR look, no extra fingers, no missing fingers, no fused fingers, no duplicated facial features, no warped anatomy
`.trim()

/**
 * Upscale prompt for optional second-pass enhancement.
 */
export const UPSCALE_PROMPT = `
Upscale to 4K and lightly restore. Preserve the exact image content and composition.
Increase fine skin detail and realistic grain subtly.
Do not introduce new features, text, or anatomy changes.
`.trim()
