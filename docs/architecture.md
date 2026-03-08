# Architecture — BabyPeek.io

> Turn 4D ultrasound images into beautiful AI-generated baby portraits.

## Overview

BabyPeek is a Turborepo monorepo built with a TanStack Router SPA frontend (React + Vite), a Hono API server, Drizzle ORM, PostgreSQL, and Bun.

## Monorepo Structure

```
babypeek/
├── apps/
│   ├── web/          # Frontend (React + TanStack Router SPA, port 3001)
│   └── server/       # HTTP API server entry point (Hono, port 3000)
├── packages/
│   ├── api/          # Business logic: routes, workflows, middleware
│   ├── db/           # Database schema & queries (Drizzle + PostgreSQL)
│   └── config/       # Shared TypeScript base config (`tsconfig.base.json`)
```

## App Layers

### `apps/web` — Frontend
- React + TanStack Router SPA (client-side rendering via `createRoot`)
- Built with Vite
- TailwindCSS + shadcn/ui
- Calls `apps/server` API over HTTP
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

### `packages/config` — Shared Config
- Shared TypeScript configuration only (`tsconfig.base.json`)

## Request Flow

```
User uploads ultrasound
  → POST /api/storage/upload-url        (signed upload URL)
  → Upload direct to R2
  → POST /api/upload/:uploadId/confirm  (confirm upload completed)
  → POST /api/process                    (trigger generation)
  → Async workflow (FAL.ai → R2 output storage)
  → GET /api/status/:id                  (polling for progress/completion)
  → GET /api/download/:id                (retrieve results)
```

## External Services

| Service | Purpose |
|---------|---------|
| **Cloudflare R2** | All file storage (input ultrasounds + generated portraits) |
| **FAL.ai** | AI image generation model |
| **PostgreSQL** | Persistent data (Coolify-managed PostgreSQL on Hetzner) |
| **Better Auth** | Authentication (sessions, OAuth) |
| **Stripe** | Payment processing / checkout |
| **Resend** | Transactional email delivery |
| **PostHog** | Product analytics and event tracking |
| **Meta Conversions API** | Conversion tracking for ad attribution |
| **Sentry** | Error tracking |

## Privacy Architecture

Ultrasound images are sensitive. Key constraints:
- **No local filesystem** — all files go to R2 exclusively
- **TTL on all uploads** — images auto-delete after delivery window
- **No PII in logs** — emails, image URLs, payment data never logged
- Upload URLs are signed and short-lived

## Deployment

- Frontend (`babypeek.io`) and backend (`api.babypeek.io`) are two independent Vercel projects deployed separately
- Frontend proxy: `apps/web/vercel.json` rewrites `/api/*` to `https://api.babypeek.io/api/:path*`
- Database: Coolify-managed PostgreSQL on Hetzner (see team infra notes)
- R2 bucket: Cloudflare (region: auto)
- Cleanup cron: `/api/cron/cleanup` runs nightly at 03:00 UTC (Vercel Cron)

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
