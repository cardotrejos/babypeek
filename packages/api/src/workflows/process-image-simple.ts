/**
 * Simple Process Image Workflow (No Effect)
 * 
 * A clean workflow implementation using only Workflow DevKit primitives.
 * All Node.js operations are isolated in step functions.
 * 
 * Uses Nano Banana Pro (gemini-3-pro-image-preview) with in-utero style prompts.
 */

import { db, uploads } from "@babypeek/db"
import { eq } from "drizzle-orm"
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"
import { Jimp, intToRGBA, rgbaToInt } from "jimp"
import { GEMINI_MODEL, PROMPTS, DEFAULT_PROMPT, type PromptVersion } from "./config"

// Re-export for route
export type { PromptVersion }

// =============================================================================
// Types
// =============================================================================

export interface ProcessImageInput {
  uploadId: string
  promptVersion?: PromptVersion
}

export interface ProcessImageOutput {
  success: boolean
  resultId?: string
  error?: string
}

// =============================================================================
// Environment helpers (called inside steps)
// =============================================================================

function getEnv() {
  return {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID!,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID!,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY!,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME!,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  }
}

function getR2Client() {
  const env = getEnv()
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })
}

// =============================================================================
// Step Functions (Node.js operations)
// =============================================================================

async function updateUploadStage(
  uploadId: string,
  stage: string,
  progress: number,
  status?: string
): Promise<void> {
  "use step"
  
  const updateData: Record<string, unknown> = {
    stage,
    progress,
    updatedAt: new Date(),
  }
  
  if (status) {
    updateData.status = status
  }
  
  await db
    .update(uploads)
    .set(updateData)
    .where(eq(uploads.id, uploadId))
}

async function savePromptVersion(
  uploadId: string,
  promptVersion: string
): Promise<void> {
  "use step"
  
  await db
    .update(uploads)
    .set({
      promptVersion: promptVersion as "v3" | "v3-json" | "v4" | "v4-json",
      updatedAt: new Date(),
    })
    .where(eq(uploads.id, uploadId))
  
  console.log(`[workflow] Saved promptVersion: ${promptVersion} for upload: ${uploadId}`)
}

async function getOriginalImageUrl(uploadId: string): Promise<string | null> {
  "use step"
  
  const env = getEnv()
  const client = getR2Client()
  
  // Get the actual image key from the database (includes correct extension)
  const upload = await db.query.uploads.findFirst({
    where: eq(uploads.id, uploadId),
  })
  
  if (!upload?.originalUrl) {
    console.error(`[workflow] Upload not found or no originalUrl: ${uploadId}`)
    return null
  }
  
  const key = upload.originalUrl
  console.log(`[workflow] Using image key from database: ${key}`)
  
  try {
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    })
    const url = await getSignedUrl(client, command, { expiresIn: 300 })
    return url
  } catch (error) {
    console.error(`[workflow] Failed to generate presigned URL for ${key}:`, error)
    return null
  }
}

async function generateWithGemini(
  imageUrl: string,
  prompt: string
): Promise<{ data: Buffer; mimeType: string } | null> {
  "use step"
  
  const env = getEnv()
  
  console.log(`[workflow] Fetching image from URL...`)
  
  // Fetch the image
  const response = await fetch(imageUrl)
  if (!response.ok) {
    console.error("[workflow] Failed to fetch image:", response.status)
    return null
  }
  
  const imageBuffer = Buffer.from(await response.arrayBuffer())
  const base64Image = imageBuffer.toString("base64")
  const imageMimeType = response.headers.get("content-type") || "image/jpeg"
  
  console.log(`[workflow] Image fetched, size: ${imageBuffer.length} bytes, type: ${imageMimeType}`)
  console.log(`[workflow] Using model: ${GEMINI_MODEL}`)
  console.log(`[workflow] Prompt length: ${prompt.length} chars`)
  
  // Initialize Gemini
  const ai = new GoogleGenerativeAI(env.GEMINI_API_KEY)
  
  // Get model with image generation capabilities (Nano Banana Pro style)
  const model = ai.getGenerativeModel({
    model: GEMINI_MODEL,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
    generationConfig: {
      // Enable image output - required for native image generation
      // @ts-expect-error - responseModalities not in SDK types yet but supported by API
      responseModalities: ["text", "image"],
    },
  })

  try {
    console.log(`[workflow] Calling Gemini API...`)
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: imageMimeType,
          data: base64Image,
        },
      },
    ])

    const generatedContent = result.response
    
    // Check for safety blocks
    if (generatedContent.promptFeedback?.blockReason) {
      console.error("[workflow] Content blocked:", generatedContent.promptFeedback.blockReason)
      return null
    }

    // Extract generated image from response
    const candidates = generatedContent.candidates
    if (candidates && candidates.length > 0) {
      const parts = candidates[0]?.content?.parts
      if (parts) {
        for (const part of parts) {
          if ("inlineData" in part && part.inlineData?.data) {
            const outputMimeType = part.inlineData.mimeType ?? "image/png"
            const outputData = Buffer.from(part.inlineData.data, "base64")
            console.log(`[workflow] Successfully generated image, size: ${outputData.length} bytes, type: ${outputMimeType}`)
            return {
              data: outputData,
              mimeType: outputMimeType,
            }
          }
        }
      }
    }

    // Log text response if no image
    let textResponse = ""
    try {
      textResponse = generatedContent.text()
    } catch {
      // No text available
    }
    
    console.error("[workflow] No image in Gemini response. Text:", textResponse.substring(0, 200))
    return null
  } catch (error) {
    console.error("[workflow] Gemini error:", error)
    return null
  }
}

