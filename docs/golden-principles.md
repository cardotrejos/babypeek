# Golden Principles — BabyPeek.io

Mechanical rules enforced by cleanup tasks. Violations get auto-fixed PRs.

## Privacy Principles (CRITICAL)

1. **Ultrasound images are sensitive data** — Never log, cache, or store ultrasound images outside R2. No local filesystem storage.

2. **Retention policy** — Processed images must have TTL. Auto-delete after delivery period. Never keep indefinitely.

3. **No PII in logs** — Never log user emails, payment info, or image URLs to console/Sentry.

## Architecture Principles

4. **Turborepo commands from root** — `bun dev`, `bun build`. Never cd into apps directly.

5. **Server for processing, web for UI** — All AI processing happens in `apps/server`. Web app never calls AI models directly.

6. **R2 for all file storage** — Every uploaded file goes to Cloudflare R2. No local filesystem, no S3.

## Code Principles

7. **Async processing with progress** — All image generation must be async with WebSocket/polling progress updates. Never block the request.

8. **Server components by default** — Only `"use client"` when interactivity required.

9. **No inline styles** — Tailwind only.

## Payment Principles

10. **Apple Pay requires HTTPS** — Never test Apple Pay on HTTP. Domain verification file must be served correctly.

11. **Validate payment before processing** — Confirm payment is complete before triggering AI generation. No "process now, charge later".

12. **Refund-safe** — Generated images must be downloadable for at least 30 days post-purchase.
