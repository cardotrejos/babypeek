# Better Auth + Magic Link Implementation Plan

## Goal
Replace hand-rolled session tokens with Better Auth magic link authentication.
New flow: Upload → Email → Magic Link → Authenticated Processing.

## Stack Context
- **Server:** Hono (packages/api)
- **Client:** TanStack Router + React (apps/web)
- **DB:** Drizzle ORM + PostgreSQL (packages/db)
- **Email:** Resend (already configured in ResendService)
- **Monorepo:** Turborepo with Bun

---

## Phase 1: Install & Configure Better Auth

### 1.1 Install packages
```bash
bun add better-auth
```

### 1.2 Environment Variables
Add to `.env` and `packages/api/src/lib/env.ts` schema:
```
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000
```

### 1.3 Create auth instance: `packages/api/src/lib/auth.ts`
```typescript
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@babypeek/db";
import { env } from "./env";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }, ctx) => {
        const { Resend } = await import("resend");
        const resend = new Resend(env.RESEND_API_KEY);
        
        await resend.emails.send({
          from: "BabyPeek <noreply@babypeek.io>",
          to: email,
          subject: "Your BabyPeek Magic Link ✨",
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2>Almost there! 👶</h2>
              <p>Click the link below to see your baby portrait:</p>
              <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
                View My Baby Portrait
              </a>
              <p style="color: #666; font-size: 14px; margin-top: 16px;">
                This link expires in 5 minutes.
              </p>
            </div>
          `,
        });
      },
      expiresIn: 300,
    }),
  ],
  emailAndPassword: { enabled: false },
});
```

### 1.4 Generate DB schema
```bash
npx auth@latest generate --output packages/db/src/schema/auth-schema.ts
npx auth@latest migrate
```
Creates tables: `user`, `session`, `verification` (for magic link tokens).

### 1.5 Mount auth handler on Hono
In the main Hono app entry (wherever routes are composed):
```typescript
import { auth } from "./lib/auth";
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});
```

### 1.6 Create auth middleware: `packages/api/src/middleware/auth.ts`
```typescript
import type { Context, Next } from "hono";
import { auth } from "../lib/auth";

export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Authentication required", code: "UNAUTHENTICATED" }, 401);
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
}
```

---

## Phase 2: Update Database Schema

### 2.1 Modify uploads table
Replace `sessionToken` with `userId`:
- REMOVE: `sessionToken: text("session_token").notNull().unique()`
- ADD: `userId: text("user_id").notNull()` (references auth user table)
- Keep `email` for convenience (denormalized)

### 2.2 Migration
1. Add `user_id` column (nullable initially)
2. Drop `session_token` column
3. Add index on `user_id`

---

## Phase 3: Update API Routes

### 3.1 Upload route (`packages/api/src/routes/upload.ts`)
- Require auth via `requireAuth` middleware
- Associate upload with `c.get("user").id` instead of generating sessionToken
- Remove session token from response

### 3.2 Process route (`packages/api/src/routes/process.ts`)
- Replace `X-Session-Token` header check with `requireAuth` middleware
- Verify: `upload.userId === c.get("user").id`

### 3.3 Checkout route (`packages/api/src/routes/checkout.ts`)
- Self-checkout: `requireAuth` + verify ownership via userId
- Gift checkout `/gift`: remains public (no auth needed)

### 3.4 Retry route (`packages/api/src/routes/retry.ts`)
- Replace session token with `requireAuth` + userId check

### 3.5 Download/Status/Preview routes
- Require auth, verify upload ownership
- Shared links via shareId remain public

---

## Phase 4: Update Frontend (apps/web)

### 4.1 Create auth client: `apps/web/src/lib/auth-client.ts`
```typescript
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "",
  plugins: [magicLinkClient()],
});
export const { signIn, useSession } = authClient;
```

### 4.2 New Upload Flow
1. Upload image (anonymous presigned URL, get uploadId)
2. Show email input
3. On submit: `signIn.magicLink({ email, callbackURL: "/processing/{uploadId}" })`
4. Show "Check your email ✉️" screen
5. User clicks magic link → `/processing/{uploadId}` (authenticated)
6. Processing page auto-starts AI generation

### 4.3 Update components
- `email-input.tsx` → trigger magic link instead of direct process
- Create "check your email" component
- `processing.$jobId.tsx` → verify session, auto-process
- `use-upload.ts` → remove session token management
- All API calls: remove `X-Session-Token` header, use `credentials: "include"`

---

## Phase 5: CORS
```typescript
import { cors } from "hono/cors";
app.use("/api/auth/*", cors({
  origin: env.WEB_URL || "http://localhost:5173",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  credentials: true,
}));
```

---

## Phase 6: Update UploadService
- `create()`: Accept `userId` instead of `sessionToken`
- `getByIdWithAuth()`: Check `userId` match instead of `sessionToken`
- Remove `sessionToken` from all interfaces

---

## Phase 7: Cleanup
- Delete all `X-Session-Token` references
- Remove `sessionToken` from TypeScript interfaces
- Remove `crypto.randomUUID()` session generation
- Update tests to use auth sessions
- Add `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` to env schema

---

## File Summary

### New files:
- `packages/api/src/lib/auth.ts`
- `packages/api/src/middleware/auth.ts`
- `packages/db/src/schema/auth-schema.ts` (generated)
- `apps/web/src/lib/auth-client.ts`
- `apps/web/src/components/upload/check-email.tsx`

### Modified files:
- `packages/db/src/schema/index.ts` (sessionToken → userId)
- `packages/api/src/lib/env.ts` (new env vars)
- `packages/api/src/routes/upload.ts`
- `packages/api/src/routes/process.ts`
- `packages/api/src/routes/checkout.ts`
- `packages/api/src/routes/retry.ts`
- `packages/api/src/routes/status.ts`
- `packages/api/src/routes/preview.ts`
- `packages/api/src/routes/download.ts`
- `packages/api/src/services/UploadService.ts`
- `apps/web/src/hooks/use-upload.ts`
- `apps/web/src/components/upload/email-input.tsx`
- `apps/web/src/routes/processing.$jobId.tsx`
- Main Hono app entry (mount auth handler)

---

## Security Benefits
- Identity-based (email-verified users, not IP-based)
- No IP spoofing possible
- Per-user limits possible
- Abuse tracking (ban specific users)
- GDPR-ready (proper user accounts for data requests)
