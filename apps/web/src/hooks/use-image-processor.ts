import { useCallback, useState } from "react";
import { toast } from "sonner";
import * as Sentry from "@sentry/react";

import { useAnalytics } from "@/hooks/use-analytics";

// =============================================================================
// Constants
// =============================================================================

const LARGE_FILE_THRESHOLD = 15 * 1024 * 1024; // 15MB - mobile Safari memory concern
const JPEG_QUALITY = 0.85; // Balance of quality and file size

/** Compression threshold - files larger than this will be compressed */
const COMPRESSION_THRESHOLD = 2 * 1024 * 1024; // 2MB

/** Max dimension for compressed images */
const MAX_DIMENSION = 1920;

/** Toast duration for warning messages (ms) */
const TOAST_WARNING_DURATION = 4000;
/** Toast duration for error messages (ms) */
const TOAST_ERROR_DURATION = 5000;

/** Minimum time before showing progress UI (ms) */
const PROGRESS_DELAY = 500;

const HEIC_MIME_TYPES = ["image/heic", "image/heif"] as const;
const HEIC_EXTENSIONS = [".heic", ".heif"] as const;

/** GIF MIME type - animated images that shouldn't be compressed */
const GIF_MIME_TYPE = "image/gif";

// =============================================================================
// Types
// =============================================================================

export interface ProcessingState {
  isProcessing: boolean;
  progress: string | null;
  progressPercent: number | null;
}

export interface ProcessImageResult {
  file: File;
  wasConverted: boolean;
  wasCompressed: boolean;
  originalSize: number;
  finalSize: number;
}

export interface CompressImageResult {
  file: File;
  wasCompressed: boolean;
  originalSize: number;
  compressedSize: number;
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
    file.type.toLowerCase() as (typeof HEIC_MIME_TYPES)[number],
  );
  const hasHeicExt = HEIC_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

  return hasHeicMime || hasHeicExt;
}

/**
 * Detect if a file is a GIF (animated image)
 * GIFs should not be compressed as it would break animation
 *
 * @param file - The file to check
 * @returns true if the file is a GIF
 */
export function isGifFile(file: File): boolean {
  return file.type.toLowerCase() === GIF_MIME_TYPE;
}

/**
 * Check if a file needs compression based on size threshold
 *
 * @param file - The file to check
 * @returns true if the file is larger than COMPRESSION_THRESHOLD
 */
export function needsCompression(file: File): boolean {
  return file.size > COMPRESSION_THRESHOLD;
}

/**
 * Convert a Blob to a File object with the correct name and type
 */
