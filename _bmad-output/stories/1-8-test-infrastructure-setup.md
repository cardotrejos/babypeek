# Story 1.8: Test Infrastructure Setup

**Epic:** 1 - Foundation & Observability  
**Status:** done  
**Created:** 2024-12-21  
**Priority:** 🟢 P2 (Enhancement)

---

## User Story

As a **developer**,  
I want **test infrastructure configured for unit and E2E tests**,  
So that **I can write and run tests with confidence**.

---

## Acceptance Criteria

| # | Criterion | Test |
|---|-----------|------|
| AC1 | Vitest configured for unit tests | `bun run test` runs without errors |
| AC2 | Playwright configured for E2E tests | `bun run test:e2e` runs without errors |
| AC3 | Unit tests run in CI pipeline | PR triggers unit tests in GitHub Actions |
| AC4 | E2E tests run in CI pipeline | PR triggers E2E tests in GitHub Actions |
| AC5 | Coverage reporting configured | Coverage report generated after test run |
| AC6 | Test utilities available | Common test helpers exported from test utils |

---

## Tasks / Subtasks

- [x] **Task 1: Configure Vitest for Unit Tests** (AC: 1, 5)
  - [x] 1.1 Install Vitest and dependencies in root
  - [x] 1.2 Create `vitest.config.ts` with workspace support
  - [x] 1.3 Configure coverage with `@vitest/coverage-v8`
  - [x] 1.4 Add test scripts to root `package.json`
  - [x] 1.5 Create sample unit test to verify setup

- [x] **Task 2: Configure Vitest for API Package** (AC: 1, 6)
  - [x] 2.1 Create `packages/api/vitest.config.ts`
  - [x] 2.2 Configure Effect test utilities
  - [x] 2.3 Create test helpers for mocking services
  - [x] 2.4 Add sample service test

- [x] **Task 3: Configure Vitest for Web App** (AC: 1, 6)
  - [x] 3.1 Install `@testing-library/react` and `jsdom`
  - [x] 3.2 Create `apps/web/vitest.config.ts`
  - [x] 3.3 Configure happy-dom or jsdom environment
  - [x] 3.4 Create test utilities for React components
  - [x] 3.5 Add sample component test

- [x] **Task 4: Configure Playwright for E2E** (AC: 2)
  - [x] 4.1 Install Playwright in root
  - [x] 4.2 Create `playwright.config.ts`
  - [x] 4.3 Configure base URL and browsers
  - [x] 4.4 Add E2E test scripts to `package.json`
  - [x] 4.5 Create sample E2E test for landing page

- [x] **Task 5: Update CI Pipeline** (AC: 3, 4)
  - [x] 5.1 Add unit test job to `.github/workflows/ci.yml`
  - [x] 5.2 Add E2E test job with Playwright setup
  - [x] 5.3 Configure test caching for faster runs
  - [x] 5.4 Upload coverage reports as artifacts

- [x] **Task 6: Create Test Utilities** (AC: 6)
  - [x] 6.1 Create `packages/api/src/test/setup.ts` for API tests
  - [x] 6.2 Create `apps/web/src/test/setup.ts` for React tests
  - [x] 6.3 Create mock factories for common objects
  - [x] 6.4 Document test patterns in comments

---

## Dev Notes

### Architecture Requirements

**From `architecture.md`:**
- Co-locate tests with source files (`*.test.ts`)
- Use Effect Services pattern - tests should mock service layers
- Use `@/` alias for app imports

### Vitest Workspace Configuration

**Root Config (`vitest.config.ts`):**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '**/dist/**',
        '**/*.config.*',
        '**/test/**',
      ],
    },
  },
})
```

**Workspace Config (`vitest.workspace.ts`):**

```typescript
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/api/vitest.config.ts',
  'apps/web/vitest.config.ts',
])
```

### API Package Test Config

**Config (`packages/api/vitest.config.ts`):**

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      reportsDirectory: './coverage',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Effect Test Helpers (`packages/api/src/test/effect-helpers.ts`):**

```typescript
import { Effect, Layer, Context } from 'effect'

// Run Effect in test context with optional service layers
export const runTest = <A, E>(
  effect: Effect.Effect<A, E, never>,
  layer?: Layer.Layer<never, never, any>
): Promise<A> => {
  const program = layer ? Effect.provide(effect, layer) : effect
  return Effect.runPromise(program)
}

// Run Effect and expect it to fail, returns error for assertions
export const runTestExpectFail = <A, E>(
  effect: Effect.Effect<A, E, never>,
  layer?: Layer.Layer<never, never, any>
): Promise<E> => {
  const program = layer ? Effect.provide(effect, layer) : effect
  return Effect.runPromise(Effect.flip(program))
}

// Create mock service layer
export const mockService = <Id, S>(
  tag: Context.Tag<Id, S>,
  impl: S
): Layer.Layer<Id> => Layer.succeed(tag, impl)
```

### Web App Test Config

**Config (`apps/web/vitest.config.ts`):**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**React Test Setup (`apps/web/src/test/setup.ts`):**

```typescript
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})
```

**React Test Utils (`apps/web/src/test/test-utils.tsx`):**

```typescript
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactElement } from 'react'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const queryClient = createTestQueryClient()
  
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
    ...options,
  })
}

export * from '@testing-library/react'
export { renderWithProviders as render }
```

### Playwright Configuration

**Config (`playwright.config.ts`):**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### CI Pipeline Updates

**Add to `.github/workflows/ci.yml`:**

```yaml
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run test
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bunx playwright install --with-deps
      - run: bun run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Package.json Scripts

**Root `package.json`:**

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### Sample Tests

