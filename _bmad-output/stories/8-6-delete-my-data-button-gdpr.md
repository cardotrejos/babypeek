# Story 8.6: Delete My Data Button (GDPR)

Status: ready-for-dev

## Story

As a **user**,
I want **to delete all my data**,
so that **I have control over my personal information**.

## Acceptance Criteria

1. **AC-1:** Given I'm viewing my result, when I tap "Delete My Data", then I see a confirmation dialog
2. **AC-2:** Confirming calls DELETE /api/data/:token
3. **AC-3:** Deletion removes: upload record, result images from R2, email hash
4. **AC-4:** The deletion is logged for compliance audit
5. **AC-5:** I see confirmation "Your data has been deleted"
6. **AC-6:** I'm redirected to the homepage
7. **AC-7:** Session token is cleared from localStorage

## Tasks / Subtasks

- [ ] **Task 1: Create Delete Data API endpoint** (AC: 2, 3, 4)
  - [ ] Create `packages/api/src/routes/data.ts`
  - [ ] Implement `DELETE /api/data/:token` endpoint
  - [ ] Validate session token
  - [ ] Delete images from R2
  - [ ] Delete database records
  - [ ] Log deletion for audit

- [ ] **Task 2: Create DeleteDataButton component** (AC: 1, 5, 6, 7)
  - [ ] Create `apps/web/src/components/settings/DeleteDataButton.tsx`
  - [ ] Show confirmation dialog before deletion
  - [ ] Display loading state during deletion
  - [ ] Show success message
  - [ ] Clear localStorage
  - [ ] Redirect to homepage

- [ ] **Task 3: Add to RevealUI** (AC: 1)
  - [ ] Add DeleteDataButton to result page
  - [ ] Position in footer or settings section
  - [ ] Style as destructive action (red, outline)

- [ ] **Task 4: Add analytics tracking**
  - [ ] Track `data_deletion_requested` event
  - [ ] Track `data_deletion_completed` event
  - [ ] No PII in events

- [ ] **Task 5: Write tests**
  - [ ] Unit test: Confirmation dialog shows
  - [ ] Unit test: API deletes records
  - [ ] Unit test: R2 images deleted
  - [ ] Integration test: Full deletion flow

## Dev Notes

### Architecture Compliance

- **API Pattern:** DELETE endpoint with session token auth
- **Effect Services:** Use R2Service and DbService
- **GDPR:** Log deletions for compliance audit

### Delete API Implementation

```typescript
// packages/api/src/routes/data.ts
import { Hono } from "hono"
import { Effect } from "effect"
import { eq } from "drizzle-orm"
import { db, uploads, results, purchases } from "@3d-ultra/db"
import { R2Service, R2ServiceLive } from "../services/R2Service"
import { NotFoundError, UnauthorizedError } from "../lib/errors"

const app = new Hono()

/**
 * DELETE /api/data/:token
 * GDPR Data Deletion Endpoint
 * 
 * Story 8.6: Delete My Data Button
 * 
 * Deletes all user data associated with the session token:
 * - Upload record
 * - Result images from R2
 * - Result database record
 * - Purchase records (anonymized)
 */
app.delete("/:token", async (c) => {
  const token = c.req.param("token")

  if (!token) {
    return c.json({ success: false, error: "Token required" }, 400)
  }

  const program = Effect.gen(function* () {
    // Find upload by session token
    const upload = yield* Effect.promise(() =>
      db.query.uploads.findFirst({
        where: eq(uploads.sessionToken, token),
      })
    )

    if (!upload) {
      return yield* Effect.fail(new NotFoundError({ resource: "upload", id: token }))
    }

    const uploadId = upload.id

    // Log deletion request for GDPR audit (no PII)
    console.log(`[GDPR] Data deletion requested for upload: ${uploadId}`)

    // 1. Delete images from R2
    const r2Service = yield* R2Service
    
    // Delete original image
    if (upload.originalUrl) {
      yield* r2Service.deleteObject(`uploads/${uploadId}/original.jpg`).pipe(
        Effect.catchAll(() => Effect.succeed(undefined)) // Ignore if not found
      )
    }
    
    // Delete result images
    if (upload.resultUrl) {
      yield* r2Service.deleteObject(`results/${uploadId}/full.jpg`).pipe(
        Effect.catchAll(() => Effect.succeed(undefined))
      )
    }
    if (upload.previewUrl) {
      yield* r2Service.deleteObject(`results/${uploadId}/preview.jpg`).pipe(
        Effect.catchAll(() => Effect.succeed(undefined))
      )
    }

    // 2. Anonymize/delete purchase records (keep for accounting)
    yield* Effect.promise(() =>
      db.update(purchases)
        .set({ email: "deleted@gdpr.local" })
        .where(eq(purchases.uploadId, uploadId))
    )

    // 3. Delete result record if exists
    yield* Effect.promise(() =>
      db.delete(results)
        .where(eq(results.uploadId, uploadId))
    )

    // 4. Delete upload record
    yield* Effect.promise(() =>
      db.delete(uploads)
        .where(eq(uploads.id, uploadId))
    )

    // Log successful deletion for audit
    console.log(`[GDPR] Data deletion completed for upload: ${uploadId}`)

    return { success: true, message: "Your data has been deleted" }
  })

  const result = await Effect.runPromise(
    program.pipe(Effect.provide(R2ServiceLive))
  ).catch((error) => {
    if (error instanceof NotFoundError) {
      return { error: "NOT_FOUND", status: 404 }
    }
    console.error("[data] Deletion error:", error)
    return { error: "INTERNAL_ERROR", status: 500 }
  })

  if ("error" in result) {
    return c.json({ success: false, error: result.error }, result.status as 404 | 500)
  }

  return c.json(result)
})

export default app
```

### DeleteDataButton Component

```typescript
// apps/web/src/components/settings/DeleteDataButton.tsx
import { useState, useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { posthog, isPostHogConfigured } from "@/lib/posthog"
import { clearSession, clearJobData } from "@/lib/session"
import { API_BASE_URL } from "@/lib/api-config"

interface DeleteDataButtonProps {
  uploadId: string
  sessionToken: string
}

export function DeleteDataButton({ uploadId, sessionToken }: DeleteDataButtonProps) {
  const navigate = useNavigate()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleDelete = useCallback(async () => {
    if (isPostHogConfigured()) {
      posthog.capture("data_deletion_requested", {
        upload_id: uploadId,
      })
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/data/${sessionToken}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete data")
      }

      // Clear local storage
      clearSession(uploadId)
      clearJobData(uploadId)
      localStorage.removeItem(`3d-ultra-result-upload-${uploadId}`)

      if (isPostHogConfigured()) {
        posthog.capture("data_deletion_completed", {
          upload_id: uploadId,
        })
      }

      toast.success("Your data has been deleted")
      
      // Redirect to homepage
      navigate({ to: "/" })
    } catch (error) {
      toast.error("Couldn't delete your data. Please try again.")
      setIsDeleting(false)
    }
  }, [uploadId, sessionToken, navigate])

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          Delete My Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Your Data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your ultrasound image and AI portrait.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600"
          >
            {isDeleting ? "Deleting..." : "Delete Everything"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
