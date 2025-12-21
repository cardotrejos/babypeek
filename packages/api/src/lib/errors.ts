import { Data } from "effect"

// =============================================================================
// Domain Errors
// =============================================================================

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  resource: string
  id: string
}> {}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  reason: "MISSING_TOKEN" | "INVALID_TOKEN" | "EXPIRED_TOKEN"
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string
  message: string
}> {}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  retryAfter: number
}> {}

// =============================================================================
// External Service Errors
// =============================================================================

export class GeminiError extends Data.TaggedError("GeminiError")<{
  cause: "RATE_LIMITED" | "INVALID_IMAGE" | "CONTENT_POLICY" | "API_ERROR" | "TIMEOUT"
  message: string
}> {}

export class R2Error extends Data.TaggedError("R2Error")<{
  cause: "UPLOAD_FAILED" | "DOWNLOAD_FAILED" | "DELETE_FAILED" | "PRESIGN_FAILED" | "CONFIG_MISSING" | "INVALID_KEY"
  message: string
}> {}

export class UploadError extends Data.TaggedError("UploadError")<{
  cause: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "UPLOAD_FAILED"
  message: string
}> {}

export class ProcessingError extends Data.TaggedError("ProcessingError")<{
  cause: "AI_FAILED" | "TIMEOUT" | "QUALITY_CHECK_FAILED"
  message: string
}> {}

export class PaymentError extends Data.TaggedError("PaymentError")<{
  cause: "CARD_DECLINED" | "INSUFFICIENT_FUNDS" | "STRIPE_ERROR" | "WEBHOOK_INVALID"
  message: string
}> {}

export class EmailError extends Data.TaggedError("EmailError")<{
  cause: "SEND_FAILED" | "TEMPLATE_ERROR" | "INVALID_EMAIL"
  message: string
}> {}

// =============================================================================
// Union of all errors
// =============================================================================

export type AppError =
  | NotFoundError
  | UnauthorizedError
  | ValidationError
  | RateLimitError
  | GeminiError
  | R2Error
  | UploadError
  | ProcessingError
  | PaymentError
  | EmailError
