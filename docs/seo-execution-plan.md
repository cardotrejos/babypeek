# BabyPeek SEO Execution Plan

Saved from Ricardo's complete plan. See the full document for all 5 phases.

## Phase 1 Status — Technical SEO Foundation

Reviewed against current code on 2026-04-22.

- [ ] 1.1 Add prerendering to Vite SPA (vite-plugin-prerender or vite-ssg) — not confirmed in this pass.
- [x] 1.2 Install react-helmet-async, unique meta per page — package is installed and route SEO metadata exists.
- [x] 1.3 Generate sitemap.xml (static, build-time) — `apps/web/public/sitemap.xml` exists.
- [x] 1.4 Update robots.txt — `apps/web/public/robots.txt` now advertises the sitemap and disallows `/api/`.
- [ ] 1.5 Add JSON-LD schema (Organization, SoftwareApplication, HowTo, FAQ) — still needs audit.
- [ ] 1.6 Submit to Google Search Console (Ricardo) — requires account access.
- [ ] 1.7 Submit to Bing Webmaster Tools (Ricardo) — requires account access.

## Architecture Notes

- Turborepo monorepo: `apps/web` (Vite + React), `apps/server` (Hono)
- TanStack Router (file-based routes in `apps/web/src/routes/`)
- Existing app routes include `/`, `/processing/$jobId`, `/preview/$uploadId`, `/result/$resultId`, `/download/$uploadId`, `/checkout-success`, and `/share/$shareId`.
- SEO/marketing routes now exist for `/how-it-works`, `/pricing`, `/faq`, `/for-clinics`, `/blog`, and comparison pages.
- `robots.txt` exists and now points crawlers to the sitemap.
- Meta tags should continue to be reviewed per route as pages change.
- Package manager: Bun
