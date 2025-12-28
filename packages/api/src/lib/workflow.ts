/**
 * Workflow DevKit Utilities
 *
 * This module provides utilities for working with Vercel Workflow DevKit.
 *
 * Workflow DevKit uses directives:
 * - "use workflow" - Marks a function as a durable workflow
 * - "use step" - Marks a function as a workflow step (auto-retried)
 *
 * Key features:
 * - Durable execution: Survives function timeouts
 * - Automatic retries: Steps retry on failure
 * - Observability: Built-in tracing and debugging
 *
 * @see https://useworkflow.dev/docs
 */

/**
 * Workflow configuration for the process-image workflow.
 * These are the stages the workflow goes through.
 */
export const PROCESS_IMAGE_STAGES = [
  "validating",
  "generating",
  "storing",
  "watermarking",
  "complete",
] as const;

export type ProcessImageStage = (typeof PROCESS_IMAGE_STAGES)[number];

/**
 * Type for workflow run result from start()
 */
export interface WorkflowRunResult {
  runId: string;
  status: Promise<"running" | "completed" | "failed">;
  returnValue: Promise<unknown>;
}
