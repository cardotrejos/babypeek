/**
 * Workflow prompt/model configuration.
 *
 * Re-exports the shared baby portrait prompt variants and the fal.ai model ID
 * used by the workflow-based generation path.
 */

import {
  PROMPTS,
  type PromptVersion,
  DEFAULT_PROMPT_VERSION,
  getPrompt,
  UPSCALE_PROMPT,
} from "../prompts/baby-portrait";

export const FAL_MODEL = "fal-ai/nano-banana-pro" as const;

export { PROMPTS, type PromptVersion, DEFAULT_PROMPT_VERSION, UPSCALE_PROMPT };

// Kept for backward compatibility with any callers expecting this symbol.
export const DEFAULT_PROMPT = getPrompt(DEFAULT_PROMPT_VERSION);

// Legacy alias used in older workflow code paths.
export const BABY_PORTRAIT_PROMPT = getPrompt("v3");
