/**
 * Baby Portrait Prompt Template
 *
 * This module contains the structured prompt template used for transforming
 * 4D ultrasound images into photorealistic baby portraits using Gemini Imagen 3.
 *
 * The prompt is designed to:
 * - Produce warm, high-quality newborn photography aesthetic
 * - Match visible facial features from the ultrasound
 * - Follow safety guidelines to avoid controversial outputs
 * - Support A/B testing with versioned prompts
 *
 * @see Story 4.2 - Gemini Imagen 3 Integration
 */

// =============================================================================
// Prompt Template v1
// =============================================================================

/**
 * Primary prompt for ultrasound-to-photorealistic baby portrait conversion.
 *
 * Design rationale:
 * - Clear instruction structure for the AI model
 * - Emphasis on matching ultrasound features for personalization
 * - Professional newborn photography aesthetic for emotional appeal
 * - Safety guidelines to prevent inappropriate outputs
 * - Warm, magical tone aligned with product positioning (gift for parents)
 */
export const BABY_PORTRAIT_PROMPT_V1 = `
Transform this 4D ultrasound image into a photorealistic portrait of the baby.

Instructions:
- Create a warm, soft portrait of a newborn baby
- Match the facial features visible in the ultrasound (face shape, nose, lips, cheeks)
- Use soft, natural lighting as if in a nursery setting
- Background should be neutral, warm, and softly blurred
- Baby should appear peaceful, serene, and comfortable
- Skin tone should be realistic, healthy, and natural
- Eyes can be gently closed or softly gazing

Style guidelines:
- Photorealistic rendering, not cartoonish or stylized
- Professional newborn photography aesthetic
- Warm color palette with soft pinks, creams, and natural skin tones
- High resolution with fine detail
- Soft focus on background, sharp focus on baby's face

Safety guidelines:
- Do not generate any inappropriate or disturbing content
- Maintain dignity and respect for the baby
- No medical instruments, clinical elements, or hospital equipment in output
- No text, watermarks, or overlays
- Ensure output is suitable for all audiences

This is a precious gift for expecting parents - make it magical and heartwarming.
`.trim()

// =============================================================================
// Alternative Prompts for A/B Testing
// =============================================================================

/**
 * Alternative prompt v2 - More concise, focused on key features.
 * Can be tested against v1 to measure conversion and satisfaction.
 */
export const BABY_PORTRAIT_PROMPT_V2 = `
Create a photorealistic newborn baby portrait based on this 4D ultrasound image.

Key requirements:
- Match the baby's facial features from the ultrasound (face shape, nose, lips)
- Professional newborn photography style with soft, warm lighting
- Neutral, softly blurred background
- Baby appears peaceful with eyes gently closed
- Natural, healthy skin tone
- High quality, detailed rendering

Output should be:
- Suitable for framing as a gift for parents
- Warm, heartwarming, and magical
- Free of any medical or clinical elements
- Safe for all audiences
`.trim()

// =============================================================================
// Prompt Registry
// =============================================================================

/**
 * All available prompt versions for A/B testing.
 */
export const PROMPTS = {
  v1: BABY_PORTRAIT_PROMPT_V1,
  v2: BABY_PORTRAIT_PROMPT_V2,
} as const

/**
 * Available prompt version identifiers.
 */
export type PromptVersion = keyof typeof PROMPTS

/**
 * Default prompt version to use.
 */
export const DEFAULT_PROMPT_VERSION: PromptVersion = "v1"

// =============================================================================
// Prompt Retrieval
// =============================================================================

/**
 * Get the prompt template for a specific version.
 *
 * @param version - The prompt version to retrieve (defaults to v1)
 * @returns The prompt string
 *
 * @example
 * ```typescript
 * const prompt = getPrompt('v1')
 * const result = await geminiService.generateImage(imageUrl, prompt)
 * ```
 */
export function getPrompt(version: PromptVersion = DEFAULT_PROMPT_VERSION): string {
  return PROMPTS[version]
}

/**
 * Get all available prompt versions.
 *
 * @returns Array of version identifiers
 */
export function getAvailableVersions(): PromptVersion[] {
  return Object.keys(PROMPTS) as PromptVersion[]
}
