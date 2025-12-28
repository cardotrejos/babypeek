#!/usr/bin/env bun
/**
 * Local Prompt Testing Script
 *
 * Test different prompts with Gemini/Imagen without using the UI.
 * Useful for prompt engineering and quality testing.
 *
 * Usage:
 *   bun run scripts/test-prompt.ts <image-path> [options]
 *
 * Options:
 *   --prompt-version, -p   Prompt version: v3, v3-json, v4, v4-json (default: v4)
 *   --output, -o           Output directory (default: ./results)
 *   --custom-prompt, -c    Use a custom prompt from file
 *   --size, -s             Output size: 1K, 2K, 4K (default: 1K)
 *   --aspect, -a           Aspect ratio: 1:1, 4:3, 3:4, etc. (default: 1:1)
 *   --dry-run              Show prompt without calling API
 *   --verbose, -v          Show detailed output
 *
 * Examples:
 *   bun run scripts/test-prompt.ts resources/4d-ultra.jpeg
 *   bun run scripts/test-prompt.ts resources/4d-ultra.jpeg -p v3 -s 2K
 *   bun run scripts/test-prompt.ts resources/4d-ultra.jpeg -c my-prompt.txt
 *   bun run scripts/test-prompt.ts resources/4d-ultra.jpeg --dry-run -v
 *
 * Environment:
 *   GEMINI_API_KEY - Required. Your Google AI API key.
 *
 * @see packages/api/src/prompts/baby-portrait.ts for prompt templates
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import {
  getPrompt,
  getAvailableVersions,
  getPromptMetadata,
  UPSCALE_PROMPT,
  type PromptVersion,
} from "../packages/api/src/prompts/baby-portrait"
import {
  GEMINI_MODELS,
  SAFETY_SETTINGS,
  GENERATION_CONFIG,
  inferMimeType,
  type AspectRatio,
  type ImageSize,
} from "../packages/api/src/lib/gemini"

// =============================================================================
// Configuration
// =============================================================================

interface Config {
  imagePath: string
  promptVersion: PromptVersion
  customPromptPath?: string
  outputDir: string
  size: ImageSize
  aspectRatio: AspectRatio
  dryRun: boolean
  verbose: boolean
  upscale: boolean
}

const DEFAULT_CONFIG: Omit<Config, "imagePath"> = {
  promptVersion: "v4",
  outputDir: "./results",
  size: "1K",
  aspectRatio: "1:1",
  dryRun: false,
  verbose: false,
  upscale: false,
}

// =============================================================================
// CLI Parsing
// =============================================================================

function printHelp(): void {
  console.log(`
Local Prompt Testing Script for 3D-Ultra

Usage:
  bun run scripts/test-prompt.ts <image-path> [options]

Arguments:
  <image-path>            Path to the 4D ultrasound image

Options:
  --prompt-version, -p    Prompt version: ${getAvailableVersions().join(", ")} (default: v4)
  --output, -o            Output directory (default: ./results)
  --custom-prompt, -c     Use a custom prompt from file
  --size, -s              Output size: 1K, 2K, 4K (default: 1K)
  --aspect, -a            Aspect ratio: 1:1, 4:3, 3:4, 16:9, etc. (default: 1:1)
  --upscale               Run upscale pass after initial generation
  --dry-run               Show prompt without calling API
  --verbose, -v           Show detailed output
  --help, -h              Show this help message

Examples:
  # Basic usage with default v4 prompt
  bun run scripts/test-prompt.ts resources/4d-ultra.jpeg

  # Use v3 in-utero style with 2K output
  bun run scripts/test-prompt.ts resources/4d-ultra.jpeg -p v3 -s 2K

  # Use custom prompt from file
  bun run scripts/test-prompt.ts resources/4d-ultra.jpeg -c my-prompt.txt

  # Dry run to see the prompt without API call
  bun run scripts/test-prompt.ts resources/4d-ultra.jpeg --dry-run -v

  # Generate and upscale to 4K
  bun run scripts/test-prompt.ts resources/4d-ultra.jpeg --upscale -s 4K

Environment Variables:
  GEMINI_API_KEY          Required. Your Google AI API key.
`)
}

function parseArgs(args: string[]): Config {
  const config: Config = { ...DEFAULT_CONFIG, imagePath: "" }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case "--help":
      case "-h":
        printHelp()
        process.exit(0)

      case "--prompt-version":
      case "-p":
        if (!next || next.startsWith("-")) {
          console.error("Error: --prompt-version requires a value")
          process.exit(1)
        }
        if (!getAvailableVersions().includes(next as PromptVersion)) {
          console.error(`Error: Invalid prompt version. Available: ${getAvailableVersions().join(", ")}`)
          process.exit(1)
        }
        config.promptVersion = next as PromptVersion
        i++
        break

      case "--output":
      case "-o":
        if (!next || next.startsWith("-")) {
          console.error("Error: --output requires a value")
          process.exit(1)
        }
        config.outputDir = next
        i++
        break

      case "--custom-prompt":
      case "-c":
        if (!next || next.startsWith("-")) {
          console.error("Error: --custom-prompt requires a file path")
          process.exit(1)
        }
        config.customPromptPath = next
        i++
        break

      case "--size":
      case "-s":
        if (!next || !["1K", "2K", "4K"].includes(next)) {
          console.error("Error: --size must be 1K, 2K, or 4K")
          process.exit(1)
        }
        config.size = next as ImageSize
        i++
        break

      case "--aspect":
      case "-a":
        if (!next || next.startsWith("-")) {
          console.error("Error: --aspect requires a value")
          process.exit(1)
        }
        config.aspectRatio = next as AspectRatio
        i++
        break

      case "--upscale":
        config.upscale = true
        break

      case "--dry-run":
        config.dryRun = true
        break

      case "--verbose":
      case "-v":
        config.verbose = true
        break

      default:
        if (arg.startsWith("-")) {
          console.error(`Error: Unknown option: ${arg}`)
          process.exit(1)
        }
        if (!config.imagePath) {
          config.imagePath = arg
        }
    }
  }

  if (!config.imagePath) {
    console.error("Error: Image path is required")
    printHelp()
    process.exit(1)
  }

  return config
}

// =============================================================================
// Image Processing
// =============================================================================

function loadImage(imagePath: string): { buffer: Buffer; mimeType: string } {
  if (!existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`)
  }

  const buffer = readFileSync(imagePath)
  const mimeType = inferMimeType(buffer)

  return { buffer, mimeType }
}

function saveResult(buffer: Buffer, outputDir: string, suffix: string): string {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const timestamp = Date.now()
  const filename = `result-${timestamp}${suffix}.jpg`
  const outputPath = join(outputDir, filename)

  writeFileSync(outputPath, buffer)
  return outputPath
}

// =============================================================================
// Gemini API
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

async function createGeminiClient(apiKey: string): Promise<GeminiClient> {
  // Dynamic import to resolve from packages/api node_modules
  const { GoogleGenerativeAI } = await import(
    join(process.cwd(), "packages/api/node_modules/@google/generative-ai/dist/index.mjs")
  )
  return new GoogleGenerativeAI(apiKey) as GeminiClient
}

async function generateImage(
  client: GeminiClient,
  imageBuffer: Buffer,
  mimeType: string,
  prompt: string,
  config: Config
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

  if (config.verbose) {
    console.log("\n📤 Sending request to Gemini...")
    console.log(`   Model: ${GEMINI_MODELS.PRO_IMAGE}`)
    console.log(`   Size: ${config.size}`)
    console.log(`   Aspect: ${config.aspectRatio}`)
  }

  const result = await model.generateContent({ contents })
  const response = result.response

  // Extract image from response
  const parts = response.candidates?.[0]?.content?.parts
  if (!parts) {
    throw new Error("No response parts received")
  }

  for (const part of parts) {
    if ("inlineData" in part && part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64")
    }
  }

  // Check for text response (might contain error info)
  for (const part of parts) {
    if ("text" in part && part.text) {
      console.log("\n📝 Model response text:", part.text)
    }
  }

  throw new Error("No image data in response")
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const config = parseArgs(args)

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey && !config.dryRun) {
    console.error("Error: GEMINI_API_KEY environment variable is required")
    console.error("Set it with: export GEMINI_API_KEY=your-key")
    process.exit(1)
  }

  console.log("\n🎨 3D-Ultra Local Prompt Tester")
  console.log("================================\n")

  // Load image
  console.log(`📁 Loading image: ${config.imagePath}`)
  const { buffer, mimeType } = loadImage(config.imagePath)
  console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`)
  console.log(`   Type: ${mimeType}`)

  // Get prompt
  let prompt: string
  if (config.customPromptPath) {
    if (!existsSync(config.customPromptPath)) {
      console.error(`Error: Custom prompt file not found: ${config.customPromptPath}`)
      process.exit(1)
    }
    prompt = readFileSync(config.customPromptPath, "utf-8")
    console.log(`\n📝 Using custom prompt from: ${config.customPromptPath}`)
  } else {
    const metadata = getPromptMetadata(config.promptVersion)
    prompt = getPrompt(config.promptVersion)
    console.log(`\n📝 Using prompt: ${config.promptVersion}`)
    console.log(`   Style: ${metadata.style}`)
    console.log(`   Format: ${metadata.format}`)
  }

  if (config.verbose || config.dryRun) {
    console.log("\n--- PROMPT START ---")
    console.log(prompt)
    console.log("--- PROMPT END ---\n")
  }

  if (config.dryRun) {
    console.log("✅ Dry run complete. No API call made.")
    return
  }

  // Initialize client
  const client = await createGeminiClient(apiKey!)

  try {
    // Generate image
    console.log("\n⏳ Generating image...")
    const startTime = Date.now()

    const resultBuffer = await generateImage(client, buffer, mimeType, prompt, config)

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`✅ Generated in ${duration}s`)

    // Save result
    const outputPath = saveResult(resultBuffer, config.outputDir, "_full")
    console.log(`💾 Saved to: ${outputPath}`)

    // Optional upscale pass
    if (config.upscale) {
      console.log("\n⏳ Running upscale pass...")
      const upscaleStart = Date.now()

      const upscaledBuffer = await generateImage(client, resultBuffer, "image/jpeg", UPSCALE_PROMPT, {
        ...config,
        size: "4K",
      })

      const upscaleDuration = ((Date.now() - upscaleStart) / 1000).toFixed(1)
      console.log(`✅ Upscaled in ${upscaleDuration}s`)

      const upscalePath = saveResult(upscaledBuffer, config.outputDir, "_upscaled")
      console.log(`💾 Saved upscaled to: ${upscalePath}`)
    }

    console.log("\n🎉 Done!")
  } catch (error) {
    console.error("\n❌ Generation failed:")
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
      if (config.verbose && error.stack) {
        console.error("\nStack trace:")
        console.error(error.stack)
      }
    }
    process.exit(1)
  }
}

main()
