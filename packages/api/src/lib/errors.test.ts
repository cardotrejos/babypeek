import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  UploadError,
  ProcessingError,
  PaymentError,
  RateLimitError,
  GeminiError,
  R2Error,
  EmailError,
  isRetryableGeminiError,
} from "./errors";

describe("Typed Errors", () => {
  describe("NotFoundError", () => {
    it("creates error with resource and id", () => {
      const error = new NotFoundError({ resource: "upload", id: "abc123" });
      expect(error._tag).toBe("NotFoundError");
      expect(error.resource).toBe("upload");
      expect(error.id).toBe("abc123");
    });

    it("can be caught by tag in Effect", async () => {
      const program = Effect.fail(new NotFoundError({ resource: "result", id: "xyz" })).pipe(
        Effect.catchTag("NotFoundError", (e) => Effect.succeed(`Caught: ${e.resource}/${e.id}`)),
      );

      const result = await Effect.runPromise(program);
      expect(result).toBe("Caught: result/xyz");
    });
  });

  describe("UnauthorizedError", () => {
    it("creates error with reason", () => {
      const error = new UnauthorizedError({ reason: "MISSING_TOKEN" });
      expect(error._tag).toBe("UnauthorizedError");
      expect(error.reason).toBe("MISSING_TOKEN");
    });

    it("supports all reason types", () => {
      const reasons = ["MISSING_TOKEN", "INVALID_TOKEN", "EXPIRED_TOKEN"] as const;
      for (const reason of reasons) {
        const error = new UnauthorizedError({ reason });
        expect(error.reason).toBe(reason);
      }
    });
  });

  describe("ValidationError", () => {
    it("creates error with field and message", () => {
      const error = new ValidationError({
        field: "email",
        message: "Invalid email format",
      });
      expect(error._tag).toBe("ValidationError");
      expect(error.field).toBe("email");
      expect(error.message).toBe("Invalid email format");
    });
  });

  describe("UploadError", () => {
    it("creates error with cause and message", () => {
      const error = new UploadError({
        cause: "FILE_TOO_LARGE",
        message: "File exceeds 25MB limit",
      });
      expect(error._tag).toBe("UploadError");
      expect(error.cause).toBe("FILE_TOO_LARGE");
    });
  });

  describe("ProcessingError", () => {
    it("creates error with cause and message", () => {
      const error = new ProcessingError({
        cause: "AI_FAILED",
        message: "Gemini API returned error",
      });
      expect(error._tag).toBe("ProcessingError");
      expect(error.cause).toBe("AI_FAILED");
    });
  });

  describe("PaymentError", () => {
    it("creates error with cause and message", () => {
      const error = new PaymentError({
        cause: "CARD_DECLINED",
        message: "Card was declined",
      });
      expect(error._tag).toBe("PaymentError");
      expect(error.cause).toBe("CARD_DECLINED");
    });
  });

  describe("RateLimitError", () => {
    it("creates error with retryAfter", () => {
      const error = new RateLimitError({ retryAfter: 3600 });
      expect(error._tag).toBe("RateLimitError");
      expect(error.retryAfter).toBe(3600);
    });
  });

  describe("GeminiError", () => {
    it("creates error with cause and message", () => {
      const error = new GeminiError({
        cause: "API_ERROR",
        message: "Gemini API returned error",
      });
      expect(error._tag).toBe("GeminiError");
      expect(error.cause).toBe("API_ERROR");
      expect(error.message).toBe("Gemini API returned error");
    });

    it("supports all cause types", () => {
      const causes = [
        "RATE_LIMITED",
        "INVALID_IMAGE",
        "CONTENT_POLICY",
        "API_ERROR",
        "TIMEOUT",
      ] as const;
      for (const cause of causes) {
        const error = new GeminiError({ cause, message: "test" });
        expect(error.cause).toBe(cause);
      }
    });

    it("supports optional attempt field", () => {
      const error = new GeminiError({
        cause: "TIMEOUT",
        message: "Timeout after retry",
        attempt: 3,
      });
      expect(error.attempt).toBe(3);
    });
  });

  describe("isRetryableGeminiError", () => {
    it("returns true for RATE_LIMITED errors", () => {
      const error = new GeminiError({ cause: "RATE_LIMITED", message: "Rate limit exceeded" });
      expect(isRetryableGeminiError(error)).toBe(true);
    });

    it("returns true for API_ERROR errors", () => {
      const error = new GeminiError({ cause: "API_ERROR", message: "Network error" });
      expect(isRetryableGeminiError(error)).toBe(true);
    });

    it("returns true for TIMEOUT errors", () => {
      const error = new GeminiError({ cause: "TIMEOUT", message: "Request timed out" });
      expect(isRetryableGeminiError(error)).toBe(true);
    });

    it("returns false for INVALID_IMAGE errors", () => {
      const error = new GeminiError({ cause: "INVALID_IMAGE", message: "Bad image" });
      expect(isRetryableGeminiError(error)).toBe(false);
    });

    it("returns false for CONTENT_POLICY errors", () => {
      const error = new GeminiError({ cause: "CONTENT_POLICY", message: "Content blocked" });
      expect(isRetryableGeminiError(error)).toBe(false);
    });
  });

  describe("R2Error", () => {
    it("creates error with cause and message", () => {
      const error = new R2Error({
        cause: "UPLOAD_FAILED",
        message: "Upload to R2 failed",
      });
      expect(error._tag).toBe("R2Error");
      expect(error.cause).toBe("UPLOAD_FAILED");
    });
  });

  describe("EmailError", () => {
    it("creates error with cause and message", () => {
      const error = new EmailError({
        cause: "SEND_FAILED",
        message: "Failed to send email",
      });
      expect(error._tag).toBe("EmailError");
      expect(error.cause).toBe("SEND_FAILED");
    });
  });
});
