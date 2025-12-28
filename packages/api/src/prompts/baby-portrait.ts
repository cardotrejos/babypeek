/**
 * Baby Portrait Prompt Template
 *
 * This module contains the structured prompt templates used for transforming
 * 4D ultrasound images into photorealistic baby portraits using Gemini's
 * native image generation (Nano Banana Pro - gemini-3-pro-image-preview).
 *
 * Prompt Style: "In-utero" - baby inside womb, Linus Ekenstam viral quality
 *
 * Based on the Nano Banana Pro guide (fofr.ai) and official Google documentation
 * for optimal image generation.
 *
 * @see Story 4.2 - Gemini Imagen 3 Integration
 * @see Story 4.2.1 - Prompt Optimization (Nano Banana Pro Style)
 * @see nano-banana-prompt.md - Prompting guide
 * @see guide-nano-banana.md - Official Google documentation
 */

// =============================================================================
// Prompt Template v3 - In-Utero Style (Nano Banana Pro)
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
 *
 * @see nano-banana-prompt.md for full guide
 */
export const BABY_PORTRAIT_PROMPT_V3 = `
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
`.trim();

/**
 * Comprehensive negative prompt for v3.
 * Can be appended or used separately with JSON prompts.
 */
export const V3_NEGATIVE_PROMPT = [
  "date stamp",
  "text",
  "watermark",
  "border",
  "rustic",
  "aged look",
  "CGI",
  "3D render",
  "plastic skin",
  "waxy skin",
  "beauty filter",
  "over-smoothed skin",
  "over-sharpened",
  "HDR look",
  "extra fingers",
  "missing fingers",
  "fused fingers",
  "duplicated facial features",
  "warped anatomy",
] as const;

// =============================================================================
// Prompt Template v3-json - Structured JSON Format
// =============================================================================

/**
 * V3 JSON Prompt: Structured format for maximum control.
 *
 * Use this format when you need fine-grained control over each aspect
 * of the generation. Nano Banana Pro accepts JSON prompts directly.
 *
 * @see guide-nano-banana.md - JSON prompting section
 */
export const BABY_PORTRAIT_PROMPT_V3_JSON = {
  task: "edit_ultrasound_to_photoreal_inutero_photo",
  referencePriority: [
    "Input image: framing + pose lock",
    "Input image: face geometry / identity lock",
    "Input image: hand anatomy lock (if visible)",
  ],
  constraints: {
    keepPose: true,
    keepFraming: true,
    keepFacialProportions: true,
    noAnatomyChanges: true,
    minimalChanges: "only convert ultrasound rendering to photoreal",
  },
  subject: {
    type: "late-term fetus",
    expression: "relaxed, eyes closed",
    details: [
      "natural eyelids",
      "natural lips",
      "soft cheeks",
      "subtle peach fuzz (lanugo)",
      "skin micro-texture",
      "subsurface scattering",
      "mild skin mottling",
    ],
  },
  environment: {
    setting: "inside womb",
    elements: ["amniotic fluid haze", "subtle floating specks"],
    forbidden: ["props", "extra objects", "text", "borders", "medical equipment"],
  },
  lighting: {
    type: "warm transillumination",
    tone: "amber/red",
    effects: ["soft bloom", "gentle falloff", "slight vignette"],
  },
  camera: {
    style: "candid medical macro photo",
    focalRange: "50-85mm equivalent",
    depthOfField: "shallow (around f/2 look)",
  },
  negatives: V3_NEGATIVE_PROMPT,
} as const;

/**
 * Get the v3 JSON prompt as a formatted string.
 * Useful when the API expects a string but you want JSON structure.
 */
export function getV3JsonPromptAsString(): string {
  return JSON.stringify(BABY_PORTRAIT_PROMPT_V3_JSON, null, 2);
}

// =============================================================================
// Upscale/Restore Prompt
// =============================================================================

/**
 * Upscale prompt for optional second-pass enhancement.
 * Run on the generated image to increase resolution while preserving details.
 *
 * @see nano-banana-prompt.md - Two-step pipeline
 */
export const UPSCALE_PROMPT = `
Upscale to 4K and lightly restore. Preserve the exact image content and composition.
Increase fine skin detail and realistic grain subtly.
Do not introduce new features, text, or anatomy changes.
`.trim();

