import { useCallback, useId, useState } from "react"
import { z } from "zod"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAnalytics } from "@/hooks/use-analytics"
import { cn } from "@/lib/utils"

// =============================================================================
// Constants & Validation
// =============================================================================

const emailSchema = z
  .string()
  .min(1, "We'll need your email to send you the result")
  .email("That doesn't look quite right. Please check your email.")

// =============================================================================
// Types
// =============================================================================

export interface EmailInputProps {
  /** Current email value */
  value: string
  /** Called when email value changes */
  onChange: (value: string) => void
  /** Called when validity changes */
  onValidityChange?: (isValid: boolean) => void
  /** External error message (overrides internal validation) */
  error?: string | null
  /** Whether the input is disabled */
  disabled?: boolean
  /** Optional className for the container */
  className?: string
  /** Placeholder text */
  placeholder?: string
}

// =============================================================================
// Component
// =============================================================================

export function EmailInput({
  value,
  onChange,
  onValidityChange,
  error: externalError,
  disabled = false,
  className,
  placeholder = "your@email.com",
}: EmailInputProps) {
  const [internalError, setInternalError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const { trackEvent } = useAnalytics()
  
  // Generate unique IDs for accessibility
  const inputId = useId()
  const errorId = useId()

  // Use external error if provided, otherwise internal
  const displayError = externalError ?? (touched ? internalError : null)
  const hasError = !!displayError

  const validateEmail = useCallback(
    (email: string): string | null => {
      const result = emailSchema.safeParse(email)
      if (!result.success) {
        const firstIssue = result.error.issues[0]
        return firstIssue?.message ?? "Please enter a valid email address"
      }
      return null
    },
    []
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      onChange(newValue)

      // Clear error while typing (will re-validate on blur)
      if (touched && internalError) {
        const error = validateEmail(newValue)
        setInternalError(error)
        onValidityChange?.(!error)
      }
    },
    [onChange, touched, internalError, validateEmail, onValidityChange]
  )

  const handleBlur = useCallback(() => {
    setTouched(true)
    const error = validateEmail(value)
    setInternalError(error)
    onValidityChange?.(!error)

    // Track analytics
    if (error) {
      trackEvent("email_validation_error", {
        errorType: error.includes("@") ? "invalid_format" : "missing_value",
      })
    } else {
      trackEvent("email_entered", { emailValid: true })
    }
  }, [value, validateEmail, onValidityChange, trackEvent])

  return (
    <div className={cn("w-full", className)}>
      <Label
        htmlFor={inputId}
        className="mb-2 text-sm font-medium text-charcoal"
      >
        Email address
      </Label>
      <Input
        id={inputId}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={cn(
          // Base styles
          "h-12 rounded-[12px] border-2 px-4 text-base",
          // Focus styles
          "focus-visible:ring-[3px] focus-visible:ring-coral focus-visible:border-coral",
          // Error styles
          hasError && "border-red-500 focus-visible:ring-red-500/30",
          // Normal styles
          !hasError && "border-warm-gray/30 hover:border-coral/50"
        )}
      />
      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-sm text-red-500"
        >
          {displayError}
        </p>
      )}
    </div>
  )
}
