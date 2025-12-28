import { z } from "zod";

// =============================================================================
// Environment Variable Schema
// =============================================================================

const envSchema = z.object({
  // ─────────────────────────────────────────────────────────────────────────────
  // Database (Required)
  // ─────────────────────────────────────────────────────────────────────────────
  DATABASE_URL: z
    .string({ message: "DATABASE_URL is required" })
    .url("DATABASE_URL must be a valid PostgreSQL connection URL"),

  // ─────────────────────────────────────────────────────────────────────────────
  // Cloudflare R2 Storage (Optional in dev, required in production)
  // ─────────────────────────────────────────────────────────────────────────────
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID cannot be empty").optional(),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID cannot be empty").optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY cannot be empty").optional(),
  R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME cannot be empty").optional(),
  R2_PUBLIC_URL: z.string().url("R2_PUBLIC_URL must be a valid URL").optional(),

  // ─────────────────────────────────────────────────────────────────────────────
  // Gemini AI (Optional in dev, required in production)
  // ─────────────────────────────────────────────────────────────────────────────
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY cannot be empty").optional(),

  // ─────────────────────────────────────────────────────────────────────────────
  // Stripe Payments (Optional in dev, required in production)
  // ─────────────────────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith("sk_", "STRIPE_SECRET_KEY must start with 'sk_'")
    .optional(),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith("whsec_", "STRIPE_WEBHOOK_SECRET must start with 'whsec_'")
    .optional(),

  // ─────────────────────────────────────────────────────────────────────────────
  // Resend Email (Optional in dev, required in production)
  // ─────────────────────────────────────────────────────────────────────────────
  RESEND_API_KEY: z.string().startsWith("re_", "RESEND_API_KEY must start with 're_'").optional(),

  // ─────────────────────────────────────────────────────────────────────────────
  // PostHog Analytics (Optional)
  // ─────────────────────────────────────────────────────────────────────────────
  POSTHOG_KEY: z.string().min(1, "POSTHOG_KEY cannot be empty").optional(),

  // ─────────────────────────────────────────────────────────────────────────────
  // Sentry Error Tracking (Optional)
  // ─────────────────────────────────────────────────────────────────────────────
  SENTRY_DSN: z.string().url("SENTRY_DSN must be a valid URL").optional(),

  // ─────────────────────────────────────────────────────────────────────────────
  // CORS Configuration
  // ─────────────────────────────────────────────────────────────────────────────
  CORS_ORIGIN: z.string().url("CORS_ORIGIN must be a valid URL").optional(),

  // ─────────────────────────────────────────────────────────────────────────────
  // Application Config
  // ─────────────────────────────────────────────────────────────────────────────
  APP_URL: z.string().url("APP_URL must be a valid URL").default("http://localhost:3001"),
  PRODUCT_PRICE_CENTS: z.coerce.number().int().positive().default(999), // $9.99 default
  FROM_EMAIL: z.string().email().default("noreply@babypeek.io"),

  // ─────────────────────────────────────────────────────────────────────────────
  // Workflow (Vercel Workflow DevKit) - Auto-configured on Vercel
  // ─────────────────────────────────────────────────────────────────────────────
  // Note: Workflow DevKit auto-configures in Vercel deployments.
  // For local development, it uses the Local World (filesystem-based).
  // No API key required - authentication is handled automatically.

  // ─────────────────────────────────────────────────────────────────────────────
  // Privacy & Security
  // ─────────────────────────────────────────────────────────────────────────────
  IP_HASH_SALT: z.string().min(16, "IP_HASH_SALT should be at least 16 characters").optional(),

  // ─────────────────────────────────────────────────────────────────────────────
  // Cron Jobs
  // ─────────────────────────────────────────────────────────────────────────────
  CRON_SECRET: z.string().min(16, "CRON_SECRET should be at least 16 characters").optional(),

  // ─────────────────────────────────────────────────────────────────────────────
  // Environment
  // ─────────────────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// =============================================================================
// Environment Parsing & Validation
// =============================================================================

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Format errors without exposing values
  const errors = parsed.error.flatten();
  const fieldErrors = Object.entries(errors.fieldErrors)
    .map(([field, messages]) => `  - ${field}: ${messages?.join(", ")}`)
    .join("\n");

  console.error("❌ Environment validation failed:");
  console.error(fieldErrors);

  if (process.env.NODE_ENV === "production") {
    throw new Error("Invalid environment variables in production");
  }
}

