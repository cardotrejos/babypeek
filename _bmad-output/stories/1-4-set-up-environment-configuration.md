# Story 1.4: Set Up Environment Configuration

**Epic:** 1 - Foundation & Observability  
**Status:** done  
**Created:** 2024-12-20  
**Priority:** High (Ensures app fails fast on missing config)

---

## User Story

As a **developer**,  
I want **Zod-validated environment variables**,  
So that **the app fails fast on missing or invalid config**.

---

## Acceptance Criteria

| #   | Criterion                                               | Test                                                 |
| --- | ------------------------------------------------------- | ---------------------------------------------------- |
| AC1 | `.env.example` file with all required variables         | File exists with documented variables                |
| AC2 | All environment variables validated with Zod at startup | App fails with descriptive error if validation fails |
| AC3 | Missing required variables throw descriptive errors     | Error message names the missing variable             |
| AC4 | Sensitive values are never logged                       | No secrets in console output                         |
| AC5 | Type-safe `env` object is exported                      | `env.DATABASE_URL` has type `string`                 |

---

## Tasks / Subtasks

- [x] **Task 1: Audit Current Environment Configuration** (AC: 1, 2)
  - [x] 1.1 Review existing `packages/api/src/lib/env.ts`
  - [x] 1.2 Identify all required environment variables from architecture
  - [x] 1.3 Document which are required vs optional

- [x] **Task 2: Enhance Zod Environment Schema** (AC: 2, 3, 5)
  - [x] 2.1 Add all service environment variables to schema
  - [x] 2.2 Implement proper validation for each variable type
  - [x] 2.3 Add descriptive error messages for validation failures
  - [x] 2.4 Ensure type-safe export of validated env object

- [x] **Task 3: Update .env.example Files** (AC: 1)
  - [x] 3.1 Update `apps/server/.env.example` with all variables
  - [x] 3.2 Add comments explaining each variable
  - [x] 3.3 Group variables by service (Database, R2, Stripe, etc.)

- [x] **Task 4: Implement Safe Logging** (AC: 4)
  - [x] 4.1 Ensure env validation errors don't expose secrets
  - [x] 4.2 Create helper to log env status without values
  - [x] 4.3 Test that sensitive values never appear in logs

- [x] **Task 5: Verify Startup Behavior** (AC: 2, 3)
  - [x] 5.1 Test app startup with all variables present
  - [x] 5.2 TypeScript compilation verified
  - [x] 5.3 Error messages validated

---

## Dev Notes

### Architecture Requirements

**From `architecture.md`:**

All required environment variables:

```bash
# Database
DATABASE_URL=postgresql://...

# Cloudflare R2 Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Gemini AI (for future stories)
GEMINI_API_KEY=

# Stripe Payments (for future stories)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend Email (for future stories)
RESEND_API_KEY=re_...

# PostHog Analytics
POSTHOG_KEY=

# Sentry Error Tracking
SENTRY_DSN=https://...

# CORS
CORS_ORIGIN=http://localhost:3001

# Environment
NODE_ENV=development
```

### Current Implementation

**Existing `env.ts` has:**

- DATABASE_URL validation
- R2 variables (optional)
- Placeholder variables for future services
- Production fail-fast check
- `checkR2Config()` helper

**Needs Enhancement:**

- Better error messages naming specific missing variables
- Grouped validation by service
- Safe logging helper
- Comprehensive `.env.example` documentation

### Zod Validation Pattern

```typescript
const envSchema = z.object({
  // Required in all environments
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // Required in production only
  STRIPE_SECRET_KEY: z.string()
    .startsWith("sk_", "STRIPE_SECRET_KEY must start with 'sk_'")
    .optional()
    .refine(
      (val) => process.env.NODE_ENV !== "production" || !!val,
      "STRIPE_SECRET_KEY is required in production"
    ),
})
```

### Safe Logging Pattern

```typescript
export const logEnvStatus = () => {
  const configured = {
    database: !!env.DATABASE_URL,
    r2: isR2Configured(),
    stripe: !!env.STRIPE_SECRET_KEY,
    posthog: !!env.POSTHOG_KEY,
    sentry: !!env.SENTRY_DSN,
  }
  console.log("Environment status:", configured)
  // Never log actual values!
}
```

### Previous Story Learnings

**From Story 1.3:**

- `checkR2Config()` and `isR2Configured()` helpers already exist
- R2 variables are optional in dev, should be required in production
- `.env.example` was updated with R2 placeholders

### File Locations

| File                          | Purpose                             |
| ----------------------------- | ----------------------------------- |
| `packages/api/src/lib/env.ts` | UPDATE: Enhance validation          |
| `apps/server/.env.example`    | UPDATE: Comprehensive documentation |
| `apps/server/.env`            | Local environment (gitignored)      |

### Testing Notes

**Test Cases:**

1. Start with all required variables → should succeed
2. Remove DATABASE_URL → should fail with "DATABASE_URL is required"
3. Set STRIPE_SECRET_KEY=invalid → should fail with format error
4. Check console output → no secrets should appear

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4

### Debug Log References

N/A

### Completion Notes List

- Enhanced env.ts with grouped validation by service
- Added descriptive error messages for each variable
- Created service configuration check helpers (isR2Configured, isStripeConfigured, etc.)
- Added production fail-fast checks (checkR2Config, checkStripeConfig, checkProductionConfig)
- Implemented logEnvStatus() for safe environment status logging
- Implemented getEnvStatus() for programmatic access
- Updated .env.example with comprehensive documentation and grouping
- All TypeScript types compile cleanly

### File List

| File                          | Action   |
| ----------------------------- | -------- |
| `packages/api/src/lib/env.ts` | Modified |
| `apps/server/.env.example`    | Modified |

---

## Change Log

| Date       | Change                                   |
| ---------- | ---------------------------------------- |
| 2024-12-20 | Story created with comprehensive context |

---

## References

- [Source: architecture.md#Environment-Variables] - Complete variable list
- [Source: architecture.md#Environment-Validation] - Zod validation pattern
- [Story 1.3: Configure Cloudflare R2 Storage] - R2 env var pattern
