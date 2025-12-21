/**
 * Gemini AI Client
 *
 * Initializes and exports the Google Generative AI client for Gemini native image generation.
 * Used for transforming 4D ultrasound images into photorealistic baby portraits.
 *
 * Models (from official Google docs - guide-nano-banana.md):
 * - gemini-2.5-flash-preview-05-20: Fast image generation (Nano Banana)
 * - gemini-2.0-flash-exp-image-generation: Experimental image generation
 *
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 * @see Story 4.2.1 - Prompt Optimization (Nano Banana Pro Style)
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"
import { env, isGeminiConfigured } from "./env"

// =============================================================================
// Gemini Client Initialization
// =============================================================================

let cachedClient: GoogleGenerativeAI | null = null

/**
 * Get the Gemini AI client.
 * Returns null if GEMINI_API_KEY is not configured.
 */
export const getGeminiClient = (): GoogleGenerativeAI | null => {
  if (!isGeminiConfigured()) {
    return null
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(env.GEMINI_API_KEY!)
  }

  return cachedClient
}

// =============================================================================
// Model Configuration
// =============================================================================

/**
 * Available Gemini models for image generation.
 *
 * From official Google docs (guide-nano-banana.md):
 * - gemini-3-pro-image-preview: Nano Banana Pro - Best quality, thinking mode, 4K, up to 14 refs
 * - gemini-2.5-flash-image: Nano Banana - Fast generation, good quality
 *
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
export const GEMINI_MODELS = {
  /** Nano Banana Pro - Best quality, thinking mode, 4K output, up to 14 reference images */
  PRO_IMAGE: "gemini-3-pro-image-preview",
  /** Nano Banana - Fast image generation, good quality */
  FLASH_IMAGE: "gemini-2.5-flash-image",
} as const

export type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS]

/**
 * Default model for image generation.
 * Using gemini-3-pro-image-preview (Nano Banana Pro) for highest quality output.
 * 
 * Features:
 * - Up to 14 reference images (6 objects + 5 humans)
 * - 1K/2K/4K resolution output
 * - Thinking mode for complex prompts
 * - Best-in-class image quality
 */
export const IMAGEN_MODEL: GeminiModel = GEMINI_MODELS.PRO_IMAGE

/**
 * Safety settings for Gemini API calls.
 * These settings help prevent inappropriate content generation.
 */
export const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
]

// =============================================================================
// Image Generation Configuration
// =============================================================================

/**
 * Supported aspect ratios for image generation.
 * From official Google docs.
 */
export const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"] as const
export type AspectRatio = (typeof ASPECT_RATIOS)[number]

/**
 * Supported image sizes/resolutions.
 * From official Google docs.
 */
export const IMAGE_SIZES = ["1K", "2K", "4K"] as const
export type ImageSize = (typeof IMAGE_SIZES)[number]

/**
 * Image generation configuration options.
 */
export interface ImageGenerationConfig {
  /** Aspect ratio for the generated image */
  aspectRatio?: AspectRatio
  /** Output resolution (1K, 2K, or 4K) */
  imageSize?: ImageSize
}

/**
 * Default image generation configuration.
 */
export const DEFAULT_IMAGE_CONFIG: ImageGenerationConfig = {
  aspectRatio: "1:1",
  imageSize: "1K",
}

/**
 * Generation configuration for the model.
 * Note: responseModalities is set at model initialization for image output.
 */
export const GENERATION_CONFIG = {
  temperature: 0.4, // Lower for more consistent outputs
  topK: 32,
  topP: 1,
  maxOutputTokens: 4096,
}

// =============================================================================
// Image Processing Helpers
// =============================================================================

/**
 * Convert a Buffer to base64-encoded image data for the Gemini API.
 */
export const bufferToBase64 = (buffer: Buffer, _mimeType?: string): string => {
  return buffer.toString("base64")
}

/**
 * Convert base64 image data back to a Buffer.
 */
export const base64ToBuffer = (base64: string): Buffer => {
  return Buffer.from(base64, "base64")
}

/**
 * Infer MIME type from buffer magic bytes.
 */
export const inferMimeType = (buffer: Buffer): string => {
  // JPEG magic bytes: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg"
  }
  // PNG magic bytes: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png"
  }
  // WebP magic bytes: 52 49 46 46 ... 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return "image/webp"
  }
  // Default to JPEG
  return "image/jpeg"
}
