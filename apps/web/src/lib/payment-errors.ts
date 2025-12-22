/**
 * Payment Error Messages
 * Story 6.6: Payment Failure Handling
 *
 * User-friendly error messages for payment failures.
 * Following UX spec: warm, encouraging tone.
 */

export const paymentErrorMessages = {
  cancelled: "No worries! Your photo is still here when you're ready.",
  payment_failed: "Payment didn't go through. Let's try again!",
  card_declined: "Your card was declined. Try a different payment method?",
  expired: "The checkout session expired. Let's start fresh!",
  generic: "Something went wrong. Let's try that again!",
} as const

export type PaymentErrorType = keyof typeof paymentErrorMessages

/**
 * Get user-friendly error message for a payment error type
 */
export function getPaymentErrorMessage(error: string | null): string | null {
  if (!error) return null
  return (
    paymentErrorMessages[error as PaymentErrorType] ??
    paymentErrorMessages.generic
  )
}
