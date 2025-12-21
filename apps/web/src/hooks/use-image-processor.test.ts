import { renderHook, act, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { toast } from "sonner"
import * as Sentry from "@sentry/react"

import { useImageProcessor, isHeicFile } from "./use-image-processor"

// =============================================================================
// Mocks
// =============================================================================

// Mock heic2any
const mockHeic2any = vi.fn()
vi.mock("heic2any", () => ({
  default: (options: unknown) => mockHeic2any(options),
}))

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock file with the given properties
 * Uses ArrayBuffer for better performance (per Story 3.1 learnings)
 */
function createMockFile(
  name: string,
  type: string,
  sizeInMB: number = 1
): File {
  const size = Math.floor(sizeInMB * 1024 * 1024)
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

/**
 * Create a mock HEIC file
 */
function createMockHeicFile(sizeInMB: number = 1): File {
  return createMockFile("test.heic", "image/heic", sizeInMB)
}

/**
 * Create a mock JPEG file
 */
function createMockJpegFile(sizeInMB: number = 1): File {
  return createMockFile("test.jpg", "image/jpeg", sizeInMB)
}

// =============================================================================
// Tests: isHeicFile helper
// =============================================================================

describe("isHeicFile", () => {
  it("detects HEIC by MIME type image/heic", () => {
    const file = createMockFile("photo.jpg", "image/heic", 0.1)
    expect(isHeicFile(file)).toBe(true)
  })

  it("detects HEIC by MIME type image/heif", () => {
    const file = createMockFile("photo.jpg", "image/heif", 0.1)
    expect(isHeicFile(file)).toBe(true)
  })

  it("detects HEIC by .heic extension (case insensitive)", () => {
    const file = createMockFile("photo.HEIC", "", 0.1)
    expect(isHeicFile(file)).toBe(true)
  })

  it("detects HEIC by .heif extension", () => {
    const file = createMockFile("photo.heif", "", 0.1)
    expect(isHeicFile(file)).toBe(true)
  })

  it("returns false for JPEG files", () => {
    const file = createMockJpegFile(0.1)
    expect(isHeicFile(file)).toBe(false)
  })

  it("returns false for PNG files", () => {
    const file = createMockFile("photo.png", "image/png", 0.1)
    expect(isHeicFile(file)).toBe(false)
  })

  it("handles edge case: wrong MIME but correct extension", () => {
    // Some Windows systems report wrong MIME type
    const file = createMockFile("photo.heic", "application/octet-stream", 0.1)
    expect(isHeicFile(file)).toBe(true)
  })

  it("handles edge case: HEIC MIME type but no extension", () => {
    // Some apps strip extensions
    const file = createMockFile("photo", "image/heic", 0.1)
    expect(isHeicFile(file)).toBe(true)
  })

  it("handles edge case: HEIF MIME type but no extension", () => {
    const file = createMockFile("image_from_app", "image/heif", 0.1)
    expect(isHeicFile(file)).toBe(true)
  })
})

// =============================================================================
// Tests: useImageProcessor hook
// =============================================================================

describe("useImageProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementation - returns a JPEG blob
    mockHeic2any.mockResolvedValue(
      new Blob(["mock jpeg content"], { type: "image/jpeg" })
    )
  })

  describe("non-HEIC files", () => {
    it("passes through JPEG files unchanged", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const jpegFile = createMockJpegFile(1)

      let processResult: Awaited<ReturnType<typeof result.current.processImage>>

      await act(async () => {
        processResult = await result.current.processImage(jpegFile)
      })

      expect(processResult!.file).toBe(jpegFile)
      expect(processResult!.wasConverted).toBe(false)
      expect(mockHeic2any).not.toHaveBeenCalled()
    })

    it("passes through PNG files unchanged", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const pngFile = createMockFile("photo.png", "image/png", 1)

      let processResult: Awaited<ReturnType<typeof result.current.processImage>>

      await act(async () => {
        processResult = await result.current.processImage(pngFile)
      })

      expect(processResult!.file).toBe(pngFile)
      expect(processResult!.wasConverted).toBe(false)
    })
  })

  describe("HEIC conversion", () => {
    it("converts HEIC files to JPEG", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const heicFile = createMockHeicFile(1)

      let processResult: Awaited<ReturnType<typeof result.current.processImage>>

      await act(async () => {
        processResult = await result.current.processImage(heicFile)
      })

      expect(mockHeic2any).toHaveBeenCalledWith({
        blob: heicFile,
        toType: "image/jpeg",
        quality: 0.9,
      })
      expect(processResult!.wasConverted).toBe(true)
      expect(processResult!.file.type).toBe("image/jpeg")
      expect(processResult!.file.name).toBe("test.jpg")
    })

    it("converts .HEIF files to JPEG", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const heifFile = createMockFile("photo.heif", "image/heif", 1)

      await act(async () => {
        await result.current.processImage(heifFile)
      })

      expect(mockHeic2any).toHaveBeenCalled()
    })

    it("sets isProcessing to true during conversion", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const heicFile = createMockHeicFile(1)

      // Make heic2any take some time
      mockHeic2any.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(new Blob(["jpeg"], { type: "image/jpeg" })),
              50
            )
          )
      )

      expect(result.current.isProcessing).toBe(false)

      let promise: Promise<unknown>
      act(() => {
        promise = result.current.processImage(heicFile)
      })

      // Should be processing now
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(true)
      })

      await act(async () => {
        await promise
      })

      // Should be done
      expect(result.current.isProcessing).toBe(false)
    })

    it("handles heic2any returning an array (multi-image HEIC)", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const heicFile = createMockHeicFile(1)

      // heic2any can return an array for multi-image HEIC files
      mockHeic2any.mockResolvedValue([
        new Blob(["jpeg1"], { type: "image/jpeg" }),
        new Blob(["jpeg2"], { type: "image/jpeg" }),
      ])

      let processResult: Awaited<ReturnType<typeof result.current.processImage>>

      await act(async () => {
        processResult = await result.current.processImage(heicFile)
      })

      // Should use the first image
      expect(processResult!.wasConverted).toBe(true)
      expect(processResult!.file.type).toBe("image/jpeg")
    })
  })

  describe("large file warning", () => {
    it("shows warning toast for files >15MB", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const largeHeicFile = createMockHeicFile(16) // 16MB

      await act(async () => {
        await result.current.processImage(largeHeicFile)
      })

      expect(toast.warning).toHaveBeenCalledWith(
        "This is a large image. Conversion may take a moment.",
        { duration: 4000 }
      )
    })

    it("does not show warning for files <=15MB", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const normalHeicFile = createMockHeicFile(10) // 10MB

      await act(async () => {
        await result.current.processImage(normalHeicFile)
      })

      expect(toast.warning).not.toHaveBeenCalled()
    })

    it("continues conversion after warning (non-blocking)", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const largeHeicFile = createMockHeicFile(16)

      let processResult: Awaited<ReturnType<typeof result.current.processImage>>

      await act(async () => {
        processResult = await result.current.processImage(largeHeicFile)
      })

      expect(processResult!.wasConverted).toBe(true)
      expect(processResult!.file).toBeDefined()
    })
  })

  describe("error handling", () => {
    it("shows error toast on conversion failure", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const heicFile = createMockHeicFile(1)

      mockHeic2any.mockRejectedValue(new Error("Conversion failed"))

      await act(async () => {
        try {
          await result.current.processImage(heicFile)
        } catch {
          // Expected to throw
        }
      })

      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't convert that image. Please try a JPEG or PNG instead.",
        { duration: 5000 }
      )
    })

    it("reports errors to Sentry without PII", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const heicFile = createMockHeicFile(1)
      const error = new Error("Memory limit exceeded")

      mockHeic2any.mockRejectedValue(error)

      await act(async () => {
        try {
          await result.current.processImage(heicFile)
        } catch {
          // Expected to throw
        }
      })

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {
            component: "image-processor",
            action: "heic-conversion",
          },
          extra: expect.objectContaining({
            fileSize: heicFile.size,
          }),
        })
      )
    })

    it("throws error to let caller handle it", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const heicFile = createMockHeicFile(1)

      mockHeic2any.mockRejectedValue(new Error("Test error"))

      await expect(
        act(async () => {
          await result.current.processImage(heicFile)
        })
      ).rejects.toThrow("HEIC conversion failed: Test error")
    })

    it("resets isProcessing on error", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const heicFile = createMockHeicFile(1)

      mockHeic2any.mockRejectedValue(new Error("Conversion failed"))

      await act(async () => {
        try {
          await result.current.processImage(heicFile)
        } catch {
          // Expected
        }
      })

      expect(result.current.isProcessing).toBe(false)
    })
  })

  describe("file naming", () => {
    it("replaces .heic extension with .jpg", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const heicFile = createMockFile("my-photo.heic", "image/heic", 1)

      let processResult: Awaited<ReturnType<typeof result.current.processImage>>

      await act(async () => {
        processResult = await result.current.processImage(heicFile)
      })

      expect(processResult!.file.name).toBe("my-photo.jpg")
    })

    it("replaces .HEIC extension with .jpg (case insensitive)", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const heicFile = createMockFile("MY-PHOTO.HEIC", "image/heic", 1)

      let processResult: Awaited<ReturnType<typeof result.current.processImage>>

      await act(async () => {
        processResult = await result.current.processImage(heicFile)
      })

      expect(processResult!.file.name).toBe("MY-PHOTO.jpg")
    })

    it("replaces .heif extension with .jpg", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const heifFile = createMockFile("photo.heif", "image/heif", 1)

      let processResult: Awaited<ReturnType<typeof result.current.processImage>>

      await act(async () => {
        processResult = await result.current.processImage(heifFile)
      })

      expect(processResult!.file.name).toBe("photo.jpg")
    })
  })

  describe("result metadata", () => {
    it("returns original and converted file sizes", async () => {
      const { result } = renderHook(() => useImageProcessor())
      const heicFile = createMockHeicFile(2) // 2MB

      // Mock a smaller converted file
      const smallerBlob = new Blob(["smaller jpeg"], { type: "image/jpeg" })
      mockHeic2any.mockResolvedValue(smallerBlob)

      let processResult: Awaited<ReturnType<typeof result.current.processImage>>

      await act(async () => {
        processResult = await result.current.processImage(heicFile)
      })

      expect(processResult!.originalSize).toBe(heicFile.size)
      expect(processResult!.convertedSize).toBe(smallerBlob.size)
    })
  })
})
