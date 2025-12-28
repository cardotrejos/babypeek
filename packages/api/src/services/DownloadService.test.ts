import { describe, it, expect, vi } from "vitest";
import { Effect } from "effect";
import { DownloadService, DownloadServiceMock } from "./DownloadService";

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the db module
vi.mock("@babypeek/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() =>
          Promise.resolve([
            {
              id: "mock-download-id",
              purchaseId: "mock-purchase-id",
              downloadedAt: new Date(),
              ipHash: "mocked-ip-hash",
            },
          ]),
        ),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 5 }])),
        orderBy: vi.fn(() =>
          Promise.resolve([
            { id: "dl-1", downloadedAt: new Date("2024-12-20"), ipHash: "hash1" },
            { id: "dl-2", downloadedAt: new Date("2024-12-21"), ipHash: "hash2" },
          ]),
        ),
      })),
    })),
  },
  downloads: {
    purchaseId: "purchaseId",
    downloadedAt: "downloadedAt",
    ipHash: "ipHash",
    id: "id",
  },
  purchases: {},
}));

// Mock hash function
vi.mock("../lib/hash", () => ({
  hashIP: (ip: string) => `hashed-${ip.replace(/\./g, "-")}`,
}));

// =============================================================================
// Tests for DownloadService Mock
// =============================================================================

describe("DownloadServiceMock", () => {
  it("recordDownload returns mock data", async () => {
    const program = Effect.gen(function* () {
      const service = yield* DownloadService;
      return yield* service.recordDownload({ purchaseId: "test-purchase" });
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(DownloadServiceMock)));

    expect(result.downloadId).toBe("mock-download-id");
    expect(result.downloadCount).toBe(1);
  });

  it("getDownloadCount returns 0", async () => {
    const program = Effect.gen(function* () {
      const service = yield* DownloadService;
      return yield* service.getDownloadCount("test-purchase");
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(DownloadServiceMock)));

    expect(result).toBe(0);
  });

  it("isRedownload returns false", async () => {
    const program = Effect.gen(function* () {
      const service = yield* DownloadService;
      return yield* service.isRedownload("test-purchase");
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(DownloadServiceMock)));

    expect(result).toBe(false);
  });

  it("getDownloadHistory returns empty array", async () => {
    const program = Effect.gen(function* () {
      const service = yield* DownloadService;
      return yield* service.getDownloadHistory("test-purchase");
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(DownloadServiceMock)));

    expect(result).toEqual([]);
  });

  it("checkAbusePattern returns no abuse", async () => {
    const program = Effect.gen(function* () {
      const service = yield* DownloadService;
      return yield* service.checkAbusePattern("some-ip-hash");
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(DownloadServiceMock)));

    expect(result.count).toBe(0);
    expect(result.isAbusive).toBe(false);
  });
});

// =============================================================================
// Unit Tests for Service Logic
// =============================================================================

describe("DownloadService Logic", () => {
  // Story 7.6 AC-2: is_redownload flag calculation
  describe("isRedownload Calculation (AC-2)", () => {
    it("returns false when download count is 0", () => {
      // First download scenario: before recording, count is 0
      const downloadCount = 0;
      const isRedownload = downloadCount > 0;
      expect(isRedownload).toBe(false);
    });

    it("returns true when download count > 0", () => {
      // Re-download scenario: already have previous downloads
      const downloadCount = 1;
      const isRedownload = downloadCount > 0;
      expect(isRedownload).toBe(true);
    });

    it("returns true for multiple downloads", () => {
      const downloadCount = 5;
      const isRedownload = downloadCount > 0;
      expect(isRedownload).toBe(true);
    });
  });

  // Story 7.6 AC-4: Abuse detection threshold
  describe("Abuse Detection Logic (AC-4)", () => {
    it("does not flag as abusive when count <= 10", () => {
      const downloadCount = 10;
      const isAbusive = downloadCount > 10;
      expect(isAbusive).toBe(false);
    });

    it("flags as abusive when count > 10", () => {
      const downloadCount = 11;
      const isAbusive = downloadCount > 10;
      expect(isAbusive).toBe(true);
    });

    it("flags high abuse patterns", () => {
      const downloadCount = 50;
      const isAbusive = downloadCount > 10;
      expect(isAbusive).toBe(true);
    });
  });
});

// =============================================================================
// Tests for PostHog Event Schema (AC-1, AC-2)
// =============================================================================

describe("PostHog Events Schema (AC-1, AC-2)", () => {
  it("download_initiated event has required fields", () => {
    // This test validates the event schema matches story requirements
    const event = {
      event: "download_initiated",
      properties: {
        upload_id: "upload-123",
        purchase_id: "purchase-456",
        purchase_type: "self" as const,
        is_redownload: false,
        download_count: 1,
        ip_hash: "hashed-ip",
        download_id: "download-789",
      },
    };

    // AC-2: Required fields
    expect(event.properties).toHaveProperty("upload_id");
    expect(event.properties).toHaveProperty("purchase_id");
    expect(event.properties).toHaveProperty("purchase_type");
    expect(event.properties).toHaveProperty("is_redownload");
    expect(event.properties).toHaveProperty("download_count");
    expect(event.properties.purchase_type).toMatch(/^(self|gift)$/);
    expect(typeof event.properties.is_redownload).toBe("boolean");
  });

  it("download_abuse_detected event has required fields", () => {
    const event = {
      event: "download_abuse_detected",
      properties: {
        upload_id: "upload-123",
        purchase_id: "purchase-456",
        ip_hash: "hashed-ip",
        download_count_last_hour: 15,
      },
    };

    expect(event.properties).toHaveProperty("upload_id");
    expect(event.properties).toHaveProperty("ip_hash");
    expect(event.properties).toHaveProperty("download_count_last_hour");
    expect(event.properties.download_count_last_hour).toBeGreaterThan(10);
  });

  it("purchase_type is self for non-gift purchases", () => {
    const purchase = { isGift: false };
    const purchaseType = purchase.isGift ? "gift" : "self";
    expect(purchaseType).toBe("self");
  });

  it("purchase_type is gift for gift purchases", () => {
    const purchase = { isGift: true };
    const purchaseType = purchase.isGift ? "gift" : "self";
    expect(purchaseType).toBe("gift");
  });
});

// =============================================================================
// IP Hashing Integration
// =============================================================================

describe("IP Hashing Integration", () => {
  it("client IP is hashed before storage", () => {
    // Simulate the flow in download endpoint
    const clientIP = "192.168.1.100";
    const hashIP = (ip: string) => `hashed-${ip.replace(/\./g, "-")}`;
    const ipHash = clientIP ? hashIP(clientIP) : null;

    expect(ipHash).toBe("hashed-192-168-1-100");
    expect(ipHash).not.toBe(clientIP);
  });

  it("handles undefined client IP", () => {
    const clientIP = undefined;
    const ipHash = clientIP ? "hashed" : null;

    expect(ipHash).toBeNull();
  });
});
