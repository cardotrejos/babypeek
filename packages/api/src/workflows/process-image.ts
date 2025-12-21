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
import { ResultService, type CreatedResult } from "../services/ResultService"
import { UploadService, type UploadStage } from "../services/UploadService"
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
  effect: Effect.Effect<A, E, GeminiService | R2Service | PostHogService | ResultService | UploadService>
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
 * Update the processing stage and progress in the database.
 * This enables real-time progress tracking via the status API.
 * 
 * @param uploadId - The upload ID
 * @param stage - The current processing stage
 * @param progress - Progress percentage (0-100)
 */
async function updateStage(uploadId: string, stage: UploadStage, progress: number): Promise<void> {
  const effect = Effect.gen(function* () {
    const uploadService = yield* UploadService
    yield* uploadService.updateStage(uploadId, stage, progress)
  })

  const result = await runWithServices(effect)
  if (!result.success) {
    console.warn(`[workflow:updateStage] Failed to update stage for ${uploadId}:`, result.error)
    // Don't fail the workflow if stage update fails - it's not critical
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

/**
 * Save the prompt version used for this upload.
 * This enables tracking which prompt produced which results.
 */
async function savePromptVersion(uploadId: string, promptVersion: PromptVersion): Promise<void> {
  const effect = Effect.gen(function* () {
    const uploadService = yield* UploadService
    // Cast to DB prompt version type (they should match)
    yield* uploadService.updatePromptVersion(uploadId, promptVersion as "v3" | "v3-json" | "v4" | "v4-json")
  })

  const result = await runWithServices(effect)
  if (!result.success) {
    console.warn(`[workflow:savePromptVersion] Failed to save prompt version for ${uploadId}:`, result.error)
    // Don't fail the workflow if this fails - it's not critical
  }
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
 * Store result in internal result type
 */
interface StoreResultOutput {
  resultKey: string | null
  resultId?: string
  fileSizeBytes?: number
  error?: string
}

/**
 * Store the generated result image in R2 using ResultService.
 *
 * Story 4.4: Result Storage in R2
 * - Stores full-resolution image at results/{resultId}/full.jpg
 * - Creates/updates result record in database (via uploads table)
 * - Tracks result_stored analytics event
 */
async function storeResult(
  uploadId: string,
  imageData: GeneratedImage | undefined
): Promise<StoreResultOutput> {
  "use step"

  console.log(`[workflow:store] Storing result for upload: ${uploadId}`)

  if (!imageData) {
    // Track failure - no image data
    await trackEvent("result_storage_failed", uploadId, {
      upload_id: uploadId,
      error_type: "NO_IMAGE_DATA",
      error_message: "No image data to store",
    })
    return { resultKey: null, error: "No image data to store" }
  }

  // Use ResultService to store the generated image in R2 and update database
  const effect = Effect.gen(function* () {
    const resultService = yield* ResultService
    return yield* resultService.create({
      uploadId,
      fullImageBuffer: imageData.data,
      mimeType: imageData.mimeType,
    })
  })

  const result = await runWithServices(effect)

  if (result.success) {
    const createdResult = result.data as CreatedResult

    // Track success analytics event (AC-5)
    await trackEvent("result_stored", uploadId, {
      upload_id: uploadId,
      result_id: createdResult.resultId,
      file_size_bytes: createdResult.fileSizeBytes,
      r2_key: createdResult.resultUrl,
    })

    console.log(`[workflow:store] Stored result at: ${createdResult.resultUrl}, resultId: ${createdResult.resultId}`)
    return {
      resultKey: createdResult.resultUrl,
      resultId: createdResult.resultId,
      fileSizeBytes: createdResult.fileSizeBytes,
    }
  }

  // Handle storage failure
  const error = result.error as { cause?: string; message?: string }
  const errorType = error?.cause || "UNKNOWN"
  const errorMessage = error?.message || String(result.error)

  // Track failure analytics event
  await trackEvent("result_storage_failed", uploadId, {
    upload_id: uploadId,
    error_type: errorType,
    error_message: errorMessage,
  })

  console.error(`[workflow:store] Failed to store result:`, errorMessage)
  return { resultKey: null, error: `Failed to store result: ${errorMessage}` }
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

  // Stage 1: Validate (10%)
  await updateStage(uploadId, "validating", 10)
  const validation = await validateUpload(uploadId)
  if (!validation.valid) {
    await updateStage(uploadId, "failed", 10)
    await finalizeProcessing(uploadId, false)
    return {
      resultId: uploadId,
      stage: "validating",
      error: validation.error,
    }
  }

  // Stage 1.5: Fetch original image from R2 (still part of validating)
  const fetchResult = await fetchOriginalImage(uploadId)
  if (!fetchResult.url) {
    await updateStage(uploadId, "failed", 15)
    await finalizeProcessing(uploadId, false)
    return {
      resultId: uploadId,
      stage: "validating",
      error: fetchResult.error || "Failed to fetch original image",
    }
  }

  // Stage 2: Generate image using Gemini (30-70%)
  await updateStage(uploadId, "generating", 30)
  
  // Save which prompt version we're using for this generation
  await savePromptVersion(uploadId, promptVersion)
  
  const generation = await generateImage(uploadId, fetchResult.url, promptVersion)
  
  // Update progress mid-generation
  await updateStage(uploadId, "generating", 70)
  
  if (!generation.success || !generation.imageData) {
    await updateStage(uploadId, "failed", 70)
    await finalizeProcessing(uploadId, false)
    return {
      resultId: uploadId,
      stage: "generating",
      error: generation.error || "Failed to generate image",
    }
  }

  // Stage 3: Store result in R2 (80%)
  await updateStage(uploadId, "storing", 80)
  const storage = await storeResult(uploadId, generation.imageData)
  if (!storage.resultKey) {
    await updateStage(uploadId, "failed", 80)
    await finalizeProcessing(uploadId, false)
    return {
      resultId: uploadId,
      stage: "storing",
      error: storage.error || "Failed to store result",
    }
  }

  // Stage 4: Watermark (90%) - Story 5.2 placeholder
  await updateStage(uploadId, "watermarking", 90)
  const watermark = await applyWatermark(uploadId, storage.resultKey)
  if (watermark.error) {
    // Watermark is not critical yet - continue without it
    console.log(`[workflow:watermark] Skipping watermark: ${watermark.error}`)
  }

  // Stage 5: Complete (100%)
  await updateStage(uploadId, "complete", 100)
  await finalizeProcessing(uploadId, true, storage.resultKey)

  console.log(`[workflow:complete] Workflow completed for upload: ${uploadId}`)

  return {
    resultId: uploadId,
    stage: "complete",
    generatedImageKey: storage.resultKey,
  }
}
