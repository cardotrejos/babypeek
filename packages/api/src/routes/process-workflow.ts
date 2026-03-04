/**
 * Process Workflow Route
 *
 * A simple route that triggers the workflow-based image processing.
 * Uses Workflow DevKit for durable execution.
 */

import { Hono } from "hono";
import { z } from "zod";
import { start } from "workflow/api";
import { db, uploads } from "@babypeek/db";
import { eq } from "drizzle-orm";
import { processImageWorkflowSimple, type PromptVersion } from "../workflows/process-image-simple";
import { requireAuth } from "../middleware/auth";

const app = new Hono();

const processRequestSchema = z.object({
  uploadId: z.string().min(1, "Upload ID is required"),
  promptVersion: z.enum(["v3", "v3-json", "v4", "v4-json"]).optional(),
});

/**
 * POST /api/process-workflow
 *
 * Trigger image processing via durable workflow.
 * This endpoint validates auth and triggers the workflow asynchronously.
 */
app.post("/", requireAuth, async (c) => {
  const user = c.get("user") as { id: string };
  if (!user?.id) {
    return c.json({ error: "Authentication required", code: "UNAUTHENTICATED" }, 401);
  }

  // Parse request body
  const body = await c.req.json().catch(() => ({}));
  const parsed = processRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid request",
        details: parsed.error.format(),
      },
      400,
    );
  }

  const { uploadId, promptVersion } = parsed.data;

  try {
    // Verify upload exists and user owns it
    const upload = await db.query.uploads.findFirst({
      where: eq(uploads.id, uploadId),
    });

    if (!upload) {
      return c.json({ error: "Upload not found", code: "NOT_FOUND" }, 404);
    }

    if (upload.userId !== user.id) {
      return c.json({ error: "Upload not found", code: "NOT_FOUND" }, 404);
    }

    if (upload.status !== "pending") {
      return c.json(
        {
          error: "Upload is already being processed",
          code: "ALREADY_PROCESSING",
          currentStatus: upload.status,
        },
        409,
      );
    }

    // Trigger the workflow with optional promptVersion
    const run = await start(processImageWorkflowSimple, [
      {
        uploadId,
        promptVersion: promptVersion as PromptVersion | undefined,
      },
    ]);

    // Update upload with workflow run ID
    await db
      .update(uploads)
      .set({
        status: "processing",
        workflowRunId: run.runId,
        updatedAt: new Date(),
      })
      .where(eq(uploads.id, uploadId));

    return c.json({
      success: true,
      jobId: uploadId,
      status: "processing",
      workflowRunId: run.runId,
    });
  } catch (error) {
    console.error("[process-workflow] Error:", error);
    return c.json(
      {
        error: "Failed to start processing",
        code: "WORKFLOW_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export default app;