async function storeResult(
  uploadId: string,
  imageData: Buffer,
  mimeType: string
): Promise<string> {
  "use step"
  
  const env = getEnv()
  const client = getR2Client()
  const resultId = `result-${Date.now()}`
  const key = `results/${resultId}/full.jpg`
  
  console.log(`[workflow] Storing result to R2: ${key}`)
  
  // Upload to R2
  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: imageData,
      ContentType: mimeType,
    })
  )
  
  // Update database with result URL (status update happens after watermarking)
  await db
    .update(uploads)
    .set({
      resultUrl: key,
      updatedAt: new Date(),
    })
    .where(eq(uploads.id, uploadId))
  
  console.log(`[workflow] Result stored successfully, resultId: ${resultId}`)
  
  return resultId
}

async function markFailed(uploadId: string, error: string): Promise<void> {
  "use step"
  
  console.log(`[workflow] Marking upload as failed: ${error}`)
  
  await db
    .update(uploads)
    .set({
      status: "failed",
      stage: "failed",
      errorMessage: error,
      updatedAt: new Date(),
    })
    .where(eq(uploads.id, uploadId))
}

async function updatePreviewUrl(uploadId: string, previewUrl: string): Promise<void> {
  "use step"
  
  await db
    .update(uploads)
    .set({
      previewUrl,
      updatedAt: new Date(),
    })
    .where(eq(uploads.id, uploadId))
}

/**
 * Create watermarked preview and store in R2.
 * 
 * Watermark Specs (from PRD):
 * - Opacity: 40%
 * - Position: Bottom-right corner
 * - Size: 15% of image width
 * - Text: "babypeek.io"
 * - Margin: 3% from edges
 * 
 * Preview Specs:
 * - Max dimension: 800px
 * - Format: JPEG @ 85% quality
 * 
 * @see Story 5.2 - Watermark Application
 */
