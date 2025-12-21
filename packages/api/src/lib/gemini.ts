/**
 * Gemini AI Client
 *
 * Initializes and exports the Google Generative AI client for Gemini Imagen 3.
 * Used for transforming 4D ultrasound images into photorealistic baby portraits.
 *
 * @see https://ai.google.dev/gemini-api/docs
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
 * Model name for Gemini Imagen 3 image generation.
 * Note: The exact model name may vary - verify with Google AI Studio.
 */
export const IMAGEN_MODEL = "gemini-2.0-flash-exp" // Vision model with image understanding

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

/**
 * Generation configuration for image generation.
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
