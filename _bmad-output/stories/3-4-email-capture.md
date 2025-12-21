# Story 3.4: Email Capture

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to enter my email address**,
so that **I receive my result and can access it later**.

## Acceptance Criteria

1. **AC-1:** Email input field validates email format on blur (proper format check)
2. **AC-2:** Invalid emails show a clear, warm error message
3. **AC-3:** Email input has proper keyboard type on mobile (type="email")
4. **AC-4:** Input has aria-describedby for error messages (accessibility)
5. **AC-5:** Email is required before upload can proceed
6. **AC-6:** Email field integrates with ImageUploader flow

## Tasks / Subtasks

- [x] **Task 1: Create EmailInput component** (AC: 1, 2, 3, 4)
  - [x] Create `apps/web/src/components/upload/email-input.tsx`
  - [x] Add email validation using Zod schema
  - [x] Implement onBlur validation with warm error messages
  - [x] Use proper input type="email" for mobile keyboards
  - [x] Add aria-describedby linking to error message element
  - [x] Style with Tailwind matching design system (coral accent, 48px touch target)

- [x] **Task 2: Add email validation utilities** (AC: 1, 2)
  - [x] Create email validation schema in component or utils
  - [x] Support standard email format validation
  - [x] Return user-friendly error messages

- [x] **Task 3: Create UploadForm wrapper component** (AC: 5, 6)
  - [x] Create `apps/web/src/components/upload/upload-form.tsx`
  - [x] Combine EmailInput + ImageUploader into single form flow
  - [x] Manage combined state: email + selectedFile
  - [x] Only enable "Start" button when both email and file are valid
  - [x] Export onSubmit callback with {email, file} payload

- [x] **Task 4: Add email analytics tracking**
  - [x] Track `email_entered` with email_valid boolean
  - [x] Track `email_validation_error` with error_type
  - [x] Track `upload_form_completed` when both fields valid
  - [x] Update AnalyticsEvent type union in use-analytics.ts

- [x] **Task 5: Write comprehensive tests**
  - [x] Unit test: Valid emails pass validation
  - [x] Unit test: Invalid emails (missing @, invalid domain) show error
  - [x] Unit test: Error message displays with aria-describedby
  - [x] Unit test: Input has type="email" attribute
  - [x] Unit test: onBlur triggers validation
  - [x] Integration test: UploadForm requires both email and file

## Dev Notes

### Architecture Compliance

- **Framework:** TanStack Start + React (from Better-T-Stack)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Validation:** Zod for schema validation
- **State:** Local React state
- **Analytics:** PostHog client from `apps/web/src/lib/posthog.ts`

### Email Validation Pattern

```typescript
import { z } from "zod"

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")

// Warm, user-friendly error messages
const validateEmail = (email: string) => {
  const result = emailSchema.safeParse(email)
  if (!result.success) {
    return result.error.errors[0].message
  }
  return null
}
```

### Component Structure

```typescript
// EmailInput props
interface EmailInputProps {
  value: string
  onChange: (value: string) => void
  onValidityChange?: (isValid: boolean) => void
  error?: string | null
  disabled?: boolean
  className?: string
}

// UploadForm props
interface UploadFormProps {
  onSubmit: (data: { email: string; file: File }) => void
  disabled?: boolean
  className?: string
}
```

### Design System Alignment

Per UX specification and existing components:
- Input height: 48px minimum (touch target)
- Border radius: 12px (rounded-[12px])
- Focus ring: 3px coral (`focus-visible:ring-[3px] focus-visible:ring-coral`)
- Error text: text-red-500 or text-destructive
- Label: text-charcoal, font-medium
- Placeholder: text-warm-gray

### Error Copy (Warm Tone)

| Error | Message |
|-------|---------|
| Empty | "We'll need your email to send you the result" |
| Invalid format | "That doesn't look quite right. Please check your email." |
| Missing @ | "Please include an @ in your email address" |

### Accessibility Requirements (WCAG 2.1 AA)

- Label associated with input via htmlFor/id
- Error messages announced via aria-describedby
- Input marked aria-invalid when error present
- Focus visible with 3px ring
- Color contrast 4.5:1 minimum

