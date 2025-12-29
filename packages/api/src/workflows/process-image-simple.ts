/**
 * Simple Process Image Workflow (No Effect)
 *
 * A clean workflow implementation using only Workflow DevKit primitives.
 * All Node.js operations are isolated in step functions.
 *
 * Uses Nano Banana Pro (gemini-3-pro-image-preview) with in-utero style prompts.
 */

import { db, uploads, results } from "@babypeek/db";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Jimp, intToRGBA, rgbaToInt } from "jimp";
import { Resend } from "resend";
import { GEMINI_MODEL, PROMPTS, type PromptVersion } from "./config";

// All prompt variants to generate
const PROMPT_VARIANTS: PromptVersion[] = ["v3", "v3-json", "v4", "v4-json"];

// Re-export for route
export type { PromptVersion };

// =============================================================================
// Types
// =============================================================================

export interface ProcessImageInput {
  uploadId: string;
  promptVersion?: PromptVersion;
}

export interface ProcessImageOutput {
  success: boolean;
  resultId?: string;
  resultIds?: string[];
  error?: string;
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
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    FROM_EMAIL: process.env.FROM_EMAIL || "hello@babypeek.io",
    APP_URL: process.env.APP_URL || "https://babypeek.io",
  };
}

function getR2Client() {
  const env = getEnv();
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

// =============================================================================
// Step Functions (Node.js operations)
// =============================================================================

async function updateUploadStage(
  uploadId: string,
  stage: string,
  progress: number,
  status?: string,
): Promise<void> {
  "use step";

  const updateData: Record<string, unknown> = {
    stage,
    progress,
    updatedAt: new Date(),
  };

  if (status) {
    updateData.status = status;
  }

  await db.update(uploads).set(updateData).where(eq(uploads.id, uploadId));
}

// =============================================================================
// Helper Functions (not workflow steps - called from within steps)
// =============================================================================

/**
 * Create a watermarked preview image buffer from full-size image data.
 * This is a pure helper function, not a workflow step.
 * 
 * Watermark Specs:
 * - Diagonal "babypeek.io" text pattern across entire image
 * - Opacity: 30%
 * - Preview max dimension: 800px
 * - Format: JPEG @ 85% quality
 */
async function createWatermarkedPreview(fullImageData: Buffer): Promise<Buffer | null> {
  try {
    // Load image with Jimp
    const image = await Jimp.read(fullImageData);

    const originalWidth = image.width;
    const originalHeight = image.height;

    if (!originalWidth || !originalHeight) {
      console.error("[workflow] Image has no dimensions for watermarking");
      return null;
    }

    // Step 1: Resize to 800px max
    if (originalWidth > 800 || originalHeight > 800) {
      image.scaleToFit({ w: 800, h: 800 });
    }

    const imageWidth = image.width;
    const imageHeight = image.height;

    // Watermark text parameters
    const text = "babypeek.io";
    const opacity = 0.3;
    const charWidth = Math.max(8, Math.floor(imageWidth / 50));
    const spacing = Math.floor(imageWidth / 4);

    // Simple pixel-based text rendering patterns
    const letterPatterns: Record<string, number[][]> = {
      b: [[1,1,1,0,0],[1,0,0,1,0],[1,1,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[1,1,1,0,0],[0,0,0,0,0]],
      a: [[0,1,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[1,1,1,1,0],[1,0,0,1,0],[1,0,0,1,0],[0,0,0,0,0]],
      y: [[1,0,0,1,0],[1,0,0,1,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0]],
      p: [[1,1,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0],[0,0,0,0,0]],
      e: [[1,1,1,1,0],[1,0,0,0,0],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,0]],
      k: [[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[0,0,0,0,0]],
      i: [[0,1,1,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0],[0,0,0,0,0]],
      o: [[0,1,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[1,0,0,1,0],[1,0,0,1,0],[0,1,1,0,0],[0,0,0,0,0]],
      ".": [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,1,1,0,0],[0,0,0,0,0]],
    };

    // Draw diagonal watermark text pattern
    const drawText = (startX: number, startY: number) => {
      let currentX = startX;
      for (const char of text) {
        const pattern = letterPatterns[char];
        if (pattern) {
          for (let row = 0; row < pattern.length; row++) {
            const patternRow = pattern[row];
            if (patternRow) {
              for (let col = 0; col < patternRow.length; col++) {
                if (patternRow[col] === 1) {
                  for (let py = 0; py < charWidth; py++) {
                    for (let px = 0; px < charWidth; px++) {
                      const x = currentX + col * charWidth + px;
                      const y = startY + row * charWidth + py;
                      if (x >= 0 && x < imageWidth && y >= 0 && y < imageHeight) {
                        const existingColor = image.getPixelColor(x, y);
                        const rgba = intToRGBA(existingColor);
                        const blendedR = Math.round(rgba.r * (1 - opacity) + 255 * opacity);
                        const blendedG = Math.round(rgba.g * (1 - opacity) + 255 * opacity);
                        const blendedB = Math.round(rgba.b * (1 - opacity) + 255 * opacity);
                        const newColor = rgbaToInt(blendedR, blendedG, blendedB, rgba.a);
                        image.setPixelColor(newColor, x, y);
                      }
                    }
                  }
                }
              }
            }
          }
          currentX += 6 * charWidth;
        }
      }
    };

    // Create diagonal grid pattern
    const textWidth = text.length * 6 * charWidth;
    const textHeight = 7 * charWidth;
    for (let startY = -textHeight; startY < imageHeight + textHeight; startY += spacing) {
      for (let startX = -textWidth; startX < imageWidth + textWidth; startX += spacing) {
        const offsetY = Math.floor((startX / spacing) * (spacing / 3));
        drawText(startX, startY + offsetY);
      }
    }

    // Convert to JPEG buffer
    const previewBuffer = await image.getBuffer("image/jpeg", { quality: 85 });
    return Buffer.from(previewBuffer);
  } catch (error) {
    console.error("[workflow] Failed to create watermarked preview:", error);
    return null;
  }
}

// Kept for potential single-variant mode (currently unused - we generate all 4)
async function _savePromptVersion(uploadId: string, promptVersion: string): Promise<void> {
  "use step";

  await db
    .update(uploads)
    .set({
      promptVersion: promptVersion as "v3" | "v3-json" | "v4" | "v4-json",
      updatedAt: new Date(),
    })
    .where(eq(uploads.id, uploadId));

  console.log(`[workflow] Saved promptVersion: ${promptVersion} for upload: ${uploadId}`);
}
void _savePromptVersion; // prevent unused warning

async function getOriginalImageUrl(uploadId: string): Promise<string | null> {
  "use step";

  const env = getEnv();
  const client = getR2Client();

  // Get the actual image key from the database (includes correct extension)
  const upload = await db.query.uploads.findFirst({
    where: eq(uploads.id, uploadId),
  });

  if (!upload?.originalUrl) {
    console.error(`[workflow] Upload not found or no originalUrl: ${uploadId}`);
    return null;
  }

  const key = upload.originalUrl;
  console.log(`[workflow] Using image key from database: ${key}`);

  try {
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    });
    const url = await getSignedUrl(client, command, { expiresIn: 300 });
    return url;
  } catch (error) {
    console.error(`[workflow] Failed to generate presigned URL for ${key}:`, error);
    return null;
  }
}

async function generateWithGemini(
  imageUrl: string,
  prompt: string,
): Promise<{ data: string; mimeType: string } | null> {
  "use step";
  // NOTE: Returns base64 string instead of Buffer for workflow serialization

  const env = getEnv();

  console.log(`[workflow] Fetching image from URL...`);

  // Fetch the image
  const response = await fetch(imageUrl);
  if (!response.ok) {
    console.error("[workflow] Failed to fetch image:", response.status);
    return null;
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const base64Image = imageBuffer.toString("base64");
  const imageMimeType = response.headers.get("content-type") || "image/jpeg";

  console.log(
    `[workflow] Image fetched, size: ${imageBuffer.length} bytes, type: ${imageMimeType}`,
  );
  console.log(`[workflow] Using model: ${GEMINI_MODEL}`);
  console.log(`[workflow] Prompt length: ${prompt.length} chars`);

  // Initialize Gemini
  const ai = new GoogleGenerativeAI(env.GEMINI_API_KEY);

  // Get model with image generation capabilities (Nano Banana Pro style)
  const model = ai.getGenerativeModel({
    model: GEMINI_MODEL,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
    generationConfig: {
      // Enable image output - required for native image generation
      // @ts-expect-error - responseModalities not in SDK types yet but supported by API
      responseModalities: ["text", "image"],
    },
  });

  try {
    console.log(`[workflow] Calling Gemini API...`);

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: imageMimeType,
          data: base64Image,
        },
      },
    ]);

    const generatedContent = result.response;

    // Check for safety blocks
    if (generatedContent.promptFeedback?.blockReason) {
      console.error("[workflow] Content blocked:", generatedContent.promptFeedback.blockReason);
      return null;
    }

    // Extract generated image from response
    const candidates = generatedContent.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if ("inlineData" in part && part.inlineData?.data) {
            const outputMimeType = part.inlineData.mimeType ?? "image/png";
            // Return base64 string directly - Buffer doesn't serialize across workflow steps
            const outputData = part.inlineData.data;
            console.log(
              `[workflow] Successfully generated image, base64 length: ${outputData.length}, type: ${outputMimeType}`,
            );
            return {
              data: outputData,
              mimeType: outputMimeType,
            };
          }
        }
      }
    }

    // Log text response if no image
    let textResponse = "";
    try {
      textResponse = generatedContent.text();
    } catch {
      // No text available
    }

    console.error("[workflow] No image in Gemini response. Text:", textResponse.substring(0, 200));
    return null;
  } catch (error) {
    console.error("[workflow] Gemini error:", error);
    return null;
  }
}

