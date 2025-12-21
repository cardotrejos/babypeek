import { z } from "zod"

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Cloudflare R2 - optional in dev, required in production
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Gemini AI
  GEMINI_API_KEY: z.string().min(1).optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),

  // Resend
  RESEND_API_KEY: z.string().startsWith("re_").optional(),

  // PostHog
  POSTHOG_KEY: z.string().min(1).optional(),

  // Sentry
  SENTRY_DSN: z.string().url().optional(),

  // CORS
  CORS_ORIGIN: z.string().url().optional(),

  // Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
})

// Parse and validate at startup
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("❌ Invalid environment variables:")
  console.error(parsed.error.flatten().fieldErrors)

  // In development, allow partial config
  if (process.env.NODE_ENV === "production") {
    throw new Error("Invalid environment variables")
  }
}

export const env = parsed.success
  ? parsed.data
  : {
      DATABASE_URL: process.env.DATABASE_URL || "",
      NODE_ENV: "development" as const,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
    }

export type Env = z.infer<typeof envSchema>

// R2 configuration check - fails fast in production if R2 not configured
export const checkR2Config = () => {
  const isProduction = env.NODE_ENV === "production"
  const hasR2Config = env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME

  if (isProduction && !hasR2Config) {
    throw new Error("❌ R2 storage not configured. Required in production: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME")
  }

  return hasR2Config
}

export const isR2Configured = () => {
  return !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME)
}
