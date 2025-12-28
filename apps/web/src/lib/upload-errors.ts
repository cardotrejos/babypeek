// =============================================================================
// Upload Error Types and Categorization
// =============================================================================

/**
 * Error type categories for upload failures.
 * Each type maps to specific user messages and retry behaviors.
 */
export type UploadErrorType =
  | "NETWORK" // Network failure, offline
  | "TIMEOUT" // Request timed out
  | "SERVER" // 5xx errors
  | "RATE_LIMIT" // 429 - too many requests
  | "VALIDATION" // 400 - invalid request
  | "UNAUTHORIZED" // 401/403 - auth issues
  | "NOT_FOUND" // 404 - resource missing
  | "CANCELLED" // User cancelled
  | "UNKNOWN"; // Fallback

/**
 * Structured upload error with user-friendly message and retry info.
 */
export interface UploadError {
  /** Error category */
  type: UploadErrorType;
  /** Technical error message (for logging) */
  message: string;
  /** User-friendly message (for display) */
  userMessage: string;
  /** Whether the error is retryable */
  retryable: boolean;
  /** Seconds to wait before retry (for rate limits) */
  retryAfter?: number;
}

// =============================================================================
// Error Messages (Warm Tone)
// =============================================================================

const ERROR_MESSAGES: Record<UploadErrorType, string> = {
  NETWORK: "Oops! Looks like you're offline. Check your connection and try again!",
  TIMEOUT: "The upload took a bit too long. Let's give it another shot!",
  SERVER: "Something went wrong on our end. Let's give it another try!",
  RATE_LIMIT: "You've reached the upload limit. Please try again later.",
  VALIDATION: "We couldn't process that file. Try a different image?",
  UNAUTHORIZED: "Your session expired. Please refresh the page and try again.",
  NOT_FOUND: "We couldn't find what you're looking for. Please try again.",
  CANCELLED: "", // No message needed - user initiated
  UNKNOWN: "We had trouble uploading your image. Let's try again!",
};

// =============================================================================
// Error Categorization
// =============================================================================

/**
 * Categorize an error into a structured UploadError.
 *
 * Handles various error types:
 * - TypeError (fetch/network errors)
 * - Response objects (HTTP status codes)
 * - Error objects (generic errors)
 * - String error messages
 */
export function categorizeError(error: unknown): UploadError {
  // Handle fetch/network errors (TypeError from fetch)
  if (error instanceof TypeError) {
    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("Failed to fetch")
    ) {
      return {
        type: "NETWORK",
        message: error.message,
        userMessage: ERROR_MESSAGES.NETWORK,
        retryable: true,
      };
    }
  }

  // Handle Response objects (HTTP errors)
  if (error instanceof Response) {
    return categorizeResponseError(error);
  }

  // Handle Error objects
  if (error instanceof Error) {
    return categorizeErrorMessage(error.message, error);
  }

  // Handle string errors
  if (typeof error === "string") {
    return categorizeErrorMessage(error);
  }

  // Unknown error type
  return {
    type: "UNKNOWN",
    message: String(error),
    userMessage: ERROR_MESSAGES.UNKNOWN,
    retryable: true,
  };
}

/**
 * Categorize an HTTP Response error.
 */
function categorizeResponseError(response: Response): UploadError {
  const status = response.status;

  // Rate limit
  if (status === 429) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 3600;

    return {
      type: "RATE_LIMIT",
      message: `Rate limit exceeded: ${status}`,
      userMessage: formatRateLimitMessage(retryAfter),
      retryable: true,
      retryAfter,
    };
  }

  // Server errors (5xx)
  if (status >= 500 && status < 600) {
    return {
      type: "SERVER",
      message: `Server error: ${status}`,
      userMessage: ERROR_MESSAGES.SERVER,
      retryable: true,
    };
  }

  // Unauthorized/Forbidden
  if (status === 401 || status === 403) {
    return {
      type: "UNAUTHORIZED",
      message: `Unauthorized: ${status}`,
      userMessage: ERROR_MESSAGES.UNAUTHORIZED,
      retryable: false,
    };
  }

  // Not Found
  if (status === 404) {
    return {
      type: "NOT_FOUND",
      message: `Not found: ${status}`,
      userMessage: ERROR_MESSAGES.NOT_FOUND,
      retryable: false,
    };
  }

  // Bad Request (validation errors)
  if (status === 400) {
    return {
      type: "VALIDATION",
      message: `Validation error: ${status}`,
      userMessage: ERROR_MESSAGES.VALIDATION,
      retryable: false,
    };
  }

  // Other client errors (4xx)
  if (status >= 400 && status < 500) {
    return {
      type: "VALIDATION",
      message: `Client error: ${status}`,
      userMessage: ERROR_MESSAGES.VALIDATION,
      retryable: false,
    };
  }

  // Unknown status
  return {
    type: "UNKNOWN",
    message: `HTTP error: ${status}`,
    userMessage: ERROR_MESSAGES.UNKNOWN,
    retryable: true,
  };
}

/**
 * Categorize an error based on its message string.
 */
function categorizeErrorMessage(message: string, originalError?: Error): UploadError {
  const lowerMessage = message.toLowerCase();

  // Check for cancellation
  if (lowerMessage.includes("cancel") || lowerMessage.includes("abort")) {
    return {
      type: "CANCELLED",
      message,
      userMessage: ERROR_MESSAGES.CANCELLED,
      retryable: false,
    };
  }

  // Check for network errors
  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("offline") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("failed to fetch")
  ) {
    return {
      type: "NETWORK",
      message,
      userMessage: ERROR_MESSAGES.NETWORK,
      retryable: true,
    };
  }

  // Check for timeout
  if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
    return {
      type: "TIMEOUT",
      message,
      userMessage: ERROR_MESSAGES.TIMEOUT,
      retryable: true,
    };
  }

  // Check for server errors
  if (
    lowerMessage.includes("server") ||
    lowerMessage.includes("500") ||
    lowerMessage.includes("502") ||
    lowerMessage.includes("503")
  ) {
    return {
      type: "SERVER",
      message,
      userMessage: ERROR_MESSAGES.SERVER,
      retryable: true,
    };
  }

  // Check for rate limit
  if (
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("429") ||
    lowerMessage.includes("too many")
  ) {
    return {
      type: "RATE_LIMIT",
      message,
      userMessage: ERROR_MESSAGES.RATE_LIMIT,
      retryable: true,
    };
  }

  // Default to unknown
  return {
    type: "UNKNOWN",
    message: originalError?.message || message,
    userMessage: ERROR_MESSAGES.UNKNOWN,
    retryable: true,
  };
}

/**
 * Format a rate limit message with countdown.
 */
function formatRateLimitMessage(retryAfterSeconds: number): string {
  // Less than a minute - use vague "in a moment"
  if (retryAfterSeconds < 60) {
    return "You've reached the upload limit. Please try again in a moment.";
  }

  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `You've reached the upload limit. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`;
}

/**
 * Get the user message for an error type.
 */
export function getErrorMessage(type: UploadErrorType): string {
  return ERROR_MESSAGES[type];
}

/**
 * Check if an error type should show a retry button.
 */
export function isRetryable(type: UploadErrorType): boolean {
  switch (type) {
    case "NETWORK":
    case "TIMEOUT":
    case "SERVER":
    case "RATE_LIMIT":
    case "UNKNOWN":
      return true;
    case "VALIDATION":
    case "UNAUTHORIZED":
    case "NOT_FOUND":
    case "CANCELLED":
      return false;
    default:
      return true;
  }
}
