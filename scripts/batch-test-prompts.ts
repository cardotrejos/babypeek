#!/usr/bin/env bun
/**
 * Batch Prompt Testing Script
 *
 * Generates images for multiple input images across all prompt versions.
 * Useful for comparing prompt effectiveness.
 *
 * Usage:
 *   bun run scripts/batch-test-prompts.ts
 *
 * Environment:
 *   GEMINI_API_KEY - Required. Your Google AI API key.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join, basename } from "node:path"
import {
  getPrompt,
  getAvailableVersions,
  getPromptMetadata,
  type PromptVersion,
} from "../packages/api/src/prompts/baby-portrait"
import {
  GEMINI_MODELS,
  SAFETY_SETTINGS,
  GENERATION_CONFIG,
  inferMimeType,
} from "../packages/api/src/lib/gemini"

// =============================================================================
// Configuration
// =============================================================================

const INPUT_IMAGES = [
  "resources/4d-ultra.jpeg",
  "resources/4d-ultra-2.jpeg",
]

const OUTPUT_DIR = "./results/batch"
const PROMPT_VERSIONS = getAvailableVersions()

// Delay between API calls to avoid rate limiting (in ms)
const API_DELAY = 2000

// =============================================================================
// Types
// =============================================================================

interface GeminiClient {
  getGenerativeModel: (config: Record<string, unknown>) => {
    generateContent: (params: { contents: unknown[] }) => Promise<{
      response: {
        candidates?: Array<{
          content?: {
            parts?: Array<{ inlineData?: { data?: string }; text?: string }>
          }
        }>
      }
    }>
  }
}

interface GenerationResult {
  image: string
  prompt: PromptVersion
  outputPath?: string
  error?: string
  duration: number
}

// =============================================================================
// Helpers
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadImage(imagePath: string): { buffer: Buffer; mimeType: string } {
  if (!existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`)
  }
  const buffer = readFileSync(imagePath)
  const mimeType = inferMimeType(buffer)
  return { buffer, mimeType }
}

function saveResult(buffer: Buffer, outputDir: string, imageName: string, promptVersion: string): string {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }
  const timestamp = Date.now()
  const filename = `${imageName}_${promptVersion}_${timestamp}.jpg`
  const outputPath = join(outputDir, filename)
  writeFileSync(outputPath, buffer)
  return outputPath
}

// =============================================================================
// Gemini API
// =============================================================================

async function createGeminiClient(apiKey: string): Promise<GeminiClient> {
  const { GoogleGenerativeAI } = await import(
    join(process.cwd(), "packages/api/node_modules/@google/generative-ai/dist/index.mjs")
  )
  return new GoogleGenerativeAI(apiKey) as GeminiClient
}

async function generateImage(
  client: GeminiClient,
  imageBuffer: Buffer,
  mimeType: string,
  prompt: string
): Promise<Buffer> {
  const model = client.getGenerativeModel({
    model: GEMINI_MODELS.PRO_IMAGE,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      ...GENERATION_CONFIG,
      responseModalities: ["image", "text"],
    },
  })

  const base64Image = imageBuffer.toString("base64")

  const contents = [
    {
      role: "user" as const,
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
        {
          text: prompt,
        },
      ],
    },
  ]

  const result = await model.generateContent({ contents })
  const response = result.response

  const parts = response.candidates?.[0]?.content?.parts
  if (!parts) {
    throw new Error("No response parts received")
  }

  for (const part of parts) {
    if ("inlineData" in part && part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64")
    }
  }

  for (const part of parts) {
    if ("text" in part && part.text) {
      console.log("Model response text:", part.text)
    }
  }

  throw new Error("No image data in response")
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log("\n========================================")
  console.log("  3D-Ultra Batch Prompt Tester")
  console.log("========================================\n")

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is required")
    process.exit(1)
  }

  // Summary
  const totalGenerations = INPUT_IMAGES.length * PROMPT_VERSIONS.length
  console.log(`Input images: ${INPUT_IMAGES.length}`)
  console.log(`Prompt versions: ${PROMPT_VERSIONS.join(", ")}`)
  console.log(`Total generations: ${totalGenerations}`)
  console.log(`Output directory: ${OUTPUT_DIR}`)
  console.log()

  // Initialize client
  const client = await createGeminiClient(apiKey)

  const results: GenerationResult[] = []
  let completed = 0

  // Process each image with each prompt
  for (const imagePath of INPUT_IMAGES) {
    const imageName = basename(imagePath, ".jpeg").replace(/\./g, "-")
    console.log(`\n📁 Processing: ${imagePath}`)
    
    const { buffer, mimeType } = loadImage(imagePath)
    console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB, Type: ${mimeType}`)

    for (const promptVersion of PROMPT_VERSIONS) {
      completed++
      const progress = `[${completed}/${totalGenerations}]`
      const metadata = getPromptMetadata(promptVersion)
      
      console.log(`\n${progress} Generating with ${promptVersion} (${metadata.style}, ${metadata.format})...`)
      
      const startTime = Date.now()
      const prompt = getPrompt(promptVersion)

      try {
        const resultBuffer = await generateImage(client, buffer, mimeType, prompt)
        const duration = (Date.now() - startTime) / 1000
        
        const outputPath = saveResult(resultBuffer, OUTPUT_DIR, imageName, promptVersion)
        
        console.log(`   ✅ Generated in ${duration.toFixed(1)}s`)
        console.log(`   💾 Saved: ${outputPath}`)
        
        results.push({
          image: imagePath,
          prompt: promptVersion,
          outputPath,
          duration,
        })
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000
        const errorMsg = error instanceof Error ? error.message : String(error)
        
        console.log(`   ❌ Failed in ${duration.toFixed(1)}s: ${errorMsg}`)
        
        results.push({
          image: imagePath,
          prompt: promptVersion,
          error: errorMsg,
          duration,
        })
      }

      // Delay before next API call
      if (completed < totalGenerations) {
        await sleep(API_DELAY)
      }
    }
  }

  // Final summary
  console.log("\n========================================")
  console.log("  Results Summary")
  console.log("========================================\n")

  const successful = results.filter((r) => r.outputPath)
  const failed = results.filter((r) => r.error)

  console.log(`✅ Successful: ${successful.length}/${totalGenerations}`)
  console.log(`❌ Failed: ${failed.length}/${totalGenerations}`)

  if (successful.length > 0) {
    console.log("\nGenerated files:")
    for (const r of successful) {
      console.log(`  - ${r.outputPath}`)
    }
  }

  if (failed.length > 0) {
    console.log("\nFailed generations:")
    for (const r of failed) {
      console.log(`  - ${r.image} + ${r.prompt}: ${r.error}`)
    }
  }

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  console.log(`\nTotal time: ${totalDuration.toFixed(1)}s`)
  console.log("\n🎉 Done!")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