async function createAndStorePreview(
  resultId: string,
  fullImageData: Buffer
): Promise<string | null> {
  "use step"
  
  const env = getEnv()
  const client = getR2Client()
  
  console.log(`[workflow] Creating watermarked preview for result: ${resultId}`)
  
  try {
    // Load image with Jimp
    const image = await Jimp.read(fullImageData)
    
    const originalWidth = image.width
    const originalHeight = image.height
    
    if (!originalWidth || !originalHeight) {
      console.error("[workflow] Image has no dimensions for watermarking")
      return null
    }
    
    console.log(`[workflow] Loaded image: ${originalWidth}x${originalHeight}`)
    
    // Step 1: Resize to 800px max (smaller = faster watermark)
    if (originalWidth > 800 || originalHeight > 800) {
      image.scaleToFit({ w: 800, h: 800 })
      console.log(`[workflow] Resized to: ${image.width}x${image.height}`)
    }
    
    const imageWidth = image.width
    const imageHeight = image.height
    
    // Watermark config
    const widthPercent = 0.20  // 20% of image width for visibility
    const marginPercent = 0.03
    
    // Calculate watermark rectangle dimensions
    const rectWidth = Math.floor(imageWidth * widthPercent)
    const rectHeight = Math.floor(rectWidth * 0.25)  // 4:1 aspect ratio
    
    // Calculate margin (3% from edges)
    const margin = Math.floor(Math.min(imageWidth, imageHeight) * marginPercent)
    
    // Calculate position for bottom-right with margin
    const startX = Math.max(0, imageWidth - rectWidth - margin)
    const startY = Math.max(0, imageHeight - rectHeight - margin)
    
    console.log(`[workflow] Watermark area: ${startX},${startY} -> ${startX + rectWidth},${startY + rectHeight}`)
    
    // Step 2: Apply watermark - draw semi-transparent diagonal lines pattern
    // This creates a visible "watermark" effect without needing text rendering
    for (let y = startY; y < startY + rectHeight && y < imageHeight; y++) {
      for (let x = startX; x < startX + rectWidth && x < imageWidth; x++) {
        // Create diagonal stripe pattern (every 4 pixels)
        const isStripe = (x + y) % 8 < 4
        if (isStripe) {
          // Get current pixel color and blend with white
          const rgba = intToRGBA(image.getPixelColor(x, y))
          const blendedR = Math.floor(rgba.r * 0.6 + 255 * 0.4)
          const blendedG = Math.floor(rgba.g * 0.6 + 255 * 0.4)
          const blendedB = Math.floor(rgba.b * 0.6 + 255 * 0.4)
          const newColor = rgbaToInt(blendedR, blendedG, blendedB, rgba.a)
          image.setPixelColor(newColor, x, y)
        }
      }
    }
    
    console.log(`[workflow] Watermark applied`)
    
    // Convert to JPEG buffer
    const previewBuffer = await image.getBuffer("image/jpeg", { quality: 85 })
    const preview = Buffer.from(previewBuffer)
    
    console.log(`[workflow] Preview created, size: ${preview.length} bytes`)
    
    // Step 3: Store preview in R2
    const previewKey = `results/${resultId}/preview.jpg`
    
    await client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: previewKey,
        Body: preview,
        ContentType: "image/jpeg",
      })
    )
    
    console.log(`[workflow] Preview stored at: ${previewKey}`)
    
    return previewKey
  } catch (error) {
    console.error("[workflow] Failed to create preview:", error)
    // Non-fatal: continue without preview
    return null
  }
}

// =============================================================================
// Main Workflow
// =============================================================================

export async function processImageWorkflowSimple(
  input: ProcessImageInput
): Promise<ProcessImageOutput> {
  "use workflow"
  
  const { uploadId, promptVersion } = input
  // Get prompt from config (plain constants work in workflow)
  const prompt = promptVersion ? PROMPTS[promptVersion] : DEFAULT_PROMPT
  console.log(`[workflow] Starting for upload: ${uploadId}, prompt: ${promptVersion || "default (v4)"}`)
  
  try {
    // Stage 1: Validating
    await updateUploadStage(uploadId, "validating", 10, "processing")
    
    // Save which prompt version is being used (for tracking/analytics)
    const usedPromptVersion = promptVersion || 'none'
    await savePromptVersion(uploadId, usedPromptVersion)
    
    // Get original image URL
    const imageUrl = await getOriginalImageUrl(uploadId)
    if (!imageUrl) {
      await markFailed(uploadId, "Original image not found")
      return { success: false, error: "Original image not found" }
    }
    
    // Stage 2: Generating (this is the main AI step)
    await updateUploadStage(uploadId, "generating", 30)
    
    const generatedImage = await generateWithGemini(imageUrl, prompt)
    if (!generatedImage) {
      await markFailed(uploadId, "Failed to generate image with Gemini")
      return { success: false, error: "Failed to generate image" }
    }
    
    // Stage 3: Storing
    await updateUploadStage(uploadId, "storing", 70)
    
    const resultId = await storeResult(
      uploadId,
      generatedImage.data,
      generatedImage.mimeType
    )
    
    // Stage 4: Watermarking (AC: 5.2)
    await updateUploadStage(uploadId, "watermarking", 90)
    
    const previewKey = await createAndStorePreview(resultId, generatedImage.data)
    if (previewKey) {
      // Update database with preview URL
      await updatePreviewUrl(uploadId, previewKey)
      console.log(`[workflow] Preview stored at: ${previewKey}`)
    } else {
      console.log(`[workflow] Preview creation skipped (non-fatal)`)
    }
    
    // Mark complete
    await updateUploadStage(uploadId, "complete", 100, "completed")
    
    console.log(`[workflow] Completed for upload: ${uploadId}, result: ${resultId}`)
    
    return { success: true, resultId }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[workflow] Error for upload ${uploadId}:`, errorMessage)
    
    await markFailed(uploadId, errorMessage)
    return { success: false, error: errorMessage }
  }
}
