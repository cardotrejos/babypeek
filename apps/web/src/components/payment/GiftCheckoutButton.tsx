import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { API_BASE_URL } from "@/lib/api-config";
import { posthog, isPostHogConfigured } from "@/lib/posthog";
import { addBreadcrumb } from "@/lib/sentry";

// Price from env or default $9.99
const PRICE_CENTS = Number(import.meta.env.VITE_PRODUCT_PRICE_CENTS) || 999;
const PRICE_DISPLAY = `$${(PRICE_CENTS / 100).toFixed(2)}`;

interface GiftCheckoutButtonProps {
  shareId: string;
  uploadId: string;
}

/**
 * GiftCheckoutButton Component
 * Story 6.7: Gift Purchase Option (AC-1, AC-2, AC-5)
 *
 * Displays gift CTA with email capture modal.
 * Creates checkout session with type="gift" and purchaser email.
 */
export function GiftCheckoutButton({ shareId, uploadId }: GiftCheckoutButtonProps) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError("Please enter a valid email");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleOpenModal = useCallback(() => {
    // Story 8.5 - Track CTA click (funnel: awareness → interest)
    if (isPostHogConfigured()) {
      posthog.capture("gift_cta_clicked", {
        share_id: shareId,
        upload_id: uploadId,
        source: "share_page",
      });
    }
    // M1: Sentry breadcrumb for debugging checkout flows
    addBreadcrumb("Gift CTA clicked", "checkout", { share_id: shareId });

    // Reset state when modal opens (in case user navigated back)
    setIsLoading(false);
    setEmailError("");
    setShowEmailModal(true);
  }, [shareId, uploadId]);

  const handleGiftPurchase = useCallback(async () => {
    if (!validateEmail(email)) return;
    if (isLoading) return;

    setIsLoading(true);

    // H1 Fix: Track purchase started at correct funnel stage (interest → intent)
    if (isPostHogConfigured()) {
      posthog.capture("gift_purchase_started", {
        share_id: shareId,
        upload_id: uploadId,
      });
    }
    addBreadcrumb("Gift purchase started", "checkout", { share_id: shareId });

    try {
      // Gift checkout - no session token required (public purchase)
      const response = await fetch(`${API_BASE_URL}/api/checkout/gift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          purchaserEmail: email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { checkoutUrl } = await response.json();

      // Track checkout created
      if (isPostHogConfigured()) {
        posthog.capture("gift_checkout_created", {
          share_id: shareId,
          upload_id: uploadId,
          amount: PRICE_CENTS,
        });
      }

      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("[GiftCheckoutButton] Checkout failed:", error);

      if (isPostHogConfigured()) {
        posthog.capture("gift_checkout_error", {
          share_id: shareId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      setEmailError(error instanceof Error ? error.message : "Unable to start checkout");
      setIsLoading(false);
    }
  }, [uploadId, shareId, email, isLoading]);

  return (
    <>
      <Button
        size="lg"
        className="w-full bg-coral hover:bg-coral/90 text-white font-semibold py-4 text-base"
        onClick={handleOpenModal}
        data-testid="gift-checkout-button"
      >
        🎁 Gift This Photo - {PRICE_DISPLAY}
      </Button>

      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎁 Gift This Photo</DialogTitle>
            <DialogDescription>
              Enter your email to receive your receipt. The HD photo will be sent directly to the
              parent who created this portrait.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="gift-email" className="text-sm font-medium text-charcoal">
                Your Email (for receipt)
              </label>
              <Input
                id="gift-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) validateEmail(e.target.value);
                }}
                className={emailError ? "border-red-500" : ""}
                data-testid="gift-email-input"
              />
              {emailError && <p className="text-sm text-red-500">{emailError}</p>}
            </div>

            <p className="text-xs text-warm-gray/70">
              💝 The parent will receive an email with a link to download their HD portrait. Your
              email is only used for your purchase receipt.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailModal(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleGiftPurchase}
              disabled={!email || isLoading}
              className="bg-coral hover:bg-coral/90"
              data-testid="gift-continue-button"
            >
              {isLoading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                "Continue to Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
