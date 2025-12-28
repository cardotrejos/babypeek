import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { posthog, isPostHogConfigured } from "@/lib/posthog";

/**
 * Expired Result Component
 * Story 8.8: Expired Result Handling
 *
 * Shows a warm, friendly message when a result has expired after 30 days.
 * - AC-1: Warm message explaining expiration
 * - AC-2: CTA to create a new photo
 * - AC-3: No broken image or error states
 * - AC-5: Analytics tracking
 */
interface ExpiredResultProps {
  resultId?: string;
  source: "result" | "share";
}

export function ExpiredResult({ resultId, source }: ExpiredResultProps) {
  const navigate = useNavigate();
  const analyticsTrackedRef = useRef(false);

  // Track expired page view (AC-5)
  useEffect(() => {
    if (analyticsTrackedRef.current) return;
    analyticsTrackedRef.current = true;

    if (isPostHogConfigured()) {
      posthog.capture("expired_result_viewed", {
        result_id: resultId,
        source,
        timestamp: new Date().toISOString(),
      });
    }
  }, [resultId, source]);

  const handleCreateNew = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Warm visual */}
        <div className="flex justify-center">
          <div className="size-20 rounded-full bg-coral/10 flex items-center justify-center">
            <span className="text-4xl">🌅</span>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="font-display text-2xl text-charcoal">This photo has moved on</h1>
          <p className="font-body text-warm-gray leading-relaxed">
            Photos are automatically deleted after 30 days to protect your privacy. The good news?
            You can create a new one anytime!
          </p>
        </div>

        {/* Privacy reassurance */}
        <div className="bg-white rounded-xl p-4 text-left">
          <p className="text-sm text-warm-gray">
            <span className="text-coral font-medium">Why we do this:</span> Your ultrasound images
            are personal. We delete them automatically so you don't have to worry about your data
            sitting on our servers.
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button
            onClick={handleCreateNew}
            className="w-full py-4 bg-coral text-white rounded-xl hover:bg-coral/90"
          >
            Create a New Portrait ✨
          </Button>
          <p className="text-xs text-warm-gray/60">It only takes 90 seconds</p>
        </div>
      </div>
    </div>
  );
}
