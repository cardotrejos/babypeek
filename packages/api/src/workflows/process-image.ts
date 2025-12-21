/**
 * Process Image Workflow
 *
 * This durable workflow handles the long-running AI image processing.
 * It survives Vercel function timeouts (60s) because Workflow DevKit
 * manages execution across multiple function invocations.
 *
 * Stages:
 * 1. validating - Validate input and prepare for processing
 * 2. generating - Call Gemini Imagen 3 API (Story 4.2)
 * 3. storing - Store result in R2 (Story 4.4)
 * 4. watermarking - Apply watermark (Story 5.2)
 * 5. complete - Finalize and update status
 *
 * @see https://useworkflow.dev/docs
 * @see Story 4.2 - Gemini Imagen 3 Integration
 */

import { Effect } from "effect"
import type { ProcessImageStage } from "../lib/workflow"
import { GeminiService, type GeneratedImage } from "../services/GeminiService"
import { R2Service } from "../services/R2Service"
import { PostHogService } from "../services/PostHogService"
import { AppServicesLive } from "../services/index"
import { getPrompt, type PromptVersion } from "../prompts/baby-portrait"
import type { GeminiError } from "../lib/errors"

// =============================================================================
// Workflow Types
// =============================================================================

/**
 * Input for the process-image workflow
 */
export interface ProcessImageInput {
  uploadId: string
  promptVersion?: PromptVersion
}

/**
 * Output from the process-image workflow
 */
export interface ProcessImageOutput {
  resultId: string
  stage: ProcessImageStage
  error?: string
  generatedImageKey?: string
}

/**
 * Internal result from the generate step
 */
interface GenerateResult {
  success: boolean
  imageData?: GeneratedImage
  error?: string
  durationMs?: number
}

// =============================================================================
// Effect-based Helpers
// =============================================================================

/**
 * Run an Effect with AppServicesLive layer.
 * Used to execute Effect-based service calls within workflow steps.
 */
async function runWithServices<A, E>(
  effect: Effect.Effect<A, E, GeminiService | R2Service | PostHogService>
): Promise<{ success: true; data: A } | { success: false; error: E }> {
  const program = effect.pipe(Effect.provide(AppServicesLive))

  try {
    const result = await Effect.runPromise(program)
    return { success: true, data: result }
  } catch (e) {
    return { success: false, error: e as E }
  }
}

/**
 * Track analytics event via PostHog.
 */
async function trackEvent(event: string, uploadId: string, properties?: Record<string, unknown>): Promise<void> {
  const effect = Effect.gen(function* () {
    const posthog = yield* PostHogService
    yield* posthog.capture(event, uploadId, properties)
  })

  await runWithServices(effect)
}

// =============================================================================
// Workflow Steps
// =============================================================================

/**
 * Validate the upload before processing.
 * Ensures the upload exists and is in the correct state.
 */
async function validateUpload(uploadId: string): Promise<{ valid: boolean; error?: string }> {
  "use step"

  console.log(`[workflow:validate] Validating upload: ${uploadId}`)

  // Validate the uploadId is present
  if (!uploadId) {
    return { valid: false, error: "Upload ID is required" }
  }

  // TODO: In future stories, add:
  // - Verify upload exists in database
  // - Check upload is in 'processing' status
  // - Validate image file exists in R2
  // - Check image format and size constraints

  return { valid: true }
}

/**
 * Fetch the original image from R2.
 * Returns a signed URL for the image.
 */
async function fetchOriginalImage(uploadId: string): Promise<{ url: string | null; error?: string }> {
  "use step"

  console.log(`[workflow:fetch] Fetching original image for upload: ${uploadId}`)

  // The original image key follows the pattern: uploads/{uploadId}/original.jpg
  const imageKey = `uploads/${uploadId}/original.jpg`

  const effect = Effect.gen(function* () {
    const r2 = yield* R2Service
    const presigned = yield* r2.generatePresignedDownloadUrl(imageKey, 300) // 5 min expiry
    return presigned.url
  })

  const result = await runWithServices(effect)

  if (result.success) {
    return { url: result.data }
  }

  console.error(`[workflow:fetch] Failed to fetch original image:`, result.error)
  return { url: null, error: `Failed to fetch original image: ${String(result.error)}` }
}

/**
 * Generate the AI-enhanced image using Gemini Imagen 3.
 * This is the core AI processing step (Story 4.2).
 */
async function generateImage(
  uploadId: string,
  imageUrl: string,
  promptVersion: PromptVersion = "v3"
): Promise<GenerateResult> {
  "use step"

  console.log(`[workflow:generate] Generating image for upload: ${uploadId} with prompt ${promptVersion}`)

  const startTime = Date.now()

  // Track start event
  await trackEvent("gemini_call_started", uploadId, {
    upload_id: uploadId,
    prompt_version: promptVersion,
  })

  // Get the prompt template
  const prompt = getPrompt(promptVersion)

  // Call GeminiService to generate the image
  const effect = Effect.gen(function* () {
    const gemini = yield* GeminiService
    return yield* gemini.generateImageFromUrl(imageUrl, prompt)
  })

  const result = await runWithServices(effect)
  const durationMs = Date.now() - startTime

  if (result.success) {
    // Track success event
    await trackEvent("gemini_call_completed", uploadId, {
      upload_id: uploadId,
      duration_ms: durationMs,
      prompt_version: promptVersion,
      image_size_bytes: result.data.data.length,
    })

    console.log(`[workflow:generate] Successfully generated image in ${durationMs}ms`)
    return {
      success: true,
      imageData: result.data,
      durationMs,
    }
  }

  // Handle error
  const geminiError = result.error as GeminiError
  const errorType = geminiError?.cause || "UNKNOWN"
  const errorMessage = geminiError?.message || String(result.error)

  // Track failure event
  await trackEvent("gemini_call_failed", uploadId, {
    upload_id: uploadId,
    error_type: errorType,
    error_message: errorMessage,
    duration_ms: durationMs,
    prompt_version: promptVersion,
  })

  console.error(`[workflow:generate] Failed to generate image:`, errorMessage)
  return {
    success: false,
    error: errorMessage,
    durationMs,
  }
}

