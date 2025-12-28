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
 * NOTE: imageDataBase64 is a base64 string (not Buffer) for workflow serialization
 */
async function storeResultVariant(
  uploadId: string,
  imageDataBase64: string,
  mimeType: string,
  promptVersion: PromptVersion,
  variantIndex: number,
  generationTimeMs: number,
): Promise<string> {
  "use step";

  const env = getEnv();
  const client = getR2Client();
  const resultId = createId();
  const key = `results/${uploadId}/${resultId}_v${variantIndex}.jpg`;

  // Convert base64 back to Buffer for R2 upload
  const imageData = Buffer.from(imageDataBase64, "base64");

  console.log(
    `[workflow] Storing variant ${variantIndex} to R2: ${key}, size: ${imageData.length} bytes`,
  );

  // Upload to R2
  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: imageData,
      ContentType: mimeType,
    }),
  );

  // Insert into results table
  await db.insert(results).values({
    id: resultId,
    uploadId,
    resultUrl: key,
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
        promptVersion,
        updatedAt: new Date(),
      })
      .where(eq(uploads.id, uploadId));
  }

  console.log(`[workflow] Variant ${variantIndex} stored, resultId: ${resultId}`);

  return resultId;
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

async function updatePreviewUrl(uploadId: string, previewUrl: string): Promise<void> {
  "use step";

  await db
    .update(uploads)
    .set({
      previewUrl,
      updatedAt: new Date(),
    })
    .where(eq(uploads.id, uploadId));
}



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

/**
 * Create watermarked preview and store in R2.
 *
 * Watermark Specs (from PRD):
 * - Diagonal "babypeek.io" text pattern across entire image
 * - Opacity: 30% (visible but not intrusive)
 * - Covers entire image to prevent cropping
 *
 * Preview Specs:
 * - Max dimension: 800px
 * - Format: JPEG @ 85% quality
 *
 * @see Story 5.2 - Watermark Application
 */
