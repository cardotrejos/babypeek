# Architecture — BabyPeek.io

> Turn 4D ultrasound images into beautiful AI-generated baby portraits.

## Overview

BabyPeek is a Turborepo monorepo built on the Better-T-Stack (React + TanStack Start, Hono, Drizzle, PostgreSQL, Bun).

## Monorepo Structure

```
babypeek/
├── apps/
│   ├── web/          # Frontend (React + TanStack Start, port 3001)
│   └── server/       # HTTP API server entry point (Hono, port 3000)
├── packages/
│   ├── api/          # Business logic: routes, workflows, middleware
│   ├── db/           # Database schema & queries (Drizzle + PostgreSQL)
│   └── config/       # Shared env var validation
```

## App Layers

### `apps/web` — Frontend
- React + TanStack Start (SSR)
- TailwindCSS + shadcn/ui
- Calls `apps/server` API over HTTP
- Server components by default; `"use client"` only for interactivity
- Auth via Better Auth (cookie-based session)

### `apps/server` — API Entry Point
- Hono HTTP server
- Mounts all route handlers from `@babypeek/api`
- Middleware: Sentry error tracking, CORS, logger
- Routes: auth, health, storage, upload, process, status, retry, checkout, webhook, share, download, data, cron/cleanup, preferences, preview

### `packages/api` — Business Logic
- All route handlers (Hono)
- **Workflows** — AI generation pipeline (Effect-based, async):
  - `process-image.ts` — Full workflow with retries
  - `process-image-simple.ts` — Simplified fallback
- **Middleware** — rate limiting, Sentry, auth guards
- **Prompts** — `baby-portrait.ts` for FAL.ai prompt construction
- **Lib** — Effect runtime, error types, retry logic, pricing, hashing

### `packages/db` — Database
- Drizzle ORM + PostgreSQL
- Schema: auth (Better Auth tables), custom tables
- `bun run db:push` to apply schema changes

## Request Flow

```
User uploads ultrasound
  → POST /api/storage/upload-url  (signed upload URL)
  → Upload direct to R2
  → POST /api/process             (trigger generation)
```

## External Services

| Service | Purpose |
|---------|---------|
| **Cloudflare R2** | All file storage (input ultrasounds + generated portraits) |
| **FAL.ai** | AI image generation model |
| **PostgreSQL** | Persistent data (Coolify-managed, Hetzner) |
| **Better Auth** | Authentication (sessions, OAuth) |
| **Stripe** | Payment processing / checkout |
| **Resend** | Transactional email |
| **PostHog** | Product analytics |
| **Facebook Conversions API** | Conversion tracking |
| **Sentry** | Error tracking |

## Privacy Architecture

Ultrasound images are sensitive. Key constraints:
- **No local filesystem** — all files go to R2 exclusively
- **TTL on all uploads** — images auto-delete after delivery window
- **No PII in logs** — emails, image URLs, payment data never logged
- Upload URLs are signed and short-lived

## Deployment

- Frontend + backend deployed to Vercel (monorepo)
- Database: Coolify-managed PostgreSQL on Hetzner (see team infra notes for host)
- R2 bucket: Cloudflare (region: auto)

## Development

```bash
bun install        # Install deps
bun run dev        # Start all apps (web :3001, server :3000)
bun run db:push    # Apply DB schema
bun run build      # Production build
bun run test       # Run test suite
```

> All commands run from monorepo root via Turborepo.

## Known Constraints

- No CI/CD pipeline yet (manual Vercel deploys)
- Test coverage is minimal (D grade — see quality.md)
- Apple Pay requires production HTTPS + domain verification file