// =============================================================================
// Prompt Template v4 - National Geographic / Linus Ekenstam Style
// =============================================================================

/**
 * V4 Prompt: "Zoomed out womb" style like Linus Ekenstam viral images.
 *
 * Key differences from v3:
 * - Baby appears in wider view, not just face crop
 * - Visible womb membrane/boundary around baby
 * - Dark void/black background beyond the womb
 * - Baby "floating" in amniotic fluid
 * - More visible body (hands, arms if in original)
 * - National Geographic documentary photography style
 *
 * @see IMG_9994.jpg, IMG_9995.jpg for reference
 */
export const BABY_PORTRAIT_PROMPT_V4 = `
Edit task: Transform this 4D ultrasound into a hyper-realistic in-utero photograph as if captured by National Geographic inside the womb.

CRITICAL - Composition:
- DO NOT crop tightly to just the face
- Show the baby floating inside the womb cavity
- Include visible body parts as shown in the original (hands, arms, shoulders)
- Surround the baby with the glowing womb membrane/boundary
- Dark void/black background OUTSIDE the womb membrane
- The womb should appear as a luminous, semi-translucent organic sphere containing the baby

Reference priority:
1. Keep the exact pose, head angle, facial proportions from the input image
2. Match all visible body parts (hands, fingers, arms) exactly as positioned
3. Preserve the framing scale - if hands are visible, keep them visible

What to change: Replace ultrasound rendering with real photographic detail:
- Realistic skin texture with visible peach fuzz (lanugo)
- Natural skin micro-texture, mild mottling, subsurface scattering
- Realistic eyelids, lips, nose
- Amniotic fluid with suspended particles and subtle caustics
- Visible womb membrane with organic veined texture (like the National Geographic embryo photos)

Lighting:
- Warm amber/red transillumination FROM the womb walls
- Baby illuminated by light passing through tissue (subsurface glow)
- Dark exterior void beyond the womb
- Rim lighting on baby's silhouette from womb glow
- Floating dust particles catching light in the amniotic fluid

Camera:
- Medium shot showing baby's face AND visible body parts
- Shallow depth of field with the face sharpest
- 35-50mm equivalent for wider field of view
- f/2.8 aperture look

Style: National Geographic documentary photography, Lennart Nilsson "A Child is Born" aesthetic, cinematic medical visualization

Negative prompt: no date stamp, no text, no watermark, no border, not rustic, not aged, no CGI look, no 3D render, no plastic/waxy skin, no beauty filter, no over-smoothing, no over-sharpening, no HDR look, no tight face crop only, no missing the womb context, no extra fingers, no missing fingers, no fused fingers, no duplicated facial features, no warped anatomy
`.trim();

/**
 * V4 JSON Prompt: Structured format for zoomed-out womb style.
 */
export const BABY_PORTRAIT_PROMPT_V4_JSON = {
  task: "edit_ultrasound_to_national_geographic_inutero_photo",
  critical_composition: {
    crop: "DO NOT crop to just the face - show baby floating in womb",
    context: "Include visible womb membrane/boundary around baby",
    background: "Dark void/black background OUTSIDE the womb",
    body: "Show all visible body parts (hands, arms, shoulders) from original",
  },
  referencePriority: [
    "Input image: pose, head angle, facial proportions lock",
    "Input image: all visible body parts (hands, fingers, arms) position lock",
    "Input image: framing scale - preserve what is visible",
  ],
  constraints: {
    keepPose: true,
    keepFraming: false, // We want wider view
    keepFacialProportions: true,
    keepVisibleBodyParts: true,
    showWombContext: true,
    minimalChanges: "convert ultrasound to photoreal with womb membrane visible",
  },
  subject: {
    type: "late-term fetus in womb",
    expression: "relaxed, eyes closed",
    details: [
      "realistic skin texture",
      "visible peach fuzz (lanugo)",
      "natural skin micro-texture",
      "mild mottling",
      "subsurface scattering",
      "realistic eyelids, lips, nose",
    ],
  },
  environment: {
    setting: "inside womb with visible membrane boundary",
    wombMembrane: {
      appearance: "luminous, semi-translucent organic sphere",
      texture: "organic veined texture like National Geographic embryo photos",
      lighting: "glowing from within, amber/red transillumination",
    },
    amnioticFluid: ["suspended particles", "subtle caustics", "floating specks"],
    exterior: "dark void/black background beyond womb membrane",
    forbidden: ["props", "extra objects", "text", "borders", "medical equipment"],
  },
  lighting: {
    type: "transillumination from womb walls",
    tone: "warm amber/red",
    effects: [
      "subsurface glow on baby",
      "rim lighting from womb glow",
      "floating particles catching light",
      "dark exterior contrast",
    ],
  },
  camera: {
    style: "National Geographic documentary photography",
    shotType: "medium shot showing face AND body parts",
    focalRange: "35-50mm equivalent",
    depthOfField: "shallow (around f/2.8)",
    focus: "face sharpest, body slightly soft",
  },
  styleReference: [
    "Lennart Nilsson 'A Child is Born'",
    "National Geographic embryo photography",
    "Linus Ekenstam viral baby reconstructions",
  ],
  negatives: [
    ...V3_NEGATIVE_PROMPT,
    "tight face crop only",
    "missing womb context",
    "no visible womb membrane",
    "floating in void without womb",
  ],
} as const;