// Kept for potential single-variant mode (currently unused - we use storeResultVariant)
async function _storeResult(
  uploadId: string,
  imageData: Buffer,
  mimeType: string,
): Promise<string> {
  "use step";

  const env = getEnv();
  const client = getR2Client();
  const resultId = `result-${Date.now()}`;
  const key = `results/${resultId}/full.jpg`;

  console.log(`[workflow] Storing result to R2: ${key}`);

  // Upload to R2
  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: imageData,
      ContentType: mimeType,
    }),
  );

  // Update database with result URL (status update happens after watermarking)
  await db
    .update(uploads)
    .set({
      resultUrl: key,
      updatedAt: new Date(),
    })
    .where(eq(uploads.id, uploadId));

  console.log(`[workflow] Result stored successfully, resultId: ${resultId}`);

  return resultId;
}
void _storeResult; // prevent unused warning

/**
 * Store a result variant in R2 and the results table
 * Also creates and stores the watermarked preview in the same step
 * NOTE: imageDataBase64 is a base64 string (not Buffer) for workflow serialization
 * 
 * Returns: { resultId: string, previewKey: string | null }
 */
async function storeResultVariant(
  uploadId: string,
  imageDataBase64: string,
  mimeType: string,
  promptVersion: PromptVersion,
  variantIndex: number,
  generationTimeMs: number,
): Promise<{ resultId: string; previewKey: string | null }> {
  "use step";

  const env = getEnv();
  const client = getR2Client();
  const resultId = createId();
  const key = `results/${uploadId}/${resultId}_v${variantIndex}.jpg`;
  const previewKey = `results/${uploadId}/${resultId}_preview.jpg`;

  // Convert base64 back to Buffer for R2 upload
  const imageData = Buffer.from(imageDataBase64, "base64");

  console.log(
    `[workflow] Storing variant ${variantIndex} to R2: ${key}, size: ${imageData.length} bytes`,
  );

  // Upload full-size image to R2
  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: imageData,
      ContentType: mimeType,
    }),
  );

  // Create watermarked preview
  let finalPreviewKey: string | null = null;
  try {
    const previewBuffer = await createWatermarkedPreview(imageData);
    if (previewBuffer) {
      // Upload preview to R2
      await client.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: previewKey,
          Body: previewBuffer,
          ContentType: "image/jpeg",
        }),
      );
      finalPreviewKey = previewKey;
      console.log(`[workflow] Preview stored at: ${previewKey}`);
    }
  } catch (previewError) {
    console.error(`[workflow] Failed to create preview for variant ${variantIndex}:`, previewError);
    // Non-fatal - continue without preview
  }

  // Insert into results table with preview URL
  await db.insert(results).values({
    id: resultId,
    uploadId,
    resultUrl: key,
    previewUrl: finalPreviewKey,
    promptVersion,
    variantIndex,
    fileSizeBytes: imageData.length,
    generationTimeMs,
  });

  // Update uploads table with first result for backward compatibility
  if (variantIndex === 1) {
    await db
      .update(uploads)
      .set({
        resultUrl: key,
        previewUrl: finalPreviewKey,
        promptVersion,
        updatedAt: new Date(),
      })
      .where(eq(uploads.id, uploadId));
  }

  console.log(`[workflow] Variant ${variantIndex} stored, resultId: ${resultId}, preview: ${finalPreviewKey ? "yes" : "no"}`);

  return { resultId, previewKey: finalPreviewKey };
}

