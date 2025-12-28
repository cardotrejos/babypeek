/**
 * Watermark Service
 *
 * Applies watermarks and resizes images for preview generation.
 * Uses Jimp for image processing (pure JS, works in serverless).
 *
 * Watermark Specs (enhanced for better protection):
 * - Multiple diagonal "babypeek.io" text across entire image
 * - Semi-transparent white text with dark outline
 * - Opacity: 25-35% (visible but not intrusive)
 * - Pattern: Repeating diagonal text watermarks
 *
 * Preview Specs:
 * - Max dimension: 800px (preserving aspect ratio)
 * - Format: JPEG @ 85% quality
 *
 * @see Story 5.2 - Watermark Application
 */

import { Effect, Context, Layer } from "effect";
import { Jimp, intToRGBA, rgbaToInt } from "jimp";
import { WatermarkError } from "../lib/errors";

// =============================================================================
// Types
// =============================================================================

export interface WatermarkOptions {
  text?: string; // Default: "babypeek.io"
  opacity?: number; // Default: 0.4 (40%)
  widthPercent?: number; // Default: 0.15 (15%)
  marginPercent?: number; // Default: 0.03 (3%)
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
      options?: WatermarkOptions,
    ) => Effect.Effect<Buffer, WatermarkError>;

    /**
     * Resize image to fit within maxDimension while preserving aspect ratio.
     * Output as JPEG at 85% quality.
     */
    resize: (imageBuffer: Buffer, maxDimension: number) => Effect.Effect<Buffer, WatermarkError>;

    /**
     * Create preview: resize to 800px max, then apply watermark.
     * Combines resize + watermark in optimal order.
     */
    createPreview: (imageBuffer: Buffer) => Effect.Effect<Buffer, WatermarkError>;
  }
>() {}

// =============================================================================
// Implementation Functions
// =============================================================================

/**
 * Draw a diagonal text pattern across the image for watermarking
 * Creates a repeating "babypeek.io" text pattern at 45-degree angle
 */
