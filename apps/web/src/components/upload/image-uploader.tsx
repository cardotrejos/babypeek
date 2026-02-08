import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageIcon, UploadIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProcessingIndicator } from "@/components/upload/processing-indicator";
import { useAnalytics } from "@/hooks/use-analytics";
import { useImageProcessor } from "@/hooks/use-image-processor";
import { cn } from "@/lib/utils";

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"] as const;

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".heic", ".heif"] as const;

// =============================================================================
// Types
// =============================================================================

export interface ImageUploaderProps {
  /** Callback when a valid file is selected (after processing) */
  onFileSelect: (file: File) => void;
  /** Optional callback when file is cleared */
  onFileClear?: () => void;
  /** Optional callback when processing starts (e.g., HEIC conversion) */
  onProcessingStart?: () => void;
  /** Optional callback when processing ends */
  onProcessingEnd?: () => void;
  /** Optional className for the container */
  className?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether to process images (convert HEIC, etc.) - defaults to true */
  processImages?: boolean;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  errorType?: "file_type" | "file_size";
}

// =============================================================================
// Validation Helpers
// =============================================================================

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)}MB`;
}

function validateFile(file: File): ValidationResult {
  // Check file type - validate both MIME type and extension
  // HEIC files sometimes have incorrect MIME types
  const extension = getFileExtension(file.name);
  const hasValidMimeType = ALLOWED_MIME_TYPES.includes(
    file.type as (typeof ALLOWED_MIME_TYPES)[number],
  );
  const hasValidExtension = ALLOWED_EXTENSIONS.includes(
    extension as (typeof ALLOWED_EXTENSIONS)[number],
  );

  // Accept if either MIME type OR extension is valid (handles edge cases)
  if (!hasValidMimeType && !hasValidExtension) {
    return {
      valid: false,
      error: "Please select a photo (JPEG, PNG, or HEIC)",
      errorType: "file_type",
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const fileSize = formatFileSize(file.size);
    return {
      valid: false,
      error: `This image is too large (${fileSize}). Please try one under 25MB.`,
      errorType: "file_size",
    };
  }

  return { valid: true };
}

// =============================================================================
// Component
// =============================================================================

export function ImageUploader({
  onFileSelect,
  onFileClear,
  onProcessingStart,
  onProcessingEnd,
  className,
  disabled = false,
  processImages = true,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { trackEvent } = useAnalytics();
  const { processImage, isProcessing, processingProgress } = useImageProcessor();

  // Cleanup preview URL on unmount or when clearing
  const cleanupPreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Track file selection (not actual upload - that's tracked in use-upload.ts)
      trackEvent("upload_file_selected", {
        file_type: file.type,
        file_size: file.size,
      });

      const validation = validateFile(file);

      if (!validation.valid) {
        // Track validation error
        trackEvent("upload_validation_error", {
          type: validation.errorType,
          file_type: file.type,
          file_size: file.size,
        });

        toast.error(validation.error, {
          duration: 5000,
        });
        return;
      }

      // Process image (convert HEIC if needed)
      let processedFile = file;
      if (processImages) {
        try {
          onProcessingStart?.();
          const result = await processImage(file);
          processedFile = result.file;
        } catch {
          // Error is already handled in useImageProcessor (toast + Sentry)
          // Just clear the processing state and don't proceed
          onProcessingEnd?.();
          return;
        } finally {
          onProcessingEnd?.();
        }
      }

      // Cleanup previous preview
      cleanupPreview();

      // Generate preview URL
      const url = URL.createObjectURL(processedFile);
      setPreviewUrl(url);
      setSelectedFile(processedFile);

      // Notify parent with processed file
      onFileSelect(processedFile);
    },
    [
      onFileSelect,
      onProcessingStart,
      onProcessingEnd,
      processImages,
      processImage,
      trackEvent,
      cleanupPreview,
    ],
  );

  const handleClear = useCallback(() => {
    cleanupPreview();
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onFileClear?.();
  }, [cleanupPreview, onFileClear]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isProcessing) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [disabled, isProcessing, handleFileSelect],
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  }, [disabled, isProcessing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !disabled && !isProcessing) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [disabled, isProcessing],
  );

  // =============================================================================
  // Render
  // =============================================================================

  const hasPreview = previewUrl && selectedFile;
  const isDisabled = disabled || isProcessing;

  return (
    <div className={cn("w-full sm:max-w-[560px] sm:mx-auto", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,.heic,.heif"
        onChange={handleInputChange}
        className="sr-only"
        aria-hidden="true"
        disabled={isDisabled}
      />

      {/* Drop zone / Preview area */}
      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label="Upload your 4D ultrasound image"
        aria-describedby="upload-instructions"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          // Base styles
          "relative flex flex-col items-center justify-center",
          "w-full rounded-[12px] border-2 border-dashed",
          "transition-all duration-200 ease-in-out",
          "cursor-pointer select-none",
          // Touch target - minimum 48px height
          "min-h-[200px] touch-target",
          // Colors based on state
          hasPreview
            ? "border-coral bg-coral-light/30"
            : "border-warm-gray/30 bg-cream hover:border-coral hover:bg-coral-light/20",
          // Dragging state with pulse animation
          isDragging && "animate-pulse border-coral bg-coral-light/40",
          // Focus state
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-coral focus-visible:ring-offset-2",
          // Disabled/Processing state
          isDisabled && "cursor-not-allowed opacity-50",
        )}
      >
        {/* Processing overlay */}
        {isProcessing && (
          <ProcessingIndicator message={processingProgress || "Preparing image..."} />
        )}
        {hasPreview ? (
          // Preview state
          <div className="relative w-full p-4">
            <img
              src={previewUrl}
              alt="Selected ultrasound image preview"
              className="mx-auto max-h-[300px] w-auto rounded-md object-contain"
            />
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-sm text-charcoal/70 font-medium truncate max-w-[200px]">
                {selectedFile.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                aria-label="Remove selected image"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-sm text-warm-gray">Click or drop to change image</p>
          </div>
        ) : (
          // Empty state
          <div className="flex flex-col items-center gap-4 p-6">
            <div
              className={cn(
                "flex size-16 items-center justify-center rounded-full",
                "bg-coral-light text-coral transition-colors",
                isDragging && "bg-coral text-white",
              )}
            >
              {isDragging ? <UploadIcon className="size-7" /> : <ImageIcon className="size-7" />}
            </div>
            <div className="text-center">
              <p className="font-medium text-charcoal">
                {isDragging ? "Drop your image here" : "Tap to upload your ultrasound"}
              </p>
              <p id="upload-instructions" className="mt-1 text-sm text-warm-gray">
                JPEG, PNG, or HEIC up to 25MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        {hasPreview
          ? `Image selected: ${selectedFile.name}`
          : "No image selected. Tap to upload your 4D ultrasound image."}
      </div>
    </div>
  );
}
