# Story 8.6: Delete My Data Button (GDPR)

Status: done

## Story

As a **user**,
I want **to delete all my data**,
so that **I have control over my personal information**.

## Acceptance Criteria

1. **AC-1:** Given I'm viewing my result, when I tap "Delete My Data", then I see a confirmation dialog
2. **AC-2:** Confirming calls DELETE /api/data/:token
3. **AC-3:** Deletion removes: upload record, result images from R2, email (via upload record deletion, purchases.giftRecipientEmail anonymized)
4. **AC-4:** The deletion is logged for compliance audit (console.log, Sentry breadcrumbs, PostHog events)
5. **AC-5:** I see confirmation "Your data has been deleted"
6. **AC-6:** I'm redirected to the homepage
7. **AC-7:** Session token is cleared from localStorage

## Tasks / Subtasks

- [x] **Task 1: Create Delete Data API endpoint** (AC: 2, 3, 4)
  - [x] Create `packages/api/src/routes/data.ts`
  - [x] Implement `DELETE /api/data/:token` endpoint
  - [x] Validate session token
  - [x] Delete images from R2
  - [x] Delete database records
  - [x] Log deletion for audit

- [x] **Task 2: Create DeleteDataButton component** (AC: 1, 5, 6, 7)
  - [x] Create `apps/web/src/components/settings/DeleteDataButton.tsx`
  - [x] Show confirmation dialog before deletion
  - [x] Display loading state during deletion
  - [x] Show success message
  - [x] Clear localStorage
  - [x] Redirect to homepage

- [x] **Task 3: Add to RevealUI** (AC: 1)
  - [x] Add DeleteDataButton to result page
  - [x] Position in footer or settings section
  - [x] Style as destructive action (red, outline)

- [x] **Task 4: Add analytics tracking**
  - [x] Track `data_deletion_requested` event
  - [x] Track `data_deletion_completed` event
  - [x] No PII in events

- [x] **Task 5: Write tests**
  - [x] Unit test: Confirmation dialog shows
  - [x] Unit test: API deletes records
  - [x] Unit test: R2 images deleted
  - [x] Integration test: Full deletion flow

### Review Follow-ups (AI)

- [ ] [AI-Review][Medium] Consider adding rate limiting to DELETE /api/data/:token endpoint to prevent token enumeration attacks [packages/api/src/routes/data.ts]

## Dev Notes

### Architecture Compliance

- **API Pattern:** DELETE endpoint with session token auth
- **Effect Services:** Use R2Service and DbService
- **GDPR:** Log deletions for compliance audit

### Delete API Implementation

> **Note:** The implementation uses `deletePrefix()` for efficient bulk deletion and proper FK handling.

```typescript
// packages/api/src/routes/data.ts (ACTUAL IMPLEMENTATION)
import { Hono } from "hono"
import { Effect } from "effect"
import { eq } from "drizzle-orm"
import { db, uploads, purchases, downloads } from "@babypeek/db"
import { R2Service, R2ServiceLive } from "../services/R2Service"
import { NotFoundError } from "../lib/errors"
import { addBreadcrumb, captureException } from "../middleware/sentry"
import { captureEvent } from "../services/PostHogService"

// Key implementation details:
// 1. Uses deletePrefix() for bulk R2 deletion (more efficient than individual deletes)
// 2. Deletes download records before purchases (FK constraint)
// 3. Anonymizes giftRecipientEmail on purchases (keeps records for accounting)
// 4. Deletes upload record last
// 5. Audit logging via console.log, Sentry breadcrumbs, and PostHog events

app.delete("/:token", async (c) => {
  // ... see actual file for full implementation
})
```

### DeleteDataButton Component

> **Note:** Uses `@base-ui/react` AlertDialog (not Radix), so `render={}` prop instead of `asChild`.

```typescript
// apps/web/src/components/settings/DeleteDataButton.tsx (ACTUAL IMPLEMENTATION)
// Key implementation details:
// 1. Uses clearSession() from session.ts (no clearJobData - that's handled internally)
// 2. AlertDialogTrigger uses render={} prop (base-ui pattern, not asChild)
// 3. Shows context-aware error messages
// 4. Analytics via PostHog (data_deletion_requested, data_deletion_completed)
// 5. Clears localStorage including result mapping key

// See actual file for full implementation
```