function drawDiagonalTextPattern(
  image: Awaited<ReturnType<typeof Jimp.read>>,
  opacity: number,
): void {
  const imageWidth = image.width;
  const imageHeight = image.height;

  // Text parameters
  const text = "babypeek.io";
  const charWidth = Math.max(8, Math.floor(imageWidth / 50)); // ~2% of image width per char
  const charHeight = Math.floor(charWidth * 1.5);
  const spacing = Math.floor(imageWidth / 4); // Space between watermark repetitions

  // Simple pixel-based text rendering for "babypeek.io"
  // Each letter is a simple 5x7 pixel pattern scaled up
  const letterPatterns: Record<string, number[][]> = {
    b: [
      [1, 1, 1, 0, 0],
      [1, 0, 0, 1, 0],
      [1, 1, 1, 0, 0],
      [1, 0, 0, 1, 0],
      [1, 0, 0, 1, 0],
      [1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    a: [
      [0, 1, 1, 0, 0],
      [1, 0, 0, 1, 0],
      [1, 0, 0, 1, 0],
      [1, 1, 1, 1, 0],
      [1, 0, 0, 1, 0],
      [1, 0, 0, 1, 0],
      [0, 0, 0, 0, 0],
    ],
    y: [
      [1, 0, 0, 1, 0],
      [1, 0, 0, 1, 0],
      [0, 1, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    p: [
      [1, 1, 1, 0, 0],
      [1, 0, 0, 1, 0],
      [1, 0, 0, 1, 0],
      [1, 1, 1, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    e: [
      [1, 1, 1, 1, 0],
      [1, 0, 0, 0, 0],
      [1, 1, 1, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0],
      [1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ],
    k: [
      [1, 0, 0, 1, 0],
      [1, 0, 1, 0, 0],
      [1, 1, 0, 0, 0],
      [1, 0, 1, 0, 0],
      [1, 0, 0, 1, 0],
      [1, 0, 0, 1, 0],
      [0, 0, 0, 0, 0],
    ],
    ".": [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    i: [
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    o: [
      [0, 1, 1, 0, 0],
      [1, 0, 0, 1, 0],
      [1, 0, 0, 1, 0],
      [1, 0, 0, 1, 0],
      [1, 0, 0, 1, 0],
      [0, 1, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ],
  };

  // Scale factor for letters
  const scale = Math.max(1, Math.floor(charWidth / 5));

  // Draw watermark at multiple positions diagonally
  const drawWatermarkAt = (startX: number, startY: number) => {
    let xOffset = 0;

    for (const char of text) {
      const pattern = letterPatterns[char];
      if (!pattern) continue;

      for (let py = 0; py < pattern.length; py++) {
        const row = pattern[py];
        if (!row) continue;
        for (let px = 0; px < row.length; px++) {
          if (row[px]) {
            // Draw scaled pixel with outline effect
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                const x = startX + xOffset + px * scale + sx;
                const y = startY + py * scale + sy;

                if (x >= 0 && x < imageWidth && y >= 0 && y < imageHeight) {
                  const rgba = intToRGBA(image.getPixelColor(x, y));

                  // White text with slight transparency
                  const blendFactor = 1 - opacity;
                  const blendedR = Math.floor(rgba.r * blendFactor + 255 * opacity);
                  const blendedG = Math.floor(rgba.g * blendFactor + 255 * opacity);
                  const blendedB = Math.floor(rgba.b * blendFactor + 255 * opacity);

                  const newColor = rgbaToInt(blendedR, blendedG, blendedB, rgba.a);
                  image.setPixelColor(newColor, x, y);
                }
              }
            }
          }
        }
      }

      xOffset += 6 * scale; // Move to next character position
    }
  };

  // Draw watermarks in a diagonal pattern across the entire image
  // This makes it very difficult to crop out
  for (
    let diagOffset = -imageHeight;
    diagOffset < imageWidth + imageHeight;
    diagOffset += spacing
  ) {
    // Draw along diagonal lines
    const startX = diagOffset;
    const startY = Math.floor(imageHeight * 0.3); // Start from 30% down

    // Multiple rows of watermarks
    for (let row = 0; row < 3; row++) {
      const rowY = startY + row * spacing * 0.7;
      if (rowY >= 0 && rowY < imageHeight - charHeight * scale) {
        drawWatermarkAt(startX + row * spacing * 0.3, Math.floor(rowY));
      }
    }
  }
}

const applyWatermark = Effect.fn("WatermarkService.apply")(function* (
  imageBuffer: Buffer,
  options: WatermarkOptions = {},
) {
  const { opacity = 0.3 } = options; // 30% opacity - visible but not intrusive

  // Load image with Jimp
  const image = yield* Effect.tryPromise({
    try: () => Jimp.read(imageBuffer),
    catch: (e) =>
      new WatermarkError({
        cause: "JIMP_FAILED",
        message: `Failed to read image: ${e}`,
      }),
  });

  const imageWidth = image.width;
  const imageHeight = image.height;

  if (!imageWidth || !imageHeight) {
    return yield* Effect.fail(
      new WatermarkError({
        cause: "INVALID_IMAGE",
        message: "Image has no dimensions",
      }),
    );
  }

  // Apply diagonal text pattern watermark
  drawDiagonalTextPattern(image, opacity);

  // Convert to JPEG buffer
  const watermarked = yield* Effect.tryPromise({
    try: async () => {
      const buffer = await image.getBuffer("image/jpeg", { quality: 85 });
      return Buffer.from(buffer);
    },
    catch: (e) =>
      new WatermarkError({
        cause: "COMPOSITE_FAILED",
        message: `Failed to apply watermark: ${e}`,
      }),
  });

  return watermarked;
});

const resizeImage = Effect.fn("WatermarkService.resize")(function* (
  imageBuffer: Buffer,
  maxDimension: number,
) {
  const image = yield* Effect.tryPromise({
    try: () => Jimp.read(imageBuffer),
    catch: (e) =>
      new WatermarkError({
        cause: "JIMP_FAILED",
        message: `Failed to read image: ${e}`,
      }),
  });

  // Resize to fit within maxDimension (scaleToFit maintains aspect ratio)
  if (image.width > maxDimension || image.height > maxDimension) {
    image.scaleToFit({ w: maxDimension, h: maxDimension });
  }

  const resized = yield* Effect.tryPromise({
    try: async () => {
      const buffer = await image.getBuffer("image/jpeg", { quality: 85 });
      return Buffer.from(buffer);
    },
    catch: (e) =>
      new WatermarkError({
        cause: "RESIZE_FAILED",
        message: `Failed to resize image: ${e}`,
      }),
  });

  return resized;
});

const createPreview = Effect.fn("WatermarkService.createPreview")(function* (imageBuffer: Buffer) {
  // Step 1: Resize to 800px max (smaller image = faster watermark)
  const resized = yield* resizeImage(imageBuffer, 800);

  // Step 2: Apply watermark
  const preview = yield* applyWatermark(resized);

  return preview;
});

// =============================================================================
// Service Layer
// =============================================================================

export const WatermarkServiceLive = Layer.succeed(WatermarkService, {
  apply: applyWatermark,
  resize: resizeImage,
  createPreview,
});