async function markFailed(uploadId: string, error: string): Promise<void> {
  "use step";

  console.log(`[workflow] Marking upload as failed: ${error}`);

  await db
    .update(uploads)
    .set({
      status: "failed",
      stage: "failed",
      errorMessage: error,
      updatedAt: new Date(),
    })
    .where(eq(uploads.id, uploadId));
}

// updatePreviewUrl removed - preview is now set in storeResultVariant

/**
 * Send email notification when generation completes
 */
async function sendCompletionEmail(uploadId: string, _resultId: string): Promise<void> {
  "use step";

  const env = getEnv();

  // Skip if Resend not configured
  if (!env.RESEND_API_KEY) {
    console.log("[workflow] Resend not configured, skipping email");
    return;
  }

  // Get upload to find email
  const upload = await db.query.uploads.findFirst({
    where: eq(uploads.id, uploadId),
  });

  if (!upload?.email) {
    console.log("[workflow] No email found for upload, skipping notification");
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  // Use public preview URL (no session required) so email links work on any device
  const previewUrl = `${env.APP_URL}/preview/${uploadId}`;

  try {
    await resend.emails.send({
      from: `BabyPeek <${env.FROM_EMAIL}>`,
      to: upload.email,
      subject: "Your BabyPeek portraits are ready! ✨",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FDF8F5;">
  <div style="background-color: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 48px;">👶</span>
    </div>
    
    <h1 style="color: #E8927C; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin-bottom: 8px; text-align: center;">
      Your Baby Portraits Are Ready!
    </h1>
    
    <p style="color: #6B5B5B; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
      We've created 4 beautiful AI-generated portraits of your baby in different styles. Come see the magic!
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${previewUrl}" style="display: inline-block; background-color: #E8927C; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Your Portraits
      </a>
    </div>
    
    <p style="color: #9B8B8B; font-size: 12px; text-align: center; margin-top: 24px;">
      This link will remain active for 30 days.
      <br>
      Questions? Reply to this email.
    </p>
    
  </div>
</body>
</html>
      `,
    });

    console.log(`[workflow] Completion email sent to ${upload.email}`);
  } catch (error) {
    console.error("[workflow] Failed to send completion email:", error);
    // Non-fatal - don't fail the workflow for email issues
  }
}

// createAndStorePreview removed - preview is now created in storeResultVariant

// =============================================================================
// Main Workflow
// =============================================================================

export async function processImageWorkflowSimple(
  input: ProcessImageInput,
): Promise<ProcessImageOutput> {
  "use workflow";

  const { uploadId } = input;
  // Note: promptVersion from input is ignored - we always generate all 4 variants
  console.log(`[workflow] Starting for upload: ${uploadId}, generating 4 variants`);

  try {
    // Stage 1: Validating
    await updateUploadStage(uploadId, "validating", 5, "processing");

    // Get original image URL
    const imageUrl = await getOriginalImageUrl(uploadId);
    if (!imageUrl) {
      await markFailed(uploadId, "Original image not found");
      return { success: false, error: "Original image not found" };
    }

    // Stage 2: Generating all 4 variants (includes watermarking in same step)
    const resultIds: string[] = [];
    let firstResultId: string | undefined;

    for (let i = 0; i < PROMPT_VARIANTS.length; i++) {
      const variant = PROMPT_VARIANTS[i] as PromptVersion;
      const variantIndex = i + 1;

      // Update progress (5-90% range for generation + watermarking, divided among 4 variants)
      const progress = 5 + Math.floor((i / PROMPT_VARIANTS.length) * 85);
      await updateUploadStage(uploadId, "generating", progress);

      console.log(
        `[workflow] Generating variant ${variantIndex}/${PROMPT_VARIANTS.length}: ${variant}`,
      );

      const prompt = PROMPTS[variant];
      const startTime = Date.now();

      const generatedImage = await generateWithGemini(imageUrl, prompt);

      if (!generatedImage) {
        console.error(`[workflow] Failed to generate variant ${variantIndex}, skipping`);
        continue;
      }

      const generationTimeMs = Date.now() - startTime;

      // Store the variant (now includes watermarked preview creation)
      const { resultId, previewKey } = await storeResultVariant(
        uploadId,
        generatedImage.data,
        generatedImage.mimeType,
        variant,
        variantIndex,
        generationTimeMs,
      );

      resultIds.push(resultId);

      // Keep first result ID for backward compatibility
      if (!firstResultId) {
        firstResultId = resultId;
      }

      console.log(
        `[workflow] Variant ${variantIndex} complete: ${resultId} (${generationTimeMs}ms), preview: ${previewKey ? "yes" : "no"}`,
      );
    }

    // Check if we got at least one result
    if (resultIds.length === 0) {
      await markFailed(uploadId, "Failed to generate any images");
      return { success: false, error: "Failed to generate any images" };
    }

    console.log(`[workflow] Generated ${resultIds.length} variants`);

    // Mark complete
    await updateUploadStage(uploadId, "complete", 100, "completed");

    // Send completion email
    if (firstResultId) {
      await sendCompletionEmail(uploadId, firstResultId);
    }

    console.log(`[workflow] Completed for upload: ${uploadId}, results: ${resultIds.join(", ")}`);

    return {
      success: true,
      resultId: firstResultId,
      resultIds,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[workflow] Error for upload ${uploadId}:`, errorMessage);

    await markFailed(uploadId, errorMessage);
    return { success: false, error: errorMessage };
  }
}
