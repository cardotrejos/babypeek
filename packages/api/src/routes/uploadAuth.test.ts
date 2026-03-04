import { describe, expect, it } from "vitest";

import { canAccessUpload } from "./uploadAuth";

describe("canAccessUpload", () => {
  it("allows valid cleanup token even with mismatched session user", () => {
    const result = canAccessUpload({
      uploadUserId: "user-email-b",
      uploadStatus: "pending",
      sessionUserId: "user-email-a",
      cleanupToken: "cleanup-token",
      isCleanupTokenValid: true,
    });

    expect(result).toBe(true);
  });

  it("rejects mismatched session user without a valid cleanup token", () => {
    const result = canAccessUpload({
      uploadUserId: "user-email-b",
      uploadStatus: "pending",
      sessionUserId: "user-email-a",
      cleanupToken: "cleanup-token",
      isCleanupTokenValid: false,
    });

    expect(result).toBe(false);
  });

  it("rejects cleanup token access when upload is not pending", () => {
    const result = canAccessUpload({
      uploadUserId: "user-email-b",
      uploadStatus: "processing",
      sessionUserId: "user-email-a",
      cleanupToken: "cleanup-token",
      isCleanupTokenValid: true,
    });

    expect(result).toBe(false);
  });
});
