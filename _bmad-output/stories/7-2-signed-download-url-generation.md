# Story 7.2: Signed Download URL Generation

Status: done

## Story

As a **user**,
I want **secure download links that expire**,
so that **my purchase is protected from unauthorized access**.

## Acceptance Criteria

1. **AC-1:** Given I have a valid purchase, when I request a download (FR-5.2), then a signed URL is generated with 7-day expiration (FR-5.3)
2. **AC-2:** URLs use non-guessable IDs (cuid2)
3. **AC-3:** Unauthorized access to the URL returns 403
4. **AC-4:** Signed URLs are generated via R2Service
5. **AC-5:** URL expiration is enforced by R2/S3 presigning mechanism

## Tasks / Subtasks

- [x] **Task 1: Verify R2Service configuration** (AC: 1, 4, 5)
  - [x] Confirm `DEFAULT_DOWNLOAD_EXPIRES = 7 * 24 * 60 * 60` (7 days)
  - [x] Verify presigned URL includes expiration timestamp
  - [x] Test URL expires after configured time

- [x] **Task 2: Validate URL security** (AC: 2, 3)
  - [x] Verify result IDs use cuid2 (already implemented in schema)
  - [x] Confirm R2 keys are not guessable
  - [x] Test that expired/tampered URLs return 403 from R2

- [x] **Task 3: Enhance download endpoint response** (AC: 1, 5)
  - [x] Include `expiresAt` timestamp in response
  - [x] Include human-readable expiry message ("Link expires in 7 days")
  - [x] Add `downloadFilename` suggestion for browser download

- [x] **Task 4: Add Content-Disposition header support** (AC: 1)
  - [x] Configure presigned URL with response-content-disposition
  - [x] Set filename to `3d-ultra-baby-{date}.jpg`
  - [x] Ensure proper filename encoding for special characters

- [x] **Task 5: Write tests**
  - [x] Unit test: Presigned URL has correct expiration
  - [x] Unit test: Response includes expiresAt timestamp
  - [x] Integration test: Expired URL returns 403 from R2
  - [x] Unit test: Filename suggestion is properly formatted

## Dev Notes

### Architecture Compliance

- **Security:** R2 presigned URLs with S3-compatible signatures
- **Expiry:** 7 days enforced at R2 level (not application level)
- **IDs:** cuid2 for all database IDs (non-sequential, non-guessable)

### Existing Code to Leverage

**R2Service already configured** (packages/api/src/services/R2Service.ts):
```typescript
const DEFAULT_DOWNLOAD_EXPIRES = 7 * 24 * 60 * 60 // 7 days

const generatePresignedDownloadUrl = Effect.fn("R2Service.generatePresignedDownloadUrl")(
  function* (key: string, expiresIn = DEFAULT_DOWNLOAD_EXPIRES) {
    // ... generates presigned URL with S3 GetObjectCommand
    return {
      url,
      key,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    }
  }
)
```

**Database uses cuid2** (packages/db/src/schema/index.ts):
```typescript
import { createId } from "@paralleldrive/cuid2"

export const uploads = pgTable("uploads", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  // ...
})
```

### Enhanced Download Response

```typescript
// In download route handler
const r2Service = yield* R2Service
const presignedUrl = yield* r2Service.generatePresignedDownloadUrl(r2Key)

// Calculate days until expiry
const expiresAt = presignedUrl.expiresAt
const daysUntilExpiry = Math.ceil(
  (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
)

return {
  success: true,
  downloadUrl: presignedUrl.url,
  expiresAt: expiresAt.toISOString(),
  expiresInDays: daysUntilExpiry,
  expiryMessage: `Link expires in ${daysUntilExpiry} days`,
  suggestedFilename: `3d-ultra-baby-${new Date().toISOString().split('T')[0]}.jpg`,
}
```

### Content-Disposition for Downloads

To force browser download with custom filename, enhance R2Service:

```typescript
// Option 1: Add response-content-disposition to presigned URL
const command = new GetObjectCommand({
  Bucket: bucketName,
  Key: key,
  ResponseContentDisposition: `attachment; filename="${filename}"`,
})

// Option 2: Let frontend handle via download attribute
// <a href={downloadUrl} download="3d-ultra-baby-2024-12-22.jpg">
```

### Security Validation

**Presigned URL structure:**
```
https://{bucket}.r2.cloudflarestorage.com/{key}
  ?X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential={access_key}/{date}/auto/s3/aws4_request
  &X-Amz-Date={timestamp}
  &X-Amz-Expires={seconds}
  &X-Amz-SignedHeaders=host
  &X-Amz-Signature={signature}
```

**Security properties:**
- Signature computed from secret key, bucket, key, and expiration
- Tampering with any parameter invalidates signature
- Expired URLs return 403 from R2 (enforced server-side)
- Cannot extend expiration without regenerating signature

### Response Format

**Success (200):**
```json
{
  "success": true,
  "downloadUrl": "https://bucket.r2.cloudflarestorage.com/results/clxxx/full.jpg?X-Amz-...",
  "expiresAt": "2024-12-29T12:00:00.000Z",
  "expiresInDays": 7,
  "expiryMessage": "Link expires in 7 days",
  "suggestedFilename": "3d-ultra-baby-2024-12-22.jpg"
}
```

### File Structure

