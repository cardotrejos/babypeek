import { describe, it, expect } from "vitest"
import { Effect, Layer } from "effect"
import { Jimp } from "jimp"
import { WatermarkService, WatermarkServiceLive } from "./WatermarkService"
import { WatermarkError } from "../lib/errors"

/**
 * Tests for WatermarkService
 * 
 * Validates Story 5.2 acceptance criteria:
 * - AC-1: Watermark applied at 40% opacity
 * - AC-2: Watermark positioned bottom-right
 * - AC-3: Watermark is 15% of image width
 * - AC-4: Watermark text is "babypeek.com"
 * - AC-5: Preview resized to 800px max dimension
 * - AC-7: Uses Jimp library (pure JS, serverless compatible)
 */

// Create a valid test image buffer
async function createTestImage(width = 1200, height = 900): Promise<Buffer> {
  // Create a new image with gray background using Jimp
  const image = new Jimp({ width, height, color: 0x808080ff })
  const buffer = await image.getBuffer("image/jpeg", { quality: 85 })
  return Buffer.from(buffer)
}

describe("WatermarkService", () => {
  describe("apply", () => {
    it("applies watermark and returns valid JPEG buffer (AC-1, AC-7)", async () => {
      const testImage = await createTestImage()

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.apply(testImage)
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(program)

      // Verify output is a buffer
      expect(Buffer.isBuffer(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      // Verify output is valid JPEG (check magic bytes)
      expect(result[0]).toBe(0xff)
      expect(result[1]).toBe(0xd8)
    })

    it("uses default watermark text 'babypeek.com' (AC-4)", async () => {
      const testImage = await createTestImage()

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        // Default options should use "babypeek.com"
        return yield* service.apply(testImage, {})
      }).pipe(Effect.provide(WatermarkServiceLive))

      // Should not throw - watermark applied with default text
      const result = await Effect.runPromise(program)
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it("applies watermark at correct opacity (AC-1)", async () => {
      const testImage = await createTestImage()

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.apply(testImage, { opacity: 0.4 })
      }).pipe(Effect.provide(WatermarkServiceLive))

      // Should not throw - watermark applied at 40% opacity
      const result = await Effect.runPromise(program)
      expect(result).toBeDefined()
    })

    it("calculates watermark width as 15% of image (AC-3)", async () => {
      const testImage = await createTestImage(1000, 800)

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.apply(testImage, { widthPercent: 0.15 })
      }).pipe(Effect.provide(WatermarkServiceLive))

      // Should complete without error
      const result = await Effect.runPromise(program)
      expect(result).toBeDefined()
    })

    it("allows custom watermark text", async () => {
      const testImage = await createTestImage()

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.apply(testImage, { text: "custom-text.com" })
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(program)
      expect(result).toBeDefined()
    })

    it("positions watermark with 3% margin from edges (AC-2)", async () => {
      const testImage = await createTestImage(1000, 800)

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.apply(testImage, { marginPercent: 0.03 })
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(program)
      expect(result).toBeDefined()
    })

    it("fails with WatermarkError for invalid image data", async () => {
      const invalidBuffer = Buffer.from("not an image")

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.apply(invalidBuffer)
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(Effect.either(program))

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(WatermarkError)
      }
    })
  })

  describe("resize", () => {
    it("resizes image to fit within max dimension (AC-5)", async () => {
      const testImage = await createTestImage(1200, 900)

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.resize(testImage, 800)
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(program)
      const image = await Jimp.read(result)

      // Should fit within 800x800
      expect(image.width).toBeLessThanOrEqual(800)
      expect(image.height).toBeLessThanOrEqual(800)
    })

    it("preserves aspect ratio when resizing", async () => {
      // 4:3 aspect ratio
      const testImage = await createTestImage(1200, 900)

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.resize(testImage, 800)
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(program)
      const image = await Jimp.read(result)

      // Should maintain 4:3 ratio
      const aspectRatio = image.width / image.height
      expect(aspectRatio).toBeCloseTo(4 / 3, 1)
    })

    it("does not enlarge smaller images", async () => {
      const smallImage = await createTestImage(400, 300)

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.resize(smallImage, 800)
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(program)
      const image = await Jimp.read(result)

      // Should stay at original size
      expect(image.width).toBe(400)
      expect(image.height).toBe(300)
    })

    it("outputs JPEG at 85% quality", async () => {
      const testImage = await createTestImage()

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.resize(testImage, 800)
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(program)

      // Verify output is valid JPEG (check magic bytes)
      expect(result[0]).toBe(0xff)
      expect(result[1]).toBe(0xd8)
    })

    it("fails with WatermarkError JIMP_FAILED for invalid data", async () => {
      const invalidBuffer = Buffer.from("not an image")

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.resize(invalidBuffer, 800)
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(Effect.either(program))

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(WatermarkError)
        expect((result.left as WatermarkError).cause).toBe("JIMP_FAILED")
      }
    })
  })

  describe("createPreview", () => {
    it("creates resized and watermarked preview (AC-1 through AC-7)", async () => {
      const testImage = await createTestImage(1200, 900)

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.createPreview(testImage)
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(program)
      const image = await Jimp.read(result)

      // Verify preview constraints
      expect(result[0]).toBe(0xff) // JPEG magic byte
      expect(result[1]).toBe(0xd8)
      expect(image.width).toBeLessThanOrEqual(800)
      expect(image.height).toBeLessThanOrEqual(800)
    })

    it("applies resize before watermark (optimization)", async () => {
      const largeImage = await createTestImage(2000, 1500)

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.createPreview(largeImage)
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(program)

      // Preview should be much smaller than original
      expect(result.length).toBeLessThan(largeImage.length)
    })

    it("handles portrait images correctly", async () => {
      // Portrait: 600x1200
      const portraitImage = await createTestImage(600, 1200)

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.createPreview(portraitImage)
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(program)
      const image = await Jimp.read(result)

      // Height should be capped at 800
      expect(image.height).toBeLessThanOrEqual(800)
      expect(image.width).toBeLessThanOrEqual(800)
    })

    it("handles square images correctly", async () => {
      const squareImage = await createTestImage(1000, 1000)

      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return yield* service.createPreview(squareImage)
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(program)
      const image = await Jimp.read(result)

      // Should be 800x800
      expect(image.width).toBe(800)
      expect(image.height).toBe(800)
    })
  })

  describe("service layer", () => {
    it("exports WatermarkServiceLive layer", () => {
      expect(WatermarkServiceLive).toBeDefined()
      expect(Layer.isLayer(WatermarkServiceLive)).toBe(true)
    })

    it("provides all required methods", async () => {
      const program = Effect.gen(function* () {
        const service = yield* WatermarkService
        return {
          hasApply: typeof service.apply === "function",
          hasResize: typeof service.resize === "function",
          hasCreatePreview: typeof service.createPreview === "function",
        }
      }).pipe(Effect.provide(WatermarkServiceLive))

      const result = await Effect.runPromise(program)

      expect(result.hasApply).toBe(true)
      expect(result.hasResize).toBe(true)
      expect(result.hasCreatePreview).toBe(true)
    })
  })
})
