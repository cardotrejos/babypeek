# BabyPeek Backend Migration: Hono → Ash/Phoenix

## Branch Strategy

```
main (production)
└── refactor/ash-phoenix-backend (base branch — this one)
    ├── refactor/ash-domain-resources      ← Ash resources + Postgres migrations
    ├── refactor/ash-gemini-worker         ← Oban worker + Gemini API integration
    ├── refactor/ash-stripe-integration    ← Stripe checkout + webhook handling
    ├── refactor/ash-r2-storage            ← R2 upload/download + signed URLs
    ├── refactor/ash-typescript-client     ← AshTypescript RPC generation + frontend swap
    ├── refactor/ash-email-notifications   ← Resend email integration
    └── refactor/ash-api-parity           ← Final route parity + integration tests
```

## Current Hono Services → Ash Mapping

| Hono Service | Ash Equivalent | Branch |
|---|---|---|
| GeminiService | `Babypeek.Portraits.Workers.GeneratePortrait` (Oban) | ash-gemini-worker |
| StripeService | `Babypeek.Portraits.Purchase` actions + webhook plug | ash-stripe-integration |
| R2Service | `Babypeek.Storage` module + ExAws.S3 | ash-r2-storage |
| WatermarkService | Pipeline step in GeneratePortrait worker | ash-gemini-worker |
| ResendService | `Babypeek.Notifiers.Email` (Ash notifier) | ash-email-notifications |
| RateLimitService | Plug middleware | ash-api-parity |
| CleanupService | Oban cron worker | ash-domain-resources |
| UploadService | `Upload` resource actions | ash-domain-resources |
| ResultService | `Result` resource actions | ash-domain-resources |
| PurchaseService | `Purchase` resource actions | ash-stripe-integration |
| DownloadService | `Download` resource actions | ash-domain-resources |
| PostHogService | Telemetry events | ash-api-parity |
| FacebookConversionsService | Server-side events via Req | ash-api-parity |

## Hono Routes → Phoenix Routes

| Hono Route | Phoenix Equivalent |
|---|---|
| GET /api/health | GET /api/health (simple plug) |
| POST /api/upload | POST /api/uploads (AshJsonApi) |
| GET /api/status/:id | GET /api/uploads/:id (AshJsonApi) |
| POST /api/process/:id | POST /api/uploads/:id/process (custom action) |
| POST /api/checkout/:id | POST /api/purchases (custom controller) |
| POST /api/webhook/stripe | POST /api/webhooks/stripe (plug) |
| GET /api/share/:id | GET /api/shares/:id (custom controller) |
| GET /api/download/:id | GET /api/downloads/:id (custom controller) |
| POST /api/retry/:id | POST /api/uploads/:id/retry (custom action) |
| POST /api/preferences | POST /api/preferences (AshJsonApi) |
| GET /api/preview/:id | GET /api/previews/:id (custom controller) |

## AshTypescript Integration

After resources are stable, run:
```bash
cd apps/server_ash && mix ash_typescript.generate
```

This generates TypeScript types + RPC client in `apps/web/src/generated/`.
The Vite frontend imports from there instead of hand-written API calls.

## Database Strategy

**Same Postgres instance, fresh schema managed by Ash migrations.**
The existing Drizzle tables stay untouched. Ash creates its own tables.
When ready for cutover:
1. Migrate data from old tables to new
2. Switch frontend to new API
3. Drop old tables

## Testing Strategy

Each branch includes tests for its domain:
- Resource unit tests (Ash actions)
- Integration tests (API endpoints)
- Worker tests (Oban jobs)

Run: `cd apps/server_ash && mix test`
