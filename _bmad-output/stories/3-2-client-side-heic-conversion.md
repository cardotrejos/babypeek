# Story 3.2: Client-Side HEIC Conversion

Status: done

## Story

As a **user**,
I want **my iPhone HEIC images converted automatically**,
so that **I don't need to worry about file formats**.

## Acceptance Criteria

1. **AC-1:** HEIC images are converted to JPEG client-side using heic2any (FR-1.3)
2. **AC-2:** heic2any is lazy-loaded to avoid bundle bloat (keep under 150KB initial bundle per NFR-1.6)
3. **AC-3:** Conversion happens before upload starts
4. **AC-4:** User sees a "Preparing image..." indicator during conversion
5. **AC-5:** Files >15MB show a warning about potential memory issues (mobile Safari concern)

## Tasks / Subtasks

- [x] **Task 1: Create image processing hook** (AC: 1, 2, 3)
  - [x] Create `apps/web/src/hooks/use-image-processor.ts`
  - [x] Implement `processImage(file: File): Promise<File>` function
  - [x] Add HEIC detection via file type AND extension (handle edge cases)
  - [x] Lazy-load heic2any using dynamic import: `const heic2any = await import('heic2any')`
  - [x] Convert HEIC to JPEG with quality 0.9 for balance of quality/size
  - [x] Return converted File object with updated name (.jpg extension)

- [x] **Task 2: Install heic2any dependency** (AC: 1)
  - [x] Run `bun add heic2any` in `apps/web`
  - [x] Add type declaration if needed (heic2any has types)
  - [x] Verify it's not included in initial bundle (check with `bun run build`)

- [x] **Task 3: Implement processing state UI** (AC: 4)
  - [x] Create `ProcessingIndicator` component in `apps/web/src/components/upload/`
  - [x] Show loading spinner with "Preparing image..." text
  - [x] Use coral color scheme per design system
  - [x] Add aria-live region for screen reader announcements

- [x] **Task 4: Add large file warning** (AC: 5)
  - [x] Check file size before conversion
  - [x] If HEIC file >15MB, show warning toast: "This is a large image. Conversion may take a moment."
  - [x] Continue with conversion (non-blocking warning)
  - [x] Track `heic_large_file_warning` analytics event

- [x] **Task 5: Integrate with ImageUploader component** (AC: 1, 3, 4)
  - [x] Modify `ImageUploader` to accept `onProcessingStart` and `onProcessingEnd` callbacks
  - [x] Call `processImage()` after file validation, before `onFileSelect`
  - [x] Show `ProcessingIndicator` during conversion
  - [x] Pass converted file (not original) to `onFileSelect`

- [x] **Task 6: Handle conversion errors gracefully** (AC: 1)
  - [x] Wrap heic2any call in try/catch
  - [x] On error, show warm error toast: "We couldn't convert that image. Please try a JPEG or PNG instead."
  - [x] Track `heic_conversion_error` analytics event with error type
  - [x] Report error to Sentry (without PII per NFR-2.6)

- [x] **Task 7: Add analytics tracking**
  - [x] Track `heic_conversion_started` with file_size
  - [x] Track `heic_conversion_completed` with duration_ms, original_size, converted_size
  - [x] Track `heic_conversion_error` with error_type

- [x] **Task 8: Write tests**
  - [x] Unit test: HEIC files trigger conversion
  - [x] Unit test: Non-HEIC files pass through unchanged
  - [x] Unit test: Lazy loading works (heic2any not in initial bundle)
  - [x] Unit test: Large file warning appears for >15MB HEIC
  - [x] Unit test: Processing indicator shows during conversion
  - [x] Unit test: Conversion errors handled gracefully
  - [x] Integration test: Full flow from HEIC select to converted file

## Dev Notes

### Architecture Compliance

- **Framework:** TanStack Start + React (from Better-T-Stack)
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** Local React state + useAnalytics hook
- **Analytics:** PostHog client from `apps/web/src/lib/posthog.ts`
- **Error Tracking:** Sentry (configured in Epic 1.6)

### Client-Side Processing Pattern (from Architecture)

