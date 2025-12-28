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
export const GEMINI_MODEL = "gemini-3-pro-image-preview" as const;

/**
 * Safety settings for Gemini API.
 */
export const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
] as const;

// =============================================================================
// Prompt Configuration
// =============================================================================

/**
 * V3 Prompt: In-utero close-up photorealistic style.
 * Tight crop on face, macro portrait look.
 */
export const PROMPT_V3 = `
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
 * V3 JSON Prompt: Structured format for v3 style.
 */
export const PROMPT_V3_JSON = JSON.stringify(
  {
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
    negatives: [
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
    ],
  },
  null,
  2,
);

/**
 * V4 Prompt: National Geographic / Linus Ekenstam style.
 * Zoomed out with visible womb membrane, baby floating in amniotic fluid.
 */
export const PROMPT_V4 = `
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
 * V4 JSON Prompt: Structured format for National Geographic style.
 */
export const PROMPT_V4_JSON = JSON.stringify(
  {
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
      keepFraming: false,
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
      "tight face crop only",
      "missing womb context",
      "no visible womb membrane",
      "floating in void without womb",
    ],
  },
  null,
  2,
);

// Prompt version type
export type PromptVersion = "v3" | "v3-json" | "v4" | "v4-json";

// All prompts map
export const PROMPTS: Record<PromptVersion, string> = {
  v3: PROMPT_V3,
  "v3-json": PROMPT_V3_JSON,
  v4: PROMPT_V4,
  "v4-json": PROMPT_V4_JSON,
};

// Default prompt version
export const DEFAULT_PROMPT_VERSION: PromptVersion = "v4";

// Default prompt (for backwards compatibility)
export const DEFAULT_PROMPT = PROMPT_V4;

// Legacy alias
export const BABY_PORTRAIT_PROMPT = PROMPT_V3;

/**
 * Upscale prompt for optional second-pass enhancement.
 */
export const UPSCALE_PROMPT = `
Upscale to 4K and lightly restore. Preserve the exact image content and composition.
Increase fine skin detail and realistic grain subtly.
Do not introduce new features, text, or anatomy changes.
`.trim();
