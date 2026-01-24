import { useState, useCallback, type ComponentPropsWithoutRef } from "react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api-config";
import { posthog, isPostHogConfigured } from "@/lib/posthog";
import { trackFBInitiateCheckout } from "@/lib/facebook-pixel";
import { getSession } from "@/lib/session";
import { PRICE_CENTS, PRICE_DISPLAY } from "@/lib/pricing";

interface CheckoutButtonProps extends Omit<ComponentPropsWithoutRef<typeof Button>, "onClick"> {
  uploadId: string;
  /** Retry count for analytics (Story 6.6) */
  retryCount?: number;
  /** Callback when checkout starts - use to increment retry count */
  onCheckoutStart?: () => void;
  onCheckoutError?: (error: string) => void;
}

/**
 * CheckoutButton Component
 * Story 6.1: Stripe Checkout Integration (AC-3, AC-4)
 *
 * Creates a Stripe Checkout session and redirects user to Stripe.
 * - Shows loading state during checkout creation
 * - Displays price (env-configured)
 * - Tracks purchase_started event
 */
export function CheckoutButton({
  uploadId,
  retryCount = 0,
  onCheckoutStart,
  onCheckoutError,
  disabled,
  className,
  ...buttonProps
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = useCallback(async () => {
    if (isLoading || !uploadId) return;

    setIsLoading(true);
    onCheckoutStart?.();

    // Track purchase_started event (AC-5, Story 6.6 retry tracking)
    if (isPostHogConfigured()) {
      posthog.capture("purchase_started", {
        uploadId,
        amount: PRICE_CENTS,
        retry_count: retryCount,
      });
    }

    // Facebook Pixel: InitiateCheckout event
    trackFBInitiateCheckout({
      resultId: uploadId,
      uploadId,
      value: PRICE_CENTS / 100,
      retryCount,
    });

    try {
      // Get session token for authentication
      const sessionToken = getSession(uploadId);
      if (!sessionToken) {
        throw new Error("Session expired. Please start a new upload.");
      }

      const response = await fetch(`${API_BASE_URL}/api/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
        body: JSON.stringify({ uploadId, type: "self" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { checkoutUrl } = await response.json();

      // Track checkout_created (AC-5)
      if (isPostHogConfigured()) {
        posthog.capture("checkout_created", {
          uploadId,
          amount: PRICE_CENTS,
        });
      }

      // Store uploadId for checkout-success page (Story 7.3)
      try {
        localStorage.setItem("babypeek-last-checkout-upload", uploadId);
      } catch {
        // localStorage may not be available
      }

      // Redirect to Stripe Checkout (AC-3)
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("[CheckoutButton] Checkout failed:", error);

      // Track checkout error
      if (isPostHogConfigured()) {
        posthog.capture("checkout_error", {
          uploadId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      onCheckoutError?.(error instanceof Error ? error.message : "Unable to start checkout");
      setIsLoading(false);
    }
  }, [uploadId, isLoading, retryCount, onCheckoutStart, onCheckoutError]);

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
  );
}
