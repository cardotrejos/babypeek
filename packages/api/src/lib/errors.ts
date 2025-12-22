import { Data } from "effect"

// =============================================================================
// Domain Errors
// =============================================================================

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  resource: string
  id: string
}> {}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  reason: "MISSING_TOKEN" | "INVALID_TOKEN" | "EXPIRED_TOKEN" | "PURCHASE_REQUIRED"
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string
  message: string
}> {}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  retryAfter: number
}> {}

export class AlreadyProcessingError extends Data.TaggedError("AlreadyProcessingError")<{
  uploadId: string
  currentStatus: string
}> {}

// =============================================================================
// External Service Errors
// =============================================================================

export class GeminiError extends Data.TaggedError("GeminiError")<{
  cause: "RATE_LIMITED" | "INVALID_IMAGE" | "CONTENT_POLICY" | "API_ERROR" | "TIMEOUT"
  message: string
  /** Original error for Sentry logging and debugging */
  originalError?: unknown
  /** Attempt number when tracking retries */
  attempt?: number
}> {}

/**
 * Determine if a GeminiError should trigger a retry.
 *
 * Retryable errors (transient failures):
 * - RATE_LIMITED: API quota exceeded, will likely succeed after backoff
 * - API_ERROR: Network issues, server errors - transient
 * - TIMEOUT: Request took too long, worth retrying
 *
 * Non-retryable errors (permanent failures):
 * - INVALID_IMAGE: Bad input image won't magically become valid
 * - CONTENT_POLICY: Safety filters blocked content, retrying won't help
 *
 * @see Story 4.3 - Retry Logic with Exponential Backoff
 */
export function isRetryableGeminiError(error: GeminiError): boolean {
  return (
    error.cause === "RATE_LIMITED" ||
    error.cause === "API_ERROR" ||
    error.cause === "TIMEOUT"
  )
}

export class R2Error extends Data.TaggedError("R2Error")<{
  cause: "UPLOAD_FAILED" | "DOWNLOAD_FAILED" | "DELETE_FAILED" | "PRESIGN_FAILED" | "CONFIG_MISSING" | "INVALID_KEY" | "HEAD_FAILED" | "LIST_FAILED"
  message: string
}> {}

export class UploadError extends Data.TaggedError("UploadError")<{
  cause: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "UPLOAD_FAILED"
  message: string
}> {}

export class ProcessingError extends Data.TaggedError("ProcessingError")<{
  cause: "AI_FAILED" | "TIMEOUT" | "QUALITY_CHECK_FAILED"
  message: string
  uploadId?: string
  lastStage?: string
  lastProgress?: number
}> {}

export class PaymentError extends Data.TaggedError("PaymentError")<{
  cause: "CARD_DECLINED" | "INSUFFICIENT_FUNDS" | "STRIPE_ERROR" | "WEBHOOK_INVALID"
  message: string
}> {}

export class EmailError extends Data.TaggedError("EmailError")<{
  cause: "SEND_FAILED" | "TEMPLATE_ERROR" | "INVALID_EMAIL"
  message: string
}> {}

export class ResultError extends Data.TaggedError("ResultError")<{
  cause: "STORAGE_FAILED" | "DB_FAILED" | "NOT_FOUND"
  message: string
  uploadId?: string
  resultId?: string
}> {}

export class DownloadExpiredError extends Data.TaggedError("DownloadExpiredError")<{
  uploadId: string
  expiredAt: string
}> {}

export class UploadStatusError extends Data.TaggedError("UploadStatusError")<{
  cause: "DB_FAILED" | "INVALID_TRANSITION"
  message: string
  uploadId?: string
}> {}

export class WatermarkError extends Data.TaggedError("WatermarkError")<{
  cause: "JIMP_FAILED" | "INVALID_IMAGE" | "COMPOSITE_FAILED" | "RESIZE_FAILED"
  message: string
}> {}

export class CleanupError extends Data.TaggedError("CleanupError")<{
  cause: "DB_FAILED" | "R2_FAILED" | "PARTIAL_FAILURE"
  message: string
  uploadId?: string
}> {}

// =============================================================================
// Union of all errors
// =============================================================================

export type AppError =
  | NotFoundError
  | UnauthorizedError
  | ValidationError
  | RateLimitError
  | AlreadyProcessingError
  | GeminiError
  | R2Error
  | UploadError
  | ProcessingError
  | PaymentError
  | EmailError
  | ResultError
  | UploadStatusError
  | WatermarkError
  | DownloadExpiredError
  | CleanupError