**API Unit Test (`packages/api/src/lib/errors.test.ts`):**

```typescript
import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'
import { NotFoundError, ValidationError } from './errors'

describe('Typed Errors', () => {
  it('creates error with correct tag', () => {
    const error = new NotFoundError({ resource: 'upload', id: 'abc123' })
    expect(error._tag).toBe('NotFoundError')
    expect(error.resource).toBe('upload')
  })

  it('can be caught by tag in Effect', async () => {
    const program = Effect.fail(
      new NotFoundError({ resource: 'result', id: 'xyz' })
    ).pipe(
      Effect.catchTag('NotFoundError', (e) =>
        Effect.succeed(`Caught: ${e.resource}/${e.id}`)
      )
    )
    const result = await Effect.runPromise(program)
    expect(result).toBe('Caught: result/xyz')
  })
})
```

**React Component Test (`apps/web/src/components/ui/button.test.tsx`):**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { Button } from './button'

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })
})
```

**E2E Test (`e2e/landing.spec.ts`):**

```typescript
import { test, expect } from '@playwright/test'

test('landing page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/3d-ultra/)
})
```

### Dependencies

```bash
# Root - test runners
bun add -D vitest @vitest/coverage-v8 @vitest/ui
bun add -D @playwright/test

# Web - React testing
cd apps/web
bun add -D @testing-library/react @testing-library/jest-dom jsdom

# API - Effect testing (if needed)
cd packages/api
bun add -D @effect/vitest
```

### File Locations

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Root Vitest config |
| `vitest.workspace.ts` | Workspace config |
| `playwright.config.ts` | E2E test config |
| `packages/api/vitest.config.ts` | API package tests |
| `packages/api/src/test/effect-helpers.ts` | Effect test utilities |
| `apps/web/vitest.config.ts` | Web app tests |
| `apps/web/src/test/setup.ts` | React test setup |
| `apps/web/src/test/test-utils.tsx` | React test utilities |
| `.github/workflows/ci.yml` | CI pipeline updates |
| `e2e/` | E2E test directory |

### Previous Story Learnings

**From Story 1.7 (CI/CD):**
- GitHub Actions already configured
- Jobs run on `ubuntu-latest`
- Bun setup via `oven-sh/setup-bun@v2`

**From Story 1.1:**
- Turborepo monorepo structure
- `@/` path alias configured

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4

### Debug Log References

N/A

### Completion Notes List

- Installed vitest@4.0.16 and @vitest/coverage-v8 at root and packages
- Created vitest.config.ts at root with coverage configuration
- Created vitest.workspace.ts for monorepo workspace support
- Configured turbo.json with test and test:coverage tasks
- Added test scripts to root package.json (test, test:coverage, test:e2e, test:e2e:ui)
- Created packages/api/vitest.config.ts with Effect-compatible setup
- Created packages/api/src/test/setup.ts for API test setup
- Created packages/api/src/test/effect-helpers.ts with runTest, mockService utilities
- Created packages/api/src/test/factories.ts with mock data factories
- Created packages/api/src/lib/errors.test.ts - 9 tests for typed errors
- Updated apps/web/vitest.config.ts with explicit path alias resolution
- Created apps/web/src/test/test-utils.tsx with render wrapper and providers
- Existing web tests (25) continue to pass (image-uploader.test.tsx)
- Installed @playwright/test@1.57.0 for E2E testing
- Created playwright.config.ts with chromium and Mobile Safari projects
- Created e2e/landing.spec.ts with 5 E2E tests
- Updated .github/workflows/ci.yml with:
  - lint-and-type job
  - test job with coverage upload
  - e2e job with Playwright
  - build job dependent on lint and test
- Total: 34 unit tests passing (25 web + 9 API)

**Review Fixes (2024-12-21):**
- Fixed playwright.config.ts baseURL from port 3000 to 3001 (correct dev port)
- Fixed e2e/landing.spec.ts to handle multiple CTA buttons with `.first()`
- Updated packages/api/vitest.config.ts with explicit coverage include paths
- Fixed story Dev Notes sample test from env.test.ts to errors.test.ts
- Fixed Effect helpers example to match actual implementation
- All 5 E2E tests now passing, 34 unit tests passing

### File List

| File | Action |
|------|--------|
| `vitest.config.ts` | Created |
| `vitest.workspace.ts` | Created |
| `playwright.config.ts` | Created |
| `package.json` | Modified |
| `turbo.json` | Modified |
| `packages/api/vitest.config.ts` | Created |
| `packages/api/package.json` | Modified |
| `packages/api/src/test/setup.ts` | Created |
| `packages/api/src/test/effect-helpers.ts` | Created |
| `packages/api/src/test/factories.ts` | Created |
| `packages/api/src/lib/errors.test.ts` | Created |
| `apps/web/vitest.config.ts` | Modified |
| `apps/web/package.json` | Modified |
| `apps/web/src/test/test-utils.tsx` | Created |
| `.github/workflows/ci.yml` | Modified |
| `e2e/landing.spec.ts` | Created |

---

## Change Log

| Date | Change |
|------|--------|
| 2024-12-21 | Story created with comprehensive context |
| 2024-12-21 | Implementation complete - all tasks done, 34 tests passing |
| 2024-12-21 | Code review: Fixed Playwright port config, E2E selectors, API coverage config. 5 E2E + 34 unit tests passing. Status → done |

---

## References

- [Source: architecture.md#All-AI-Agents-MUST] - Co-locate tests with source files
- [Source: epics.md#Story-1.8] - Acceptance criteria
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Library Docs](https://testing-library.com/)