async function createAndStorePreview(
  uploadId: string,
  resultId: string,
  fullImageDataBase64: string,
): Promise<string | null> {
  "use step";
  // NOTE: fullImageDataBase64 is base64 string for workflow serialization

  const env = getEnv();
  const client = getR2Client();

  console.log(`[workflow] Creating watermarked preview for result: ${resultId}`);

  try {
    // Convert base64 back to Buffer for Jimp
    const fullImageData = Buffer.from(fullImageDataBase64, "base64");

    // Load image with Jimp
    const image = await Jimp.read(fullImageData);

    const originalWidth = image.width;
    const originalHeight = image.height;

    if (!originalWidth || !originalHeight) {
      console.error("[workflow] Image has no dimensions for watermarking");
      return null;
    }

    console.log(`[workflow] Loaded image: ${originalWidth}x${originalHeight}`);

    // Step 1: Resize to 800px max (smaller = faster watermark)
    if (originalWidth > 800 || originalHeight > 800) {
      image.scaleToFit({ w: 800, h: 800 });
      console.log(`[workflow] Resized to: ${image.width}x${image.height}`);
    }

    const imageWidth = image.width;
    const imageHeight = image.height;

    // Watermark text parameters
    const text = "babypeek.io";
    const opacity = 0.3; // 30% opacity
    const charWidth = Math.max(8, Math.floor(imageWidth / 50)); // ~2% of image width per char
    const spacing = Math.floor(imageWidth / 4); // Space between watermark repetitions

    // Simple pixel-based text rendering for "babypeek.io"
    // Each letter is a simple 5x7 pixel pattern scaled up
    const letterPatterns: Record<string, number[][]> = {
      b: [
        [1, 1, 1, 0, 0],
        [1, 0, 0, 1, 0],
        [1, 1, 1, 0, 0],
        [1, 0, 0, 1, 0],
        [1, 0, 0, 1, 0],
        [1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      a: [
        [0, 1, 1, 0, 0],
        [1, 0, 0, 1, 0],
        [1, 0, 0, 1, 0],
        [1, 1, 1, 1, 0],
        [1, 0, 0, 1, 0],
        [1, 0, 0, 1, 0],
        [0, 0, 0, 0, 0],
      ],
      y: [
        [1, 0, 0, 1, 0],
        [1, 0, 0, 1, 0],
        [0, 1, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      p: [
        [1, 1, 1, 0, 0],
        [1, 0, 0, 1, 0],
        [1, 0, 0, 1, 0],
        [1, 1, 1, 0, 0],
        [1, 0, 0, 0, 0],
        [1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      e: [
        [1, 1, 1, 1, 0],
        [1, 0, 0, 0, 0],
        [1, 1, 1, 0, 0],
        [1, 0, 0, 0, 0],
        [1, 0, 0, 0, 0],
        [1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0],
      ],
      k: [
        [1, 0, 0, 1, 0],
        [1, 0, 1, 0, 0],
        [1, 1, 0, 0, 0],
        [1, 0, 1, 0, 0],
        [1, 0, 0, 1, 0],
        [1, 0, 0, 1, 0],
        [0, 0, 0, 0, 0],
      ],
      ".": [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      i: [
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      o: [
        [0, 1, 1, 0, 0],
        [1, 0, 0, 1, 0],
        [1, 0, 0, 1, 0],
        [1, 0, 0, 1, 0],
        [1, 0, 0, 1, 0],
        [0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0],
      ],
    };

    // Scale factor for letters
    const scale = Math.max(1, Math.floor(charWidth / 5));

    // Draw watermark text at a specific position
    const drawWatermarkAt = (startX: number, startY: number) => {
      let xOffset = 0;

      for (const char of text) {
        const pattern = letterPatterns[char];
        if (!pattern) continue;

        for (let py = 0; py < pattern.length; py++) {
          const row = pattern[py];
          if (!row) continue;
          for (let px = 0; px < row.length; px++) {
            if (row[px]) {
              // Draw scaled pixel
              for (let sy = 0; sy < scale; sy++) {
                for (let sx = 0; sx < scale; sx++) {
                  const x = startX + xOffset + px * scale + sx;
                  const y = startY + py * scale + sy;

                  if (x >= 0 && x < imageWidth && y >= 0 && y < imageHeight) {
                    const rgba = intToRGBA(image.getPixelColor(x, y));

                    // White text with opacity blending
                    const blendFactor = 1 - opacity;
                    const blendedR = Math.floor(rgba.r * blendFactor + 255 * opacity);
                    const blendedG = Math.floor(rgba.g * blendFactor + 255 * opacity);
                    const blendedB = Math.floor(rgba.b * blendFactor + 255 * opacity);

                    const newColor = rgbaToInt(blendedR, blendedG, blendedB, rgba.a);
                    image.setPixelColor(newColor, x, y);
                  }
                }
              }
            }
          }
        }

        xOffset += 6 * scale; // Move to next character position
      }
    };

    // Draw watermarks in a diagonal pattern across the entire image
    // This makes it very difficult to crop out
    for (
      let diagOffset = -imageHeight;
      diagOffset < imageWidth + imageHeight;
      diagOffset += spacing
    ) {
      // Draw along diagonal lines
      const startX = diagOffset;
      const startY = Math.floor(imageHeight * 0.3); // Start from 30% down

      // Multiple rows of watermarks
      for (let row = 0; row < 3; row++) {
        const rowY = startY + row * spacing * 0.7;
        if (rowY >= 0 && rowY < imageHeight - 7 * scale) {
          drawWatermarkAt(startX + row * spacing * 0.3, Math.floor(rowY));
        }
      }
    }

    console.log(`[workflow] Watermark applied with diagonal text pattern`);

    // Convert to JPEG buffer
    const previewBuffer = await image.getBuffer("image/jpeg", { quality: 85 });
    const preview = Buffer.from(previewBuffer);

    console.log(`[workflow] Preview created, size: ${preview.length} bytes`);

    // Step 3: Store preview in R2 - use uploadId in path for consistency
    const previewKey = `results/${uploadId}/${resultId}_preview.jpg`;

    await client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: previewKey,
        Body: preview,
        ContentType: "image/jpeg",
      }),
    );

    console.log(`[workflow] Preview stored at: ${previewKey}`);

    // Step 4: Update the results table with the preview URL
    await db
      .update(results)
      .set({
        previewUrl: previewKey,
      })
      .where(eq(results.id, resultId));

    console.log(`[workflow] Updated result ${resultId} with previewUrl: ${previewKey}`);

    return previewKey;
  } catch (error) {
    console.error("[workflow] Failed to create preview:", error);
    // Non-fatal: continue without preview
    return null;
  }
}

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

    // Stage 2: Generating all 4 variants
    const resultIds: string[] = [];
    // Store generated image data for each variant (for watermarking later)
    const generatedImages: Array<{ resultId: string; imageData: string }> = [];
    let firstResultId: string | undefined;

    for (let i = 0; i < PROMPT_VARIANTS.length; i++) {
      const variant = PROMPT_VARIANTS[i] as PromptVersion;
      const variantIndex = i + 1;

      // Update progress (5-70% range for generation, divided among 4 variants)
      const progress = 5 + Math.floor((i / PROMPT_VARIANTS.length) * 65);
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

      // Store the variant
      const resultId = await storeResultVariant(
        uploadId,
        generatedImage.data,
        generatedImage.mimeType,
        variant,
        variantIndex,
        generationTimeMs,
      );

      resultIds.push(resultId);
      generatedImages.push({ resultId, imageData: generatedImage.data });

      // Keep first result ID for backward compatibility
      if (!firstResultId) {
        firstResultId = resultId;
      }

      console.log(
        `[workflow] Variant ${variantIndex} complete: ${resultId} (${generationTimeMs}ms)`,
      );
    }

    // Check if we got at least one result
    if (resultIds.length === 0) {
      await markFailed(uploadId, "Failed to generate any images");
      return { success: false, error: "Failed to generate any images" };
    }

    console.log(`[workflow] Generated ${resultIds.length} variants`);

    // Stage 3: Watermarking - create preview for EACH variant
    await updateUploadStage(uploadId, "watermarking", 75);

    let firstPreviewKey: string | null = null;

    for (let i = 0; i < generatedImages.length; i++) {
      const { resultId, imageData } = generatedImages[i]!;

      // Update progress (75-95% range for watermarking, divided among variants)
      const progress = 75 + Math.floor((i / generatedImages.length) * 20);
      await updateUploadStage(uploadId, "watermarking", progress);

      console.log(`[workflow] Creating watermark for variant ${i + 1}/${generatedImages.length}: ${resultId}`);

      const previewKey = await createAndStorePreview(uploadId, resultId, imageData);
      if (previewKey) {
        console.log(`[workflow] Preview stored at: ${previewKey}`);

        // Keep first preview for backward compatibility with uploads table
        if (!firstPreviewKey) {
          firstPreviewKey = previewKey;
        }
      }
    }

    // Update uploads table with first preview URL for backward compatibility
    if (firstPreviewKey) {
      await updatePreviewUrl(uploadId, firstPreviewKey);
    }

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
