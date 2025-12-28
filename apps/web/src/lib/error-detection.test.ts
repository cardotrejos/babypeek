import { describe, it, expect } from "vitest";
import { isExpiredError } from "./error-detection";

describe("isExpiredError", () => {
  describe("resource expiry detection", () => {
    it("returns true for 'not found' error", () => {
      const error = new Error("Result not found");
      expect(isExpiredError(error)).toBe(true);
    });

    it("returns true for 'no longer available' error", () => {
      const error = new Error("This portrait is no longer available");
      expect(isExpiredError(error)).toBe(true);
    });

    it("returns true for 'expired' resource error", () => {
      const error = new Error("This result has expired");
      expect(isExpiredError(error)).toBe(true);
    });

    it("handles case-insensitive matching", () => {
      const error = new Error("RESULT NOT FOUND");
      expect(isExpiredError(error)).toBe(true);
    });
  });

  describe("session expiry exclusion", () => {
    it("returns false for session expired errors", () => {
      const error = new Error("Session expired. Please start a new upload.");
      expect(isExpiredError(error)).toBe(false);
    });

    it("returns false for session not found errors", () => {
      const error = new Error("Session not found. Please start a new upload.");
      expect(isExpiredError(error)).toBe(false);
    });
  });

  describe("other error types", () => {
    it("returns false for network errors", () => {
      const error = new Error("Network error");
      expect(isExpiredError(error)).toBe(false);
    });

    it("returns false for failed to load errors", () => {
      const error = new Error("Failed to load result");
      expect(isExpiredError(error)).toBe(false);
    });

    it("returns false for non-Error objects", () => {
      expect(isExpiredError("not found")).toBe(false);
      expect(isExpiredError({ message: "not found" })).toBe(false);
      expect(isExpiredError(null)).toBe(false);
      expect(isExpiredError(undefined)).toBe(false);
    });
  });
});
