import { Effect, Context, Layer } from "effect";
import { eq, count, and, gt } from "drizzle-orm";
import { db, downloads } from "@babypeek/db";
import { hashIP } from "../lib/hash";

// =============================================================================
// DownloadService Definition
// Story 7.6: Download Tracking
// =============================================================================

export class DownloadService extends Context.Tag("DownloadService")<
  DownloadService,
  {
    /**
     * Record a download event
     * AC-3: Stores download in database
     * AC-4: Hashes IP for privacy
     */
    recordDownload: (params: {
      purchaseId: string;
      clientIP?: string;
    }) => Effect.Effect<{ downloadId: string; downloadCount: number }, never>;

    /**
     * Get download count for a purchase
     * AC-5: Query helper for analytics
     */
    getDownloadCount: (purchaseId: string) => Effect.Effect<number, never>;

    /**
     * Check if this is a re-download (has previous downloads)
     * AC-2: Calculate is_redownload flag
     */
    isRedownload: (purchaseId: string) => Effect.Effect<boolean, never>;

    /**
     * Get download history for a purchase
     * AC-5: For admin/analytics queries
     */
    getDownloadHistory: (purchaseId: string) => Effect.Effect<
      Array<{
        id: string;
        downloadedAt: Date;
        ipHash: string | null;
      }>,
      never
    >;

    /**
     * Check for potential abuse (many downloads from same IP in short time)
     * Returns count of downloads from this IP hash in the last hour
     */
    checkAbusePattern: (
      ipHash: string,
    ) => Effect.Effect<{ count: number; isAbusive: boolean }, never>;
  }
>() {}

// =============================================================================
// DownloadService Implementation
// =============================================================================

const recordDownload = Effect.fn("DownloadService.recordDownload")(function* (params: {
  purchaseId: string;
  clientIP?: string;
}) {
  // AC-4: Hash IP for privacy (never store raw)
  const ipHash = params.clientIP ? hashIP(params.clientIP) : null;

  // Insert download record
  const result = yield* Effect.promise(() =>
    db
      .insert(downloads)
      .values({
        purchaseId: params.purchaseId,
        ipHash,
      })
      .returning(),
  );

  const downloadRecord = result[0];
  if (!downloadRecord) {
    // Should never happen, but handle gracefully
    return { downloadId: "unknown", downloadCount: 1 };
  }

  // Get total download count for this purchase
  const countResult = yield* Effect.promise(() =>
    db
      .select({ count: count() })
      .from(downloads)
      .where(eq(downloads.purchaseId, params.purchaseId)),
  );

  return {
    downloadId: downloadRecord.id,
    downloadCount: countResult[0]?.count ?? 1,
  };
});

const getDownloadCount = Effect.fn("DownloadService.getDownloadCount")(function* (
  purchaseId: string,
) {
  const result = yield* Effect.promise(() =>
    db.select({ count: count() }).from(downloads).where(eq(downloads.purchaseId, purchaseId)),
  );
  return result[0]?.count ?? 0;
});

const isRedownload = (purchaseId: string) =>
  Effect.gen(function* () {
    const downloadCount = yield* getDownloadCount(purchaseId);
    // First download = false (count is 0 before recording), subsequent = true
    return downloadCount > 0;
  }).pipe(Effect.withSpan("DownloadService.isRedownload"));

const getDownloadHistory = Effect.fn("DownloadService.getDownloadHistory")(function* (
  purchaseId: string,
) {
  const result = yield* Effect.promise(() =>
    db
      .select({
        id: downloads.id,
        downloadedAt: downloads.downloadedAt,
        ipHash: downloads.ipHash,
      })
      .from(downloads)
      .where(eq(downloads.purchaseId, purchaseId))
      .orderBy(downloads.downloadedAt),
  );
  return result;
});

const checkAbusePattern = Effect.fn("DownloadService.checkAbusePattern")(function* (
  ipHash: string,
) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const result = yield* Effect.promise(() =>
    db
      .select({ count: count() })
      .from(downloads)
      .where(and(eq(downloads.ipHash, ipHash), gt(downloads.downloadedAt, oneHourAgo))),
  );

  const downloadCount = result[0]?.count ?? 0;
  // Flag as potentially abusive if >10 downloads from same IP in 1 hour
  return {
    count: downloadCount,
    isAbusive: downloadCount > 10,
  };
});

// =============================================================================
// DownloadService Live Layer
// =============================================================================

export const DownloadServiceLive = Layer.succeed(DownloadService, {
  recordDownload,
  getDownloadCount,
  isRedownload,
  getDownloadHistory,
  checkAbusePattern,
});

// =============================================================================
// DownloadService Mock for Testing
// =============================================================================

export const DownloadServiceMock = Layer.succeed(DownloadService, {
  recordDownload: (_params: { purchaseId: string; clientIP?: string }) =>
    Effect.succeed({ downloadId: "mock-download-id", downloadCount: 1 }),
  getDownloadCount: (_purchaseId: string) => Effect.succeed(0),
  isRedownload: (_purchaseId: string) => Effect.succeed(false),
  getDownloadHistory: (_purchaseId: string) => Effect.succeed([]),
  checkAbusePattern: (_ipHash: string) => Effect.succeed({ count: 0, isAbusive: false }),
});
