import { Data } from "effect"

// Typed errors for Effect
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

export class UploadError extends Data.TaggedError("UploadError")<{
  cause: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "UPLOAD_FAILED"
  message: string
}> {}

export class ProcessingError extends Data.TaggedError("ProcessingError")<{
  cause: "AI_FAILED" | "TIMEOUT" | "QUALITY_CHECK_FAILED"
  message: string
}> {}

export class PaymentError extends Data.TaggedError("PaymentError")<{
  cause: "CARD_DECLINED" | "INSUFFICIENT_FUNDS" | "STRIPE_ERROR"
  message: string
}> {}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  retryAfter: number
}> {}

// Union of all errors
export type AppError =
  | NotFoundError
  | UnauthorizedError
  | ValidationError
  | UploadError
  | ProcessingError
  | PaymentError
  | RateLimitError
