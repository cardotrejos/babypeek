# BabyPeek SEO Execution Plan

Saved from Ricardo's complete plan. See the full document for all 5 phases.

## Phase 1 Status — Technical SEO Foundation

- [ ] 1.1 Add prerendering to Vite SPA (vite-plugin-prerender or vite-ssg)
- [ ] 1.2 Install react-helmet-async, unique meta per page
- [ ] 1.3 Generate sitemap.xml (static, build-time)
- [ ] 1.4 Update robots.txt (uncomment sitemap, add disallows for dynamic routes)
- [ ] 1.5 Add JSON-LD schema (Organization, SoftwareApplication, HowTo, FAQ)
- [ ] 1.6 Submit to Google Search Console (Ricardo)
- [ ] 1.7 Submit to Bing Webmaster Tools (Ricardo)

## Architecture Notes

- Turborepo monorepo: `apps/web` (Vite + React), `apps/server` (Hono)
- TanStack Router (file-based routes in `apps/web/src/routes/`)
- Existing routes: `/`, `/processing/$jobId`, `/preview/$uploadId`, `/result/$resultId`, `/download/$uploadId`, `/checkout-success`, `/share/$shareId`
- No existing SEO pages (/how-it-works, /pricing, /faq, /for-clinics, /blog)
- robots.txt exists, sitemap commented out
- Meta tags hardcoded in index.html (same for all routes)
- Package manager: Bun