### Integration Points

**With Story 3.1/3.2/3.3 (ImageUploader):**
- UploadForm wraps EmailInput + ImageUploader
- Form state manages both email and file selection
- ProcessingIndicator shows during HEIC conversion/compression

**With Story 3.5 (Upload to R2):**
- UploadForm.onSubmit provides {email, file} to parent
- Parent initiates presigned URL request with email

### File Structure

```
apps/web/src/components/upload/
├── email-input.tsx          <- NEW
├── email-input.test.tsx     <- NEW
├── upload-form.tsx          <- NEW
├── upload-form.test.tsx     <- NEW
├── image-uploader.tsx       <- EXISTING
├── processing-indicator.tsx <- EXISTING
└── index.ts                 <- UPDATE exports
```

### Analytics Events to Add

```typescript
// Add to use-analytics.ts AnalyticsEvent union type:
| { name: 'email_entered'; properties: { emailValid: boolean } }
| { name: 'email_validation_error'; properties: { errorType: string } }
| { name: 'upload_form_completed'; properties: { hasEmail: boolean; hasFile: boolean } }
```

### References

- [Source: _bmad-output/epics.md#Story 3.4] - Acceptance criteria
- [Source: _bmad-output/architecture.md#Naming Conventions] - File/component naming
- [Source: _bmad-output/ux-design-specification.md] - Design tokens
- [Source: _bmad-output/prd.md] - FR requirements

## Dev Agent Record

### Agent Model Used

Claude Opus 4

### Debug Log References

- Build validation: `bun run build` - SUCCESS (main bundle 65.32 kB gzip)
- Test run: `bun vitest run` - 132/132 tests passed
- Lint check: `bun run lint` - PASSED

### Completion Notes List

1. **Task 1 Implementation (2025-12-21):** Created EmailInput component with:
   - Zod-based email validation
   - Warm error messages matching design language
   - type="email" and inputMode="email" for mobile keyboards
   - aria-describedby linking error messages to input
   - 48px touch target with coral accent colors

2. **Task 2 Implementation (2025-12-21):** Email validation uses Zod schema with:
   - Required field check with warm message
   - Email format validation
   - User-friendly error messages

3. **Task 3 Implementation (2025-12-21):** Created UploadForm component:
   - Combines EmailInput + ImageUploader
   - Form state management for email + file
   - Submit button enabled only when both valid
   - Helper text shows what's missing
   - Supports both simple and upload-enabled modes

4. **Task 4 Implementation (2025-12-21):** Added analytics events:
   - email_entered, email_validation_error, upload_form_completed
   - Updated AnalyticsEvent type union

5. **Task 5 Implementation (2025-12-21):** Comprehensive tests:
   - 19 tests for EmailInput
   - 11 tests for UploadForm
   - All tests passing

### File List

**New Files:**
- `apps/web/src/components/upload/email-input.tsx`
- `apps/web/src/components/upload/email-input.test.tsx`
- `apps/web/src/components/upload/upload-form.tsx`
- `apps/web/src/components/upload/upload-form.test.tsx`

**Modified Files:**
- `apps/web/src/hooks/use-analytics.ts` - Added email analytics event types
- `apps/web/src/components/upload/index.ts` - Added exports

## Senior Developer Review (AI)

### Review Date: 2025-12-21

### Reviewer: Code Review Workflow

### Review Outcome: APPROVED

### Issues Found

No issues found in Story 3.4 implementation. All acceptance criteria met:
- ✅ AC-1: Email validation on blur
- ✅ AC-2: Warm error messages
- ✅ AC-3: type="email" for mobile
- ✅ AC-4: aria-describedby for accessibility
- ✅ AC-5: Email required before upload
- ✅ AC-6: Integration with ImageUploader flow

### Test Results

- 19 EmailInput tests passing
- 11 UploadForm tests passing
- All accessibility attributes verified

## Change Log

| Date | Change |
|------|--------|
| 2025-12-21 | Story created for sprint implementation |
| 2025-12-21 | Implemented all tasks, 30 tests passing |
| 2025-12-21 | **Code Review:** APPROVED - No issues found |
