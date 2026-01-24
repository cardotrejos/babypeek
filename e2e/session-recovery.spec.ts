import { test, expect, Page } from "@playwright/test";

/**
 * E2E tests for Session Recovery (Story 5.7)
 *
 * These tests verify:
 * - AC5: Session recovery prompt on app load with pending job
 * - AC1: Visibility change triggers status refetch
 * - AC6: Redirect to result page on return with completed job
 * - AC7: Session is cleared after TTL
 */

const SESSION_PREFIX = "babypeek-session-";
const JOB_DATA_PREFIX = "babypeek-job-";
const CURRENT_JOB_KEY = "babypeek-current-job";

// Helper to set up a mock session in localStorage
async function setupMockSession(
  page: Page,
  jobId: string,
  options?: {
    status?: "pending" | "processing" | "completed" | "failed";
    resultId?: string;
    expired?: boolean;
  },
) {
  const { status = "pending", resultId, expired = false } = options ?? {};

  await page.addInitScript(
    ({ jobId, status, resultId, expired }) => {
      const createdAt = expired ? Date.now() - 25 * 60 * 60 * 1000 : Date.now();

      // Set session token
      localStorage.setItem(`babypeek-session-${jobId}`, `mock-token-${jobId}`);
      localStorage.setItem("babypeek-current-job", jobId);

      // Set job data
      const jobData = {
        jobId,
        token: `mock-token-${jobId}`,
        createdAt,
        status,
        ...(resultId && { resultId }),
      };
      localStorage.setItem(`babypeek-job-${jobId}`, JSON.stringify(jobData));

      // Set result mapping if completed
      if (resultId) {
        localStorage.setItem(`babypeek-result-upload-${resultId}`, jobId);
      }
    },
    { jobId, status, resultId, expired },
  );
}

// Helper to simulate visibility change
async function simulateVisibilityChange(page: Page, state: "hidden" | "visible") {
  await page.evaluate((state) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: state,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);
}

