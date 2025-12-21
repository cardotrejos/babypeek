import { useState, useCallback } from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { API_BASE_URL } from "@/lib/api-config"
import { posthog, isPostHogConfigured } from "@/lib/posthog"

// Price from env or default $9.99
const PRICE_CENTS = Number(import.meta.env.VITE_PRODUCT_PRICE_CENTS) || 999
const PRICE_DISPLAY = `$${(PRICE_CENTS / 100).toFixed(2)}`

interface CheckoutButtonProps extends Omit<ButtonProps, "onClick"> {
  uploadId: string
  onCheckoutError?: (error: string) => void
}

/**
 * CheckoutButton Component
 * Story 6.1: Stripe Checkout Integration (AC-3, AC-4)
 *
 * Creates a Stripe Checkout session and redirects user to Stripe.
 * - Shows loading state during checkout creation
 * - Displays price ($9.99)
 * - Tracks purchase_started event
 */
export function CheckoutButton({
  uploadId,
  onCheckoutError,
  disabled,
  className,
  ...buttonProps
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckout = useCallback(async () => {
    if (isLoading || !uploadId) return

    setIsLoading(true)

    // Track purchase_started event (AC-5)
    if (isPostHogConfigured()) {
      posthog.capture("purchase_started", {
        uploadId,
        amount: PRICE_CENTS,
      })
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uploadId, type: "self" }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { checkoutUrl } = await response.json()

      // Track checkout_created (AC-5)
      if (isPostHogConfigured()) {
        posthog.capture("checkout_created", {
          uploadId,
          amount: PRICE_CENTS,
        })
      }

      // Redirect to Stripe Checkout (AC-3)
      window.location.href = checkoutUrl
    } catch (error) {
      console.error("[CheckoutButton] Checkout failed:", error)
      
      // Track checkout error
      if (isPostHogConfigured()) {
        posthog.capture("checkout_error", {
          uploadId,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }

      onCheckoutError?.(
        error instanceof Error ? error.message : "Unable to start checkout"
      )
      setIsLoading(false)
    }
  }, [uploadId, isLoading, onCheckoutError])

  return (
    <Button
      size="lg"
      onClick={handleCheckout}
      disabled={disabled || isLoading}
      className={className}
      data-testid="checkout-button"
      {...buttonProps}
    >
      {isLoading ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
          Processing...
        </>
      ) : (
        `Get HD Version - ${PRICE_DISPLAY}`
      )}
    </Button>
  )
}
