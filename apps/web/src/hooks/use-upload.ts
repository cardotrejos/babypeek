import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import * as Sentry from "@sentry/react"

import { useAnalytics } from "@/hooks/use-analytics"
import { storeSession } from "@/lib/session"

// =============================================================================
// Constants
// =============================================================================

/** API base URL */
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

/** Upload timeout in milliseconds (30 seconds) */
const UPLOAD_TIMEOUT = 30 * 1000

/** Progress milestone percentages for analytics */
const PROGRESS_MILESTONES = [25, 50, 75] as const

/** Toast duration for error messages */
const TOAST_ERROR_DURATION = 5000

// =============================================================================
// Types
// =============================================================================

export type UploadStatus = "idle" | "requesting" | "uploading" | "complete" | "error"

export interface UploadState {
  status: UploadStatus
  progress: number
  uploadId: string | null
  error: string | null
}

export interface UploadResult {
  uploadId: string
  key: string
  sessionToken: string
}

export interface UseUploadResult {
  state: UploadState
  startUpload: (file: File, email: string) => Promise<UploadResult | null>
  cancelUpload: () => void
  reset: () => void
}

interface PresignedUrlResponse {
  uploadUrl: string
  uploadId: string
  key: string
  expiresAt: string
  sessionToken: string
}

interface ConfirmUploadResponse {
  success: boolean
  jobId: string
  status: string
}

// =============================================================================
// Helpers
// =============================================================================

const initialState: UploadState = {
  status: "idle",
  progress: 0,
  uploadId: null,
  error: null,
}

// =============================================================================
// Hook
// =============================================================================

