# Story 1.7: Configure CI/CD Pipeline

**Epic:** 1 - Foundation & Observability  
**Status:** done  
**Created:** 2024-12-20  
**Priority:** Medium (Automation - enables continuous deployment)

---

## User Story

As a **developer**,  
I want **GitHub Actions deploying to Vercel**,  
So that **code is automatically deployed on merge to main**.

---

## Acceptance Criteria

| # | Criterion | Test |
|---|-----------|------|
| AC1 | PR to main triggers CI checks | Open PR → GitHub Actions runs |
| AC2 | Vercel deploys to production on merge to main | Merge PR → production updated |
| AC3 | Preview deployments created for PRs | Open PR → preview URL generated |
| AC4 | Build failures block deployment | TypeScript error → deploy blocked |
| AC5 | Environment variables synced from Vercel | Vercel env vars available in builds |

---

## Tasks / Subtasks

- [ ] **Task 1: Connect Vercel to GitHub** (AC: 2, 3, 5) - Manual
  - [ ] 1.1 Create Vercel project (manual via dashboard)
  - [ ] 1.2 Connect GitHub repository to Vercel
  - [ ] 1.3 Configure production branch (main)
  - [ ] 1.4 Enable preview deployments for PRs
  - [ ] 1.5 Set up environment variables in Vercel

- [x] **Task 2: Create GitHub Actions CI Workflow** (AC: 1, 4)
  - [x] 2.1 Create `.github/workflows/ci.yml`
  - [x] 2.2 Add TypeScript type checking step
  - [x] 2.3 Add linting step (continue-on-error)
  - [x] 2.4 Add build step with dummy env vars
  - [x] 2.5 Configure caching for Bun dependencies

- [ ] **Task 3: Configure Branch Protection** (AC: 4) - Manual
  - [ ] 3.1 Enable branch protection on main (manual via GitHub)
  - [ ] 3.2 Require CI checks to pass before merge
  - [ ] 3.3 Require PR reviews (optional)

- [x] **Task 4: Configure Vercel Build Settings** (AC: 2, 4)
  - [x] 4.1 Create vercel.json with build command
  - [x] 4.2 Configure output directory (apps/web/dist)
  - [x] 4.3 Configure function timeout (60s)
  - [x] 4.4 Add security headers

- [x] **Task 5: Verify Pipeline** (AC: 1-5)
  - [x] 5.1 TypeScript compilation verified
  - [x] 5.2 CI workflow file created
  - [x] 5.3 Vercel config created
  - [ ] 5.4 Full E2E test after Vercel connection (manual)

---

## Dev Notes

### Architecture Requirements

**From `architecture.md`:**

- Deployment: Vercel Git integration
- Auto-deploy main → production
- PR deploys → preview
- Vercel Pro hosting (60s function timeout)

### GitHub Actions CI Workflow

**`.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  ci:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Type check
        run: bun run check-types

      - name: Lint
        run: bun run lint
        continue-on-error: true  # Don't fail on lint for now

      - name: Build
        run: bun run build

      # Future: Add test step when tests exist
      # - name: Test
      #   run: bun run test
```

### Vercel Configuration

**`vercel.json` (project root):**

```json
{
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "framework": null,
  "functions": {
    "apps/server/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

### Environment Variables in Vercel

**Required for Production:**
```
DATABASE_URL=postgresql://...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
CORS_ORIGIN=https://3d-ultra.com
NODE_ENV=production
```

**Required for Preview:**
```
DATABASE_URL=postgresql://...-preview  # Branch database
CORS_ORIGIN=https://*.vercel.app
NODE_ENV=preview
```

### Turborepo Remote Caching (Optional)

**For faster CI builds:**

```bash
# In GitHub repository secrets:
TURBO_TOKEN=xxx
TURBO_TEAM=your-team
```

### Branch Protection Rules

**Recommended settings for `main`:**
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass (select CI workflow)
- ✅ Require branches to be up to date
- ❌ Include administrators (allow admin override)

### Vercel Project Settings

**Build & Development Settings:**
- Framework Preset: Other
- Build Command: `bun run build`
- Output Directory: `apps/web/dist`
- Install Command: `bun install`

**Root Directory:** (leave empty for monorepo)

**Node.js Version:** 20.x

### Previous Story Learnings

**From Story 1.4:**
- Environment variables defined in env.ts
- `.env.example` documents all required variables

### File Locations

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | NEW: CI pipeline |
| `vercel.json` | NEW: Vercel configuration |

### Testing Notes

**Test Pipeline:**
1. Create branch `test/ci-pipeline`
2. Make small change (add comment)
3. Open PR to main
4. Verify GitHub Actions runs
5. Verify Vercel preview deployment
6. Merge PR
7. Verify production deployment

**Test Failure Case:**
1. Introduce TypeScript error
2. Push to PR
3. Verify CI fails
4. Verify merge is blocked

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4

### Debug Log References

N/A

### Completion Notes List

- Created .github/workflows/ci.yml with type check, lint, build steps
- Configured Bun dependency caching in GitHub Actions
- Created vercel.json with monorepo build settings
- Configured 60s function timeout for server functions
- Added security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- Vercel connection and branch protection require manual setup
- All TypeScript types compile cleanly

### File List

| File | Action |
|------|--------|
| `.github/workflows/ci.yml` | Created |
| `vercel.json` | Created |

---

## Change Log

| Date | Change |
|------|--------|
| 2024-12-20 | Story created with comprehensive context |

---

## References

- [Source: architecture.md#Infrastructure] - Vercel deployment
- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
- [GitHub Actions for Bun](https://bun.sh/guides/runtime/cicd)
- [Turborepo Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
