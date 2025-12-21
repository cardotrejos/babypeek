import { useCallback, useState } from "react"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmailInput } from "@/components/upload/email-input"
import { ImageUploader } from "@/components/upload/image-uploader"
import { UploadError } from "@/components/upload/upload-error"
import { UploadProgress } from "@/components/upload/upload-progress"
import { useAnalytics } from "@/hooks/use-analytics"
import { useUpload, type UploadResult } from "@/hooks/use-upload"
import { cn } from "@/lib/utils"

// =============================================================================
// Types
// =============================================================================

export interface UploadFormData {
  email: string
  file: File
}

export interface UploadFormProps {
  /** Called when form is submitted with valid email and file (simple mode) */
  onSubmit?: (data: UploadFormData) => void
  /** Called when upload completes successfully (with upload enabled) */
  onUploadComplete?: (result: UploadResult & { email: string }) => void
  /** Whether to enable built-in upload functionality */
  enableUpload?: boolean
  /** Whether the form is disabled (e.g., during upload) */
  disabled?: boolean
  /** Optional className for the container */
  className?: string
  /** Optional loading state for submit button (only used when enableUpload=false) */
  isLoading?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function UploadForm({
  onSubmit,
  onUploadComplete,
  enableUpload = false,
  disabled = false,
  className,
  isLoading = false,
}: UploadFormProps) {
  const [email, setEmail] = useState("")
  const [emailValid, setEmailValid] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { trackEvent } = useAnalytics()
  const { state: uploadState, startUpload, cancelUpload, reset: resetUpload } = useUpload()

  const isUploading = uploadState.status === "uploading" || uploadState.status === "requesting"
  const isFormValid = emailValid && selectedFile !== null
  const isDisabled = disabled || isProcessing || isLoading || isUploading

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    // Reset upload state if there was a previous error
    if (uploadState.status === "error") {
      resetUpload()
    }
  }, [uploadState.status, resetUpload])

  const handleFileClear = useCallback(() => {
    setSelectedFile(null)
    resetUpload()
  }, [resetUpload])

  const handleProcessingStart = useCallback(() => {
    setIsProcessing(true)
  }, [])

  const handleProcessingEnd = useCallback(() => {
    setIsProcessing(false)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!isFormValid || !selectedFile) return

      // Track form completion
      trackEvent("upload_form_completed", {
        hasEmail: true,
        hasFile: true,
        fileSizeMB: Number((selectedFile.size / (1024 * 1024)).toFixed(2)),
      })

      // If upload is enabled, use built-in upload
      if (enableUpload) {
        const result = await startUpload(selectedFile, email)
        if (result && onUploadComplete) {
          onUploadComplete({ ...result, email })
        }
      } else {
        // Otherwise, just call onSubmit
        onSubmit?.({ email, file: selectedFile })
      }
    },
    [isFormValid, selectedFile, email, trackEvent, onSubmit, enableUpload, startUpload, onUploadComplete]
  )

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
    >
      {/* Email Input */}
      <EmailInput
        value={email}
        onChange={setEmail}
        onValidityChange={setEmailValid}
        disabled={isDisabled}
      />

      {/* Image Uploader - hide during upload */}
      {!isUploading && (
        <ImageUploader
          onFileSelect={handleFileSelect}
          onFileClear={handleFileClear}
          onProcessingStart={handleProcessingStart}
          onProcessingEnd={handleProcessingEnd}
          disabled={isDisabled}
        />
      )}

      {/* Upload Progress - show during upload */}
      {isUploading && (
        <UploadProgress
          progress={uploadState.progress}
          onCancel={cancelUpload}
          showCancel
          statusMessage={
            uploadState.status === "requesting"
              ? "Preparing upload..."
              : undefined
          }
        />
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!isFormValid || isDisabled}
        className={cn(
          // Base styles
          "h-14 w-full rounded-[12px] text-lg font-semibold",
          // Touch target for mobile
          "min-h-[48px]",
          // Coral primary color
          "bg-coral text-white hover:bg-coral/90",
          // Focus styles
          "focus-visible:ring-[3px] focus-visible:ring-coral focus-visible:ring-offset-2",
          // Disabled state
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isLoading || isUploading ? (
          <span className="flex items-center gap-2">
            <span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {uploadState.status === "requesting"
              ? "Preparing..."
              : "Uploading..."}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Start
            <ArrowRightIcon className="size-5" />
          </span>
        )}
      </Button>

      {/* Helper text */}
      {!isFormValid && !isUploading && (
        <p className="text-center text-sm text-warm-gray">
          {!emailValid && !selectedFile
            ? "Enter your email and upload your ultrasound to continue"
            : !emailValid
              ? "Enter your email to continue"
              : "Upload your ultrasound to continue"}
        </p>
      )}
      
      {/* Error state with retry button */}
      {uploadState.status === "error" && uploadState.error && (
        <UploadError
          message={uploadState.error}
          onRetry={() => {
            resetUpload()
            // Re-trigger upload if file is still selected
            if (selectedFile && emailValid) {
              handleSubmit({ preventDefault: () => {} } as React.FormEvent)
            }
          }}
          retrying={false}
          retryable={true}
        />
      )}
    </form>
  )
}