/**
 * Get the v4 JSON prompt as a formatted string.
 */
export function getV4JsonPromptAsString(): string {
  return JSON.stringify(BABY_PORTRAIT_PROMPT_V4_JSON, null, 2);
}

// =============================================================================
// Prompt Registry
// =============================================================================

/**
 * Prompt style metadata for analytics.
 */
export type PromptStyle = "in-utero" | "national-geographic";

/**
 * Prompt format type.
 */
export type PromptFormat = "prose" | "json";

/**
 * Prompt metadata for each version.
 */
export const PROMPT_METADATA = {
  v3: { style: "in-utero" as PromptStyle, format: "prose" as PromptFormat },
  "v3-json": { style: "in-utero" as PromptStyle, format: "json" as PromptFormat },
  v4: { style: "national-geographic" as PromptStyle, format: "prose" as PromptFormat },
  "v4-json": { style: "national-geographic" as PromptStyle, format: "json" as PromptFormat },
} as const;

/**
 * All available prompt versions.
 */
export const PROMPTS = {
  v3: BABY_PORTRAIT_PROMPT_V3,
  "v3-json": getV3JsonPromptAsString(),
  v4: BABY_PORTRAIT_PROMPT_V4,
  "v4-json": getV4JsonPromptAsString(),
} as const;

/**
 * Available prompt version identifiers.
 */
export type PromptVersion = keyof typeof PROMPTS;

/**
 * Default prompt version to use.
 *
 * v3: Close-up face portrait (tight crop)
 * v4: National Geographic style - zoomed out with visible womb membrane (Linus Ekenstam style)
 */
export const DEFAULT_PROMPT_VERSION: PromptVersion = "v4";

// =============================================================================
// Prompt Retrieval
// =============================================================================

/**
 * Get the prompt template for a specific version.
 *
 * @param version - The prompt version to retrieve (defaults to v3)
 * @returns The prompt string
 *
 * @example
 * ```typescript
 * const prompt = getPrompt('v3')       // Prose format (default)
 * const prompt = getPrompt('v3-json')  // JSON format
 * const result = await geminiService.generateImage(imageBuffer, prompt)
 * ```
 */
export function getPrompt(version: PromptVersion = DEFAULT_PROMPT_VERSION): string {
  return PROMPTS[version];
}

/**
 * Get the v3 JSON prompt object (not stringified).
 * Useful when you need to modify or extend the prompt structure.
 *
 * @returns The v3 JSON prompt object
 */
export function getV3JsonPrompt(): typeof BABY_PORTRAIT_PROMPT_V3_JSON {
  return BABY_PORTRAIT_PROMPT_V3_JSON;
}

/**
 * Get the upscale prompt for optional second-pass enhancement.
 *
 * @returns The upscale prompt string
 */
export function getUpscalePrompt(): string {
  return UPSCALE_PROMPT;
}

/**
 * Get metadata for a specific prompt version.
 *
 * @param version - The prompt version
 * @returns Metadata including style and format
 */
export function getPromptMetadata(version: PromptVersion): (typeof PROMPT_METADATA)[PromptVersion] {
  return PROMPT_METADATA[version];
}

/**
 * Get all available prompt versions.
 *
 * @returns Array of version identifiers
 */
export function getAvailableVersions(): PromptVersion[] {
  return Object.keys(PROMPTS) as PromptVersion[];
}