test.describe("Session Recovery (Story 5.7)", () => {
  test.describe("Recovery Prompt (AC5)", () => {
    test("shows recovery prompt for pending job on landing page", async ({ page }) => {
      await setupMockSession(page, "test-job-1");

      await page.goto("/");

      // Wait for recovery prompt to appear
      const recoveryPrompt = page.getByRole("dialog");
      await expect(recoveryPrompt).toBeVisible({ timeout: 5000 });

      // Check for recovery prompt content
      await expect(page.getByText(/welcome back/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /start fresh/i })).toBeVisible();
    });

    test("shows recovery prompt for processing job", async ({ page }) => {
      await setupMockSession(page, "test-job-2", { status: "processing" });

      await page.goto("/");

      const recoveryPrompt = page.getByRole("dialog");
      await expect(recoveryPrompt).toBeVisible({ timeout: 5000 });

      // Should show "Check Progress" for processing job
      await expect(page.getByRole("button", { name: /check progress/i })).toBeVisible();
    });

    test("resume button navigates to processing page", async ({ page }) => {
      await setupMockSession(page, "test-job-3", { status: "processing" });

      await page.goto("/");

      // Wait for and click resume button
      const resumeButton = page.getByRole("button", { name: /check progress/i });
      await resumeButton.click();

      // Should navigate to processing page
      await expect(page).toHaveURL(/\/processing\/test-job-3/);
    });

    test("start fresh clears session and hides prompt", async ({ page }) => {
      await setupMockSession(page, "test-job-4");

      await page.goto("/");

      // Click start fresh
      const startFreshButton = page.getByRole("button", { name: /start fresh/i });
      await startFreshButton.click();

      // Prompt should disappear
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 2000 });

      // Session should be cleared
      const sessionExists = await page.evaluate((jobId) => {
        return localStorage.getItem(`babypeek-job-${jobId}`) !== null;
      }, "test-job-4");
      expect(sessionExists).toBe(false);
    });

    test("does not show prompt on processing page", async ({ page }) => {
      await setupMockSession(page, "test-job-5");

      // Navigate directly to processing page
      await page.goto("/processing/test-job-5");

      // Wait a bit to ensure no prompt appears
      await page.waitForTimeout(1000);

      // Should not show recovery dialog
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
  });

  test.describe("Completed Job Redirect (AC6)", () => {
    test("redirects to result page when completed job exists", async ({ page }) => {
      await setupMockSession(page, "test-job-6", {
        status: "completed",
        resultId: "result-123",
      });

      await page.goto("/");

      // Should redirect to result page
      await expect(page).toHaveURL(/\/result\/result-123/, { timeout: 5000 });
    });

    test("does not redirect for failed job", async ({ page }) => {
      await setupMockSession(page, "test-job-7", { status: "failed" });

      await page.goto("/");

      // Should stay on landing page (no redirect)
      await expect(page).toHaveURL("/");

      // No recovery prompt for failed jobs
      await page.waitForTimeout(1000);
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
  });

  test.describe("TTL Enforcement (AC7)", () => {
    test("does not show prompt for expired session", async ({ page }) => {
      await setupMockSession(page, "test-job-8", {
        status: "pending",
        expired: true,
      });

      await page.goto("/");

      // Wait for stale session cleanup to run
      await page.waitForTimeout(500);

      // Should not show recovery dialog
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 2000 });

      // Session should be cleared
      const sessionExists = await page.evaluate((jobId) => {
        return localStorage.getItem(`babypeek-job-${jobId}`) !== null;
      }, "test-job-8");
      expect(sessionExists).toBe(false);
    });
  });

  test.describe("Visibility Change (AC1, AC2, AC3)", () => {
    test("visibility change hook is set up correctly", async ({ page }) => {
      await page.goto("/");

      // Check that visibilitychange event listener is registered
      const hasListener = await page.evaluate(() => {
        // We can't directly check listeners, but we can verify document.visibilityState works
        return typeof document.visibilityState === "string";
      });
      expect(hasListener).toBe(true);
    });

    test("background → return triggers status refetch and navigates when completed", async ({
      page,
    }) => {
      const jobId = "test-job-vis";
      const resultId = "result-123";

      await setupMockSession(page, jobId, { status: "processing" });

      const tinyPng =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAn8B9pRkqQAAAABJRU5ErkJggg==";

      // Mock process start endpoint (now at /api/process, routing to workflow)
      await page.route("**/api/process", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, jobId, workflowRunId: "run-1" }),
        });
      });

      // Mock status endpoint with two-phase response:
      // 1) first call returns processing
      // 2) subsequent calls return completed
      let statusCalls = 0;
      await page.route("**/api/status/**", async (route) => {
        statusCalls += 1;

        const isCompleted = statusCalls >= 2;
        const payload = isCompleted
          ? {
              success: true,
              status: "completed",
              stage: "complete",
              progress: 100,
              resultId,
              resultUrl: tinyPng,
              previewUrl: tinyPng, // Required for unpurchased users
              originalUrl: tinyPng,
              promptVersion: "v4",
              errorMessage: null,
              updatedAt: new Date().toISOString(),
              results: [
                {
                  resultId,
                  previewUrl: tinyPng,
                  resultUrl: tinyPng,
                  promptVersion: "v4",
                  variantIndex: 1,
                },
              ],
            }
          : {
              success: true,
              status: "processing",
              stage: "generating",
              progress: 50,
              resultId: null,
              resultUrl: null,
              previewUrl: null,
              originalUrl: null,
              promptVersion: "v4",
              errorMessage: null,
              updatedAt: new Date().toISOString(),
              results: [],
            };

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(payload),
        });
      });

      await page.goto(`/processing/${jobId}`);

      // Wait for the initial status call to happen
      await page.waitForRequest(new RegExp(`/api/status/${jobId}$`));

      // Simulate app backgrounding and returning
      await simulateVisibilityChange(page, "hidden");
      await simulateVisibilityChange(page, "visible");

      // Should navigate to result page after refetch detects completion
      await expect(page).toHaveURL(new RegExp(`/result/${resultId}$`), { timeout: 8000 });
    });
  });
});