// Fallback for development with minimal config
export const env = parsed.success
  ? parsed.data
  : {
      DATABASE_URL: process.env.DATABASE_URL || "",
      NODE_ENV: "development" as const,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      APP_URL: process.env.APP_URL || "http://localhost:3001",
      PRODUCT_PRICE_CENTS: Number(process.env.PRODUCT_PRICE_CENTS) || 999,
      FROM_EMAIL: process.env.FROM_EMAIL || "noreply@babypeek.io",
      // All optional fields default to undefined
      R2_ACCOUNT_ID: undefined,
      R2_ACCESS_KEY_ID: undefined,
      R2_SECRET_ACCESS_KEY: undefined,
      R2_BUCKET_NAME: undefined,
      R2_PUBLIC_URL: undefined,
      GEMINI_API_KEY: undefined,
      STRIPE_SECRET_KEY: undefined,
      STRIPE_WEBHOOK_SECRET: undefined,
      RESEND_API_KEY: undefined,
      POSTHOG_KEY: undefined,
      SENTRY_DSN: undefined,
      IP_HASH_SALT: undefined,
      CRON_SECRET: undefined,
    };

export type Env = z.infer<typeof envSchema>;

// =============================================================================
// Service Configuration Checks
// =============================================================================

/** Check if R2 storage is fully configured */
export const isR2Configured = () => {
  return !!(
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET_NAME
  );
};

/** Check if Stripe payments are configured */
export const isStripeConfigured = () => {
  return !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
};

/** Check if PostHog analytics is configured */
export const isPostHogConfigured = () => {
  return !!env.POSTHOG_KEY;
};

/** Check if Sentry error tracking is configured */
export const isSentryConfigured = () => {
  return !!env.SENTRY_DSN;
};

/** Check if Resend email is configured */
export const isResendConfigured = () => {
  return !!env.RESEND_API_KEY;
};

/** Check if Gemini AI is configured */
export const isGeminiConfigured = () => {
  return !!env.GEMINI_API_KEY;
};

// =============================================================================
// Production Checks (Fail Fast)
// =============================================================================

/** Validate R2 config - throws in production if not configured */
export const checkR2Config = () => {
  if (env.NODE_ENV === "production" && !isR2Configured()) {
    throw new Error(
      "❌ R2 storage not configured. Required in production: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME",
    );
  }
  return isR2Configured();
};

/** Validate Stripe config - throws in production if not configured */
export const checkStripeConfig = () => {
  if (env.NODE_ENV === "production" && !isStripeConfigured()) {
    throw new Error(
      "❌ Stripe not configured. Required in production: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET",
    );
  }
  return isStripeConfigured();
};

/** Validate all production-required services */
export const checkProductionConfig = () => {
  const missing: string[] = [];

  if (!isR2Configured()) missing.push("R2 Storage");
  if (!isStripeConfigured()) missing.push("Stripe Payments");
  if (!isResendConfigured()) missing.push("Resend Email");
  if (!isGeminiConfigured()) missing.push("Gemini AI");

  if (env.NODE_ENV === "production" && missing.length > 0) {
    throw new Error(`❌ Missing production configuration: ${missing.join(", ")}`);
  }

  return missing.length === 0;
};

// =============================================================================
// Safe Logging (Never expose secrets)
// =============================================================================

/** Log environment status without exposing actual values */
export const logEnvStatus = () => {
  const status = {
    environment: env.NODE_ENV,
    services: {
      database: !!env.DATABASE_URL,
      r2Storage: isR2Configured(),
      stripe: isStripeConfigured(),
      resend: isResendConfigured(),
      gemini: isGeminiConfigured(),
      posthog: isPostHogConfigured(),
      sentry: isSentryConfigured(),
    },
  };

  console.log("📊 Environment Status:");
  console.log(`   Environment: ${status.environment}`);
  console.log("   Services:");
  Object.entries(status.services).forEach(([service, configured]) => {
    const icon = configured ? "✅" : "⚪";
    console.log(`     ${icon} ${service}: ${configured ? "configured" : "not configured"}`);
  });

  return status;
};

/** Get environment status as object (for programmatic access) */
export const getEnvStatus = () => ({
  environment: env.NODE_ENV,
  database: !!env.DATABASE_URL,
  r2: isR2Configured(),
  stripe: isStripeConfigured(),
  resend: isResendConfigured(),
  gemini: isGeminiConfigured(),
  posthog: isPostHogConfigured(),
  sentry: isSentryConfigured(),
});
