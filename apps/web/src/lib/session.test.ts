import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CURRENT_JOB_KEY,
  JOB_DATA_PREFIX,
  SESSION_TTL_MS,
  initializeJobTracking,
  getCurrentJob,
  clearSession,
  getJobData,
  updateJobStatus,
  updateJobResult,
  updateJobTier,
  getPendingJob,
  getCompletedJobNeedingRedirect,
  clearStaleSessions,
} from "./session";

describe("session tracking utilities (Better Auth)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("initializes job tracking data", () => {
    initializeJobTracking("job-123");

    expect(localStorage.getItem(CURRENT_JOB_KEY)).toBe("job-123");

    const raw = localStorage.getItem(`${JOB_DATA_PREFIX}job-123`);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw || "{}");
    expect(parsed.jobId).toBe("job-123");
    expect(parsed.status).toBe("pending");
    expect(typeof parsed.createdAt).toBe("number");
  });

  it("does not throw when localStorage fails", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage quota exceeded");
    });

    expect(() => initializeJobTracking("job-123")).not.toThrow();
    setItemSpy.mockRestore();
  });

  it("gets current job", () => {
    localStorage.setItem(CURRENT_JOB_KEY, "job-456");
    expect(getCurrentJob()).toBe("job-456");
  });

  it("clears job tracking and current job reference", () => {
    initializeJobTracking("job-123");
    clearSession("job-123");

    expect(localStorage.getItem(`${JOB_DATA_PREFIX}job-123`)).toBeNull();
    expect(localStorage.getItem(CURRENT_JOB_KEY)).toBeNull();
  });

  it("getJobData returns null for expired data and clears it", () => {
    localStorage.setItem(CURRENT_JOB_KEY, "old-job");
    localStorage.setItem(
      `${JOB_DATA_PREFIX}old-job`,
      JSON.stringify({
        jobId: "old-job",
        createdAt: Date.now() - SESSION_TTL_MS - 1000,
        status: "pending",
      }),
    );

    expect(getJobData("old-job")).toBeNull();
    expect(localStorage.getItem(`${JOB_DATA_PREFIX}old-job`)).toBeNull();
    expect(localStorage.getItem(CURRENT_JOB_KEY)).toBeNull();
  });

  it("updates job status", () => {
    initializeJobTracking("job-123");
    updateJobStatus("job-123", "processing");

    const data = getJobData("job-123");
    expect(data?.status).toBe("processing");
  });

  it("updates job result and marks completed", () => {
    initializeJobTracking("job-123");
    updateJobResult("job-123", "result-999");

    const data = getJobData("job-123");
    expect(data?.resultId).toBe("result-999");
    expect(data?.status).toBe("completed");
  });

  it("updates selected tier", () => {
    initializeJobTracking("job-123");
    updateJobTier("job-123", "pro");

    const data = getJobData("job-123");
    expect(data?.selectedTier).toBe("pro");
  });

  it("returns pending/processing job for recovery", () => {
    initializeJobTracking("job-123");
    updateJobStatus("job-123", "processing");

    const pending = getPendingJob();
    expect(pending?.jobId).toBe("job-123");
    expect(pending?.status).toBe("processing");
  });

  it("returns completed job with result for redirect", () => {
    initializeJobTracking("job-123");
    updateJobResult("job-123", "result-123");

    const redirectJob = getCompletedJobNeedingRedirect();
    expect(redirectJob?.jobId).toBe("job-123");
    expect(redirectJob?.resultId).toBe("result-123");
  });

  it("does not return completed job without result for redirect", () => {
    initializeJobTracking("job-123");
    updateJobStatus("job-123", "completed");

    expect(getCompletedJobNeedingRedirect()).toBeNull();
  });

  it("clearStaleSessions removes only expired jobs", () => {
    const now = Date.now();

    localStorage.setItem(
      `${JOB_DATA_PREFIX}stale-job`,
      JSON.stringify({
        jobId: "stale-job",
        createdAt: now - SESSION_TTL_MS - 1000,
        status: "pending",
      }),
    );

    localStorage.setItem(
      `${JOB_DATA_PREFIX}fresh-job`,
      JSON.stringify({
        jobId: "fresh-job",
        createdAt: now,
        status: "pending",
      }),
    );

    localStorage.setItem(CURRENT_JOB_KEY, "stale-job");

    clearStaleSessions();

    expect(localStorage.getItem(`${JOB_DATA_PREFIX}stale-job`)).toBeNull();
    expect(localStorage.getItem(`${JOB_DATA_PREFIX}fresh-job`)).not.toBeNull();
    expect(localStorage.getItem(CURRENT_JOB_KEY)).toBeNull();
  });
});