Per `architecture.md#Client-Side Image Processing Pattern`:

```typescript
// hooks/use-image-processor.ts
export async function processImage(file: File): Promise<File> {
  // 1. HEIC → JPEG conversion
  if (file.type === 'image/heic' || file.name.endsWith('.heic')) {
    const heic2any = await import('heic2any')
    file = await heic2any({ blob: file, toType: 'image/jpeg' })
  }
  
  // 2. Compress if > 2MB (Story 3.3 - out of scope for this story)
  // ...
  
  return file
}
```

### heic2any Library Notes

**Library:** heic2any (https://github.com/nicco-pn/heic2any)
**Version:** Latest stable (check npm)
**Bundle Size:** ~380KB (will be lazy-loaded, not in initial bundle)

**API:**
```typescript
import heic2any from 'heic2any'

const jpegBlob = await heic2any({
  blob: heicFile,      // Input File or Blob
  toType: 'image/jpeg', // Output format
  quality: 0.9         // JPEG quality (0-1)
})
```

**Important:** Returns a Blob, need to convert back to File:
```typescript
const jpegFile = new File([jpegBlob], file.name.replace(/\.heic$/i, '.jpg'), {
  type: 'image/jpeg'
})
```

### HEIC Detection Edge Cases

HEIC files can have:
- MIME type: `image/heic` or `image/heif`
- Extension: `.heic` or `.heif` (case insensitive)
- Sometimes incorrect MIME type (especially on Windows)

**Detection Logic:**
```typescript
function isHeicFile(file: File): boolean {
  const heicMimeTypes = ['image/heic', 'image/heif']
  const heicExtensions = ['.heic', '.heif']
  
  const hasHeicMime = heicMimeTypes.includes(file.type)
  const hasHeicExt = heicExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  )
  
  return hasHeicMime || hasHeicExt
}
```

### Performance Considerations

**Memory Usage:**
- HEIC conversion is memory-intensive (loads full image into RAM)
- Mobile Safari has stricter memory limits
- Files >15MB may cause issues on older iPhones
- Use Web Worker if available (future optimization)

**Bundle Size:**
- Initial bundle target: <150KB (NFR-1.6)
- heic2any is ~380KB but lazy-loaded on demand
- Only loads when user selects a HEIC file
- Verify with `bun run build` that it's code-split

### Error Copy (Warm Tone)

Per architecture.md error handling rules:

| Error | Message |
|-------|---------|
| Conversion failed | "We couldn't convert that image. Please try a JPEG or PNG instead." |
| Memory issue | "This image is too complex to process. Please try a smaller image." |
| Generic | "Something went wrong. Let's try another image!" |

### Processing Indicator Design

Per UX design specification:

- **Position:** Overlay on ImageUploader component
- **Style:** Semi-transparent overlay with spinner
- **Copy:** "Preparing image..." (not "Converting" - keep it simple)
- **Animation:** Subtle pulse or spinner (coral color)
- **Accessibility:** aria-live="polite" for screen readers

### Project Structure Notes

**New Files:**
```
apps/web/src/
├── hooks/
│   └── use-image-processor.ts  <- New hook
├── components/
│   └── upload/
│       ├── image-uploader.tsx   <- Modify
│       ├── processing-indicator.tsx  <- New component
│       └── index.ts             <- Update exports
```

**Naming Conventions:**
- File: `use-image-processor.ts` (kebab-case)
- Hook: `useImageProcessor` (camelCase)
- Function: `processImage` (camelCase)
- Component: `ProcessingIndicator` (PascalCase)

### Dependencies on Story 3.1

This story builds on Story 3.1 (Image Picker with Format Validation):
- Uses existing `ImageUploader` component
- Adds processing step between file selection and parent callback
- Reuses validation logic (HEIC is already accepted)
- Extends analytics tracking

### Future Stories (Out of Scope)

This story does NOT include:
- Image compression (Story 3.3) - will be integrated later
- Email capture (Story 3.4)
- Actual upload to R2 (Story 3.5)
- Web Worker optimization (future enhancement)

### Testing Strategy

**Mock heic2any:**
```typescript
vi.mock('heic2any', () => ({
  default: vi.fn().mockImplementation(async ({ blob }) => {
    // Return a mock JPEG blob
    return new Blob(['mock jpeg content'], { type: 'image/jpeg' })
  })
}))
```

**Test File Creation:**
```typescript
function createMockHeicFile(sizeInMB: number = 1): File {
  const size = sizeInMB * 1024 * 1024
  const buffer = new ArrayBuffer(size)
  return new File([buffer], 'test.heic', { type: 'image/heic' })
}
```

### References

- [Source: _bmad-output/epics.md#Story 3.2] - Acceptance criteria
- [Source: _bmad-output/architecture.md#Client-Side Image Processing Pattern] - Implementation pattern
- [Source: _bmad-output/architecture.md#Naming Conventions] - File/component naming
- [Source: _bmad-output/ux-design-specification.md#Loading States] - Processing indicator design
- [Source: _bmad-output/ux-design-specification.md#ImageUploader] - Component requirements
- [Source: _bmad-output/prd.md#FR-1.3] - HEIC conversion requirement
- [Source: _bmad-output/prd.md#NFR-1.6] - Bundle size requirement
- [Source: _bmad-output/stories/3-1-image-picker-with-format-validation.md] - Previous story learnings

### Previous Story Intelligence (Story 3.1)

**Key Learnings from Story 3.1:**
1. File validation should check BOTH MIME type AND extension (HEIC edge cases)
2. Memory leaks: Always cleanup URL.createObjectURL with useEffect
3. Use `focus-visible:ring-[3px]` for 3px focus ring per design system
4. Use `rounded-[12px]` for 12px border radius per design system
5. Test file creation: Use ArrayBuffer for better performance
6. Analytics: Use camelCase properties (fileType, fileSizeMB)

**Existing Code Patterns to Follow:**
- Toast notifications via `sonner` library
- Analytics via `useAnalytics` hook from `@/hooks/use-analytics`
- Error tracking integrated with Sentry
- Design system colors: `text-coral`, `bg-coral-light`, `text-charcoal`

## Dev Agent Record

### Agent Model Used

Claude 3.5 Sonnet (claude-sonnet-4-20250514)

### Debug Log References

- Build validation: `bun run build` - SUCCESS (main bundle 65.32 kB gzip, well under 150KB)
- heic2any NOT in initial bundle - verified via grep on dist/client/assets/*.js
- Test run: `bun run test` - 82/82 tests passed (55 web + 27 api)

### Completion Notes List

1. **Task 1-2 Implementation (2024-12-21):** Created `use-image-processor.ts` hook with:
   - `isHeicFile()` helper that detects HEIC via BOTH MIME type AND extension (handles edge cases)
   - `processImage()` async function that lazy-loads heic2any and converts HEIC to JPEG (quality 0.9)
   - Returns `ProcessImageResult` with file, wasConverted flag, and size metadata
   - Installed heic2any@0.0.4 dependency

2. **Task 3 Implementation (2024-12-21):** Created `ProcessingIndicator` component with:
   - Semi-transparent overlay with Loader2 spinner
   - "Preparing image..." message (configurable via prop)
   - Coral color scheme per design system
   - Full accessibility: aria-live="polite", aria-busy="true", sr-only description

3. **Task 4 Implementation (2024-12-21):** Added large file warning:
   - 15MB threshold for HEIC files
   - Non-blocking warning toast: "This is a large image. Conversion may take a moment."
   - Tracks `heic_large_file_warning` analytics event

4. **Task 5 Implementation (2024-12-21):** Integrated with ImageUploader:
   - Added `onProcessingStart`, `onProcessingEnd`, `processImages` props
   - Shows ProcessingIndicator overlay during HEIC conversion
   - Disables input during processing (no double-uploads)
   - Passes converted file (JPEG) to onFileSelect callback

5. **Task 6 Implementation (2024-12-21):** Error handling:
   - try/catch around heic2any call
   - Warm error toast on failure
   - Sentry error reporting (without PII)
   - Rethrows to let caller handle (stops file selection flow)

6. **Task 7 Implementation (2024-12-21):** Analytics tracking:
   - Added 4 new event types to AnalyticsEvent union
   - `heic_conversion_started` with file_size
   - `heic_conversion_completed` with duration_ms, original_size, converted_size, compression_ratio
   - `heic_conversion_error` with error_type
   - `heic_large_file_warning` with file_size, file_size_mb

7. **Task 8 Implementation (2024-12-21):** Comprehensive test suite:
   - 24 tests for use-image-processor hook
   - 6 tests for ProcessingIndicator component
   - Updated 3 existing ImageUploader tests to handle async HEIC processing
   - All 55 web tests passing, 82 total across monorepo

### File List

**New Files:**
- `apps/web/src/hooks/use-image-processor.ts` - Image processing hook with HEIC conversion
- `apps/web/src/hooks/use-image-processor.test.ts` - Unit tests (26 tests)
- `apps/web/src/components/upload/processing-indicator.tsx` - Processing overlay component
- `apps/web/src/components/upload/processing-indicator.test.tsx` - Unit tests (6 tests)
- `apps/web/src/types/heic2any.d.ts` - Type definitions for heic2any library

**Modified Files:**
- `apps/web/package.json` - Added heic2any dependency
- `apps/web/src/components/upload/image-uploader.tsx` - Integrated processing hook + indicator
- `apps/web/src/components/upload/image-uploader.test.tsx` - Updated tests for async HEIC handling (29 tests)
- `apps/web/src/components/upload/index.ts` - Added ProcessingIndicator export
- `apps/web/src/hooks/use-analytics.ts` - Added HEIC-related analytics event types
- `apps/web/src/test/setup.ts` - Added Sentry mock
- `apps/web/src/test/test-utils.tsx` - Added shared file creation utilities
- `bun.lock` - Updated with heic2any dependency

## Senior Developer Review (AI)

**Review Date:** 2024-12-21
**Outcome:** Approved (after fixes)
**Reviewer:** Claude (code-review workflow)

### Issues Found: 0 Critical, 0 High, 4 Medium, 4 Low

### Action Items (All Resolved)

- [x] **[MED-1]** Add heic2any type definitions - Created `apps/web/src/types/heic2any.d.ts`
- [x] **[MED-2]** Add test for file without extension edge case - Added 2 new tests
- [x] **[MED-3]** Add integration test for ProcessingIndicator during HEIC processing - Added 4 new integration tests
- [x] **[MED-4]** Add bun.lock to File List - Updated File List section
- [x] **[LOW-1]** Fix analytics property naming consistency - Changed to camelCase (fileSize, fileSizeMB, etc.)
- [x] **[LOW-2]** Extract toast duration magic numbers to constants - Added TOAST_WARNING_DURATION and TOAST_ERROR_DURATION
- [x] **[LOW-3]** Add JSDoc example for isHeicFile - Added @example documentation
- [x] **[LOW-4]** Move test helpers to shared utils - Added to test-utils.tsx

### Fixes Applied

1. Created TypeScript declarations for heic2any library for type safety
2. Added edge case tests for HEIC files without extensions
3. Added 4 integration tests verifying ProcessingIndicator shows during HEIC conversion
4. Standardized analytics property naming to camelCase for consistency
5. Extracted magic numbers to named constants
6. Enhanced JSDoc documentation with usage examples
7. Added shared test utilities (createMockFile, createMockHeicFile, etc.)

**Test Results After Fixes:** 61 tests passing (up from 55)

## Change Log

| Date | Change |
|------|--------|
| 2024-12-21 | Initial implementation of HEIC conversion with all acceptance criteria met |
| 2024-12-21 | Added comprehensive test suite (30 new tests) |
| 2024-12-21 | Integrated ProcessingIndicator with ImageUploader |
| 2024-12-21 | Verified bundle size compliance (<150KB initial bundle) |
| 2024-12-21 | **Code Review:** Fixed 4 MEDIUM, 4 LOW issues (type safety, tests, consistency, documentation) |
