# BabyPeek Code Review Report

Date: 2026-02-08
Branch: `feat/conversion-fixes`
Reviewer: Codex (Senior Code Review)

## Scope Reviewed

- `docs/comprehensive-marketing-analysis-2026-02-08.md`
- `docs/conversion-fixes-implementation-guide.md`
- Frontend focus:
  - `apps/web/src/components/upload/`
  - `apps/web/src/components/experiments/MobileStickyCTA.tsx`
  - `apps/web/src/components/processing/ProcessingScreen.tsx`
  - `apps/web/src/components/reveal/`
  - `apps/web/src/components/payment/`
  - `apps/web/src/components/landing/`
  - Route integration: `apps/web/src/routes/index.tsx`, `apps/web/src/routes/processing.$jobId.tsx`, `apps/web/src/routes/result.$resultId.tsx`, `apps/web/src/routes/preview.$uploadId.tsx`
- Backend focus:
  - `apps/server/`
  - `packages/api/` routes/services/workflow

## Executive Summary

The branch resolves several major conversion blockers (mobile CTA overlap, first-result handoff, upsell friction, and HD preview leakage for unpaid users). However, there are still high-impact analytics and UX gaps that can hide the real cause of low conversion and make optimization decisions unreliable.

Most important open risks:

1. Prompt selection/testing is currently non-functional in workflow mode.
2. Upload-start analytics are double-counted and inconsistent across events.
3. Mobile users can still see competing primary CTAs in the upload section.

---

## Findings (Open)

### HIGH

### 1) Prompt selector is ignored by the active workflow path

- **Evidence:**
  - `packages/api/src/workflows/process-image-simple.ts:698` explicitly notes input `promptVersion` is ignored.
  - `packages/api/src/routes/process-workflow.ts:77` to `packages/api/src/routes/process-workflow.ts:82` passes `promptVersion` into workflow input.
  - `apps/web/src/routes/processing.$jobId.tsx:297` to `apps/web/src/routes/processing.$jobId.tsx:308` sends a selected prompt from UI.
- **Impact:** Experimentation and prompt-level diagnostics are misleading because UI/route selection does not control generation behavior.
- **Suggested fix:**
  - Either remove prompt selection UI in production paths, or implement workflow support:
    - if `promptVersion` provided: generate that variant first (or exclusively in test mode),
    - otherwise generate full variant set.

### 2) `upload_started` is tracked twice with different semantics

- **Evidence:**
  - `apps/web/src/components/upload/image-uploader.tsx:135` tracks `upload_started` at file selection time.
  - `apps/web/src/hooks/use-upload.ts:331` tracks `upload_started` again at actual upload start.
- **Impact:** Funnel instrumentation is inflated/noisy at the exact step that marketing analysis depends on.
- **Suggested fix:**
  - Keep `upload_started` for one canonical moment (actual network upload start).
  - Rename file-selection event to `upload_file_selected` only (already tracked at `apps/web/src/components/upload/image-uploader.tsx:182`).

### 3) Mobile still presents competing primary CTAs near upload interaction

- **Evidence:**
  - Sticky CTA remains visible until form submit: `apps/web/src/components/experiments/MobileStickyCTA.tsx:52` to `apps/web/src/components/experiments/MobileStickyCTA.tsx:55`.
  - Sticky CTA only hides after `babypeek:upload_started`: `apps/web/src/components/experiments/MobileStickyCTA.tsx:47` and `apps/web/src/components/upload/upload-form.tsx:98`.
- **Impact:** During the most critical conversion moment (email + file selected), users still see both the sticky “See Your Baby Now” and the form submit CTA.
- **Suggested fix:**
  - Hide sticky CTA when upload section is in view (IntersectionObserver), or after file selection / email valid state.
  - Reserve sticky CTA for discovery/navigation, not final submission stage.

### MEDIUM

### 4) Legacy `/api/process` path is incompatible with strict stage transitions

- **Evidence:**
  - `packages/api/src/routes/process.ts:159` sets stage to `generating`.
  - `packages/api/src/routes/process.ts:173` sets `generating` again in loop.
  - `packages/api/src/services/UploadService.ts:42` to `packages/api/src/services/UploadService.ts:43` only allows forward transitions.
- **Impact:** If this route is re-enabled, it can fail on stage update with `INVALID_TRANSITION`.
- **Suggested fix:**
  - Remove dead route, or align it with `first_ready` + monotonic stage sequencing.
  - Add regression test asserting stage transition behavior for any mounted processing route.

### 5) Upload cleanup endpoint checks token presence but not ownership

- **Evidence:**
  - Token required: `packages/api/src/routes/upload.ts:291` to `packages/api/src/routes/upload.ts:295`.
  - No token-to-upload ownership verification before deletion logic starts at `packages/api/src/routes/upload.ts:298`.
- **Impact:** A valid token can attempt deletion for any known `uploadId`.
- **Suggested fix:**
  - Lookup upload by `uploadId`, compare `sessionToken`, return 401 on mismatch.