### Add Route to Server

```typescript
// packages/api/src/index.ts
import dataRoutes from "./routes/data"

// Mount route
app.route("/api/data", dataRoutes)
```

### Integration in RevealUI

```typescript
// Add to RevealUI.tsx footer
<div className="pt-8 border-t border-warm-gray/10">
  <DeleteDataButton uploadId={uploadId} sessionToken={sessionToken} />
</div>
```

### File Structure

```
packages/api/src/routes/
├── data.ts              <- NEW: Delete endpoint
├── data.test.ts         <- NEW: Tests

apps/web/src/components/settings/
├── DeleteDataButton.tsx <- NEW: Delete button
├── index.ts             <- NEW: Barrel export
```

### GDPR Audit Logging

Deletion events are logged with:

- Timestamp
- Upload ID (no PII)
- Action (requested/completed)

Logs are stored in server logs for compliance audit requirements.

### Dependencies

- **R2Service:** Must have `deleteObject` method
- **AlertDialog:** From shadcn/ui (may need to add)

### R2Service Extension

Add `deleteObject` method if not present:

```typescript
// packages/api/src/services/R2Service.ts
deleteObject: (key: string) =>
  Effect.tryPromise({
    try: async () => {
      const command = new DeleteObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
      })
      await client.send(command)
    },
    catch: (error) => new R2Error({
      cause: "DELETE_FAILED",
      message: `Failed to delete ${key}: ${String(error)}`,
    }),
  })
```

### Parallel Work

Can be developed in parallel with:

- Story 8.7 (Auto-Delete)
- Story 8.8 (Expired Handling)

### References

- [Source: _bmad-output/epics.md#Story 8.6] - GDPR deletion requirements
- [Source: _bmad-output/architecture.md#GDPR Compliance] - Data deletion patterns
- [Source: packages/api/src/services/R2Service.ts] - R2 service for deletion

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- All tests pass: 10 API tests + 14 component tests

### Completion Notes List

- Implemented GDPR-compliant data deletion endpoint using Effect services
- Used R2Service.deletePrefix for efficient bulk deletion of uploaded/result images
- Properly anonymizes purchase records instead of deleting (accounting compliance)
- Deletes download records, then uploads (respects FK constraints)
- Added DeleteDataButton with AlertDialog confirmation dialog from shadcn/ui (base-ui)
- Integrated delete button into RevealUI footer section
- Analytics tracking via PostHog (no PII): data_deletion_requested, data_deletion_completed
- Server-side audit logging via console.log for GDPR compliance
- Comprehensive test coverage for both API and component

### Code Review Fixes Applied

- **H1 Fixed:** Updated Dev Notes to match actual implementation (deletePrefix vs deleteObject, base-ui render prop)
- **H2 Fixed:** Clarified AC-3 wording to reflect actual email handling
- **M3 Fixed:** Added audit logging test documentation
- **L1 Fixed:** Improved error messages in DeleteDataButton to be context-aware
- **M1 Action Item:** Rate limiting added as follow-up task (architectural decision needed)

### File List

**New Files:**

- packages/api/src/routes/data.ts - DELETE /api/data/:token endpoint
- packages/api/src/routes/data.test.ts - API endpoint tests (10 tests)
- apps/web/src/components/settings/DeleteDataButton.tsx - Confirmation dialog component
- apps/web/src/components/settings/DeleteDataButton.test.tsx - Component tests (14 tests)
- apps/web/src/components/settings/index.ts - Barrel export
- apps/web/src/components/ui/alert-dialog.tsx - shadcn AlertDialog component

**Modified Files:**

- packages/api/src/index.ts - Export dataRoutes
- apps/server/src/index.ts - Mount /api/data route
- apps/web/src/components/reveal/RevealUI.tsx - Add DeleteDataButton import and integration

## Change Log

- 2024-12-21: Story 8.6 implementation complete - GDPR delete data button with API, component, tests
- 2024-12-21: Code review fixes applied - Updated Dev Notes, clarified ACs, improved error handling, added audit test docs
