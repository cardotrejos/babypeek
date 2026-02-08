import { useState, useEffect, useCallback } from "react";
import { posthog, isPostHogConfigured } from "@/lib/posthog";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "@/components/payment";

interface UpsellModalProps {
  /** Upload ID for analytics and checkout */
  uploadId: string;
  /** Called when checkout starts */
  onCheckoutStart?: () => void;
  /** Called when checkout fails */
  onCheckoutError?: (error: string) => void;
  /** Called when user declines */
  onDecline: () => void;
  className?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * UpsellModal Component
 *
 * Shown immediately after the first preview image is generated.
 * Creates urgency with a countdown timer and highlights the value
 * of upgrading to HD quality.
 *
 * Conversion Fix #3: Fast First Result + Immediate Upsell
 */
export function UpsellModal({
  uploadId,
  onCheckoutStart,
  onCheckoutError,
  onDecline,
  className,
}: UpsellModalProps) {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  useEffect(() => {
    if (isPostHogConfigured()) {
      posthog.capture("upsell_modal_shown", {
        upload_id: uploadId,
      });
    }

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [uploadId]);

  const handleCheckoutStarted = useCallback(() => {
    if (isPostHogConfigured()) {
      posthog.capture("upsell_buy_clicked", {
        upload_id: uploadId,
        time_remaining: timeLeft,
      });
    }
    onCheckoutStart?.();
  }, [uploadId, timeLeft, onCheckoutStart]);

  const handleDecline = useCallback(() => {
    if (isPostHogConfigured()) {
      posthog.capture("upsell_declined", {
        upload_id: uploadId,
        time_remaining: timeLeft,
      });
    }
    onDecline();
  }, [uploadId, timeLeft, onDecline]);

  return (
    <div className={cn("bg-white rounded-2xl shadow-xl overflow-hidden", className)}>
      {/* Timer banner */}
      {timeLeft > 0 && (
        <div className="bg-gradient-to-r from-coral to-pink-500 text-white text-center py-2 px-4 text-sm font-medium">
          Special offer expires in {formatTime(timeLeft)}
        </div>
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="text-center">
          <h2 className="font-display text-xl text-charcoal">Unlock All 4 HD Portraits</h2>
          <p className="text-sm text-warm-gray mt-1">
            This is 1 of 4 professional styles we created for you
          </p>
        </div>

        {/* Benefits */}
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="text-green-500 flex-shrink-0">&#10003;</span>
            <span>3 additional professional styles</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500 flex-shrink-0">&#10003;</span>
            <span>Remove all watermarks</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500 flex-shrink-0">&#10003;</span>
            <span>HD quality - print ready</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500 flex-shrink-0">&#10003;</span>
            <span>Instant download + email delivery</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500 flex-shrink-0">&#10003;</span>
            <span>100% satisfaction guarantee</span>
          </li>
        </ul>

        {/* Social proof */}
        <div className="text-center text-xs text-warm-gray bg-cream/50 rounded-lg py-2 px-3">
          <span className="text-yellow-500">&#9733;&#9733;&#9733;&#9733;&#9733;</span> Loved by
          2,800+ parents
        </div>

        {/* CTA: Starts Stripe checkout directly (no extra click) */}
        <CheckoutButton
          uploadId={uploadId}
          onCheckoutStart={handleCheckoutStarted}
          onCheckoutError={onCheckoutError}
          className={cn(
            "w-full py-6 rounded-xl text-lg font-bold text-white",
            "bg-gradient-to-r from-coral to-pink-500",
            "hover:opacity-90 active:scale-[0.98] transition-all",
            "shadow-lg shadow-coral/25",
          )}
        />

        {/* Decline */}
        <button
          onClick={handleDecline}
          className="w-full text-center text-sm text-warm-gray hover:text-charcoal transition-colors py-2"
        >
          Maybe later - continue with preview
        </button>
      </div>
    </div>
  );
}