/**
 * Store the generated result image in R2.
 *
 * Note: Full implementation in Story 4.4
 */
async function storeResult(
  uploadId: string,
  imageData: GeneratedImage | undefined
): Promise<{ resultKey: string | null; error?: string }> {
  "use step"

  console.log(`[workflow:store] Storing result for upload: ${uploadId}`)

  if (!imageData) {
    return { resultKey: null, error: "No image data to store" }
  }

  // Store the generated image in R2
  const resultKey = `uploads/${uploadId}/generated.jpg`

  const effect = Effect.gen(function* () {
    const r2 = yield* R2Service
    yield* r2.upload(resultKey, imageData.data, imageData.mimeType)
    return resultKey
  })

  const result = await runWithServices(effect)

  if (result.success) {
    console.log(`[workflow:store] Stored generated image at: ${result.data}`)
    return { resultKey: result.data }
  }

  console.error(`[workflow:store] Failed to store result:`, result.error)
  return { resultKey: null, error: `Failed to store result: ${String(result.error)}` }
}

/**
 * Apply watermark to the preview image.
 *
 * Note: Full implementation in Story 5.2
 */
async function applyWatermark(
  uploadId: string,
  _resultKey: string
): Promise<{ previewKey: string | null; error?: string }> {
  "use step"

  console.log(`[workflow:watermark] Applying watermark for upload: ${uploadId}`)

  // Placeholder for Story 5.2 - Watermark Application
  // This will:
  // 1. Load the generated image
  // 2. Apply watermark overlay
  // 3. Store watermarked preview version

  return {
    previewKey: null,
    error: "Not yet implemented - see Story 5.2",
  }
}

/**
 * Update the final status of the processing job.
 */
async function finalizeProcessing(
  uploadId: string,
  success: boolean,
  resultKey?: string
): Promise<void> {
  "use step"

  console.log(`[workflow:finalize] Finalizing upload: ${uploadId}, success: ${success}`)

  // Track completion event
  await trackEvent(success ? "processing_completed" : "processing_failed", uploadId, {
    upload_id: uploadId,
    result_key: resultKey,
    success,
  })

  // TODO (Story 4.5): Update database status to 'completed' or 'failed'
  // TODO (Story 5.x): Send notification if configured

  if (!success) {
    console.error(`[workflow:finalize] Processing failed for upload: ${uploadId}`)
  } else {
    console.log(`[workflow:finalize] Processing completed for upload: ${uploadId}, resultKey: ${resultKey}`)
  }
}

// =============================================================================
// Main Workflow
// =============================================================================

/**
 * Main workflow function for processing an uploaded image.
 *
 * This is the durable workflow that orchestrates the entire
 * image processing pipeline. It uses the "use workflow" directive
 * to mark it as a Workflow DevKit workflow.
 *
 * The workflow will automatically:
 * - Persist state between steps
 * - Retry failed steps
 * - Resume from where it left off after function timeouts
 *
 * @param input - The workflow input containing uploadId
 * @returns ProcessImageOutput with resultId and final stage
 */
export async function processImageWorkflow(input: ProcessImageInput): Promise<ProcessImageOutput> {
  "use workflow"

  const { uploadId, promptVersion = "v3" } = input
  console.log(`[workflow:start] Starting process-image workflow for upload: ${uploadId}`)

  // Stage 1: Validate
  const validation = await validateUpload(uploadId)
  if (!validation.valid) {
    await finalizeProcessing(uploadId, false)
    return {
      resultId: uploadId,
      stage: "validating",
      error: validation.error,
    }
  }

  // Stage 1.5: Fetch original image from R2
  const fetchResult = await fetchOriginalImage(uploadId)
  if (!fetchResult.url) {
    await finalizeProcessing(uploadId, false)
    return {
      resultId: uploadId,
      stage: "validating",
      error: fetchResult.error || "Failed to fetch original image",
    }
  }

  // Stage 2: Generate image using Gemini (Story 4.2)
  const generation = await generateImage(uploadId, fetchResult.url, promptVersion)
  if (!generation.success || !generation.imageData) {
    await finalizeProcessing(uploadId, false)
    return {
      resultId: uploadId,
      stage: "generating",
      error: generation.error || "Failed to generate image",
    }
  }

  // Stage 3: Store result in R2 (Story 4.4 - basic implementation here)
  const storage = await storeResult(uploadId, generation.imageData)
  if (!storage.resultKey) {
    await finalizeProcessing(uploadId, false)
    return {
      resultId: uploadId,
      stage: "storing",
      error: storage.error || "Failed to store result",
    }
  }

  // Stage 4: Watermark (Story 5.2 - placeholder)
  const watermark = await applyWatermark(uploadId, storage.resultKey)
  if (watermark.error) {
    // Watermark is not critical yet - continue without it
    console.log(`[workflow:watermark] Skipping watermark: ${watermark.error}`)
  }

  // Stage 5: Finalize
  await finalizeProcessing(uploadId, true, storage.resultKey)

  console.log(`[workflow:complete] Workflow completed for upload: ${uploadId}`)

  return {
    resultId: uploadId,
    stage: "complete",
    generatedImageKey: storage.resultKey,
  }
}
