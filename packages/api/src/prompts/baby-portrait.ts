/**
 * Baby portrait prompts for fal.ai generation.
 */

const BASE_FAL_PROMPT = `Transform this 4D ultrasound image into a photorealistic baby portrait photo.
Generate a beautiful, lifelike photograph of the newborn baby's face with soft
natural lighting, warm skin tones, and gentle features. The portrait should look
like a professional newborn photography session.`.trim();

export const BABY_PORTRAIT_PROMPT_V3 = BASE_FAL_PROMPT;

export const V3_NEGATIVE_PROMPT = [
  "text",
  "watermark",
  "logo",
  "date stamp",
  "blur",
  "deformed anatomy",
  "extra limbs",
  "plastic skin",
] as const;

export const BABY_PORTRAIT_PROMPT_V3_JSON = {
  task: "transform_ultrasound_to_photoreal_baby_portrait",
  style: "soft natural newborn photo",
  constraints: {
    preserve_face_orientation: true,
    preserve_visible_anatomy: true,
    keep_changes_minimal: true,
  },
  lighting: "soft natural lighting",
  tones: "warm realistic skin tones",
  negatives: V3_NEGATIVE_PROMPT,
} as const;

export function getV3JsonPromptAsString(): string {
  return JSON.stringify(BABY_PORTRAIT_PROMPT_V3_JSON, null, 2);
}

export const UPSCALE_PROMPT = `Enhance this baby portrait with subtle detail and clarity.
Preserve composition and anatomy exactly. Do not add any text or overlays.`.trim();

export const BABY_PORTRAIT_PROMPT_V4 = `${BASE_FAL_PROMPT}
Use a slightly wider framing with subtle amniotic ambience while keeping the baby as the clear focal point.`;

export const BABY_PORTRAIT_PROMPT_V4_JSON = {
  task: "transform_ultrasound_to_cinematic_baby_portrait",
  style: "documentary newborn portrait",
  framing: "slightly wider than close-up",
  constraints: {
    preserve_pose: true,
    preserve_facial_proportions: true,
    avoid_non_photoreal_outputs: true,
  },
  lighting: "warm cinematic softness",
  negatives: [
    ...V3_NEGATIVE_PROMPT,
    "cgi",
    "3d render",
    "harsh shadows",
  ],
} as const;

export function getV4JsonPromptAsString(): string {
  return JSON.stringify(BABY_PORTRAIT_PROMPT_V4_JSON, null, 2);
}

export type PromptStyle = "in-utero" | "national-geographic";

export type PromptFormat = "prose" | "json";

export const PROMPT_METADATA = {
  v3: { style: "in-utero" as PromptStyle, format: "prose" as PromptFormat },
  "v3-json": { style: "in-utero" as PromptStyle, format: "json" as PromptFormat },
  v4: { style: "national-geographic" as PromptStyle, format: "prose" as PromptFormat },
  "v4-json": { style: "national-geographic" as PromptStyle, format: "json" as PromptFormat },
} as const;

export const PROMPTS = {
  v3: BABY_PORTRAIT_PROMPT_V3,
  "v3-json": getV3JsonPromptAsString(),
  v4: BABY_PORTRAIT_PROMPT_V4,
  "v4-json": getV4JsonPromptAsString(),
} as const;

export type PromptVersion = keyof typeof PROMPTS;

export const DEFAULT_PROMPT_VERSION: PromptVersion = "v4";

export function getPrompt(version: PromptVersion = DEFAULT_PROMPT_VERSION): string {
  return PROMPTS[version];
}

export function getV3JsonPrompt(): typeof BABY_PORTRAIT_PROMPT_V3_JSON {
  return BABY_PORTRAIT_PROMPT_V3_JSON;
}

export function getUpscalePrompt(): string {
  return UPSCALE_PROMPT;
}

export function getPromptMetadata(version: PromptVersion): (typeof PROMPT_METADATA)[PromptVersion] {
  return PROMPT_METADATA[version];
}

export function getAvailableVersions(): PromptVersion[] {
  return Object.keys(PROMPTS) as PromptVersion[];
}