### 6) `sticky_cta_shown` can be over-counted on viewport/device changes

- **Evidence:**
  - Tracking runs inside effect keyed by `isMobile`: `apps/web/src/components/experiments/MobileStickyCTA.tsx:18` to `apps/web/src/components/experiments/MobileStickyCTA.tsx:38`.
- **Impact:** Inflated impression counts reduce experiment quality.
- **Suggested fix:**
  - Use a `hasTrackedShownRef` guard so event fires once per page session.

### 7) Inconsistent PostHog property naming fragments analytics

- **Evidence:**
  - `apps/web/src/components/payment/CheckoutButton.tsx:46`, `apps/web/src/components/payment/CheckoutButton.tsx:86`, `apps/web/src/components/payment/CheckoutButton.tsx:106` use `uploadId`.
  - Most other events use `upload_id` (example: `apps/web/src/routes/result.$resultId.tsx:137`).
- **Impact:** Dashboards/funnels require special-case mapping and are prone to silent query errors.
- **Suggested fix:**
  - Standardize to `upload_id` and migrate old queries/events with aliasing in PostHog.

### 8) Public preview endpoint has verbose production logging

- **Evidence:**
  - `packages/api/src/routes/preview.ts:84`, `packages/api/src/routes/preview.ts:91`, `packages/api/src/routes/preview.ts:118`, `packages/api/src/routes/preview.ts:136`, `packages/api/src/routes/preview.ts:140`.
- **Impact:** Log noise and unnecessary exposure of internal identifiers in prod logs.
- **Suggested fix:**
  - Gate logs to non-production or replace with structured debug logger + sampling.

### 9) `first_ready` stage missing from helper labels

- **Evidence:**
  - `apps/web/src/hooks/use-status.ts:267` to `apps/web/src/hooks/use-status.ts:283` does not include `first_ready` in `getStageLabel` switch.
- **Impact:** Any UI using this helper may show generic processing text during the key first-preview stage.
- **Suggested fix:**
  - Add explicit `first_ready` label/emojis aligned with “first result ready” state.

### LOW

### 10) Canvas preview error path can silently show blank tile

- **Evidence:**
  - `apps/web/src/components/reveal/ResultsGallery.tsx:67` sets cross-origin image loading.
  - `apps/web/src/components/reveal/ResultsGallery.tsx:93` to `apps/web/src/components/reveal/ResultsGallery.tsx:96` calls `onLoad` on error, clearing skeleton state.
- **Impact:** On CORS/image load failures, users can get empty thumbnail with no clear error affordance.
- **Suggested fix:**
  - Track load error state and keep skeleton/fallback badge (“Image unavailable, tap to retry”).

---

## Issues Fixed In This Branch

### Conversion and UX

- **Fixed mobile fixed-CTA overlap with sticky CTA**
  - `apps/web/src/components/landing/landing-layout.tsx:43` (desktop-only fixed CTA via `hidden sm:block`).
- **Sticky CTA now hides on upload start event**
  - Listener: `apps/web/src/components/experiments/MobileStickyCTA.tsx:47`
  - Dispatch: `apps/web/src/components/upload/upload-form.tsx:98`
- **Primary submit copy improved for clarity**
  - `apps/web/src/components/upload/upload-form.tsx:178` (“See Your Baby”).

### Processing speed / first result

- **First-ready stage emitted from workflow**
  - `packages/api/src/workflows/process-image-simple.ts:756`
- **Stage enum support added**
  - `packages/db/src/schema/index.ts:12`
  - `packages/api/src/services/UploadService.ts:23`

### Paywall protection

- **Removed unpaid HD fallback in status endpoint**
  - `packages/api/src/routes/status.ts:146` and `packages/api/src/routes/status.ts:157`
- **Preview route only allows HD fallback for paid users**
  - `packages/api/src/routes/preview.ts:116`
- **Client gallery no longer falls back to HD for unpaid users**
  - `apps/web/src/components/reveal/ResultsGallery.tsx:206` to `apps/web/src/components/reveal/ResultsGallery.tsx:211`

### Checkout flow friction

- **Upsell modal now launches checkout directly (no extra button)**
  - `apps/web/src/components/reveal/UpsellModal.tsx:131`
  - `apps/web/src/routes/result.$resultId.tsx:513`

### Prompt propagation

- **Processing route now sends URL-selected prompt correctly**
  - `apps/web/src/routes/processing.$jobId.tsx:297`

---

## Mobile UX Notes

- Improved:
  - Desktop fixed bottom CTA no longer overlays mobile flow.
  - Upload CTA text is clearer.
- Still problematic:
  - Sticky CTA is not context-aware and can still compete with the final form submit CTA while users are already in the upload section.

---

## Verification Run

- `bun run check` ✅ passed (warnings only)
- `bun run check-types` ✅ passed
- `bun run test` ✅ passed