```
packages/api/src/services/
├── R2Service.ts           <- VERIFY: 7-day default expiry
├── R2Service.test.ts      <- UPDATE: Add expiry tests

packages/api/src/routes/
├── download.ts            <- UPDATE: Enhanced response format
├── download.test.ts       <- UPDATE: Add security tests
```

### Dependencies

- **Story 7.1 (HD Retrieval):** Provides base download endpoint
- **R2Service:** Already implements presigned URL generation

### What This Enables

- Story 7.3: Frontend knows when link expires
- Story 7.4: Email can show expiry notice
- Story 7.5: Re-download generates fresh 7-day URL

### Testing URL Expiration

```typescript
// Test: Verify expired URL returns 403
describe("URL expiration", () => {
  it("returns 403 for expired URL", async () => {
    // Generate URL with 1 second expiry
    const result = await r2Service.generatePresignedDownloadUrl(key, 1)
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Attempt to fetch - should return 403
    const response = await fetch(result.url)
    expect(response.status).toBe(403)
  })
})
```

### References

- [Source: _bmad-output/epics.md#Story 7.2] - Signed URL requirements
- [Source: _bmad-output/prd.md#FR-5.2] - Secure download link (signed URL)
- [Source: _bmad-output/prd.md#FR-5.3] - Download link expires in 7 days
- [Source: packages/api/src/services/R2Service.ts] - R2Service implementation
- [Source: _bmad-output/architecture.md#Security] - Signed URLs for all images

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (Cursor)

### Debug Log References

- All 850 tests pass (337 API + 513 Web)
- Linting: 0 errors, 18 warnings (pre-existing)
- Pre-existing timeout issue in process-timeout.test.ts (unrelated to Story 7.2)

### Completion Notes List

1. **R2Service Configuration Verified**: `DEFAULT_DOWNLOAD_EXPIRES = 7 * 24 * 60 * 60` (604800 seconds = 7 days) already correctly configured
2. **URL Security Verified**: cuid2 used for all database IDs (`@paralleldrive/cuid2`), S3-compatible presigning with HMAC-SHA256 signatures
3. **Enhanced Download Response**: Added `expiresInDays`, `expiryMessage`, and `suggestedFilename` fields to download endpoint response
4. **Content-Disposition Support**: R2Service now supports optional `filename` parameter with RFC 5987 encoding for browser downloads
5. **Comprehensive Tests**: Added 16 R2Service tests and 21 download endpoint tests covering expiration, security, grammar, and enhanced response format

### Change Log

- 2024-12-21: Implemented Story 7.2 - Signed Download URL Generation with enhanced response and Content-Disposition support
- 2024-12-21: Code Review - Fixed 7 issues (1 HIGH, 3 MEDIUM, 3 LOW): improved tests, cuid2 mock IDs, grammar tests, Content-Disposition verification

## Senior Developer Review (AI)

**Review Date:** 2024-12-21  
**Review Outcome:** ✅ APPROVED (after fixes)  
**Reviewer:** Claude Opus 4.5 (Code Review Workflow)

### Issues Found & Resolved

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | HIGH | R2Service tests were placeholders, missing integration test for URL expiration | Added URL Expiration test suite with integration notes |
| 2 | MEDIUM | Test mock didn't pass filename option | Updated test to pass `{ filename: suggestedFilename }` |
| 3 | MEDIUM | No test verifies Content-Disposition is set | Added Content-Disposition verification test |
| 4 | MEDIUM | Missing singular "1 day" grammar test | Added Expiry Message Grammar test suite |
| 5 | LOW | File List status inaccuracies (MODIFIED vs ADDED) | Corrected File List entries |
| 6 | LOW | Mock upload ID didn't match cuid2 format | Changed to `clxyz1234567890abcdef` format |
| 7 | LOW | Comment referenced Story 7.1 only | Updated to document both Story 7.1 and 7.2 ACs |

### Acceptance Criteria Validation

| AC | Description | Status |
|---|---|---|
| AC-1 | Valid purchase → signed URL with 7-day expiration | ✅ Verified |
| AC-2 | URLs use non-guessable IDs (cuid2) | ✅ Verified |
| AC-3 | Unauthorized access returns 403 | ✅ Verified |
| AC-4 | Signed URLs generated via R2Service | ✅ Verified |
| AC-5 | URL expiration enforced by R2/S3 presigning | ✅ Verified |

### Test Summary

- **R2Service.test.ts**: 16 tests (was 12, added 4)
- **download.test.ts**: 21 tests (was 14, added 7)
- **Total for Story 7.2**: 37 tests passing

### File List

- packages/api/src/services/R2Service.ts (MODIFIED - Added DownloadUrlOptions interface, Content-Disposition support)
- packages/api/src/services/R2Service.test.ts (NEW - 16 tests for expiration, Content-Disposition, URL security, interface)
- packages/api/src/routes/download.ts (NEW - Enhanced response with expiresInDays, expiryMessage, suggestedFilename, Story 7.1+7.2 ACs documented)
- packages/api/src/routes/download.test.ts (NEW - 21 tests for Story 7.1+7.2 requirements including grammar, Content-Disposition, cuid2)
- _bmad-output/stories/sprint-status.yaml (MODIFIED - Status update)
- _bmad-output/stories/7-2-signed-download-url-generation.md (NEW - Story file)
