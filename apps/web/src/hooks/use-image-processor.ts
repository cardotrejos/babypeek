import { useCallback, useState } from "react"
import { toast } from "sonner"
import * as Sentry from "@sentry/react"

import { useAnalytics } from "@/hooks/use-analytics"

// =============================================================================
// Constants
// =============================================================================

const LARGE_FILE_THRESHOLD = 15 * 1024 * 1024 // 15MB - mobile Safari memory concern
const JPEG_QUALITY = 0.9 // Balance of quality and file size

/** Toast duration for warning messages (ms) */
const TOAST_WARNING_DURATION = 4000
/** Toast duration for error messages (ms) */
const TOAST_ERROR_DURATION = 5000

const HEIC_MIME_TYPES = ["image/heic", "image/heif"] as const
const HEIC_EXTENSIONS = [".heic", ".heif"] as const

// =============================================================================
// Types
// =============================================================================

export interface ProcessingState {
  isProcessing: boolean
  progress: string | null
}

export interface ProcessImageResult {
  file: File
  wasConverted: boolean
  originalSize: number
  convertedSize: number
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Detect if a file is HEIC/HEIF format
 * Checks both MIME type AND extension to handle edge cases
 * (HEIC files sometimes have incorrect MIME types, especially on Windows)
 * 
 * @param file - The file to check
 * @returns true if the file is HEIC/HEIF format
 * 
 * @example
 * ```ts
 * const file = new File([data], "photo.heic", { type: "image/heic" })
 * if (isHeicFile(file)) {
 *   // Convert to JPEG
 * }
 * ```
 */
export function isHeicFile(file: File): boolean {
  const hasHeicMime = HEIC_MIME_TYPES.includes(
    file.type.toLowerCase() as (typeof HEIC_MIME_TYPES)[number]
  )
  const hasHeicExt = HEIC_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  )

  return hasHeicMime || hasHeicExt
}

/**
 * Convert a Blob to a File object with the correct name and type
 */
function blobToFile(blob: Blob, originalName: string): File {
  // Replace .heic/.heif extension with .jpg
  const newName = originalName.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg")

  return new File([blob], newName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  })
}

// =============================================================================
// Hook
// =============================================================================

export function useImageProcessor() {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: null,
  })
  const { trackEvent } = useAnalytics()

  /**
   * Process an image file, converting HEIC to JPEG if needed
   * Returns the processed file (or original if no conversion needed)
   */
  const processImage = useCallback(
    async (file: File): Promise<ProcessImageResult> => {
      const originalSize = file.size

      // If not HEIC, return original file unchanged
      if (!isHeicFile(file)) {
        return {
          file,
          wasConverted: false,
          originalSize,
          convertedSize: originalSize,
        }
      }

      // Start processing
      setProcessingState({ isProcessing: true, progress: "Preparing image..." })

      // Track conversion started
      const startTime = performance.now()
      trackEvent("heic_conversion_started", {
        fileSize: file.size,
        fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
      })

      // Check for large files and show warning (non-blocking)
      if (file.size > LARGE_FILE_THRESHOLD) {
        trackEvent("heic_large_file_warning", {
          fileSize: file.size,
          fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
        })
        toast.warning("This is a large image. Conversion may take a moment.", {
          duration: TOAST_WARNING_DURATION,
        })
      }

      try {
        // Lazy-load heic2any to keep initial bundle small
        const heic2any = (await import("heic2any")).default

        // Convert HEIC to JPEG
        const jpegBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: JPEG_QUALITY,
        })

        // heic2any can return an array for multi-image HEIC files, handle both cases
        const resultBlob = Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob

        if (!resultBlob) {
          throw new Error("Conversion produced no output")
        }

        // Convert blob to file
        const convertedFile = blobToFile(resultBlob, file.name)

        const duration = performance.now() - startTime

        // Track successful conversion
        trackEvent("heic_conversion_completed", {
          durationMs: Math.round(duration),
          originalSize: originalSize,
          convertedSize: convertedFile.size,
          compressionRatio: Number((convertedFile.size / originalSize).toFixed(2)),
        })

        setProcessingState({ isProcessing: false, progress: null })

        return {
          file: convertedFile,
          wasConverted: true,
          originalSize,
          convertedSize: convertedFile.size,
        }
      } catch (error) {
        const duration = performance.now() - startTime
        const errorMessage =
          error instanceof Error ? error.message : "Unknown conversion error"

        // Track conversion error
        trackEvent("heic_conversion_error", {
          errorType: errorMessage,
          durationMs: Math.round(duration),
          fileSize: file.size,
        })

        // Report to Sentry without PII (per NFR-2.6)
        Sentry.captureException(error, {
          tags: {
            component: "image-processor",
            action: "heic-conversion",
          },
          extra: {
            fileSize: file.size,
            errorType: errorMessage,
          },
        })

        // Show user-friendly error message
        toast.error(
          "We couldn't convert that image. Please try a JPEG or PNG instead.",
          { duration: TOAST_ERROR_DURATION }
        )

        setProcessingState({ isProcessing: false, progress: null })

        // Rethrow to let caller handle the error
        throw new Error(`HEIC conversion failed: ${errorMessage}`)
      }
    },
    [trackEvent]
  )

  return {
    processImage,
    isProcessing: processingState.isProcessing,
    processingProgress: processingState.progress,
  }
}