export function useUpload(): UseUploadResult {
  const [state, setState] = useState<UploadState>(initialState)
  const { trackEvent } = useAnalytics()
  
  // Refs for cancellation and milestone tracking
  const abortControllerRef = useRef<AbortController | null>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const passedMilestonesRef = useRef<Set<number>>(new Set())
  const progressRef = useRef<number>(0)

  /**
   * Request a presigned upload URL from the server
   */
  const requestPresignedUrl = useCallback(
    async (
      contentType: string,
      email: string,
      signal: AbortSignal
    ): Promise<PresignedUrlResponse> => {
      const startTime = performance.now()

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contentType, email }),
        signal,
      })

      const latencyMs = Math.round(performance.now() - startTime)
      trackEvent("presigned_url_requested", { latencyMs })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      return response.json()
    },
    [trackEvent]
  )

  /**
   * Confirm upload completion with the server
   */
  const confirmUpload = useCallback(
    async (uploadId: string, signal: AbortSignal): Promise<ConfirmUploadResponse> => {
      const response = await fetch(`${API_BASE_URL}/api/upload/${uploadId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Confirmation failed: ${response.status}`)
      }

      const data = await response.json()
      trackEvent("upload_confirmed", { upload_id: uploadId })
      return data
    },
    [trackEvent]
  )

  /**
   * Upload file to R2 using presigned URL with progress tracking
   */
  const uploadToR2 = useCallback(
    (
      url: string,
      file: File,
      onProgress: (percent: number) => void
    ): Promise<void> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr

        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            onProgress(percent)

            // Track milestone events
            for (const milestone of PROGRESS_MILESTONES) {
              if (
                percent >= milestone &&
                !passedMilestonesRef.current.has(milestone)
              ) {
                passedMilestonesRef.current.add(milestone)
                trackEvent("upload_progress", { percent, milestone })
              }
            }
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }

        xhr.onerror = () => {
          reject(new Error("Network error during upload"))
        }

        xhr.onabort = () => {
          reject(new Error("Upload cancelled"))
        }

        xhr.ontimeout = () => {
          reject(new Error("Upload timed out"))
        }

        // Set timeout
        xhr.timeout = UPLOAD_TIMEOUT

        // Open and send request
        xhr.open("PUT", url)
        xhr.setRequestHeader("Content-Type", file.type)
        xhr.send(file)
      })
    },
    [trackEvent]
  )

  /**
   * Start the upload process
   */
  const startUpload = useCallback(
    async (file: File, email: string): Promise<UploadResult | null> => {
      // Reset milestones
      passedMilestonesRef.current.clear()

      // Create abort controller
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      const startTime = performance.now()

      try {
        // Track upload started
        trackEvent("upload_started", {
          file_type: file.type,
          file_size: file.size,
        })

        // Phase 1: Request presigned URL
        setState({
          status: "requesting",
          progress: 0,
          uploadId: null,
          error: null,
        })

        const presignedData = await requestPresignedUrl(
          file.type,
          email,
          abortController.signal
        )

        // Check if cancelled
        if (abortController.signal.aborted) {
          return null
        }

        // Phase 2: Upload to R2
        setState((prev) => ({
          ...prev,
          status: "uploading",
          uploadId: presignedData.uploadId,
        }))

        await uploadToR2(presignedData.uploadUrl, file, (percent) => {
          progressRef.current = percent
          setState((prev) => ({
            ...prev,
            progress: percent,
          }))
        })

        // Check if cancelled before confirmation
        if (abortController.signal.aborted) {
          return null
        }

        // Phase 3: Confirm upload with server
        await confirmUpload(presignedData.uploadId, abortController.signal)

        // Phase 4: Store session in localStorage
        storeSession(presignedData.uploadId, presignedData.sessionToken)

        // Track session creation
        trackEvent("session_created", { upload_id: presignedData.uploadId })

        // Upload complete
        const durationMs = Math.round(performance.now() - startTime)

        trackEvent("upload_completed", {
          upload_id: presignedData.uploadId,
          file_size: file.size,
          file_type: file.type,
          duration_ms: durationMs,
        })

        setState({
          status: "complete",
          progress: 100,
          uploadId: presignedData.uploadId,
          error: null,
        })

        return {
          uploadId: presignedData.uploadId,
          key: presignedData.key,
          sessionToken: presignedData.sessionToken,
        }
      } catch (error) {
        // Handle cancellation separately (no error toast)
        if (
          error instanceof Error &&
          (error.message === "Upload cancelled" ||
            error.name === "AbortError")
        ) {
          // Use ref for accurate progress at cancellation time
          trackEvent("upload_cancelled", { progressPercent: progressRef.current })
          
          progressRef.current = 0
          setState(initialState)
          return null
        }

        // Handle actual errors
        const errorMessage =
          error instanceof Error ? error.message : "Unknown upload error"

        trackEvent("upload_failed", {
          errorType: errorMessage,
          file_size: file.size,
        })

        // Report to Sentry (no PII)
        Sentry.captureException(error, {
          tags: {
            component: "use-upload",
            action: "upload",
          },
          extra: {
            fileSize: file.size,
            fileType: file.type,
            errorType: errorMessage,
          },
        })

        // Show user-friendly error
        const userMessage = getErrorMessage(errorMessage)
        toast.error(userMessage, { duration: TOAST_ERROR_DURATION })

        setState({
          status: "error",
          progress: 0,
          uploadId: null,
          error: userMessage,
        })

        return null
      } finally {
        abortControllerRef.current = null
        xhrRef.current = null
      }
    },
    [requestPresignedUrl, uploadToR2, trackEvent]
  )

  /**
   * Cancel the current upload
   */
  const cancelUpload = useCallback(() => {
    // Abort fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Abort XMLHttpRequest
    if (xhrRef.current) {
      xhrRef.current.abort()
    }
  }, [])

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    cancelUpload()
    setState(initialState)
    passedMilestonesRef.current.clear()
    progressRef.current = 0
  }, [cancelUpload])

  return {
    state,
    startUpload,
    cancelUpload,
    reset,
  }
}

// =============================================================================
// Error Message Helpers
// =============================================================================

function getErrorMessage(errorType: string): string {
  if (errorType.includes("Network")) {
    return "We couldn't upload your image. Please check your connection and try again!"
  }
  if (errorType.includes("timeout") || errorType.includes("timed out")) {
    return "The upload took too long. Please check your connection and try again."
  }
  if (errorType.includes("Server") || errorType.includes("500")) {
    return "Something went wrong on our end. Let's give it another try!"
  }
  return "We had trouble uploading your image. Let's try again!"
}
