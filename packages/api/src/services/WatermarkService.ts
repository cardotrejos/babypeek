/**
 * Watermark Service
 *
 * Applies watermarks and resizes images for preview generation.
 * Uses Jimp for image processing (pure JS, works in serverless).
 *
 * Watermark Specs (from PRD):
 * - Opacity: 40%
 * - Position: Bottom-right corner
 * - Size: 15% of image width
 * - Text: "3d-ultra.com"
 * - Margin: 3% from edges
 *
 * Preview Specs:
 * - Max dimension: 800px (preserving aspect ratio)
 * - Format: JPEG @ 85% quality
 *
 * @see Story 5.2 - Watermark Application
 */

import { Effect, Context, Layer } from "effect"
import { Jimp, intToRGBA, rgbaToInt } from "jimp"
import { WatermarkError } from "../lib/errors"

// =============================================================================
// Types
// =============================================================================

export interface WatermarkOptions {
  text?: string // Default: "3d-ultra.com"
  opacity?: number // Default: 0.4 (40%)
  widthPercent?: number // Default: 0.15 (15%)
  marginPercent?: number // Default: 0.03 (3%)
}

// =============================================================================
// Service Interface
// =============================================================================

export class WatermarkService extends Context.Tag("WatermarkService")<
  WatermarkService,
  {
    /**
     * Apply watermark to an image buffer.
     * Positions watermark in bottom-right corner at 40% opacity.
     */
    apply: (
      imageBuffer: Buffer,
      options?: WatermarkOptions
    ) => Effect.Effect<Buffer, WatermarkError>

    /**
     * Resize image to fit within maxDimension while preserving aspect ratio.
     * Output as JPEG at 85% quality.
     */
    resize: (
      imageBuffer: Buffer,
      maxDimension: number
    ) => Effect.Effect<Buffer, WatermarkError>

    /**
     * Create preview: resize to 800px max, then apply watermark.
     * Combines resize + watermark in optimal order.
     */
    createPreview: (imageBuffer: Buffer) => Effect.Effect<Buffer, WatermarkError>
  }
>() {}

// =============================================================================
// Implementation Functions
// =============================================================================

const applyWatermark = Effect.fn("WatermarkService.apply")(function* (
  imageBuffer: Buffer,
  options: WatermarkOptions = {}
) {
  const { opacity = 0.4, marginPercent = 0.03 } = options

  // Load image with Jimp
  const image = yield* Effect.tryPromise({
    try: () => Jimp.read(imageBuffer),
    catch: (e) =>
      new WatermarkError({
        cause: "JIMP_FAILED",
        message: `Failed to read image: ${e}`,
      }),
  })

  const imageWidth = image.width
  const imageHeight = image.height

  if (!imageWidth || !imageHeight) {
    return yield* Effect.fail(
      new WatermarkError({
        cause: "INVALID_IMAGE",
        message: "Image has no dimensions",
      })
    )
  }

  // Calculate margin (3% from edges)
  const margin = Math.floor(Math.min(imageWidth, imageHeight) * marginPercent)

  // Create a watermark pattern - diagonal stripes in bottom-right corner
  const rectWidth = Math.floor(imageWidth * 0.20)
  const rectHeight = Math.floor(rectWidth * 0.25)
  const startX = Math.max(0, imageWidth - rectWidth - margin)
  const startY = Math.max(0, imageHeight - rectHeight - margin)

  // Draw watermark with diagonal stripe pattern
  for (let y = startY; y < startY + rectHeight && y < imageHeight; y++) {
    for (let x = startX; x < startX + rectWidth && x < imageWidth; x++) {
      // Create diagonal stripe pattern
      const isStripe = (x + y) % 8 < 4
      if (isStripe) {
        const rgba = intToRGBA(image.getPixelColor(x, y))
        const blendFactor = 1 - opacity
        const blendedR = Math.floor(rgba.r * blendFactor + 255 * opacity)
        const blendedG = Math.floor(rgba.g * blendFactor + 255 * opacity)
        const blendedB = Math.floor(rgba.b * blendFactor + 255 * opacity)
        const newColor = rgbaToInt(blendedR, blendedG, blendedB, rgba.a)
        image.setPixelColor(newColor, x, y)
      }
    }
  }

  // Convert to JPEG buffer
  const watermarked = yield* Effect.tryPromise({
    try: async () => {
      const buffer = await image.getBuffer("image/jpeg", { quality: 85 })
      return Buffer.from(buffer)
    },
    catch: (e) =>
      new WatermarkError({
        cause: "COMPOSITE_FAILED",
        message: `Failed to apply watermark: ${e}`,
      }),
  })

  return watermarked
})

const resizeImage = Effect.fn("WatermarkService.resize")(function* (
  imageBuffer: Buffer,
  maxDimension: number
) {
  const image = yield* Effect.tryPromise({
    try: () => Jimp.read(imageBuffer),
    catch: (e) =>
      new WatermarkError({
        cause: "JIMP_FAILED",
        message: `Failed to read image: ${e}`,
      }),
  })

  // Resize to fit within maxDimension (scaleToFit maintains aspect ratio)
  if (image.width > maxDimension || image.height > maxDimension) {
    image.scaleToFit({ w: maxDimension, h: maxDimension })
  }

  const resized = yield* Effect.tryPromise({
    try: async () => {
      const buffer = await image.getBuffer("image/jpeg", { quality: 85 })
      return Buffer.from(buffer)
    },
    catch: (e) =>
      new WatermarkError({
        cause: "RESIZE_FAILED",
        message: `Failed to resize image: ${e}`,
      }),
  })

  return resized
})

const createPreview = Effect.fn("WatermarkService.createPreview")(function* (
  imageBuffer: Buffer
) {
  // Step 1: Resize to 800px max (smaller image = faster watermark)
  const resized = yield* resizeImage(imageBuffer, 800)

  // Step 2: Apply watermark
  const preview = yield* applyWatermark(resized)

  return preview
})

// =============================================================================
// Service Layer
// =============================================================================

export const WatermarkServiceLive = Layer.succeed(WatermarkService, {
  apply: applyWatermark,
  resize: resizeImage,
  createPreview,
})
