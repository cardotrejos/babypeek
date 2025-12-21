/**
 * Watermark Service
 *
 * Applies watermarks and resizes images for preview generation.
 * Uses Sharp for image processing.
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
import sharp from "sharp"
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
  const {
    text = "3d-ultra.com",
    opacity = 0.4,
    widthPercent = 0.15,
    marginPercent = 0.03,
  } = options

  // Get image metadata
  const metadata = yield* Effect.tryPromise({
    try: () => sharp(imageBuffer).metadata(),
    catch: (e) =>
      new WatermarkError({
        cause: "SHARP_FAILED",
        message: `Failed to read image metadata: ${e}`,
      }),
  })

  if (!metadata.width || !metadata.height) {
    return yield* Effect.fail(
      new WatermarkError({
        cause: "INVALID_IMAGE",
        message: "Image has no dimensions",
      })
    )
  }

  const imageWidth = metadata.width
  const imageHeight = metadata.height

  // Calculate watermark size (15% of width)
  const watermarkWidth = Math.floor(imageWidth * widthPercent)
  const fontSize = Math.max(12, Math.floor(watermarkWidth / 6))
  const watermarkHeight = Math.ceil(fontSize * 1.5)

  // Calculate margin (3% from edges)
  const margin = Math.floor(Math.min(imageWidth, imageHeight) * marginPercent)

  // Generate watermark SVG with text
  const watermarkSvg = Buffer.from(`
    <svg width="${watermarkWidth}" height="${watermarkHeight}">
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}px"
        font-weight="600"
        fill="rgba(255, 255, 255, ${opacity})"
        stroke="rgba(0, 0, 0, ${opacity * 0.3})"
        stroke-width="1"
      >
        ${text}
      </text>
    </svg>
  `)

  // Calculate position for bottom-right placement with margin
  const top = imageHeight - watermarkHeight - margin
  const left = imageWidth - watermarkWidth - margin

  // Composite watermark onto image
  const watermarked = yield* Effect.tryPromise({
    try: () =>
      sharp(imageBuffer)
        .composite([
          {
            input: watermarkSvg,
            top: Math.max(0, top),
            left: Math.max(0, left),
          },
        ])
        .jpeg({ quality: 85 })
        .toBuffer(),
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
  const resized = yield* Effect.tryPromise({
    try: () =>
      sharp(imageBuffer)
        .resize(maxDimension, maxDimension, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer(),
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