function blobToFile(blob: Blob, originalName: string): File {
  // Replace .heic/.heif extension with .jpg
  const newName = originalName.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");

  return new File([blob], newName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

// =============================================================================
// Hook
// =============================================================================

export function useImageProcessor() {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: null,
    progressPercent: null,
  });
  const { trackEvent } = useAnalytics();

  /**
   * Compress an image file if it exceeds the size threshold
   * Uses browser-image-compression with Web Worker for performance
   */
  const compressImage = useCallback(
    async (file: File, onProgress?: (percent: number) => void): Promise<CompressImageResult> => {
      const originalSize = file.size;

      // Skip if file is under threshold
      if (!needsCompression(file)) {
        trackEvent("compression_skipped", {
          reason: "under_threshold",
          fileSize: file.size,
          fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
        });
        return {
          file,
          wasCompressed: false,
          originalSize,
          compressedSize: originalSize,
        };
      }

      // Skip GIFs (animated images)
      if (isGifFile(file)) {
        trackEvent("compression_skipped", {
          reason: "gif_file",
          fileSize: file.size,
          fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
        });

        // Warn user if GIF is very large
        if (file.size > COMPRESSION_THRESHOLD * 2) {
          toast.warning("This GIF is quite large. Upload may take a moment.", {
            duration: TOAST_WARNING_DURATION,
          });
        }

        return {
          file,
          wasCompressed: false,
          originalSize,
          compressedSize: originalSize,
        };
      }

      // Track compression started
      const startTime = performance.now();
      trackEvent("compression_started", {
        fileSize: file.size,
        fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
        fileType: file.type,
      });

      try {
        // Lazy-load browser-image-compression to keep initial bundle small
        const imageCompression = (await import("browser-image-compression")).default;

        // Track if we should show progress (only after PROGRESS_DELAY per AC-3)
        let shouldShowProgress = false;
        const progressTimer = setTimeout(() => {
          shouldShowProgress = true;
        }, PROGRESS_DELAY);

        const compressedFile = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: MAX_DIMENSION,
          useWebWorker: true,
          fileType: file.type === "image/png" ? "image/png" : "image/jpeg",
          onProgress: (percent: number) => {
            // Only show progress if compression takes longer than PROGRESS_DELAY (AC-3)
            if (onProgress && shouldShowProgress) {
              onProgress(percent);
            }
          },
        });

        clearTimeout(progressTimer);

        const duration = performance.now() - startTime;
        const compressionRatio = Number((compressedFile.size / originalSize).toFixed(2));

        // Check if compression actually reduced size significantly
        if (compressedFile.size >= originalSize * 0.95) {
          trackEvent("compression_skipped", {
            reason: "already_optimized",
            fileSize: file.size,
            fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
            compressionRatio,
          });

          // Use original file if compression didn't help much
          return {
            file,
            wasCompressed: false,
            originalSize,
            compressedSize: originalSize,
          };
        }

        // Track successful compression
        trackEvent("compression_completed", {
          durationMs: Math.round(duration),
          originalSize,
          compressedSize: compressedFile.size,
          compressionRatio,
        });

        return {
          file: compressedFile,
          wasCompressed: true,
          originalSize,
          compressedSize: compressedFile.size,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown compression error";

        // Track compression error
        trackEvent("compression_failed", {
          errorType: errorMessage,
          fileSize: file.size,
        });

        // Report to Sentry without PII (per NFR-2.6)
        Sentry.captureException(error, {
          tags: {
            component: "image-processor",
            action: "compression",
          },
          extra: {
            fileSize: file.size,
            fileType: file.type,
            errorType: errorMessage,
          },
        });

        // Show warm, user-friendly error message
        toast.warning("We had trouble optimizing your image, but we'll try uploading it anyway.", {
          duration: TOAST_WARNING_DURATION,
        });

        // Graceful degradation: return original file
        return {
          file,
          wasCompressed: false,
          originalSize,
          compressedSize: originalSize,
        };
      }
    },
    [trackEvent],
  );

  /**
   * Process an image file:
   * 1. Convert HEIC to JPEG if needed
   * 2. Compress if larger than threshold
   * Returns the processed file
   */
  const processImage = useCallback(
    async (file: File): Promise<ProcessImageResult> => {
      const originalSize = file.size;
      let currentFile = file;
      let wasConverted = false;
      let wasCompressed = false;

      // Step 1: HEIC Conversion (if needed)
      if (isHeicFile(file)) {
        setProcessingState({
          isProcessing: true,
          progress: "Preparing image...",
          progressPercent: null,
        });

        // Track conversion started
        const startTime = performance.now();
        trackEvent("heic_conversion_started", {
          fileSize: file.size,
          fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
        });

        // Check for large files and show warning (non-blocking)
        if (file.size > LARGE_FILE_THRESHOLD) {
          trackEvent("heic_large_file_warning", {
            fileSize: file.size,
            fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
          });
          toast.warning("This is a large image. Conversion may take a moment.", {
            duration: TOAST_WARNING_DURATION,
          });
        }

        try {
          // Lazy-load heic2any to keep initial bundle small
          const heic2any = (await import("heic2any")).default;

          // Convert HEIC to JPEG
          const jpegBlob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: JPEG_QUALITY,
          });

          // heic2any can return an array for multi-image HEIC files, handle both cases
          const resultBlob = Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob;

          if (!resultBlob) {
            throw new Error("Conversion produced no output");
          }

          // Convert blob to file
          currentFile = blobToFile(resultBlob, file.name);
          wasConverted = true;

          const duration = performance.now() - startTime;

          // Track successful conversion
          trackEvent("heic_conversion_completed", {
            durationMs: Math.round(duration),
            originalSize: originalSize,
            convertedSize: currentFile.size,
            compressionRatio: Number((currentFile.size / originalSize).toFixed(2)),
          });
        } catch (error) {
          const conversionDuration = performance.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : "Unknown conversion error";

          // Track conversion error
          trackEvent("heic_conversion_error", {
            errorType: errorMessage,
            durationMs: Math.round(conversionDuration),
            fileSize: file.size,
          });

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
          });

          // Show user-friendly error message
          toast.error("We couldn't convert that image. Please try a JPEG or PNG instead.", {
            duration: TOAST_ERROR_DURATION,
          });

          setProcessingState({ isProcessing: false, progress: null, progressPercent: null });

          // Rethrow to let caller handle the error
          throw new Error(`HEIC conversion failed: ${errorMessage}`);
        }
      }

      // Step 2: Compression (if needed)
      if (needsCompression(currentFile)) {
        setProcessingState({
          isProcessing: true,
          progress: "Compressing image...",
          progressPercent: null,
        });

        const compressionResult = await compressImage(currentFile, (percent) => {
          // Keep message and percent separate for clean prop interface
          setProcessingState({
            isProcessing: true,
            progress: "Compressing image...",
            progressPercent: percent,
          });
        });

        currentFile = compressionResult.file;
        wasCompressed = compressionResult.wasCompressed;
      }

      // Reset processing state
      setProcessingState({ isProcessing: false, progress: null, progressPercent: null });

      return {
        file: currentFile,
        wasConverted,
        wasCompressed,
        originalSize,
        finalSize: currentFile.size,
      };
    },
    [trackEvent, compressImage],
  );

  return {
    processImage,
    compressImage,
    isProcessing: processingState.isProcessing,
    processingProgress: processingState.progress,
    progressPercent: processingState.progressPercent,
  };
}
